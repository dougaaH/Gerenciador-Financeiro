// src/preload.js
const { contextBridge, ipcRenderer } = require('electron');

// Expõe funções seguras para o processo de renderização
contextBridge.exposeInMainWorld('api', {
  // Exemplo: Função para enviar dados de login para o processo principal
  login: (email, password) => ipcRenderer.invoke('auth:login', email, password),

  // Exemplo: Função para registrar um novo usuário
  register: (email, password) => ipcRenderer.invoke('auth:register', email, password),

  // Função para notificar o main process sobre o sucesso do login
  notifyLoginSuccess: (userData) => ipcRenderer.send('login-success', userData),

  // Funções para o CRUD de transações
  getTransactions: () => ipcRenderer.invoke('db:get-transactions'),
  addTransaction: (transaction) => ipcRenderer.invoke('db:add-transaction', transaction),
  deleteTransaction: (id) => ipcRenderer.invoke('db:delete-transaction', id),
  updateTransaction: (id, updates) => ipcRenderer.invoke('db:update-transaction', id, updates),

  // Função para exportar relatório para Excel
  exportExcelReport: (reportData) => ipcRenderer.invoke('export:excel-report', reportData),

  // Recebe eventos do main process (ex: para abrir o modal de nova transação)
  on: (channel, callback) => {
    const subscription = (event, ...args) => callback(...args);
    ipcRenderer.on(channel, subscription);
    // Retorna uma função para remover o listener, boa prática para evitar memory leaks
    return () => ipcRenderer.removeListener(channel, subscription);
  },
  // Envia eventos para o main process
  send: (channel, data) => ipcRenderer.send(channel, data),

  // Função para fechar a aplicação
  quitApp: () => ipcRenderer.send('quit-app'),

  // Função para fechar a janela atual
  closeWindow: () => ipcRenderer.send('window:close'),
});
