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

  // Vigilancia ROBUSTA del archivo con múltiples métodos
  if (fs.existsSync(filePath)) {
    console.log('Iniciando vigilancia del archivo:', filePath);
    
    let lastContent = '';
    let lastMtime = 0;
    
    // Leer contenido inicial
    try {
      lastContent = fs.readFileSync(filePath, 'utf-8');
      const stats = fs.statSync(filePath);
      lastMtime = stats.mtime.getTime();
    } catch (error) {
      console.error('Error leyendo archivo inicial:', error);
    }
    
    // Método 1: fs.watch (para editores que escriben directamente)
    fs.watch(filePath, { persistent: true }, (eventType, filename) => {
      console.log('fs.watch - Evento detectado:', eventType, filename);
      
      if (eventType === 'change') {
        setTimeout(() => {
          checkFileChanges();
        }, 100);
      }
    });
    
    // Método 2: Polling cada 500ms (más confiable)
    const pollInterval = setInterval(() => {
      checkFileChanges();
    }, 500);
    
    // Función para verificar cambios reales
    function checkFileChanges() {
      try {
        if (fs.existsSync(filePath)) {
          const stats = fs.statSync(filePath);
          const currentMtime = stats.mtime.getTime();
          
          // Solo si el archivo realmente cambió
          if (currentMtime !== lastMtime) {
            const currentContent = fs.readFileSync(filePath, 'utf-8');
            
            if (currentContent !== lastContent) {
              console.log('¡CAMBIO DETECTADO! Enviando actualización...');
              console.log('Contenido anterior:', lastContent.substring(0, 50));
              console.log('Contenido nuevo:', currentContent.substring(0, 50));
              
              lastContent = currentContent;
              lastMtime = currentMtime;
              
              if (win && win.webContents) {
                win.webContents.send('external-file-changed', currentContent);
              }
            }
          }
        }
      } catch (error) {
        console.error('Error verificando cambios:', error);
      }
    }
    
    // Limpiar interval cuando se cierre la app
    app.on('before-quit', () => {
      clearInterval(pollInterval);
    });
    
  } else {
    console.log('Archivo no existe, creándolo...');
    fs.writeFileSync(filePath, '', 'utf-8');
    
    // Reiniciar la vigilancia después de crear el archivo
    setTimeout(() => {
      createWindow();
    }, 100);
    return;
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