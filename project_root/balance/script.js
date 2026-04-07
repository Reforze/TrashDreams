let balance = 0;
let transactions = [];

const balanceDisplay = document.getElementById('main-balance');
const listContainer = document.getElementById('transaction-list');
const filters = document.querySelectorAll('.filter-pill');

function formatMoney(amount) {
  return amount.toLocaleString('ru-RU') + ' rub.';
}

function updateBalanceUI() {
  balanceDisplay.textContent = formatMoney(balance);
}

function renderHistory(filterType = 'all') {
  listContainer.innerHTML = '';

  const filtered = transactions.filter(t => filterType === 'all' || t.type === filterType);

  if (filtered.length === 0) {
    listContainer.innerHTML = '<p style="text-align:center; color:rgba(255,255,255,0.3); margin-top:20px;">Операций не найдено</p>';
    return;
  }

  filtered.forEach(t => {
    const isIncome = t.type === 'income';
    const amountClass = isIncome ? 'amount-plus' : 'amount-minus';
    const sign = isIncome ? '+' : '-';
    const iconClass = isIncome ? 'icon-in' : 'icon-out';
    const iconText = isIncome ? 'IN' : 'OUT';

    const item = document.createElement('div');
    item.classList.add('trans-item');
    item.innerHTML = `
      <div class="trans-left">
        <div class="trans-icon ${iconClass}">${iconText}</div>
        <div class="trans-info">
          <h4>${t.title}</h4>
          <span class="trans-date">${new Date(t.created_at).toLocaleDateString()}</span>
        </div>
      </div>
      <div class="trans-amount ${amountClass}">
        ${sign} ${formatMoney(t.amount)}
      </div>
    `;
    listContainer.appendChild(item);
  });
}

// Load balance data from API
async function loadBalance() {
  try {
    await requireAuth();
    const res = await api('balance.get');
    if (res.success && res.data) {
      balance = res.data.balance;
      transactions = res.data.transactions;
    }
  } catch (e) {
    return;
  }
  updateBalanceUI();
  renderHistory();
}

loadBalance();

// Filters
filters.forEach(btn => {
  btn.addEventListener('click', () => {
    filters.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderHistory(btn.dataset.filter);
  });
});

// Modal (deposit / withdraw)
const modal = document.getElementById('modal');
const modalClose = document.getElementById('modal-close');
const depositBtn = document.getElementById('deposit-btn');
const withdrawBtn = document.getElementById('withdraw-btn');
const modalTitle = document.getElementById('modal-title');
const confirmBtn = document.getElementById('confirm-action-btn');
const amountInput = document.getElementById('amount-input');

let currentAction = null;

function openModalUI(type) {
  currentAction = type;
  amountInput.value = '';
  clearFieldError(amountInput);
  if (type === 'deposit') {
    modalTitle.textContent = 'Пополнение баланса';
    confirmBtn.textContent = 'Оплатить';
    confirmBtn.className = 'confirm-btn confirm-deposit';
  } else {
    modalTitle.textContent = 'Вывод средств';
    confirmBtn.textContent = 'Запросить вывод';
    confirmBtn.className = 'confirm-btn confirm-withdraw';
  }
  modal.classList.add('show');
}

depositBtn.addEventListener('click', () => openModalUI('deposit'));
withdrawBtn.addEventListener('click', () => openModalUI('withdraw'));

modalClose.addEventListener('click', () => modal.classList.remove('show'));
window.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('show'); });

amountInput.addEventListener('input', () => clearFieldError(amountInput));

confirmBtn.addEventListener('click', async () => {
  clearFieldError(amountInput);
  const val = parseInt(amountInput.value);
  if (!val || val <= 0) {
    showFieldError(amountInput, 'Введите корректную сумму');
    return;
  }

  const action = currentAction === 'deposit' ? 'balance.deposit' : 'balance.withdraw';

  try {
    const res = await api(action, { method: 'POST', body: { amount: val } });
    if (res.success) {
      showToast(res.message);
      // Reload balance data
      const updated = await api('balance.get');
      if (updated.success && updated.data) {
        balance = updated.data.balance;
        transactions = updated.data.transactions;
      }
      updateBalanceUI();
      renderHistory('all');
      filters.forEach(b => b.classList.remove('active'));
      filters[0].classList.add('active');
      modal.classList.remove('show');
    } else {
      showToast(res.error || 'Ошибка', 'error');
    }
  } catch (e) {
    showToast('Ошибка соединения с сервером', 'error');
  }
});
