(function () {
  'use strict';

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if ([...document.scripts].some((s) => s.src === src)) return resolve();
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error(`Gagal memuat script: ${src}`));
      document.head.appendChild(s);
    });
  }

  class BetterVideoPlayer {
    constructor() {
      this.hls = null;
      this.wrapper = null;
      this.video = null;
      this.title = null;
      this._injectStyles();
    }

    _injectStyles() {
      if (document.getElementById('better-player-style')) return;
      const style = document.createElement('style');
      style.id = 'better-player-style';
      style.textContent = `
        #betterPlayerModal { position: fixed; inset: 0; z-index: 99999; display: none; background: rgba(0,0,0,.85); }
        #betterPlayerModal.show { display: flex; align-items: center; justify-content: center; }
        .bp-shell { width: min(96vw, 1200px); background: #0f0f16; border-radius: 14px; overflow: hidden; border: 1px solid #292940; }
        .bp-head { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; color: #fff; font: 600 14px/1.4 Poppins, sans-serif; }
        .bp-actions { display: flex; gap: 8px; }
        .bp-btn { border: 0; background: #252540; color: #fff; border-radius: 8px; padding: 8px 10px; cursor: pointer; }
        .bp-btn:hover { background: #e50914; }
        .bp-body { background: #000; aspect-ratio: 16 / 9; max-height: calc(100vh - 120px); }
        .bp-body video { width: 100%; height: 100%; background: #000; }
      `;
      document.head.appendChild(style);
    }

    _create() {
      if (this.wrapper) return;
      const html = `
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
      `;
      document.body.insertAdjacentHTML('beforeend', html);
      this.wrapper = document.getElementById('betterPlayerModal');
      this.video = document.getElementById('bpVideo');
      this.title = document.getElementById('bpTitle');

      this.wrapper.addEventListener('click', (e) => {
        if (e.target === this.wrapper) this.close();
      });
      document.getElementById('bpClose').addEventListener('click', () => this.close());
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.wrapper.classList.contains('show')) this.close();
      });
    }

    async open(url, title = 'Memutar video') {
      this._create();
      this.title.textContent = title;
      const safeUrl = this._normalizeUrl(url);
      document.getElementById('bpOpenTab').onclick = () => window.open(safeUrl, '_blank', 'noopener');

      this.wrapper.classList.add('show');
      await this._play(safeUrl);
    }

    close() {
      this._destroyHls();
      if (this.video) {
        this.video.pause();
        this.video.removeAttribute('src');
        this.video.load();
      }
      if (this.wrapper) this.wrapper.classList.remove('show');
    }

    async _play(url) {
      this._destroyHls();
      if (!this.video) return;

      const isM3U8 = /\.m3u8(\?|$)/i.test(url) || /manifest\.m3u8/i.test(url);

      if (isM3U8 && this.video.canPlayType('application/vnd.apple.mpegurl')) {
        this.video.src = url;
        await this.video.play().catch(() => {});
        return;
      }

      if (isM3U8) {
        await loadScript('https://cdn.jsdelivr.net/npm/hls.js@latest');
        if (window.Hls && window.Hls.isSupported()) {
          this.hls = new window.Hls({
            enableWorker: true,
            lowLatencyMode: true,
            backBufferLength: 90,
          });
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
      if (this.hls) {
        this.hls.destroy();
        this.hls = null;
      }
    }

    _normalizeUrl(url) {
      const value = String(url || '').trim();
      if (!value) throw new Error('URL video kosong');
      if (/^https?:\/\//i.test(value)) return value;
      if (/^\/\//.test(value)) return `https:${value}`;
      throw new Error('URL video tidak valid');
    }
  }

  function installPatch() {
    if (!window.app) return;
    const player = new BetterVideoPlayer();

    const oldToast = window.app.showToast ? window.app.showToast.bind(window.app) : null;

    window.app.playVideo = async function (url, title) {
      try {
        await player.open(url, title || 'Streaming Video');
        if (oldToast) oldToast(`Memutar: ${title || 'video'}`, 'success');
      } catch (err) {
        console.error(err);
        if (oldToast) oldToast(`Gagal memutar video: ${err.message}`, 'error');
      }
    };

    const oldStream = window.app.streamVideo ? window.app.streamVideo.bind(window.app) : null;
    if (oldStream) {
      window.app.streamVideo = async function (source, id, title, episodeIndex = 0) {
        try {
          await oldStream(source, id, title, episodeIndex);
        } catch (err) {
          console.error(err);
          if (oldToast) oldToast('Stream gagal diproses', 'error');
        }
      };
    }

    console.log('✅ BetterVideoPlayer patch aktif.');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installPatch);
  } else {
    installPatch();
  }
})();
