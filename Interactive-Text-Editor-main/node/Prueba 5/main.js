const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

let win;

function createWindow() {
  win = new BrowserWindow({
    width: 1000,
    height: 800,
    resizable: false, // Ventana fija
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    backgroundColor: '#1e1e1e'
  });

  const filePath = path.join(__dirname, 'contenido.txt');
  const imagesDir = path.join(__dirname, 'imagenes');

  win.loadFile('index.html').then(() => {
    // Enviar contenido de texto desde el inicio
    if (fs.existsSync(filePath)) {
      const text = fs.readFileSync(filePath, 'utf-8');
      win.webContents.send('file-changed', text);
    }

    // Enviar imágenes desde el inicio
    if (fs.existsSync(imagesDir)) {
      const imageFiles = fs.readdirSync(imagesDir).filter(f => /\.(png|jpe?g|gif|webp)$/i.test(f));

      const bannersTop = imageFiles.filter(f => f.startsWith('top_')).map(f => 'file://' + path.join(imagesDir, f));
      const mobileImgs = imageFiles.filter(f => f.startsWith('mobile_')).map(f => 'file://' + path.join(imagesDir, f));
      const bannersBottom = imageFiles.filter(f => f.startsWith('bottom_')).map(f => 'file://' + path.join(imagesDir, f));

      win.webContents.send('load-images', { bannersTop, mobileImgs, bannersBottom });
    }
  });

  // Vigilar cambios en el archivo de texto
  fs.watch(path.dirname(filePath), (eventType, filename) => {
    if (filename === path.basename(filePath)) {
      if (fs.existsSync(filePath)) {
        const text = fs.readFileSync(filePath, 'utf-8');
        win.webContents.send('file-changed', text);
      } else {
        win.webContents.send('file-changed', '');
      }
    }
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
