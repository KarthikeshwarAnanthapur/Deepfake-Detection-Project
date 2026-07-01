/**
 * history.js — DeepGuard v2.0
 * Detection history: grid rendering, filters, search, sort, delete, CSV export
 */

let histData   = [];
let activeFilter = 'all';
let searchQuery  = '';
let sortOrder    = 'newest';
let userName     = null;

document.addEventListener('DOMContentLoaded', () => {
  userName = dgPageBoot('history');
  if (!userName) return;

  histData = dgGetHistory(userName);
  updateSubtitle();
  renderGrid();

  // Filter buttons
  document.querySelectorAll('.hist-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.hist-filter').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.dataset.filter;
      renderGrid();
    });
  });

  // Search
  const searchEl = document.getElementById('hist-search');
  if (searchEl) {
    searchEl.addEventListener('input', () => {
      searchQuery = searchEl.value.toLowerCase().trim();
      renderGrid();
    });
  }

  // Sort
  const sortEl = document.getElementById('hist-sort-sel');
  if (sortEl) {
    sortEl.addEventListener('change', () => {
      sortOrder = sortEl.value;
      renderGrid();
    });
  }

  // Clear all
  document.getElementById('clear-all-btn')?.addEventListener('click', () => {
    if (!confirm('Clear all detection history? This cannot be undone.')) return;
    histData = [];
    dgSaveHistory(userName, []);
    updateSubtitle();
    renderGrid();
    dgToast('History cleared.', 'info');
  });

  // Export
  document.getElementById('export-btn')?.addEventListener('click', () => exportCSV());
});

/* ── Filter & Sort ──────────────────────────────────────────── */
function getFiltered() {
  let data = [...histData];

  // Filter by prediction
  if (activeFilter !== 'all') {
    data = data.filter(e => e.prediction === activeFilter);
  }

  // Search by filename
  if (searchQuery) {
    data = data.filter(e => (e.filename || '').toLowerCase().includes(searchQuery));
  }

  // Sort
  switch (sortOrder) {
    case 'oldest':    data.sort((a,b) => new Date(a.timestamp) - new Date(b.timestamp)); break;
    case 'conf-high': data.sort((a,b) => b.confidence - a.confidence); break;
    case 'conf-low':  data.sort((a,b) => a.confidence - b.confidence); break;
    default:          /* newest — already in order */ break;
  }

  return data;
}

/* ── Render Grid ────────────────────────────────────────────── */
function renderGrid() {
  const grid    = document.getElementById('hist-grid');
  const emptyEl = document.getElementById('hist-empty');
  if (!grid) return;

  const filtered = getFiltered();
  grid.innerHTML = '';

  if (filtered.length === 0) {
    emptyEl && emptyEl.classList.remove('hidden');
    return;
  }
  emptyEl && emptyEl.classList.add('hidden');

  filtered.forEach((entry, i) => {
    const cls = dgClsFor(entry.prediction);
    const card = document.createElement('div');
    card.className = `hist-card ${cls}`;
    card.style.animationDelay = Math.min(i * 0.05, 0.5) + 's';

    const imgContent = entry.dataURL
      ? `<img src="${entry.dataURL}" class="hist-card-img" alt="${dgEscHtml(entry.filename)}" loading="lazy" />`
      : `<div class="hist-card-no-img"><i class="fa-solid fa-image-portrait"></i></div>`;

    card.innerHTML = `
      <div class="hist-card-img-wrap">
        ${imgContent}
        <span class="hist-card-badge ${cls}">${entry.prediction}</span>
      </div>
      <div class="hist-card-body">
        <div class="hist-card-name" title="${dgEscHtml(entry.filename)}">${dgEscHtml(entry.filename)}</div>
        <div class="hist-card-conf-row">
          <span class="hist-card-conf-lbl">Confidence</span>
          <span class="hist-card-conf-pct">${entry.confidence}%</span>
        </div>
        <div class="hist-card-bar-track">
          <div class="hist-card-bar ${cls}" style="width:${entry.confidence}%"></div>
        </div>
        <div class="hist-card-meta">
          <span>${dgEscHtml(entry.model || 'ViT')}</span>
          <span>${dgEscHtml(entry.timestamp || '')}</span>
        </div>
      </div>
      <div class="hist-card-actions">
        <button class="hist-card-action view-btn" data-idx="${getOriginalIdx(entry)}" title="View details">
          <i class="fa-solid fa-eye"></i> View
        </button>
        <button class="hist-card-action delete delete-btn" data-idx="${getOriginalIdx(entry)}" title="Delete">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </div>`;

    grid.appendChild(card);
  });

  // Event delegation for actions
  grid.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.idx);
      deleteEntry(idx);
    });
  });
}

function getOriginalIdx(entry) {
  return histData.findIndex(e => e.timestamp === entry.timestamp && e.filename === entry.filename);
}

function deleteEntry(idx) {
  if (idx < 0 || idx >= histData.length) return;
  histData.splice(idx, 1);
  dgSaveHistory(userName, histData);
  updateSubtitle();
  renderGrid();
  dgToast('Entry deleted.', 'info');
}

function updateSubtitle() {
  const el = document.getElementById('history-subtitle');
  if (el) el.textContent = `${histData.length} scan${histData.length !== 1 ? 's' : ''} for ${userName}`;
}

/* ── CSV Export ─────────────────────────────────────────────── */
function exportCSV() {
  if (histData.length === 0) { dgToast('No history to export.', 'warning'); return; }
  const headers = ['#', 'Filename', 'Prediction', 'Confidence (%)', 'Model', 'Timestamp'];
  const rows = histData.map((e, i) => [
    i + 1,
    `"${(e.filename||'').replace(/"/g,'""')}"`,
    e.prediction,
    e.confidence,
    e.model || 'ViT',
    `"${(e.timestamp||'').replace(/"/g,'""')}"`
  ].join(','));
  const csv  = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `deepguard_history_${userName}_${Date.now()}.csv`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
  dgToast('History exported!', 'success');
}
