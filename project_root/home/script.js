document.addEventListener("DOMContentLoaded", async () => {

  // ===================================
  // 1. ЗАГРУЗКА ДАННЫХ С БЭКЕНДА
  // ===================================

  let homeData = { featured_projects: [], books: [], movies: [], partners: [], reviews: [] };
  let statsData = { projects: 0, raised: 0, users: 0 };

  try {
    const [homeRes, statsRes] = await Promise.all([
      api('home'),
      api('stats')
    ]);
    if (homeRes.success) homeData = homeRes.data;
    if (statsRes.success) statsData = statsRes.data;
  } catch (e) {
    console.error('Ошибка загрузки данных:', e);
  }

  // Map backend data to card format
  const projectsData = homeData.featured_projects.map(p => ({
    type: 'project', id: p.id, title: p.title, goal: p.goal, raised: p.raised,
    img: p.img, desc: p.description
  }));

  const booksData = homeData.books.map(b => ({
    type: 'book', title: b.title, desc: b.description, img: b.img
  }));

  const moviesData = homeData.movies.map(m => ({
    type: 'movie', title: m.title, desc: m.description, img: m.img
  }));

  const partnersData = homeData.partners.map(p => ({
    type: 'partner', title: p.title, desc: p.description, img: p.img
  }));

  // ===================================
  // 2. ФУНКЦИИ МОДАЛЬНОГО ОКНА
  // ===================================

  const modal = document.getElementById("info-modal");
  const closeModalBtn = document.querySelector(".close-modal");
  const modalImg = document.getElementById("modal-image");
  const modalTitle = document.getElementById("modal-title");
  const modalDesc = document.getElementById("modal-desc");
  const modalStats = document.getElementById("modal-stats");
  const modalActionBtn = document.querySelector(".modal-action-btn");

  function openModal(item) {
    modalImg.src = item.img;
    modalTitle.textContent = item.title;
    modalDesc.textContent = item.desc || "Описание отсутствует.";

    if (item.type === 'project') {
      const percent = Math.floor((item.raised / item.goal) * 100);
      modalStats.innerHTML = `Собрано: <b>${item.raised}₽</b> из ${item.goal}₽ (${percent}%)`;
      modalActionBtn.textContent = "Поддержать проект";
      modalStats.style.display = "block";
    } else if (item.type === 'partner') {
       modalStats.innerHTML = `Тип: Партнёрская организация`;
       modalActionBtn.textContent = "Перейти на сайт партнера";
       modalStats.style.display = "block";
    } else {
      modalStats.style.display = "none";
      modalActionBtn.textContent = "Узнать подробнее";
    }

    modal.classList.add("show");
  }

  function closeInfoModal() {
    modal.classList.remove("show");
  }
  closeModalBtn.addEventListener("click", closeInfoModal);

  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeInfoModal();
  });

  // ===================================
  // 3. ФУНКЦИЯ СОЗДАНИЯ СЛАЙДЕРА И КАРТОЧЕК
  // ===================================

  function createSliderSection(data, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    data.forEach(item => {
      const card = document.createElement("div");
      card.classList.add("slider-card");

      let cardText = "";
      if (item.type === 'project') {
        cardText = `<p>Собрано: ${item.raised}₽</p>`;
      } else if (item.type !== 'partner') {
        const shortDesc = item.desc && item.desc.length > 50 ? item.desc.substring(0, 47) + "..." : (item.desc || "");
        cardText = `<p>${shortDesc}</p>`;
      }

      card.innerHTML = `
        <img src="${item.img}" alt="${item.title}">
        <div class="card-info">
          <h3>${item.title}</h3>
          ${cardText}
        </div>
      `;

      if (item.type === 'project' && item.id) {
        card.addEventListener("click", () => openProjectModal(item.id));
      } else {
        card.addEventListener("click", () => openModal(item));
      }
      container.appendChild(card);
    });
  }

  createSliderSection(projectsData, "featured-projects");
  createSliderSection(booksData, "books-list");
  createSliderSection(moviesData, "movies-list");
  createSliderSection(partnersData, "partners-list");

  // ===================================
  // 4. ЛОГИКА КНОПОК СЛАЙДЕРА (ПРОКРУТКА)
  // ===================================

  const sliderButtons = document.querySelectorAll(".slider-btn");

  sliderButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-target");
      const container = document.getElementById(targetId);
      const scrollAmount = 300;

      if (btn.classList.contains("left")) {
        container.scrollBy({ left: -scrollAmount, behavior: "smooth" });
      } else {
        container.scrollBy({ left: scrollAmount, behavior: "smooth" });
      }
    });
  });

  // ===================================
  // 5. ДИНАМИЧЕСКИЕ СЧЕТЧИКИ СТАТИСТИКИ
  // ===================================
  const stats = [
    { id: "stat-projects", value: statsData.projects || 0 },
    { id: "stat-money", value: statsData.raised || 0 },
    { id: "stat-users", value: statsData.users || 0 }
  ];

  stats.forEach(stat => {
    let current = 0;
    const el = document.getElementById(stat.id);
    if (!el) return;
    const step = stat.value / 50;
    const interval = setInterval(() => {
      current += step;
      if (current >= stat.value) {
        current = stat.value;
        clearInterval(interval);
      }
      el.textContent = stat.id === "stat-money"
        ? Math.floor(current).toLocaleString('ru-RU') + "₽"
        : Math.floor(current).toLocaleString('ru-RU');
    }, 40);
  });

  // ===================================
  // 6. ОТЗЫВЫ (РЕНДЕРИНГ)
  // ===================================
  const reviewsContainer = document.getElementById("reviews-container");
  if (reviewsContainer) {
    homeData.reviews.forEach(r => {
      const reviewCard = document.createElement("div");
      reviewCard.classList.add("review");
      reviewCard.innerHTML = `
        <img src="${r.author_img}" alt="${r.author}">
        <p>«${r.text}»</p>
        <span>— ${r.author}</span>
      `;
      reviewsContainer.appendChild(reviewCard);
    });
  }

  // ===================================
  // 7. ПЛАВНОЕ ПОЯВЛЕНИЕ ЭЛЕМЕНТОВ
  // ===================================
  const faders = document.querySelectorAll('.fade-in-element');
  const appearOptions = { threshold: 0.1, rootMargin: "0px 0px -50px 0px" };
  const appearOnScroll = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    });
  }, appearOptions);
  faders.forEach(fader => appearOnScroll.observe(fader));
});
