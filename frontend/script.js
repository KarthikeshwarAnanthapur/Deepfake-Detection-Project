/**
 * script.js — DeepGuard v2.0
 * Shared utilities + Dashboard logic (Login, Upload, Detection, History, Assistant)
 * Compatible with existing FastAPI backend at /predict and /health
 */

/* ── CONFIG ──────────────────────────────────────────────── */
const API_BASE    = 'http://127.0.0.1:8000';
const API_URL     = API_BASE + '/predict';
const HEALTH_URL  = API_BASE + '/health';
const MAX_HIST    = 500;
const STORAGE_KEY = (name) => 'dg_hist_' + name.trim().toLowerCase().replace(/\s+/g, '_');
const USER_KEY    = 'dg_current_user';
const THEME_KEY   = 'dg_theme';
const CONF_THRESHOLD_KEY = 'dg_conf_threshold';
const ANIM_KEY    = 'dg_animations';

/* ── STATE ───────────────────────────────────────────────── */
let currentUser    = null;
let history_data   = [];
let currentFile    = null;
let currentDataURL = null;
let originalDataURL = null;
let cropper        = null;
let sidebarCollapsed = false;
let toastTimer     = null;

/* ── DOM REFS ────────────────────────────────────────────── */
const $ = (id) => document.getElementById(id);

// Login
const loginPage  = $('login-page');
const usernameIn = $('username-input');
const loginBtn   = $('login-btn');

// App
const appEl      = $('app');
const userAvatar = $('user-avatar');
const userLabel  = $('user-name-label');
const logoutBtn  = $('logout-btn');

// Sidebar
const sidebar         = $('sidebar');
const hamburger       = $('sidebar-toggle');
const sbOverlay       = $('sb-overlay');
const collapseBtn     = $('sidebar-collapse-btn');
const mainContent     = $('main-content');

// Upload
const dropZone        = $('drop-zone');
const fileInput       = $('file-input');
const previewWrap     = $('preview-wrap');
const previewImg      = $('preview-img');
const clearImgBtn     = $('clear-img-btn');
const fileInfo        = $('file-info');
const detectBtn       = $('detect-btn');

// Result
const resultPh       = $('result-placeholder');
const resultBody     = $('result-body');
const resultBadge    = $('result-badge');
const resultLabel    = $('result-label');
const resultDesc     = $('result-desc');
const confPct        = $('conf-pct');
const confBar        = $('conf-bar');
const reasonBlock    = $('reason-block');
const reasonText     = $('result-reason');
const indicatorsList = $('result-indicators');
const indicatorsSection = $('indicators-section');
const metaModel      = $('meta-model');
const metaDec        = $('meta-decision');
const metaTime       = $('meta-time');
const againBtn       = $('again-btn');

// Stats
const statTotal    = $('stat-total');
const statReal     = $('stat-real');
const statFake     = $('stat-fake');
const statAvgConf  = $('stat-avg-conf');

// Recent strip
const recentCard   = $('recent-card');
const recentStrip  = $('recent-strip');

// Health
const healthDotApi  = $('health-dot-api');
const healthApiText = $('health-api-text');
const aiStatusPill  = $('ai-status-pill');
const aiStatusLabel = $('ai-status-label');

// Toast
const toastEl = $('toast');

// Scan overlay
const faceBox    = $('face-box');
const scanLine   = $('scan-line');

/* ═══════════════════════════════════════════════════════════
   PARTICLES — floating background dots
═══════════════════════════════════════════════════════════ */
function initParticles() {
  const canvas = $('particles-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W = canvas.width = window.innerWidth;
  let H = canvas.height = window.innerHeight;
  const particles = [];
  const COUNT = 55;

  for (let i = 0; i < COUNT; i++) {
    particles.push({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.8 + 0.4,
      dx: (Math.random() - 0.5) * 0.3,
      dy: (Math.random() - 0.5) * 0.3,
      alpha: Math.random() * 0.4 + 0.05,
      color: ['#7c3aed', '#4f46e5', '#06b6d4'][Math.floor(Math.random() * 3)]
    });
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    for (const p of particles) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.fill();
      p.x += p.dx;
      p.y += p.dy;
      if (p.x < 0) p.x = W;
      if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H;
      if (p.y > H) p.y = 0;
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(draw);
  }

  draw();
  window.addEventListener('resize', () => {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  });
}

/* ═══════════════════════════════════════════════════════════
   THEME
═══════════════════════════════════════════════════════════ */
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme || 'dark');
  localStorage.setItem(THEME_KEY, theme || 'dark');
  const btn = $('theme-toggle-btn');
  if (btn) {
    const icons = { dark: 'fa-moon', light: 'fa-sun', amoled: 'fa-circle', cyberpunk: 'fa-bolt' };
    btn.innerHTML = `<i class="fa-solid ${icons[theme] || 'fa-moon'}"></i>`;
  }
}

function loadTheme() {
  const saved = localStorage.getItem(THEME_KEY) || 'dark';
  applyTheme(saved);
}

const themeToggle = $('theme-toggle-btn');
if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    const themes = ['dark', 'light', 'amoled', 'cyberpunk'];
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = themes[(themes.indexOf(current) + 1) % themes.length];
    applyTheme(next);
    showToast(`Theme: ${next.charAt(0).toUpperCase() + next.slice(1)}`, 'info', 1500);
  });
}

/* ═══════════════════════════════════════════════════════════
   TOAST
═══════════════════════════════════════════════════════════ */
function showToast(msg, type = 'info', dur = 3500) {
  if (!toastEl) return;
  if (toastTimer) clearTimeout(toastTimer);
  const icons = { success: '✓', error: '✕', info: '◈', warning: '⚠' };
  toastEl.innerHTML = `<span>${icons[type] || '◈'}</span> ${msg}`;
  toastEl.className = `toast show t-${type}`;
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), dur);
}

/* ═══════════════════════════════════════════════════════════
   LOGIN / LOGOUT
═══════════════════════════════════════════════════════════ */
function doLogin() {
  const name = usernameIn.value.trim();
  if (!name) {
    usernameIn.classList.add('shake');
    setTimeout(() => usernameIn.classList.remove('shake'), 400);
    usernameIn.focus();
    return;
  }
  currentUser  = name;
  history_data = loadHistory(name);

  // Store session
  sessionStorage.setItem(USER_KEY, name);

  // Update UI
  if (userAvatar) userAvatar.textContent = name.charAt(0).toUpperCase();
  if (userLabel)  userLabel.textContent  = name;

  // Animate out login page
  loginPage.classList.add('fade-out');
  setTimeout(() => {
    loginPage.classList.add('hidden');
    appEl.classList.remove('hidden');
    initSidebarMode();
    renderDashboardStats();
    renderRecentStrip();
    pingHealth();
    showToast(`Welcome, ${name}! 👋`, 'success');
  }, 380);
}

function doLogout() {
  currentUser  = null;
  history_data = [];
  sessionStorage.removeItem(USER_KEY);
  clearUpload();
  appEl.classList.add('hidden');
  loginPage.classList.remove('hidden', 'fade-out');
  if (usernameIn) usernameIn.value = '';
  if (window.innerWidth < 900) closeSidebarMobile();
  lockAssistant();
  setTimeout(() => { if (usernameIn) usernameIn.focus(); }, 100);
}

// Auto-restore session on page load
function restoreSession() {
  const saved = sessionStorage.getItem(USER_KEY);
  if (saved) {
    currentUser  = saved;
    history_data = loadHistory(saved);
    if (userAvatar) userAvatar.textContent = saved.charAt(0).toUpperCase();
    if (userLabel)  userLabel.textContent  = saved;
    loginPage && loginPage.classList.add('hidden');
    appEl && appEl.classList.remove('hidden');
    initSidebarMode();
    renderDashboardStats();
    renderRecentStrip();
    pingHealth();
  } else {
    if (appEl) appEl.classList.add('hidden');
    if (loginPage) loginPage.classList.remove('hidden');
    setTimeout(() => { if (usernameIn) usernameIn.focus(); }, 100);
  }
}

if (loginBtn)  loginBtn.addEventListener('click', doLogin);
if (usernameIn) usernameIn.addEventListener('keydown', (e) => { if (e.key === 'Enter') doLogin(); });
if (logoutBtn) logoutBtn.addEventListener('click', doLogout);

/* ═══════════════════════════════════════════════════════════
   LOCAL STORAGE
═══════════════════════════════════════════════════════════ */
function loadHistory(name) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY(name));
    return raw ? JSON.parse(raw) : [];
  } catch (e) { return []; }
}

function saveHistory(name, data) {
  try {
    localStorage.setItem(STORAGE_KEY(name), JSON.stringify(data.slice(0, MAX_HIST)));
  } catch (e) {
    if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
      console.warn('[DeepGuard] LocalStorage full. Stripping image previews from older entries...');
      const cleanerData = data.map((entry, idx) => {
        if (idx > 50 && entry.dataURL) {
          return Object.assign({}, entry, { dataURL: null });
        }
        return entry;
      });
      try {
        localStorage.setItem(STORAGE_KEY(name), JSON.stringify(cleanerData.slice(0, MAX_HIST)));
      } catch (retryErr) {
        console.error('[DeepGuard] LocalStorage save failed after stripping images:', retryErr);
      }
    } else {
      console.warn('[DeepGuard] localStorage save failed:', e);
    }
  }
}

/* ═══════════════════════════════════════════════════════════
   SIDEBAR
═══════════════════════════════════════════════════════════ */
function initSidebarMode() {
  if (window.innerWidth <= 900) {
    sidebar && sidebar.classList.remove('mobile-open');
    sbOverlay && sbOverlay.classList.add('hidden');
  } else {
    if (sidebarCollapsed) {
      sidebar && sidebar.classList.add('collapsed');
      mainContent && mainContent.classList.add('sidebar-collapsed');
    } else {
      sidebar && sidebar.classList.remove('collapsed');
      mainContent && mainContent.classList.remove('sidebar-collapsed');
    }
  }
}

function openSidebarMobile() {
  sidebar && sidebar.classList.add('mobile-open');
  sbOverlay && sbOverlay.classList.remove('hidden');
}

function closeSidebarMobile() {
  sidebar && sidebar.classList.remove('mobile-open');
  sbOverlay && sbOverlay.classList.add('hidden');
}

function toggleSidebarCollapse() {
  sidebarCollapsed = !sidebarCollapsed;
  sidebar && sidebar.classList.toggle('collapsed', sidebarCollapsed);
  mainContent && mainContent.classList.toggle('sidebar-collapsed', sidebarCollapsed);
}

if (hamburger) {
  hamburger.addEventListener('click', () => {
    if (window.innerWidth <= 900) {
      sidebar && sidebar.classList.contains('mobile-open') ? closeSidebarMobile() : openSidebarMobile();
    } else {
      toggleSidebarCollapse();
    }
  });
}

if (collapseBtn) {
  collapseBtn.addEventListener('click', toggleSidebarCollapse);
}

if (sbOverlay) sbOverlay.addEventListener('click', closeSidebarMobile);

window.addEventListener('resize', () => {
  if (currentUser) initSidebarMode();
});

/* ═══════════════════════════════════════════════════════════
   DASHBOARD STATS
═══════════════════════════════════════════════════════════ */
function animateCounter(el, target, duration = 600) {
  if (!el) return;
  const start = parseInt(el.textContent) || 0;
  if (start === target) return;
  const step = (target - start) / (duration / 16);
  let current = start;
  const timer = setInterval(() => {
    current += step;
    if ((step > 0 && current >= target) || (step < 0 && current <= target)) {
      el.textContent = target;
      clearInterval(timer);
    } else {
      el.textContent = Math.round(current);
    }
  }, 16);
}

function renderDashboardStats() {
  const total    = history_data.length;
  const realCnt  = history_data.filter(e => e.prediction === 'Real').length;
  const fakeCnt  = history_data.filter(e => e.prediction === 'Fake').length;
  const avgConf  = total > 0
    ? Math.round(history_data.reduce((s, e) => s + e.confidence, 0) / total)
    : null;

  animateCounter(statTotal, total);
  animateCounter(statReal,  realCnt);
  animateCounter(statFake,  fakeCnt);
  if (statAvgConf) statAvgConf.textContent = avgConf !== null ? avgConf + '%' : '—';
}

function renderRecentStrip() {
  if (!recentStrip) return;
  const recent = history_data.slice(0, 5);
  if (recent.length === 0) {
    recentCard && (recentCard.style.display = 'none');
    return;
  }
  recentCard && (recentCard.style.display = '');
  recentStrip.innerHTML = '';
  recent.forEach(entry => {
    if (!entry.dataURL) return;
    const cls = clsFor(entry.prediction);
    const img = document.createElement('img');
    img.src = entry.dataURL;
    img.alt = entry.filename;
    img.className = `recent-thumb ${cls}`;
    img.loading = 'lazy';
    img.title = `${entry.prediction} · ${entry.confidence}%`;
    recentStrip.appendChild(img);
  });
}

/* ═══════════════════════════════════════════════════════════
   HEALTH CHECK
═══════════════════════════════════════════════════════════ */
async function pingHealth() {
  try {
    const res = await fetch(HEALTH_URL, { signal: AbortSignal.timeout(4000) });
    if (res.ok) {
      if (healthDotApi) { healthDotApi.className = 'health-dot online'; }
      if (healthApiText) healthApiText.textContent = 'Online';
      if (aiStatusPill) { aiStatusPill.classList.remove('offline'); }
      if (aiStatusLabel) aiStatusLabel.textContent = 'AI Online';
    } else { throw new Error(); }
  } catch {
    if (healthDotApi)  { healthDotApi.className = 'health-dot offline'; }
    if (healthApiText) healthApiText.textContent = 'Offline — Start FastAPI';
    if (aiStatusPill)  aiStatusPill.classList.add('offline');
    if (aiStatusLabel) aiStatusLabel.textContent = 'API Offline';
  }
}

/* ═══════════════════════════════════════════════════════════
   FILE UPLOAD
═══════════════════════════════════════════════════════════ */
function loadFile(file) {
  const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];
  if (!ALLOWED.includes(file.type)) {
    showToast('Please upload JPEG, PNG, or WebP.', 'error');
    return;
  }
  if (file.size > 20 * 1024 * 1024) {
    showToast('File too large. Max 20MB.', 'error');
    return;
  }
  currentFile = file;
  const reader = new FileReader();
  reader.onload = (ev) => {
    currentDataURL  = ev.target.result;
    originalDataURL = ev.target.result;

    if (cropper) { cropper.destroy(); cropper = null; }
    previewImg.src = currentDataURL;
    dropZone.classList.add('hidden');
    previewWrap.classList.remove('hidden');

    if (fileInfo) fileInfo.textContent = `${file.name} · ${(file.size / 1024).toFixed(1)} KB`;
    if (detectBtn) detectBtn.disabled = false;

    if (typeof Cropper !== 'undefined') {
      cropper = new Cropper(previewImg, {
        aspectRatio: 1,
        viewMode: 1,
        autoCropArea: 0.8,
        movable: true,
        zoomable: true,
        scalable: false,
        cropBoxResizable: true
      });
    }
  };
  reader.readAsDataURL(file);
}

function clearUpload() {
  currentFile = null;
  currentDataURL = null;
  originalDataURL = null;
  if (cropper) { cropper.destroy(); cropper = null; }
  if (previewImg)  previewImg.src = '';
  if (previewWrap) previewWrap.classList.add('hidden');
  if (dropZone)    dropZone.classList.remove('hidden');
  if (fileInfo)    fileInfo.textContent = '';
  if (detectBtn)   detectBtn.disabled = true;
  if (faceBox)     faceBox.style.display = 'none';
  if (scanLine)    scanLine.classList.add('hidden');
  resetResult();
}

function resetResult() {
  if (resultPh)   resultPh.classList.remove('hidden');
  if (resultBody) resultBody.classList.add('hidden');
  if (confBar)    { confBar.style.transition = 'none'; confBar.style.width = '0%'; }
  lockAssistant();
}

// Drag & drop
if (dropZone) {
  dropZone.addEventListener('dragover',  (e) => { e.preventDefault(); dropZone.classList.add('dz-active'); });
  dropZone.addEventListener('dragleave', ()  => dropZone.classList.remove('dz-active'));
  dropZone.addEventListener('dragend',   ()  => dropZone.classList.remove('dz-active'));
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dz-active');
    const f = e.dataTransfer?.files?.[0];
    if (f) loadFile(f);
  });
  dropZone.addEventListener('click', (e) => {
    if (e.target === fileInput) return;
    fileInput && fileInput.click();
  });
  dropZone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput && fileInput.click(); }
  });
}

if (fileInput) {
  fileInput.addEventListener('click',  (e) => e.stopPropagation());
  fileInput.addEventListener('change', ()  => { if (fileInput.files[0]) loadFile(fileInput.files[0]); });
}

if (clearImgBtn) clearImgBtn.addEventListener('click', clearUpload);

/* ═══════════════════════════════════════════════════════════
   DETECTION
═══════════════════════════════════════════════════════════ */
if (detectBtn) detectBtn.addEventListener('click', runDetection);

async function runDetection() {
  if (!currentFile) { showToast('Please upload an image first.', 'info'); return; }

  // UI loading state
  detectBtn.disabled = true;
  detectBtn.classList.add('loading');
  const detectText    = detectBtn.querySelector('.detect-text');
  const detectSpinner = detectBtn.querySelector('.detect-spinner');
  if (detectText)    detectText.classList.add('hidden');
  if (detectSpinner) detectSpinner.classList.remove('hidden');

  // Show scan animation
  if (faceBox)  faceBox.style.display = 'block';
  if (scanLine) scanLine.classList.remove('hidden');

  try {
    const confThreshold = parseFloat(localStorage.getItem(CONF_THRESHOLD_KEY) || '0.5');
    const formData = new FormData();

    if (cropper) {
      const blob = await new Promise((res) =>
        cropper.getCroppedCanvas({ maxWidth: 1024, maxHeight: 1024 })
               .toBlob((b) => res(b), currentFile.type || 'image/jpeg', 0.95)
      );
      formData.append('file', blob, currentFile.name);
      currentDataURL = cropper.getCroppedCanvas({ width: 224, height: 224 })
                               .toDataURL(currentFile.type || 'image/jpeg');
    } else {
      formData.append('file', currentFile);
    }

    const res = await fetch(API_URL, { method: 'POST', body: formData });
    if (!res.ok) {
      let msg = `Server error (${res.status})`;
      try { const j = await res.json(); msg = j.detail || msg; } catch (e2) {}
      throw new Error(msg);
    }

    const data = await res.json();
    if (data.error) throw new Error(data.error);

    // Apply threshold — mark as Uncertain if confidence too low
    const pct = Math.round((data.confidence || 0) * 100);
    const confThresholdPct = confThreshold * 100;
    if (pct < confThresholdPct && data.prediction !== 'Uncertain') {
      data.prediction = 'Uncertain';
    }

    showResult(data);
    addToHistory(data);

  } catch (err) {
    const isFetch = err.name === 'TypeError' && err.message.includes('fetch');
    showToast(
      isFetch
        ? `Cannot reach API — start FastAPI at ${API_BASE}`
        : err.message,
      'error', 5500
    );
    console.error('[DeepGuard]', err);
  } finally {
    detectBtn.classList.remove('loading');
    detectBtn.disabled = false;
    if (detectText)    detectText.classList.remove('hidden');
    if (detectSpinner) detectSpinner.classList.add('hidden');
    if (faceBox)   faceBox.style.display = 'none';
    if (scanLine)  scanLine.classList.add('hidden');
  }
}

/* ═══════════════════════════════════════════════════════════
   SHOW RESULT
═══════════════════════════════════════════════════════════ */
function showResult(data) {
  const prediction = data.prediction;
  const confidence = data.confidence;
  const model_used = data.model_used;
  const reason     = data.reason;
  const cls = clsFor(prediction);
  const pct = Math.round((confidence || 0) * 100);

  const icons = { Real: '✅', Fake: '🚨', Uncertain: '⚠️' };

  if (resultBadge) {
    resultBadge.className = `result-badge ${cls}`;
    resultBadge.innerHTML = `${icons[prediction] || ''} ${prediction}`;
  }

  if (resultLabel) {
    resultLabel.className = `result-label ${cls}`;
    resultLabel.textContent = prediction;
  }

  if (resultDesc) {
    const descs = {
      Real: 'This image appears to be an authentic, unmanipulated photograph.',
      Fake: 'This image shows signs of AI-generation or digital manipulation.',
      Uncertain: 'The model could not make a high-confidence classification.'
    };
    resultDesc.textContent = descs[prediction] || '';
  }

  // Reason block
  if (reasonBlock && reasonText) {
    if (reason) {
      reasonBlock.classList.remove('hidden');
      reasonBlock.className = `reason-block ${cls}`;
      reasonText.textContent = reason;

      if (indicatorsList && indicatorsSection) {
        const indList = data.indicators || [];
        if (indList.length > 0) {
          indicatorsSection.style.display = '';
          indicatorsList.innerHTML = '';
          indList.forEach((ind) => {
            const li = document.createElement('li');
            li.textContent = ind;
            indicatorsList.appendChild(li);
          });
        } else {
          indicatorsSection.style.display = 'none';
        }
      }
    } else {
      reasonBlock.classList.add('hidden');
    }
  }

  // Confidence bar
  if (confPct) {
    confPct.textContent = pct + '%';
    const colors = { Real: 'var(--green)', Fake: 'var(--red)', Uncertain: 'var(--gold)' };
    confPct.style.color = colors[prediction] || 'var(--text-primary)';
  }

  if (confBar) {
    confBar.className = `conf-bar ${cls}`;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      confBar.style.transition = 'width 1s cubic-bezier(.4,0,.2,1)';
      confBar.style.width = pct + '%';
    }));
  }

  // Meta
  if (metaModel) metaModel.textContent = model_used || 'ViT';
  if (metaDec)   metaDec.textContent   = prediction;
  if (metaTime)  metaTime.textContent  = new Date().toLocaleTimeString();

  // Show result
  if (resultPh)   resultPh.classList.add('hidden');
  if (resultBody) {
    resultBody.classList.remove('hidden');
    resultBody.style.animation = 'fade-in 0.4s ease';
  }

  showToast(`${prediction} · ${pct}% confidence`, prediction === 'Fake' ? 'error' : prediction === 'Real' ? 'success' : 'warning');
  unlockAssistant();
}

/* ═══════════════════════════════════════════════════════════
   HISTORY
═══════════════════════════════════════════════════════════ */
function addToHistory(data) {
  const entry = {
    filename:   currentFile.name,
    dataURL:    currentDataURL,
    prediction: data.prediction,
    confidence: Math.round((data.confidence || 0) * 100),
    model:      data.model_used || 'ViT',
    reason:     data.reason || '',
    indicators: data.indicators || [],
    timestamp:  new Date().toLocaleString(),
    vit_prediction: data.vit_prediction || null,
    vit_confidence: data.vit_confidence ? Math.round(data.vit_confidence * 100) : null
  };
  history_data.unshift(entry);
  if (currentUser) saveHistory(currentUser, history_data);
  renderDashboardStats();
  renderRecentStrip();
}

if (againBtn) againBtn.addEventListener('click', clearUpload);

/* ═══════════════════════════════════════════════════════════
   UTILS
═══════════════════════════════════════════════════════════ */
function clsFor(prediction) {
  if (prediction === 'Real')      return 'real';
  if (prediction === 'Uncertain') return 'uncertain';
  return 'fake';
}

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ═══════════════════════════════════════════════════════════
   IMAGE MODAL
═══════════════════════════════════════════════════════════ */
function initImageModal() {
  const container = $('preview-img-container');
  const modal     = $('image-modal');
  const modalImg  = $('modal-img');
  const modalClose= $('modal-close');
  if (!container || !modal || !modalImg) return;

  let startX = 0, startY = 0;
  container.addEventListener('mousedown', (e) => { startX = e.screenX; startY = e.screenY; });
  container.addEventListener('mouseup',   (e) => {
    if (Math.abs(e.screenX - startX) < 6 && Math.abs(e.screenY - startY) < 6 && originalDataURL) {
      modalImg.src = originalDataURL;
      modal.classList.remove('hidden');
    }
  });
  const closeModal = () => { modal.classList.add('hidden'); modalImg.src = ''; };
  if (modalClose) modalClose.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal || e.target === modalClose) closeModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
}

/* ═══════════════════════════════════════════════════════════
   AI ASSISTANT (embedded in dashboard)
═══════════════════════════════════════════════════════════ */
let faqDatabase = {
  'what is deepfake': 'A deepfake is AI-generated or manipulated media that alters a person\'s appearance, voice, or actions using deep learning — typically Generative Adversarial Networks (GANs) or diffusion models.',
  'what is deepguard': 'DeepGuard is an AI-powered deepfake detection platform using a Vision Transformer (ViT) model to classify facial images as Real, Fake, or Uncertain with explainable confidence scores.',
  'what dataset was used': 'The model was trained on the Celeb-DF v2 dataset — a high-quality benchmark containing thousands of real and manipulated celebrity face videos.',
  'what is celeb-df': 'Celeb-DF v2 is a large-scale deepfake benchmark dataset containing high-quality manipulated videos of celebrities, widely used for deepfake detection research.',
  'why use celeb-df': 'Celeb-DF contains photorealistic deepfakes that challenge detection models, making it ideal for training robust classifiers.',
  'what is mtcnn': 'MTCNN (Multi-task Cascaded Convolutional Networks) is a face detection algorithm that locates and crops faces from images before feeding them to the ViT model.',
  'why face extraction': 'Extracting faces removes irrelevant background noise and allows the model to focus on subtle facial manipulation artifacts.',
  'what is preprocessing': 'Preprocessing includes face detection via MTCNN, cropping, resizing to 224×224 pixels, and normalization before model inference.',
  'what image size is used': 'Images are resized to 224×224 pixels — the standard input size for Vision Transformer models.',
  'what is cnn': 'CNN (Convolutional Neural Network) extracts local visual patterns like edges and textures. Unlike ViT, CNNs process images in localized patches rather than globally.',
  'what is vision transformer': 'Vision Transformer (ViT) adapts the transformer architecture (originally for NLP) to image recognition by splitting images into patches and processing them with self-attention mechanisms.',
  'why use vit': 'ViT captures long-range dependencies across the entire image — crucial for detecting subtle deepfake artifacts that span multiple face regions.',
  'what is patch embedding': 'Patch embedding splits an image into fixed-size patches (e.g., 16×16 pixels) and projects each patch into a high-dimensional vector for transformer processing.',
  'what is positional embedding': 'Positional embedding adds location information to each patch so the transformer understands spatial relationships between image regions.',
  'what is transformer encoder': 'The transformer encoder processes patch embeddings using multi-head self-attention and feed-forward layers to learn complex visual relationships.',
  'what is self attention': 'Self-attention allows the model to weigh the importance of each image patch relative to all others, enabling detection of global manipulation patterns.',
  'what is multi head attention': 'Multi-head attention runs multiple attention operations in parallel, allowing the model to capture different types of relationships simultaneously.',
  'what is ffn': 'FFN (Feed Forward Network) applies non-linear transformations to attention outputs, increasing the model\'s representational capacity.',
  'what is mlp head': 'The MLP head is the final classification layer that maps the transformer\'s [CLS] token representation to class probabilities (Real vs. Fake).',
  'how does the model detect deepfakes': 'The model learns visual artifacts unique to deepfakes — unnatural blending, inconsistent lighting, texture anomalies — and classifies images based on these learned patterns.',
  'what does confidence score mean': 'The confidence score (0–100%) indicates how certain the model is about its prediction. Higher scores mean more definitive classifications.',
  'what is an uncertain prediction': 'An uncertain prediction occurs when confidence falls below the configured threshold, meaning the model lacks sufficient evidence for a definitive Real or Fake decision.',
  'what is accuracy': 'Accuracy measures the percentage of correct predictions. High accuracy on Celeb-DF indicates the model successfully learned deepfake detection features.',
  'what is precision': 'Precision measures what fraction of images classified as fake are actually fake — minimizing false alarms.',
  'what is recall': 'Recall measures what fraction of actual fake images are correctly identified — crucial for security applications.',
  'what is f1 score': 'F1 Score is the harmonic mean of precision and recall, providing a balanced metric for imbalanced deepfake datasets.',
  'what are the limitations': 'The model may struggle with very high-quality deepfakes, images from unseen datasets, low-resolution images, or heavy compression artifacts.',
  'what is future scope': 'Future improvements include multi-dataset training, video-level temporal analysis, real-time browser deployment, and adversarial robustness.',
  'can the system detect videos': 'Currently, DeepGuard analyzes individual frames. Video detection would require temporal consistency analysis across multiple frames.',
  'what technologies were used': 'DeepGuard uses Python, MTCNN, TensorFlow/Keras, Vision Transformers, FastAPI for the backend, and HTML/CSS/JavaScript with Chart.js for the frontend.'
};

async function loadFaqData() {
  try {
    const res = await fetch('faq.json');
    if (res.ok) {
      const fetched = await res.json();
      faqDatabase = Object.assign({}, faqDatabase, fetched);
    }
  } catch (e) {
    console.warn('[DeepGuard] faq.json not loaded via fetch, using embedded DB.');
  }
}

function findFaqAnswer(query) {
  if (!query) return null;
  const clean = query.toLowerCase().trim().replace(/[?.,!]/g, '');

  // Exact key match
  if (faqDatabase[clean]) return faqDatabase[clean];

  // Keyword fallback map
  const keyMap = {
    'vit': 'what is vision transformer',
    'vision transformer': 'what is vision transformer',
    'celeb-df': 'what is celeb-df',
    'celebdf': 'what is celeb-df',
    'dataset': 'what dataset was used',
    'mtcnn': 'what is mtcnn',
    'face extraction': 'why face extraction',
    'preprocessing': 'what is preprocessing',
    'cnn': 'what is cnn',
    'confidence': 'what does confidence score mean',
    'confidence score': 'what does confidence score mean',
    'uncertain': 'what is an uncertain prediction',
    'future': 'what is future scope',
    'video': 'can the system detect videos',
    'technologies': 'what technologies were used',
    'mlp head': 'what is mlp head',
    'self attention': 'what is self attention',
    'attention': 'what is self attention',
    'accuracy': 'what is accuracy',
    'precision': 'what is precision',
    'recall': 'what is recall',
    'f1': 'what is f1 score',
    'limitations': 'what are the limitations',
    'deepfake': 'what is deepfake',
    'deepguard': 'what is deepguard',
    'patch': 'what is patch embedding',
    'positional': 'what is positional embedding',
    'encoder': 'what is transformer encoder',
    'ffn': 'what is ffn',
    'feed forward': 'what is ffn',
  };

  for (const kw in keyMap) {
    if (clean.includes(kw)) {
      const key = keyMap[kw];
      if (faqDatabase[key]) return faqDatabase[key];
    }
  }

  // Tokenized overlap scoring
  const stopwords = new Set(['what','is','why','does','the','a','an','of','for','to','about','in','on','with','how','can','are','was','were','do','did','tell','me','use','used','using','work','works','best']);
  const getKws = (str) => str.split(/\s+/).map(w => w.replace(/[^a-z0-9-]/g,'')).filter(w => w && !stopwords.has(w));
  const queryKws = getKws(clean);
  if (!queryKws.length) return null;

  let bestKey = null, highScore = 0;
  for (const key in faqDatabase) {
    const keyKws = getKws(key.toLowerCase());
    let score = 0;
    queryKws.forEach(qw => {
      keyKws.forEach(kw => {
        if (kw === qw) score += 15;
        else if (kw.includes(qw) || qw.includes(kw)) score += 8;
      });
    });
    if (score > highScore) { highScore = score; bestKey = key; }
  }

  return highScore >= 8 ? faqDatabase[bestKey] : null;
}

// Typing animation for assistant
function typeMessage(el, text, speed = 18) {
  return new Promise((resolve) => {
    let i = 0;
    el.textContent = '';
    const timer = setInterval(() => {
      el.textContent += text[i];
      i++;
      if (i >= text.length) { clearInterval(timer); resolve(); }
    }, speed);
  });
}

function appendUserMessage(text) {
  const hist = $('assistant-chat-history');
  if (!hist) return;
  const div = document.createElement('div');
  div.className = 'chat-msg user';
  div.textContent = text;
  hist.appendChild(div);
  hist.scrollTop = hist.scrollHeight;
}

async function appendAssistantMessage(text) {
  const hist = $('assistant-chat-history');
  if (!hist) return;

  // Typing indicator
  const typingDiv = document.createElement('div');
  typingDiv.className = 'chat-msg assistant';
  typingDiv.innerHTML = '<span style="opacity:0.5">●●●</span>';
  hist.appendChild(typingDiv);
  hist.scrollTop = hist.scrollHeight;

  await new Promise(r => setTimeout(r, 400 + Math.random() * 300));

  await typeMessage(typingDiv, text, 12);
  hist.scrollTop = hist.scrollHeight;
}

function handleAssistantSubmit() {
  const input = $('assistant-input');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  appendUserMessage(text);
  input.value = '';
  setTimeout(() => {
    const answer = findFaqAnswer(text);
    appendAssistantMessage(answer || "I don't have a specific answer for that. Try asking about Vision Transformer, MTCNN, Celeb-DF, confidence scores, or deepfake detection methods.");
  }, 150);
}

function lockAssistant() {
  const panel       = $('assistant-panel');
  const lockedView  = $('assistant-locked-view');
  const enabledView = $('assistant-enabled-view');
  const input       = $('assistant-input');
  const btn         = $('assistant-send-btn');
  if (lockedView)  lockedView.classList.remove('hidden');
  if (enabledView) enabledView.classList.add('hidden');
  if (input)       { input.disabled = true; input.value = ''; }
  if (btn)         btn.disabled = true;
  const hist = $('assistant-chat-history');
  if (hist) hist.innerHTML = '';
}

function unlockAssistant() {
  const lockedView  = $('assistant-locked-view');
  const enabledView = $('assistant-enabled-view');
  const input       = $('assistant-input');
  const btn         = $('assistant-send-btn');
  if (lockedView)  lockedView.classList.add('hidden');
  if (enabledView) enabledView.classList.remove('hidden');
  if (input)       input.disabled = false;
  if (btn)         btn.disabled = false;
  const hist = $('assistant-chat-history');
  if (hist && hist.children.length === 0) {
    appendAssistantMessage("Hello! I'm the DeepGuard AI Assistant. Ask me anything about deepfake detection, Vision Transformers, MTCNN, or the Celeb-DF dataset. 🤖");
  }
}

function initAssistant() {
  loadFaqData();
  const sendBtn = $('assistant-send-btn');
  const input   = $('assistant-input');
  if (sendBtn) sendBtn.addEventListener('click', handleAssistantSubmit);
  if (input)   input.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleAssistantSubmit(); });

  const panel = $('assistant-panel');
  if (panel) {
    panel.addEventListener('click', (e) => {
      if (e.target?.classList.contains('chip')) {
        const q = e.target.getAttribute('data-question');
        const inp = $('assistant-input');
        if (q && inp && !inp.disabled) { inp.value = q; handleAssistantSubmit(); }
      }
    });
  }
}

/* ═══════════════════════════════════════════════════════════
   INIT
═══════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  loadTheme();
  initParticles();
  initImageModal();
  initAssistant();
  restoreSession();
});

console.log('[DeepGuard v2.0] Ready. API:', API_URL);

/* ═══════════════════════════════════════════════════════════
   EXPORTS (for use by other pages)
═══════════════════════════════════════════════════════════ */
window.DG = {
  clsFor,
  escHtml,
  showToast,
  loadHistory,
  saveHistory,
  STORAGE_KEY,
  USER_KEY,
  THEME_KEY,
  findFaqAnswer,
  appendAssistantMessage,
  appendUserMessage,
  handleAssistantSubmit,
  loadFaqData
};
