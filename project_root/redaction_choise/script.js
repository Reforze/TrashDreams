const container = document.getElementById("projects-container");
const searchInput = document.getElementById("search-input");
const sortFilter = document.getElementById("sort-filter");

async function loadProjects() {
  const search = searchInput.value.trim();
  const sort = sortFilter.value;

  try {
    const res = await api('projects.editor_choice');
    if (res.success) {
      let list = res.data;
      if (search) {
        list = list.filter(p => p.title.toLowerCase().includes(search.toLowerCase()));
      }
      if (sort === 'newest') list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      else if (sort === 'popular') list.sort((a, b) => (b.raised / b.goal) - (a.raised / a.goal));
      else if (sort === 'raised') list.sort((a, b) => b.raised - a.raised);

      renderProjects(list);
    }
  } catch (e) {
    console.error('Ошибка загрузки проектов:', e);
  }
}

function renderProjects(list) {
  container.innerHTML = "";
  if (list.length === 0) {
    container.innerHTML = "<p style='grid-column:1/-1; text-align:center; color:rgba(255,255,255,0.4);'>Проектов не найдено</p>";
    return;
  }
  list.forEach(project => {
    const percent = Math.min((project.raised / project.goal) * 100, 100);
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
          <a class="steam-detail-btn" href="../project_detail/index.html?id=${project.id}">Подробнее</a>
        </div>
      </div>
    `;

    card.addEventListener("click", (e) => {
      if (e.target.closest('.steam-detail-btn')) return;
      openProjectModal(project.id);
    });
    container.appendChild(card);
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
