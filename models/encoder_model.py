import tensorflow as tf
from tensorflow.keras.applications import EfficientNetB0 # type: ignore
from tensorflow.keras.layers import GlobalAveragePooling2D, Dense, Dropout  # type: ignore
from tensorflow.keras.models import Model  # type: ignore


def build_encoder_model():

    # Pretrained encoder
    base_model = EfficientNetB0(
        weights='imagenet',
        include_top=False,
        input_shape=(224, 224, 3)
    )

    # Freeze initial layers
    for layer in base_model.layers:
        layer.trainable = False

    x = base_model.output
    x = GlobalAveragePooling2D()(x)

    # Your classification head
    x = Dense(128, activation='relu')(x)
    x = Dropout(0.5)(x)

    output = Dense(1, activation='sigmoid')(x)

    model = Model(inputs=base_model.input, outputs=output)

    model.compile(
        optimizer='adam',
        loss='binary_crossentropy',
        metrics=['accuracy']
    )

    return model