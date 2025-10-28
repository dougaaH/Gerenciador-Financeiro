// src/renderer/index.js

// --- Elementos do DOM ---
const transactionsTableBody = document.querySelector('#transactions-table tbody');
const modal = document.getElementById('transaction-modal');
const closeModalBtn = document.querySelector('.close-button');
const addTransactionBtn = document.getElementById('add-transaction-btn');
const transactionForm = document.getElementById('transaction-form');
const modalTitle = document.getElementById('modal-title');

// --- Variáveis Globais ---
let allTransactions = []; // Cache local das transações

// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
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

// --- Funções ---
function renderTransactions(transactions) {
    transactionsTableBody.innerHTML = ''; // Limpa a tabela

    let receitas = 0;
    let despesas = 0;

    transactions.forEach(tx => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${tx.description}</td>
            <td>R$ ${tx.amount.toFixed(2)}</td>
            <td>${tx.type}</td>
            <td>${new Date(tx.date).toLocaleDateString()}</td>
                <td>
                    <button class="edit-btn" data-id="${tx.id}">Editar</button>
                    <button class="delete-btn" data-id="${tx.id}">Excluir</button>
                </td>
        `;
        transactionsTableBody.appendChild(row);

        // Soma para o gráfico
        if (tx.type === 'receita') {
            receitas += tx.amount;
        } else {
            despesas += tx.amount;
        }
    });

    // Atualiza o gráfico
    updateChart(receitas, despesas);
}

async function loadTransactions() {
    // Busca transações usando a API do preload
    allTransactions = await window.api.getTransactions();
    if (allTransactions) {
        renderTransactions(allTransactions);
    }
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
transactionsTableBody.addEventListener('click', async (event) => {
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
});

// --- Lógica do Gráfico ---
const ctx = document.getElementById('myChart').getContext('2d');
const myChart = new Chart(ctx, {
    type: 'doughnut', // Tipo de gráfico: pizza, barra, etc.
    data: {
        labels: ['Receitas', 'Despesas'],
        datasets: [{
            label: 'Resumo Financeiro',
            data: [0, 0], // Dados iniciais
            backgroundColor: [
                'rgba(75, 192, 192, 0.7)',
                'rgba(255, 99, 132, 0.7)',
            ],
        }]
    },
});

function updateChart(receitas, despesas) {
    myChart.data.datasets[0].data[0] = receitas;
    myChart.data.datasets[0].data[1] = despesas;
    myChart.update();
}

// --- Ouvindo eventos do Main Process ---
window.api.on('open-new-transaction-modal', () => {
    // Atalho de teclado (Cmd/Ctrl + N) abre o modal
    openAddModal();
});
