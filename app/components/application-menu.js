const { app, Menu, MenuItem, shell } = require('electron');
const { getJvmLog } = require('../helpers/javaHelper');
const settings = require('electron-settings');
const path = require('path');

function buildUrl(win, language, path) {
  settings.set('general', { 'language': language });
  let currLocation = win.webContents.getURL();
  let locArray = currLocation.split("#")[0].split("?");
  return locArray[0] + "?locale=" + language + path
}

module.exports = class ApplicationMenu {
  constructor() {
    this.language = settings.get('general.language') != null ? settings.get('general.language') : "en";
    this.template;
  }

  createMenu(win, debug) {

    const homeMenu = {
      label: 'Home',
      click: () => {
        win.loadURL(buildUrl(win, this.language, "#home"));
      }
    };

    const createMenu = {
      label: 'Create',
      click: () => {
        win.loadURL(buildUrl(win, this.language, "#create"));
      }
    };

    const manageMenu = {
      label: 'Manage',
      click: () => {
        win.loadURL(buildUrl(win, this.language, "#desktop-database"));
      }
    };

    const optionsMenu = {
      label: 'Options',
      role: 'options',
      submenu: [
        {
          label: 'Language',
          role: 'language',
          submenu: [
            {
              label: 'Português Europeu',
              type: 'radio',
              click: () => {
                this.language = "pt_PT"
                win.loadURL(buildUrl(win, this.language, "#" + win.webContents.getURL().split("#")[1]));
              },
            }, {
              label: 'English',
              type: 'radio', checked: true,
              click: () => {
                this.language = "en"
                win.loadURL(buildUrl(win, this.language, "#" + win.webContents.getURL().split("#")[1]));
              },
            }
          ]
        }
      ]
    }

    const helpMenu = {
      label: 'Help',
      role: 'help',
      submenu: [
        {
          label: 'Learn More',
          click: () => {
            shell.openExternal('https://visualization.database-preservation.com/')
          }
        },
        {
          label: 'Logs',
          role: 'logs',
          submenu: [
            {
              label: 'DBPTK logs',
              role: 'dbvtkLog',
              click: () => {
                if(process.env.SNAP_USER_COMMON){
                  shell.openItem(path.join(process.env.SNAP_USER_COMMON, '.dbvtk', 'log'));
                } else {
                  shell.openItem(path.join(app.getPath('home'), '.dbvtk', 'log'));
                }
              }
            },
            {
              label: 'JVM',
              role: 'jvmLog',
              click: () => {
                shell.openItem(getJvmLog());
              }
            }
          ]
        },
        {
          label: 'Toggle Developer Tools',
          accelerator: (() => {
            if (process.platform === 'darwin') {
              return 'Alt+Command+I'
            } else {
              return 'Ctrl+Shift+I'
            }
          })(),
          click: (item, focusedWindow) => {
            if (focusedWindow) {
              focusedWindow.toggleDevTools()
            }
          }
        },
      ]
    }

    const template = [
      //For MacOS
      ...(process.platform === 'darwin' ? [{
        label: app.getName(),
        submenu: [
          homeMenu,
          createMenu,
          manageMenu,
          optionsMenu,
        ]
      }] : []),
      homeMenu,
      createMenu,
      manageMenu,
      optionsMenu,
      helpMenu
    ]

    var menu = Menu.buildFromTemplate(template)

    // set TK_DEBUG=1 for use debug mode
    if (debug) {
      menu.append(new MenuItem({
        label: 'Debug',
        submenu: [
          {
            label: 'Toggle Developer Tools',
            accelerator: (() => {
              if (process.platform === 'darwin') {
                return 'Alt+Command+I'
              } else {
                return 'Ctrl+Shift+I'
              }
            })(),
            click: (item, focusedWindow) => {
              if (focusedWindow) {
                focusedWindow.toggleDevTools()
              }
            }
          },
          {
            label: 'GWT',
            submenu: [{
              label: 'Compile',
              click: () => {
                win.loadURL("javascript:%7B%20window.__gwt_bookmarklet_params%20%3D%20%7Bserver_url%3A'http%3A%2F%2F127.0.0.1%3A9876%2F'%2Cmodule_name%3A'com.databasepreservation.main.desktop.Desktop'%7D%3B%20var%20s%20%3D%20document.createElement('script')%3B%20s.src%20%3D%20'http%3A%2F%2F127.0.0.1%3A9876%2Fdev_mode_on.js'%3B%20void(document.getElementsByTagName('head')%5B0%5D.appendChild(s))%3B%7D");
              }
            }, {
              label: 'Turn Off',
              click: () => {
                win.loadURL("javascript:%7Bvar%20toRemove%20%3D%20%5B%5D%3B%20for(var%20i%20%3D%200%3B%20i%3CsessionStorage.length%3B%20i%2B%2B)%20%7B%20%20var%20key%20%3D%20sessionStorage.key(i)%3B%20%20if%20(key.indexOf('__gwtDevModeHook%3A')%20%3D%3D%200)%20%7B%20%20%20%20toRemove.push(key)%3B%20%20%7D%7D%20for%20(var%20j%20%3D%200%3B%20j%3CtoRemove.length%3B%20j%2B%2B)%20%7B%20%20%20sessionStorage.removeItem(toRemove%5Bj%5D)%3B%20%7D%20window.location.reload()%3B%7D")
              }
            }]
          }
        ]
      }))
    }
    Menu.setApplicationMenu(menu);
  }
}