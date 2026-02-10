(function () {
  'use strict';

  const API_ENDPOINTS = {
    melolo: 'https://api.sonzaix.indevs.in/melolo',
    flickreels: 'https://aio-api.botraiki.biz/api/flickreels',
    dramabox: 'https://api.sonzaix.indevs.in/dramabox',
  };

  function $(selector) { return document.querySelector(selector); }
  function $$(selector) { return document.querySelectorAll(selector); }

  function showToast(message, type = 'info') {
    const toast = $('#toast');
    const text = $('#toastTxt');
    if (!toast || !text) return;
    const icon = toast.querySelector('i');
    const icons = { info: 'info-circle', success: 'check-circle', error: 'exclamation-circle', warning: 'exclamation-triangle' };
    if (icon) icon.className = `fas fa-${icons[type] || 'info-circle'}`;
    text.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if ([...document.scripts].some((s) => s.src === src)) return resolve();
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Gagal memuat script: ${src}`));
      document.head.appendChild(script);
    });
  }

  class BetterVideoPlayer {
    constructor() {
      this.hls = null;
      this.modal = null;
      this.video = null;
      this.title = null;
    }

    _create() {
      if (this.modal) return;
      document.body.insertAdjacentHTML('beforeend', `
        <div id="betterPlayerModal" role="dialog" aria-modal="true">
          <div class="bp-shell">
            <div class="bp-head">
              <div id="bpTitle">Memutar video</div>
              <div class="bp-actions">
                <button class="bp-btn" id="bpOpenTab">Buka Tab</button>
                <button class="bp-btn" id="bpClose">Tutup</button>
              </div>
            </div>
            <div class="bp-body"><video id="bpVideo" controls playsinline preload="metadata"></video></div>
          </div>
        </div>
      `);
      this.modal = document.getElementById('betterPlayerModal');
      this.video = document.getElementById('bpVideo');
      this.title = document.getElementById('bpTitle');
      this.modal.addEventListener('click', (e) => { if (e.target === this.modal) this.close(); });
      document.getElementById('bpClose').addEventListener('click', () => this.close());
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && this.modal.classList.contains('show')) this.close(); });
    }

    async open(url, title = 'Streaming Video') {
      this._create();
      const safeUrl = this._normalizeUrl(url);
      this.title.textContent = title;
      document.getElementById('bpOpenTab').onclick = () => window.open(safeUrl, '_blank', 'noopener');
      this.modal.classList.add('show');
      await this._play(safeUrl);
    }

    close() {
      this._destroyHls();
      if (this.video) {
        this.video.pause();
        this.video.removeAttribute('src');
        this.video.load();
      }
      if (this.modal) this.modal.classList.remove('show');
    }

    async _play(url) {
      this._destroyHls();
      const isM3U8 = /\.m3u8(\?|$)/i.test(url) || /manifest\.m3u8/i.test(url);
      if (isM3U8 && this.video.canPlayType('application/vnd.apple.mpegurl')) {
        this.video.src = url;
        await this.video.play().catch(() => {});
        return;
      }
      if (isM3U8) {
        await loadScript('https://cdn.jsdelivr.net/npm/hls.js@latest');
        if (window.Hls && window.Hls.isSupported()) {
          this.hls = new window.Hls({ enableWorker: true, lowLatencyMode: true, backBufferLength: 90 });
          this.hls.loadSource(url);
          this.hls.attachMedia(this.video);
          this.hls.on(window.Hls.Events.MANIFEST_PARSED, () => this.video.play().catch(() => {}));
          return;
        }
      }
      this.video.src = url;
      await this.video.play().catch(() => {});
    }

    _destroyHls() { if (this.hls) { this.hls.destroy(); this.hls = null; } }

    _normalizeUrl(url) {
      const value = String(url || '').trim();
      if (!value) throw new Error('URL video kosong');
      if (/^https?:\/\//i.test(value)) return value;
      if (/^\/\//.test(value)) return `https:${value}`;
      throw new Error('URL video tidak valid');
    }
  }

  class DramaCinaApp {
    constructor() {
      this.currentSource = 'melolo';
      this.player = new BetterVideoPlayer();
      this.init();
    }

    init() {
      setTimeout(() => $('#preloader')?.classList.add('hidden'), 500);
      this.initEventListeners();
      this.goHome();
    }

    initEventListeners() {
      $('#demoPlayBtn')?.addEventListener('click', () => {
        this.playVideo('https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8', 'Demo HLS Stream');
      });
      window.addEventListener('scroll', () => {
        $('#btt')?.classList.toggle('show', window.scrollY > 120);
      });
    }

    async goHome() {
      this.setActiveNav('home');
      const main = $('#main');
      if (!main) return;
      main.innerHTML = `
        <section class="section" style="max-width:1200px;margin:0 auto;">
          <h1>DramaCina (integrasi ke flow kode awal)</h1>
          <p style="color:var(--text2)">Streaming sekarang pakai in-page player dan tetap kompatibel dengan pemanggilan lama <code>app.playVideo(...)</code>.</p>
          <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:16px;">
            <button class="search-btn" onclick="app.playVideo('https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8','Episode 1')"><i class="fas fa-circle-play"></i> Play Episode 1</button>
            <button class="search-btn" onclick="app.playVideo('https://test-streams.mux.dev/test_001/stream.m3u8','Episode 2')"><i class="fas fa-circle-play"></i> Play Episode 2</button>
          </div>
          <p style="margin-top:16px;color:var(--text2)">Endpoint source tersedia: ${Object.keys(API_ENDPOINTS).join(', ')}</p>
        </section>`;
    }

    showPopuler() { this.setActiveNav('populer'); showToast('Mode populer siap dihubungkan ke endpoint asli.', 'info'); }
    showBrowse() { this.setActiveNav('browse'); showToast('Mode jelajahi siap dihubungkan ke endpoint asli.', 'info'); }
    showNew() { this.setActiveNav('terbaru'); showToast('Mode terbaru siap dihubungkan ke endpoint asli.', 'info'); }

    setActiveNav(view) {
      $$('.nav-link').forEach(link => link.classList.toggle('active', link.dataset.nav === view));
    }

    async playVideo(url, title = 'Streaming Video') {
      try {
        await this.player.open(url, title);
        this.showToast(`Memutar: ${title}`, 'success');
      } catch (error) {
        console.error(error);
        this.showToast(`Gagal memutar video: ${error.message}`, 'error');
      }
    }

    async streamVideo(source, id, title, episodeIndex = 0) {
      this.showToast(`Memuat stream ${source}...`, 'info');
      if (typeof id === 'string' && /^https?:\/\//.test(id)) return this.playVideo(id, title);
      this.showToast(`ID stream diterima (${id}), sambungkan endpoint stream asli untuk episode ${episodeIndex + 1}.`, 'warning');
    }

    showToast(message, type = 'info') { showToast(message, type); }
    closeModal() { $('#dramaModal')?.classList.remove('show'); document.body.style.overflow = ''; }
    scrollToTop() { window.scrollTo({ top: 0, behavior: 'smooth' }); }
  }

  const app = new DramaCinaApp();
  window.app = app;
})();
