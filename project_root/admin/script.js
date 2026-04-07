// Тост-уведомления
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

const categoryNames = {
  fun: 'Развлечения', food: 'Еда', tech: 'Технологии',
  books: 'Книги', movies: 'Фильмы', games: 'Игры', other: 'Другое'
};
const statusLabels = { active: 'Активен', review: 'На модерации', closed: 'Закрыт' };

const tbody = document.getElementById('projects-tbody');
const searchInput = document.getElementById('search-input');
const statusFilter = document.getElementById('status-filter');
const noProjects = document.getElementById('no-projects');

// Modal elements
const modal = document.getElementById('modal');
const modalImg = document.getElementById('modal-img');
const modalTitle = document.getElementById('modal-title');
const modalInfo = document.getElementById('modal-info');
const modalActions = document.getElementById('modal-actions');
const modalClose = document.getElementById('modal-close');

let currentProject = null;

document.addEventListener('DOMContentLoaded', async () => {
  // Проверяем что пользователь — админ
  const user = await checkAuth();
  if (!user || user.role !== 'admin') {
    showToast('Доступ запрещён', 'error');
    setTimeout(() => window.location.href = '../home/index.html', 1500);
    return;
  }

  const ctaBtn = document.querySelector('.cta-btn');
  if (ctaBtn) {
    ctaBtn.textContent = user.username;
    ctaBtn.href = '../profile/index.html';
  }

  loadStats();
  loadProjects();
});

async function loadStats() {
  try {
    const res = await api('admin.stats');
    if (res.success) {
      const d = res.data;
      document.getElementById('stat-total').textContent = d.total_projects;
      document.getElementById('stat-review').textContent = d.review;
      document.getElementById('stat-active').textContent = d.active;
      document.getElementById('stat-closed').textContent = d.closed;
      document.getElementById('stat-users').textContent = d.total_users;
      document.getElementById('stat-raised').textContent = Number(d.total_raised).toLocaleString('ru-RU') + ' rub.';
    }
  } catch (e) {
    console.error('Ошибка загрузки статистики:', e);
  }
}

async function loadProjects() {
  const search = searchInput.value.trim();
  const status = statusFilter.value;

  try {
    const res = await api('admin.projects', { params: { search, status } });
    if (res.success) {
      renderTable(res.data);
    }
  } catch (e) {
    console.error('Ошибка загрузки проектов:', e);
  }
}

function renderTable(list) {
  tbody.innerHTML = '';
  noProjects.style.display = list.length === 0 ? 'block' : 'none';

  list.forEach(p => {
    const tr = document.createElement('tr');
    if (p.status === 'review') tr.classList.add('row-review');

    const statusClass = `status-${p.status}`;
    const pct = p.goal > 0 ? Math.round((p.raised / p.goal) * 100) : 0;

    tr.innerHTML = `
      <td>${p.id}</td>
      <td><img src="${p.img || '../assets/images/logo.ico'}" class="thumb" alt=""></td>
      <td class="title-cell">${escapeHtml(p.title)}</td>
      <td>${escapeHtml(p.author || '—')}</td>
      <td>${categoryNames[p.category] || p.category}</td>
      <td><span class="status-badge ${statusClass}">${statusLabels[p.status] || p.status}</span></td>
      <td>${Number(p.goal).toLocaleString('ru-RU')}</td>
      <td>${Number(p.raised).toLocaleString('ru-RU')} (${pct}%)</td>
      <td class="actions-cell">
        ${p.status === 'review' ? `
          <button class="btn-approve" data-id="${p.id}" title="Одобрить">Одобрить</button>
          <button class="btn-reject" data-id="${p.id}" title="Отклонить">Отклонить</button>
        ` : ''}
        <button class="btn-details" data-id="${p.id}" title="Подробнее">Подробнее</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Event delegation
  tbody.querySelectorAll('.btn-approve').forEach(btn => {
    btn.addEventListener('click', (e) => { e.stopPropagation(); approveProject(btn.dataset.id); });
  });
  tbody.querySelectorAll('.btn-reject').forEach(btn => {
    btn.addEventListener('click', (e) => { e.stopPropagation(); rejectProject(btn.dataset.id); });
  });
  tbody.querySelectorAll('.btn-details').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const proj = list.find(p => p.id == btn.dataset.id);
      if (proj) openModal(proj);
    });
  });
}

async function approveProject(id) {
  const res = await api('admin.approve', { method: 'POST', params: { id } });
  if (res.success) {
    showToast('Проект одобрен');
    loadProjects();
    loadStats();
  } else {
    showToast(res.error || 'Ошибка', 'error');
  }
}

async function rejectProject(id) {
  const res = await api('admin.reject', { method: 'POST', params: { id } });
  if (res.success) {
    showToast('Проект отклонён');
    loadProjects();
    loadStats();
  } else {
    showToast(res.error || 'Ошибка', 'error');
  }
}

function openModal(project) {
  currentProject = project;
  modalImg.src = project.img || '../assets/images/logo.ico';
  modalTitle.textContent = project.title;

  const pct = project.goal > 0 ? Math.round((project.raised / project.goal) * 100) : 0;

  modalInfo.innerHTML = `
    <p><strong>ID:</strong> ${project.id}</p>
    <p><strong>Автор:</strong> ${escapeHtml(project.author || '—')}</p>
    <p><strong>Категория:</strong> ${categoryNames[project.category] || project.category}</p>
    <p><strong>Статус:</strong> <span class="status-badge status-${project.status}">${statusLabels[project.status] || project.status}</span></p>
    <p><strong>Цель:</strong> ${Number(project.goal).toLocaleString('ru-RU')} руб.</p>
    <p><strong>Собрано:</strong> ${Number(project.raised).toLocaleString('ru-RU')} руб. (${pct}%)</p>
    <div class="progress-bar"><div class="progress" style="width:${pct}%"></div></div>
    <p><strong>Обсуждения:</strong> ${project.discussions}</p>
    <p><strong>Описание:</strong></p>
    <p class="desc-text">${escapeHtml(project.description || 'Нет описания')}</p>
    <p><strong>Дата создания:</strong> ${new Date(project.created_at).toLocaleDateString('ru-RU')}</p>
    <div class="toggle-row">
      <label class="toggle-label">
        <input type="checkbox" id="toggle-featured" ${project.is_featured ? 'checked' : ''}>
        Избранный проект
      </label>
      <label class="toggle-label">
        <input type="checkbox" id="toggle-editor" ${project.is_editor_choice ? 'checked' : ''}>
        Выбор редакции
      </label>
    </div>
  `;

  // Action buttons
  let actionsHTML = '';
  if (project.status === 'review') {
    actionsHTML += `<button class="modal-btn approve" id="modal-approve">Одобрить</button>`;
    actionsHTML += `<button class="modal-btn reject" id="modal-reject">Отклонить</button>`;
  } else if (project.status === 'active') {
    actionsHTML += `<button class="modal-btn reject" id="modal-close-proj">Закрыть проект</button>`;
  }
  actionsHTML += `<button class="modal-btn delete" id="modal-delete">Удалить</button>`;
  modalActions.innerHTML = actionsHTML;

  // Bind actions
  const approveBtn = document.getElementById('modal-approve');
  const rejectBtn = document.getElementById('modal-reject');
  const closeProj = document.getElementById('modal-close-proj');
  const deleteBtn = document.getElementById('modal-delete');

  if (approveBtn) approveBtn.addEventListener('click', async () => {
    await approveProject(project.id);
    modal.classList.remove('show');
  });
  if (rejectBtn) rejectBtn.addEventListener('click', async () => {
    await rejectProject(project.id);
    modal.classList.remove('show');
  });
  if (closeProj) closeProj.addEventListener('click', async () => {
    await rejectProject(project.id);
    modal.classList.remove('show');
  });
  if (deleteBtn) deleteBtn.addEventListener('click', async () => {
    const res = await api('admin.delete_project', { method: 'POST', params: { id: project.id } });
    if (res.success) {
      showToast('Проект удалён');
      modal.classList.remove('show');
      loadProjects();
      loadStats();
    } else {
      showToast(res.error || 'Ошибка', 'error');
    }
  });

  // Toggle featured/editor
  document.getElementById('toggle-featured').addEventListener('change', async (e) => {
    const res = await api('admin.set_featured', { method: 'POST', params: { id: project.id }, body: { value: e.target.checked ? 1 : 0 } });
    if (res.success) showToast(res.message);
    else showToast(res.error || 'Ошибка', 'error');
  });
  document.getElementById('toggle-editor').addEventListener('change', async (e) => {
    const res = await api('admin.set_editor', { method: 'POST', params: { id: project.id }, body: { value: e.target.checked ? 1 : 0 } });
    if (res.success) showToast(res.message);
    else showToast(res.error || 'Ошибка', 'error');
  });

  modal.classList.add('show');
}

modalClose.addEventListener('click', () => modal.classList.remove('show'));
modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('show'); });

// Filters
searchInput.addEventListener('input', loadProjects);
statusFilter.addEventListener('change', loadProjects);

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}
