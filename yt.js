const { spawn } = require('child_process');

function downloadYT(url, folder) {
  return spawn('yt-dlp', [
    '-f', 'bestvideo+bestaudio',
    '--merge-output-format', 'mp4',
    '-o', `${folder}/%(title)s.%(ext)s`,
    url
  ]);
}

module.exports = { downloadYT };
