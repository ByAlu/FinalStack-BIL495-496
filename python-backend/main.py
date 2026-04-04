from fastapi import FastAPI, File, UploadFile
from fastapi.responses import StreamingResponse
import numpy as np
import cv2
import io
app = FastAPI()


@app.get("/")
def read_root():
    return {"Hello": "World"}


@app.post("/filter")
async def filter_ultrasound(image: UploadFile = File(...)):
    # Read file bytes
    data = await image.read()
    if not data:
        return {"message": "No data received"}

    # Convert bytes to NumPy array
    nparr = np.frombuffer(data, np.uint8)
    
    # Decode image 
    img = cv2.imdecode(nparr, cv2.IMREAD_GRAYSCALE)
    if img is None:
        return {"message": "Could not decode image"}

    # Apply speckle noise removal
    denoised_img = remove_speckle_noise(img)

    # Encode back to PNG
    _, buffer = cv2.imencode(".png", denoised_img)
    return StreamingResponse(io.BytesIO(buffer.tobytes()), media_type="image/png")

# Preprocessing functions
#TODO: Add lee filtering and median filter options
def remove_speckle_noise(img: np.ndarray, h: int = 10) -> np.ndarray:
    """
    Remove speckle noise from a grayscale image using Non-Local Means Denoising.

    Parameters:
    - img: Grayscale image as a NumPy array
    - h: Filter strength (higher h removes more noise but may blur)

    Returns:
    - Denoised image as NumPy array
    """
    denoised_img = cv2.fastNlMeansDenoising(img, None, h=h, templateWindowSize=7, searchWindowSize=21)
    return denoised_img