/**
 * analytics.js — DeepGuard v2.0
 * Analytics page: Chart.js charts, animated counters, stats from LocalStorage
 */

/* ── Shared page init ──────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  // Theme
  const savedTheme = localStorage.getItem('dg_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  const themeBtn = document.getElementById('theme-toggle-btn');
  if (themeBtn) {
    const icons = { dark: 'fa-moon', light: 'fa-sun', amoled: 'fa-circle', cyberpunk: 'fa-bolt' };
    themeBtn.innerHTML = `<i class="fa-solid ${icons[savedTheme] || 'fa-moon'}"></i>`;
    themeBtn.addEventListener('click', () => {
      const themes = ['dark', 'light', 'amoled', 'cyberpunk'];
      const cur = document.documentElement.getAttribute('data-theme') || 'dark';
      const nxt = themes[(themes.indexOf(cur) + 1) % themes.length];
      document.documentElement.setAttribute('data-theme', nxt);
      localStorage.setItem('dg_theme', nxt);
      themeBtn.innerHTML = `<i class="fa-solid ${icons[nxt]}"></i>`;
    });
  }

  // Session guard
  const userName = sessionStorage.getItem('dg_current_user');
  if (!userName) { window.location.href = 'index.html'; return; }
  const avatarEl = document.getElementById('user-avatar');
  const nameEl   = document.getElementById('user-name-label');
  if (avatarEl) avatarEl.textContent = userName.charAt(0).toUpperCase();
  if (nameEl)   nameEl.textContent   = userName;

  // Logout
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) logoutBtn.addEventListener('click', () => {
    sessionStorage.removeItem('dg_current_user');
    window.location.href = 'index.html';
  });

  // Sidebar
  initSidebar();
  initParticles();

  // Load data & render
  const key     = 'dg_hist_' + userName.trim().toLowerCase().replace(/\s+/g, '_');
  let histData  = [];
  try { histData = JSON.parse(localStorage.getItem(key) || '[]'); } catch(e) {}

  renderStats(histData);
  renderDonut(histData);
  renderLineChart(histData);
  renderBarChart(histData);
  renderActivityTable(histData);

  document.getElementById('refresh-btn')?.addEventListener('click', () => {
    try { histData = JSON.parse(localStorage.getItem(key) || '[]'); } catch(e) {}
    renderStats(histData);
    renderActivityTable(histData);
    showPageToast('Analytics refreshed ✓', 'info');
  });

  document.getElementById('export-csv-btn')?.addEventListener('click', () => exportCSV(histData, userName));
});

/* ── Stats ──────────────────────────────────────────────────── */
function renderStats(data) {
  const total     = data.length;
  const realCnt   = data.filter(e => e.prediction === 'Real').length;
  const fakeCnt   = data.filter(e => e.prediction === 'Fake').length;
  const uncertCnt = data.filter(e => e.prediction === 'Uncertain').length;
  const avgConf   = total > 0 ? Math.round(data.reduce((s, e) => s + e.confidence, 0) / total) : null;

  // Today's scans
  const today = new Date().toLocaleDateString();
  const todayCnt = data.filter(e => {
    try { return new Date(e.timestamp).toLocaleDateString() === today; } catch { return false; }
  }).length;

  animateCounter('s-total',     total);
  animateCounter('s-real',      realCnt);
  animateCounter('s-fake',      fakeCnt);
  animateCounter('s-uncertain', uncertCnt);
  animateCounter('s-today',     todayCnt);

  const avgEl = document.getElementById('s-avg');
  if (avgEl) avgEl.textContent = avgConf !== null ? avgConf + '%' : '—';
}

function animateCounter(id, target, duration = 700) {
  const el = document.getElementById(id);
  if (!el) return;
  const start = 0;
  const step  = target / (duration / 16);
  let current = start;
  const timer = setInterval(() => {
    current += step;
    if (current >= target) { el.textContent = target; clearInterval(timer); }
    else el.textContent = Math.round(current);
  }, 16);
}

/* ── Donut Chart ────────────────────────────────────────────── */
let donutChart = null;
function renderDonut(data) {
  const real     = data.filter(e => e.prediction === 'Real').length;
  const fake     = data.filter(e => e.prediction === 'Fake').length;
  const uncertain= data.filter(e => e.prediction === 'Uncertain').length;
  const total    = data.length;

  const totalEl = document.getElementById('donut-total');
  if (totalEl) totalEl.textContent = total;

  const canvas = document.getElementById('chart-donut');
  if (!canvas) return;

  const colors  = ['#10b981', '#ef4444', '#f59e0b'];
  const labels  = ['Real', 'Fake', 'Uncertain'];
  const counts  = [real, fake, uncertain];

  if (donutChart) donutChart.destroy();
  donutChart = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: total === 0 ? [1, 0, 0] : counts,
        backgroundColor: total === 0
          ? ['rgba(255,255,255,0.07)']
          : colors.map(c => c + 'cc'),
        borderColor: total === 0
          ? ['rgba(255,255,255,0.1)']
          : colors,
        borderWidth: 2,
        hoverBorderWidth: 3,
        hoverOffset: 6
      }]
    },
    options: {
      cutout: '68%',
      responsive: true,
      maintainAspectRatio: true,
      plugins: { legend: { display: false }, tooltip: {
        callbacks: {
          label: (ctx) => ` ${ctx.label}: ${ctx.raw} (${total > 0 ? Math.round(ctx.raw/total*100) : 0}%)`
        }
      }},
      animation: { animateRotate: true, duration: 800 }
    }
  });

  // Custom legend
  const legendEl = document.getElementById('donut-legend');
  if (legendEl) {
    legendEl.innerHTML = '';
    labels.forEach((lbl, i) => {
      const pct = total > 0 ? Math.round(counts[i] / total * 100) : 0;
      legendEl.innerHTML += `
        <div class="legend-item">
          <div class="legend-dot-label">
            <span class="legend-dot" style="background:${colors[i]}"></span>
            <span>${lbl}</span>
          </div>
          <span class="legend-count">${counts[i]} <span class="text-muted" style="font-weight:400;">(${pct}%)</span></span>
        </div>`;
    });
  }
}

/* ── Line Chart (weekly trend) ──────────────────────────────── */
let lineChart = null;
function renderLineChart(data) {
  const canvas = document.getElementById('chart-line');
  if (!canvas) return;

  // Build last 7 days buckets
  const days = [];
  const counts = { Real: [], Fake: [], Uncertain: [] };
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const dateStr = d.toLocaleDateString();
    days.push(label);
    ['Real', 'Fake', 'Uncertain'].forEach(pred => {
      counts[pred].push(data.filter(e => {
        try { return new Date(e.timestamp).toLocaleDateString() === dateStr && e.prediction === pred; }
        catch { return false; }
      }).length);
    });
  }

  if (lineChart) lineChart.destroy();
  lineChart = new Chart(canvas, {
    type: 'line',
    data: {
      labels: days,
      datasets: [
        {
          label: 'Real',
          data: counts.Real,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16,185,129,0.08)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#10b981',
          pointRadius: 4,
          pointHoverRadius: 6,
          borderWidth: 2
        },
        {
          label: 'Fake',
          data: counts.Fake,
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239,68,68,0.08)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#ef4444',
          pointRadius: 4,
          pointHoverRadius: 6,
          borderWidth: 2
        },
        {
          label: 'Uncertain',
          data: counts.Uncertain,
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245,158,11,0.08)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#f59e0b',
          pointRadius: 4,
          pointHoverRadius: 6,
          borderWidth: 2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            color: 'rgba(240,238,255,0.7)',
            font: { family: 'Inter', size: 11 },
            usePointStyle: true,
            pointStyleWidth: 8,
            boxHeight: 8
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255,255,255,0.04)' },
          ticks: { color: 'rgba(160,156,192,0.8)', font: { size: 10 } }
        },
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(255,255,255,0.04)' },
          ticks: { color: 'rgba(160,156,192,0.8)', font: { size: 10 }, stepSize: 1 }
        }
      },
      animation: { duration: 800 }
    }
  });
}

/* ── Bar Chart (confidence buckets) ────────────────────────── */
let barChart = null;
function renderBarChart(data) {
  const canvas = document.getElementById('chart-bar');
  if (!canvas) return;

  const buckets = ['0–20%', '21–40%', '41–60%', '61–80%', '81–100%'];
  const counts  = [0, 0, 0, 0, 0];
  data.forEach(e => {
    const c = e.confidence;
    if (c <= 20)       counts[0]++;
    else if (c <= 40)  counts[1]++;
    else if (c <= 60)  counts[2]++;
    else if (c <= 80)  counts[3]++;
    else               counts[4]++;
  });

  if (barChart) barChart.destroy();
  barChart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: buckets,
      datasets: [{
        label: 'Scans',
        data: counts,
        backgroundColor: [
          'rgba(239,68,68,0.6)',
          'rgba(245,158,11,0.6)',
          'rgba(6,182,212,0.6)',
          'rgba(79,70,229,0.6)',
          'rgba(16,185,129,0.6)'
        ],
        borderColor: [
          '#ef4444', '#f59e0b', '#06b6d4', '#4f46e5', '#10b981'
        ],
        borderWidth: 1.5,
        borderRadius: 6,
        hoverBackgroundColor: [
          'rgba(239,68,68,0.85)',
          'rgba(245,158,11,0.85)',
          'rgba(6,182,212,0.85)',
          'rgba(79,70,229,0.85)',
          'rgba(16,185,129,0.85)'
        ]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          grid: { color: 'rgba(255,255,255,0.04)' },
          ticks: { color: 'rgba(160,156,192,0.8)', font: { size: 10 } }
        },
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(255,255,255,0.04)' },
          ticks: { color: 'rgba(160,156,192,0.8)', font: { size: 10 }, stepSize: 1 }
        }
      },
      animation: { duration: 800 }
    }
  });
}

/* ── Activity Table ─────────────────────────────────────────── */
function renderActivityTable(data) {
  const tbody   = document.getElementById('activity-tbody');
  const emptyEl = document.getElementById('activity-empty');
  if (!tbody) return;

  tbody.innerHTML = '';
  const recent = data.slice(0, 10);

  if (recent.length === 0) {
    if (emptyEl) emptyEl.classList.remove('hidden');
    return;
  }
  if (emptyEl) emptyEl.classList.add('hidden');

  recent.forEach((e, i) => {
    const cls = e.prediction === 'Real' ? 'real' : e.prediction === 'Fake' ? 'fake' : 'uncertain';
    const imgHtml = e.dataURL
      ? `<img src="${e.dataURL}" class="act-thumb" alt="${e.filename}" loading="lazy" />`
      : '<span style="color:var(--text-dim);font-size:0.75rem;">—</span>';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="color:var(--text-dim);">${i + 1}</td>
      <td>${imgHtml}</td>
      <td><span class="act-badge ${cls}">${e.prediction}</span></td>
      <td>
        <div class="act-conf-bar">
          <div class="act-conf-track"><div class="act-conf-fill ${cls}" style="width:${e.confidence}%"></div></div>
          <span style="color:var(--text-primary);font-weight:600;">${e.confidence}%</span>
        </div>
      </td>
      <td><span style="color:var(--text-muted);">${e.model || 'ViT'}</span></td>
      <td style="color:var(--text-muted);font-size:0.75rem;">${e.timestamp || '—'}</td>
    `;
    tbody.appendChild(tr);
  });
}

/* ── CSV Export ─────────────────────────────────────────────── */
function exportCSV(data, userName) {
  if (data.length === 0) { showPageToast('No data to export.', 'warning'); return; }
  const headers = ['#', 'Filename', 'Prediction', 'Confidence (%)', 'Model', 'Timestamp'];
  const rows = data.map((e, i) => [
    i + 1,
    `"${(e.filename || '').replace(/"/g, '""')}"`,
    e.prediction,
    e.confidence,
    e.model || 'ViT',
    `"${(e.timestamp || '').replace(/"/g, '""')}"`
  ].join(','));
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `deepguard_analytics_${userName}_${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showPageToast('CSV exported successfully!', 'success');
}

/* ── Sidebar & Particles (shared helpers for sub-pages) ──────── */
function initSidebar() {
  const sidebar   = document.getElementById('sidebar');
  const hamburger = document.getElementById('sidebar-toggle');
  const overlay   = document.getElementById('sb-overlay');
  const collapse  = document.getElementById('sidebar-collapse-btn');
  const main      = document.getElementById('main-content');
  let collapsed   = false;

  if (hamburger) hamburger.addEventListener('click', () => {
    if (window.innerWidth <= 900) {
      sidebar.classList.toggle('mobile-open');
      overlay && overlay.classList.toggle('hidden');
    } else {
      collapsed = !collapsed;
      sidebar && sidebar.classList.toggle('collapsed', collapsed);
      main   && main.classList.toggle('sidebar-collapsed', collapsed);
    }
  });
  if (overlay) overlay.addEventListener('click', () => {
    sidebar && sidebar.classList.remove('mobile-open');
    overlay.classList.add('hidden');
  });
  if (collapse) collapse.addEventListener('click', () => {
    collapsed = !collapsed;
    sidebar && sidebar.classList.toggle('collapsed', collapsed);
    main   && main.classList.toggle('sidebar-collapsed', collapsed);
  });
}

function initParticles() {
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
    alpha: Math.random() * 0.3 + 0.05,
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

/* ── Toast helper for sub-pages ─────────────────────────────── */
function showPageToast(msg, type = 'info', dur = 3000) {
  let toast = document.getElementById('toast');
  if (!toast) return;
  const icons = { success: '✓', error: '✕', info: '◈', warning: '⚠' };
  toast.innerHTML = `<span>${icons[type] || '◈'}</span> ${msg}`;
  toast.className = `toast show t-${type}`;
  setTimeout(() => toast.classList.remove('show'), dur);
}
