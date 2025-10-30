// src/renderer/index.js

// --- Elementos do DOM ---
const modal = document.getElementById('transaction-modal');
const closeModalBtn = document.querySelector('.close-button');
const addTransactionBtn = document.getElementById('add-transaction-btn');
const transactionForm = document.getElementById('transaction-form');
const modalTitle = document.getElementById('modal-title');
const balanceAmountEl = document.getElementById('balance-amount');
const allTransactionsTableBody = document.querySelector('#all-transactions-table tbody');
const searchInput = document.getElementById('search-input');
const reportsTableBody = document.getElementById('reports-table-body');

// --- Elementos de Navegação ---
const navDashboard = document.getElementById('nav-dashboard');
const navTransactions = document.getElementById('nav-transactions');
const navReports = document.getElementById('nav-reports');
const dashboardView = document.getElementById('dashboard-view');
const transactionsView = document.getElementById('transactions-view');
const reportsView = document.getElementById('reports-view');

// --- Variáveis Globais ---
let allTransactions = []; // Cache local das transações

// --- Instâncias dos Gráficos (declaradas, mas inicializadas após o DOM) ---
let categoryChart;
let summaryChart;
let balanceEvolutionChart;

// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
    console.log('Chart.js disponível:', typeof Chart === 'function'); // Adicionado para depuração
    // Inicializa os gráficos PRIMEIRO, para que os objetos existam
    initializeCharts();
    loadTransactions();
});

addTransactionBtn.addEventListener('click', openAddModal);
closeModalBtn.addEventListener('click', closeModal);
window.addEventListener('click', (event) => {
    if (event.target == modal) {
        closeModal();
    }
});
transactionForm.addEventListener('submit', handleFormSubmit);

// --- Listeners de Navegação ---
navDashboard.addEventListener('click', () => showView('dashboard'));
navTransactions.addEventListener('click', () => showView('transactions'));
navReports.addEventListener('click', () => showView('reports'));
if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filteredTransactions = allTransactions.filter(tx => tx.description.toLowerCase().includes(searchTerm));
        renderAllTransactionsTable(filteredTransactions);
    });
}

// --- Funções ---
function updateDashboardView(transactions) {
    let receitas = 0;
    let despesas = 0;
    const gastosPorCategoria = {};
    const monthlySummary = {};

    // Cálculos para os gráficos usam TODAS as transações
    transactions.forEach(tx => {
        if (tx.type === 'receita') {
            receitas += tx.amount;
        } else {
            despesas += tx.amount;
            // Agrupa gastos por categoria
            if (gastosPorCategoria[tx.category]) {
                gastosPorCategoria[tx.category] += tx.amount;
            } else {
                gastosPorCategoria[tx.category] = tx.amount;
            }
        }

        // Agrupa por mês para os outros gráficos
        const month = tx.date.substring(0, 7); // Formato "YYYY-MM"
        if (!monthlySummary[month]) {
            monthlySummary[month] = { receitas: 0, despesas: 0 };
        }
        if (tx.type === 'receita') {
            monthlySummary[month].receitas += tx.amount;
        } else {
            monthlySummary[month].despesas += tx.amount;
        }
    });

    console.log('Gastos por Categoria calculados:', gastosPorCategoria);

    // Atualiza os gráficos e o saldo
    updateCategoryChart(gastosPorCategoria);
    updateMonthlySummaryChart(monthlySummary);
    updateBalanceEvolutionChart(monthlySummary);
    updateBalance(receitas, despesas);
}

function renderAllTransactionsTable(transactions) {
    allTransactionsTableBody.innerHTML = ''; // Limpa a tabela completa

    transactions.forEach(tx => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${new Date(tx.date).toLocaleDateString()}</td>
            <td>${tx.description}</td>
            <td style="color: ${tx.type === 'receita' ? 'var(--primary-accent)' : 'var(--danger-red)'}; font-weight: 600;">
                ${tx.type === 'receita' ? '+' : '-'} R$ ${tx.amount.toFixed(2)}
            </td>
            <td>${tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}</td>
            <td>
                <span class="category-badge" style="color: ${categoryColors[tx.category] || categoryColors['outros']}; font-weight: 600;">
                    ${tx.category.charAt(0).toUpperCase() + tx.category.slice(1)}
                </span>
            </td>
            <td>
                <button class="btn btn-outline edit-btn" data-id="${tx.id}" style="padding: 6px 12px; font-size: 0.8rem;">Editar</button>
                <button class="btn btn-danger delete-btn" data-id="${tx.id}" style="padding: 6px 12px; font-size: 0.8rem;">Excluir</button>
            </td>
        `;
        allTransactionsTableBody.appendChild(row);
    });

    // Adiciona a delegação de eventos para a nova tabela também
    allTransactionsTableBody.removeEventListener('click', handleTableClick); // Evita duplicar listeners
    allTransactionsTableBody.addEventListener('click', handleTableClick);
}

function updateBalance(receitas, despesas) {
    const saldo = receitas - despesas;
    balanceAmountEl.textContent = `R$ ${saldo.toFixed(2)}`;
}

async function loadTransactions() {
    // Busca transações usando a API do preload
    const transactions = await window.api.getTransactions();
    allTransactions = transactions || [];
    allTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    updateDashboardView(allTransactions);
    renderAllTransactionsTable(allTransactions); // Renderiza a tabela completa
    generateMonthlyReport(allTransactions); // Mantém a lógica para a aba de Relatórios
}

function openAddModal() {
    transactionForm.reset();
    document.getElementById('transaction-id').value = '';
    modalTitle.textContent = 'Nova Transação';
    // Preenche a data com o dia de hoje
    document.getElementById('date').valueAsDate = new Date();
    modal.style.display = 'block';
}

function openEditModal(id) {
    const transaction = allTransactions.find(tx => tx.id === id);
    if (!transaction) return;

    modalTitle.textContent = 'Editar Transação';
    document.getElementById('transaction-id').value = transaction.id;
    document.getElementById('description').value = transaction.description;
    document.getElementById('amount').value = transaction.amount;
    document.getElementById('type').value = transaction.type;
    document.getElementById('category').value = transaction.category;
    document.getElementById('date').value = transaction.date;

    modal.style.display = 'block';
}

function closeModal() {
    modal.style.display = 'none';
}

async function handleFormSubmit(event) {
    event.preventDefault();

    const transactionId = document.getElementById('transaction-id').value;
    const transaction = {
        description: document.getElementById('description').value,
        amount: parseFloat(document.getElementById('amount').value),
        type: document.getElementById('type').value,
        category: document.getElementById('category').value,
        date: document.getElementById('date').value,
    };

    if (transactionId) {
        // Atualizar transação existente
        const { error } = await window.api.updateTransaction(transactionId, transaction);
        if (error) return alert(`Erro ao atualizar: ${error.message}`);
    } else {
        // Adicionar nova transação
        const { error } = await window.api.addTransaction(transaction);
        if (error) return alert(`Erro ao adicionar: ${error.message}`);
    }

    closeModal();
    loadTransactions(); // Recarrega e renderiza a lista
}

// Delegação de eventos para os botões de editar e excluir
async function handleTableClick(event) {
    const target = event.target;
    const id = parseInt(target.getAttribute('data-id'));

    if (target.classList.contains('delete-btn')) {
        if (confirm('Tem certeza que deseja excluir esta transação?')) {
            const { error } = await window.api.deleteTransaction(id);
            if (error) return alert(`Erro ao deletar: ${error.message}`);
            loadTransactions(); // Recarrega a lista
        }
    }

    if (target.classList.contains('edit-btn')) {
        openEditModal(id);
    }
}

function showView(viewName) {
    // Esconde todas as telas
    dashboardView.classList.add('view-hidden');
    transactionsView.classList.add('view-hidden');
    reportsView.classList.add('view-hidden');

    // Remove a classe 'active' de todos os botões de navegação
    navDashboard.classList.remove('active');
    navTransactions.classList.remove('active');
    navReports.classList.remove('active');

    // Mostra a tela e ativa o botão correspondente
    if (viewName === 'dashboard') {
        dashboardView.classList.remove('view-hidden');
        navDashboard.classList.add('active');
        // Os dados já foram atualizados por loadTransactions()
    } else if (viewName === 'transactions') {
        transactionsView.classList.remove('view-hidden');
        navTransactions.classList.add('active');
        if (searchInput) {
            searchInput.value = ''; // Limpa a busca ao entrar na tela
        }
    } else if (viewName === 'reports') {
        reportsView.classList.remove('view-hidden');
        navReports.classList.add('active');
    }
}

function generateMonthlyReport(transactions) {
    const monthlySummary = {};

    transactions.forEach(tx => {
        const month = tx.date.substring(0, 7); // Formato "YYYY-MM"
        if (!monthlySummary[month]) {
            monthlySummary[month] = { receitas: 0, despesas: 0 };
        }
        if (tx.type === 'receita') {
            monthlySummary[month].receitas += tx.amount;
        } else {
            monthlySummary[month].despesas += tx.amount;
        }
    });

    reportsTableBody.innerHTML = '';
    Object.keys(monthlySummary).sort().reverse().forEach(month => {
        const summary = monthlySummary[month];
        const saldo = summary.receitas - summary.despesas;
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${month}</td>
            <td style="color: var(--primary-accent);">${summary.receitas.toFixed(2)}</td>
            <td style="color: var(--danger-red);">${summary.despesas.toFixed(2)}</td>
            <td style="font-weight: 600; color: ${saldo >= 0 ? 'var(--primary-accent)' : 'var(--danger-red)'};">
                ${saldo.toFixed(2)}
            </td>
        `;
        reportsTableBody.appendChild(row);
    });
}

// --- Lógica dos Gráficos ---

function initializeCharts() {
    // 1. Gráfico de Rosca: Gastos por Categoria
    const categoryCtx = document.getElementById('categoryChart').getContext('2d');
    categoryChart = new Chart(categoryCtx, {
        type: 'doughnut',
        data: {
            labels: [],
            datasets: [{
                label: 'Gastos por Categoria',
                data: [],
                backgroundColor: [],
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'bottom' },
                title: { display: false }
            },
        },
    });

    // 2. Gráfico de Barras: Receitas vs. Despesas por Mês
    const summaryCtx = document.getElementById('summaryChart').getContext('2d');
    summaryChart = new Chart(summaryCtx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Receitas',
                data: [],
                backgroundColor: 'rgba(80, 200, 120, 0.7)',
                borderColor: 'rgb(80, 200, 120)',
                borderWidth: 1
            }, {
                label: 'Despesas',
                data: [],
                backgroundColor: 'rgba(229, 115, 115, 0.7)',
                borderColor: 'rgb(229, 115, 115)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false, // Permite que o gráfico preencha o container
            scales: { y: { beginAtZero: true } }
        }
    });

    // 3. Gráfico de Linha: Evolução do Saldo Acumulado
    const balanceEvolutionCtx = document.getElementById('balanceEvolutionChart').getContext('2d');
    balanceEvolutionChart = new Chart(balanceEvolutionCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Saldo Acumulado',
                data: [],
                fill: true,
                backgroundColor: 'rgba(80, 200, 120, 0.2)',
                borderColor: 'rgb(80, 200, 120)',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false, // Permite que o gráfico preencha o container
            scales: { y: { beginAtZero: false } }
        }
    });
}

// Nova paleta de cores para gastos (evitando verde)
const expenseCategoryColors = {
    'alimentacao': '#FF6384', // Vermelho Suave
    'moradia': '#FF9F40',    // Laranja
    'transporte': '#FFCD56', // Amarelo
    'lazer': '#4BC0C0',      // Ciano/Turquesa
    'saude': '#9966FF',      // Roxo
    'outros': '#C9CBCF',     // Cinza
};

const categoryColors = {
    'alimentacao': '#E57373', 'moradia': '#81C784', 'transporte': '#64B5F6',
    'lazer': '#FFD54F', 'saude': '#4DB6AC', 'salario': '#50C878', 'outros': '#B0BEC5',
};

function updateCategoryChart(gastosPorCategoria) {
    if (!categoryChart) return;
    const labels = Object.keys(gastosPorCategoria);
    const data = Object.values(gastosPorCategoria);
    // Usa a nova paleta de cores específica para gastos
    const backgroundColors = labels.map(label => expenseCategoryColors[label] || expenseCategoryColors['outros']);
    categoryChart.data.labels = labels;
    categoryChart.data.datasets[0].data = data;
    categoryChart.data.datasets[0].backgroundColor = backgroundColors;
    categoryChart.update();
}

function updateMonthlySummaryChart(monthlySummary) {
    if (!summaryChart) return;
    const sortedMonths = Object.keys(monthlySummary).sort();
    const receitasData = sortedMonths.map(month => monthlySummary[month].receitas);
    const despesasData = sortedMonths.map(month => monthlySummary[month].despesas);
    summaryChart.data.labels = sortedMonths;
    summaryChart.data.datasets[0].data = receitasData;
    summaryChart.data.datasets[1].data = despesasData;
    summaryChart.update();
}

function updateBalanceEvolutionChart(monthlySummary) {
    if (!balanceEvolutionChart) return;
    const sortedMonths = Object.keys(monthlySummary).sort();
    const balanceData = [];
    const totalBalance = allTransactions.reduce((acc, tx) => acc + (tx.type === 'receita' ? tx.amount : -tx.amount), 0);
    let startingBalance = totalBalance;
    for (const month of sortedMonths) {
        startingBalance -= (monthlySummary[month].receitas - monthlySummary[month].despesas);
    }
    let accumulatedBalance = startingBalance;
    for (const month of sortedMonths) {
        accumulatedBalance += (monthlySummary[month].receitas - monthlySummary[month].despesas);
        balanceData.push(accumulatedBalance);
    }
    balanceEvolutionChart.data.labels = sortedMonths;
    balanceEvolutionChart.data.datasets[0].data = balanceData;
    balanceEvolutionChart.update();
}

// --- Ouvindo eventos do Main Process ---
window.api.on('open-new-transaction-modal', () => {
    // Atalho de teclado (Cmd/Ctrl + N) abre o modal
    openAddModal();
});
