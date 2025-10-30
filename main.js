// main.js
require('dotenv').config();
const { app, BrowserWindow, Menu, ipcMain, shell, dialog } = require('electron');
const ExcelJS = require('exceljs');
const supabase = require('./src/database/connect');
const path = require('path');

// Variável global para a janela principal para evitar que seja coletada pelo garbage collector
let mainWindow;

function createMainWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            // O preload é essencial para a comunicação segura entre Main e Renderer
            preload: path.join(__dirname, 'src/preload.js'),
            contextIsolation: true, // Recomendado para segurança
            nodeIntegration: false, // Recomendado para segurança
        },
        icon: path.join(__dirname, 'src/assets/icon.png'),
    });

    // Carrega o HTML da janela principal
    mainWindow.loadFile('src/views/index.html');
}

// Função para criar a janela de login
function createLoginWindow() {
    const loginWindow = new BrowserWindow({
        width: 400,
        height: 600,
        frame: false, // Janela sem bordas padrão
        resizable: false,
        webPreferences: {
            preload: path.join(__dirname, 'src/preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        }
    });
    loginWindow.loadFile('src/views/login.html');
}

// Função para criar a janela de cadastro
function createRegisterWindow() {
    const registerWindow = new BrowserWindow({
        width: 400,
        height: 600,
        frame: false,
        resizable: false,
        webPreferences: {
            preload: path.join(__dirname, 'src/preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        }
    });
    registerWindow.loadFile('src/views/register.html');
}

app.whenReady().then(async () => {
    // Verifica se há uma sessão ativa do Supabase
    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
        // Se o usuário já estiver logado, abre a janela principal
        createMainWindow();
    } else {
        // Se não, abre a janela de login
        createLoginWindow();
    }

    // Lógica para macOS
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0 && !session) {
            createLoginWindow();
        }
    });

    // Construir o menu a partir do template
    const mainMenu = Menu.buildFromTemplate(menuTemplate);
    Menu.setApplicationMenu(mainMenu);
});

// Encerrar o app quando todas as janelas forem fechadas (exceto no macOS)
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// --- Comunicação IPC ---
// Ouve o evento 'login-success' do renderer de login
ipcMain.on('login-success', (event, userData) => {
    console.log('Login bem-sucedido para:', userData.user.email);
    createMainWindow();
    // Fecha todas as outras janelas (login/cadastro)
    BrowserWindow.getAllWindows().forEach(win => {
        if (win !== mainWindow) win.close();
    });
});

// Ouve o evento para abrir a janela de cadastro
ipcMain.on('open-register-window', () => {
    createRegisterWindow();
    // Fecha todas as outras janelas (no caso, a de login)
    BrowserWindow.getAllWindows().forEach(win => {
        if (win.webContents.getURL().includes('login.html')) win.close();
    });
});

// Ouve o evento para voltar para a janela de login
ipcMain.on('open-login-window', () => {
    createLoginWindow();
    // Fecha todas as janelas que não sejam a principal ou a de login
    BrowserWindow.getAllWindows().forEach(win => {
        const url = win.webContents.getURL();
        if (url.includes('register.html') || url.includes('login.html')) {
            win.close();
        }
    });
});

// Função auxiliar para buscar transações
async function getTransactionsFromDb() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const { data } = await supabase.from('transactions').select('*').eq('user_id', user.id);
    return data || [];
}
// Ouve o evento para fechar a aplicação
ipcMain.on('quit-app', () => {
    app.quit();
});

// Ouve o evento para fechar a janela que o enviou
ipcMain.on('window:close', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win.close();
});

// --- Template do Menu Superior ---
const menuTemplate = [
    {
        label: 'Arquivo',
        submenu: [
            {
                label: 'Nova Transação',
                accelerator: 'CmdOrCtrl+N', // Atalho de teclado
                click: () => {
                    // Envia uma mensagem para a janela principal para abrir o modal de nova transação
                    mainWindow.webContents.send('open-new-transaction-modal');
                }
            },
            {
                label: 'Logout',
                click: async () => {
                    // Invalida a sessão do Supabase e volta para a tela de login
                    await supabase.auth.signOut();
                    mainWindow.close();
                    mainWindow = null;
                    createLoginWindow();
                }
            },
            { type: 'separator' }, // Linha divisória
            {
                label: 'Sair',
                accelerator: 'CmdOrCtrl+Q',
                click: () => {
                    app.quit();
                }
            }
        ]
    },
    {
        label: 'Editar',
        submenu: [
            { label: 'Desfazer', role: 'undo' },
            { label: 'Refazer', role: 'redo' },
            { type: 'separator' },
            { label: 'Recortar', role: 'cut' },
            { label: 'Copiar', role: 'copy' },
            { label: 'Colar', role: 'paste' },
        ]
    },
    {
        label: 'Exibir',
        submenu: [
            { role: 'reload' },
            { role: 'forceReload' },
            { type: 'separator' },
            { role: 'toggleDevTools', label: 'Alternar Ferramentas do Desenvolvedor', accelerator: 'Ctrl+Shift+I' },
        ]
    },
    {
        label: 'Ajuda',
        submenu: [
            {
                label: 'Documentação',
                click: async () => {
                    // Abre um link externo no navegador padrão do usuário
                    await shell.openExternal('https://github.com/seu-usuario/seu-repo');
                }
            },
            {
                label: 'Sobre',
                click: () => {
                    // Aqui você pode criar uma pequena janela "Sobre"
                    console.log('Abrir janela "Sobre"');
                }
            }
        ]
    }
];

// --- Handlers de IPC para Autenticação e DB ---
ipcMain.handle('auth:login', async (event, email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
    });
    if (error) return { error };
    return { data };
});

ipcMain.handle('auth:register', async (event, email, password) => {
    const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
    });
    if (error) return { error };
    return { data };
});

// Handlers para o CRUD
ipcMain.handle('db:add-transaction', async (event, transaction) => {
    // Garante que o user_id seja o do usuário logado
    const { data: { user } } = await supabase.auth.getUser();
    transaction.user_id = user.id;

    const { data, error } = await supabase.from('transactions').insert([transaction]).select();
    if (error) console.error('Erro ao adicionar transação:', error);
    return { data, error };
});

// Handlers para o CRUD
ipcMain.handle('db:get-transactions', async () => {
    return await getTransactionsFromDb();
});

ipcMain.handle('db:delete-transaction', async (event, id) => {
    const { data, error } = await supabase.from('transactions').delete().match({ id: id }).select();
    if (error) console.error('Erro ao deletar transação:', error);
    return { data, error };
});

ipcMain.handle('db:update-transaction', async (event, id, updates) => {
    const { data, error } = await supabase.from('transactions').update(updates).match({ id: id }).select();
    if (error) console.error('Erro ao atualizar transação:', error);
    return { data, error };
});

// --- Handler para Exportar Relatório para Excel ---
ipcMain.handle('export:excel-report', async (event, reportData) => {
    try {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Relatório Mensal');

        // Definir cabeçalhos
        worksheet.columns = [
            { header: 'Mês', key: 'month', width: 15 },
            { header: 'Total Receitas', key: 'receitas', width: 20 },
            { header: 'Total Despesas', key: 'despesas', width: 20 },
            { header: 'Saldo do Mês', key: 'saldo', width: 20 }
        ];

        // Estilo para o cabeçalho
        worksheet.getRow(1).eachCell((cell) => {
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }; // Branco
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF0A1931' } // primary-dark
            };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.border = {
                top: { style: 'thin', color: { argb: 'FFD3D3D3' } },
                left: { style: 'thin', color: { argb: 'FFD3D3D3' } },
                bottom: { style: 'thin', color: { argb: 'FFD3D3D3' } },
                right: { style: 'thin', color: { argb: 'FFD3D3D3' } }
            };
        });

        // Adicionar dados e aplicar estilos
        reportData.forEach((row, index) => {
            const excelRow = worksheet.addRow({
                month: row.month,
                receitas: row.receitas,
                despesas: row.despesas,
                saldo: row.saldo
            });

            // Estilo para as células
            excelRow.eachCell((cell, colNumber) => {
                cell.alignment = { vertical: 'middle', horizontal: 'left' };
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FFD3D3D3' } },
                    left: { style: 'thin', color: { argb: 'FFD3D3D3' } },
                    bottom: { style: 'thin', color: { argb: 'FFD3D3D3' } },
                    right: { style: 'thin', color: { argb: 'FFD3D3D3' } }
                };
                if (colNumber === 2) { // Receitas
                    cell.font = { color: { argb: 'FF50C878' } }; // primary-accent
                } else if (colNumber === 3) { // Despesas
                    cell.font = { color: { argb: 'FFE57373' } }; // danger-red
                } else if (colNumber === 4) { // Saldo
                    cell.font = { bold: true, color: { argb: row.saldo >= 0 ? 'FF50C878' : 'FFE57373' } };
                }
            });

            // Fundo alternado para as linhas
            if (index % 2 === 0) {
                excelRow.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFF8FAFC' } // background-light (um cinza bem claro)
                };
            }
        });

        const { filePath } = await dialog.showSaveDialog(mainWindow, {
            title: 'Salvar Relatório Mensal',
            defaultPath: `relatorio_mensal_${new Date().toISOString().slice(0, 10)}.xlsx`,
            filters: [{ name: 'Arquivos Excel', extensions: ['xlsx'] }]
        });

        if (filePath) {
            await workbook.xlsx.writeFile(filePath);
            return { success: true };
        }
        return { success: false, error: 'Nenhum arquivo selecionado.' };

    } catch (error) {
        console.error('Erro ao exportar relatório para Excel:', error);
        return { success: false, error: error.message };
    }
});