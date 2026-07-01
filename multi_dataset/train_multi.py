import tensorflow as tf
import numpy as np
import cv2
import os
import sys

from tensorflow.keras.preprocessing.image import ImageDataGenerator #type:ignore
from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau, ModelCheckpoint

# Add project root to sys.path to safely import modules
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from models.vit_model import build_vit_model

# Try importing encoder model robustly
try:
    from models.encoder_model import build_encoder_model
except ImportError:
    try:
        from models.encoder import build_encoder_model #type:ignore 
    except ImportError:
        build_encoder_model = None

# =========================
# PATHS
# =========================
train_dir = os.path.join(SCRIPT_DIR, "dataset_split_multi/train")
val_dir = os.path.join(SCRIPT_DIR, "dataset_split_multi/val")
test_dir = os.path.join(SCRIPT_DIR, "dataset_split_multi/test")
processed_faces_dir = os.path.join(SCRIPT_DIR, "processed_faces_multi")

MODELS_DIR = os.path.join(PROJECT_ROOT, "models")
os.makedirs(MODELS_DIR, exist_ok=True)

FINAL_MODEL_PATH = os.path.join(MODELS_DIR, "vit_multi_dataset_final.h5")
BEST_MODEL_PATH = os.path.join(MODELS_DIR, "vit_multi_dataset_best.h5")

# =========================
# CONFIG
# =========================
IMG_SIZE = (224, 224)
BATCH_SIZE = 16
EPOCHS = 25

def count_files_in_dir(directory):
    if not os.path.exists(directory):
        return 0
    total = 0
    for root, dirs, files in os.walk(directory):
        total += len([f for f in files if f.lower().endswith(('.jpg', '.jpeg', '.png'))])
    return total

def count_files_with_prefix(directory, prefix):
    if not os.path.exists(directory):
        return 0
    count = 0
    for root, dirs, files in os.walk(directory):
        count += len([f for f in files if f.lower().startswith(prefix.lower())])
    return count

def print_dataset_summary():
    real_processed = os.path.join(processed_faces_dir, "Real")
    fake_processed = os.path.join(processed_faces_dir, "Fake")

    # Counts
    original_count = count_files_with_prefix(real_processed, "original_")
    deepfakes_count = count_files_with_prefix(fake_processed, "deepfakes_")
    face2face_count = count_files_with_prefix(fake_processed, "face2face_")
    faceswap_count = count_files_with_prefix(fake_processed, "faceswap_")
    faceshifter_count = count_files_with_prefix(fake_processed, "faceshifter_")
    neuraltextures_count = count_files_with_prefix(fake_processed, "neuraltextures_")

    total_real = count_files_in_dir(real_processed)
    total_fake = count_files_in_dir(fake_processed)

    train_count = count_files_in_dir(train_dir)
    val_count = count_files_in_dir(val_dir)
    test_count = count_files_in_dir(test_dir)

    print("\nDataset Summary")
    print(f"Original Images: {original_count}")
    print(f"Deepfakes Images: {deepfakes_count}")
    print(f"Face2Face Images: {face2face_count}")
    print(f"FaceSwap Images: {faceswap_count}")
    print(f"FaceShifter Images: {faceshifter_count}")
    print(f"NeuralTextures Images: {neuraltextures_count}")
    print(f"Total Real Images: {total_real}")
    print(f"Total Fake Images: {total_fake}")
    print(f"Train Images: {train_count}")
    print(f"Validation Images: {val_count}")
    print(f"Test Images: {test_count}")

def main():
    # Print the dataset summary first
    print_dataset_summary()

    # Check if final and best models already exist, skip training
    if os.path.exists(FINAL_MODEL_PATH) and os.path.exists(BEST_MODEL_PATH):
        print("\n[SUCCESS] Multi-dataset models already trained and exist!")
        print(f"Best Model: {BEST_MODEL_PATH} ({os.path.getsize(BEST_MODEL_PATH)} bytes)")
        print(f"Final Model: {FINAL_MODEL_PATH} ({os.path.getsize(FINAL_MODEL_PATH)} bytes)")
        print("Skipping training.")
        return

    # Check if directories exist
    if not os.path.exists(train_dir) or not os.path.exists(val_dir):
        print(f"\nError: Splits not found at {train_dir} and {val_dir}. Please run split_dataset_multi.py first.")
        sys.exit(1)

    # =========================
    # CUSTOM PREPROCESSING
    # =========================
    using_encoder = (build_encoder_model is not None)

    def custom_preprocess(img):
        if not using_encoder:
            img = img / 255.0

        if np.random.rand() < 0.5:
            # Scale noise std dynamically: 0.05 for [0,1], 12.75 for [0,255]
            noise_std = 12.75 if using_encoder else 0.05
            noise = np.random.normal(0, noise_std, img.shape)
            img = img + noise

        if np.random.rand() < 0.3:
            img = cv2.GaussianBlur(img, (3, 3), 0)

        clip_max = 255.0 if using_encoder else 1.0
        img = np.clip(img, 0, clip_max)
        return img

    # =========================
    # DATA GENERATORS
    # =========================
    train_datagen = ImageDataGenerator(
        preprocessing_function=custom_preprocess,
        rotation_range=25,
        zoom_range=0.2,
        horizontal_flip=True,
        brightness_range=[0.6, 1.4],
        shear_range=0.2
    )

    if using_encoder:
        val_datagen = ImageDataGenerator()  # EfficientNet handles rescaling internally
    else:
        val_datagen = ImageDataGenerator(rescale=1./255)

    train_gen = train_datagen.flow_from_directory(
        train_dir,
        target_size=IMG_SIZE,
        batch_size=BATCH_SIZE,
        class_mode='binary'
    )

    val_gen = val_datagen.flow_from_directory(
        val_dir,
        target_size=IMG_SIZE,
        batch_size=BATCH_SIZE,
        class_mode='binary'
    )

    if build_encoder_model is not None:
        full_model = build_encoder_model()
        
        # Define feature extractor model (base EfficientNet B0 output after pooling)
        feature_extractor = tf.keras.Model(inputs=full_model.input, outputs=full_model.layers[-4].output)
        
        print("\n[INFO] Pre-extracting bottleneck features to speed up CPU training...")
        
        # Create non-shuffled generators to align features and labels
        train_gen_extract = train_datagen.flow_from_directory(
            train_dir,
            target_size=IMG_SIZE,
            batch_size=BATCH_SIZE,
            class_mode='binary',
            shuffle=False
        )
        
        val_gen_extract = val_datagen.flow_from_directory(
            val_dir,
            target_size=IMG_SIZE,
            batch_size=BATCH_SIZE,
            class_mode='binary',
            shuffle=False
        )
        
        print("\nExtracting training features...")
        train_features = feature_extractor.predict(train_gen_extract)
        train_labels = train_gen_extract.classes
        
        print("\nExtracting validation features...")
        val_features = feature_extractor.predict(val_gen_extract)
        val_labels = val_gen_extract.classes
        
        # Build the head classifier model using layers from full_model
        head_input = tf.keras.Input(shape=(1280,))
        x = full_model.layers[-3](head_input)  # Dense(128)
        x = full_model.layers[-2](x)           # Dropout(0.5)
        output = full_model.layers[-1](x)      # Dense(1)
        
        head_model = tf.keras.Model(inputs=head_input, outputs=output)
        head_model.compile(
            optimizer=tf.keras.optimizers.Adam(1e-3),
            loss='binary_crossentropy',
            metrics=['accuracy']
        )
        
        # Custom Callback to save the full combined model when validation accuracy improves
        class SaveFullModelCallback(tf.keras.callbacks.Callback):
            def __init__(self, full_model, best_path):
                super().__init__()
                self.full_model = full_model
                self.best_path = best_path
                self.best_val_acc = -1.0
            
            def on_epoch_end(self, epoch, logs=None):
                logs = logs or {}
                val_acc = logs.get('val_accuracy', 0.0)
                if val_acc > self.best_val_acc:
                    self.best_val_acc = val_acc
                    self.full_model.save(self.best_path)
                    print(f"\n[INFO] Saved best full model to {self.best_path} (val_accuracy: {val_acc:.4f})")

        callbacks = [
            EarlyStopping(monitor='val_loss', patience=5, restore_best_weights=True),
            ReduceLROnPlateau(monitor='val_loss', patience=3, factor=0.3),
            SaveFullModelCallback(full_model, BEST_MODEL_PATH)
        ]
        
        print("Training Started")
        
        head_model.fit(
            train_features,
            train_labels,
            validation_data=(val_features, val_labels),
            epochs=EPOCHS,
            batch_size=BATCH_SIZE,
            callbacks=callbacks
        )
        
        print("Training Completed")
        
        # Save final full model
        full_model.save(FINAL_MODEL_PATH)
        print("Model Saved Successfully")
        
    else:
        # Fallback to ViT model directly on generators if encoder is not available
        model = build_vit_model()
        
        callbacks = [
            EarlyStopping(monitor='val_loss', patience=5, restore_best_weights=True),
            ReduceLROnPlateau(monitor='val_loss', patience=3, factor=0.3),
            ModelCheckpoint(BEST_MODEL_PATH, monitor='val_accuracy', save_best_only=True)
        ]
        
        print("Training Started")
        model.fit(
            train_gen,
            validation_data=val_gen,
            epochs=EPOCHS,
            callbacks=callbacks
        )
        print("Training Completed")
        
        model.save(FINAL_MODEL_PATH)
        print("Model Saved Successfully")

if __name__ == "__main__":
    main()
