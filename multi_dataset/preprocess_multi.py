import os
import shutil
import random
import cv2
from mtcnn import MTCNN
from tqdm import tqdm

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_ROOT = os.path.join(SCRIPT_DIR, "FF++C32-Frames")
OUTPUT_ROOT = os.path.join(SCRIPT_DIR, "processed_faces_multi")

# Initialize face detector
detector = MTCNN()

def clear_and_make_dir(path):
    os.makedirs(path, exist_ok=True)
    for file in os.listdir(path):
        file_path = os.path.join(path, file)
        try:
            if os.path.isfile(file_path) or os.path.islink(file_path):
                os.unlink(file_path)
            elif os.path.isdir(file_path):
                shutil.rmtree(file_path)
        except Exception as e:
            print(f"Failed to delete {file_path}. Reason: {e}")

# Initialize Haar Cascades for ultra-fast face detection fallback
face_cascade = cv2.CascadeClassifier(os.path.join(cv2.data.haarcascades, 'haarcascade_frontalface_default.xml'))

def process_and_crop_image(src_path, dest_path, target_size=(224, 224), use_fallback=True):
    img = cv2.imread(src_path)
    if img is None:
        return False
        
    try:
        # 1. Try Haar Cascades (extremely fast on CPU)
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, scaleFactor=1.2, minNeighbors=4, minSize=(30, 30))
        if len(faces) > 0:
            # Sort by face size area in descending order and select the largest
            x, y, w, h = sorted(faces, key=lambda f: f[2] * f[3], reverse=True)[0]
            x = max(0, x)
            y = max(0, y)
            face = img[y:y+h, x:x+w]
            if face.size > 0:
                face = cv2.resize(face, target_size)
                cv2.imwrite(dest_path, face)
                return True

        # 2. Fallback to MTCNN if enabled and Haar Cascades misses it
        if use_fallback:
            rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            faces_mtcnn = detector.detect_faces(rgb_img)
            if faces_mtcnn:
                x, y, w, h = faces_mtcnn[0]['box']
                x = max(0, x)
                y = max(0, y)
                
                face = img[y:y+h, x:x+w]
                if face.size > 0:
                    face = cv2.resize(face, target_size)
                    cv2.imwrite(dest_path, face)
                    return True
    except Exception as e:
        pass
    return False

def process_category(folder_path, dest_dir, prefix, target_count, use_fallback=True):
    if not os.path.exists(folder_path):
        print(f"Error: Folder {folder_path} not found.")
        return 0
        
    images = [f for f in os.listdir(folder_path) if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
    images.sort()  # For determinism
    
    # Shuffle using the fixed random seed
    random.shuffle(images)
    
    success_count = 0
    skipped_no_face = 0
    
    # Using tqdm for progress bar
    pbar = tqdm(total=target_count, desc=f"Cropping {prefix}")
    
    for img in images:
        if success_count >= target_count:
            break
            
        src_path = os.path.join(folder_path, img)
        dest_name = f"{prefix}_{img}"
        dest_path = os.path.join(dest_dir, dest_name)
        
        # Try to crop face and save
        cropped = process_and_crop_image(src_path, dest_path, use_fallback=use_fallback)
        if cropped:
            success_count += 1
            pbar.update(1)
        else:
            skipped_no_face += 1
            
    pbar.close()
    print(f"  -> Successfully cropped and saved: {success_count}/{target_count} (Skipped {skipped_no_face} due to no face detected)")
    return success_count

def main():
    if not os.path.exists(DATASET_ROOT):
        print(f"Error: FF++C32-Frames dataset directory not found at {DATASET_ROOT}")
        return

    real_out = os.path.join(OUTPUT_ROOT, "Real")
    fake_out = os.path.join(OUTPUT_ROOT, "Fake")

    # If directories exist and contain enough preprocessed files, skip preprocessing
    if os.path.exists(real_out) and os.path.exists(fake_out):
        real_count = len([f for f in os.listdir(real_out) if f.lower().endswith(('.jpg', '.jpeg', '.png'))])
        fake_count = len([f for f in os.listdir(fake_out) if f.lower().endswith(('.jpg', '.jpeg', '.png'))])
        if real_count >= 4500 and fake_count >= 6000:
            print("\n[SUCCESS] Preprocessed faces already exist!")
            print(f"Total Real Images: {real_count}")
            print(f"Total Fake Images: {fake_count}")
            print("Skipping preprocessing.")
            return

    print("Cleaning output folders...")
    clear_and_make_dir(real_out)
    clear_and_make_dir(fake_out)

    # Use fixed random seed for reproducibility
    random.seed(42)

    # 1. Process REAL images (ALL 5000 images from Original)
    original_dir = os.path.join(DATASET_ROOT, "Original")
    process_category(original_dir, real_out, "original", 5000, use_fallback=True)

    # 2. Process FAKE images (1200 from each category)
    fake_categories = [
        ("Deepfakes", 1200, "deepfakes"),
        ("Face2Face", 1200, "face2face"),
        ("FaceSwap", 1200, "faceswap"),
        ("FaceShifter", 1200, "faceshifter"),
        ("NeuralTextures", 1200, "neuraltextures"),
    ]

    for folder_name, sample_size, prefix in fake_categories:
        folder_path = os.path.join(DATASET_ROOT, folder_name)
        process_category(folder_path, fake_out, prefix, sample_size, use_fallback=False)

    # Verify final counts
    final_real_count = len(os.listdir(real_out))
    final_fake_count = len(os.listdir(fake_out))
    print("\nPreprocessing Completed successfully!")
    print(f"Total Real Images copied & cropped: {final_real_count}")
    print(f"Total Fake Images copied & cropped: {final_fake_count}")

if __name__ == "__main__":
    main()
