const { contextBridge, ipcRenderer } = require('electron');

// Exponer API segura al contexto del renderizador
contextBridge.exposeInMainWorld('electronAPI', {
  // Escuchar cambios iniciales del archivo
  onFileChange: (callback) => {
    const wrappedCallback = (event, text) => callback(text);
    ipcRenderer.on('file-changed', wrappedCallback);
    
    // Devolver función para limpiar
    return () => ipcRenderer.removeListener('file-changed', wrappedCallback);
  },
  
  // Escuchar cambios externos del archivo
  onExternalFileChange: (callback) => {
    const wrappedCallback = (event, text) => callback(text);
    ipcRenderer.on('external-file-changed', wrappedCallback);
    
    return () => ipcRenderer.removeListener('external-file-changed', wrappedCallback);
  },
  
  // Escuchar carga de imágenes
  onLoadImages: (callback) => {
    const wrappedCallback = (event, images) => callback(images);
    ipcRenderer.on('load-images', wrappedCallback);
    
    return () => ipcRenderer.removeListener('load-images', wrappedCallback);
  },
  
  // Guardar archivo
  saveFile: (text) => {
    ipcRenderer.send('save-file', text);
  }
});