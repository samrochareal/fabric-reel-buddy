/**
 * Thin wrapper so Vite bundles the @ffmpeg/ffmpeg class worker as a local
 * worker entry. The package's own `new URL('./worker.js', import.meta.url)`
 * lookup does not survive bundling, which makes `load()` hang forever.
 */
import "@ffmpeg/ffmpeg/worker";
