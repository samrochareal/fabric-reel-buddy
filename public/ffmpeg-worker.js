/**
 * FFmpeg class worker (plain JS, served verbatim from /public).
 *
 * Two reasons this file lives here instead of using @ffmpeg/ffmpeg's own worker:
 * 1. Vite rewrites the packaged worker's dynamic core import through
 *    /@vite/client, which crashes inside a worker so LOAD is never answered.
 * 2. Under cross-origin isolation the worker script must carry COEP itself, so
 *    the app fetches this file and boots it from a blob URL (blobs inherit the
 *    page policy). A verbatim, import-free script is required for that.
 */
const dynamicImport = new Function("url", "return import(url)");

let core = null;

const load = async ({ coreURL, wasmURL, workerURL }) => {
  const first = !core;
  const mod = await dynamicImport(coreURL);
  const createFFmpegCore = mod.default;
  if (!createFFmpegCore) throw new Error("failed to import ffmpeg-core.js");
  const wasm = wasmURL || coreURL.replace(/\.js$/g, ".wasm");
  const worker = workerURL || coreURL.replace(/\.js$/g, ".worker.js");
  core = await createFFmpegCore({
    mainScriptUrlOrBlob:
      coreURL + "#" + btoa(JSON.stringify({ wasmURL: wasm, workerURL: worker })),
  });
  core.setLogger((data) => self.postMessage({ type: "LOG", data }));
  core.setProgress((data) => self.postMessage({ type: "PROGRESS", data }));
  return first;
};

const exec = ({ args, timeout = -1 }) => {
  core.setTimeout(timeout);
  core.exec(...args);
  const ret = core.ret;
  core.reset();
  return ret;
};

const ffprobe = ({ args, timeout = -1 }) => {
  core.setTimeout(timeout);
  core.ffprobe(...args);
  const ret = core.ret;
  core.reset();
  return ret;
};

self.onmessage = async ({ data: { id, type, data: payload } }) => {
  const transfer = [];
  let data;
  try {
    if (type !== "LOAD" && !core) {
      throw new Error("ffmpeg is not loaded, call `await ffmpeg.load()` first");
    }
    switch (type) {
      case "LOAD":
        data = await load(payload);
        break;
      case "EXEC":
        data = exec(payload);
        break;
      case "FFPROBE":
        data = ffprobe(payload);
        break;
      case "WRITE_FILE":
        core.FS.writeFile(payload.path, payload.data);
        data = true;
        break;
      case "READ_FILE":
        data = core.FS.readFile(payload.path, { encoding: payload.encoding });
        break;
      case "DELETE_FILE":
        core.FS.unlink(payload.path);
        data = true;
        break;
      case "RENAME":
        core.FS.rename(payload.oldPath, payload.newPath);
        data = true;
        break;
      case "CREATE_DIR":
        core.FS.mkdir(payload.path);
        data = true;
        break;
      case "LIST_DIR":
        data = core.FS.readdir(payload.path).map((name) => ({
          name,
          isDir: core.FS.isDir(core.FS.stat(payload.path + "/" + name).mode),
        }));
        break;
      case "DELETE_DIR":
        core.FS.rmdir(payload.path);
        data = true;
        break;
      case "MOUNT": {
        const fs = core.FS.filesystems[payload.fsType];
        if (!fs) {
          data = false;
        } else {
          core.FS.mount(fs, payload.options, payload.mountPoint);
          data = true;
        }
        break;
      }
      case "UNMOUNT":
        core.FS.unmount(payload.mountPoint);
        data = true;
        break;
      default:
        throw new Error("unknown message type");
    }
  } catch (e) {
    self.postMessage({ id, type: "ERROR", data: String(e) });
    return;
  }
  if (data instanceof Uint8Array) transfer.push(data.buffer);
  self.postMessage({ id, type, data }, transfer);
};
