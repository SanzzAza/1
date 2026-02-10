# Upgrade Streaming Video untuk DramaCina

File `dramacina-streaming-upgrade.js` menambahkan player internal agar video tidak selalu dibuka di tab baru.

## Yang ditingkatkan

- Modal player langsung di halaman.
- Support `.m3u8` via **HLS.js** (fallback otomatis).
- Tombol **Buka Tab** bila user ingin external player.
- Validasi URL stream agar lebih aman dan tidak mudah error.
- Tutup player via tombol, klik area luar, atau tombol `Esc`.

## Cara pakai

Tambahkan script ini **setelah** script utama `DramaCinaApp`:

```html
<script src="./dramacina-streaming-upgrade.js"></script>
```

> Patch otomatis override `app.playVideo(...)` supaya memutar video di modal player modern.
