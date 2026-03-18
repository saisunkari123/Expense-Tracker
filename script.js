/**
 * Smart Expense Tracker Dashboard
 * 
 * This application manages personal finances by tracking income and expenses.
 * It utilizes the Web Storage API for persistence, Chart.js for data visualization,
 * and standard DOM manipulation for UI updates.
 * 
 * Functional Programming Style: Pure functions, immutability concepts where applicable.
 */

// --- 1. DOM Elements Selection ---
const balanceEl = document.getElementById('balance');
const incomeEl = document.getElementById('total-income');
const expenseEl = document.getElementById('total-expense');
const listEl = document.getElementById('transaction-list');
const formEl = document.getElementById('form');
const textEl = document.getElementById('text');
const amountEl = document.getElementById('amount');
const typeEl = document.getElementById('type');
const categoryEl = document.getElementById('category');

// --- 2. State Management ---
// Initialize state from LocalStorage or default to an empty array
const localStorageTransactions = JSON.parse(localStorage.getItem('transactions'));

let transactions = localStorage.getItem('transactions') !== null 
    ? localStorageTransactions 
    : [];

let expenseChartInstance = null; // To hold the Chart.js instance for destruction prior to re-render

// --- 3. Core Logic & Pure-ish Functions ---

/**
 * Generates a pseudo-random ID for new transactions.
 * @returns {number} Unique identifier
 */
const generateID = () => Math.floor(Math.random() * 100000000);

/**
 * Formats a number to currency string format (USD).
 * @param {number} num 
 * @returns {string} Formatted currency string e.g., $1,234.56
 */
const formatMoney = (num) => {
    return '$' + Math.abs(num).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
};

/**
 * Calculates financial summaries from the transaction array.
 * @param {Array} txs - The transactions array
 * @returns {Object} Object containing total, income, and expense numbers
 */
const calculateTotals = (txs) => {
    // Map amounts, making expenses negative for easy summation
    const amounts = txs.map(transaction => 
        transaction.type === 'expense' ? -Math.abs(transaction.amount) : Math.abs(transaction.amount)
    );

    const total = amounts.reduce((acc, item) => (acc += item), 0);
    
    const income = txs
        .filter(t => t.type === 'income')
        .reduce((acc, t) => acc + Math.abs(t.amount), 0);

    const expense = txs
        .filter(t => t.type === 'expense')
        .reduce((acc, t) => acc + Math.abs(t.amount), 0);

    return { total, income, expense };
};

// --- 4. DOM Manipulation Functions ---

/**
 * Adds a transaction element to the DOM list.
 * @param {Object} transaction 
 */
const renderTransactionItem = (transaction) => {
    const sign = transaction.type === 'income' ? '+' : '-';
    // Create new list item
    const item = document.createElement('li');
    
    // Add CSS class based on type ('income' or 'expense')
    item.classList.add(transaction.type);

    item.innerHTML = `
        <div class="transaction-info">
            <span class="transaction-text">${transaction.text}</span>
            <span class="transaction-category">${transaction.category}</span>
        </div>
        <div class="transaction-amount-group">
            <span class="transaction-amount">${sign}${formatMoney(transaction.amount)}</span>
            <button class="delete-btn" onclick="removeTransaction(${transaction.id})" title="Delete Transaction">
                &#10005;
            </button>
        </div>
    `;

    listEl.appendChild(item);
};

/**
 * Updates the balance, income, and expense display cards.
 */
const updateSummaryDOM = () => {
    const { total, income, expense } = calculateTotals(transactions);

    // Update Text Content
    balanceEl.innerText = `${total < 0 ? '-' : ''}${formatMoney(total)}`;
    incomeEl.innerText = `+${formatMoney(income)}`;
    expenseEl.innerText = `-${formatMoney(expense)}`;
};

/**
 * Persists current state to Local Storage.
 */
const updateLocalStorage = () => {
    localStorage.setItem('transactions', JSON.stringify(transactions));
};

// --- 5. Data Visualization (Chart.js) ---

/**
 * Processes data and renders the Pie Chart for Expense categories.
 */
const updateChart = () => {
    const canvas = document.getElementById('expenseChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // Aggregate expenses by category
    const expenseData = transactions.filter(t => t.type === 'expense');
    
    // Create an object map of Category -> Total Amount
    const categoryTotals = expenseData.reduce((acc, curr) => {
        acc[curr.category] = (acc[curr.category] || 0) + Math.abs(curr.amount);
        return acc;
    }, {});

    const labels = Object.keys(categoryTotals);
    const dataValues = Object.values(categoryTotals);

    // If no expenses, show a placeholder
    if (labels.length === 0) {
        labels.push("No Expenses Yet");
        dataValues.push(1); // placeholder slice
    }

    // Professional Chase-inspired palette
    const bgColors = labels[0] === "No Expenses Yet" 
        ? ['#E0E4E8'] 
        : [
            '#002D72', '#005F9E', '#107C41', '#D13438', 
            '#F2A900', '#5c2d91', '#008272', '#414141'
        ];

    // Destroy chart instance if it exists to prevent overlap/flickering
    if (expenseChartInstance) {
        expenseChartInstance.destroy();
    }

    expenseChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: dataValues,
                backgroundColor: bgColors,
                borderWidth: 2,
                borderColor: '#FFFFFF'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        font: {
                            family: "'Inter', sans-serif",
                            size: 12
                        },
                        color: '#666666'
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            if (labels[0] === "No Expenses Yet") return " $0.00";
                            return ' ' + formatMoney(context.raw);
                        }
                    }
                }
            },
            cutout: '70%'
        }
    });
};

// --- 6. Event Handlers ---

/**
 * Handles the logic when the Add Transaction form is submitted.
 * @param {Event} e 
 */
const addTransaction = (e) => {
    e.preventDefault();

    const textValue = textEl.value.trim();
    const amountVal = +amountEl.value.trim(); // convert to number
    const typeValue = typeEl.value;
    const categoryValue = categoryEl.value;

    // Basic Validation
    if (textValue === '' || isNaN(amountVal) || amountVal <= 0 || !categoryValue) {
        alert('Please provide valid text, a positive amount, and select a category.');
        return;
    }

    const transaction = {
        id: generateID(),
        text: textValue,
        amount: amountVal,
        type: typeValue,
        category: categoryValue
    };

    // Immutably update state array 
    transactions = [...transactions, transaction];

    // Re-initialize DOM to reflect new state
    init();

    // Reset Form Input
    textEl.value = '';
    amountEl.value = '';
    categoryEl.value = ''; // Reset to default "Select Category" 
    typeEl.value = 'expense'; // default back to expense
};

/**
 * Removes a transaction by its ID. Exposed globally for the inline onclick handler.
 * @param {number} id 
 */
window.removeTransaction = (id) => {
    // Filter out the transaction to be deleted
    transactions = transactions.filter(transaction => transaction.id !== id);
    
    // Re-initialize view
    init();
};

/**
 * Auto-select dynamic dropdown changes based on 'type' if needed
 */
typeEl.addEventListener('change', (e) => {
    const isIncome = e.target.value === 'income';
    if(isIncome) {
        // Automatically set category to Salary/Income if income is chosen
        categoryEl.value = 'Salary';
        
        // Hide non-income categories in a real robust app, but for now just auto-select.
    } else {
        categoryEl.value = 'Housing'; // Default back to an expense category
    }
});

// --- 7. Application Initialization ---

/**
 * Master function to render the application.
 * Syncs DOM, State, Storage, and Canvas to current source of truth.
 */
const init = () => {
    // Clear list
    listEl.innerHTML = '';
    
    // Render each transaction
    transactions.forEach(renderTransactionItem);
    
    // Update summary cards
    updateSummaryDOM();
    
    // Update chart
    updateChart();
    
    // Sync to storage
    updateLocalStorage();
};

// --- 8. Bootstrapping ---

// Listen to form submit
formEl.addEventListener('submit', addTransaction);

// Initial call
init();
