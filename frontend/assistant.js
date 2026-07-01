/**
 * assistant.js — DeepGuard v2.0
 * Full-page AI assistant with typing animation, FAQ engine, and chat bubbles
 */

/* ── FAQ Knowledge Base ─────────────────────────────────────── */
const faqDB = {
  'what is deepfake': 'A deepfake is synthetic media created using deep learning (typically GANs or diffusion models) to realistically manipulate a person\'s face, voice, or actions in video or images. The term combines "deep learning" and "fake."',
  'what is a deepfake': 'A deepfake is AI-generated media that replaces or manipulates a person\'s likeness using deep neural networks. They can be used maliciously for misinformation, fraud, and non-consensual content.',
  'how does vision transformer work': 'Vision Transformer (ViT) divides an image into fixed-size patches (e.g., 16×16 px), embeds each patch into a vector, adds positional embeddings, then processes them through transformer encoder layers using multi-head self-attention. The final [CLS] token is used for classification.',
  'what is vision transformer': 'Vision Transformer (ViT) applies the transformer architecture (originally for NLP) to images by treating image patches as tokens. It captures global relationships across the entire image — crucial for detecting subtle deepfake artifacts.',
  'what is mtcnn': 'MTCNN (Multi-task Cascaded Convolutional Networks) is a three-stage face detection pipeline that simultaneously detects faces and locates facial landmarks. DeepGuard uses MTCNN to crop and align faces before feeding them to the ViT classifier.',
  'what is celeb-df': 'Celeb-DF v2 is a high-quality deepfake benchmark dataset containing 590 real videos and 5,639 deepfake videos of celebrities. It was designed to challenge deepfake detection models with more realistic manipulations than earlier datasets.',
  'what does confidence score mean': 'The confidence score (0–100%) represents how certain the model is about its prediction. A score of 95% on "Fake" means the model strongly believes the image is manipulated. Scores below the threshold (default 50%) are labeled "Uncertain."',
  'what is uncertain prediction': 'An Uncertain prediction occurs when the model\'s confidence falls below the configured threshold. This means the model found insufficient evidence to definitively classify the image as Real or Fake.',
  'what are the limitations': 'DeepGuard\'s limitations include: potential struggles with very high-quality deepfakes not seen during training, low-resolution or heavily compressed images, heavy occlusions, and deepfakes created with newer architectures like diffusion models.',
  'what is future scope': 'Future improvements include: multi-dataset training for better generalization, temporal consistency analysis for video detection, browser-based real-time inference with ONNX, adversarial robustness testing, and integration with social media APIs.',
  'can the system detect videos': 'Currently, DeepGuard analyzes individual image frames. Video detection requires extracting frames, running per-frame classification, and applying temporal consistency analysis to flag sequences with manipulation artifacts.',
  'what technologies were used': 'Backend: Python, FastAPI, TensorFlow/Keras, MTCNN, Vision Transformer. Frontend: HTML5, CSS3 (glassmorphism), Vanilla JS (ES6+), Chart.js, Font Awesome. Dataset: Celeb-DF v2. Model: Custom ViT fine-tuned for deepfake detection.',
  'what is accuracy': 'Accuracy measures the percentage of images correctly classified as Real or Fake. The model achieves high accuracy on Celeb-DF v2 data, though performance may vary on out-of-distribution deepfakes.',
  'what is precision': 'Precision answers: "Of all images predicted as Fake, how many actually are Fake?" High precision means fewer false alarms — important for trust in the detection system.',
  'what is recall': 'Recall answers: "Of all actually Fake images, how many did the model detect?" High recall means fewer deepfakes slip through undetected — critical for security applications.',
  'what is f1 score': 'F1 Score is the harmonic mean of precision and recall: F1 = 2 × (P × R) / (P + R). It provides a balanced metric especially useful when the dataset has class imbalance between real and fake samples.',
  'what is patch embedding': 'Patch embedding splits an image into N patches (e.g., a 224×224 image into 196 patches of 16×16), then projects each flattened patch through a linear layer into a D-dimensional embedding vector for transformer processing.',
  'what is positional embedding': 'Positional embeddings are learnable vectors added to patch embeddings to preserve spatial information. Without them, the transformer cannot distinguish the position of each patch within the image.',
  'what is self attention': 'Self-attention computes relationships between all pairs of patches simultaneously. Each patch "attends" to every other patch with a learned weight, allowing the model to detect manipulation artifacts that span distant image regions.',
  'what is multi head attention': 'Multi-head attention runs H parallel attention functions, each learning different aspects of patch relationships. The outputs are concatenated and projected, giving the model richer representational capacity.',
  'what is mlp head': 'The MLP (Multi-Layer Perceptron) head is the final classification layer. It takes the [CLS] token output from the transformer encoder and maps it to class probabilities through fully-connected layers with dropout regularization.',
  'what is gan': 'GAN (Generative Adversarial Network) consists of a Generator that creates synthetic images and a Discriminator that distinguishes real from fake. The two compete in a minimax game, driving increasingly realistic deepfake generation.',
  'what is cnn': 'CNN (Convolutional Neural Network) uses convolutional filters to extract local features like edges and textures. Unlike ViT, CNNs process images hierarchically — local features → patterns → high-level representations.',
  'what dataset was used': 'DeepGuard was trained on Celeb-DF v2, a benchmark containing 590 real celebrity videos and 5,639 high-quality deepfake videos. Frames were extracted, faces detected via MTCNN, and resized to 224×224 pixels.',
  'what is deepguard': 'DeepGuard is an AI-powered deepfake detection platform that uses a fine-tuned Vision Transformer (ViT) model to classify facial images as Real, Fake, or Uncertain. It provides confidence scores, AI explanations, and a full analytics dashboard.',
  'what is preprocessing': 'Preprocessing pipeline: (1) MTCNN detects and crops faces, (2) crops are resized to 224×224 pixels, (3) pixel values are normalized to [0,1], (4) images are batched and fed to the ViT model for inference.',
  'why use vit': 'ViT outperforms CNNs on deepfake detection because it captures global context — it can correlate artifacts across non-adjacent face regions (e.g., unnatural blending at face edges while the interior looks normal). CNNs miss these long-range dependencies.',
  'what is explainable ai': 'Explainable AI (XAI) techniques like GradCAM produce visual explanations showing which image regions influenced the model\'s prediction. DeepGuard uses text explanations to describe why an image was classified as Real or Fake.',
};

async function getFaqAnswer(query) {
  const clean = query.toLowerCase().trim().replace(/[?.,!]/g, '');
  if (faqDB[clean]) return faqDB[clean];

  const keyMap = {
    'deepfake': 'what is a deepfake', 'deepguard': 'what is deepguard',
    'vit': 'what is vision transformer', 'vision transformer': 'what is vision transformer',
    'mtcnn': 'what is mtcnn', 'celeb-df': 'what is celeb-df', 'celebdf': 'what is celeb-df',
    'confidence': 'what does confidence score mean', 'uncertain': 'what is uncertain prediction',
    'limitation': 'what are the limitations', 'future': 'what is future scope',
    'video': 'can the system detect videos', 'technolog': 'what technologies were used',
    'accurac': 'what is accuracy', 'precision': 'what is precision', 'recall': 'what is recall',
    'f1': 'what is f1 score', 'patch': 'what is patch embedding', 'positional': 'what is positional embedding',
    'self-attention': 'what is self attention', 'attention': 'what is self attention',
    'multi-head': 'what is multi head attention', 'mlp': 'what is mlp head',
    'gan': 'what is gan', 'cnn': 'what is cnn', 'dataset': 'what dataset was used',
    'preprocessing': 'what is preprocessing', 'preprocess': 'what is preprocessing',
    'explainable': 'what is explainable ai', 'xai': 'what is explainable ai',
  };
  for (const kw in keyMap) {
    if (clean.includes(kw)) { const k = keyMap[kw]; if (faqDB[k]) return faqDB[k]; }
  }

  // Overlap scoring
  const stop = new Set(['what','is','why','how','does','the','a','an','of','for','to','about','in','on','with','can','are','was','were','do','tell','me','use','used']);
  const kws  = (str) => str.split(/\s+/).map(w => w.replace(/[^a-z0-9]/g,'')).filter(w => w && !stop.has(w));
  const qkws = kws(clean);
  let bestKey = null, best = 0;
  for (const key in faqDB) {
    const kkws = kws(key);
    let score = 0;
    qkws.forEach(qw => kkws.forEach(kw => {
      if (kw === qw) score += 15;
      else if (kw.includes(qw) || qw.includes(kw)) score += 7;
    }));
    if (score > best) { best = score; bestKey = key; }
  }
  if (best >= 10) return faqDB[bestKey];
  return null;
}

/* ── DOM ────────────────────────────────────────────────────── */
const messagesEl      = document.getElementById('chat-messages');
const inputEl         = document.getElementById('chat-input');
const sendBtn         = document.getElementById('chat-send-btn');
const typingIndicator = document.getElementById('typing-indicator');
const clearChatBtn    = document.getElementById('clear-chat-btn');

/* ── Add message ────────────────────────────────────────────── */
function addMsg(text, role) {
  const div = document.createElement('div');
  div.className = `msg ${role}`;
  const icon = role === 'user' ? 'fa-user' : 'fa-robot';
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  div.innerHTML = `
    <div class="msg-avatar"><i class="fa-solid ${icon}"></i></div>
    <div>
      <div class="msg-bubble">${escMsg(text)}</div>
      <div class="msg-time">${time}</div>
    </div>`;
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function escMsg(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code style="background:rgba(255,255,255,0.08);padding:1px 5px;border-radius:3px;font-family:monospace;font-size:0.85em;">$1</code>');
}

/* ── Typing animation ───────────────────────────────────────── */
async function addAssistantMsg(text) {
  // Show typing indicator
  typingIndicator && typingIndicator.classList.remove('hidden');
  messagesEl.scrollTop = messagesEl.scrollHeight;

  // Simulate think time
  await delay(450 + Math.random() * 400);

  typingIndicator && typingIndicator.classList.add('hidden');

  // Build message element and type it out
  const div = document.createElement('div');
  div.className = 'msg assistant';
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';
  const timeDiv = document.createElement('div');
  timeDiv.className = 'msg-time';
  timeDiv.textContent = time;
  div.innerHTML = '<div class="msg-avatar"><i class="fa-solid fa-robot"></i></div>';
  const contentWrap = document.createElement('div');
  contentWrap.appendChild(bubble);
  contentWrap.appendChild(timeDiv);
  div.appendChild(contentWrap);
  messagesEl.appendChild(div);

  // Type text character by character
  let i = 0;
  const speed = Math.max(8, Math.min(18, 2000 / text.length));
  await new Promise(resolve => {
    const timer = setInterval(() => {
      bubble.innerHTML = escMsg(text.slice(0, i + 1));
      messagesEl.scrollTop = messagesEl.scrollHeight;
      i++;
      if (i >= text.length) { clearInterval(timer); resolve(); }
    }, speed);
  });
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

/* ── Send ───────────────────────────────────────────────────── */
async function handleSend() {
  const text = inputEl.value.trim();
  if (!text) return;
  inputEl.value = '';
  inputEl.disabled = true;
  sendBtn.disabled = true;

  addMsg(text, 'user');

  // Hide suggested chips after first message
  const bar = document.getElementById('suggested-bar');
  if (bar) bar.style.display = 'none';

  const answer = await getFaqAnswer(text);
  await addAssistantMsg(answer || "I don't have a specific answer for that question in my knowledge base. Try asking about: Vision Transformer, MTCNN, Celeb-DF, deepfakes, confidence scores, GAN, CNN, preprocessing, or the model's limitations.");

  inputEl.disabled = false;
  sendBtn.disabled = false;
  inputEl.focus();
}

/* ── Chip clicks ────────────────────────────────────────────── */
document.getElementById('suggested-chips')?.addEventListener('click', (e) => {
  if (e.target.classList.contains('chip')) {
    inputEl.value = e.target.getAttribute('data-q') || '';
    handleSend();
  }
});

sendBtn?.addEventListener('click', handleSend);
inputEl?.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } });

clearChatBtn?.addEventListener('click', () => {
  messagesEl.innerHTML = '';
  const bar = document.getElementById('suggested-bar');
  if (bar) bar.style.display = '';
  addWelcomeCard();
  dgToast('Chat cleared.', 'info');
});

/* ── Welcome card ───────────────────────────────────────────── */
function addWelcomeCard() {
  const div = document.createElement('div');
  div.className = 'chat-welcome fade-in';
  div.innerHTML = `
    <div class="chat-welcome-icon">🤖</div>
    <div class="chat-welcome-title">DeepGuard AI Assistant</div>
    <div class="chat-welcome-text">
      Hello! I'm your deepfake detection knowledge assistant. I can explain <strong>Vision Transformers</strong>, 
      <strong>MTCNN</strong>, <strong>Celeb-DF</strong>, model metrics, and much more.<br/><br/>
      Click a suggested question above or type your own!
    </div>`;
  messagesEl.appendChild(div);
}

/* ── Init ───────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  const user = dgPageBoot('assistant');
  if (!user) return;
  addWelcomeCard();
  inputEl && inputEl.focus();
});
