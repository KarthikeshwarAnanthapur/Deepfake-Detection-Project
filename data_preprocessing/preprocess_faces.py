import cv2
import os
from mtcnn import MTCNN
from tqdm import tqdm

#OpenCV	Video processing
#os	File handling
#MTCNN	Face detection
#tqdm	Progress bar

DATASET_ROOT = "../Celeb-DF-v2"
OUTPUT_ROOT = "../processed_faces"

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

    MAX_VIDEOS = 1000

    for folder_name, label in CATEGORIES.items():

        folder_path = os.path.join(DATASET_ROOT, folder_name)
        if not os.path.exists(folder_path):
            print(f"Warning: Folder {folder_path} not found. Skipping.")
            continue

        output_dir = os.path.join(OUTPUT_ROOT, label)

        video_files = [f for f in os.listdir(folder_path) if f.endswith(".mp4")]

        # Limit number of processed videos
        video_files = video_files[:MAX_VIDEOS]

        all_files = os.listdir(output_dir) if os.path.exists(output_dir) else []

        # Find videos that have not been preprocessed yet
        pending_videos = []
        for video in video_files:
            video_name = os.path.splitext(video)[0]
            if not any(video_name in f for f in all_files):
                pending_videos.append(video)

        if not pending_videos:
            print(f"✅ All {len(video_files)} videos from {folder_name} are already preprocessed. Skipping.")
            continue

        print(f"\nProcessing {len(pending_videos)} pending videos from {folder_name} (out of {len(video_files)} total)")

        for video in tqdm(pending_videos):

            video_name = os.path.splitext(video)[0]

            video_path = os.path.join(folder_path, video)

            process_video(video_path, output_dir, video_name)
    print("\nPreprocessing complete.")


if __name__ == "__main__":
    main()
