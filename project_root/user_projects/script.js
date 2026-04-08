const container = document.getElementById("projects-container");
const searchInput = document.getElementById("search-input");
const sortFilter = document.getElementById("sort-filter");
const createBtn = document.getElementById("create-btn");

createBtn.addEventListener("click", () => {
  window.location.href = "../create_proj/index.html";
});

async function loadProjects() {
  try {
    await requireAuth();
  } catch (e) { return; }

  const search = searchInput.value.trim();
  const sort = sortFilter.value;

  try {
    const res = await api('projects.list', {
      params: { search, sort: sort === 'status' ? 'newest' : sort, mine: '1' }
    });
    if (res.success) {
      let list = res.data;
      if (sort === 'status') {
        const priorities = { active: 1, review: 2, closed: 3 };
        list.sort((a, b) => (priorities[a.status] || 9) - (priorities[b.status] || 9));
      }
      renderProjects(list);
    }
  } catch (e) {
    console.error('Ошибка загрузки проектов:', e);
  }
}

const statusLabels = { active: 'Активен', review: 'На модерации', closed: 'Сбор закрыт' };
const statusClasses = { active: 'status-active', review: 'status-review', closed: 'status-closed' };

function renderProjects(list) {
  container.innerHTML = "";
  if (list.length === 0) {
    container.innerHTML = "<p style='grid-column: 1/-1; text-align:center; color: rgba(255,255,255,0.4);'>У вас пока нет проектов.</p>";
    return;
  }
  list.forEach(project => {
    const percent = Math.min((project.raised / project.goal) * 100, 100);
    const statusClass = statusClasses[project.status] || 'status-active';
    const statusText = statusLabels[project.status] || project.status;
    const likes = project.likes_count || 0;
    const comments = project.comments_count || 0;

    const card = document.createElement("div");
    card.classList.add("steam-card");
    card.innerHTML = `
      <div class="steam-card-img">
        <img src="${project.img || '../assets/images/logo.ico'}" alt="${project.title}">
        <div class="steam-card-overlay"></div>
      </div>
      <div class="steam-card-body">
        <span class="steam-status-badge steam-${statusClass}">${statusText}</span>
        <h3 class="steam-card-title">${project.title}</h3>
        <div class="steam-card-stats">
          <span class="steam-raised">${project.raised}₽</span>
          <span class="steam-goal">из ${project.goal}₽</span>
        </div>
        <div class="steam-progress-bar">
          <div class="steam-progress" style="width:${percent}%;"></div>
        </div>
        <div class="steam-card-footer">
          <span class="steam-meta">&#9829; ${likes} &nbsp; &#128172; ${comments}</span>
          <span class="steam-percent">${percent.toFixed(0)}%</span>
        </div>
      </div>
    `;
    card.addEventListener("click", () => openOwnerModal(project.id));
    container.appendChild(card);
  });
}

// Owner modal — extends the shared project modal with edit/delete
async function openOwnerModal(projectId) {
  await openProjectModal(projectId);

  // Inject owner actions after the modal is open
  const modalInfo = document.getElementById('modal-info');
  if (!modalInfo) return;

  // Check if owner actions already added
  if (modalInfo.querySelector('.owner-actions')) return;

  const actions = document.createElement('div');
  actions.className = 'owner-actions';
  actions.innerHTML = `
    <button class="modal-btn edit" id="owner-edit-btn">Редактировать</button>
    <button class="modal-btn delete" id="owner-delete-btn">Удалить</button>
  `;
  modalInfo.appendChild(actions);

  document.getElementById('owner-edit-btn').addEventListener('click', async () => {
    const newTitle = prompt("Новое название:");
    if (!newTitle) return;
    const newDesc = prompt("Новое описание:");

    const res = await api('projects.update', {
      method: 'POST',
      params: { id: projectId },
      body: { title: newTitle, description: newDesc || '' }
    });
    if (res.success) {
      showToast('Проект обновлён');
      document.getElementById('modal').classList.remove('show');
      loadProjects();
    } else {
      showToast(res.error || 'Ошибка', 'error');
    }
  });

  document.getElementById('owner-delete-btn').addEventListener('click', async () => {
    if (!confirm('Удалить этот проект?')) return;

    const res = await api('projects.delete', {
      method: 'POST',
      params: { id: projectId }
    });
    if (res.success) {
      showToast('Проект удалён');
      document.getElementById('modal').classList.remove('show');
      loadProjects();
    } else {
      showToast(res.error || 'Ошибка', 'error');
    }
  });
}

// Filters
searchInput.addEventListener("input", loadProjects);
sortFilter.addEventListener("change", loadProjects);

// Scroll top
const scrollBtn = document.getElementById("scroll-top");
window.addEventListener("scroll", () => {
  scrollBtn.style.display = window.scrollY > 400 ? "block" : "none";
});
scrollBtn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

loadProjects();
