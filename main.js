const { app, BrowserWindow, ipcMain } = require('electron');
const { spawn } = require('child_process');
const axios = require('axios');

let win;
let downloads = {}; // id -> gid

function createWindow() {
  win = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  win.loadFile('index.html');
}

app.whenReady().then(() => {
  createWindow();

  // Start aria2 RPC server
  spawn('aria2c', [
    '--enable-rpc=true',
    '--rpc-listen-all=true',
    '--rpc-allow-origin-all=true',
    '--rpc-listen-port=6800'
  ]);
});


// 🚀 START DOWNLOAD
ipcMain.on('download', async (event, id, url) => {

  // 🎬 Detect YouTube
  if (url.includes("youtube.com") || url.includes("youtu.be")) {

    const proc = spawn('yt-dlp', [
      '-f', 'bestvideo+bestaudio',
      '--merge-output-format', 'mp4',
      url
    ]);

    downloads[id] = { type: "yt", process: proc };

    proc.stdout.on('data', (data) => {
      win.webContents.send('update', {
        id,
        text: data.toString()
      });
    });

    proc.on('close', () => {
      win.webContents.send('done', id);
      delete downloads[id];
    });

    return;
  }

  // 🌐 Normal download (aria2)
  try {
    const res = await axios.post("http://localhost:6800/jsonrpc", {
      jsonrpc: "2.0",
      id: "start",
      method: "aria2.addUri",
      params: [[url]]
    });

    const gid = res.data.result;
    downloads[id] = { type: "aria2", gid };

  } catch (err) {
    console.error("Download error:", err.message);
  }
});


// ⏸ PAUSE (RPC)
ipcMain.on('pause', async (e, id) => {
  if (!downloads[id]) return;

  await axios.post("http://localhost:6800/jsonrpc", {
    jsonrpc: "2.0",
    id: "pause",
    method: "aria2.pause",
    params: [downloads[id]]
  });
});


// ▶️ RESUME (RPC)
ipcMain.on('resume', async (e, id) => {
  if (!downloads[id]) return;

  await axios.post("http://localhost:6800/jsonrpc", {
    jsonrpc: "2.0",
    id: "resume",
    method: "aria2.unpause",
    params: [downloads[id]]
  });
});


// 📊 PROGRESS TRACKER (ONLY ONE LOOP)
setInterval(async () => {
  for (let id in downloads) {
    try {
      const gid = downloads[id];

      const res = await axios.post("http://localhost:6800/jsonrpc", {
        jsonrpc: "2.0",
        id: "status",
        method: "aria2.tellStatus",
        params: [gid]
      });

      const d = res.data.result;

      if (!d.totalLength || d.totalLength === "0") continue;

      const progress = (
        (parseInt(d.completedLength) / parseInt(d.totalLength)) * 100
      ).toFixed(1);

      const speed = (parseInt(d.downloadSpeed) / 1024).toFixed(1);

      win.webContents.send("update", {
        id,
        progress,
        speed
      });

      if (d.status === "complete") {
        win.webContents.send("done", id);
        delete downloads[id];
      }

    } catch (e) {
      console.log("RPC error:", e.message);
    }
  }
}, 1000);
