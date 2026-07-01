# 🛡️ DeepGuard – Deepfake Detection using Vision Transformers

<p align="center">
  <img src="https://cdn.corenexis.com/f/P32gm3JQ7g9.png" alt="DeepGuard Architecture" width="100%">
</p>

<p align="center">

![Python](https://img.shields.io/badge/Python-3.10+-blue?logo=python)
![TensorFlow](https://img.shields.io/badge/TensorFlow-Deep%20Learning-orange?logo=tensorflow)
![OpenCV](https://img.shields.io/badge/OpenCV-Computer%20Vision-green?logo=opencv)
![FastAPI](https://img.shields.io/badge/FastAPI-Backend-009688?logo=fastapi)
![Vision Transformer](https://img.shields.io/badge/Model-Vision%20Transformer-purple)
![License](https://img.shields.io/badge/License-Academic-lightgrey)

</p>

---

# 📖 Project Overview

**DeepGuard** is an AI-powered **Deepfake Detection System** that detects manipulated facial images and videos using **Vision Transformers (ViT)**.

The project implements a complete end-to-end pipeline including:

- Video Frame Extraction
- Face Detection using MTCNN
- Face Preprocessing
- Dataset Preparation
- Vision Transformer Training
- Real-Time Prediction using a Web Interface

To improve model robustness and generalization, the project utilizes both the **Celeb-DF (v2)** and **FaceForensics++** datasets.

---

# ✨ Features

- ✅ Image Deepfake Detection
- ✅ Video Deepfake Detection
- ✅ Vision Transformer (ViT) Model
- ✅ Face Detection using MTCNN
- ✅ Automatic Frame Extraction
- ✅ Face Cropping & Resizing
- ✅ Dataset Splitting
- ✅ Real-Time Prediction
- ✅ Web Interface
- ✅ Multiple Dataset Support
- ✅ Binary Classification (Real / Fake)

---

# 🏗️ System Architecture

<p align="center">
<img src="https://cdn.corenexis.com/f/P32gm3JQ7g9.png" width="100%">
</p>

The project follows a **3-Tier Architecture**.

---

## 🖥️ Client Layer

Responsible for user interaction.

### Functions

- Upload Image or Video
- Interactive Web Interface
- Display Prediction Results
- User Friendly Interface

---

## ⚙️ Application Layer

Responsible for AI processing.

### Modules

- Frame Extraction (OpenCV)
- Face Detection (MTCNN)
- Face Cropping
- Image Resizing (224×224)
- Dataset Preparation
- Dataset Splitting
- Vision Transformer Training
- Deepfake Prediction

---

## 💾 Data Layer

Stores datasets and trained models.

Contains:

- Celeb-DF Dataset
- FaceForensics++ Dataset
- Processed Face Images
- Trained Vision Transformer Models

---

# 🎯 Objectives

- Detect manipulated facial images and videos.
- Classify media as **Real** or **Fake**.
- Develop a robust Vision Transformer based Deepfake Detection System.
- Improve prediction accuracy using multiple benchmark datasets.
- Provide an easy-to-use web interface.

---

# 📂 Datasets Used

The project uses two benchmark datasets.

---

## 1️⃣ Celeb-DF (v2)

Primary dataset used for training.

### Original Dataset

https://github.com/yuezunli/celeb-deepfakeforensics

### Preprocessed Face Dataset

https://www.kaggle.com/datasets/udaypyarasani/deepfake-preprocessed-celeb-df-video-faces

---

## 2️⃣ FaceForensics++

To improve generalization and reduce dataset bias, FaceForensics++ was incorporated into the training pipeline.

### Dataset Statistics

| Category | Images |
|----------|-------:|
| Original | 5000 |
| Deepfakes | 1200 |
| Face2Face | 1200 |
| FaceSwap | 1200 |
| FaceShifter | 1200 |
| NeuralTextures | 1200 |

### Total Images

- **Real Images : 5000**
- **Fake Images : 6000**
- **Total Images : 11000**

### Preprocessed Face Dataset

https://www.kaggle.com/datasets/udaypyarasani/faceforensics-preprocessed-face-dataset

---

# 💡 Why FaceForensics++?

Initially, the Vision Transformer model was trained only on the **Celeb-DF (v2)** dataset.

Although the model performed well on Celeb-DF images, it showed limited performance on unseen internet deepfake images due to dataset-specific characteristics.

To improve generalization, the project incorporates **FaceForensics++**, which contains multiple face manipulation techniques:

- Deepfakes
- Face2Face
- FaceSwap
- FaceShifter
- NeuralTextures

This exposes the model to a broader range of deepfake artifacts, enabling it to learn generalized forgery patterns rather than memorizing a single dataset.

---

# 🔄 Project Workflow

```text
Input Image / Video
        │
        ▼
Frame Extraction (OpenCV)
        │
        ▼
Face Detection (MTCNN)
        │
        ▼
Face Cropping
        │
        ▼
Image Resize (224×224)
        │
        ▼
Dataset Preparation
        │
        ▼
Train / Validation / Test Split
        │
        ▼
Vision Transformer (ViT)
        │
        ▼
Prediction
        │
        ▼
Real ✅ / Fake ❌
```

---

# 📁 Project Structure

```text
Cyber_Deepfake_Project/

├── backend/
│
├── frontend/
│   ├── index.html
│   ├── style.css
│   ├── script.js
│   └── faq.json
│
├── data_preprocessing/
│
├── dataset_split/
│
├── processed_faces/
│
├── multi_dataset/
│   ├── FF++C32-Frames/
│   ├── processed_faces_multi/
│   ├── dataset_split_multi/
│   ├── preprocess_multi.py
│   ├── split_dataset_multi.py
│   └── train_multi.py
│
├── models/
│   ├── vit_model.py
│   ├── encoder_model.py
│   ├── train.py
│   ├── train_multi.py
│   ├── predict.py
│   ├── vit_best_model.h5
│   ├── vit_final_model.h5
│   ├── vit_multi_dataset_best.h5
│   └── vit_multi_dataset_final.h5
│
└── README.md
```

---

# 🤖 Deep Learning Model

The project uses a **Vision Transformer (ViT)** for binary image classification.

### Supported Models

- Vision Transformer trained on Celeb-DF
- Vision Transformer trained on FaceForensics++

Prediction Output

- ✅ Real
- ❌ Fake

---

# 🛠️ Technologies Used

## AI / Machine Learning

- Python
- TensorFlow
- Vision Transformers (ViT)
- OpenCV
- MTCNN
- NumPy
- Matplotlib

---

## Backend

- FastAPI
- Uvicorn

---

## Frontend

- HTML
- CSS
- JavaScript

---

## Development Tools

- VS Code
- Git
- GitHub

---

# ⚙️ Installation

Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
```

Move into the project

```bash
cd Cyber_Deepfake_Project
```

Install dependencies

```bash
pip install -r requirements.txt
```

---

# ▶️ Run the Project

Start the backend

```bash
uvicorn backend.app:app --reload
```

Open the frontend and upload an image or video for prediction.

---

# 📊 Future Improvements

- Train on additional benchmark datasets (e.g., DFDC) to further improve generalization.
- Develop a unified multi-dataset Vision Transformer model.
- Integrate Explainable AI (XAI) techniques such as Grad-CAM or attention visualization.
- Add confidence-based prediction reporting.
- Deploy the application to the cloud for public access.
- Support real-time webcam deepfake detection.
- Extend the system for deepfake video timeline analysis.
- Optimize inference speed for edge devices.

---

# 👨💻 Contributors

| Name | GitHub |
|------|--------|
| **Pyarasani Uday Kumar** | https://github.com/PyarasaniUday |
| **Ekshitha** | https://github.com/ekshitha86 |
| **Karthikeshwar Ananthapur** | https://github.com/KarthikeshwarAnanthapur |
| **Harika** | https://github.com/harika880 |
| **Sri Hitha** | https://github.com/srihithabuka |

---

# 📜 License

This project is developed for **academic, educational, and research purposes**.

The original datasets belong to their respective authors.

Please follow the licensing terms of:

- Celeb-DF (v2)
- FaceForensics++

when using the datasets.

---

# ⭐ Support

If you found this project useful:

⭐ Star this repository

🍴 Fork this repository

🤝 Contribute to improve DeepGuard

---

# 📧 Contact

For suggestions, collaborations, or improvements, feel free to connect with any of the project contributors through their GitHub profiles.

---

**If you use this project in your research or academic work, please consider giving appropriate credit to the original dataset authors (Celeb-DF and FaceForensics++) as well as this repository.**
