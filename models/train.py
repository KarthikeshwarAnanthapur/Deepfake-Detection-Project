import tensorflow as tf
import numpy as np
import cv2
import os

from tensorflow.keras.preprocessing.image import ImageDataGenerator #type:ignore
from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau, ModelCheckpoint #type:ignore
from vit_model import build_vit_model


# =========================
# PATHS
# =========================
train_dir = "../dataset_split/train"
val_dir = "../dataset_split/val"
test_dir = "../dataset_split/test"


# =========================
# MODEL PATHS
# =========================
FINAL_MODEL_PATH = "vit_final_model.h5"
BEST_MODEL_PATH = "vit_best_model.h5"


# =========================
# CONFIG
# =========================
IMG_SIZE = (224, 224)
BATCH_SIZE = 16
EPOCHS = 25


# =========================
# 🔥 CHECK IF MODEL EXISTS
# =========================
if os.path.exists(FINAL_MODEL_PATH):
    print("\n✅ Model already trained!")
    print("📁 Found:", FINAL_MODEL_PATH)
    print("🚀 Skipping training...\n")

    # OPTIONAL: Load weights for evaluation/demo
    model = build_vit_model()
    model.load_weights(BEST_MODEL_PATH)

else:
    print("\n🚀 No trained model found → Starting training...\n")

    # =========================
    # CUSTOM PREPROCESSING
    # =========================
    def custom_preprocess(img):
        img = img / 255.0

        if np.random.rand() < 0.5:
            noise = np.random.normal(0, 0.05, img.shape)
            img = img + noise

        if np.random.rand() < 0.3:
            img = cv2.GaussianBlur(img, (3, 3), 0)

        img = np.clip(img, 0, 1)
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

    # =========================
    # BUILD MODEL
    # =========================
    model = build_vit_model()

    # =========================
    # CALLBACKS
    # =========================
    callbacks = [
        EarlyStopping(monitor='val_loss', patience=5, restore_best_weights=True),
        ReduceLROnPlateau(monitor='val_loss', patience=3, factor=0.3),
        ModelCheckpoint(BEST_MODEL_PATH, monitor='val_accuracy', save_best_only=True)
    ]

    # =========================
    # TRAIN
    # =========================
    model.fit(
        train_gen,
        validation_data=val_gen,
        epochs=EPOCHS,
        callbacks=callbacks
    )

    # =========================
    # SAVE FINAL MODEL
    # =========================
    model.save(FINAL_MODEL_PATH)

    print("\n✅ Training Complete!")


# =========================
# OPTIONAL TEST EVALUATION
# =========================
test_datagen = ImageDataGenerator(rescale=1./255)

test_gen = test_datagen.flow_from_directory(
    test_dir,
    target_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    class_mode='binary'
)

loss, acc = model.evaluate(test_gen)

print(f"\n🎯 Test Accuracy: {acc:.4f}")