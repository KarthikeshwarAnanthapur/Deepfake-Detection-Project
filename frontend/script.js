/**
 * script.js — DeepGuard Deepfake Detection Frontend
 *
 * Features:
 *   - Drag & drop + file picker upload
 *   - Image preview with FileReader
 *   - POST to FastAPI /predict endpoint
 *   - Loading spinner during fetch
 *   - Animated confidence progress bar
 *   - Prediction history with thumbnails
 *   - Toast notifications for errors & info
 */

// ──────────────────────────────────────────────
// Configuration
// ──────────────────────────────────────────────
const API_URL = "http://localhost:8000/predict";

// ──────────────────────────────────────────────
// DOM references
// ──────────────────────────────────────────────
const dropZone         = document.getElementById("drop-zone");
const fileInput        = document.getElementById("file-input");
const previewContainer = document.getElementById("preview-container");
const previewImg       = document.getElementById("preview-img");
const clearBtn         = document.getElementById("clear-btn");
const fileInfo         = document.getElementById("file-info");
const detectBtn        = document.getElementById("detect-btn");
const btnText          = detectBtn.querySelector(".btn-text");
const btnSpinner       = detectBtn.querySelector(".btn-spinner");

const resultPlaceholder = document.getElementById("result-placeholder");
const resultContent     = document.getElementById("result-content");
const resultBadge       = document.getElementById("result-badge");
const resultLabel       = document.getElementById("result-label");
const resultDesc        = document.getElementById("result-desc");
const confidencePct     = document.getElementById("confidence-pct");
const progressBar       = document.getElementById("progress-bar");
const reasonBlock       = document.getElementById("reason-block");
const resultReason      = document.getElementById("result-reason");
const metaModel         = document.getElementById("meta-model");
const metaDecision      = document.getElementById("meta-decision");
const analyzeAgainBtn   = document.getElementById("analyze-again-btn");

const historyList     = document.getElementById("history-list");
const historyEmpty    = document.getElementById("history-empty");
const clearHistoryBtn = document.getElementById("clear-history-btn");

const toast = document.getElementById("toast");

// ──────────────────────────────────────────────
// App State
// ──────────────────────────────────────────────
let currentFile    = null;   // File object
let currentDataURL = null;   // base64 preview
let predictionHistory = [];  // [{filename, dataURL, prediction, confidence, model}]
let toastTimer     = null;
let cropper        = null;   // Cropper instance

// ──────────────────────────────────────────────
// Toast Notifications
// ──────────────────────────────────────────────

/**
 * Show a toast message.
 * @param {string} message
 * @param {'info'|'success'|'error'} type
 * @param {number} duration
 */
function showToast(message, type = "info", duration = 3500) {
  if (toastTimer) clearTimeout(toastTimer);

  toast.textContent = message;
  toast.className   = `toast toast-${type} show`;

  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, duration);
}

// ──────────────────────────────────────────────
// File Handling
// ──────────────────────────────────────────────

/**
 * Load a File for preview. Validates type and size.
 * @param {File} file
 */
function loadFile(file) {
  const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  const MAX_MB        = 10;

  if (!ALLOWED_TYPES.includes(file.type)) {
    showToast("❌ Please upload a JPEG, PNG, or WebP image.", "error");
    return;
  }
  if (file.size > MAX_MB * 1024 * 1024) {
    showToast(`❌ File too large. Maximum size is ${MAX_MB} MB.`, "error");
    return;
  }

  currentFile = file;

  const reader = new FileReader();
  reader.onload = (e) => {
    currentDataURL = e.target.result;
    previewImg.src = currentDataURL;

    // Show preview, hide drop zone content
    dropZone.classList.add("hidden");
    previewContainer.classList.remove("hidden");
    fileInfo.classList.remove("hidden");
    fileInfo.textContent = `📎 ${file.name}  ·  ${(file.size / 1024).toFixed(1)} KB  ·  ${file.type.split("/")[1].toUpperCase()}`;

    detectBtn.disabled = false;
    showToast("✅ Image loaded. Crop the face, then click Detect.", "success");

    // Reset results when a new image is loaded
    resetResult();
    
    // Initialize Cropper.js
    if (cropper) {
      cropper.destroy();
      cropper = null;
    }
    setTimeout(() => {
      previewImg.style.maxHeight = 'none'; // allow cropper full height
      cropper = new Cropper(previewImg, {
        viewMode: 1, // Restrict crop box within canvas
        autoCropArea: 0.8,
        background: false
      });
    }, 50);
  };
  reader.readAsDataURL(file);
}

/** Remove current image and reset to drop zone state. */
function clearFile() {
  if (cropper) {
    cropper.destroy();
    cropper = null;
  }
  previewImg.style.maxHeight = ''; // reset preview styles
  
  currentFile    = null;
  currentDataURL = null;
  fileInput.value = "";
  previewImg.src  = "";
  previewContainer.classList.add("hidden");
  fileInfo.classList.add("hidden");
  dropZone.classList.remove("hidden");
  detectBtn.disabled = true;
  resetResult();
}

/** Reset result card to placeholder state. */
function resetResult() {
  resultPlaceholder.classList.remove("hidden");
  resultContent.classList.add("hidden");
  // Reset progress bar without animation
  progressBar.style.transition = "none";
  progressBar.style.width = "0%";
}

// ──────────────────────────────────────────────
// Drop Zone Events
// ──────────────────────────────────────────────

dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("drag-over");
});

["dragleave", "dragend"].forEach((evt) =>
  dropZone.addEventListener(evt, () => dropZone.classList.remove("drag-over"))
);

dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("drag-over");
  const file = e.dataTransfer?.files?.[0];
  if (file) loadFile(file);
});

dropZone.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") fileInput.click();
});

fileInput.addEventListener("change", () => {
  if (fileInput.files[0]) loadFile(fileInput.files[0]);
});

clearBtn.addEventListener("click", clearFile);

// ──────────────────────────────────────────────
// Detection API Call
// ──────────────────────────────────────────────

detectBtn.addEventListener("click", runDetection);

async function runDetection() {
  if (!currentFile) {
    showToast("⚠️ Please upload an image first.", "info");
    return;
  }

  // ── Enter loading state ──────────────────────
  detectBtn.disabled = true;
  detectBtn.classList.add("loading");
  btnText.classList.add("hidden");
  btnSpinner.classList.remove("hidden");

  try {
    const formData = new FormData();
    
    // Replace the file payload with the cropped blob
    if (cropper) {
      const croppedBlob = await new Promise((resolve) => {
        cropper.getCroppedCanvas({
            maxWidth: 1024,
            maxHeight: 1024
        }).toBlob((blob) => resolve(blob), currentFile.type || "image/jpeg", 0.95);
      });
      formData.append("file", croppedBlob, currentFile.name);
      
      // Update the current preview base64 so history shows the cropped version
      currentDataURL = cropper.getCroppedCanvas({ width: 224, height: 224 }).toDataURL(currentFile.type || "image/jpeg");
    } else {
      formData.append("file", currentFile);
    }

    const response = await fetch(API_URL, {
      method: "POST",
      body:   formData,
    });

    if (!response.ok) {
      let errMsg = `Server error (${response.status})`;
      try {
        const errJson = await response.json();
        errMsg = errJson.detail || errMsg;
      } catch (_) { /* ignore parse error */ }
      throw new Error(errMsg);
    }

    const data = await response.json();
    
    // Catch logical errors returned by the backend (like "No face detected")
    if (data.error) {
      throw new Error(data.error);
    }
    
    displayResult(data);
    addToHistory(data);

  } catch (err) {
    if (err.name === "TypeError" && err.message.includes("fetch")) {
      showToast("❌ Cannot connect to API. Make sure the FastAPI server is running on port 8000.", "error", 5000);
    } else {
      showToast(`❌ ${err.message}`, "error", 5000);
    }
    console.error("[DeepGuard]", err);
  } finally {
    // ── Exit loading state ───────────────────
    detectBtn.classList.remove("loading");
    btnText.classList.remove("hidden");
    btnSpinner.classList.add("hidden");
    detectBtn.disabled = false;
  }
}

// ──────────────────────────────────────────────
// Display Result
// ──────────────────────────────────────────────

/**
 * Render the prediction response in the result card.
 * @param {{ prediction: string, confidence: number, model_used: string, reason?: string }} data
 */
function displayResult(data) {
  const { prediction, confidence, model_used, reason } = data;
  const isReal      = prediction === "Real";
  const isUncertain = prediction === "Uncertain";
  const cls         = isReal ? "real" : (isUncertain ? "uncertain" : "fake");
  const pct         = Math.round(confidence * 100);
  const emoji       = isReal ? "✅" : (isUncertain ? "⚠️" : "🚨");

  // Badge
  resultBadge.className  = `result-badge ${cls}`;
  resultBadge.textContent = `${emoji} ${prediction}`;

  // Label
  resultLabel.className  = `result-label ${cls}`;
  resultLabel.textContent = prediction;

  // Description
  if (isReal) {
    resultDesc.textContent = "This image appears to be an authentic, unmanipulated photograph.";
  } else if (isUncertain) {
    resultDesc.textContent = "The system could not make a confident classification.";
  } else {
    resultDesc.textContent = "This image shows signs of AI-generated or digitally manipulated content.";
  }

  // Reason Block
  if (reason) {
    reasonBlock.classList.remove("hidden");
    reasonBlock.className = `reason-block ${cls}`;
    resultReason.textContent = reason;
  } else {
    reasonBlock.classList.add("hidden");
  }

  // Confidence
  confidencePct.textContent = `${pct}%`;
  if (isReal) confidencePct.style.color = "var(--real-color)";
  else if (isUncertain) confidencePct.style.color = "#ffb703";
  else confidencePct.style.color = "var(--fake-color)";

  // Animate progress bar
  progressBar.className = `progress-bar ${cls}`;
  // Re-enable transition after resetting
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      progressBar.style.transition = "width 0.9s cubic-bezier(.4,0,.2,1)";
      progressBar.style.width      = `${pct}%`;
    });
  });

  // Meta
  metaModel.textContent    = model_used;
  metaDecision.textContent = prediction;
  if (isReal) metaDecision.style.color = "var(--real-color)";
  else if (isUncertain) metaDecision.style.color = "#ffb703";
  else metaDecision.style.color = "var(--fake-color)";

  // Switch to result view
  resultPlaceholder.classList.add("hidden");
  resultContent.classList.remove("hidden");

  showToast(`${emoji} Detection complete: ${prediction} (${pct}% confidence)`, "success");
}

// ──────────────────────────────────────────────
// Prediction History
// ──────────────────────────────────────────────

/**
 * Add an entry to the UI history list.
 * @param {{ prediction: string, confidence: number, model_used: string }} data
 */
function addToHistory(data) {
  const entry = {
    filename:   currentFile.name,
    dataURL:    currentDataURL,
    prediction: data.prediction,
    confidence: Math.round(data.confidence * 100),
    model:      data.model_used,
    timestamp:  new Date().toLocaleTimeString(),
  };
  predictionHistory.unshift(entry);
  renderHistory();
}

function renderHistory() {
  historyList.innerHTML = "";

  if (predictionHistory.length === 0) {
    historyList.appendChild(historyEmpty);
    return;
  }

  predictionHistory.forEach((entry) => {
    const cls  = entry.prediction === "Real" ? "real" : "fake";
    const item = document.createElement("div");
    item.className = "history-item";
    item.innerHTML = `
      <img class="history-thumb" src="${entry.dataURL}" alt="thumbnail" />
      <div class="history-info">
        <div class="history-filename">${escapeHtml(entry.filename)}</div>
        <div class="history-meta">${entry.model} · ${entry.confidence}% confidence · ${entry.timestamp}</div>
      </div>
      <span class="history-pill ${cls}">${entry.prediction}</span>
    `;
    historyList.appendChild(item);
  });
}

clearHistoryBtn.addEventListener("click", () => {
  predictionHistory = [];
  renderHistory();
  showToast("🗑️ History cleared.", "info");
});

// ──────────────────────────────────────────────
// "Analyze Another Image" button
// ──────────────────────────────────────────────
analyzeAgainBtn.addEventListener("click", clearFile);

// ──────────────────────────────────────────────
// Utility
// ──────────────────────────────────────────────

/**
 * Escape HTML characters to prevent XSS in innerHTML.
 * @param {string} str
 */
function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ──────────────────────────────────────────────
// Init
// ──────────────────────────────────────────────
renderHistory();
console.log("[DeepGuard] Frontend initialized. API target:", API_URL);
