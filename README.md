# 🚀 IDM Linux Pro

<p align="center">
  <img src="https://img.shields.io/badge/Platform-Linux-blue?style=for-the-badge">
  <img src="https://img.shields.io/badge/Electron-28+-blue?style=for-the-badge">
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge">
</p>

A powerful **Internet Download Manager for Linux** with a stunning glassmorphism interface. Built with Electron, aria2 for high-speed downloads, yt-dlp for YouTube, and Chrome extension integration.

![IDM Linux Pro](https://via.placeholder.com/800x500/1a1a2e/ff0066?text=IDM+Linux+Pro+Screenshot)

---

## ✨ Features

### Core Download Engine
- ⚡ **Multi-connection downloads** - Up to 16 connections per file using aria2
- 🎬 **YouTube Downloader** - Download videos with yt-dlp (best quality audio+video)
- ⏯️ **Full Controls** - Pause, Resume, Cancel any download
- 📁 **Smart Folders** - Auto-sort by file type

### Browser Integration
- 🌐 **Chrome Extension** - Right-click any link to download
- 📥 **YouTube Button** - Red download button on YouTube pages
- 🔗 **Auto-capture** - Sends downloads from browser to app

### User Interface
- 🎨 **Glassmorphism Design** - Modern frosted glass aesthetic
- 📊 **Real-time Progress** - Live speed graph and stats
- 🪟 **Frameless Window** - Custom minimize/maximize/close
- 📱 **Mini Popup** - Shows download progress on mouse position

### File Management
| Type | Extension | Folder |
|------|-----------|--------|
| Video | mp4, mkv, avi, mov, webm | ~/Videos |
| Audio | mp3, wav, flac, aac, ogg | ~/Music |
| Image | jpg, png, gif, webp | ~/Pictures |
| Document | pdf, doc, xls, txt | ~/Documents |
| Archive | zip, rar, 7z, tar | ~/Archives |

---

## 🖥️ Screenshots

### Main Window
Clean sidebar layout with glassmorphism cards showing real-time progress, speed, and download controls.

### Mini Popup
Appears at mouse position when downloading from extension. Shows filename, progress bar, speed, and quick actions.

---

## 🚀 Installation

### Prerequisites
```bash
# Node.js 18+
node --version

# aria2 (download engine)
sudo apt install aria2

# yt-dlp (YouTube)
pip install yt-dlp
```

### Setup
```bash
# Clone or navigate to project
cd idm-linux-pro

# Install dependencies
npm install

# Start aria2 in background (required first!)
aria2c --enable-rpc=true --rpc-listen-all=true --rpc-listen-port=6800 &

# Run the app
npm start
```

---

## 🔧 Chrome Extension Setup

1. Open `chrome://extensions`
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked**
4. Select the `extension` folder

### Using the Extension
- **Right-click any link** → "Download with IDM"
- **On YouTube pages** → Red download button appears
- **Pasting a URL** → Auto-detects file type and folder

---

## 🎮 Usage

### Adding Downloads
1. Paste URL in the input field
2. Select file type (or leave on "Auto")
3. Click "Add Download"
4. Watch real-time progress!

### Controls
- **Pause** - Temporarily stop download
- **Resume** - Continue paused download
- **Cancel** - Remove download

---

## 📁 Project Structure

```
idm-linux-pro/
├── main.js          # Electron main process
├── index.html      # Main window UI
├── popup.html      # Mini download popup
├── extension/     # Chrome extension
│   ├── manifest.json
│   ├── background.js
│   └── youtube.js
├── package.json
└── README.md
```

---

## 🔍 Troubleshooting

### aria2 not starting?
```bash
# Kill existing processes
pkill aria2c

# Start fresh
aria2c --enable-rpc=true --rpc-listen-all=true --rpc-listen-port=6800 &
```

### yt-dlp errors?
```bash
# Update yt-dlp
pip install -U yt-dlp

# Or via pipx
pipx install yt-dlp
```

### Port 3000 in use?
```bash
# Find and kill process
lsof -ti:3000 | xargs kill -9
```

---

## 📄 License

MIT License - Feel free to use and modify!

---

## 🤝 Contributing

Pull requests are welcome! Create an issue first for major changes.

---

**Made with ❤️ for Linux users**