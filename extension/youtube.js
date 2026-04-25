// YouTube Download Button - Injected into YouTube pages

(function() {
  if (window.idmInjected) return;
  window.idmInjected = true;

  const IDM_ICON = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 4v16m-8-8h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;

  function createDownloadButton(videoId, title) {
    const btn = document.createElement('button');
    btn.innerHTML = IDM_ICON + ' Download';
    btn.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 18px;
      background: linear-gradient(135deg, #ff0044, #ff4400);
      color: white;
      border: none;
      border-radius: 25px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      position: absolute;
      right: 16px;
      top: 16px;
      z-index: 9999;
    `;
    
    btn.onclick = () => {
      const url = `https://www.youtube.com/watch?v=${videoId}`;
      
      fetch('http://localhost:3000/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          url, 
          mediaType: 'youtube',
          folder: require('os').homedir() + '/Videos'
        })
      }).then(() => {
        btn.innerHTML = '✓ Added!';
        btn.style.background = 'linear-gradient(135deg, #00cc66, #00ff88)';
        setTimeout(() => btn.remove(), 2000);
      });
    };
    
    return btn;
  }

  function injectButton() {
    const url = window.location.href;
    const match = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (!match) return;
    
    const videoId = match[1];
    const title = document.querySelector('h1.ytd-video-primary-info-renderer, h1 yt-formatted-string')?.textContent || 'Video';
    
    // Check if button already exists
    if (document.getElementById('idm-download-btn')) return;
    
    // Try to find the best position
    let container = document.querySelector('ytd-video-primary-info-renderer') || 
                   document.querySelector('ytd-watch-metadata') ||
                   document.querySelector('#secondary');
    
    if (container) {
      const btn = createDownloadButton(videoId, title);
      btn.id = 'idm-download-btn';
      container.style.position = 'relative';
      container.appendChild(btn);
    }
  }

  // Watch for URL changes (YouTube SPA)
  let lastUrl = location.href;
  const observer = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      setTimeout(injectButton, 1000);
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // Initial injection
  if (document.readyState === 'complete') {
    injectButton();
  } else {
    window.addEventListener('load', injectButton);
  }

  // Also create floating button
  function createFloatingButton(videoId) {
    const floatBtn = document.createElement('div');
    floatBtn.id = 'idm-floating-btn';
    floatBtn.innerHTML = IDM_ICON;
    floatBtn.style.cssText = `
      position: fixed;
      bottom: 100px;
      right: 20px;
      width: 50px;
      height: 50px;
      background: linear-gradient(135deg, #ff0044, #ff4400);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 999999;
      box-shadow: 0 4px 20px rgba(255, 0, 68, 0.4);
      transition: all 0.3s ease;
    `;
    
    floatBtn.onclick = () => {
      const url = `https://www.youtube.com/watch?v=${videoId}`;
      fetch('http://localhost:3000/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, mediaType: 'youtube' })
      });
      floatBtn.innerHTML = '✓';
      setTimeout(() => floatBtn.innerHTML = IDM_ICON, 1500);
    };
    
    document.body.appendChild(floatBtn);
  }

  // Add floating button
  const urlMatch = location.href.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (urlMatch && !document.getElementById('idm-floating-btn')) {
    createFloatingButton(urlMatch[1]);
  }
})();