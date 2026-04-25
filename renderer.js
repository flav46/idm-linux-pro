const { ipcRenderer } = require('electron');

let counter = 0;
let graphs = {};
const sound = new Audio("https://assets.mixkit.co/sfx/preview/mixkit-achievement-bell-600.mp3");

function add() {
  const url = document.getElementById("url").value;
  if (!url) return;

  const id = "dl_" + counter++;
  createCard(id, url);
 ipcRenderer.send("queue", id, url);
ipcRenderer.send("startQueue"); // 🔥 THIS WAS MISSING
}

function start() { ipcRenderer.send("startQueue"); }
function stop() { ipcRenderer.send("stopQueue"); }

function createCard(id, url) {
  const d = document.createElement("div");
  d.className = "glass";

  d.innerHTML = `
    <b>${url}</b>
    <div id="${id}_text">Queued...</div>
    <div class="progress-bar"><div id="${id}_bar" class="progress"></div></div>
    <canvas id="${id}_graph"></canvas>
    <button onclick="pause('${id}')">Pause</button>
    <button onclick="resume('${id}')">Resume</button>
  `;

  document.getElementById("downloads").appendChild(d);
}

ipcRenderer.on("update", (e, d) => {
  const bar = document.getElementById(d.id + "_bar");
  const text = document.getElementById(d.id + "_text");
  const canvas = document.getElementById(d.id + "_graph");

  if (bar) {
    bar.style.width = d.progress + "%";
    text.innerText = `${d.progress}% | ${d.speed} KB/s`;
  }

  if (canvas) {
    const ctx = canvas.getContext("2d");

    if (!graphs[d.id]) graphs[d.id] = [];
    graphs[d.id].push(d.speed);
    if (graphs[d.id].length > 30) graphs[d.id].shift();

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();

    graphs[d.id].forEach((v, i) => {
      ctx.lineTo(i * 6, 40 - v / 10);
    });

    ctx.stroke();
  }
});

ipcRenderer.on("done", (e, id) => {
  document.getElementById(id + "_text").innerText = "✅ Done";
  sound.play();
});

ipcRenderer.on("autoLink", (e, url) => {
  document.getElementById("url").value = url;
});

function pause(id) { ipcRenderer.send("pause", id); }
function resume(id) { ipcRenderer.send("resume", id); }
