// Тост-уведомление
function showToast(msg, type = 'success') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = msg;
  document.body.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, 3000);
}

// Форматирование даты
function formatDate(dateStr) {
  const d = new Date(dateStr);
  const months = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

// Карта категорий
const categoryNames = {
  fun: 'Развлечения', food: 'Еда', tech: 'Технологии',
  books: 'Книги', movies: 'Фильмы', games: 'Игры', other: 'Другое'
};

const statusNames = { active: 'Активный', review: 'На модерации', closed: 'Закрыт' };

// Загрузка профиля
async function loadProfile() {
  let user;
  try {
    user = await requireAuth();
  } catch (e) {
    return;
  }

  // Аватар — первая буква имени
  document.getElementById('avatar-letter').textContent = user.username.charAt(0);

  // Инфо
  document.getElementById('profile-username').textContent = user.username;
  document.getElementById('profile-email').textContent = user.email;
  document.getElementById('profile-balance').textContent = `Баланс: ${Number(user.balance).toLocaleString('ru-RU')} ₽`;
  document.getElementById('profile-date').textContent = `На платформе с ${formatDate(user.created_at)}`;

  // Заполнение формы
  document.getElementById('edit-username').value = user.username;
  document.getElementById('edit-email').value = user.email;

  // CTA кнопка в хедере
  const ctaBtn = document.querySelector('.cta-btn');
  if (ctaBtn) {
    ctaBtn.textContent = user.username;
    ctaBtn.href = '../profile/index.html';
  }

  // Загрузка проектов пользователя
  loadUserProjects();
  loadFavorites();
}

// Загрузка проектов
async function loadUserProjects() {
  try {
    const res = await api('projects.list', { params: { mine: '1' } });
    if (!res.success) return;

    const projects = res.data || [];
    const grid = document.getElementById('projects-grid');
    const noProjects = document.getElementById('no-projects');

    // Статистика
    const total = projects.length;
    const active = projects.filter(p => p.status === 'active').length;
    const raised = projects.reduce((s, p) => s + Number(p.raised || 0), 0);

    document.getElementById('stat-total').textContent = total;
    document.getElementById('stat-active').textContent = active;
    document.getElementById('stat-raised').textContent = `${raised.toLocaleString('ru-RU')} ₽`;

    if (total === 0) {
      grid.classList.add('hidden');
      noProjects.classList.remove('hidden');
      return;
    }

    // Показываем до 6 последних проектов
    const recent = projects.slice(0, 6);
    grid.innerHTML = recent.map(p => {
      const pct = p.goal > 0 ? Math.min(100, Math.round((p.raised / p.goal) * 100)) : 0;
      return `
        <div class="project-card">
          <h4>${escapeHtml(p.title)}
            <span class="status-badge status-${p.status}">${statusNames[p.status] || p.status}</span>
          </h4>
          <span class="proj-category">${categoryNames[p.category] || p.category}</span>
          <div class="proj-progress"><div class="proj-progress-bar" style="width:${pct}%"></div></div>
          <div class="proj-stats">
            <span>${Number(p.raised).toLocaleString('ru-RU')} / ${Number(p.goal).toLocaleString('ru-RU')} ₽</span>
            <span>${pct}%</span>
          </div>
        </div>`;
    }).join('');

  } catch (e) {
    console.error('Ошибка загрузки проектов:', e);
  }
}

// Загрузка избранного
async function loadFavorites() {
  try {
    const res = await api('projects.list', { params: { favorites: '1' } });
    if (!res.success) return;

    const projects = res.data || [];
    const grid = document.getElementById('favorites-grid');
    const noFavs = document.getElementById('no-favorites');

    if (projects.length === 0) {
      grid.classList.add('hidden');
      noFavs.classList.remove('hidden');
      return;
    }

    grid.innerHTML = projects.map(p => {
      const pct = p.goal > 0 ? Math.min(100, Math.round((p.raised / p.goal) * 100)) : 0;
      const likes = p.likes_count || 0;
      const comments = p.comments_count || 0;
      return `
        <div class="steam-card">
          <div class="steam-card-img">
            <img src="${p.img || '../assets/images/logo.ico'}" alt="${escapeHtml(p.title)}">
            <div class="steam-card-overlay"></div>
          </div>
          <div class="steam-card-body">
            <h3 class="steam-card-title">${escapeHtml(p.title)}</h3>
            <div class="steam-card-stats">
              <span class="steam-raised">${Number(p.raised).toLocaleString('ru-RU')}₽</span>
              <span class="steam-goal">из ${Number(p.goal).toLocaleString('ru-RU')}₽</span>
            </div>
            <div class="steam-progress-bar">
              <div class="steam-progress" style="width:${pct}%;"></div>
            </div>
            <div class="steam-card-footer">
              <span class="steam-meta">&#9829; ${likes} &nbsp; &#128172; ${comments}</span>
              <a class="steam-detail-btn" href="../project_detail/index.html?id=${p.id}">Подробнее</a>
            </div>
          </div>
        </div>`;
    }).join('');

  } catch (e) {
    console.error('Ошибка загрузки избранного:', e);
  }
}

// HTML-экранирование
function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

// Сохранение профиля
document.getElementById('edit-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const username = document.getElementById('edit-username').value.trim();
  const email = document.getElementById('edit-email').value.trim();
  const oldPass = document.getElementById('edit-old-pass').value;
  const newPass = document.getElementById('edit-new-pass').value;

  if (!username || !email) {
    showToast('Имя и email обязательны', 'error');
    return;
  }

  const body = { username, email };
  if (oldPass || newPass) {
    if (!oldPass) { showToast('Введите текущий пароль', 'error'); return; }
    if (!newPass) { showToast('Введите новый пароль', 'error'); return; }
    body.old_password = oldPass;
    body.new_password = newPass;
  }

  try {
    const res = await api('auth.update', { method: 'POST', body });
    if (res.success) {
      showToast(res.message || 'Профиль обновлён');
      document.getElementById('edit-old-pass').value = '';
      document.getElementById('edit-new-pass').value = '';
      // Обновляем отображение
      document.getElementById('profile-username').textContent = username;
      document.getElementById('profile-email').textContent = email;
      document.getElementById('avatar-letter').textContent = username.charAt(0);
      const ctaBtn = document.querySelector('.cta-btn');
      if (ctaBtn) ctaBtn.textContent = username;
    } else {
      showToast(res.error || 'Ошибка сохранения', 'error');
    }
  } catch (err) {
    showToast('Ошибка соединения с сервером', 'error');
  }
});

// Выход
document.getElementById('logout-btn').addEventListener('click', async () => {
  await api('auth.logout', { method: 'POST' });
  window.location.href = '../home/index.html';
});

// Инициализация
document.addEventListener('DOMContentLoaded', loadProfile);
