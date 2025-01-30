const {
  Menu,
  dialog,
  app,
} = require('electron');
const lang = require('../proprietary/lib/lang');

const global = require('./global');

const isMac = process.platform === 'darwin';

const aboutContent = {
  type: 'info',
  icon: isMac ? './src/image/logo-mac.png' : './src/image/logo.png',
  title: lang.getAbout('title'),
  message: lang.getAbout('title'),
  detail: `Monot by monochrome. v.2.0.1 (Build 13)
${lang.getAbout('version')}: 2.0.1
${lang.getAbout('build_no')}: 13
${lang.getAbout('developer')}: monochrome Project.

${lang.getAbout('repository')}: https://github.com/mncrp/monot
${lang.getAbout('official_website')}: https://mncrp.github.io/project/monot/

Copyright ©︎ 2021-2024 monochrome Project.`
};

const navigationContextMenuTemplate = [
  {
    label: lang.get('go_back'),
    click: () => {
      global.tabs.get().goBack();
    }
  },
  {
    label: lang.get('go_forward'),
    click: () => {
      global.tabs.get().goForward();
    }
  },
  {
    type: 'separator'
  },
  {
    label: lang.get('new_tab'),
    click: () => {
      global.tabs.newTab();
    }
  },
  {
    type: 'separator'
  },
  {
    label: lang.get('setting'),
    click: () => {
      global.showSetting();
    }
  },
  {
    label: lang.get('history'),
    click: () => {
      global.showHistory();
    }
  },
  {
    label: lang.get('bookmark'),
    click: () => {
      global.showBookmark();
    }
  }
];
global.navigationContextMenu = Menu.buildFromTemplate(navigationContextMenuTemplate);
// Menu
const menuTemplate = [
  {
    label: 'Monot',
    submenu: [
      {
        label: lang.getAbout('title'),
        accelerator: 'CmdOrCtrl+Alt+A',
        click: () => {
          dialog.showMessageBox(null, aboutContent);
        }
      },
      {
        label: lang.get('setting'),
        accelerator: 'CmdOrCtrl+,',
        click: () => {
          global.showSetting();
        }
      },
      {
        type: 'separator'
      },
      {
        role: 'hideothers',
        label: lang.get('hideothers')
      },
      {
        role: 'hide',
        label: lang.get('hide'),
        accelerator: 'CmdOrCtrl+H',
        click: () => {
          global.win.hide();
        }
      },
      {
        type: 'separator'
      },
      {
        label: lang.get('quit'),
        accelerator: 'CmdOrCtrl+Q',
        click: () => {
          global.windowClose();
          app.quit();
        }
      }
    ]
  },
  {
    label: lang.get('file'),
    submenu: [
      {
        label: lang.get('new_tab'),
        accelerator: 'CmdOrCtrl+T',
        click: () => {
          global.tabs.newTab();
        }
      },
      {
        type: 'separator'
      },
      {
        label: lang.get('close_tab'),
        accelerator: 'CmdOrCtrl+W',
        click: () => {
          global.tabs.removeTab();
        }
      },
      {
        label: lang.get('close_window'),
        accelerator: 'CmdOrCtrl+Shift+W',
        click: () => {
          global.windowClose();
        }
      }
    ]
  },
  {
    label: lang.get('edit'),
    submenu: [
      {
        label: lang.get('redo'),
        role: 'redo'
      },
      {
        label: lang.get('undo'),
        role: 'undo'
      },
      {
        type: 'separator'
      },
      {
        label: lang.get('cut'),
        role: 'cut'
      },
      {
        label: lang.get('copy'),
        role: 'copy'
      },
      {
        label: lang.get('paste'),
        role: 'paste'
      },
      {
        role: lang.get('pasteAndMatchStyle'),
        label: 'ペーストしてスタイルを合わせる'
      },
      {
        label: lang.get('delete'),
        role: 'delete'
      },
      {
        label: lang.get('selectAll'),
        role: 'selectAll'
      }
    ]
  },
  {
    label: lang.get('view'),
    id: 'view',
    submenu: [
      {
        label: lang.get('reload'),
        accelerator: 'CmdOrCtrl+R',
        click: () => {
          global.tabs.get().reload();
        }
      },
      {
        label: lang.get('go_back'),
        accelerator: 'Alt+Left',
        click: () => {
          global.tabs.get().goBack();
        }
      },
      {
        label: lang.get('go_forward'),
        accelerator: 'Alt+Right',
        click: () => {
          global.tabs.get().goForward();
        }
      },
      {
        type: 'separator'
      },
      {
        label: lang.get('zoom'),
        accelerator: 'CmdOrCtrl+^',
        click: () => {
          global.tabs.get().entity.webContents.send('zoom');
        }
      },
      {
        label: lang.get('shrink'),
        accelerator: 'CmdOrCtrl+-',
        click: () => {
          global.tabs.get().entity.webContents.send('shrink');
        }
      },
      {
        label: lang.get('actual'),
        accelerator: 'CmdOrCtrl+0',
        click: () => {
          global.tabs.get().entity.webContents.send('actual');
        }
      },
      {
        label: lang.get('zoom'),
        accelerator: 'CmdOrCtrl+Shift+Plus',
        visible: false,
        click: () => {
          global.tabs.get().entity.webContents.send('zoom');
        }
      },
      {
        role: 'toggleFullScreen',
        label: lang.get('toggleFullScreen')
      },
      {
        type: 'separator'
      },
      {
        label: lang.get('develop'),
        submenu: [
          {
            label: lang.get('devTools'),
            accelerator: 'F12',
            click: () => {
              global.tabs.get().entity.webContents.toggleDevTools();
            }
          },
          {
            label: lang.get('view_source'),
            accelerator: 'CmdOrCtrl+Alt+U',
            click: () => {
              global.tabs.newTab(true, `view-source:${global.tabs.get().entity.webContents.getURL()}`);
            }
          },
          {
            label: lang.get('devTools'),
            accelerator: 'CmdOrCtrl+Option+I',
            visible: false,
            click: () => {
              global.tabs.get().entity.webContents.toggleDevTools();
            }
          }
        ]
      }
    ]
  },
  {
    label: lang.get('window'),
    submenu: [
      {
        label: lang.get('minimize'),
        role: 'minimize'
      },
      {
        label: lang.get('zoom_shrink'),
        click: () => {
          if (isMac)
            global.win.isFullScreen() ? global.win.fullScreen = false : global.win.fullScreen = true;
          else
            global.win.isMaximized() ? global.win.unmaximize() : global.win.maximize();
        }
      },
      {
        type: 'separator'
      },
      {
        label: lang.get('fix_tab'),
        accelerator: 'CmdOrCtrl+Shift+F',
        click: () => {
          if (global.win !== null) {
            global.win.webContents.executeJavaScript(`
              document.getElementsByTagName('tab-el')[0]
                .getElementsByTagName('span')[${global.tabs.current}]
                .classList.toggle('fixed');
            `);
          }
        }
      },
      {
        label: '1タブ',
        visible: false,
        accelerator: 'CmdOrCtrl+1',
        click: () => {
          global.tabs.setCurrent(0);
        }
      },
      {
        label: '2タブ',
        visible: false,
        accelerator: 'CmdOrCtrl+2',
        click: () => {
          try {
            global.tabs.setCurrent(1);
          } catch (e) {
            return;
          }
        }
      },
      {
        label: '3タブ',
        visible: false,
        accelerator: 'CmdOrCtrl+3',
        click: () => {
          try {
            global.tabs.setCurrent(2);
          } catch (e) {
            return;
          }
        }
      },
      {
        label: '4タブ',
        visible: false,
        accelerator: 'CmdOrCtrl+4',
        click: () => {
          try {
            global.tabs.setCurrent(3);
          } catch (e) {
            return;
          }
        }
      },
      {
        label: '5タブ',
        visible: false,
        accelerator: 'CmdOrCtrl+5',
        click: () => {
          try {
            global.tabs.setCurrent(4);
          } catch (e) {
            return;
          }
        }
      },
      {
        label: '6タブ',
        visible: false,
        accelerator: 'CmdOrCtrl+6',
        click: () => {
          try {
            global.tabs.setCurrent(5);
          } catch (e) {
            return;
          }
        }
      },
      {
        label: '7タブ',
        visible: false,
        accelerator: 'CmdOrCtrl+7',
        click: () => {
          try {
            global.tabs.setCurrent(6);
          } catch (e) {
            return;
          }
        }
      },
      {
        label: '8タブ',
        visible: false,
        accelerator: 'CmdOrCtrl+8',
        click: () => {
          try {
            global.tabs.setCurrent(7);
          } catch (e) {
            return;
          }
        }
      },
      {
        label: '9タブ',
        visible: false,
        accelerator: 'CmdOrCtrl+9',
        click: () => {
          try {
            global.tabs.setCurrent(8);
          } catch (e) {
            return;
          }
        }
      }
    ]
  },
  {
    label: lang.get('help'),
    role: 'help',
    submenu: [
      {
        label: lang.getAbout('official_website'),
        click: () => {
          if (global.tabs.get() !== null) {
            global.tabs.get().load('https://mncrp.github.io/project/monot/');
          }
        }
      },
      {
        label: lang.get('document'),
        click: () => {
          if (global.tabs.get() !== null) {
            global.tabs.get().load('https://mncrp.github.io/docs/monot/');
          }
        }
      }
    ]
  }
];
// context
const contextTemplate = [
  {
    label: lang.get('go_back'),
    click: () => {
      global.tabs.get().goBack();
    }
  },
  {
    label: lang.get('go_forward'),
    click: () => {
      global.tabs.get().goForward();
    }
  },
  {
    label: lang.get('reload'),
    click: () => {
      global.tabs.get().reload();
    }
  },
  {
    type: 'separator'
  },
  {
    label: lang.get('zoom'),
    click: () => {
      global.tabs.get().entity.webContents.setZoomLevel(
        global.tabs.get().entity.webContents.getZoomLevel() + 1
      );
    }
  },
  {
    label: lang.get('shrink'),
    click: () => {
      global.tabs.get().entity.webContents.setZoomLevel(
        global.tabs.get().entity.webContents.getZoomLevel() - 1
      );
    }
  },
  {
    label: lang.get('actual'),
    click: () => {
      global.tabs.get().entity.webContents.setZoomLevel(
        1
      );
    }
  },
  {
    type: 'separator'
  },
  {
    label: lang.get('devTools'),
    click: () => {
      global.tabs.get().entity.webContents.toggleDevTools();
    }
  },
  {
    label: lang.get('view_source'),
    click: () => {
      global.tabs.newTab(true, `view-source:${global.tabs.get().entity.webContents.getURL()}`);
    }
  }
];

const menu = Menu.buildFromTemplate(menuTemplate);
global.context = Menu.buildFromTemplate(contextTemplate);

Menu.setApplicationMenu(menu);

module.exports = {
  aboutContent,
  menu,
  menuTemplate,
  contextTemplate,
  navigationContextMenuTemplate
};
