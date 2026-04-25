const FILE_TYPES = {
  video: { extensions: ['mp4', 'mkv', 'avi', 'mov', 'wmv', 'flv', 'webm'], folder: 'Videos' },
  audio: { extensions: ['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma', 'm4a'], folder: 'Music' },
  image: { extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'], folder: 'Pictures' },
  document: { extensions: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt'], folder: 'Documents' },
  archive: { extensions: ['zip', 'rar', '7z', 'tar', 'gz', 'bz2'], folder: 'Archives' },
  exe: { extensions: ['exe', 'msi', 'dmg', 'deb', 'rpm', 'AppImage'], folder: 'Applications' },
  other: { extensions: [], folder: 'Downloads' }
};

function getMediaType(url) {
  const youtubePatterns = [
    /youtube\.com/i, /youtu\.be/i, /youtube\.com\/watch/i,
    /youtube\.com\/shorts/i, /youtube\.com\/live/i
  ];
  
  const videoPatterns = [
    /\.(mp4|mkv|avi|mov|wmv|flv|webm)(\?|$)/i,
    /video\.mp4/i, /stream\.mp4/i, /preview\.mp4/i
  ];
  
  const audioPatterns = [
    /\.(mp3|wav|flac|aac|ogg|wma|m4a)(\?|$)/i,
    /audio\.mp3/i, /music\.mp3/i
  ];
  
  if (youtubePatterns.some(p => p.test(url))) return 'youtube';
  if (videoPatterns.some(p => p.test(url))) return 'video';
  if (audioPatterns.some(p => p.test(url))) return 'audio';
  
  const ext = url.split('?')[0].split('.').pop().toLowerCase();
  for (const [type, data] of Object.entries(FILE_TYPES)) {
    if (data.extensions.includes(ext)) return type;
  }
  
  return 'other';
}

function getFolder(mediaType) {
  const home = '/home/' + require('os').userInfo().username;
  if (mediaType === 'youtube') return home + '/Videos';
  return home + '/' + (FILE_TYPES[mediaType]?.folder || 'Downloads');
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'download',
    title: '⬇ Download with IDM',
    contexts: ['link', 'video', 'audio', 'image']
  });
  
  chrome.contextMenus.create({
    id: 'download-youtube',
    title: '🎬 Download Video with IDM',
    contexts: ['page']
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  let url = info.linkUrl || info.srcUrl || info.pageUrl;
  const mediaType = getMediaType(url);
  const folder = getFolder(mediaType);
  
  fetch('http://localhost:3000/download', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, mediaType, folder })
  });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'download') {
    const url = request.url;
    const mediaType = getMediaType(url);
    const folder = getFolder(mediaType);
    
    fetch('http://localhost:3000/download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, mediaType, folder })
    });
    
    sendResponse({ success: true });
  }
  return true;
});