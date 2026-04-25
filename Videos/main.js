const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const { spawn } = require('child_process');
const axios = require('axios');
const net = require('net');

let win;
let queue = [];
let downloads = {};
let running = false;

// ---------------- WINDOW ----------------
function createWindow() {
  win = new BrowserWindow({
    width: 1100,
    height: 750,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  win.loadFile('index.html');
}

// ---------------- ARIA2 CHECK ----------------
function isPortInUse(port) {
  return new Promise(resolve => {
    const server = net.createServer()
      .once('error', () => resolve(true))
      .once('listening', () => {
        server.close();
        resolve(false);
      })
      .listen(port);
  });
}

// ---------------- START APP ----------------
app.whenReady().then(async () => {
  createWindow();

  const busy = await isPortInUse(6800);

  if (!busy) {
    spawn('aria2c', [
      '--enable-rpc=true',
      '--rpc-listen-all=true',
      '--rpc-allow-origin-all=true',
      '--rpc-listen-port=6800'
    ]);
  }

  console.log("🚀 aria2 ready");
});

// ---------------- QUEUE ----------------
ipcMain.on('queue', (e, id, url) => {
  queue.push({ id, url });
  runQueue();
});

ipcMain.on('startQueue', runQueue);
ipcMain.on('stopQueue', () => running = false);

// ---------------- QUEUE ENGINE ----------------
async function runQueue() {
  if (running) return;
  running = true;

  while (queue.length > 0 && running) {
    const job = queue.shift();
    await download(job.id, job.url);
  }

  running = false;
}

// ---------------- DOWNLOAD ENGINE ----------------
async function download(id, url) {

  downloads[id] = { progress: 0 };

  // 🎬 YOUTUBE
  if (url.includes("youtube.com") || url.includes("youtu.be")) {

    const yt = spawn('yt-dlp', [
      url,
      '--newline',
      '--progress'
    ]);

    downloads[id].type = "yt";

    yt.stdout.on('data', d => {
      const txt = d.toString();
      const match = txt.match(/(\d+(\.\d+)?)%/);

      if (match) {
        win.webContents.send("update", {
          id,
          progress: parseFloat(match[1])
        });
      }
    });

    yt.on('close', () => {
      win.webContents.send("done", id);
      delete downloads[id];
    });

    return;
  }

  // 🌐 ARIA2 FILE
  const res = await axios.post("http://localhost:6800/jsonrpc", {
    jsonrpc: "2.0",
    method: "aria2.addUri",
    params: [[url]]
  });

  downloads[id].gid = res.data.result;
}

// ---------------- THROTTLED PROGRESS ----------------
let last = {};

setInterval(async () => {
  for (let id in downloads) {

    if (downloads[id].type === "yt") continue;

    try {
      const gid = downloads[id].gid;

      const res = await axios.post("http://localhost:6800/jsonrpc", {
        jsonrpc: "2.0",
        method: "aria2.tellStatus",
        params: [gid]
      });

      const d = res.data.result;
      if (!d.totalLength) continue;

      const progress = (d.completedLength / d.totalLength) * 100;

      if (!last[id] || Math.abs(last[id] - progress) > 1) {
        last[id] = progress;

        win.webContents.send("update", {
          id,
          progress: progress.toFixed(1)
        });
      }

      if (d.status === "complete") {
        win.webContents.send("done", id);
        delete downloads[id];
      }

    } catch {}
  }
}, 1500);

// ---------------- PAUSE ----------------
ipcMain.on('pause', async (e, id) => {
  const d = downloads[id];
  if (!d?.gid) return;

  await axios.post("http://localhost:6800/jsonrpc", {
    jsonrpc: "2.0",
    method: "aria2.pause",
    params: [d.gid]
  });
});

// ---------------- RESUME ----------------
ipcMain.on('resume', async (e, id) => {
  const d = downloads[id];
  if (!d?.gid) return;

  await axios.post("http://localhost:6800/jsonrpc", {
    jsonrpc: "2.0",
    method: "aria2.unpause",
    params: [d.gid]
  });
});

// ---------------- RIGHT CLICK ----------------
ipcMain.on('showMenu', (e, url) => {
  const menu = Menu.buildFromTemplate([
    {
      label: "⬇ Download",
      click: () => {
        const id = "dl_" + Date.now();
        queue.push({ id, url });
        runQueue();
        win.webContents.send("createDownload", { id, url });
      }
    }
  ]);

  menu.popup();
});
