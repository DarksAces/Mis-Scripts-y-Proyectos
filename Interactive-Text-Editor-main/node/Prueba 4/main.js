const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');

let win;

const filePath = path.join(__dirname, 'contenido.txt');
const imagesDir = path.join(__dirname, 'imagenes');

// Crear archivos/directorios si no existen
function ensureFilesExist() {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, '', 'utf-8');
  }
  
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }
}

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      enableRemoteModule: false,
      nodeIntegration: false
    },
    backgroundColor: '#1e1e1e',
    show: false // No mostrar hasta que esté listo
  });

  win.loadFile('index.html');

  // Mostrar ventana cuando esté lista
  win.once('ready-to-show', () => {
    win.show();
  });

  // Enviar contenido e imágenes al cargar la ventana
  win.webContents.on('did-finish-load', () => {
    loadAndSendContent();
    loadAndSendImages();
  });

  // Vigilar cambios externos en contenido.txt (MUY IMPORTANTE)
  if (fs.existsSync(filePath)) {
    console.log('Iniciando vigilancia del archivo:', filePath);
    
    fs.watch(filePath, { persistent: true }, (eventType, filename) => {
      console.log('Evento detectado:', eventType, filename);
      
      if (eventType === 'change') {
        // Pequeño delay para asegurar que el archivo se escribió completamente
        setTimeout(() => {
          loadAndSendContent(true);
        }, 100);
      }
    });
  } else {
    console.log('Archivo no existe, creándolo...');
    fs.writeFileSync(filePath, '', 'utf-8');
    
    // Iniciar vigilancia después de crear el archivo
    fs.watch(filePath, { persistent: true }, (eventType, filename) => {
      console.log('Evento detectado:', eventType, filename);
      
      if (eventType === 'change') {
        setTimeout(() => {
          loadAndSendContent(true);
        }, 100);
      }
    });
  }

  // Vigilar cambios en la carpeta de imágenes
  if (fs.existsSync(imagesDir)) {
    fs.watch(imagesDir, (eventType, filename) => {
      if (filename && /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(filename)) {
        setTimeout(() => {
          loadAndSendImages();
        }, 100); // Small delay to ensure file is fully written
      }
    });
  }
}

function loadAndSendContent(isExternal = false) {
  try {
    if (fs.existsSync(filePath)) {
      const text = fs.readFileSync(filePath, 'utf-8');
      console.log('Enviando contenido:', isExternal ? 'CAMBIO EXTERNO' : 'carga inicial', text.substring(0, 50) + '...');
      
      if (win && win.webContents) {
        if (isExternal) {
          win.webContents.send('external-file-changed', text);
        } else {
          win.webContents.send('file-changed', text);
        }
      }
    }
  } catch (error) {
    console.error('Error loading content:', error);
  }
}

function loadAndSendImages() {
  try {
    if (fs.existsSync(imagesDir)) {
      const imageFiles = fs.readdirSync(imagesDir)
        .filter(file => /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(file))
        .map(file => 'file://' + path.join(imagesDir, file).replace(/\\/g, '/'));
      
      if (win && win.webContents) {
        win.webContents.send('load-images', imageFiles);
      }
    }
  } catch (error) {
    console.error('Error loading images:', error);
  }
}

// Guardar cambios desde la app (solo cuando se usa Ctrl+S)
ipcMain.on('save-file', (event, text) => {
  try {
    fs.writeFileSync(filePath, text, 'utf-8');
    console.log('Archivo guardado desde Electron');
  } catch (error) {
    console.error('Error saving file:', error);
  }
});

// Inicializar la aplicación
app.whenReady().then(() => {
  ensureFilesExist();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    ensureFilesExist();
    createWindow();
  }
});

// Manejar errores no capturados
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
});