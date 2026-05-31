import fs from "fs";
import path from "path";
import https from "https";

const publicDir = path.join(process.cwd(), "public");
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

const files = [
  {
    url: "https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm/ffmpeg-core.js",
    dest: path.join(publicDir, "ffmpeg-core.js"),
  },
  {
    url: "https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm/ffmpeg-core.wasm",
    dest: path.join(publicDir, "ffmpeg-core.wasm"),
  },
];

async function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    console.log(`Starting download: ${url} -> ${dest}`);
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        // Handle redirect
        downloadFile(response.headers.location, dest).then(resolve).catch(reject);
        return;
      }
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to get '${url}' (${response.statusCode})`));
        return;
      }
      response.pipe(file);
      file.on("finish", () => {
        file.close();
        console.log(`Downloaded: ${dest}`);
        resolve();
      });
    }).on("error", (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function run() {
  try {
    for (const f of files) {
      await downloadFile(f.url, f.dest);
    }
    console.log("All ffmpeg files downloaded successfully to public directory!");
  } catch (err) {
    console.error("Download failed:", err);
    process.exit(1);
  }
}

run();
