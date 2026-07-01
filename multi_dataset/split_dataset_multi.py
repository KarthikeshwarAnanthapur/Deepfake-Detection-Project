import os
import shutil
import random

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SOURCE_DIR = os.path.join(SCRIPT_DIR, "processed_faces_multi")
DEST_DIR = os.path.join(SCRIPT_DIR, "dataset_split_multi")

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

def main():
    if not os.path.exists(SOURCE_DIR):
        print(f"Error: Source directory {SOURCE_DIR} not found. Please run preprocessing first.")
        return

    # Check if directories exist and contain enough split files, skip splitting
    splits_check = {
        "train": {"Real": 3400, "Fake": 4100},
        "val": {"Real": 700, "Fake": 850},
        "test": {"Real": 700, "Fake": 850}
    }
    already_split = True
    for split_name, classes_needed in splits_check.items():
        for cls_name, min_files in classes_needed.items():
            folder = os.path.join(DEST_DIR, split_name, cls_name)
            if not os.path.exists(folder):
                already_split = False
                break
            count = len([f for f in os.listdir(folder) if f.lower().endswith(('.jpg', '.jpeg', '.png'))])
            if count < min_files:
                already_split = False
                break
        if not already_split:
            break
            
    if already_split:
        print("\n[SUCCESS] Dataset split already complete and verified!")
        print("Skipping splitting.")
        return

    # Use fixed seed for deterministic splits
    random.seed(42)

    classes = ["Real", "Fake"]
    
    for cls in classes:
        src_path = os.path.join(SOURCE_DIR, cls)
        if not os.path.exists(src_path):
            print(f"Warning: Class path {src_path} not found. Skipping.")
            continue
            
        images = [f for f in os.listdir(src_path) if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
        images.sort()  # Sort to ensure deterministic split
        
        # Shuffle
        random.shuffle(images)
        
        total = len(images)
        train_end = int(0.70 * total)
        val_end = int(0.85 * total)  # 70% + 15% = 85%
        
        train_images = images[:train_end]
        val_images = images[train_end:val_end]
        test_images = images[val_end:]
        
        splits = {
            "train": train_images,
            "val": val_images,
            "test": test_images
        }
        
        for split_name, split_files in splits.items():
            dest_folder = os.path.join(DEST_DIR, split_name, cls)
            clear_and_make_dir(dest_folder)
            
            print(f"Copying {len(split_files)} files to {split_name}/{cls}...")
            for img in split_files:
                src_file = os.path.join(src_path, img)
                dest_file = os.path.join(dest_folder, img)
                shutil.copy(src_file, dest_file)
                
    print("\n[SUCCESS] Dataset split complete!")

if __name__ == "__main__":
    main()
