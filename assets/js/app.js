(function () {
  'use strict';

  function $(selector) { return document.querySelector(selector); }

  function showToast(message, type = 'info') {
    const toast = $('#toast');
    const text = $('#toastTxt');
    if (!toast || !text) return;

    const icon = toast.querySelector('i');
    const icons = {
      info: 'info-circle',
      success: 'check-circle',
      error: 'exclamation-circle',
      warning: 'exclamation-triangle',
    };

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
            <div class="bp-body">
              <video id="bpVideo" controls playsinline preload="metadata"></video>
            </div>
          </div>
        </div>
      `);

      this.modal = document.getElementById('betterPlayerModal');
      this.video = document.getElementById('bpVideo');
      this.title = document.getElementById('bpTitle');

      this.modal.addEventListener('click', (e) => {
        if (e.target === this.modal) this.close();
      });
      document.getElementById('bpClose').addEventListener('click', () => this.close());
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.modal.classList.contains('show')) this.close();
      });
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
          this.hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
            this.video.play().catch(() => {});
          });
          return;
        }
      }

      this.video.src = url;
      await this.video.play().catch(() => {});
    }

    _destroyHls() {
      if (!this.hls) return;
      this.hls.destroy();
      this.hls = null;
    }

    _normalizeUrl(url) {
      const value = String(url || '').trim();
      if (!value) throw new Error('URL video kosong');
      if (/^https?:\/\//i.test(value)) return value;
      if (/^\/\//.test(value)) return `https:${value}`;
      throw new Error('URL video tidak valid');
    }
  }

  const player = new BetterVideoPlayer();

  async function playVideo(url, title = 'Streaming Video') {
    try {
      await player.open(url, title);
      showToast(`Memutar: ${title}`, 'success');
    } catch (error) {
      console.error(error);
      showToast(`Gagal memutar video: ${error.message}`, 'error');
    }
  }

  // Integrasi langsung ke website DramaCina lama: jika window.app sudah ada, patch metodenya.
  if (window.app && typeof window.app === 'object') {
    window.app.playVideo = playVideo;
    const originalShowToast = window.app.showToast?.bind(window.app);
    window.app.showToast = function (message, type = 'info') {
      if (typeof originalShowToast === 'function') return originalShowToast(message, type);
      return showToast(message, type);
    };
  } else {
    // Fallback: sediakan API bergaya DramaCina (`app.playVideo`) agar markup lama tetap jalan.
    window.app = {
      playVideo,
      showToast,
      streamVideo: async (_, __, title = 'Streaming Video') => {
        showToast(`Memuat stream: ${title}`, 'info');
      },
    };
  }

  document.getElementById('demoPlayBtn')?.addEventListener('click', () => {
    window.app.playVideo('https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8', 'Demo HLS Stream');
  });

  document.getElementById('playPrimary')?.addEventListener('click', () => {
    window.app.playVideo('https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8', 'Demo HLS Stream');
  });

  document.querySelectorAll('[data-stream-url]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const url = btn.getAttribute('data-stream-url');
      const title = btn.getAttribute('data-stream-title') || 'Episode';
      window.app.playVideo(url, title);
    });
  });
})();
