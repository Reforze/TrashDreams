/**
 * Shared project modal with likes, favorites, comments, support.
 * Include after api.js on any page that shows project modals.
 *
 * Usage:
 *   1. Add a modal container in HTML:
 *      <div id="modal" class="modal">
 *        <div class="modal-content">
 *          <span id="modal-close">&times;</span>
 *          <img id="modal-img" src="" alt="">
 *          <h3 id="modal-title"></h3>
 *          <div id="modal-info"></div>
 *        </div>
 *      </div>
 *
 *   2. Call: openProjectModal(projectId)
 */

let _modalUser = null;
let _modalProjectId = null;

async function initProjectModal() {
  _modalUser = await checkAuth();

  const modal = document.getElementById('modal');
  const closeBtn = document.getElementById('modal-close');
  if (!modal || !closeBtn) return;

  closeBtn.addEventListener('click', () => modal.classList.remove('show'));
  modal.addEventListener('click', e => {
    if (e.target === modal) modal.classList.remove('show');
  });
}

async function openProjectModal(projectId) {
  _modalProjectId = projectId;
  if (!_modalUser) _modalUser = await checkAuth();

  const modal = document.getElementById('modal');
  const modalImg = document.getElementById('modal-img');
  const modalTitle = document.getElementById('modal-title');
  const modalInfo = document.getElementById('modal-info');

  const res = await api('projects.get', { params: { id: projectId } });
  if (!res.success) { showToast(res.error, 'error'); return; }

  const p = res.data;
  const percent = Math.min((p.raised / p.goal) * 100, 100);

  modalImg.src = p.img || '../assets/images/logo.ico';
  modalTitle.textContent = p.title;

  const likedCls = p.user_liked ? 'active' : '';
  const favCls = p.user_favorited ? 'active' : '';
  const likesCount = p.likes_count || 0;
  const commentsCount = p.comments_count || 0;

  modalInfo.innerHTML = `
    <div class="modal-body">
      <p><strong>Автор:</strong> ${p.author || 'Аноним'}</p>
      <p><strong>Цель:</strong> ${p.goal}₽</p>
      <p><strong>Собрано:</strong> ${p.raised}₽ (${percent.toFixed(0)}%)</p>
      <div class="progress-bar"><div class="progress" style="width:${percent}%;"></div></div>
      <p class="modal-desc">${p.description || 'Описание проекта появится позже...'}</p>
    </div>

    <div class="modal-actions">
      <button class="action-btn like-btn ${likedCls}" id="pm-like">
        <span class="icon">&#9829;</span> <span id="pm-likes-count">${likesCount}</span>
      </button>
      <button class="action-btn fav-btn ${favCls}" id="pm-fav">
        <span class="icon">&#9734;</span> Избранное
      </button>
      <button class="action-btn support-btn" id="pm-support-toggle">
        Поддержать
      </button>
    </div>

    <div class="support-form hidden" id="pm-support-form">
      <input type="number" id="pm-support-amount" placeholder="Сумма ₽" min="1">
      <button id="pm-support-send">Отправить</button>
    </div>

    <div class="comments-section">
      <h4>Комментарии (${commentsCount})</h4>
      <div id="pm-comments-list"></div>
      ${_modalUser ? `
        <div class="comment-form">
          <textarea id="pm-comment-text" placeholder="Написать комментарий..." rows="2"></textarea>
          <button id="pm-comment-send">Отправить</button>
        </div>
      ` : '<p class="no-comments" style="font-size:0.8em;">Авторизуйтесь чтобы комментировать</p>'}
    </div>
  `;

  // Bind events
  document.getElementById('pm-like').addEventListener('click', _pmToggleLike);
  document.getElementById('pm-fav').addEventListener('click', _pmToggleFav);
  document.getElementById('pm-support-toggle').addEventListener('click', () => {
    if (!_modalUser) { showToast('Авторизуйтесь для поддержки', 'error'); return; }
    document.getElementById('pm-support-form').classList.toggle('hidden');
  });
  document.getElementById('pm-support-send').addEventListener('click', _pmSendSupport);

  const commentSend = document.getElementById('pm-comment-send');
  if (commentSend) commentSend.addEventListener('click', _pmSendComment);

  _pmLoadComments(projectId);
  modal.classList.add('show');
}

async function _pmToggleLike() {
  if (!_modalUser) { showToast('Авторизуйтесь', 'error'); return; }
  const res = await api('likes.toggle', { method: 'POST', params: { id: _modalProjectId } });
  if (res.success) {
    document.getElementById('pm-like').classList.toggle('active', res.data.liked);
    document.getElementById('pm-likes-count').textContent = res.data.likes_count;
  }
}

async function _pmToggleFav() {
  if (!_modalUser) { showToast('Авторизуйтесь', 'error'); return; }
  const res = await api('favorites.toggle', { method: 'POST', params: { id: _modalProjectId } });
  if (res.success) {
    document.getElementById('pm-fav').classList.toggle('active', res.data.favorited);
    showToast(res.message);
  }
}

async function _pmSendSupport() {
  const input = document.getElementById('pm-support-amount');
  const amount = parseFloat(input.value);
  if (!amount || amount <= 0) { showToast('Введите сумму', 'error'); return; }

  const res = await api('projects.support', { method: 'POST', params: { id: _modalProjectId }, body: { amount } });
  if (res.success) {
    showToast(res.message);
    input.value = '';
    document.getElementById('pm-support-form').classList.add('hidden');
    openProjectModal(_modalProjectId);
  } else {
    showToast(res.error, 'error');
  }
}

async function _pmLoadComments(projectId) {
  const list = document.getElementById('pm-comments-list');
  const res = await api('comments.list', { params: { id: projectId } });

  if (!res.success || res.data.length === 0) {
    list.innerHTML = '<p class="no-comments">Комментариев пока нет</p>';
    return;
  }

  list.innerHTML = res.data.map(c => {
    const canDel = _modalUser && (_modalUser.id === c.user_id || _modalUser.role === 'admin');
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
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const res = await api('comments.delete', { method: 'POST', params: { id: btn.dataset.id } });
      if (res.success) {
        showToast('Комментарий удалён');
        _pmLoadComments(_modalProjectId);
      } else {
        showToast(res.error, 'error');
      }
    });
  });
}

async function _pmSendComment() {
  const textarea = document.getElementById('pm-comment-text');
  const text = textarea.value.trim();
  if (!text) { showToast('Введите текст', 'error'); return; }

  const res = await api('comments.add', { method: 'POST', params: { id: _modalProjectId }, body: { text } });
  if (res.success) {
    textarea.value = '';
    showToast('Комментарий добавлен');
    _pmLoadComments(_modalProjectId);
  } else {
    showToast(res.error, 'error');
  }
}

// ============================================================
// INJECT MODAL STYLES
// ============================================================
(function injectModalCSS() {
  if (document.getElementById('pm-modal-style')) return;
  const style = document.createElement('style');
  style.id = 'pm-modal-style';
  style.textContent = `
    .modal-content {
      max-height: 85vh;
      overflow-y: auto;
    }
    .modal-content::-webkit-scrollbar { width: 4px; }
    .modal-content::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 2px; }

    .modal-body { padding: 5px 20px 10px; text-align: left; line-height: 1.7; color: rgba(255,255,255,0.7); font-size: 0.95em; }
    .modal-body strong { color: rgba(255,255,255,0.9); }
    .modal-desc { margin-top: 10px; line-height: 1.6; }

    .modal-actions {
      display: flex;
      justify-content: center;
      gap: 10px;
      padding: 12px 20px 8px;
      flex-wrap: wrap;
    }
    .action-btn {
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.2);
      padding: 8px 16px;
      border-radius: 8px;
      color: rgba(255,255,255,0.7);
      font-family: 'SUSE Mono', monospace;
      font-size: 0.85em;
      cursor: pointer;
      transition: all 0.3s;
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .action-btn:hover {
      background: rgba(255,255,255,0.12);
      color: #fff;
    }
    .action-btn.active {
      background: rgba(255,255,255,0.15);
      border-color: rgba(255,255,255,0.4);
      color: #fff;
    }
    .like-btn.active .icon { color: #ff6b6b; }
    .fav-btn.active .icon { color: #ffd700; }

    .support-form {
      display: flex;
      gap: 8px;
      padding: 8px 20px;
      justify-content: center;
    }
    .support-form.hidden { display: none; }
    .support-form input {
      background: rgba(0,0,0,0.4);
      border: 1px solid rgba(255,255,255,0.15);
      padding: 8px 12px;
      border-radius: 8px;
      color: #fff;
      font-family: 'SUSE Mono', monospace;
      width: 120px;
    }
    .support-form input:focus { outline: none; border-color: rgba(255,255,255,0.4); }
    .support-form button {
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.3);
      padding: 8px 16px;
      border-radius: 8px;
      color: #fff;
      cursor: pointer;
      font-family: 'SUSE Mono', monospace;
      transition: all 0.3s;
    }
    .support-form button:hover { background: #fff; color: #000; }

    .comments-section {
      text-align: left;
      padding: 12px 20px 20px;
      border-top: 1px solid rgba(255,255,255,0.08);
      margin-top: 8px;
    }
    .comments-section h4 {
      margin-bottom: 10px;
      font-size: 0.95em;
      color: rgba(255,255,255,0.5);
    }
    .no-comments {
      color: rgba(255,255,255,0.3);
      font-size: 0.85em;
      text-align: center;
      padding: 8px 0;
    }
    .comment {
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 10px;
      padding: 10px 14px;
      margin-bottom: 8px;
    }
    .comment-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;
      font-size: 0.85em;
    }
    .comment-header strong { color: #fff; }
    .comment-date { color: rgba(255,255,255,0.3); font-size: 0.8em; }
    .comment-delete {
      margin-left: auto;
      background: none;
      border: none;
      color: rgba(255,80,80,0.6);
      font-size: 1.1em;
      cursor: pointer;
      padding: 0 4px;
    }
    .comment-delete:hover { color: #ff5050; }
    .comment p { color: rgba(255,255,255,0.7); font-size: 0.9em; line-height: 1.5; }

    .comment-form {
      display: flex;
      gap: 8px;
      margin-top: 10px;
      align-items: flex-end;
    }
    .comment-form textarea {
      flex: 1;
      background: rgba(0,0,0,0.4);
      border: 1px solid rgba(255,255,255,0.15);
      padding: 8px 12px;
      border-radius: 8px;
      color: #fff;
      font-family: 'SUSE Mono', monospace;
      font-size: 0.85em;
      resize: none;
    }
    .comment-form textarea:focus { outline: none; border-color: rgba(255,255,255,0.4); }
    .comment-form button {
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.3);
      padding: 8px 14px;
      border-radius: 8px;
      color: #fff;
      cursor: pointer;
      font-family: 'SUSE Mono', monospace;
      font-size: 0.85em;
      transition: all 0.3s;
      white-space: nowrap;
    }
    .comment-form button:hover { background: #fff; color: #000; }

    .card-meta {
      display: flex;
      justify-content: center;
      gap: 14px;
      margin-top: 8px;
      font-size: 0.8em;
      color: rgba(255,255,255,0.4);
    }

    .hidden { display: none !important; }

    /* Owner actions (edit/delete on user_projects) */
    .owner-actions {
      display: flex;
      gap: 10px;
      padding: 10px 20px 5px;
      justify-content: center;
    }
    .modal-btn {
      border: none;
      padding: 10px 18px;
      border-radius: 8px;
      font-family: 'SUSE Mono', monospace;
      font-size: 0.9em;
      cursor: pointer;
      transition: 0.3s;
      flex: 1;
    }
    .modal-btn.edit {
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.3);
      color: #fff;
    }
    .modal-btn.edit:hover { background: #fff; color: #000; }
    .modal-btn.delete {
      background: rgba(255, 80, 80, 0.1);
      border: 1px solid rgba(255,80,80,0.3);
      color: rgba(255,80,80,0.8);
    }
    .modal-btn.delete:hover { background: rgba(255,80,80,0.2); color: #ff5050; }
  `;
  document.head.appendChild(style);
})();

// Auto-init on DOMContentLoaded
document.addEventListener('DOMContentLoaded', initProjectModal);
