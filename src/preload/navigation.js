const {contextBridge, ipcRenderer} = require('electron');

contextBridge.exposeInMainWorld('node', {
  winClose: () => {
    // Close window
    ipcRenderer.invoke('windowClose');
  },
  winMinimize: () => {
    // Minimize Window
    ipcRenderer.invoke('windowMinimize');
  },
  winMaximize: () => {
    // Maximize Window
    ipcRenderer.invoke('windowMaximize');
  },
  winUnmaximize: () => {
    // Unmaximize Window
    ipcRenderer.invoke('windowUnmaximize');
  },
  maxMin: () => {
    // Maximize or Minimize Window
    ipcRenderer.invoke('windowMaxMin');
  },
  maxMinMac: () => {
    ipcRenderer.invoke('windowMaxMinMac');
  },
  moveBrowser: (url, index) => {
    // Page navigation
    ipcRenderer.invoke('moveView', url, index);
  },
  moveToNewTab: (index) => {
    // move to new tab
    ipcRenderer.invoke('moveToNewTab', index);
  },
  reloadBrowser: (index) => {
    // reload current BrowserView
    ipcRenderer.invoke('reloadBrowser', index);
  },
  backBrowser: (index) => {
    // back current BrowserView
    ipcRenderer.invoke('browserBack', index);
  },
  goBrowser: (index) => {
    // go current BrowserView
    ipcRenderer.invoke('browserGoes', index);
  },
  showMenu: () => {
    // open options (settings) window
    ipcRenderer.invoke('options');
  },
  newtab: () => {
    // create new tab
    ipcRenderer.invoke('newtab');
  },
  tabSwitch: (index) => {
    // switch tab
    ipcRenderer.invoke('tabSwitch', index);
  },
  tabMove: (target, destination) => {
    // move tab
    ipcRenderer.invoke('tabMove', target, destination);
  },
  removeTab: async(index) => {
    // remove tab
    return ipcRenderer.invoke('removeTab', index);
  },
  popupMenu: () => {
    ipcRenderer.invoke('popupNavigationMenu');
  },
  popupTabMenu: (data) => {
    ipcRenderer.invoke('popupTabMenu', data);
  },
  suggest: (word) => {
    ipcRenderer.invoke('suggest.send', word);
  },
  suggestClose: () => {
    ipcRenderer.invoke('suggest.close');
  },
  suggestDown: () => {
    ipcRenderer.invoke('suggest.down');
  },
  suggestUp: () => {
    ipcRenderer.invoke('suggest.up');
  },
  suggestSelect: () => {
    ipcRenderer.invoke('suggest.select');
  },
  translate: (inEn) => {
    return ipcRenderer.invoke('translate.get', inEn);
  },
  getTextColor: async () => {
    await ipcRenderer.invoke("getTextColor")
  },
  setTextColor: (newColor) => {
    ipcRenderer.send("setTextColor", newColor)
  }
});
