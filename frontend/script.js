/**
 * script.js - DeepGuard Deepfake Detection Frontend
 * Features: Login, per-user localStorage history, sidebar dashboard,
 *           drag-drop upload, Cropper.js, FastAPI detect, toast alerts.
 */

// CONFIG
const API_BASE    = "http://127.0.0.1:8000";
const API_URL     = API_BASE + "/predict";
const STORAGE_KEY = (name) => "dg_hist_" + name.trim().toLowerCase().replace(/\s+/g, "_");
const MAX_HIST    = 60;

// STATE
let currentUser    = null;
let history_data   = [];
let currentFile    = null;
let currentDataURL = null;
let originalDataURL = null;
let cropper        = null;
let sidebarOpen    = false;
let toastTimer     = null;

// DOM - Login
const loginPage  = document.getElementById("login-page");
const usernameIn = document.getElementById("username-input");
const loginBtn   = document.getElementById("login-btn");

// DOM - App
const appEl      = document.getElementById("app");
const userAvatar = document.getElementById("user-avatar");
const userLabel  = document.getElementById("user-name-label");
const logoutBtn  = document.getElementById("logout-btn");

// DOM - Sidebar
const sidebar     = document.getElementById("sidebar");
const hamburger   = document.getElementById("sidebar-toggle");
const sbOverlay   = document.getElementById("sb-overlay");
const sbUserName  = document.getElementById("sb-user-name");
const statTotal   = document.getElementById("stat-total");
const statReal    = document.getElementById("stat-real");
const statFake    = document.getElementById("stat-fake");
const dashGrid    = document.getElementById("dash-grid");
const dashEmpty   = document.getElementById("dash-empty");
const clearAllBtn = document.getElementById("clear-all-btn");

// DOM - Sidebar Tabs
const tabDashboard   = document.getElementById("tab-dashboard");
const tabHistory     = document.getElementById("tab-history");
const panelDashboard = document.getElementById("panel-dashboard");
const panelHistory   = document.getElementById("panel-history");
const sbHistList     = document.getElementById("sb-hist-list");
const sbHistEmpty    = document.getElementById("sb-hist-empty");
const sbClearHistBtn = document.getElementById("sb-clear-hist-btn");
const arrowDash      = document.getElementById("arrow-dashboard");

// DOM - Upload
const dropZone        = document.getElementById("drop-zone");
const fileInput       = document.getElementById("file-input");
const previewWrap     = document.getElementById("preview-wrap");
const previewImg      = document.getElementById("preview-img");
const clearImgBtn     = document.getElementById("clear-img-btn");
const fileInfo        = document.getElementById("file-info");
const detectBtn       = document.getElementById("detect-btn");
const detectText      = detectBtn.querySelector(".detect-text");
const detectSpinnerEl = detectBtn.querySelector(".detect-spinner");

// DOM - Result
const resultPh    = document.getElementById("result-placeholder");
const resultBody  = document.getElementById("result-body");
const resultBadge = document.getElementById("result-badge");
const resultLabel = document.getElementById("result-label");
const resultDesc  = document.getElementById("result-desc");
const confPct     = document.getElementById("conf-pct");
const confBar     = document.getElementById("conf-bar");
const reasonBlock = document.getElementById("reason-block");
const reasonText  = document.getElementById("result-reason");
const indicatorsList = document.getElementById("result-indicators");
const metaModel   = document.getElementById("meta-model");
const metaDec     = document.getElementById("meta-decision");
const againBtn    = document.getElementById("again-btn");

// DOM - History
const histList  = document.getElementById("history-list");
const histEmpty = document.getElementById("hist-empty");
const clearHist = document.getElementById("clear-hist-btn");

// DOM - Toast
const toastEl = document.getElementById("toast");

// ─── TOAST ────────────────────────────────────────────────────────────────────
function showToast(msg, type, dur) {
  type = type || "info";
  dur  = dur  || 3500;
  if (toastTimer) clearTimeout(toastTimer);
  toastEl.textContent = msg;
  toastEl.className   = "toast show t-" + type;
  toastTimer = setTimeout(function() { toastEl.classList.remove("show"); }, dur);
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function doLogin() {
  var name = usernameIn.value.trim();
  if (!name) {
    usernameIn.classList.add("shake");
    setTimeout(function() { usernameIn.classList.remove("shake"); }, 500);
    usernameIn.focus();
    return;
  }
  currentUser  = name; localStorage.setItem("deepguard_user", name);
  history_data = loadHistory(name);
  userAvatar.textContent = name.charAt(0).toUpperCase();
  userLabel.textContent  = name;
  if (sbUserName) sbUserName.textContent = name;
  loginPage.classList.add("fade-out");
  setTimeout(function() {
    loginPage.classList.add("hidden");
    appEl.classList.remove("hidden");
    initSidebarMode();
    renderDashboard();
    renderHistory();
    renderSidebarHistory();
    showToast("Welcome, " + name + "!", "success");
  }, 380);
}

function doLogout() {
  currentUser  = null; localStorage.removeItem("deepguard_user");
  history_data = [];
  clearUpload();
  appEl.classList.add("hidden");
  loginPage.classList.remove("hidden");
  loginPage.classList.remove("fade-out");
  usernameIn.value = "";
  closeSidebar();
  lockAssistant();
  setTimeout(function() { usernameIn.focus(); }, 100);
}

loginBtn.addEventListener("click", doLogin);
usernameIn.addEventListener("keydown", function(e) { if (e.key === "Enter") doLogin(); });
logoutBtn.addEventListener("click", doLogout);

// ─── LOCAL STORAGE ────────────────────────────────────────────────────────────
function loadHistory(name) {
  try {
    var raw = localStorage.getItem(STORAGE_KEY(name));
    return raw ? JSON.parse(raw) : [];
  } catch(e) { return []; }
}

function saveHistory(name, data) {
  try {
    localStorage.setItem(STORAGE_KEY(name), JSON.stringify(data.slice(0, MAX_HIST)));
  } catch(e) {
    console.warn("[DeepGuard] localStorage save failed:", e);
  }
}

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────
function initSidebarMode() {
  if (window.innerWidth >= 960) {
    sidebar.classList.remove("sb-closed");
    sidebar.classList.remove("sb-open");
    sidebarOpen = true;
  } else {
    sidebar.classList.remove("sb-open");
    sidebar.classList.add("sb-closed");
    if (sbOverlay) sbOverlay.classList.add("hidden");
    sidebarOpen = false;
  }
}

function openSidebar() {
  sidebarOpen = true;
  if (window.innerWidth < 960) {
    sidebar.classList.add("sb-open");
    if (sbOverlay) sbOverlay.classList.remove("hidden");
  } else {
    sidebar.classList.remove("sb-closed");
  }
}

function closeSidebar() {
  sidebarOpen = false;
  if (window.innerWidth < 960) {
    sidebar.classList.remove("sb-open");
    if (sbOverlay) sbOverlay.classList.remove("hidden");
  } else {
    sidebar.classList.add("sb-closed");
  }
}

hamburger.addEventListener("click", function() { sidebarOpen ? closeSidebar() : openSidebar(); });
if (sbOverlay) sbOverlay.addEventListener("click", closeSidebar);
window.addEventListener("resize", function() { if (currentUser) initSidebarMode(); });

// ─── SIDEBAR TABS ─────────────────────────────────────────────────────────────
function switchTab(tab) {
  if (tab === "dashboard") {
    if (tabDashboard)   tabDashboard.classList.add("active");
    if (tabHistory)     tabHistory.classList.remove("active");
    if (panelDashboard) panelDashboard.classList.remove("hidden");
    if (panelHistory)   panelHistory.classList.add("hidden");
    closeHistoryPage();
  } else {
    if (tabDashboard)   tabDashboard.classList.remove("active");
    if (tabHistory)     tabHistory.classList.add("active");
    if (panelDashboard) panelDashboard.classList.add("hidden");
    if (panelHistory)   panelHistory.classList.remove("hidden");
    renderSidebarHistory();
    openHistoryPage();
  }
}

if (tabDashboard) tabDashboard.addEventListener("click", function() { switchTab("dashboard"); });
if (tabHistory)   tabHistory.addEventListener("click",   function() { switchTab("history"); });

// ─── HISTORY FULL PAGE ────────────────────────────────────────────────────────
var mainDetect = document.getElementById("main-detect");
var histPage   = document.getElementById("hist-page");
var hpGrid     = document.getElementById("hp-grid");
var hpEmpty    = document.getElementById("hp-empty");
var hpSubtitle = document.getElementById("hp-subtitle");
var hpClearBtn = document.getElementById("hp-clear-btn");
var hpBackBtn  = document.getElementById("hp-back-btn");
var hpGoDetect = document.getElementById("hp-go-detect");
var hpFilters  = document.querySelectorAll(".hp-filter");

var activeFilter = "all";

function openHistoryPage() {
  if (!mainDetect || !histPage) return;
  mainDetect.classList.add("hidden");
  histPage.classList.remove("hidden");
  renderHistoryPage();
}

function closeHistoryPage() {
  if (!histPage || !mainDetect) return;
  histPage.classList.add("hidden");
  mainDetect.classList.remove("hidden");
}

function renderHistoryPage() {
  if (!hpSubtitle || !hpGrid || !hpEmpty) return;
  var count = history_data.length;
  hpSubtitle.textContent = count + " scan" + (count !== 1 ? "s" : "") + " for " + (currentUser || "you");
  var filtered = activeFilter === "all"
    ? history_data
    : history_data.filter(function(e) { return e.prediction === activeFilter; });
  Array.from(hpGrid.children).forEach(function(c) { if (c.id !== "hp-empty") c.remove(); });
  if (filtered.length === 0) { hpEmpty.style.display = ""; return; }
  hpEmpty.style.display = "none";
  filtered.forEach(function(entry, i) {
    var cls   = clsFor(entry.prediction);
    var label = entry.prediction;
    var card  = document.createElement("div");
    card.className = "hp-card " + cls;
    card.style.animationDelay = (i * 0.04) + "s";
    var imgSrc = entry.dataURL ? entry.dataURL : "";
    card.innerHTML =
      '<div class="hp-card-img-wrap">' +
        '<img src="' + imgSrc + '" alt="' + escHtml(entry.filename) + '" class="hp-card-img" loading="lazy" />' +
        '<div class="hp-card-badge ' + cls + '">' + label + '</div>' +
      '</div>' +
      '<div class="hp-card-body">' +
        '<div class="hp-card-name" title="' + escHtml(entry.filename) + '">' + escHtml(entry.filename) + '</div>' +
        '<div class="hp-card-conf-row">' +
          '<span class="hp-card-conf-lbl">Confidence</span>' +
          '<span class="hp-card-conf-pct">' + entry.confidence + '%</span>' +
        '</div>' +
        '<div class="hp-card-bar-track">' +
          '<div class="hp-card-bar ' + cls + '" style="width:' + entry.confidence + '%"></div>' +
        '</div>' +
        '<div class="hp-card-meta">' +
          '<span>' + escHtml(entry.model) + '</span>' +
          '<span>' + escHtml(entry.timestamp) + '</span>' +
        '</div>' +
      '</div>';
    hpGrid.appendChild(card);
  });
}

hpFilters.forEach(function(btn) {
  btn.addEventListener("click", function() {
    hpFilters.forEach(function(b) { b.classList.remove("active"); });
    btn.classList.add("active");
    activeFilter = btn.dataset.filter;
    renderHistoryPage();
  });
});

if (hpBackBtn)  hpBackBtn.addEventListener("click",  closeHistoryPage);
if (hpGoDetect) hpGoDetect.addEventListener("click", closeHistoryPage);
if (hpClearBtn) hpClearBtn.addEventListener("click", function() {
  history_data = [];
  if (currentUser) saveHistory(currentUser, []);
  renderDashboard(); renderHistoryPage(); renderSidebarHistory();
  showToast("History cleared.", "info");
});

// ─── DASHBOARD RENDER ─────────────────────────────────────────────────────────
function renderDashboard() {
  var total     = history_data.length;
  var realCount = history_data.filter(function(e) { return e.prediction === "Real"; }).length;
  var fakeCount = history_data.filter(function(e) { return e.prediction === "Fake"; }).length;
  if (statTotal) statTotal.textContent = total;
  if (statReal)  statReal.textContent  = realCount;
  if (statFake)  statFake.textContent  = fakeCount;
  if (dashGrid) {
    Array.from(dashGrid.children).forEach(function(c) { if (c.id !== "dash-empty") c.remove(); });
    if (total === 0) {
      if (dashEmpty) dashEmpty.style.display = "";
    } else {
      if (dashEmpty) dashEmpty.style.display = "none";
      history_data.slice(0, 4).forEach(function(entry) {
        var cls  = clsFor(entry.prediction);
        var mini = document.createElement("div");
        mini.className = "dash-mini-card " + cls;
        var imgSrc = entry.dataURL ? entry.dataURL : "";
        mini.innerHTML =
          '<img src="' + imgSrc + '" alt="' + escHtml(entry.filename) + '" loading="lazy" />' +
          '<span class="dash-mini-pill ' + cls + '">' + entry.prediction + '</span>';
        dashGrid.appendChild(mini);
      });
    }
  }
}

// ─── SIDEBAR HISTORY RENDER ───────────────────────────────────────────────────
function renderSidebarHistory() {
  if (!sbHistList) return;
  Array.from(sbHistList.children).forEach(function(c) { if (c.id !== "sb-hist-empty") c.remove(); });
  if (history_data.length === 0) { if (sbHistEmpty) sbHistEmpty.style.display = ""; return; }
  if (sbHistEmpty) sbHistEmpty.style.display = "none";
  history_data.forEach(function(entry) {
    var cls  = clsFor(entry.prediction);
    var item = document.createElement("div");
    item.className = "sb-hist-item";
    var imgSrc = entry.dataURL ? entry.dataURL : "";
    item.innerHTML =
      '<img class="sb-hist-thumb" src="' + imgSrc + '" alt="thumb" loading="lazy" />' +
      '<div class="sb-hist-info">' +
        '<div class="sb-hist-name">' + escHtml(entry.filename) + '</div>' +
        '<div class="sb-hist-meta">' + entry.confidence + '% . ' + escHtml(entry.timestamp) + '</div>' +
      '</div>' +
      '<span class="sb-hist-pill ' + cls + '">' + entry.prediction + '</span>';
    sbHistList.appendChild(item);
  });
}

if (sbClearHistBtn) sbClearHistBtn.addEventListener("click", function() {
  history_data = [];
  if (currentUser) saveHistory(currentUser, []);
  renderHistory(); renderDashboard(); renderSidebarHistory();
  showToast("History cleared.", "info");
});

// ─── HISTORY INLINE LIST ──────────────────────────────────────────────────────
function renderHistory() {
  if (!histList) return;
  histList.innerHTML = "";
  if (history_data.length === 0) { if (histEmpty) histList.appendChild(histEmpty); return; }
  history_data.forEach(function(entry) {
    var cls  = clsFor(entry.prediction);
    var item = document.createElement("div");
    item.className = "hist-item";
    var imgSrc = entry.dataURL ? entry.dataURL : "";
    item.innerHTML =
      '<img class="hist-thumb" src="' + imgSrc + '" alt="thumb" loading="lazy" />' +
      '<div class="hist-info">' +
        '<div class="hist-name">' + escHtml(entry.filename) + '</div>' +
        '<div class="hist-meta">' + escHtml(entry.model) + ' - ' + entry.confidence + '% - ' + escHtml(entry.timestamp) + '</div>' +
      '</div>' +
      '<span class="hist-pill ' + cls + '">' + entry.prediction + '</span>';
    histList.appendChild(item);
  });
}

if (clearHist) clearHist.addEventListener("click", function() {
  history_data = [];
  if (currentUser) saveHistory(currentUser, []);
  renderHistory(); renderDashboard(); renderSidebarHistory();
  showToast("History cleared.", "info");
});

if (clearAllBtn) clearAllBtn.addEventListener("click", function() {
  history_data = [];
  if (currentUser) saveHistory(currentUser, []);
  renderHistory(); renderDashboard(); renderSidebarHistory();
  showToast("All history cleared.", "info");
});

// ─── FILE UPLOAD ──────────────────────────────────────────────────────────────
function loadFile(file) {
  var ALLOWED = ["image/jpeg", "image/png", "image/webp"];
  if (ALLOWED.indexOf(file.type) === -1) {
    showToast("Please upload a JPEG, PNG, or WebP image.", "error");
    return;
  }
  if (file.size > 20 * 1024 * 1024) {
    showToast("File is too large. Max 20 MB.", "error");
    return;
  }
  currentFile = file;
  var reader  = new FileReader();
  reader.onload = function(ev) {
    currentDataURL = ev.target.result;
    originalDataURL = ev.target.result;
    if (cropper) { cropper.destroy(); cropper = null; }
    previewImg.src = currentDataURL;
    dropZone.classList.add("hidden");
    previewWrap.classList.remove("hidden");
    if (fileInfo) {
      fileInfo.classList.remove("hidden");
      fileInfo.textContent = file.name + " (" + (file.size / 1024).toFixed(1) + " KB)";
    }
    if (detectBtn) detectBtn.disabled = false;
    if (typeof Cropper !== "undefined") {
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
  previewImg.src = "";
  previewWrap.classList.add("hidden");
  if (fileInfo) fileInfo.classList.add("hidden");
  dropZone.classList.remove("hidden");
  if (detectBtn) detectBtn.disabled = true;
  resetResult();
}

function resetResult() {
  if (resultPh)   resultPh.classList.remove("hidden");
  if (resultBody) resultBody.classList.add("hidden");
  if (confBar)    { confBar.style.transition = "none"; confBar.style.width = "0%"; }
  lockAssistant();
}

dropZone.addEventListener("dragover", function(e) { e.preventDefault(); dropZone.classList.add("dz-active"); });
["dragleave", "dragend"].forEach(function(ev) {
  dropZone.addEventListener(ev, function() { dropZone.classList.remove("dz-active"); });
});
dropZone.addEventListener("drop", function(e) {
  e.preventDefault();
  dropZone.classList.remove("dz-active");
  var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
  if (f) loadFile(f);
});
dropZone.addEventListener("click", function(e) {
  console.log("[DeepGuard] dropZone click event triggered. target:", e.target);
  if (e.target === fileInput) {
    console.log("[DeepGuard] Click was directly on fileInput. Handled by native behavior.");
    return;
  }
  console.log("[DeepGuard] Click on dropZone wrapper element. Calling fileInput.click() manually.");
  fileInput.click();
});

fileInput.addEventListener("click", function(e) {
  console.log("[DeepGuard] fileInput click event triggered. Stopping propagation to parent.");
  e.stopPropagation();
});

dropZone.addEventListener("keydown", function(e) {
  if (e.key === "Enter" || e.key === " ") {
    console.log("[DeepGuard] Keydown trigger (Enter/Space) on dropZone. Simulating click.");
    e.preventDefault(); // Prevent page scrolling on spacebar press
    fileInput.click();
  }
});

fileInput.addEventListener("change", function() {
  console.log("[DeepGuard] fileInput change event triggered.");
  if (fileInput.files[0]) {
    console.log("[DeepGuard] Loading selected file:", fileInput.files[0].name);
    loadFile(fileInput.files[0]);
  }
});
clearImgBtn.addEventListener("click", clearUpload);

// ─── DETECTION ────────────────────────────────────────────────────────────────
detectBtn.addEventListener("click", runDetection);

async function runDetection() {
  if (!currentFile) { showToast("Please upload an image first.", "info"); return; }
  detectBtn.disabled = true;
  detectBtn.classList.add("loading");
  if (detectText)      detectText.classList.add("hidden");
  if (detectSpinnerEl) detectSpinnerEl.classList.remove("hidden");
  try {
    var formData = new FormData();
    if (cropper) {
      var blob = await new Promise(function(res) {
        cropper.getCroppedCanvas({ maxWidth: 1024, maxHeight: 1024 })
               .toBlob(function(b) { res(b); }, currentFile.type || "image/jpeg", 0.95);
      });
      formData.append("file", blob, currentFile.name);
      currentDataURL = cropper.getCroppedCanvas({ width: 224, height: 224 })
                               .toDataURL(currentFile.type || "image/jpeg");
    } else {
      formData.append("file", currentFile);
    }
    var res = await fetch(API_URL, { method: "POST", body: formData });
    if (!res.ok) {
      var msg = "Server error (" + res.status + ")";
      try { var j = await res.json(); msg = j.detail || msg; } catch(e2) {}
      throw new Error(msg);
    }
    var data = await res.json();
    if (data.error) throw new Error(data.error);
    showResult(data);
    addToHistory(data);
  } catch(err) {
    var isFetch = err.name === "TypeError" && err.message.indexOf("fetch") !== -1;
    showToast(
      isFetch
        ? "Cannot reach API - start FastAPI at " + API_BASE + " and reload this page."
        : err.message,
      "error", 5500
    );
    console.error("[DeepGuard]", err);
  } finally {
    detectBtn.classList.remove("loading");
    if (detectText)      detectText.classList.remove("hidden");
    if (detectSpinnerEl) detectSpinnerEl.classList.add("hidden");
    detectBtn.disabled = false;
  }
}

// ─── SHOW RESULT ──────────────────────────────────────────────────────────────
function showResult(data) {
  var prediction = data.prediction;
  var confidence = data.confidence;
  var model_used = data.model_used;
  var reason     = data.reason;
  var cls = clsFor(prediction);
  var pct = Math.round((confidence || 0) * 100);

  if (resultBadge) { resultBadge.className = "result-badge " + cls; resultBadge.textContent = prediction; }
  if (resultLabel) { resultLabel.className = "result-label " + cls; resultLabel.textContent = prediction; }
  if (resultDesc) {
    if (prediction === "Real") {
      resultDesc.textContent = "This image appears to be an authentic, unmanipulated photograph.";
    } else if (prediction === "Uncertain") {
      resultDesc.textContent = "The model could not make a confident classification.";
    } else {
      resultDesc.textContent = "This image shows signs of AI-generation or digital manipulation.";
    }
  }
  if (reasonBlock && reasonText) {
    if (reason) {
      reasonBlock.classList.remove("hidden");
      reasonBlock.className = "reason-block " + cls;
      reasonText.textContent = reason;
      if (indicatorsList) {
        indicatorsList.innerHTML = "";
        var indList = data.indicators || [];
        indList.forEach(function(ind) {
          var li = document.createElement("li");
          li.textContent = ind;
          indicatorsList.appendChild(li);
        });
      }
    } else {
      reasonBlock.classList.add("hidden");
    }
  }
  if (confPct) {
    confPct.textContent = pct + "%";
    if (prediction === "Real") {
      confPct.style.color = "var(--green)";
    } else if (prediction === "Uncertain") {
      confPct.style.color = "var(--gold)";
    } else {
      confPct.style.color = "var(--red)";
    }
  }
  if (confBar) {
    confBar.className = "conf-bar " + cls;
    requestAnimationFrame(function() {
      requestAnimationFrame(function() {
        confBar.style.transition = "width 0.95s cubic-bezier(.4,0,.2,1)";
        confBar.style.width = pct + "%";
      });
    });
  }
  if (metaModel) metaModel.textContent = model_used || "Unknown";
  if (metaDec) {
    metaDec.textContent = prediction;
    if (confPct) metaDec.style.color = confPct.style.color;
  }
  if (resultPh)   resultPh.classList.add("hidden");
  if (resultBody) resultBody.classList.remove("hidden");
  showToast(prediction + " - " + pct + "% confidence", "success");
  unlockAssistant();
}

// ─── HISTORY ──────────────────────────────────────────────────────────────────
function addToHistory(data) {
  history_data.unshift({
    filename:   currentFile.name,
    dataURL:    currentDataURL,
    prediction: data.prediction,
    confidence: Math.round((data.confidence || 0) * 100),
    model:      data.model_used || "Unknown",
    timestamp:  new Date().toLocaleString()
  });
  if (currentUser) saveHistory(currentUser, history_data);
  renderHistory();
  renderDashboard();
  renderSidebarHistory();
}

if (againBtn) againBtn.addEventListener("click", clearUpload);

// ─── UTILS ────────────────────────────────────────────────────────────────────
function clsFor(prediction) {
  if (prediction === "Real")      return "real";
  if (prediction === "Uncertain") return "uncertain";
  return "fake";
}

function escHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g,  "&amp;")
    .replace(/</g,  "&lt;")
    .replace(/>/g,  "&gt;")
    .replace(/"/g,  "&quot;");
}

// ─── KNOWLEDGE ASSISTANT ──────────────────────────────────────────────────────
let faqDatabase = {
  "what is deepfake": "A deepfake is AI-generated or manipulated media that alters a person's appearance, voice, or actions using deep learning techniques.",
  "what is deepguard": "DeepGuard is a deepfake detection system that uses a Vision Transformer based model to classify facial images as Real or Fake.",
  "what dataset was used": "The model was trained using the Celeb-DF v2 dataset containing real and deepfake celebrity videos.",
  "what is celeb-df": "Celeb-DF v2 is a benchmark dataset designed for deepfake detection research. It contains both authentic and manipulated celebrity videos.",
  "why use celeb-df": "Celeb-DF contains realistic deepfake videos and is widely used to evaluate deepfake detection models.",
  "what is mtcnn": "MTCNN is a face detection algorithm used to locate and crop faces from video frames before training.",
  "why face extraction": "Face extraction removes irrelevant background information and allows the model to focus on facial features.",
  "what is preprocessing": "Preprocessing includes face detection, cropping, resizing, and preparing images for model training.",
  "what image size is used": "Images are resized to 224x224 pixels before being fed into the model.",
  "what is cnn": "CNN stands for Convolutional Network. It extracts local visual features such as edges, textures, and patterns.",
  "what is vision transformer": "Vision Transformer or ViT is a deep learning architecture that analyzes images using transformer mechanisms originally developed for NLP.",
  "why use vit": "ViT captures global relationships between different regions of an image, helping detect subtle manipulation artifacts.",
  "what is patch embedding": "Patch embedding converts image patches into vector representations that can be processed by the transformer.",
  "what are image patches": "Image patches are small sections of an image split before transformer processing.",
  "what is positional embedding": "Positional embedding provides location information so the transformer understands where each patch belongs in the image.",
  "what is transformer encoder": "The transformer encoder processes embedded image patches and learns relationships between them using attention mechanisms.",
  "what is self attention": "Self-attention allows the model to determine which image regions are most important when making predictions.",
  "what is multi head attention": "Multi-head attention enables the model to learn multiple relationships across image patches simultaneously.",
  "what is ffn": "FFN stands for Feed Forward Network. It processes features generated by the attention layers inside the transformer encoder.",
  "what is mlp head": "The MLP head is the final classification layer that predicts whether an image is Real or Fake.",
  "what is feature extraction": "Feature extraction identifies important visual patterns used to distinguish authentic and manipulated images.",
  "how does the model detect deepfakes": "The model learns visual patterns commonly associated with manipulated facial content and uses them for classification.",
  "what is training": "Training is the process of teaching the model using labeled real and fake images.",
  "what is validation": "Validation evaluates model performance during training and helps prevent overfitting.",
  "what is testing": "Testing measures model performance on unseen data after training is completed.",
  "what is accuracy": "Accuracy represents the percentage of correct predictions made by the model.",
  "what is precision": "Precision measures how many images predicted as fake are actually fake.",
  "what is recall": "Recall measures how many actual fake images were correctly identified by the model.",
  "what is f1 score": "F1 Score is a balanced metric that combines precision and recall.",
  "what is confusion matrix": "A confusion matrix summarizes correct and incorrect predictions across classes.",
  "what does confidence score mean": "The confidence score indicates how certain the model is about its prediction.",
  "why can predictions be wrong": "Predictions may be incorrect when images differ significantly from the training data or contain quality issues.",
  "what is dataset bias": "Dataset bias occurs when the model learns patterns specific to the training dataset instead of general deepfake characteristics.",
  "why does the model work best on celeb-df": "The model was trained on Celeb-DF images, so it performs best on data similar to that dataset.",
  "what is an uncertain prediction": "An uncertain prediction occurs when the confidence score is too low for a reliable classification.",
  "what are the limitations of the project": "The model may not generalize perfectly to unseen datasets or newly generated deepfakes.",
  "what is future scope": "Future improvements include multi-dataset training, video-level detection, and real time deployment.",
  "can the system detect videos": "The current implementation focuses on facial images extracted from videos rather than full video analysis.",
  "what technologies were used": "The project uses Python, OpenCV, MTCNN, TensorFlow/Keras, Vision Transformers, FastAPI, HTML, CSS, and JavaScript."
};

async function loadFaqData() {
  try {
    const response = await fetch("faq.json");
    if (response.ok) {
      const fetched = await response.json();
      faqDatabase = Object.assign({}, faqDatabase, fetched);
    }
  } catch (error) {
    console.warn("Failed to load FAQ database via fetch (likely CORS/file://), using embedded database instead.");
  }
}

function lockAssistant() {
  const panel = document.getElementById("assistant-panel");
  const lockedView = document.getElementById("assistant-locked-view");
  const enabledView = document.getElementById("assistant-enabled-view");
  const input = document.getElementById("assistant-input");
  const btn = document.getElementById("assistant-send-btn");

  if (panel) panel.classList.add("locked");
  if (lockedView) lockedView.classList.remove("hidden");
  if (enabledView) enabledView.classList.add("hidden");
  if (input) {
    input.disabled = true;
    input.value = "";
  }
  if (btn) btn.disabled = true;
  
  const history = document.getElementById("assistant-chat-history");
  if (history) history.innerHTML = "";
}

function unlockAssistant() {
  const panel = document.getElementById("assistant-panel");
  const lockedView = document.getElementById("assistant-locked-view");
  const enabledView = document.getElementById("assistant-enabled-view");
  const input = document.getElementById("assistant-input");
  const btn = document.getElementById("assistant-send-btn");

  if (panel) panel.classList.remove("locked");
  if (lockedView) lockedView.classList.add("hidden");
  if (enabledView) enabledView.classList.remove("hidden");
  if (input) input.disabled = false;
  if (btn) btn.disabled = false;
  
  const history = document.getElementById("assistant-chat-history");
  if (history && history.children.length === 0) {
    appendAssistantMessage("Hello! I am the DeepGuard Knowledge Assistant. Ask me any project-related question about Deepfake Detection, ViT, MTCNN, Celeb-DF, and more.");
  }
}

function appendUserMessage(text) {
  const history = document.getElementById("assistant-chat-history");
  if (!history) return;
  
  const msg = document.createElement("div");
  msg.className = "chat-msg user";
  msg.textContent = text;
  history.appendChild(msg);
  
  history.scrollTop = history.scrollHeight;
}

function appendAssistantMessage(text) {
  const history = document.getElementById("assistant-chat-history");
  if (!history) return;
  
  const msg = document.createElement("div");
  msg.className = "chat-msg assistant";
  msg.textContent = text;
  history.appendChild(msg);
  
  history.scrollTop = history.scrollHeight;
}

function findFaqAnswer(query) {
  if (!query) return null;
  const cleanQuery = query.toLowerCase().trim().replace(/[?.,!]/g, "");
  
  // 1. Direct key match (exact match after normalization)
  if (faqDatabase[cleanQuery]) {
    return faqDatabase[cleanQuery];
  }
  
  // 2. Tokenize and filter stopwords
  const stopwords = new Set([
    "what", "is", "why", "does", "the", "a", "an", "of", "for", "to", "about", 
    "in", "on", "with", "how", "can", "are", "was", "were", "been", "do", "did", 
    "tell", "me", "use", "used", "using", "work", "works", "best", "some", "any",
    "project", "model", "system", "question", "answer", "asked", "ask"
  ]);
  
  function getKeywords(str) {
    return str.split(/\s+/)
              .map(w => w.replace(/[^a-z0-9-]/g, ""))
              .filter(w => w && !stopwords.has(w));
  }
  
  const queryWords = getKeywords(cleanQuery);
  if (queryWords.length === 0) return null;
  
  let bestMatchKey = null;
  let highestScore = 0;
  
  for (const key in faqDatabase) {
    const cleanKey = key.toLowerCase().trim().replace(/[?.,!]/g, "");
    
    // Substring match boost
    if (cleanQuery.includes(cleanKey) || cleanKey.includes(cleanQuery)) {
      const substringScore = 50 + cleanKey.length;
      if (substringScore > highestScore) {
        highestScore = substringScore;
        bestMatchKey = key;
      }
    }
    
    // Word overlap match
    const keyWords = getKeywords(cleanKey);
    let overlapCount = 0;
    
    queryWords.forEach(qw => {
      if (keyWords.includes(qw)) {
        overlapCount++;
      } else {
        // partial match (e.g. "transformer" matches "transformers")
        keyWords.forEach(kw => {
          if (kw.includes(qw) || qw.includes(kw)) {
            overlapCount += 0.8;
          }
        });
      }
    });
    
    if (overlapCount > 0) {
      const overlapScore = (overlapCount * 15) + ((overlapCount / keyWords.length) * 10);
      if (overlapScore > highestScore) {
        highestScore = overlapScore;
        bestMatchKey = key;
      }
    }
  }
  
  // Keyword fallback mapping as a last resort
  if (highestScore < 10) {
    const keywordsMap = {
      "vit": "what is vision transformer",
      "vision transformer": "what is vision transformer",
      "transformer encoder": "what is transformer encoder",
      "celeb-df": "what is celeb-df",
      "dataset": "what dataset was used",
      "mtcnn": "what is mtcnn",
      "face extraction": "why face extraction",
      "preprocessing": "what is preprocessing",
      "cnn": "what is cnn",
      "accuracy": "what is accuracy",
      "precision": "what is precision",
      "recall": "what is recall",
      "f1 score": "what is f1 score",
      "confusion matrix": "what is confusion matrix",
      "confidence score": "what does confidence score mean",
      "uncertain": "what is an uncertain prediction",
      "bias": "what is dataset bias",
      "future": "what is future scope",
      "video": "can the system detect videos",
      "technologies": "what technologies were used",
      "mlp head": "what is mlp head",
      "ffn": "what is ffn",
      "attention": "what is self attention"
    };
    
    for (const kw in keywordsMap) {
      if (cleanQuery.includes(kw)) {
        const matchKey = keywordsMap[kw];
        if (faqDatabase[matchKey]) {
          return faqDatabase[matchKey];
        }
      }
    }
  }
  
  if (bestMatchKey && highestScore >= 10) {
    return faqDatabase[bestMatchKey];
  }
  
  return null;
}

function handleAssistantSubmit() {
  const input = document.getElementById("assistant-input");
  if (!input) return;
  
  const text = input.value.trim();
  if (!text) return;
  
  appendUserMessage(text);
  input.value = "";
  
  setTimeout(function() {
    const answer = findFaqAnswer(text);
    if (answer) {
      appendAssistantMessage(answer);
    } else {
      appendAssistantMessage("I couldn't find an exact answer. Try asking about Vision Transformer, Celeb-DF, MTCNN, Deepfake Detection, Confidence Score, CNN, FFN, MLP Head, Transformer Encoder, or Model Evaluation.");
    }
  }, 250);
}

function initAssistant() {
  loadFaqData();
  
  const sendBtn = document.getElementById("assistant-send-btn");
  const input = document.getElementById("assistant-input");
  
  if (sendBtn) {
    sendBtn.addEventListener("click", handleAssistantSubmit);
  }
  
  if (input) {
    input.addEventListener("keydown", function(e) {
      if (e.key === "Enter") {
        handleAssistantSubmit();
      }
    });
  }
  
  const panel = document.getElementById("assistant-panel");
  if (panel) {
    panel.addEventListener("click", function(e) {
      if (e.target && e.target.classList.contains("chip")) {
        const q = e.target.getAttribute("data-question");
        if (q && input && !input.disabled) {
          input.value = q;
          handleAssistantSubmit();
        }
      }
    });
  }
}

function initImageModal() {
  const container = document.getElementById("preview-img-container");
  const modal = document.getElementById("image-modal");
  const modalImg = document.getElementById("modal-img");
  const modalClose = document.getElementById("modal-close");

  if (!container || !modal || !modalImg) return;

  let startX = 0;
  let startY = 0;

  container.addEventListener("mousedown", function(e) {
    startX = e.screenX;
    startY = e.screenY;
  });

  container.addEventListener("mouseup", function(e) {
    const diffX = Math.abs(e.screenX - startX);
    const diffY = Math.abs(e.screenY - startY);
    
    // If movement is very small, treat it as a click to open modal
    if (diffX < 6 && diffY < 6) {
      if (originalDataURL) {
        modalImg.src = originalDataURL;
        modal.classList.remove("hidden");
      }
    }
  });

  if (modalClose) {
    modalClose.addEventListener("click", function() {
      modal.classList.add("hidden");
      modalImg.src = "";
    });
  }

  modal.addEventListener("click", function(e) {
    if (e.target === modal || e.target === modalClose) {
      modal.classList.add("hidden");
      modalImg.src = "";
    }
  });

  document.addEventListener("keydown", function(e) {
    if (e.key === "Escape" && !modal.classList.contains("hidden")) {
      modal.classList.add("hidden");
      modalImg.src = "";
    }
  });
}

// ─── INIT ─────────────────────────────────────────────────────────────────────
var savedUser = localStorage.getItem("deepguard_user"); if (savedUser) { usernameIn.value = savedUser; doLogin(); } else { setTimeout(function() { if (usernameIn) usernameIn.focus(); }, 100); }
initAssistant();
initImageModal();
console.log("[DeepGuard] Ready. API:", API_URL);
