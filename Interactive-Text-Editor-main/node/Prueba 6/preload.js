const { contextBridge } = require('electron');
const fs = require('fs');
const path = require('path');

const userFile = path.join(__dirname, 'contenido.txt');
const imagesDir = path.join(__dirname, 'imagenes');

console.log('Preload: Rutas configuradas');
console.log('Archivo:', userFile);
console.log('Imágenes:', imagesDir);

contextBridge.exposeInMainWorld('electronAPI', {
  loadFile: () => {
    try {
      if (fs.existsSync(userFile)) {
        const content = fs.readFileSync(userFile, 'utf-8');
        console.log('Preload: Archivo leído, longitud:', content.length);
        return content;
      }
      console.log('Preload: Archivo no existe, creando vacío');
      fs.writeFileSync(userFile, '', 'utf-8');
      return '';
    } catch (error) {
      console.error('Preload: Error loading file:', error);
      return '';
    }
  },
  
  saveFile: (text) => {
    try {
      fs.writeFileSync(userFile, text, 'utf-8');
      console.log('Preload: Archivo guardado, longitud:', text.length);
      return true;
    } catch (error) {
      console.error('Preload: Error saving file:', error);
      return false;
    }
  },
  
  onFileChange: (callback) => {
    try {
      if (!fs.existsSync(userFile)) {
        fs.writeFileSync(userFile, '', 'utf-8');
      }
      
      // Initial load
      const initialContent = fs.readFileSync(userFile, 'utf-8');
      console.log('Preload: Configurando watcher, contenido inicial:', initialContent.length);
      callback(initialContent);
      
      // Watch for changes
      const watcher = fs.watch(userFile, (eventType) => {
        if (eventType === 'change') {
          try {
            const content = fs.readFileSync(userFile, 'utf-8');
            console.log('Preload: Archivo cambió, nueva longitud:', content.length);
            callback(content);
          } catch (error) {
            console.error('Preload: Error reading file change:', error);
          }
        }
      });
      
      return () => watcher.close();
    } catch (error) {
      console.error('Preload: Error setting up file watcher:', error);
    }
  },
  
  loadImages: () => {
    try {
      if (!fs.existsSync(imagesDir)) {
        console.log('Preload: Directorio de imágenes no existe, creando...');
        fs.mkdirSync(imagesDir, { recursive: true });
        return { bannersTop: [], mobileImgs: [], bannersBottom: [] };
      }
      
      const files = fs.readdirSync(imagesDir)
        .filter(f => /\.(png|jpe?g|gif|webp|svg)$/i.test(f));
      
      console.log('Preload: Archivos encontrados:', files);
      
      const result = {
        bannersTop: files
          .filter(f => f.startsWith('top_'))
          .sort()
          .map(f => {
            const fullPath = path.join(imagesDir, f);
            console.log('Preload: Banner top ->', fullPath);
            return fullPath;
          }),
        bannersBottom: files
          .filter(f => f.startsWith('bottom_'))
          .sort()
          .map(f => {
            const fullPath = path.join(imagesDir, f);
            console.log('Preload: Banner bottom ->', fullPath);
            return fullPath;
          }),
        mobileImgs: files
          .filter(f => f.startsWith('mobile_'))
          .sort()
          .map(f => {
            const fullPath = path.join(imagesDir, f);
            console.log('Preload: Mobile ->', fullPath);
            return fullPath;
          })
      };
      
      console.log('Preload: Imágenes cargadas:', {
        top: result.bannersTop.length,
        bottom: result.bannersBottom.length,
        mobile: result.mobileImgs.length
      });
      
      return result;
    } catch (error) {
      console.error('Preload: Error loading images:', error);
      return { bannersTop: [], mobileImgs: [], bannersBottom: [] };
    }
  }
});