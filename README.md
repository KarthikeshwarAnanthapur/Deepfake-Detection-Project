# Deepfake Detection using Vision Transformers

## 📌 Project Overview
This project focuses on detecting deepfake images and videos using deep learning techniques.  
We use a combination of Convolutional Neural Networks (CNN) and Vision Transformers (ViT) to identify manipulated facial content.

---

## 🎯 Objective
- Detect whether a video/image is **Real or Fake**
- Identify subtle inconsistencies in facial features
- Build an automated deepfake detection system

---

## 📂 Dataset
We used the **Celeb-DF (v2) dataset**, which contains real and deepfake videos of celebrities.

🔗 Dataset Link: https://github.com/yuezunli/celeb-deepfakeforensics

### ⚠️ Note:
- Dataset is **not included in this repository** due to large size (~10GB)
- Users must download it manually and place it in the project directory

---

## ⚙️ Project Workflow

1. Video Input (Celeb-DF dataset)
2. Frame Extraction using OpenCV
3. Face Detection using MTCNN
4. Preprocessing (crop, resize to 224x224)
5. Dataset Splitting (Train / Test / Validation)
6. Model Training (CNN + Vision Transformer)
7. Prediction (Real / Fake)

---

## 🛠️ Tools & Technologies

### 🔹 AI / Machine Learning
- Python
- OpenCV
- MTCNN
- NumPy
- TensorFlow / PyTorch
- Matplotlib

### 🔹 Backend
- FastAPI (recommended)
- Uvicorn

### 🔹 Frontend
- HTML
- CSS
- JavaScript

### 🔹 Development Tools
- VS Code
- Git & GitHub

---
