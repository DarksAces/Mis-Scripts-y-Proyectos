const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');

let win;

function createWindow() {
  win = new BrowserWindow({
    width: 1000,
    height: 2000,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    },
    backgroundColor: '#1e1e1e'
  });

  win.loadFile('index.html');

  const filePath = path.join(__dirname, 'contenido.txt');
  const imagesDir = path.join(__dirname, 'imagenes');

  // Guardamos último contenido para comparar
  let lastContent = '';

  // Polling cada 2 segundos (ajusta el intervalo)
  setInterval(() => {
    if (fs.existsSync(filePath)) {
      const text = fs.readFileSync(filePath, 'utf-8');
      if (text !== lastContent) {
        lastContent = text;
        win.webContents.send('file-changed', text);
      }
    }
  }, 1000);

  // Leer imágenes de la carpeta al cargar
  if (fs.existsSync(imagesDir)) {
    const imageFiles = fs.readdirSync(imagesDir)
      .filter(file => /\.(png|jpe?g|gif|webp)$/i.test(file))
      .map(file => 'file://' + path.join(__dirname, 'imagenes', file));

    win.webContents.on('did-finish-load', () => {
      win.webContents.send('load-images', imageFiles);
    });
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
