import tensorflow as tf
from tensorflow.keras import layers, Model #type:ignore


def build_vit_model(input_shape=(224, 224, 3), patch_size=16, num_patches=196, projection_dim=64):

    inputs = layers.Input(shape=input_shape)

    # Create patches
    patches = layers.Conv2D(
        filters=projection_dim,
        kernel_size=patch_size,
        strides=patch_size
    )(inputs)

    patches = layers.Reshape((num_patches, projection_dim))(patches)

    # Positional encoding
    positions = tf.range(start=0, limit=num_patches, delta=1)
    position_embedding = layers.Embedding(input_dim=num_patches, output_dim=projection_dim)(positions)

    encoded = patches + position_embedding

    # Transformer blocks
    for _ in range(4):  # number of transformer layers
        x1 = layers.LayerNormalization()(encoded)
        attention_output = layers.MultiHeadAttention(
            num_heads=4,
            key_dim=projection_dim
        )(x1, x1)

        x2 = layers.Add()([attention_output, encoded])

        x3 = layers.LayerNormalization()(x2)
        x3 = layers.Dense(projection_dim * 2, activation="relu")(x3)
        x3 = layers.Dense(projection_dim)(x3)

        encoded = layers.Add()([x3, x2])

    # Classification head
    representation = layers.LayerNormalization()(encoded)
    representation = layers.GlobalAveragePooling1D()(representation)

    x = layers.Dense(128, activation="relu")(representation)
    x = layers.Dropout(0.5)(x)

    output = layers.Dense(1, activation="sigmoid")(x)

    model = Model(inputs=inputs, outputs=output)

    model.compile(
        optimizer=tf.keras.optimizers.Adam(1e-4),
        loss="binary_crossentropy",
        metrics=["accuracy"]
    )

    return model