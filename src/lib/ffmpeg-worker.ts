/**
 * Own copy of the @ffmpeg/ffmpeg class worker.
 *
 * The packaged worker.js dynamically imports the core script, and Vite rewrites
 * that dynamic import to go through `/@vite/client` (`__vite__injectQuery`).
 * Inside a worker that import crashes, the worker dies before answering the
 * LOAD message and `FFmpeg.load()` hangs forever. Here the core is imported
 * through an indirect `import()` that no bundler can rewrite.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

const dynamicImport = new Function("url", "return import(url)") as (
  url: string,
) => Promise<{ default: (opts: unknown) => Promise<any> }>;

let core: any = null;

const load = async ({
  coreURL,
  wasmURL,
  workerURL,
}: {
  coreURL: string;
  wasmURL?: string;
  workerURL?: string;
}) => {
  const first = !core;
  const mod = await dynamicImport(coreURL);
  const createFFmpegCore = mod.default;
  if (!createFFmpegCore) throw new Error("failed to import ffmpeg-core.js");

  const wasm = wasmURL ?? coreURL.replace(/\.js$/g, ".wasm");
  const worker = workerURL ?? coreURL.replace(/\.js$/g, ".worker.js");
  core = await createFFmpegCore({
    // wasmURL/workerURL are passed through the hash so the core's locateFile
    // resolves blob URLs correctly (same hack the upstream worker uses).
    mainScriptUrlOrBlob: `${coreURL}#${btoa(JSON.stringify({ wasmURL: wasm, workerURL: worker }))}`,
  });
  core.setLogger((data: unknown) => self.postMessage({ type: "LOG", data }));
  core.setProgress((data: unknown) => self.postMessage({ type: "PROGRESS", data }));
  return first;
};

const exec = ({ args, timeout = -1 }: { args: string[]; timeout?: number }) => {
  core.setTimeout(timeout);
  core.exec(...args);
  const ret = core.ret;
  core.reset();
  return ret;
};

const ffprobe = ({ args, timeout = -1 }: { args: string[]; timeout?: number }) => {
  core.setTimeout(timeout);
  core.ffprobe(...args);
  const ret = core.ret;
  core.reset();
  return ret;
};

self.onmessage = async ({ data: { id, type, data: payload } }: MessageEvent<any>) => {
  const transfer: ArrayBuffer[] = [];
  let data: unknown;
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
      case "LIST_DIR": {
        const names: string[] = core.FS.readdir(payload.path);
        data = names.map((name) => ({
          name,
          isDir: core.FS.isDir(core.FS.stat(`${payload.path}/${name}`).mode),
        }));
        break;
      }
      case "DELETE_DIR":
        core.FS.rmdir(payload.path);
        data = true;
        break;
      case "MOUNT": {
        const fs = core.FS.filesystems[payload.fsType as string];
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
  if (data instanceof Uint8Array) transfer.push(data.buffer as ArrayBuffer);
  self.postMessage({ id, type, data }, transfer as never);
};
