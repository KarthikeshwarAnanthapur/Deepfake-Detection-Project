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


for cls in classes:

    src_path = os.path.join(SOURCE_DIR, cls)
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