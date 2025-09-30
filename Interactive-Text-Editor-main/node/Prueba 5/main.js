const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');

let win;

// Archivos
const userFile = path.join(__dirname, 'contenido.txt'); // archivo que edita el usuario externamente
const appFile  = path.join(__dirname, 'app.txt');       // copia interna de la app
const imagesDir = path.join(__dirname, 'imagenes');

let lastUserText = null; // para detectar cambios reales

function createWindow() {
  win = new BrowserWindow({
    width: 1000,
    height: 800,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    backgroundColor: '#1e1e1e'
  });

  // Mostrar rutas de archivos en consola
  console.log('Ruta contenido.txt:', userFile);
  console.log('Ruta app.txt:', appFile);
  console.log('Directorio actual:', __dirname);

  win.loadFile('index.html').then(() => {
    // Cargar contenido inicial desde contenido.txt
    if (fs.existsSync(userFile)) {
      const initialText = fs.readFileSync(userFile, 'utf-8');
      lastUserText = initialText;
      win.webContents.send('file-changed', initialText);
    } else {
      console.log('⚠ contenido.txt no existe, creándolo...');
      fs.writeFileSync(userFile, '', 'utf-8');
    }

    // Enviar imágenes al renderer
    if (fs.existsSync(imagesDir)) {
      const imageFiles = fs.readdirSync(imagesDir).filter(f => /\.(png|jpe?g|gif|webp)$/i.test(f));
      const bannersTop = imageFiles.filter(f => f.startsWith('top_')).map(f => 'file://' + path.join(imagesDir, f));
      const mobileImgs = imageFiles.filter(f => f.startsWith('mobile_')).map(f => 'file://' + path.join(imagesDir, f));
      const bannersBottom = imageFiles.filter(f => f.startsWith('bottom_')).map(f => 'file://' + path.join(imagesDir, f));
      win.webContents.send('load-images', { bannersTop, mobileImgs, bannersBottom });
    }
  });

  // Vigilar cambios en contenido.txt con fs.watch (detecta inmediatamente al guardar)
  fs.watch(userFile, (eventType) => {
    if (eventType === 'change') {
      try {
        const text = fs.readFileSync(userFile, 'utf-8');
        if (text !== lastUserText) {
          fs.writeFileSync(appFile, text, 'utf8');
          lastUserText = text;
          console.log('✓ app.txt actualizado. Contenido:', text.substring(0, 50) + '...');
          if (win) win.webContents.send('file-changed', text);
        }
      } catch (err) {
        console.error('✗ Error leyendo/guardando:', err);
      }
    }
  });

  // Backup: revisar cada 500ms por si fs.watch falla
  setInterval(() => {
    if (fs.existsSync(userFile)) {
      const text = fs.readFileSync(userFile, 'utf-8');
      if (text !== lastUserText) {
        try {
          fs.writeFileSync(appFile, text, 'utf8');
          lastUserText = text;
          console.log('✓ app.txt actualizado (polling). Contenido:', text.substring(0, 50) + '...');
          if (win) win.webContents.send('file-changed', text);
        } catch (err) {
          console.error('✗ Error guardando app.txt:', err);
        }
      }
    }
  }, 500); // cada medio segundo como respaldo
}

// Listener opcional (ya no se usa)
ipcMain.on('autosave', (event, text) => {
  // No hace nada ahora
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});