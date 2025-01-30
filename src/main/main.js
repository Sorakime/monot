// require
const {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  BrowserView,
  MenuItem,
  nativeTheme
} = require('electron');

const {
  TabManager,
  ViewY
} = require('./tab');

const {
  aboutContent,
  navigationContextMenuTemplate
} = require('./menu');

const global = require('./global');
global.tabs = new TabManager();

// letiables
let windowSize;
const isMac = process.platform === 'darwin';
const directory = `${__dirname}/..`;
const lang = require(`${directory}/proprietary/lib/lang`);
const {History} = require(`${directory}/proprietary/lib/history`);
const history = new History();
const viewY = new ViewY();
let textColor = '#000';

// config setting
const {LowLevelConfig} = require(`${directory}/proprietary/lib/config.js`);
const bookmark = new LowLevelConfig(
  'bookmark.mndata'
).copyFileIfNeeded(
  `${directory}/default/data/bookmark.mndata`
);
const monotConfig = new LowLevelConfig(
  'config.mncfg'
).copyFileIfNeeded(
  `${directory}/default/config/config.mncfg`
);
const enginesConfig = new LowLevelConfig(
  'engines.mncfg'
).copyFileIfNeeded(
  `${directory}/default/config/engines.mncfg`
);

if (enginesConfig.update().data.version !== 2) {
  enginesConfig.data = JSON.parse(require('fs').readFileSync(`${directory}/default/config/engines.mncfg`, 'utf-8'));
  enginesConfig.save();
}

function replaceBackslashes(str) {
  return str.replace(/\\/g, "\/");
}

function nw() {
  // create window
  monotConfig.update();
  global.win = new BrowserWindow({
    width: monotConfig.get('width'),
    height: monotConfig.get('height'),
    minWidth: 450,
    minHeight: 450,
    show: false,
    titleBarStyle: 'hidden',
    titleBarOverlay: isMac ? true : {
      color: '#0000',
      symbolColor: textColor ? textColor : (nativeTheme.shouldUseDarkColors ? '#fff' : '#000')
    },
    trafficLightPosition: {
      x: 8,
      y: 8
    },
    transparent: false,
    backgroundColor: '#efefef',
    title: 'Monot by monochrome.',
    icon: isMac ? `${directory}/image/logo.icns` : `${directory}/image/logo.png`,
    webPreferences: {
      preload: `${directory}/preload/navigation.js`
    }
  });
  global.win.setBackgroundColor('#efefef');
  global.win.loadFile(
    isMac ?
      `${directory}/renderer/navigation/navigation-mac.html` :
      `${directory}/renderer/navigation/navigation.html`
  );

  nativeTheme.on('updated', () => {
    global.win.setTitleBarOverlay({
      symbolColor: textColor ? textColor : (nativeTheme.shouldUseDarkColors ? '#fff' : '#000')
    });
  });

  function getEngine() {
    enginesConfig.update();
    const selectEngine = enginesConfig.get('engine');
    return enginesConfig.get(
      `values`, true
    ).find(
      (item) => item.id === selectEngine
    ).url;
  }

  // window's behavior
  global.win.on('closed', () => {
    global.win = null;
  });
  global.win.webContents.on('did-finish-load', () => {
    global.win.webContents.executeJavaScript(`
      engine = '${getEngine()}';
    `);
    monotConfig.update();
    if (monotConfig.get('cssTheme') !== '') {
      const style = monotConfig.get('cssTheme');
      global.win.webContents.executeJavaScript(`
        document.head.innerHTML += '<link rel="stylesheet" href="${replaceBackslashes(style)}" onload="updateTextColor()">';
      `);
    }
  });
  global.win.on('ready-to-show', () => {
    global.win.show();
  });
  if (monotConfig.update().get('ui') === 'thin') {
    global.win.webContents.executeJavaScript(`
      document.body.classList.add('thin');
    `);
  }
  global.win.webContents.insertCSS(`
    :root {
      --wallpaper: url('file://${monotConfig.get('wallpaper')}')!important;
    }
  `);

  global.win.on('enter-full-screen', () => global.win.webContents.executeJavaScript(`document.body.classList.add('full')`));
  global.win.on('leave-full-screen', () => global.win.webContents.executeJavaScript(`document.body.classList.remove('full')`));

  // create tab
  global.tabs.newTab();

  ipcMain.handle("getTextColor", () => {
    return textColor;
  });
  ipcMain.on("setTextColor", (event, newColor) => {
    textColor = newColor ? newColor : '#000';
    console.debug(textColor);
    global.win.setTitleBarOverlay({
      symbolColor: textColor
    });
  });
}

function windowClose() {
  if (global.win) {
    windowSize = global.win.getSize();
    monotConfig.update()
      .set('width', windowSize[0])
      .set('height', windowSize[1])
      .save();
    global.win.close();
  }
}

app.on('ready', () => {
  const optionView = new BrowserView({
    transparent: true,
    frame: false,
    webPreferences: {
      preload: `${directory}/preload/option.js`,
      nodeIntegrationInSubFrames: true
    }
  });
  optionView.webContents.loadURL(`file://${directory}/renderer/menu/index.html`);
  monotConfig.update();

  const suggest = new BrowserView({
    transparent: true,
    frame: false,
    webPreferences: {
      preload: `${directory}/preload/suggest.js`
    }
  });
  suggest.webContents.loadURL(`file://${directory}/renderer/suggest/index.html`);

  const style = (function() {
    try {
      return monotConfig.get('cssTheme') != null ?
        require('fs').readFileSync(monotConfig.get('cssTheme'), 'utf-8') :
        null;
    } catch (e) {
      return '';
    }
  })();
  suggest.webContents.on('did-stop-loading', () => {
    suggest.webContents.insertCSS(style, {
      cssOrigin: 'user'
    });
  });

  // ipc channels
  ipcMain.handle('moveView', (e, link, index) => {
    global.tabs.get(index).load(link);
  });
  ipcMain.handle('windowClose', () => {
    windowClose();
  });
  ipcMain.handle('windowMaximize', () => {
    global.win.maximize();
  });
  ipcMain.handle('windowMinimize', () => {
    global.win.minimize();
  });
  ipcMain.handle('windowUnmaximize', () => {
    global.win.unmaximize();
  });
  ipcMain.handle('windowMaxMin', () => {
    global.win.isMaximized() ? global.win.unmaximize() : global.win.maximize();
  });
  ipcMain.handle('windowMaxMinMac', () => {
    global.win.isFullScreen() ? global.win.fullScreen = false : global.win.fullScreen = true;
  });
  ipcMain.handle('moveViewBlank', (e, index) => {
    global.tabs.get(index).load(
      `file://${directory}/browser/blank.html`
    );
  });
  ipcMain.handle('reloadBrowser', (e, index) => {
    global.tabs.get(index).reload();
  });
  ipcMain.handle('browserBack', (e, index) => {
    global.tabs.get(index).goBack();
  });
  ipcMain.handle('browserGoes', (e, index) => {
    global.tabs.get(index).goForward();
  });
  ipcMain.handle('getBrowserUrl', (e, index) => {
    return global.tabs.get(index).entity.webContents.getURL();
  });
  ipcMain.handle('moveToNewTab', (e, index) => {
    global.tabs.get(index).load(`file://${directory}/browser/home.html`);
  });
  ipcMain.handle('context', () => {
    global.context.popup();
  });
  ipcMain.handle('newtab', () => {
    global.tabs.newTab();
  });
  ipcMain.handle('tabSwitch', (e, index) => {
    global.tabs.setCurrent(index);
  });
  ipcMain.handle('tabMove', (e, target, destination) => {
    global.tabs.move(target, destination);
  });
  ipcMain.handle('removeTab', (e, index) => {
    global.tabs.removeTab(index);
  });
  ipcMain.handle('popupNavigationMenu', () => {
    global.navigationContextMenu.popup();
  });
  ipcMain.handle('popupTabMenu', (e, data) => {
    global.navigationContextMenu.insert(0, new MenuItem({
      label: lang.get('fix_selected'),
      id: 'tabFix',
      click: () => {
        e.senderFrame.executeJavaScript(`
          if (
            document.elementFromPoint(${data[0]}, ${data[1]}).parentNode
              === document.getElementsByTagName('div')[0]
          ) {
            document.elementFromPoint(${data[0]}, ${data[1]}).classList.toggle('fixed');
          } else {
            document.elementFromPoint(${data[0]}, ${data[1]}).parentNode.classList.toggle('fixed');
          }
        `);
      }
    }));
    global.navigationContextMenu.popup();
    global.navigationContextMenu = Menu.buildFromTemplate(navigationContextMenuTemplate);
  });
  ipcMain.handle('setting.searchEngine', (e, engine) => {
    enginesConfig.update()
      .set('engine', engine)
      .save();
    if (enginesConfig.get(`values.${engine}`) === undefined) {
      enginesConfig.update()
        .set(
          `values.${engine}`,
          JSON.parse(
            require('fs').readFileSync(
              `${directory}/default/config/engines.mncfg`,
              'utf-8'
            )
          ).values[engine],
          true
        )
        .save();
    }
    enginesConfig.update();
    global.win.webContents.executeJavaScript(`
      engine = '${enginesConfig.get(`values`, true).filter(ar => ar.id === enginesConfig.get(`engine`, true))[0].url}';
    `);
    console.log(enginesConfig.get(`values`, true).filter(ar => ar.id === enginesConfig.get(`engine`, true))[0].url);
    global.tabs.get().entity.webContents.executeJavaScript(`
      url = '${enginesConfig.get(`values`, true).filter(ar => ar.id === enginesConfig.get(`engine`, true))[0].url}';
    `);
  });
  ipcMain.handle('setting.changeExperimental', (e, change, to) => {
    // { "experiments": { ${change}: ${to} } }
    monotConfig.update()
      .set(`experiments.${change}`, to, true)
      .save();
  });
  ipcMain.handle('setting.deleteHistory', () => {
    history.deleteAll();
  });
  ipcMain.handle('setting.resetTheme', () => {
    monotConfig.update()
      .set('cssTheme', '')
      .save();
  });
  ipcMain.handle('setting.changeUI', (e, ui) => {
    monotConfig.update()
      .set('ui', ui)
      .save();

    switch (ui) {
    case 'default':
      viewY.toDefault();
      global.tabs.get().replace();
      global.tabs.tabs.forEach((i) => {
        i.replace();
      });
      break;
    case 'thin':
      viewY.toThin();
      global.tabs.get().replace();
      global.tabs.tabs.forEach((i) => {
        i.replace();
      });
    }
  });
  ipcMain.handle('setting.changeAppearances', (e, content, to) => {
    monotConfig.update()
      .update(content, to)
      .save();
  });
  ipcMain.handle('addHistory', (e, data) => {
    const fileURL = new URL(`file://${directory}/browser/home.html`);
    if (data.pageUrl !== fileURL.href) history.set(data);
  });
  ipcMain.handle('settings.view', () => {
    showSetting();
  });
  ipcMain.handle('viewHistory', () => {
    showHistory();
  });
  ipcMain.handle('updateHistory', () => {
    const histories = history.get(0, 20);
    let html = '';
    // eslint-disable-next-line
    for (const [key, value] of Object.entries(histories)) {
      html = `
        ${html}
        <div onclick="node.open('${value.pageUrl}');">
          <div class="history-favicon" style="background-image: url('${value.pageIcon}');"></div>
          <div class="history-details">
            <p>${value.pageTitle.replace(/{/g, '&lbrace;').replace(/}/g, '&rbrace;')}</p>
          </div>
        </div>
      `;
    }
    optionView.webContents.send('updatedHistory', html);
  });
  ipcMain.handle('openPage', (e, url) => {
    try {
      global.tabs.get().load(url);
    } catch (e) {
      console.error('ウィンドウやタブがないため開けませんでした');
    }
  });
  ipcMain.handle('addABookmark', () => {
    global.tabs.get().entity.webContents.send('addBookmark');
  });
  ipcMain.handle('addBookmark', (e, data) => {
    bookmark.update();
    // eslint-disable-next-line
    for (const [key, value] of Object.entries(bookmark.data)) {
      if (value.pageUrl === data.pageUrl) return;
    }
    bookmark.data.unshift(data);
    bookmark.save();
  });
  ipcMain.handle('updateBookmark', () => {
    bookmark.update();
    const bookmarks = bookmark.data;
    let html = '';
    // eslint-disable-next-line
    for (const [key, value] of Object.entries(bookmarks)) {
      html += `
        <div onclick="node.open('${value.pageUrl}');">
          <div class="bookmark-favicon" style="background-image: url('${value.pageIcon}');"></div>
          <div class="bookmark-details">
            <p class="title">${value.pageTitle}</p>
            <p class="remove"><a href="#" onclick="return removeBookmark(arguments[0], ${key});">${lang.get('delete')}</a></p>
          </div>
        </div>
      `;
    }
    optionView.webContents.send('updatedBookmark', html);
  });
  ipcMain.handle('viewBookmark', () => {
    showBookmark();
  });
  ipcMain.handle('removeBookmark', (e, key) => {
    bookmark.update();
    bookmark.data[key] = null;
    bookmark.data.splice(key, 1);
    bookmark.save();
  });
  ipcMain.handle('zoom', () => {
    global.tabs.get().entity.webContents.send('zoom');
  });
  ipcMain.handle('shrink', () => {
    global.tabs.get().entity.webContents.send('shrink');
  });
  ipcMain.handle('actual', () => {
    global.tabs.get().entity.webContents.send('actual');
  });
  ipcMain.handle('fullscreen', () => {
    if (isMac)
      global.win.isFullScreen() ? global.win.fullScreen = false : global.win.fullScreen = true;
    else
      global.win.isMaximized() ? global.win.unmaximize() : global.win.maximize();
  });
  ipcMain.handle('hide', () => {
    global.win.hide();
  });
  ipcMain.handle('about', () => {
    dialog.showMessageBox(null, aboutContent);
  });
  ipcMain.handle('devTools', () => {
    global.tabs.get().entity.webContents.toggleDevTools();
  });
  ipcMain.handle('suggest.send', (e, word) => {
    try {
      const url = new URL(`http://api.bing.com/qsonhs.aspx?mkt=ja-JP&q=${word}`);
      const req = require('https').request({
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method: 'GET',
      }, res => {
        let data = '';
        res.on('data', (d) => {
          try {
            data = JSON.parse(d.toString());
          } catch (e) {
            console.error(e);
          }
        });
        res.on('end', () => {
          let html = ``;
          try {
            try {
              Object.entries(data.AS.Results)[1][1].Suggests.forEach((data) => {
                html += `
                  <div onclick="node.moveBrowser('${data.Txt}');">${data.Txt}</div>
                `;
              });
            } catch (e) {
              Object.entries(data.AS.Results)[0][1].Suggests.forEach((data) => {
                html += `
                  <div onclick="node.moveBrowser('${data.Txt}');">${data.Txt}</div>
                `;
              });
            }

            global.win.addBrowserView(suggest);
            global.win.setTopBrowserView(suggest);

            suggest.webContents.executeJavaScript(`
              document.getElementsByTagName('main')[0].innerHTML = \`${html}\`;
            `);
          } catch (e) {
            global.win.removeBrowserView(suggest);
            console.error(e);
          }
        });
      });
      req.on('error', err => {
        console.error(err);
      });
      req.end();
    } catch (e) {
      console.error(e);
    }
    global.win.addBrowserView(suggest);
    suggest.setBounds({
      x: 100,
      y: viewY.get() / 2 + 5,
      width: global.win.getSize()[0] - 200,
      height: 400
    });
    suggest.setAutoResize({
      x: true,
      y: true,
      width: true,
      height: true
    });
  });
  ipcMain.handle('suggest.searchBrowser', (e, txt) => {
    enginesConfig.update();
    global.tabs.get().load(`${txt}`);
    global.win.removeBrowserView(suggest);
  });
  ipcMain.handle('suggest.close', () => {
    global.win.removeBrowserView(suggest);
  });
  ipcMain.handle('suggest.down', () => {
    suggest.webContents.executeJavaScript(`
      select(1);
    `);
  });
  ipcMain.handle('suggest.up', () => {
    suggest.webContents.executeJavaScript(`
      select(-1);
    `);
  });
  ipcMain.handle('suggest.select', () => {
    setTimeout(() => {
      suggest.webContents.executeJavaScript(`
        document.getElementById('selected').click();
      `);
    }, 100);
  });

  nw();
  ipcMain.handle('options', () => {
    optionView.webContents.loadURL(`file://${directory}/renderer/menu/index.html`);
    optionView.webContents.insertCSS(style);
    if (BrowserWindow.fromBrowserView(optionView)) {
      global.win.removeBrowserView(optionView);
    } else {
      global.win.addBrowserView(optionView);
      optionView.setBounds({
        x: 0,
        y: 0,
        width: global.win.getSize()[0],
        height: global.win.getSize()[1] - 1
      });
      global.win.on('resize', () => {
        optionView.setBounds({
          x: 0,
          y: 0,
          width: global.win.getSize()[0],
          height: global.win.getSize()[1] - 1
        });
      });
      optionView.webContents.executeJavaScript(`
        document.head.innerHTML += '<link rel="stylesheet" href="${replaceBackslashes(monotConfig.get('cssTheme'))}">';
      `);
      global.win.setTopBrowserView(optionView);
    }
  });
  ipcMain.handle('setting.resetWallpaper', () => {
    monotConfig.update()
      .set('wallpaper', '')
      .save();
    global.win.webContents.insertCSS(`
      :root {
        --wallpaper: none!important;
      }
    `);
  });
  ipcMain.handle('translate.get', (e, inEn) => {
    return lang.get(inEn);
  });
  ipcMain.handle('translate.getAbout', (e, inEn) => {
    return lang.getAbout(inEn);
  });
  ipcMain.handle('setLang', (e, language) => {
    lang.setLang(language);
  });
  ipcMain.handle('addEngine', (e, url, name) => {
    enginesConfig
      .update()
      .data.values.push({
        id: name.slice(0, 3) + name.slice(-3),
        url: url,
        name: name
      });
    enginesConfig.save();
  });
});

app.on('window-all-closed', () => {
  if (!isMac) app.quit();
});
app.on('activate', () => {
  if (global.win === null) nw();
});

function showSetting() {
  const setting = new BrowserWindow({
    width: 760,
    height: 480,
    minWidth: 300,
    minHeight: 270,
    icon: `${directory}/image/logo.ico`,
    webPreferences: {
      preload: `${directory}/preload/setting.js`,
      scrollBounce: true
    }
  });
  monotConfig.update();
  enginesConfig.update();
  setting.loadFile(`${directory}/renderer/setting/index.html`);

  // Apply of changes
  const experiments = monotConfig.get('experiments');

  if (monotConfig.get('wallpaper') !== '') {
    setting.webContents.send('updateWallpaper', (monotConfig.get('wallpaper')));
  }
  if (monotConfig.get('cssTheme') !== '') {
    setting.webContents.send('updateTheme', (monotConfig.get('cssTheme')));
  }
  setting.webContents.send('lang', (monotConfig.get('lang')));

  if (experiments.forceDark === true) {
    setting.webContents.executeJavaScript(`
      document.querySelectorAll('input[type="checkbox"]')[0]
        .checked = true;
    `);
  }
  if (experiments.fontChange === true) {
    setting.webContents.executeJavaScript(`
      document.querySelectorAll('input[type="checkbox"]')[1]
        .checked = true;
    `);
    if (experiments.changedfont !== '') {
      setting.webContents.executeJavaScript(`
        document.querySelectorAll('input[type="text"]')[0]
          .value = ${experiments.changedfont};
      `);
    }
  }

  ipcMain.removeHandler('setting.openThemeDialog');
  ipcMain.handle('setting.openThemeDialog', () => {
    const fileDialog = dialog.showOpenDialog(
      setting,
      {
        title: lang.get('select_theme'),
        properties: [
          'openFile'
        ],
        filters: [
          {
            name: 'CSS',
            extensions: ['css']
          }
        ]
      }
    );
    fileDialog.then((path) => {
      monotConfig.update()
        .set('cssTheme', path.filePaths[0])
        .save();
      if (path.filePaths[0] !== '')
        setting.webContents.send('updateTheme', (replaceBackslashes(monotConfig.get('cssTheme'))));
    });
  });
  ipcMain.removeHandler('init');
  ipcMain.handle('init', () => {
    setting.webContents.executeJavaScript(`
    searchJson = \`${JSON.stringify(enginesConfig.get('values'))}\`;
    setSearchList(JSON.parse(searchJson));
    document.getElementById('engine-select').value = '${enginesConfig.get('engine')}';

    document.getElementById('lang-select').value = '${monotConfig.get('lang')}';

    ui('${monotConfig.get('ui')}');
    document.head.innerHTML += '<link rel="stylesheet" href="${replaceBackslashes(monotConfig.get('cssTheme'))}">';
  `);
  });
  ipcMain.removeHandler('setting.openWallpaperDialog');
  ipcMain.handle('setting.openWallpaperDialog', () => {
    const fileDialog = dialog.showOpenDialog(
      setting,
      {
        title: lang.get('wallpaper'),
        properties: [
          'openFile'
        ],
        filters: [
          {
            name: lang.get('image'),
            extensions: ['png', 'jpg', 'jpeg']
          }
        ]
      }
    );
    fileDialog.then((path) => {
      monotConfig.update()
        .set('wallpaper', path.filePaths[0].replace(/\\/g, '/'))
        .save();
      if (path.filePaths[0] !== '') {
        setting.webContents.send('updateWallpaper', (monotConfig.get('wallpaper')));
        global.win.webContents.insertCSS(`
          :root {
            --wallpaper: url('file://${monotConfig.get('wallpaper')}')!important;
          }
        `);
        console.log(`
        :root {
          --wallpaper: url('file://${monotConfig.get('wallpaper')}')!important;
        }
      `);
      }
    });
  });
}
function showHistory() {
  const historyWin = new BrowserWindow({
    width: 760,
    height: 480,
    minWidth: 300,
    minHeight: 270,
    icon: `${directory}/image/logo.ico`,
    webPreferences: {
      preload: `${directory}/preload/history.js`,
      scrollBounce: true
    }
  });

  // Convert object to html
  const histories = history.getAll();
  let html = '';
  // eslint-disable-next-line
  for (const [key, value] of Object.entries(histories)) {
    html = `
      ${html}
      <div onclick="node.open('${value.pageUrl.replace(/{/g, '&lbrace;').replace(/}/g, '&rbrace;')}');">
        <div class="history-favicon" style="background-image: url('${value.pageIcon.replace(/{/g, '&lbrace;').replace(/}/g, '&rbrace;')}');"></div>
        <div class="history-details">
          <p>${value.pageTitle.replace(/{/g, '&lbrace;').replace(/}/g, '&rbrace;')}</p>
        </div>
      </div>
    `;
  }
  ipcMain.removeHandler('update.History');
  ipcMain.handle('update.History', () => {
    historyWin.webContents.executeJavaScript(`
      document.getElementById('histories').innerHTML = \`${html}\`;
      document.head.innerHTML += '<link rel="stylesheet" href="${replaceBackslashes(monotConfig.get('cssTheme'))}">';
  `);
  });
  historyWin.webContents.loadFile(`${directory}/renderer/history/index.html`);
}
function showBookmark() {
  const bookmarkWin = new BrowserWindow({
    width: 760,
    height: 480,
    minWidth: 300,
    minHeight: 270,
    icon: `${directory}/image/logo.ico`,
    webPreferences: {
      preload: `${directory}/preload/bookmark.js`,
      scrollBounce: true
    }
  });
  bookmarkWin.webContents.loadFile(`${directory}/renderer/bookmark/index.html`);
  bookmark.update();
  // Convert object to html
  const bookmarks = bookmark.data;
  let html = '';
  // eslint-disable-next-line
  for (const [key, value] of Object.entries(bookmarks)) {
    html = `
      ${html}
      <div onclick="node.open('${value.pageUrl}');">
        <div class="bookmark-favicon" style="background-image: url('${value.pageIcon}');"></div>
        <div class="bookmark-details">
          <p>${value.pageTitle}</p>
          <p><a href="javascript:node.removeBookmark(${key});">${lang.get('delete')}</a></p>
        </div>
      </div>
    `;
  }
  bookmarkWin.webContents.executeJavaScript(`
    document.getElementById('bookmarks').innerHTML = \`${html}\`;
    document.head.innerHTML += '<link rel="stylesheet" href="${replaceBackslashes(monotConfig.get('cssTheme'))}">';
  `);
}

global.showSetting = showSetting;
global.showHistory = showHistory;
global.showBookmark = showBookmark;
global.windowClose = windowClose;
global.windowOpen = nw;
