import io
import re
import logging
from fastapi import APIRouter, File, UploadFile, HTTPException
from PIL import Image, UnidentifiedImageError
from pyzbar.pyzbar import decode

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/decode")
async def decode_qr(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        try:
            img = Image.open(io.BytesIO(contents))
            # Simple validation to ensure it's an image
            img.verify()
            # Need to reopen after verify
            img = Image.open(io.BytesIO(contents))
        except UnidentifiedImageError:
            raise HTTPException(status_code=400, detail="Invalid image file format.")
            
        decoded_objects = decode(img)
        
        if not decoded_objects:
            raise HTTPException(status_code=400, detail="No QR code detected in the image.")
            
        qr_data = decoded_objects[0].data.decode('utf-8').strip()
        
        # Extremely basic validation: if it doesn't look like a URL, maybe it's text
        # But for PhishGuard we specifically want URLs.
        if not re.match(r'^https?://', qr_data):
            # Try to prepend http if it looks like a domain
            if "." in qr_data and " " not in qr_data and "\n" not in qr_data:
                qr_data = "http://" + qr_data
            else:
                raise HTTPException(status_code=400, detail="The decoded QR code does not appear to contain a URL.")
                
        return {"url": qr_data, "filename": file.filename}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error decoding QR code")
        raise HTTPException(status_code=500, detail=f"Failed to process image: {str(e)}")
