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
    console.log('📄 Archivo creado:', filePath);
  }
  
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
    console.log('📁 Directorio de imágenes creado:', imagesDir);
  }
}

// Función de vigilancia avanzada del archivo
function enhancedFileWatch() {
  if (fs.existsSync(filePath)) {
    console.log('🔍 Iniciando vigilancia avanzada del archivo:', filePath);
    
    let lastContent = '';
    let lastMtime = 0;
    let isProcessing = false;
    let watchInterval;
    
    // Leer contenido inicial
    try {
      lastContent = fs.readFileSync(filePath, 'utf-8');
      const stats = fs.statSync(filePath);
      lastMtime = stats.mtime.getTime();
      console.log('📖 Contenido inicial cargado:', {
        tamaño: lastContent.length,
        timestamp: new Date(lastMtime).toISOString()
      });
    } catch (error) {
      console.error('❌ Error leyendo archivo inicial:', error);
    }
    
    // Método 1: fs.watch (para editores que escriben directamente)
    const watcher = fs.watch(filePath, { persistent: true }, (eventType, filename) => {
      console.log('👀 fs.watch - Evento detectado:', eventType, filename);
      
      if (eventType === 'change') {
        setTimeout(() => {
          checkFileChanges();
        }, 100);
      }
    });
    
    // Método 2: Polling cada 500ms (más confiable)
    watchInterval = setInterval(() => {
      checkFileChanges();
    }, 500);
    
    // Función mejorada para verificar cambios
    async function checkFileChanges() {
      if (isProcessing) return;
      isProcessing = true;
      
      try {
        if (fs.existsSync(filePath)) {
          const stats = fs.statSync(filePath);
          const currentMtime = stats.mtime.getTime();
          
          // Solo si el archivo realmente cambió
          if (currentMtime !== lastMtime) {
            const currentContent = fs.readFileSync(filePath, 'utf-8');
            
            if (currentContent !== lastContent) {
              console.log('📢 CAMBIO DETECTADO:', {
                tamaño: currentContent.length,
                timestamp: new Date().toISOString()
              });
              
              lastContent = currentContent;
              lastMtime = currentMtime;
              
              if (win && !win.isDestroyed()) {
                win.webContents.send('external-file-changed', currentContent);
              }
            }
          }
        }
      } catch (error) {
        console.error('❌ Error en vigilancia:', error);
      } finally {
        isProcessing = false;
      }
    }
    
    // Limpiar recursos cuando se cierre la app
    app.on('before-quit', () => {
      console.log('🧹 Limpiando vigilancia de archivos...');
      if (watcher) watcher.close();
      if (watchInterval) clearInterval(watchInterval);
    });
    
    return () => {
      if (watcher) watcher.close();
      if (watchInterval) clearInterval(watchInterval);
    };
  } else {
    console.log('❌ Archivo no existe para vigilancia:', filePath);
    return null;
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
    show: false
  });

  win.loadFile('index.html');

  // Mostrar ventana cuando esté lista
  win.once('ready-to-show', () => {
    win.show();
    console.log('🚀 Ventana de Electron lista y mostrada');
  });

  // Enviar contenido e imágenes al cargar la ventana
  win.webContents.on('did-finish-load', () => {
    console.log('📦 Cargando contenido inicial...');
    loadAndSendContent();
    loadAndSendImages();
    
    // Iniciar vigilancia avanzada
    enhancedFileWatch();
  });

  // Vigilar cambios en la carpeta de imágenes
  if (fs.existsSync(imagesDir)) {
    console.log('🖼️ Iniciando vigilancia de imágenes...');
    fs.watch(imagesDir, (eventType, filename) => {
      if (filename && /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(filename)) {
        console.log('📸 Cambio detectado en imágenes:', eventType, filename);
        setTimeout(() => {
          loadAndSendImages();
        }, 100);
      }
    });
  }

  win.on('closed', () => {
    win = null;
    console.log('📝 Ventana cerrada');
  });
}

function loadAndSendContent(isExternal = false) {
  try {
    if (fs.existsSync(filePath)) {
      const text = fs.readFileSync(filePath, 'utf-8');
      const eventType = isExternal ? 'external-file-changed' : 'file-changed';
      
      console.log(`📤 Enviando contenido (${isExternal ? 'EXTERNO' : 'INICIAL'}):`, {
        tamaño: text.length
      });
      
      if (win && win.webContents && !win.isDestroyed()) {
        win.webContents.send(eventType, text);
      }
    } else {
      console.log('❌ Archivo no existe para enviar contenido');
    }
  } catch (error) {
    console.error('❌ Error cargando contenido:', error);
  }
}

function loadAndSendImages() {
  try {
    if (fs.existsSync(imagesDir)) {
      const imageFiles = fs.readdirSync(imagesDir)
        .filter(file => /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(file))
        .map(file => 'file://' + path.join(imagesDir, file).replace(/\\/g, '/'));
      
      console.log('🖼️ Enviando imágenes:', imageFiles.length);
      
      if (win && win.webContents && !win.isDestroyed()) {
        win.webContents.send('load-images', imageFiles);
      }
    } else {
      console.log('❌ Directorio de imágenes no existe');
    }
  } catch (error) {
    console.error('❌ Error cargando imágenes:', error);
  }
}

// IPC Handlers
ipcMain.on('save-file', (event, text) => {
  try {
    fs.writeFileSync(filePath, text, 'utf-8');
    console.log('💾 Archivo guardado desde Electron:', {
      tamaño: text.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error guardando archivo:', error);
  }
});

// Inicializar la aplicación
app.whenReady().then(() => {
  console.log('⚡ Electron app iniciando...');
  ensureFilesExist();
  createWindow();
});

app.on('window-all-closed', () => {
  console.log('🔚 Todas las ventanas cerradas');
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  console.log('🔃 App activada');
  if (BrowserWindow.getAllWindows().length === 0) {
    ensureFilesExist();
    createWindow();
  }
});

// Manejar errores no capturados
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught exception:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('💥 Unhandled rejection:', error);
});