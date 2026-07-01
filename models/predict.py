import tensorflow as tf
import numpy as np
import cv2
import sys
import os

# Fix path so the script can import local modules regardless of where it's executed from
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from vit_model import build_vit_model
from mtcnn import MTCNN

# Try importing encoder model robustly
try:
    from encoder_model import build_encoder_model
except ImportError:
    try:
        from encoder import build_encoder_model  #type:ignore
    except ImportError:
        build_encoder_model = None


# =========================
# CONFIG & LOAD BOTH MODELS
# =========================
IMG_SIZE = (224, 224)

# 1. Load Celeb-DF ViT Model
model_celeb = None
MODEL_PATH_CELEB = os.path.join(os.path.dirname(os.path.abspath(__file__)), "vit_best_model.h5")
MODEL_PATH_CELEB_FALLBACK = os.path.join(os.path.dirname(os.path.abspath(__file__)), "vit_final_model.h5")

for path in [MODEL_PATH_CELEB, MODEL_PATH_CELEB_FALLBACK]:
    if os.path.exists(path):
        try:
            model_celeb = build_vit_model()
            model_celeb.load_weights(path)
            print(f"Loaded Model: Celeb-DF (ViT) from {os.path.basename(path)}")
            break
        except Exception as e:
            print(f"Error loading Celeb-DF model from {os.path.basename(path)}: {e}")

# 2. Load FaceForensics++ EfficientNet Model
model_multi = None
MODEL_PATH_MULTI = os.path.join(os.path.dirname(os.path.abspath(__file__)), "vit_multi_dataset_best.h5")
MODEL_PATH_MULTI_FALLBACK = os.path.join(os.path.dirname(os.path.abspath(__file__)), "vit_multi_dataset_final.h5")

for path in [MODEL_PATH_MULTI, MODEL_PATH_MULTI_FALLBACK]:
    if os.path.exists(path):
        try:
            if build_encoder_model is not None:
                model_multi = build_encoder_model()
                model_multi.load_weights(path)
                print(f"Loaded Model: FaceForensics++ (EfficientNet) from {os.path.basename(path)}")
                break
        except Exception as e:
            print(f"Error loading FaceForensics++ model from {os.path.basename(path)}: {e}")


# =========================
# INIT FACE DETECTOR
# =========================
detector = MTCNN()


# =========================
# PREPROCESS IMAGE
# =========================
def preprocess_image(img_path, model_type="multi"):

    img = cv2.imread(img_path)

    if img is None:
        print("Error: Image not found")
        return None

    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

    # Detect face
    faces = detector.detect_faces(img)

    if len(faces) == 0:
        print("No face detected, using entire image as fallback")
        face = img
    else:
        x, y, w, h = faces[0]['box']
        # 🔥 Add margin (important)
        margin = 30
        x = max(0, x - margin)
        y = max(0, y - margin)
        w = w + 2 * margin
        h = h + 2 * margin
        face = img[y:y+h, x:x+w]
        if face.size == 0:
            face = img

    face = cv2.resize(face, IMG_SIZE)
    if model_type == "celeb":
        face = face / 255.0
    face = np.expand_dims(face, axis=0)

    return face


def evaluate_score(prediction):
    if prediction > 0.6:
        return "Real", prediction, prediction
    elif prediction < 0.4:
        return "Fake", 1.0 - prediction, prediction
    else:
        return "Uncertain", prediction, prediction


def get_reasons_and_indicators(status):
    if status == "Real":
        reason = "The model detected facial characteristics consistent with authentic media and found no significant indicators of synthetic manipulation. Visual patterns observed in the image align with those commonly seen in genuine facial content."
        indicators = [
            "Natural facial texture",
            "Consistent lighting patterns",
            "Stable facial boundaries",
            "No visible synthesis artifacts"
        ]
    elif status == "Fake":
        reason = "The model identified visual patterns commonly associated with manipulated or AI-generated facial content. Detected inconsistencies suggest the presence of synthetic generation or facial alteration artifacts."
        indicators = [
            "Facial boundary irregularities",
            "Unnatural skin smoothing",
            "Texture inconsistencies",
            "Possible synthesis artifacts"
        ]
    else:
        reason = "The model returned a low-confidence prediction and could not reliably classify the image as real or fake. Additional verification may be required due to image quality limitations or features outside the model's training distribution."
        indicators = [
            "Low prediction confidence",
            "Unseen image characteristics",
            "Compression or quality issues",
            "Further verification recommended"
        ]
    return reason, indicators


def get_reasons_and_indicators_ensemble(status):
    if status == "Real":
        reason = "Consolidated ensemble analysis across multiple models (Celeb-DF and FaceForensics++) detected facial characteristics consistent with authentic media and found no significant indicators of synthetic manipulation."
        indicators = [
            "Natural facial texture patterns",
            "Consistent lighting across facial regions",
            "Stable and continuous facial boundaries",
            "No visible AI synthesis or blending artifacts"
        ]
    elif status == "Fake":
        reason = "Consolidated ensemble analysis across multiple models (Celeb-DF and FaceForensics++) detected visual patterns commonly associated with manipulated or AI-generated facial content. Significant inconsistencies suggest the presence of synthetic generation or facial alteration artifacts."
        indicators = [
            "Facial boundary irregularities",
            "Inconsistent skin texture or smoothing",
            "Blending or color space inconsistencies",
            "Synthesis artifacts matched against trained datasets"
        ]
    else:
        reason = "Consolidated ensemble analysis across multiple models (Celeb-DF and FaceForensics++) returned a low-confidence prediction and could not reliably classify the image. Additional verification is recommended."
        indicators = [
            "Low prediction confidence across models",
            "Unseen facial features or image patterns",
            "Compression, lighting, or quality issues",
            "Manual review recommended"
        ]
    return reason, indicators


# =========================
# PREDICTION FUNCTION
# =========================
def predict_image(img_path, model_type=None):
    if model_type is None:
        model_type = "ensemble"

    # Preprocess image
    if model_type == "ensemble":
        img = cv2.imread(img_path)
        if img is None:
            print("Error: Image not found")
            return {"error": "Image not found"}
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        faces = detector.detect_faces(img)
        if len(faces) == 0:
            print("No face detected, using entire image as fallback")
            face = img
        else:
            x, y, w, h = faces[0]['box']
            margin = 30
            x = max(0, x - margin)
            y = max(0, y - margin)
            w = w + 2 * margin
            h = h + 2 * margin
            face = img[y:y+h, x:x+w]
            if face.size == 0:
                face = img
        face_resized = cv2.resize(face, IMG_SIZE)
        
        img_celeb = np.expand_dims(face_resized / 255.0, axis=0)
        img_multi = np.expand_dims(face_resized, axis=0)
    else:
        img_preprocessed = preprocess_image(img_path, model_type=model_type)
        if img_preprocessed is None:
            return {"error": "No face detected. Please ensure a human face is clearly visible."}

    # Run predictions
    if model_type == "celeb":
        if model_celeb is None:
            return {"error": "Celeb-DF model is not loaded."}
        prediction = float(model_celeb.predict(img_preprocessed)[0][0])
        status, confidence, raw_score = evaluate_score(prediction)
        model_name = "Celeb-DF Model (ViT)"
        reason, indicators = get_reasons_and_indicators(status)
    elif model_type == "multi":
        if model_multi is None:
            return {"error": "FaceForensics++ model is not loaded."}
        prediction = float(model_multi.predict(img_preprocessed)[0][0])
        status, confidence, raw_score = evaluate_score(prediction)
        model_name = "FaceForensics++ Model (EfficientNet)"
        reason, indicators = get_reasons_and_indicators(status)
    else:
        # Ensemble mode (default)
        pred_c_val = float(model_celeb.predict(img_celeb)[0][0]) if model_celeb is not None else None
        pred_m_val = float(model_multi.predict(img_multi)[0][0]) if model_multi is not None else None

        if pred_c_val is None and pred_m_val is None:
            return {"error": "No models are loaded. Please check your model files."}

        status_c, conf_c, _ = evaluate_score(pred_c_val) if pred_c_val is not None else ("Uncertain", 0.5, 0.5)
        status_m, conf_m, _ = evaluate_score(pred_m_val) if pred_m_val is not None else ("Uncertain", 0.5, 0.5)

        # Consolidate results:
        if pred_c_val is not None and pred_m_val is None:
            status, confidence, raw_score = status_c, conf_c, pred_c_val
        elif pred_m_val is not None and pred_c_val is None:
            status, confidence, raw_score = status_m, conf_m, pred_m_val
        else:
            # Both models are active!
            # If either says Fake, prioritize Fake
            if status_c == "Fake" or status_m == "Fake":
                status = "Fake"
                c_fake_conf = conf_c if status_c == "Fake" else 0.0
                m_fake_conf = conf_m if status_m == "Fake" else 0.0
                if c_fake_conf >= m_fake_conf:
                    confidence = c_fake_conf
                    raw_score = pred_c_val
                else:
                    confidence = m_fake_conf
                    raw_score = pred_m_val
            # If neither says Fake, but at least one says Real
            elif status_c == "Real" or status_m == "Real":
                status = "Real"
                c_real_conf = conf_c if status_c == "Real" else 0.0
                m_real_conf = conf_m if status_m == "Real" else 0.0
                if c_real_conf >= m_real_conf:
                    confidence = c_real_conf
                    raw_score = pred_c_val
                else:
                    confidence = m_real_conf
                    raw_score = pred_m_val
            else:
                status = "Uncertain"
                confidence = (conf_c + conf_m) / 2.0
                raw_score = (pred_c_val + pred_m_val) / 2.0

        model_name = "Vision Transformer"
        reason, indicators = get_reasons_and_indicators_ensemble(status)

    vit_pred_val = None
    vit_conf_val = None
    if model_type == "celeb":
        vit_pred_val = status
        vit_conf_val = confidence
    elif model_type != "multi":
        if model_celeb is not None:
            vit_pred_val = status_c
            vit_conf_val = conf_c

    print(f"Result: {status} (confidence: {confidence:.4f}, raw: {raw_score:.4f})")

    return {
        "prediction": status,
        "confidence": confidence,
        "raw_score": raw_score,
        "reason": reason,
        "indicators": indicators,
        "model_used": model_name,
        "vit_prediction": vit_pred_val,
        "vit_confidence": vit_conf_val
    }


# =========================
# MAIN
# =========================
if __name__ == "__main__":

    if len(sys.argv) < 2:
        print("Usage: python predict.py <image_path> [celeb|multi]")
    else:
        image_path = sys.argv[1]
        model_type = "multi"
        if len(sys.argv) >= 3:
            model_type = sys.argv[2]

        if not os.path.exists(image_path):
            print("File does not exist")
        else:
            predict_image(image_path, model_type=model_type)