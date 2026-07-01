/**
 * shared.js — DeepGuard v2.0
 * Common utilities reused by all sub-pages (non-dashboard pages)
 * Handles: theme, session guard, sidebar, particles, toast
 */

/* ── Theme ─────────────────────────────────────────────────── */
function dgApplyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme || 'dark');
  localStorage.setItem('dg_theme', theme || 'dark');
  const btn = document.getElementById('theme-toggle-btn');
  if (btn) {
    const icons = { dark: 'fa-moon', light: 'fa-sun', amoled: 'fa-circle', cyberpunk: 'fa-bolt' };
    btn.innerHTML = `<i class="fa-solid ${icons[theme] || 'fa-moon'}"></i>`;
  }
}

function dgLoadTheme() {
  const saved = localStorage.getItem('dg_theme') || 'dark';
  dgApplyTheme(saved);
  const btn = document.getElementById('theme-toggle-btn');
  if (btn) btn.addEventListener('click', () => {
    const themes = ['dark', 'light', 'amoled', 'cyberpunk'];
    const cur = document.documentElement.getAttribute('data-theme') || 'dark';
    dgApplyTheme(themes[(themes.indexOf(cur) + 1) % themes.length]);
  });
}

/* ── Session Guard ──────────────────────────────────────────── */
function dgSessionGuard() {
  const user = sessionStorage.getItem('dg_current_user');
  if (!user) { window.location.href = 'index.html'; return null; }
  const avatarEl = document.getElementById('user-avatar');
  const nameEl   = document.getElementById('user-name-label');
  if (avatarEl) avatarEl.textContent = user.charAt(0).toUpperCase();
  if (nameEl)   nameEl.textContent   = user;
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) logoutBtn.addEventListener('click', () => {
    sessionStorage.removeItem('dg_current_user');
    window.location.href = 'index.html';
  });
  return user;
}

/* ── Get History ────────────────────────────────────────────── */
function dgGetHistory(userName) {
  const key = 'dg_hist_' + userName.trim().toLowerCase().replace(/\s+/g, '_');
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
}

function dgSaveHistory(userName, data) {
  const key = 'dg_hist_' + userName.trim().toLowerCase().replace(/\s+/g, '_');
  try { localStorage.setItem(key, JSON.stringify(data.slice(0, 60))); } catch(e) {}
}

/* ── Sidebar ────────────────────────────────────────────────── */
function dgInitSidebar() {
  const sidebar   = document.getElementById('sidebar');
  const hamburger = document.getElementById('sidebar-toggle');
  const overlay   = document.getElementById('sb-overlay');
  const collapse  = document.getElementById('sidebar-collapse-btn');
  const main      = document.getElementById('main-content');
  let collapsed   = false;

  const toggle = () => {
    if (window.innerWidth <= 900) {
      sidebar && sidebar.classList.toggle('mobile-open');
      overlay && overlay.classList.toggle('hidden');
    } else {
      collapsed = !collapsed;
      sidebar && sidebar.classList.toggle('collapsed', collapsed);
      main    && main.classList.toggle('sidebar-collapsed', collapsed);
    }
  };

  hamburger && hamburger.addEventListener('click', toggle);
  collapse  && collapse.addEventListener('click', () => {
    collapsed = !collapsed;
    sidebar && sidebar.classList.toggle('collapsed', collapsed);
    main    && main.classList.toggle('sidebar-collapsed', collapsed);
  });
  overlay && overlay.addEventListener('click', () => {
    sidebar && sidebar.classList.remove('mobile-open');
    overlay.classList.add('hidden');
  });
}

/* ── Particles ──────────────────────────────────────────────── */
function dgInitParticles() {
  const canvas = document.getElementById('particles-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W = canvas.width = window.innerWidth;
  let H = canvas.height = window.innerHeight;
  const particles = Array.from({ length: 40 }, () => ({
    x: Math.random() * W, y: Math.random() * H,
    r: Math.random() * 1.5 + 0.3,
    dx: (Math.random() - 0.5) * 0.25,
    dy: (Math.random() - 0.5) * 0.25,
    alpha: Math.random() * 0.25 + 0.04,
    color: ['#7c3aed', '#4f46e5', '#06b6d4'][Math.floor(Math.random() * 3)]
  }));
  function draw() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => {
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color; ctx.globalAlpha = p.alpha; ctx.fill();
      p.x += p.dx; p.y += p.dy;
      if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
    });
    ctx.globalAlpha = 1;
    requestAnimationFrame(draw);
  }
  draw();
  window.addEventListener('resize', () => { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; });
}

/* ── Toast ──────────────────────────────────────────────────── */
let _toastTimer = null;
function dgToast(msg, type = 'info', dur = 3200) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  if (_toastTimer) clearTimeout(_toastTimer);
  const icons = { success: '✓', error: '✕', info: '◈', warning: '⚠' };
  toast.innerHTML = `<span>${icons[type] || '◈'}</span> ${msg}`;
  toast.className = `toast show t-${type}`;
  _toastTimer = setTimeout(() => toast.classList.remove('show'), dur);
}

/* ── Shared sidebar HTML template ───────────────────────────── */
function dgSidebarNav(activePage) {
  const items = [
    { id: 'dashboard', href: 'index.html',     icon: 'fa-house',            label: 'Dashboard' },
    { id: 'history',   href: 'history.html',   icon: 'fa-clock-rotate-left',label: 'History' },
    { id: 'analytics', href: 'analytics.html', icon: 'fa-chart-line',       label: 'Analytics' },
    { id: 'assistant', href: 'assistant.html', icon: 'fa-robot',            label: 'AI Assistant' },
    { divider: true },
    { id: 'reports',   href: 'reports.html',   icon: 'fa-file-lines',       label: 'Reports' },
    { id: 'learn',     href: 'learn.html',     icon: 'fa-book-open',        label: 'Learn' },
    { divider: true },
    { id: 'settings',  href: 'settings.html',  icon: 'fa-gear',             label: 'Settings' },
    { id: 'about',     href: 'about.html',     icon: 'fa-circle-info',      label: 'About' }
  ];
  return items.map(item => {
    if (item.divider) return '<div class="sb-divider"></div>';
    const active = item.id === activePage ? ' active' : '';
    return `<a href="${item.href}" class="sb-nav-btn${active}"><span class="sb-nav-icon"><i class="fa-solid ${item.icon}"></i></span><span class="sb-nav-label">${item.label}</span></a>`;
  }).join('');
}

/* ── Class helper ───────────────────────────────────────────── */
function dgClsFor(prediction) {
  if (prediction === 'Real')      return 'real';
  if (prediction === 'Uncertain') return 'uncertain';
  return 'fake';
}

function dgEscHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ── Standard page boot ─────────────────────────────────────── */
function dgPageBoot(activePage) {
  dgLoadTheme();
  const user = dgSessionGuard();
  if (!user) return null;
  dgInitSidebar();
  dgInitParticles();
  return user;
}
