const { app, BrowserWindow, ipcMain, Menu, clipboard } = require('electron');
const { spawn, execSync } = require('child_process');
const axios = require('axios');

let win;
let downloads = {};
let queue = [];
let active = false;
let activeCount = 0;
const MAX_CONCURRENT = 3;

const NODE_PATH = path.dirname(process.execPath) + '/node';

process.env.PATH = process.env.PATH + ':' + os.homedir() + '/.nvm/versions/node/v22.22.2/bin';

// ✅ GLOBAL ERROR HANDLER
process.on('unhandledRejection', err => {
  console.log("🔥 ERROR:", err.message);
});

function failDownload(id, message) {
  if (!id) return;
  const text = message || "Download failed";
  console.log("❌ Download failed:", id, text);
  if (win && !win.isDestroyed()) {
    win.webContents.send("failed", { id, message: text });
  }
  delete downloads[id];
}

function completeDownload(id) {
  if (!id) return;
  if (win && !win.isDestroyed()) {
    win.webContents.send("done", id);
  }
  delete downloads[id];
}

function emitCreateDownload(job) {
  if (!win || win.isDestroyed()) return;
  win.webContents.send("createDownload", {
    id: job.id,
    url: job.url,
    mediaType: job.mediaType,
    folder: job.folder
  });
}

// WINDOW
let popupWin;

function createWindow() {
  win = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 800,
    minHeight: 500,
    frame: false,
    titleBarStyle: 'hidden',
    titleBarOverlay: false,
    backgroundColor: '#1a1a2e',
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  win.loadFile('index.html');
  
  win.once('ready-to-show', () => {
    win.show();
  });
}

function createPopup(info) {
  if (popupWin && !popupWin.isDestroyed()) {
    popupWin.focus();
    popupWin.webContents.send("updatePopup", info);
    return;
  }

  popupWin = new BrowserWindow({
    width: 420,
    height: 320,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  popupWin.loadFile('popup.html');
  popupWin.setPosition(info.x || 100, info.y || 100);

  popupWin.webContents.once('did-finish-load', () => {
    popupWin.webContents.send("showDownload", info);
  });

  popupWin.on('blur', () => {
    setTimeout(() => {
      if (popupWin && !popupWin.isDestroyed()) {
        popupWin.close();
      }
    }, 3000);
  });
}

// EXPRESS (BROWSER EXTENSION)
const server = express();
server.use(express.json());

server.post('/download', (req, res) => {
  const url = req.body.url;
  const mediaType = req.body.mediaType || 'other';
  const folder = req.body.folder || os.homedir() + '/Downloads';
  const x = req.body.x || 100;
  const y = req.body.y || 100;
  
  const id = "dl_" + Date.now();

  queue.push({ id, url, mediaType, folder });
  processQueue();

  emitCreateDownload({ id, url, mediaType, folder });

  createPopup({ id, url, mediaType, folder, x, y });

  res.send({ status: "ok" });
});

server.listen(3000, () => console.log("🌐 Extension server running")).on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.log("⚠️ Port 3000 in use");
  }
});

// CHECK PORT
function isPortInUse(port) {
  return new Promise(resolve => {
    const s = net.createServer()
      .once('error', () => resolve(true))
      .once('listening', () => {
        s.close();
        resolve(false);
      }).listen(port);
  });
}

// APP READY
app.whenReady().then(async () => {
  createWindow();

  console.log("🖥️  Window ready");
  
  setInterval(() => {
    console.log("🟢 App running...");
  }, 5000);

  if (!(await isPortInUse(6800))) {
    console.log("🚀 Starting aria2...");
    const aria2 = spawn('aria2c', [
      '--enable-rpc',
      '--rpc-listen-all',
      '--dir', os.homedir() + '/Downloads',
      '--continue',
      '--max-concurrent-downloads=5'
    ], { detached: true, stdio: 'ignore' });
    
    aria2.unref();
    
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log("✅ aria2 ready");

  // AUTO CLIPBOARD
  setInterval(() => {
    const text = clipboard.readText();
    if (text && text.startsWith("http")) {
      win.webContents.send("autoLink", text);
    }
  }, 2000);
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
      id: "add",
      method: "aria2.addUri",
      params: [[url]]
    });

    console.log("✅ Added to aria2, gid:", res.data.result);
    downloads[id] = { gid: res.data.result, folder: destFolder };

  } catch (e) {
    console.log("❌ DOWNLOAD ERROR:", e.message);
    failDownload(id, e.message);
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

function formatSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024*1024) return (bytes/1024).toFixed(1) + " KB";
  if (bytes < 1024*1024*1024) return (bytes/(1024*1024)).toFixed(1) + " MB";
  return (bytes/(1024*1024*1024)).toFixed(2) + " GB";
}

function parseSize(str) {
  if (!str) return 0;
  const match = str.toString().match(/([\d.]+)\s*([KMG]?)/i);
  if (!match) return 0;
  const num = parseFloat(match[1]);
  const unit = match[2].toUpperCase();
  if (unit === 'G') return num * 1024 * 1024 * 1024;
  if (unit === 'M') return num * 1024 * 1024;
  if (unit === 'K') return num * 1024;
  return num;
}

function formatDuration(seconds) {
  if (!seconds || !Number.isFinite(seconds) || seconds < 0) return "--";
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (minutes < 60) return `${minutes}m ${secs}s`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

// ⏸ PAUSE
ipcMain.on('pause', async (e, id) => {
  const dl = downloads[id];
  if (dl && dl.gid) {
    await axios.post("http://localhost:6800/jsonrpc", {
      jsonrpc: "2.0",
      id: "pause",
      method: "aria2.pause",
      params: [dl.gid]
    });
  }
});

// ▶ RESUME
ipcMain.on('resume', async (e, id) => {
  const dl = downloads[id];
  if (dl && dl.gid) {
    await axios.post("http://localhost:6800/jsonrpc", {
      jsonrpc: "2.0",
      id: "unpause",
      method: "aria2.unpause",
      params: [dl.gid]
    });
  }
});

// ✕ CANCEL
ipcMain.on('cancel', async (e, id) => {
  const dl = downloads[id];
  if (dl && dl.gid) {
    await axios.post("http://localhost:6800/jsonrpc", {
      jsonrpc: "2.0",
      id: "remove",
      method: "aria2.remove",
      params: [dl.gid]
    });
    dl.cancelled = true;
    delete downloads[id];
  }
});

// 📂 LIST FILES IN FOLDER
ipcMain.handle('listFiles', async (e, folderPath) => {
  const fs = require('fs');
  const path = require('path');
  const folder = folderPath.replace('~', os.homedir());
  
  try {
    if (!fs.existsSync(folder)) return [];
    const files = fs.readdirSync(folder);
    return files.map(name => {
      const stats = fs.statSync(path.join(folder, name));
      return {
        name,
        size: stats.size,
        isDirectory: stats.isDirectory(),
        modified: stats.mtime.toISOString()
      };
    }).sort((a, b) => b.modified - a.modified);
  } catch (e) {
    console.log("❌ listFiles error:", e.message);
    return [];
  }
});
