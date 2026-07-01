# Import libraries
import os
import random
import shutil
from collections import defaultdict


SOURCE_DIR = "../processed_faces"
DEST_DIR = "../dataset_split"

TRAIN_RATIO = 0.7
VAL_RATIO = 0.15
TEST_RATIO = 0.15

classes = ["Real", "Fake"]


# Function to group frames by video name
def group_by_video(images):
    video_dict = defaultdict(list)

    for img in images:
        # Example: video1_frame23.jpg → video1
        video_name = img.split("_frame")[0]
        video_dict[video_name].append(img)

    return video_dict


def main():
    # Check if split folders exist and contain images
    splits = ["train", "val", "test"]
    already_split = True

    if not os.path.exists(DEST_DIR):
        already_split = False
    else:
        for split in splits:
            for cls in classes:
                folder = os.path.join(DEST_DIR, split, cls)
                if not os.path.exists(folder) or len([f for f in os.listdir(folder) if f.lower().endswith(('.jpg', '.jpeg', '.png'))]) == 0:
                    already_split = False
                    break
            if not already_split:
                break

    if already_split:
        print("✅ Dataset split is already complete and verified! Skipping splitting.")
        return

    # Use fixed seed for deterministic splits
    random.seed(42)

    for cls in classes:

        src_path = os.path.join(SOURCE_DIR, cls)
        if not os.path.exists(src_path):
            print(f"Warning: Source path {src_path} not found. Skipping class {cls}.")
            continue

        images = os.listdir(src_path)

        # Group frames into videos
        video_dict = group_by_video(images)

        video_list = list(video_dict.keys())

        # Shuffle videos
        random.shuffle(video_list)

        total = len(video_list)

        train_end = int(TRAIN_RATIO * total)
        val_end = int((TRAIN_RATIO + VAL_RATIO) * total)

        train_videos = video_list[:train_end]
        val_videos = video_list[train_end:val_end]
        test_videos = video_list[val_end:]

        def copy_split(videos, split_name):
            for video in videos:
                for img in video_dict[video]:

                    src_img = os.path.join(src_path, img)
                    dest_folder = os.path.join(DEST_DIR, split_name, cls)

                    os.makedirs(dest_folder, exist_ok=True)

                    dst_img = os.path.join(dest_folder, img)

                    shutil.copy(src_img, dst_img)

        copy_split(train_videos, "train")
        copy_split(val_videos, "val")
        copy_split(test_videos, "test")

    print("✅ Dataset split (video-wise from flat images) complete!")


if __name__ == "__main__":
    main()