import sys
import os
from fastapi import FastAPI, UploadFile
import shutil

# 🔥 Fix path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from models.predict import predict_image
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.post("/predict")
async def predict(file: UploadFile, model_type: str = "ensemble"):
    file_path = f"temp_{file.filename}"

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    result = predict_image(file_path, model_type=model_type)

    # Clean up temp file
    if os.path.exists(file_path):
        try:
            os.remove(file_path)
        except Exception:
            pass

    return result
