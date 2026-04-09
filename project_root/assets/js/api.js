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
// DROPDOWN MENU — opens beneath "Меню" word
// ============================================================
function initHamburgerMenu() {
  const header = document.querySelector('.header');
  if (!header) return;

  const menuLink = document.querySelector(".nav a[id='menu-id']");
  if (!menuLink) return;

  // Style as dropdown trigger (keep text "Меню", add small arrow)
  menuLink.innerHTML = `Меню <span class="menu-arrow">▾</span>`;
  menuLink.classList.add('dropdown-trigger');
  menuLink.removeAttribute('href');
  menuLink.style.position = 'relative';

  // Build dropdown panel
  const dropPanel = document.createElement('div');
  dropPanel.className = 'dd-menu';

  const dropdown = document.getElementById('dropdown-menu');
  if (dropdown) {
    dropPanel.innerHTML = dropdown.innerHTML;
    dropdown.remove();
  }

  menuLink.parentElement.style.position = 'relative';
  menuLink.parentElement.insertBefore(dropPanel, menuLink.nextSibling);

  let isOpen = false;

  function toggle() {
    isOpen = !isOpen;
    dropPanel.classList.toggle('open', isOpen);
    menuLink.classList.toggle('open', isOpen);
  }

  function close() {
    isOpen = false;
    dropPanel.classList.remove('open');
    menuLink.classList.remove('open');
  }

  menuLink.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggle();
  });

  document.addEventListener('click', (e) => {
    if (!dropPanel.contains(e.target) && e.target !== menuLink) close();
  });

  dropPanel.querySelectorAll('a').forEach(link => {
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
      text-decoration: underline;
      text-underline-offset: 6px;
      text-decoration-thickness: 2px;
    }

    /* Dropdown trigger */
    .dropdown-trigger {
      cursor: pointer;
      user-select: none;
      display: inline-flex !important;
      align-items: center;
      gap: 4px;
    }
    .menu-arrow {
      font-size: 0.7em;
      transition: transform 0.3s ease;
      display: inline-block;
    }
    .dropdown-trigger.open .menu-arrow {
      transform: rotate(180deg);
    }

    /* Nav alignment fix */
    .nav {
      display: flex;
      align-items: center;
    }
    .nav a {
      display: inline-flex;
      align-items: center;
    }

    /* Dropdown panel */
    .dd-menu {
      position: absolute;
      top: calc(100% + 12px);
      left: 0;
      min-width: 300px;
      background: rgba(17,17,17,0.97);
      backdrop-filter: blur(14px);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 14px;
      padding: 16px 20px;
      z-index: 2000;
      box-shadow: 0 12px 40px rgba(0,0,0,0.7);
      opacity: 0;
      visibility: hidden;
      transform: translateY(-8px);
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      pointer-events: none;
    }
    .dd-menu.open {
      opacity: 1;
      visibility: visible;
      transform: translateY(0);
      pointer-events: auto;
    }

    .dd-menu .dropdown-section {
      margin-bottom: 14px;
    }
    .dd-menu .dropdown-section:last-child {
      margin-bottom: 0;
    }
    .dd-menu .dropdown-section h4 {
      font-size: 0.72em;
      color: rgba(255,255,255,0.35);
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 8px;
      padding-bottom: 6px;
      border-bottom: 1px solid rgba(255,255,255,0.06);
    }
    .dd-menu .dropdown-section ul {
      list-style: none;
      padding: 0;
    }
    .dd-menu .dropdown-section ul li a {
      display: block;
      color: rgba(255,255,255,0.65);
      text-decoration: none;
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 0.88em;
      font-family: 'SUSE Mono', monospace;
      transition: all 0.2s;
    }
    .dd-menu .dropdown-section ul li a:hover {
      background: rgba(255,255,255,0.08);
      color: #fff;
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
