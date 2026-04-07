const API_BASE = '/data/backend.php';

async function api(action, options = {}) {
  const { method = 'GET', body = null, params = {} } = options;

  let url = `${API_BASE}?action=${action}`;
  for (const [k, v] of Object.entries(params)) {
    if (v !== '' && v !== undefined) {
      url += `&${k}=${encodeURIComponent(v)}`;
    }
  }

  const fetchOpts = {
    method,
    credentials: 'include',
    headers: {}
  };

  if (body) {
    fetchOpts.headers['Content-Type'] = 'application/json';
    fetchOpts.body = JSON.stringify(body);
  }

  const res = await fetch(url, fetchOpts);
  return res.json();
}

async function uploadImage(file) {
  const form = new FormData();
  form.append('image', file);
  const res = await fetch(`${API_BASE}?action=upload.image`, {
    method: 'POST',
    credentials: 'include',
    body: form
  });
  return res.json();
}

async function checkAuth() {
  try {
    const res = await api('auth.me');
    if (res.success && res.data) return res.data;
  } catch (e) {}
  return null;
}

async function requireAuth() {
  const user = await checkAuth();
  if (!user) {
    window.location.href = '../autourn/index.html';
    throw new Error('not authenticated');
  }
  return user;
}

// ============================================================
// TOAST
// ============================================================
function showToast(msg, type = 'success') {
  const existing = document.querySelector('.td-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `td-toast td-toast-${type}`;
  toast.textContent = msg;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, 3500);
}

// ============================================================
// INLINE VALIDATION
// ============================================================
function showFieldError(input, msg) {
  clearFieldError(input);
  input.classList.add('field-error');
  const hint = document.createElement('div');
  hint.className = 'field-error-hint';
  hint.textContent = msg;
  input.parentNode.insertBefore(hint, input.nextSibling);
}

function clearFieldError(input) {
  input.classList.remove('field-error');
  const hint = input.parentNode.querySelector('.field-error-hint');
  if (hint) hint.remove();
}

function clearAllFieldErrors(form) {
  form.querySelectorAll('.field-error').forEach(el => el.classList.remove('field-error'));
  form.querySelectorAll('.field-error-hint').forEach(el => el.remove());
}

// ============================================================
// UI — Auth, Admin link, Active nav underline
// ============================================================
async function updateAuthUI() {
  const user = await checkAuth();
  const ctaBtn = document.querySelector('.cta-btn');
  if (!ctaBtn) return user;

  if (user) {
    ctaBtn.textContent = user.username;
    ctaBtn.href = '../profile/index.html';
  }

  // Admin link
  if (user && user.role === 'admin') {
    const nav = document.querySelector('.nav');
    if (nav && !nav.querySelector('.admin-link')) {
      const adminLink = document.createElement('a');
      adminLink.href = '../admin/index.html';
      adminLink.textContent = 'Админка';
      adminLink.className = 'admin-link';
      nav.appendChild(adminLink);
    }
  }

  return user;
}

// Active nav underline
function highlightActiveNav() {
  const path = window.location.pathname;
  document.querySelectorAll('.nav a, .mobile-nav a').forEach(link => {
    const href = link.getAttribute('href');
    if (!href || href === '#') return;
    const linkFolder = href.replace(/\.\.\//g, '').replace('/index.html', '').replace(/\//g, '');
    if (linkFolder && path.includes(linkFolder)) {
      link.classList.add('active-nav');
    }
  });
}

// ============================================================
// HAMBURGER MENU — replaces "Меню" with hamburger icon
// ============================================================
function initHamburgerMenu() {
  const header = document.querySelector('.header');
  if (!header) return;

  // Find the "Меню" link and replace it with hamburger
  const menuLink = document.querySelector(".nav a[id='menu-id']");
  if (!menuLink) return;

  // Replace "Меню" text with hamburger icon + label
  menuLink.innerHTML = `<span class="hamburger-icon"><span></span><span></span><span></span></span> Меню`;
  menuLink.classList.add('hamburger-trigger');
  menuLink.removeAttribute('href');

  // Create slide-out panel
  const slideMenu = document.createElement('div');
  slideMenu.className = 'slide-menu';

  // Build menu content from dropdown
  const dropdown = document.getElementById('dropdown-menu');
  if (dropdown) {
    slideMenu.innerHTML = dropdown.innerHTML;
    dropdown.remove(); // Remove old dropdown
  }

  // Add nav links to slide menu too
  const nav = header.querySelector('.nav');
  if (nav) {
    const navSection = document.createElement('div');
    navSection.className = 'dropdown-section';
    navSection.innerHTML = '<h4>Разделы</h4><ul></ul>';
    const ul = navSection.querySelector('ul');
    nav.querySelectorAll('a').forEach(link => {
      if (link.id === 'menu-id') return;
      const li = document.createElement('li');
      const a = link.cloneNode(true);
      li.appendChild(a);
      ul.appendChild(li);
    });
    slideMenu.insertBefore(navSection, slideMenu.firstChild);
  }

  // Overlay
  const overlay = document.createElement('div');
  overlay.className = 'slide-menu-overlay';

  document.body.appendChild(overlay);
  document.body.appendChild(slideMenu);

  let isOpen = false;

  function toggle() {
    isOpen = !isOpen;
    slideMenu.classList.toggle('open', isOpen);
    overlay.classList.toggle('open', isOpen);
    menuLink.classList.toggle('open', isOpen);
  }

  function close() {
    isOpen = false;
    slideMenu.classList.remove('open');
    overlay.classList.remove('open');
    menuLink.classList.remove('open');
  }

  menuLink.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggle();
  });

  overlay.addEventListener('click', close);

  slideMenu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', close);
  });
}

// Dropdown — disabled, replaced by hamburger slide menu
function initDropdownMenu() {}

// ============================================================
// INJECT GLOBAL STYLES
// ============================================================
(function injectGlobalCSS() {
  if (document.getElementById('td-global-style')) return;
  const style = document.createElement('style');
  style.id = 'td-global-style';
  style.textContent = `
    /* Global background blur overlay — pure blur, no darkening */
    body::after {
      content: '';
      position: fixed;
      inset: 0;
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
      z-index: -1;
      pointer-events: none;
    }

    /* Toast */
    .td-toast {
      position: fixed;
      bottom: 30px;
      right: 30px;
      padding: 14px 24px;
      border-radius: 12px;
      color: #fff;
      font-family: 'SUSE Mono', monospace;
      font-size: 0.95em;
      z-index: 9999;
      opacity: 0;
      transform: translateY(20px);
      transition: all 0.4s ease;
      pointer-events: none;
      backdrop-filter: blur(10px);
      max-width: 400px;
    }
    .td-toast.show { opacity: 1; transform: translateY(0); }
    .td-toast-success {
      background: rgba(255,255,255,0.12);
      border: 1px solid rgba(255,255,255,0.25);
    }
    .td-toast-error {
      background: rgba(255, 60, 60, 0.18);
      border: 1px solid rgba(255, 60, 60, 0.35);
    }

    /* Field errors */
    .field-error {
      border-color: rgba(255, 80, 80, 0.6) !important;
      box-shadow: 0 0 0 2px rgba(255, 80, 80, 0.15) !important;
    }
    .field-error-hint {
      color: rgba(255, 100, 100, 0.9);
      font-size: 0.8em;
      margin-top: 4px;
      padding-left: 2px;
    }

    /* Active nav underline */
    .nav a.active-nav {
      color: #fff !important;
      position: relative;
    }
    .nav a.active-nav::after {
      content: '';
      position: absolute;
      bottom: -4px;
      left: 0;
      width: 100%;
      height: 2px;
      background: #fff;
      border-radius: 1px;
    }

    /* Hamburger menu trigger */
    .hamburger-trigger {
      cursor: pointer;
      display: inline-flex !important;
      align-items: center;
      gap: 8px;
      padding: 4px 0;
      user-select: none;
    }
    .hamburger-icon {
      display: inline-flex;
      flex-direction: column;
      justify-content: center;
      gap: 4px;
      width: 20px;
      height: 16px;
      position: relative;
    }
    .hamburger-icon span {
      display: block;
      width: 100%;
      height: 2px;
      background: currentColor;
      border-radius: 2px;
      transition: all 0.3s ease;
      transform-origin: center;
    }
    .hamburger-trigger.open .hamburger-icon span:nth-child(1) {
      transform: rotate(45deg) translate(4px, 4px);
    }
    .hamburger-trigger.open .hamburger-icon span:nth-child(2) {
      opacity: 0;
    }
    .hamburger-trigger.open .hamburger-icon span:nth-child(3) {
      transform: rotate(-45deg) translate(4px, -4px);
    }

    /* Slide menu panel */
    .slide-menu {
      position: fixed;
      top: 0;
      left: -300px;
      width: 280px;
      height: 100vh;
      background: rgba(17,17,17,0.97);
      backdrop-filter: blur(14px);
      border-right: 1px solid rgba(255,255,255,0.08);
      z-index: 2000;
      padding: 30px 24px;
      overflow-y: auto;
      transition: left 0.35s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .slide-menu.open {
      left: 0;
    }
    .slide-menu::-webkit-scrollbar { width: 0; }

    .slide-menu .dropdown-section {
      margin-bottom: 20px;
    }
    .slide-menu .dropdown-section h4 {
      font-size: 0.75em;
      color: rgba(255,255,255,0.35);
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 10px;
      padding-bottom: 6px;
      border-bottom: 1px solid rgba(255,255,255,0.06);
    }
    .slide-menu .dropdown-section ul {
      list-style: none;
      padding: 0;
    }
    .slide-menu .dropdown-section ul li a {
      display: block;
      color: rgba(255,255,255,0.7);
      text-decoration: none;
      padding: 10px 12px;
      border-radius: 8px;
      font-size: 0.9em;
      font-family: 'SUSE Mono', monospace;
      transition: all 0.2s;
    }
    .slide-menu .dropdown-section ul li a:hover {
      background: rgba(255,255,255,0.08);
      color: #fff;
    }

    /* Overlay behind slide menu */
    .slide-menu-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.5);
      z-index: 1999;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.35s ease;
    }
    .slide-menu-overlay.open {
      opacity: 1;
      pointer-events: auto;
    }
  `;
  document.head.appendChild(style);
})();

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  updateAuthUI();
  initHamburgerMenu();
  initDropdownMenu();
  highlightActiveNav();
});
