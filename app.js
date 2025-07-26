const {
    app,BrowserWindow  
} = require("electron");

let appWindow;

if(require('electron-squirrel-startup')) app.quit();

function createWindow() {
    appWindow = new BrowserWindow({
        width: 1920,
        height: 1080,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });
    appWindow.loadFile("dist/pix-studio-pro/browser/index.html");

    appWindow.on("closed", () => {
        appWindow = null;
    })
}

app.whenReady().then(() => {
    createWindow();
    // app.on("activate", () => {
    //     if (appWindow === null) {
    //         createWindow();
    //     }
    // });
});