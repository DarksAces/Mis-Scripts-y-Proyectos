function createWindow() {
  win = new BrowserWindow({
    width: 1000,
    height: 2000,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    },
    backgroundColor: '#1e1e1e'
  });

  // Abrir la consola de desarrollo para depuración
  win.webContents.openDevTools();

  win.loadFile('index.html');

  const filePath = path.join(__dirname, 'contenido.txt');
  const dirPath = path.dirname(filePath);
  const imagesDir = path.join(__dirname, 'imagenes');

  // Vigilar el archivo de texto
  fs.watch(dirPath, (eventType, filename) => {
    if (filename === path.basename(filePath)) {
      if (fs.existsSync(filePath)) {
        const text = fs.readFileSync(filePath, 'utf-8');
        win.webContents.send('file-changed', text);
      } else {
        win.webContents.send('file-deleted');
      }
    }
  });

  // Leer imágenes de la carpeta
  if (fs.existsSync(imagesDir)) {
    const imageFiles = fs.readdirSync(imagesDir).filter(file => /\.(png|jpe?g|gif|webp)$/i.test(file));
    
    // Separar por tipo
    const bannersTop = imageFiles.filter(f => f.startsWith('top_')).map(f => 'file://' + path.join(imagesDir, f));
    const mobileImgs = imageFiles.filter(f => f.startsWith('mobile_')).map(f => 'file://' + path.join(imagesDir, f));
    const bannersBottom = imageFiles.filter(f => f.startsWith('bottom_')).map(f => 'file://' + path.join(imagesDir, f));

    win.webContents.on('did-finish-load', () => {
      win.webContents.send('load-images', { bannersTop, mobileImgs, bannersBottom });
    });
  }
}
