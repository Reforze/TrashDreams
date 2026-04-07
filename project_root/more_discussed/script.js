const container = document.getElementById("projects-container");
const searchInput = document.getElementById("search-input");
const sortFilter = document.getElementById("sort-filter");

async function loadProjects() {
  const search = searchInput.value.trim();
  const sort = sortFilter.value || 'discussed';

  try {
    const res = await api('projects.list', {
      params: { search, sort, status: 'active' }
    });
    if (res.success) {
      renderProjects(res.data);
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
    card.classList.add("project-card");
    if (project.discussions >= 100) card.classList.add("most-discussed");
    card.innerHTML = `
      <img src="${project.img || '../assets/images/logo.ico'}" alt="${project.title}">
      <div class="card-content">
        <h3>${project.title}</h3>
        <p>Обсуждения: ${project.discussions}</p>
        <p>Цель: ${project.goal} руб.</p>
        <div class="progress-bar">
          <div class="progress" style="width:${percent}%"></div>
        </div>
        <p>Собрано: ${project.raised} руб. (${percent.toFixed(0)}%)</p>
        <div class="card-meta">
          <span>&#9829; ${likes}</span>
          <span>&#128172; ${comments}</span>
        </div>
      </div>
    `;
    card.addEventListener("click", () => openProjectModal(project.id));
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
