let _user = null;
let _itemId = null;
let _itemType = null; // 'project', 'book', 'movie', 'partner'

const typeLabels = { project: 'Проект', book: 'Книга', movie: 'Фильм', partner: 'Партнёр' };

document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  _itemId = params.get('id');
  _itemType = params.get('type') || 'project';

  if (!_itemId) {
    document.getElementById('detail-title').textContent = 'Не найдено';
    return;
  }

  _user = await checkAuth();

  // Fetch data based on type
  const apiAction = _itemType === 'project' ? 'projects.get'
    : _itemType === 'book' ? 'books.get'
    : _itemType === 'movie' ? 'movies.get'
    : _itemType === 'partner' ? 'partners.get'
    : 'projects.get';

  const res = await api(apiAction, { params: { id: _itemId } });
  if (!res.success) {
    document.getElementById('detail-title').textContent = 'Не найдено';
    return;
  }

  const p = res.data;
  const isPartner = _itemType === 'partner';
  const goal = p.goal || 0;
  const raised = p.raised || 0;
  const percent = goal > 0 ? Math.min((raised / goal) * 100, 100) : 0;

  document.title = `${p.title} | TrashDream's`;

  document.getElementById('detail-img').src = p.img || '../assets/images/logo.ico';
  document.getElementById('detail-title').textContent = p.title;
  document.getElementById('detail-author').textContent = p.author
    ? `Автор: ${p.author}`
    : `Тип: ${typeLabels[_itemType] || _itemType}`;
  document.getElementById('detail-description').textContent = p.description || 'Описание появится позже...';

  // Партнёры — без счётчика сборов
  if (isPartner) {
    document.getElementById('detail-raised').parentElement.style.display = 'none';
    const progressBar = document.querySelector('.detail-progress-bar');
    if (progressBar) progressBar.style.display = 'none';
    const percentEl = document.getElementById('detail-percent');
    if (percentEl) percentEl.style.display = 'none';
  } else {
    document.getElementById('detail-raised').textContent = `${raised}₽`;
    document.getElementById('detail-goal').textContent = `из ${goal}₽`;
    document.getElementById('detail-progress').style.width = `${percent}%`;
    document.getElementById('detail-percent').textContent = `${percent.toFixed(0)}%`;
  }

  // Project-only features: likes, favorites, support, comments
  const isProject = _itemType === 'project';

  if (isProject) {
    document.getElementById('detail-likes-count').textContent = p.likes_count || 0;
    if (p.user_liked) document.getElementById('detail-like-btn').classList.add('active');
    if (p.user_favorited) document.getElementById('detail-fav-btn').classList.add('active');

    // Support toggle
    document.getElementById('detail-support-btn').addEventListener('click', () => {
      if (!_user) { showToast('Авторизуйтесь для поддержки', 'error'); return; }
      document.getElementById('detail-support-form').classList.toggle('hidden');
    });

    document.getElementById('detail-support-send').addEventListener('click', async () => {
      const input = document.getElementById('detail-support-amount');
      const amount = parseFloat(input.value);
      if (!amount || amount <= 0) { showToast('Введите сумму', 'error'); return; }

      const res = await api('projects.support', { method: 'POST', params: { id: _itemId }, body: { amount } });
      if (res.success) {
        showToast(res.message);
        input.value = '';
        document.getElementById('detail-support-form').classList.add('hidden');
        location.reload();
      } else {
        showToast(res.error, 'error');
      }
    });

    // Like toggle
    document.getElementById('detail-like-btn').addEventListener('click', async () => {
      if (!_user) { showToast('Авторизуйтесь', 'error'); return; }
      const btn = document.getElementById('detail-like-btn');
      btn.style.pointerEvents = 'none';
      const res = await api('likes.toggle', { method: 'POST', params: { id: _itemId } });
      btn.style.pointerEvents = '';
      if (res.success) {
        btn.classList.toggle('active', res.data.liked);
        document.getElementById('detail-likes-count').textContent = res.data.likes_count;
      }
    });

    // Favorite toggle
    document.getElementById('detail-fav-btn').addEventListener('click', async () => {
      if (!_user) { showToast('Авторизуйтесь', 'error'); return; }
      const btn = document.getElementById('detail-fav-btn');
      btn.style.pointerEvents = 'none';
      const res = await api('favorites.toggle', { method: 'POST', params: { id: _itemId } });
      btn.style.pointerEvents = '';
      if (res.success) {
        btn.classList.toggle('active', res.data.favorited);
        showToast(res.message);
      }
    });

    // Comments
    if (_user) {
      document.getElementById('detail-comment-form').classList.remove('hidden');
    } else {
      document.getElementById('detail-auth-hint').classList.remove('hidden');
    }

    loadComments();

    document.getElementById('detail-comment-send').addEventListener('click', async () => {
      const textarea = document.getElementById('detail-comment-text');
      const text = textarea.value.trim();
      if (!text) { showToast('Введите текст', 'error'); return; }

      const res = await api('comments.add', { method: 'POST', params: { id: _itemId }, body: { text } });
      if (res.success) {
        textarea.value = '';
        showToast('Комментарий добавлен');
        loadComments();
      } else {
        showToast(res.error, 'error');
      }
    });
  } else {
    // Non-project items: hide project-only UI
    document.getElementById('detail-support-btn').style.display = 'none';
    document.getElementById('detail-like-btn').style.display = 'none';
    document.getElementById('detail-fav-btn').style.display = 'none';
    document.querySelector('.detail-comments').style.display = 'none';
  }
});

async function loadComments() {
  const list = document.getElementById('detail-comments-list');
  const res = await api('comments.list', { params: { id: _itemId } });

  document.getElementById('detail-comments-title').textContent =
    `Комментарии (${res.success ? res.data.length : 0})`;

  if (!res.success || res.data.length === 0) {
    list.innerHTML = '<p class="no-comments">Комментариев пока нет</p>';
    return;
  }

  list.innerHTML = res.data.map(c => {
    const canDel = _user && (_user.id === c.user_id || _user.role === 'admin');
    const delBtn = canDel ? `<button class="comment-delete" data-id="${c.id}">&times;</button>` : '';
    const date = new Date(c.created_at + 'Z').toLocaleString('ru-RU', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' });
    return `
      <div class="comment">
        <div class="comment-header">
          <strong>${c.author}</strong>
          <span class="comment-date">${date}</span>
          ${delBtn}
        </div>
        <p>${c.text}</p>
      </div>
    `;
  }).join('');

  list.querySelectorAll('.comment-delete').forEach(btn => {
    btn.addEventListener('click', async () => {
      const res = await api('comments.delete', { method: 'POST', params: { id: btn.dataset.id } });
      if (res.success) {
        showToast('Комментарий удален');
        loadComments();
      } else {
        showToast(res.error, 'error');
      }
    });
  });
}
