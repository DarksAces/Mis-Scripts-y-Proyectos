const { contextBridge, ipcRenderer } = require('electron');

// Exponer API segura al contexto del renderizador
contextBridge.exposeInMainWorld('electronAPI', {
  // Escuchar cambios iniciales del archivo
  onFileChange: (callback) => {
    ipcRenderer.on('file-changed', (event, text) => callback(text));
  },
  
  // Escuchar cambios externos del archivo (ESTE ES EL MÁS IMPORTANTE)
  onExternalFileChange: (callback) => {
    ipcRenderer.on('external-file-changed', (event, text) => callback(text));
  },
  
  // Escuchar carga de imágenes
  onLoadImages: (callback) => {
    ipcRenderer.on('load-images', (event, images) => callback(images));
  },
  
  // Guardar archivo (solo para Ctrl+S manual)
  saveFile: (text) => {
    ipcRenderer.send('save-file', text);
  }
});