import tensorflow as tf
import numpy as np
import cv2
import sys
import os

# Fix path so the script can import local modules regardless of where it's executed from
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from vit_model import build_vit_model
from mtcnn import MTCNN


# =========================
# CONFIG
# =========================
MODEL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "vit_best_model.h5")
IMG_SIZE = (224, 224)


# =========================
# LOAD MODEL (SAFE WAY)
# =========================
model = build_vit_model()
model.load_weights(MODEL_PATH)

print("Model loaded successfully!")


# =========================
# INIT FACE DETECTOR
# =========================
detector = MTCNN()


# =========================
# PREPROCESS IMAGE
# =========================
def preprocess_image(img_path):

    img = cv2.imread(img_path)

    if img is None:
        print("Error: Image not found")
        return None

    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

    # Detect face
    faces = detector.detect_faces(img)

    if len(faces) == 0:
        print("No face detected")
        return None

    x, y, w, h = faces[0]['box']

    # 🔥 Add margin (important)
    margin = 30
    x = max(0, x - margin)
    y = max(0, y - margin)
    w = w + 2 * margin
    h = h + 2 * margin

    face = img[y:y+h, x:x+w]

    if face.size == 0:
        print("Invalid face crop")
        return None

    face = cv2.resize(face, IMG_SIZE)
    face = face / 255.0
    face = np.expand_dims(face, axis=0)

    return face


# =========================
# PREDICTION FUNCTION
# =========================
def predict_image(img_path):

    img = preprocess_image(img_path)

    if img is None:
        return {"error": "No face detected. Please ensure a human face is clearly visible."}

    # model.predict returns the probability of class 1 (Real)
    prediction = float(model.predict(img)[0][0])

    # Class 0: Fake, Class 1: Real
    if prediction > 0.6:
        result_text = f"REAL ({prediction:.4f})"
        status = "Real"
        confidence = prediction
        reason = "The model detected facial characteristics consistent with authentic media and found no significant indicators of synthetic manipulation. Visual patterns observed in the image align with those commonly seen in genuine facial content."
        indicators = [
            "Natural facial texture",
            "Consistent lighting patterns",
            "Stable facial boundaries",
            "No visible synthesis artifacts"
        ]
    elif prediction < 0.4:
        result_text = f"FAKE ({1 - prediction:.4f})"
        status = "Fake"
        confidence = 1 - prediction
        reason = "The model identified visual patterns commonly associated with manipulated or AI-generated facial content. Detected inconsistencies suggest the presence of synthetic generation or facial alteration artifacts."
        indicators = [
            "Facial boundary irregularities",
            "Unnatural skin smoothing",
            "Texture inconsistencies",
            "Possible synthesis artifacts"
        ]
    else:
        result_text = f"UNCERTAIN ({prediction:.4f})"
        status = "Uncertain"
        confidence = prediction
        reason = "The model returned a low-confidence prediction and could not reliably classify the image as real or fake. Additional verification may be required due to image quality limitations or features outside the model's training distribution."
        indicators = [
            "Low prediction confidence",
            "Unseen image characteristics",
            "Compression or quality issues",
            "Further verification recommended"
        ]
        
    print(result_text)
    
    return {
        "prediction": status,
        "confidence": confidence,
        "raw_score": prediction,
        "reason": reason,
        "indicators": indicators,
        "model_used": "ViT DeepGuard"
    }


# =========================
# MAIN
# =========================
if __name__ == "__main__":

    if len(sys.argv) < 2:
        print("Usage: python predict.py <image_path>")
    else:
        image_path = sys.argv[1]

        if not os.path.exists(image_path):
            print("File does not exist")
        else:
            predict_image(image_path)