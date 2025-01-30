const {
  contextBridge,
  ipcRenderer,
  webFrame
} = require('electron');

ipcRenderer.on('updatedHistory', (e, html) => {
  webFrame.firstChild.executeJavaScript(`
    if (document.body.id === 'history') {
      document.getElementById('histories').innerHTML = \`
        \${document.getElementById('histories').innerHTML}${html}
      \`;
    }
  `);
});

ipcRenderer.on('updatedBookmark', (e, html) => {
  webFrame.firstChild.executeJavaScript(`
    if (document.body.id === 'bookmark') {
      document.getElementById('bookmarks').innerHTML = \`
        \${document.getElementById('bookmarks').innerHTML}${html}
      \`;
    }
  `);
});

contextBridge.exposeInMainWorld('node', {
  platform: process.platform,
  viewSettings: () => {
    ipcRenderer.invoke('options');
    ipcRenderer.invoke('settings.view');
  },
  viewHistory: () => {
    ipcRenderer.invoke('options');
    ipcRenderer.invoke('viewHistory');
  },
  updateHistory: () => {
    ipcRenderer.invoke('updateHistory');
  },
  open: (url) => {
    ipcRenderer.invoke('openPage', url);
  },
  addBookmark: () => {
    ipcRenderer.invoke('addABookmark');
  },
  updateBookmark: () => {
    ipcRenderer.invoke('updateBookmark');
  },
  viewBookmark: () => {
    ipcRenderer.invoke('options');
    ipcRenderer.invoke('viewBookmark');
  },
  removeBookmark: (key) => {
    ipcRenderer.invoke('removeBookmark', key);
  },
  zoom: () => {
    ipcRenderer.invoke('zoom');
  },
  shrink: () => {
    ipcRenderer.invoke('shrink');
  },
  actual: () => {
    ipcRenderer.invoke('actual');
  },
  fullScreen: () => {
    ipcRenderer.invoke('options');
    ipcRenderer.invoke('fullscreen');
  },
  hide: () => {
    ipcRenderer.invoke('options');
    ipcRenderer.invoke('hide');
  },
  viewSite: () => {
    ipcRenderer.invoke('options');
    ipcRenderer.invoke('openPage', 'https://mncrp.github.io/project/monot/');
  },
  viewDocs: () => {
    ipcRenderer.invoke('options');
    ipcRenderer.invoke('openPage', 'https://mncrp.github.io/docs/monot/');
  },
  about: () => {
    ipcRenderer.invoke('options');
    ipcRenderer.invoke('about');
  },
  devTools: () => {
    ipcRenderer.invoke('devTools');
  },
  toggle: () => {
    ipcRenderer.invoke('options');
  },
  translate: (inEn) => {
    return ipcRenderer.invoke('translate.get', inEn);
  },
  translateAbout: (inEn) => {
    return ipcRenderer.invoke('translate.getAbout', inEn);
  }
});
