const {
  BrowserView,
  app,
  nativeTheme,
  MenuItem,
  webContents,
  Menu
} = require('electron');

const global = require('./global');
const {contextTemplate} = require('./menu');

const fs = require('fs');
const directory = `${__dirname}/..`;
let viewY = 66;
const {LowLevelConfig} = require(`${directory}/proprietary/lib/config.js`);
const monotConfig = new LowLevelConfig('config.mncfg').copyFileIfNeeded(`${directory}/default/config/config.mncfg`);
const enginesConfig = new LowLevelConfig('engines.mncfg').copyFileIfNeeded(`${directory}/default/config/engines.mncfg`);
const bookmark = new LowLevelConfig('bookmark.mndata').copyFileIfNeeded(`${directory}/default/data/bookmark.mndata`);
let windowSize;
if (monotConfig.update().get('ui') === 'thin') viewY = 29;

function replaceBackslashes(str) {
  return str.replace(/\\/g, "\/");
}

class ViewY {
  constructor() {
    this.type = monotConfig.update().get('ui');
  }

  get() {
    return viewY;
  }

  getHtmlClass() {
    let value;
    switch (this.type) {
    case 'thin': value = 'thin'; break;
    case 'default': value = ''; break;
    }
    return value;
  }

  toThin() {
    viewY = 29;
    monotConfig
      .update()
      .set('ui', 'thin')
      .save();
    this.type = 'thin';
    return 29;
  }

  toDefault() {
    viewY = 66;
    monotConfig
      .update()
      .set('ui', 'default')
      .save();
    this.type = 'default';
    return 66;
  }
}

class TabManager {
  constructor() {

    this.tabs = [];
    this.current = 0;

  }

  setCurrent(index) {

    global.win.webContents.executeJavaScript(`
      try {
        document.getElementById('opened')?.removeAttribute('id');
        {
          const tabEl = document.querySelectorAll('div > span');
          if (tabEl[${index}] !== undefined) {
            tabEl[${index}].setAttribute('id', 'opened');
          } else {
            tabEl[tabEl.length - 1].setAttribute('id', 'opened');
          }
        }
      } catch(e) {
        alert(e)
      }
    `);

    global.win.setTopBrowserView(this.tabs[index].entity);
    this.tabs[index].setWindowTitle();
    this.current = index;
    this.tabs[index].setTitleUrl();
    this.tabs[index].replace();

  }

  push(data) {
    this.tabs.push(data);
  }

  length() {
    return this.tabs.length;
  }

  get(index = this.current) {
    return this.tabs[index];
  }

  removeTab(index = this.current) {

    global.win.removeBrowserView(this.tabs[index].entity);
    this.tabs[index].entity.webContents.destroy();
    global.win.webContents.executeJavaScript(`
      document.getElementsByTagName('yomikomi-bar')[0]
      .removeAttribute('id');
      document.getElementsByTagName('tab-el')[0].getElementsByTagName('span')[${index}].remove();
    `);
    this.tabs[index] = null;
    this.tabs.splice(index, 1);

    if (index >= this.tabs.length) {
      index -= 1;
    }

    try {
      this.setCurrent(index);
    } catch (e) {
      if (this.tabs.length === 0) {
        global.windowClose();
      }
    }

  }

  newTab(shouldMoveCurrent = true, url) {

    const tab = new Tab(url);
    tab.number = () => this.tabs.indexOf(tab);
    this.push(tab);
    if (shouldMoveCurrent) {
      this.setCurrent(this.length() - 1);
    }

    tab.entity.webContents.on('context-menu', (e, params) => {
      const selection = params.selectionText;
      if (selection !== '') {
        global.context.closePopup();
        enginesConfig.update();
        global.context.insert(0, new MenuItem({
          label: `"${selection}"を調べる`,
          id: 'search',
          click: () => {
            const selectEngine = enginesConfig.get('engine');
            const engineURL = enginesConfig.get(`values`, true).find((item) => item.id === selectEngine).url;
            this.newTab(true, `${engineURL}${selection}`);
          }
        }));
      }
      if (params.mediaType === 'image' && params.srcURL !== '') {
        global.context.closePopup();
        global.context.insert(0, new MenuItem({
          label: `選択した画像を開く`,
          id: 'openImage',
          click: () => {
            this.newTab(true, params.srcURL);
          }
        }));
        global.context.insert(0, new MenuItem({
          label: `選択した画像をコピー`,
          id: 'saveImage',
          click: () => {
            webContents.getFocusedWebContents().copyImageAt(params.x, params.y);
          }
        }));
      }
      global.context.popup();
      global.context = Menu.buildFromTemplate(contextTemplate);
    });

    tab.entity.webContents.setWindowOpenHandler((details) => {
      this.newTab(true, details.url);
      return {
        action: 'deny'
      };
    });
  }

  move(target, destination) {

    this.tabs.splice(destination, 0, this.tabs[target]);
    this.tabs.splice(target > destination ? target + 1 : target, 1);
    this.setCurrent(destination);

  }
}

class Tab {
  constructor(url = new URL(`file://${directory}/browser/home.html`)) {

    if (!(url instanceof URL)) {
      url = new URL(url);
    }
    this.url = url;
    this.faviconUrl;

    const browserView = new BrowserView({
      backgroundColor: '#efefef',
      webPreferences: {
        scrollBounce: true,
        nodeIntegrationInSubFrames: true,
        sandbox: false,
        preload: `${directory}/preload/pages.js`
      }
    });
    browserView.webContents.session.setDownloadPath(app.getPath('downloads'));
    browserView.webContents.setUserAgent(
      browserView.webContents.getUserAgent()
        .replace('monot', 'Chrome')
        .replace(/Electron\/[0-9 | .]/, '')
        .replace('Chrome/2.0.1', '')
    );

    try {
      global.win.webContents.executeJavaScript(`
        document.getElementsByTagName('div')[0].innerHTML += '<span><img src=""><p>Home</p><p></p></span>';
        each();
      `);
    } catch (e) {
      global.windowOpen();
    }

    // events
    // did-fail-load
    browserView.webContents.on('did-fail-load', (e, errCode) => {
      if (errCode !== -105) return;
      this.load(
        `file://${directory}/browser/server-notfound.html`
      );
      browserView.webContents.executeJavaScript(`
        window.translated = () => {
          document.getElementsByTagName('span')[0].innerText='${browserView.webContents.getURL().toLowerCase()}';
        };
      `);
    });
    // dom-ready
    browserView.webContents.on('dom-ready', () => {
      global.win.webContents.executeJavaScript(`
        document.getElementsByTagName('yomikomi-bar')[0].setAttribute(
          'id',
          'loaded'
        );
      `);

      browserView.webContents.setVisualZoomLevelLimits(1, 10);
      browserView.webContents.setZoomFactor(1);

      this.url = new URL(browserView.webContents.getURL());
      // Homeならば
      const fileURL = new URL(`file://${directory}/browser/home.html`);

      if (this.url.href === fileURL.href) {
        enginesConfig.update();
        const wallpaper = monotConfig.update().get('wallpaper');
        const selectEngine = enginesConfig.get('engine');
        const engineURL = enginesConfig.get(`values`, true).find((item) => item.id === selectEngine).url;
        const bookmarks = bookmark.update().data;
        let html = '';
        let i = 0;
        // eslint-disable-next-line
        for (const [key, value] of Object.entries(bookmarks)) {
          if (i < 7)
            i += 1;
          else
            break;

          html = `
            ${html}
            <div class="one-bookmark" onclick="location.href = '${value.pageUrl}';">
              <div class="one-image" style="background-image: url('${value.pageIcon}');"></div>
              <p class="one-title">${value.pageTitle}</p>
            </div>
          `;
        }
        browserView.webContents.executeJavaScript(`
          url = '${engineURL}';
          document.getElementById('bookmarks-content').innerHTML = \`${html}\`;
        `);
        browserView.webContents.insertCSS(`
          :root {
            --wallpaper: url('file://${wallpaper}')!important;
          }
        `);
      }
      // favicon-updated
      browserView.webContents.on('page-favicon-updated', (e, favicons) => {
        global.win.webContents.executeJavaScript(`
          document.getElementsByTagName('tab-el')[0].getElementsByTagName('span')[${this.number()}]
            .getElementsByTagName('img')[0]
            .src = '${favicons[0]}';
        `);
      });

      // オプション機能系
      monotConfig.update();
      if (monotConfig.get('cssTheme') !== '') {
        const style = monotConfig.get('cssTheme');
        browserView.webContents.executeJavaScript(`
          document.head.innerHTML += '<link rel="stylesheet" href="${replaceBackslashes(style)}">'
        `);
      }

      const experiments = monotConfig.get('experiments');
      // Force-Dark
      if (experiments.forceDark === true) {
        browserView.webContents.insertCSS(
          fs.readFileSync(
            `${directory}/proprietary/style/forcedark.css`,
            'utf-8'
          )
        );
      }
      // fontChange
      if (experiments.fontChange === true) {
        browserView.webContents.insertCSS(`
          body, body > *, * {
            font-family: '${experiments.changedfont}','Noto Sans JP'!important;
          }
        `);
      }
    });
    // did-start-loading
    // こいつらはタイミング指定しているのでpreloadにしない
    browserView.webContents.on('did-start-loading', () => {
      try {
        global.win.webContents.executeJavaScript(`
          document.getElementsByTagName('yomikomi-bar')[0].setAttribute(
            'id',
            'loading'
          );
        `);
      } catch (e) {
        console.error(e);
      }
    });
    // did-finish-load
    browserView.webContents.on('did-finish-load', () => {
      if (nativeTheme.shouldUseDarkColors && !monotConfig.get('experiments').whiteInDark) {
        browserView.setBackgroundColor('#222');
      } else {
        browserView.setBackgroundColor('#efefef');
      }
      this.setTabTitle();
      this.setWindowTitle();
    });
    // did-stop-loading
    browserView.webContents.on('did-stop-loading', () => {
      try {
        // changes the progress
        global.win.webContents.executeJavaScript(`
          document.getElementsByTagName('yomikomi-bar')[0]
            .removeAttribute('id');
          document.getElementsByTagName('span')[${this.number()}]
            .getElementsByTagName('img')[0]
            .src = '';  
        `);
        this.setTitleUrl();
      } catch (e) {
        console.error(e);
      }
    });
    // when the page title is updated (update the window title and tab title) config.mncfg
    browserView.webContents.on('page-title-updated', () => {
      this.setTabTitle();
      this.setWindowTitle();
    });

    // last init
    global.win.addBrowserView(browserView);
    browserView.webContents.setZoomLevel(1);

    windowSize = global.win.getSize();
    browserView.setBounds({
      x: 0,
      y: viewY,
      width: windowSize[0],
      height: windowSize[1] - viewY
    });
    global.win.on('resize', () => {
      windowSize = global.win.getSize();
      browserView.setBounds({
        x: 0,
        y: viewY,
        width: windowSize[0],
        height: windowSize[1] - viewY
      });
    });

    this.entity = browserView;
    this.load(url.href);

  }

  load(url = new URL(`file://${directory}/browser/home.html`)) {
    const originalURL = url;
    try {
      if (!(url instanceof URL)) {
        try {
          url = new URL(url);
        } catch (e) {
          if (url.match(/\S+\.\S+/)) {
            url = new URL(`http://${url}`);
          } else {
            url = new URL(enginesConfig.update().get(`values`, true).find((item) => item.id === enginesConfig.get('engine')).url.replace('%s', originalURL));
          }
        }
      }
    } catch (e) {
      url = new URL(`file://${directory}/browser/home.html`);
    }
    this.entity.webContents.loadURL(url.href);
  }

  // This function sets URL to the URL bar of the title bar.
  setTitleUrl() {
    try {
      const url = this.url;
      // If the URL is Monot build-in HTML, the URL is not set in the URL bar.
      const srcPath = new URL(`file://${__dirname}/../browser/`);

      switch (`${url.protocol}//${url.pathname}`) {
      case `${srcPath}home.html`:
        return global.win.webContents.executeJavaScript(`
          document.getElementsByTagName('input')[0].value = '';
        `);
      case `${srcPath}server-notfound.html`:
      case `${srcPath}blank.html`:
        return Promise.resolve();
      }

      // Set URL in the URL bar.
      return global.win.webContents.executeJavaScript(`
        document.getElementsByTagName('input')[0].value =
          '${url.host}${url.pathname}${url.search}${url.hash}';
      `);
    } catch (e) {
      return e;
    }
  }

  // set tab's title.
  setTabTitle() {
    try {
      global.win.webContents.executeJavaScript(`
        document.getElementsByTagName('tab-el')[0].getElementsByTagName('span')[${this.number()}]
          .getElementsByTagName('p')[0]
          .innerText='${this.entity.webContents.getTitle()}';
      `);
    } catch (e) {
      console.error(e);
    }
  }

  // set window's title.
  setWindowTitle() {

    try {
      const srcPath = new URL(`file://${__dirname}/../`);
      if (this.url.href === `${srcPath}browser/home.html`) {
        global.win.webContents.executeJavaScript(`
          document.getElementsByTagName('title')[0].innerText = 'Monot by monochrome.';
        `);
      } else {
        global.win.webContents.executeJavaScript(`
          document.getElementsByTagName('title')[0].innerText = '${this.entity.webContents.getTitle()} - Monot';
        `);
      }
    } catch (e) {
      console.error(e);
    }

  }

  goBack() {
    this.entity.webContents.stop();
    this.entity.webContents.goBack();
  }

  goForward() {
    this.entity.webContents.goForward();
  }

  reload() {
    if (this.entity.webContents.isLoading() === true) return;
    this.entity.webContents.reload();
  }

  replace() {

    try {
      const windowSize = global.win.getSize();
      this.entity.setBounds({
        x: 0,
        y: viewY,
        width: windowSize[0],
        height: windowSize[1] - viewY
      });
      global.win.webContents.executeJavaScript(`
        if (document.body.classList.contains('mac'))
          document.body.className = 'mac ${new ViewY().getHtmlClass()}';
        else
          document.body.className = '${new ViewY().getHtmlClass()}';
      `);
    } catch (e) {
      console.error(e);
    }
  }
}

module.exports = {
  Tab,
  TabManager,
  ViewY
};
