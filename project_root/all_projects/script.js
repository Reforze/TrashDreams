const container = document.getElementById("projects-container");
const searchInput = document.getElementById("search-input");
const categoryFilter = document.getElementById("category-filter");

// Читаем ?cat= из URL и устанавливаем фильтр категории
const urlCat = new URLSearchParams(window.location.search).get('cat');
if (urlCat && categoryFilter) {
  categoryFilter.value = urlCat;
}

async function loadProjects() {
  const search = searchInput.value.trim();
  const category = categoryFilter.value;

  try {
    const res = await api('projects.list', {
      params: { search, category, sort: 'newest' }
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
    container.innerHTML = "<p style='grid-column:1/-1; text-align:center; color:rgba(255,255,255,0.5);'>Проектов не найдено</p>";
    return;
  }
  list.forEach(project => {
    const card = document.createElement("div");
    card.classList.add("steam-card");

    const percent = Math.min((project.raised / project.goal) * 100, 100);
    const likes = project.likes_count || 0;
    const comments = project.comments_count || 0;

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
  initIntersectionObserver();
}

// Filters
searchInput.addEventListener("input", loadProjects);
categoryFilter.addEventListener("change", loadProjects);

// Scroll top
const scrollBtn = document.getElementById("scroll-top");
window.addEventListener("scroll", () => {
  scrollBtn.style.display = window.scrollY > 400 ? "block" : "none";
});
scrollBtn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

// Intersection Observer for fade-in
let observer;
function initIntersectionObserver() {
  if (observer) observer.disconnect();
  const faders = document.querySelectorAll('.fade-in-element');
  const filterBar = document.querySelector('.filter-bar');
  if (filterBar && !filterBar.classList.contains('visible')) {
    filterBar.classList.add('fade-in-element', 'visible');
  }
  const appearOptions = { threshold: 0.1, rootMargin: "0px 0px -50px 0px" };
  observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('visible');
      obs.unobserve(entry.target);
    });
  }, appearOptions);
  faders.forEach(fader => {
    if (!fader.classList.contains('visible')) observer.observe(fader);
  });
}

loadProjects();
