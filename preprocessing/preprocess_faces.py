#preprocess 
import cv2
import os
from mtcnn import MTCNN
from tqdm import tqdm

#OpenCV	Video processing
#os	File handling
#MTCNN	Face detection
#tqdm	Progress bar

DATASET_ROOT = "./Celeb-DF-v2"
OUTPUT_ROOT = "./processed_faces"

CATEGORIES = {
    "Celeb-real": "Real",
    "YouTube-real": "Real",
    "Celeb-synthesis": "Fake"
}

TARGET_SIZE = (224, 224)
FRAME_SKIP = 30

detector = MTCNN()


def process_video(video_path, output_dir, video_filename):

    cap = cv2.VideoCapture(video_path)

    frame_count = 0

    while True:

        ret, frame = cap.read()

        if not ret:
            break

        if frame_count % FRAME_SKIP == 0:

            try:
                rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

                faces = detector.detect_faces(rgb_frame)

                if faces:

                    x, y, w, h = faces[0]['box']

                    x = max(0, x)
                    y = max(0, y)

                    face = frame[y:y+h, x:x+w]

                    if face.size > 0:

                        face = cv2.resize(face, TARGET_SIZE)

                        img_name = f"{video_filename}_frame{frame_count}.jpg"

                        save_path = os.path.join(output_dir, img_name)

                        cv2.imwrite(save_path, face)

            except:
                # Skip bad frames instead of stopping program
                pass

        frame_count += 1

    cap.release()


def main():
    os.makedirs(os.path.join(OUTPUT_ROOT, "Real"), exist_ok=True)
    os.makedirs(os.path.join(OUTPUT_ROOT, "Fake"), exist_ok=True)

    for folder_name, label in CATEGORIES.items():
        folder_path = os.path.join(DATASET_ROOT, folder_name)
        output_dir = os.path.join(OUTPUT_ROOT, label)

        video_files = [f for f in os.listdir(folder_path) if f.endswith(".mp4")]

        print(f"\nProcessing {len(video_files)} videos from {folder_name}")

        for video in tqdm(video_files):
            video_path = os.path.join(folder_path, video)
            video_name = os.path.splitext(video)[0]

            process_video(video_path, output_dir, video_name)

    print("\nPreprocessing complete.")



if __name__ == "__main__":
    main()

'''
# Vision Transformers and ResNet usually expect 224x224 images
TARGET_SIZE = (224, 224)

# Extract 1 frame every X frames (e.g., 30 means 1 frame per second for a 30fps video)
# This prevents extracting thousands of nearly identical images from a single video.
FRAME_SKIP = 30 

# Initialize the MTCNN face detector
detector = MTCNN()

# ==========================================
# PROCESSING LOGIC
# ==========================================
def process_video(video_path, output_dir, video_filename):
    """Extracts frames from a video, crops the face, and saves them."""
    cap = cv2.VideoCapture(video_path)
    frame_count = 0
    saved_count = 0
    
    while True:
        ret, frame = cap.read()
        if not ret:
            break # End of video
            
        # Only process every Nth frame
        if frame_count % FRAME_SKIP == 0:
            # Convert BGR (OpenCV format) to RGB (MTCNN format)
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            
            # Detect faces
            results = detector.detect_faces(rgb_frame)
            
            if results:
                # Get the bounding box of the most prominent face
                # results[0] is the first face found with the highest confidence
                bounding_box = results[0]['box']
                x, y, width, height = bounding_box
                
                # Ensure coordinates are not negative (can happen if face is at the edge)
                x, y = max(0, x), max(0, y)
                
                # Crop the face out of the original frame
                cropped_face = frame[y:y+height, x:x+width]
                
                # Check if the crop is valid (sometimes MTCNN returns weird boxes on glitches)
                if cropped_face.size > 0:
                    # Resize to 224x224 for the neural network
                    resized_face = cv2.resize(cropped_face, TARGET_SIZE)
                    
                    # Save the image
                    img_name = f"{video_filename}_frame{frame_count}.jpg"
                    save_path = os.path.join(output_dir, img_name)
                    cv2.imwrite(save_path, resized_face)
                    saved_count += 1
                    
        frame_count += 1
        
    cap.release()
    return saved_count

def main():
    # Create the main output directories
    os.makedirs(os.path.join(OUTPUT_ROOT, "Real"), exist_ok=True)
    os.makedirs(os.path.join(OUTPUT_ROOT, "Fake"), exist_ok=True)
    
    # Loop through the Celeb-DF-v2 folders
    for folder_name, label in CATEGORIES.items():
        folder_path = os.path.join(DATASET_ROOT, folder_name)
        
        if not os.path.exists(folder_path):
            print(f"Warning: Folder {folder_path} not found. Skipping.")
            continue
            
        output_dir = os.path.join(OUTPUT_ROOT, label)
        video_files = [f for f in os.listdir(folder_path) if f.endswith('.mp4')]
        
        print(f"\nProcessing {len(video_files)} videos from {folder_name} (Label: {label})")
        
        # tqdm creates a nice progress bar in the terminal
        for video_file in tqdm(video_files):
            video_path = os.path.join(folder_path, video_file)
            video_basename = os.path.splitext(video_file)[0]
            
            process_video(video_path, output_dir, video_basename)

    print("\nData preprocessing complete! Your dataset is ready.")

if __name__ == "__main__":
    main()


import cv2
import os
from mtcnn import MTCNN
from tqdm import tqdm

# ===============================
# CONFIGURATION
# ===============================

DATASET_ROOT = "./Celeb-DF-v2"
OUTPUT_ROOT = "./processed_faces"

# Dataset categories
CATEGORIES = {
    "Celeb-real": "Real",
    "YouTube-real": "Real",
    "Celeb-synthesis": "Fake"
}

TARGET_SIZE = (224, 224)
FRAME_SKIP = 30   # extract 1 frame every 30 frames

# Initialize face detector
detector = MTCNN()


# ===============================
# VIDEO PROCESSING FUNCTION
# ===============================

def process_video(video_path, output_dir, video_name):

    cap = cv2.VideoCapture(video_path)
    frame_count = 0
    saved_count = 0

    while True:

        ret, frame = cap.read()

        if not ret:
            break

        # Skip frames to reduce dataset size
        if frame_count % FRAME_SKIP == 0:

            # Convert BGR to RGB
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

            # Detect faces
            faces = detector.detect_faces(rgb_frame)

            if faces:

                x, y, w, h = faces[0]['box']

                # Prevent negative coordinates
                x = max(0, x)
                y = max(0, y)

                face = frame[y:y+h, x:x+w]

                if face.size > 0:

                    face = cv2.resize(face, TARGET_SIZE)

                    img_name = f"{video_name}_frame{frame_count}.jpg"

                    save_path = os.path.join(output_dir, img_name)

                    cv2.imwrite(save_path, face)

                    saved_count += 1

        frame_count += 1

    cap.release()

    return saved_count


# ===============================
# MAIN FUNCTION
# ===============================

def main():

    # Create output folders
    os.makedirs(os.path.join(OUTPUT_ROOT, "Real"), exist_ok=True)
    os.makedirs(os.path.join(OUTPUT_ROOT, "Fake"), exist_ok=True)

    # Loop through dataset folders
    for folder_name, label in CATEGORIES.items():

        folder_path = os.path.join(DATASET_ROOT, folder_name)

        if not os.path.exists(folder_path):
            print(f"Folder not found: {folder_path}")
            continue

        output_dir = os.path.join(OUTPUT_ROOT, label)

        video_files = [f for f in os.listdir(folder_path) if f.endswith(".mp4")]

        print(f"\nProcessing {len(video_files)} videos from {folder_name}")

        for video in tqdm(video_files):

            video_path = os.path.join(folder_path, video)

            video_name = os.path.splitext(video)[0]

            process_video(video_path, output_dir, video_name)

    print("\nPreprocessing complete!")
    print("Dataset ready inside:", OUTPUT_ROOT)


# ===============================
# RUN SCRIPT
# ===============================

if __name__ == "__main__":
    main()
    '''


'''
def main():

    os.makedirs(os.path.join(OUTPUT_ROOT, "Real"), exist_ok=True)
    os.makedirs(os.path.join(OUTPUT_ROOT, "Fake"), exist_ok=True)

    MAX_VIDEOS = 300

    for folder_name, label in CATEGORIES.items():

        folder_path = os.path.join(DATASET_ROOT, folder_name)

        output_dir = os.path.join(OUTPUT_ROOT, label)

        video_files = [f for f in os.listdir(folder_path) if f.endswith(".mp4")]

        # Limit number of processed videos
        video_files = video_files[:MAX_VIDEOS]

        print(f"\nProcessing {len(video_files)} videos from {folder_name}")

        for video in tqdm(video_files):

            video_path = os.path.join(folder_path, video)

            video_name = os.path.splitext(video)[0]

            process_video(video_path, output_dir, video_name)

    print("\nPreprocessing complete.")
'''    