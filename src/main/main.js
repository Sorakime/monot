// require
const {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  BrowserView,
  MenuItem
} = require('electron');

const {
  TabManager
} = require('./tab');

// letiables
let win, windowSize, menu, context;
const isMac = process.platform === 'darwin';
const directory = `${__dirname}/..`;
const {History} = require(`${directory}/proprietary/lib/history`);
const history = new History();
const tabs = new TabManager();
const viewY = 66;
const navigationContextMenu = Menu.buildFromTemplate([
  {
    label: '戻る',
    click: () => {
      tabs.get().goBack();
    }
  },
  {
    label: '進む',
    click: () => {
      tabs.get().goForward();
    }
  },
  {
    type: 'separator'
  },
  {
    label: '新規タブ',
    click: () => {
      newtab();
    }
  },
  {
    type: 'separator'
  },
  {
    label: '設定',
    click: () => {
      showSetting();
    }
  },
  {
    label: '履歴',
    click: () => {
      showHistory();
    }
  },
  {
    label: 'ブックマーク',
    click: () => {
      showBookmark();
    }
  }
]);

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

function newtab() {
  tabs.newTab(win);
  tabs.get().entity.webContents.on('context-menu', (e, params) => {
    const text = params.selectionText;
    if (text !== '') {
      context.closePopup();
      enginesConfig.update();
      context.insert(0, new MenuItem({
        label: `${text}を調べる`,
        id: 'search',
        click: () => {
          const selectEngine = enginesConfig.get('engine');
          const engineURL = enginesConfig.get(`values.${selectEngine}`, true);
          tabs.get().load(`${engineURL}${text}`);
        }
      }));
      context.popup();
      context = Menu.buildFromTemplate(
        isMac ? contextTemplateMac : menuTemplate
      );
    }
  });
}

function nw() {
  // create window
  monotConfig.update();
  win = new BrowserWindow({
    width: monotConfig.get('width'),
    height: monotConfig.get('height'),
    minWidth: 400,
    minHeight: 400,
    show: false,
    frame: false,
    transparent: false,
    backgroundColor: '#efefef',
    title: 'FlatBrowser by FlatPonch',
    icon: isMac ? `${directory}/image/logo.icns` : `${directory}/image/logo.png`,
    webPreferences: {
      preload: `${directory}/preload/navigation.js`
    }
  });
  win.setBackgroundColor('#efefef');
  win.loadFile(
    process.platform === 'darwin' ?
      `${directory}/renderer/navigation/navigation-mac.html` :
      `${directory}/renderer/navigation/navigation.html`
  );

  function getEngine() {
    enginesConfig.update();
    const selectEngine = enginesConfig.get('engine');
    return enginesConfig.get(`values.${selectEngine}`, true);
  }

  // window's behavior
  win.on('closed', () => {
    win = null;
  });
  win.webContents.on('did-finish-load', () => {
    win.webContents.executeJavaScript(`
      engine = '${getEngine()}';
    `);
    monotConfig.update();
    if (monotConfig.get('cssTheme') != null) {
      const style = monotConfig.get('cssTheme');
      win.webContents.executeJavaScript(`
        document.body.innerHTML = \`
          \${document.body.innerHTML}
          <style>
            ${style}
          </style>
        \`
      `);
    }
  });
  win.on('ready-to-show', () => {
    win.show();
  });

  // create tab
  newtab();
}

function windowClose() {
  windowSize = win.getSize();
  monotConfig.update()
    .set('width', windowSize[0])
    .set('height', windowSize[1])
    .save();
  win.close();
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
  if (monotConfig.get('cssTheme') != null) {
    const style = monotConfig.get('cssTheme');
    optionView.webContents.insertCSS(style);
  }

  // ipc channels
  ipcMain.handle('moveView', (e, link, index) => {
    tabs.get(index).load(link);
  });
  ipcMain.handle('windowClose', () => {
    windowClose();
  });
  ipcMain.handle('windowMaximize', () => {
    win.maximize();
  });
  ipcMain.handle('windowMinimize', () => {
    win.minimize();
  });
  ipcMain.handle('windowUnmaximize', () => {
    win.unmaximize();
  });
  ipcMain.handle('windowMaxMin', () => {
    win.isMaximized() ? win.unmaximize() : win.maximize();
  });
  ipcMain.handle('windowMaxMinMac', () => {
    win.fullScreen ? win.fullScreen = false : win.fullScreen = true;
  });
  ipcMain.handle('moveViewBlank', (e, index) => {
    tabs.get(index).load(
      `file://${directory}/browser/blank.html`
    );
  });
  ipcMain.handle('reloadBrowser', (e, index) => {
    tabs.get(index).entity.webContents.reload();
  });
  ipcMain.handle('browserBack', (e, index) => {
    tabs.get(index).entity.webContents.goBack();
  });
  ipcMain.handle('browserGoes', (e, index) => {
    tabs.get(index).entity.webContents.goForward();
  });
  ipcMain.handle('getBrowserUrl', (e, index) => {
    return tabs.get(index).entity.webContents.getURL();
  });
  ipcMain.handle('moveToNewTab', (e, index) => {
    tabs.get(index).load(`file://${directory}/browser/home.html`);
  });
  ipcMain.handle('context', () => {
    context.popup();
  });
  ipcMain.handle('newtab', () => {
    newtab();
  });
  ipcMain.handle('tabMove', (e, index) => {
    tabs.setCurrent(win, index);
  });
  ipcMain.handle('removeTab', (e, index) => {
    try {
      tabs.removeTab(win, index);
    } catch (e) {
      if (tabs.length() === 0) {
        windowClose();
      }
    }
  });
  ipcMain.handle('popupNavigationMenu', () => {
    navigationContextMenu.popup();
  });
  ipcMain.handle('setting.searchEngine', (e, engine) => {
    enginesConfig.update()
      .set('engine', engine)
      .save();
    win.webContents.executeJavaScript(`
      engine = '${enginesConfig.get(`values.${engine}`, true)}';
    `);
    tabs.get().entity.webContents.executeJavaScript(`
      url = '${enginesConfig.get(`values.${engine}`, true)}';
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
  ipcMain.handle('addHistory', (e, data) => {
    history.set(data);
  });
  ipcMain.handle('settings.view', () => {
    showSetting();
  });
  ipcMain.handle('viewHistory', () => {
    showHistory();
  });
  ipcMain.handle('updateHistory', () => {
    const histories = history.getAll();
    let html = '';
    // eslint-disable-next-line
    for (const [key, value] of Object.entries(histories)) {
      html = `
        ${html}
        <div onclick="node.open('${value.pageUrl}');">
          <div class="history-favicon" style="background-image: url('${value.pageIcon}');"></div>
          <div class="history-details">
            <p>${value.pageTitle}</p>
          </div>
        </div>
      `;
    }
    optionView.webContents.send('updatedHistory', html);
  });
  ipcMain.handle('openPage', (e, url) => {
    try {
      tabs.get().load(url);
    } catch (e) {
      console.log('ウィンドウやタブがないため開けませんでした');
    }
  });
  ipcMain.handle('addABookmark', () => {
    tabs.get().entity.webContents.send('addBookmark');
  });
  ipcMain.handle('addBookmark', (e, data) => {
    bookmark.update();
    bookmark.data.unshift(data);
    bookmark.save();
  });
  ipcMain.handle('updateBookmark', () => {
    bookmark.update();
    const bookmarks = bookmark.data;
    let html = '';
    // eslint-disable-next-line
    for (const [key, value] of Object.entries(bookmarks)) {
      html = `
        ${html}
        <div onclick="node.open('${value.pageUrl}');">
          <div class="bookmark-favicon" style="background-image: url('${value.pageIcon}');"></div>
          <div class="bookmark-details">
            <p id="title">${value.pageTitle}</p>
            <p id="remove"><a href="#" onclick="node.removeBookmark(${key});">削除</a></p>
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

  nw();
  ipcMain.handle('options', () => {
    if (BrowserWindow.fromBrowserView(optionView)) {
      win.removeBrowserView(optionView);
    } else {
      win.addBrowserView(optionView);
      optionView.setBounds({
        x: win.getSize()[0] - 270,
        y: viewY - 35,
        width: 250,
        height: 450
      });
      win.on('resize', () => {
        optionView.setBounds({
          x: win.getSize()[0] - 270,
          y: viewY - 35,
          width: 250,
          height: 450
        });
      });
      win.setTopBrowserView(optionView);
    }
  });
});

app.on('window-all-closed', () => {
  if (!isMac) app.quit();
});
app.on('activate', () => {
  if (win === null) nw();
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

  setting.webContents.executeJavaScript(`
    document.getElementsByTagName('select')[0].value = '${enginesConfig.get('engine')}';
  `);

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
        title: 'CSSテーマを選択',
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
      preload: `${directory}/preload/history.js`
    }
  });
  historyWin.webContents.loadFile(`${directory}/renderer/history/index.html`);
  // objectからHTMLに変換
  const histories = history.getAll();
  let html = '';
  // eslint-disable-next-line
  for (const [key, value] of Object.entries(histories)) {
    html = `
      ${html}
      <div onclick="node.open('${value.pageUrl}');">
        <div class="history-favicon" style="background-image: url('${value.pageIcon}');"></div>
        <div class="history-details">
          <p>${value.pageTitle}</p>
        </div>
      </div>
    `;
  }
  historyWin.webContents.executeJavaScript(`
    document.getElementById('histories').innerHTML = \`${html}\`;
  `);
}
function showBookmark() {
  const bookmarkWin = new BrowserWindow({
    width: 760,
    height: 480,
    minWidth: 300,
    minHeight: 270,
    icon: `${directory}/image/logo.ico`,
    webPreferences: {
      preload: `${directory}/preload/bookmark.js`
    }
  });
  bookmarkWin.webContents.loadFile(`${directory}/renderer/bookmark/index.html`);
  bookmark.update();
  // objectからHTMLに変換
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
          <p><a href="javascript:node.removeBookmark(${key});">削除</a></p>
        </div>
      </div>
    `;
  }
  bookmarkWin.webContents.executeJavaScript(`
    document.getElementById('bookmarks').innerHTML = \`${html}\`;
  `);
}

// menu
// Windows and Linux (menu, contextmenu)
const menuTemplate = [
  {
    label: '表示',
    submenu: [
      {
        role: 'togglefullscreen',
        accelerator: 'F11',
        label: '全画面表示'
      },
      {
        role: 'hide',
        label: '隠す'
      },
      {
        role: 'hideothers',
        label: '他を隠す'
      },
      {
        label: '終了',
        accelerator: 'CmdOrCtrl+Q',
        click: () => {
          windowClose();
        }
      }
    ]
  },
  {
    label: '移動',
    id: 'move',
    submenu: [
      {
        label: '再読み込み',
        accelerator: 'CmdOrCtrl+R',
        click: () => {
          tabs.get().reload();
        }
      },
      {
        label: '戻る',
        accelerator: 'Alt+Left',
        click: () => {
          tabs.get().goBack();
        }
      },
      {
        label: '進む',
        accelerator: 'Alt+Right',
        click: () => {
          tabs.get().goForward();
        }
      }
    ]
  },
  {
    label: '編集',
    submenu: [
      {
        label: 'カット',
        role: 'cut'
      },
      {
        label: 'コピー',
        role: 'copy'
      },
      {
        label: 'ペースト',
        role: 'paste'
      },
      {
        label: '全て選択',
        role: 'selectAll'
      }
    ]
  },
  {
    label: 'ウィンドウ',
    submenu: [
      {
        label: 'Monotについて',
        accelerator: 'CmdOrCtrl+Alt+A',
        click: () => {
          dialog.showMessageBox(null, {
            type: 'info',
            icon: './src/image/logo.png',
            title: 'Monotについて',
            message: 'Monotについて',
            detail: `Monot by monochrome. v.1.0.0 Official Version (Build 7)
バージョン: 1.0.0 Official Version
ビルド番号: 7
開発元: monochrome Project.

リポジトリ: https://github.com/mncrp/monot
公式サイト: https://www.monochrome.tk/project/monot/

Copyright ©︎ 2021-2022 monochrome Project.`
          });
        }
      },
      {
        label: '設定',
        accelerator: 'CmdOrCtrl+,',
        click: () => {
          showSetting();
        }
      },
      {
        type: 'separator'
      },
      {
        label: '新しいタブ',
        accelerator: 'CmdOrCtrl+T',
        click: () => {
          try {
            newtab();
          } catch (e) {
            nw();
          }
        }
      }
    ]
  },
  {
    label: '開発',
    submenu: [
      {
        label: '開発者向けツール',
        accelerator: 'F12',
        click: () => {
          tabs.get().entity.webContents.toggleDevTools();
        }
      },
      {
        label: '開発者向けツール',
        accelerator: 'CmdOrCtrl+Shift+I',
        visible: false,
        click: () => {
          tabs.get().entity.webContents.toggleDevTools();
        }
      }
    ]
  }
];
// macOS (Menu)
const menuTemplateMac = [
  {
    label: 'Monot',
    submenu: [
      {
        label: 'Monotについて',
        accelerator: 'CmdOrCtrl+Alt+A',
        click: () => {
          dialog.showMessageBox(null, {
            type: 'info',
            icon: './src/image/logo-mac.png',
            title: 'Monotについて',
            message: 'Monotについて',
            detail: `Monot by monochrome. v.1.0.0 Official Version (Build 7)
バージョン: 1.0.0 Official Version
ビルド番号: 7
開発元: monochrome Project.

リポジトリ: https://github.com/mncrp/monot
公式サイト: https://www.monochrome.tk/project/monot/

Copyright ©︎ 2021-2022 monochrome Project.`
          });
        }
      },
      {
        type: 'separator'
      },
      {
        role: 'togglefullscreen',
        accelerator: 'F11',
        label: '全画面表示'
      },
      {
        role: 'hide',
        label: '隠す'
      },
      {
        role: 'hideothers',
        label: '他を隠す'
      },
      {
        label: '終了',
        accelerator: 'CmdOrCtrl+Q',
        click: () => {
          windowClose();
          app.quit();
        }
      }
    ]
  },
  {
    label: '表示',
    id: 'view',
    submenu: [
      {
        label: '再読み込み',
        accelerator: 'CmdOrCtrl+R',
        click: () => {
          tabs.get().reload();
        }
      },
      {
        label: '戻る',
        accelerator: 'Alt+Left',
        click: () => {
          tabs.get().goBack();
        }
      },
      {
        label: '進む',
        accelerator: 'Alt+Right',
        click: () => {
          tabs.get().goForward();
        }
      },
      {
        type: 'separator'
      },
      {
        label: '拡大',
        accelerator: 'CmdOrCtrl+^',
        click: () => {
          tabs.get().entity.webContents.send('zoom');
        }
      },
      {
        label: '縮小',
        accelerator: 'CmdOrCtrl+-',
        click: () => {
          tabs.get().entity.webContents.send('shrink');
        }
      },
      {
        label: '等倍',
        accelerator: 'CmdOrCtrl+0',
        click: () => {
          tabs.get().entity.webContents.send('actual');
        }
      },
      {
        label: '拡大',
        accelerator: 'CmdOrCtrl+Shift+Plus',
        visible: false,
        click: () => {
          tabs.get().entity.webContents.send('zoom');
        }
      }
    ]
  },
  {
    label: '編集',
    submenu: [
      {
        label: 'カット',
        role: 'cut'
      },
      {
        label: 'コピー',
        role: 'copy'
      },
      {
        label: 'ペースト',
        role: 'paste'
      },
      {
        label: '全て選択',
        role: 'selectAll'
      }
    ]
  },
  {
    label: 'ウィンドウ',
    submenu: [
      {
        label: '新しいタブ',
        accelerator: 'CmdOrCtrl+T',
        click: () => {
          try {
            newtab();
          } catch (e) {
            nw();
          }
        }
      },
      {
        label: '設定',
        accelerator: 'CmdOrCtrl+,',
        click: () => {
          showSetting();
        }
      }
    ]
  },
  {
    label: '開発',
    submenu: [
      {
        label: '開発者向けツール',
        accelerator: 'F12',
        click: () => {
          tabs.get().entity.webContents.toggleDevTools();
        }
      },
      {
        label: '開発者向けツール',
        accelerator: 'CmdOrCtrl+Option+I',
        visible: false,
        click: () => {
          tabs.get().entity.webContents.toggleDevTools();
        }
      }
    ]
  },
  {
    label: 'ヘルプ',
    submenu: [
      {
        label: '公式サイト',
        click: () => {
          if (tabs.get() !== null) {
            tabs.get().load('https://www.monochrome.tk/project/monot');
          }
        }
      }
    ]
  }
];
// macOS (context)
const contextTemplateMac = [
  {
    label: '戻る',
    click: () => {
      tabs.get().goBack();
    }
  },
  {
    label: '進む',
    click: () => {
      tabs.get().goForward();
    }
  },
  {
    label: '再読み込み',
    click: () => {
      tabs.get().reload();
    }
  },
  {
    type: 'separator'
  },
  {
    label: '縮小',
    click: () => {
      tabs.get().entity.webContents.setZoomLevel(
        tabs.get().entity.webContents.getZoomLevel() - 1
      );
    }
  },
  {
    label: '実際のサイズ',
    click: () => {
      tabs.get().entity.webContents.setZoomLevel(
        1
      );
    }
  },
  {
    label: '拡大',
    click: () => {
      tabs.get().entity.webContents.setZoomLevel(
        tabs.get().entity.webContents.getZoomLevel() + 1
      );
    }
  },
  {
    label: '開発者向けツール',
    click: () => {
      tabs.get().entity.webContents.toggleDevTools();
    }
  }
];

if (isMac) {
  menu = Menu.buildFromTemplate(menuTemplateMac);
  // macOS (context menu)
  context = Menu.buildFromTemplate(contextTemplateMac);
} else {
  menu = Menu.buildFromTemplate(menuTemplate);
  context = menu;
}

Menu.setApplicationMenu(menu);
