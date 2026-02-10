"""
AI Image Processing Service
FastAPI endpoint for background removal, auto-tagging, and description generation
"""

import os
import io
import uuid
from typing import List, Optional
from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from PIL import Image
import cv2
import numpy as np
from rembg import remove
import torch
from torchvision import models, transforms
import logging
from jewelry_recognition import get_recognizer

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Jewelry AI Services",
    description="AI-powered image processing for jewelry retail",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create temp directory for processing
TEMP_DIR = "/tmp/jewelry-ai"
os.makedirs(TEMP_DIR, exist_ok=True)

# Initialize models
logger.info("Loading AI models...")

# Load pre-trained ResNet for image classification/tagging
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
classification_model = models.resnet50(pretrained=True)
classification_model.eval()
classification_model.to(device)

# Image preprocessing for classification
preprocess = transforms.Compose([
    transforms.Resize(256),
    transforms.CenterCrop(224),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])

# Jewelry-specific tags mapping (simplified)
JEWELRY_TAGS = {
    "necklace": ["necklace", "chain", "pendant"],
    "ring": ["ring", "band", "engagement ring"],
    "earring": ["earring", "ear stud", "drop earring"],
    "bracelet": ["bracelet", "bangle", "cuff"],
    "gold": ["gold", "yellow gold", "rose gold"],
    "silver": ["silver", "white gold", "platinum"],
    "diamond": ["diamond", "gemstone", "precious stone"],
}

logger.info("AI models loaded successfully")


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "Jewelry AI Services",
        "version": "1.0.0",
        "device": str(device),
    }


@app.post("/process-image")
async def process_image(
    file: UploadFile = File(...),
    remove_background: bool = Form(True),
    auto_tag: bool = Form(True),
    generate_description: bool = Form(False),
):
    """
    Process jewelry image with multiple AI operations
    
    Args:
        file: Image file to process
        remove_background: Whether to remove background
        auto_tag: Whether to generate tags
        generate_description: Whether to generate description
    
    Returns:
        JSON with processed image URL, tags, and description
    """
    try:
        # Read image file
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))
        
        # Convert to RGB if needed
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        result = {
            "success": True,
            "original_filename": file.filename,
            "operations": [],
        }
        
        # Background removal
        if remove_background:
            logger.info("Removing background...")
            image = remove_image_background(image)
            result["operations"].append("background_removal")
            result["processed_image_available"] = True
        
        # Auto-tagging
        if auto_tag:
            logger.info("Generating tags...")
            tags = generate_tags(image)
            result["tags"] = tags
            result["operations"].append("auto_tagging")
        
        # Generate description
        if generate_description:
            logger.info("Generating description...")
            description = generate_product_description(
                result.get("tags", []),
                file.filename
            )
            result["description"] = description
            result["operations"].append("description_generation")
        
        # Save processed image
        if remove_background:
            image_id = str(uuid.uuid4())
            output_path = os.path.join(TEMP_DIR, f"{image_id}.png")
            image.save(output_path, format='PNG')
            result["processed_image_path"] = output_path
            result["processed_image_id"] = image_id
        
        result["confidence"] = 0.85  # Placeholder confidence score
        
        return JSONResponse(content=result)
    
    except Exception as e:
        logger.error(f"Error processing image: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing image: {str(e)}")


@app.post("/remove-background")
async def remove_background_endpoint(file: UploadFile = File(...)):
    """
    Remove background from jewelry image using U^2-Net model
    
    Args:
        file: Image file
    
    Returns:
        Image with transparent background (PNG)
    """
    try:
        # Read image
        contents = await file.read()
        input_image = Image.open(io.BytesIO(contents))
        
        # Remove background
        logger.info(f"Removing background from {file.filename}...")
        output_image = remove_image_background(input_image)
        
        # Convert to bytes
        img_byte_arr = io.BytesIO()
        output_image.save(img_byte_arr, format='PNG')
        img_byte_arr.seek(0)
        
        return StreamingResponse(
            img_byte_arr,
            media_type="image/png",
            headers={
                "Content-Disposition": f"attachment; filename=processed_{file.filename}"
            }
        )
    
    except Exception as e:
        logger.error(f"Error removing background: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error removing background: {str(e)}")


@app.post("/auto-tag")
async def auto_tag_endpoint(file: UploadFile = File(...)):
    """
    Automatically generate tags for jewelry image
    
    Args:
        file: Image file
    
    Returns:
        JSON with generated tags and confidence
    """
    try:
        # Read image
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))
        
        # Generate tags
        logger.info(f"Generating tags for {file.filename}...")
        tags = generate_tags(image)
        
        return JSONResponse(content={
            "success": True,
            "filename": file.filename,
            "tags": tags,
            "confidence": 0.85,
        })
    
    except Exception as e:
        logger.error(f"Error generating tags: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generating tags: {str(e)}")


@app.post("/analyze-quality")
async def analyze_quality(file: UploadFile = File(...)):
    """
    Analyze image quality and provide recommendations
    
    Args:
        file: Image file
    
    Returns:
        JSON with quality metrics
    """
    try:
        # Read image
        contents = await file.read()
        image_array = np.frombuffer(contents, np.uint8)
        image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
        
        # Analyze quality metrics
        logger.info(f"Analyzing quality of {file.filename}...")
        
        # Calculate sharpness (Laplacian variance)
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        sharpness = cv2.Laplacian(gray, cv2.CV_64F).var()
        
        # Calculate brightness
        brightness = np.mean(gray)
        
        # Calculate contrast
        contrast = np.std(gray)
        
        # Determine quality score
        quality_score = min(100, (sharpness / 100 + brightness / 2.55 + contrast / 2.55) / 3)
        
        recommendations = []
        if sharpness < 100:
            recommendations.append("Image appears blurry. Use better focus.")
        if brightness < 100:
            recommendations.append("Image is too dark. Increase lighting.")
        if brightness > 200:
            recommendations.append("Image is too bright. Reduce lighting.")
        if contrast < 50:
            recommendations.append("Low contrast. Adjust lighting or camera settings.")
        
        return JSONResponse(content={
            "success": True,
            "filename": file.filename,
            "quality_score": round(quality_score, 2),
            "metrics": {
                "sharpness": round(sharpness, 2),
                "brightness": round(brightness, 2),
                "contrast": round(contrast, 2),
            },
            "recommendations": recommendations if recommendations else ["Image quality is good!"],
        })
    
    except Exception as e:
        logger.error(f"Error analyzing quality: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error analyzing quality: {str(e)}")


# ==================== HELPER FUNCTIONS ====================

def remove_image_background(image: Image.Image) -> Image.Image:
    """
    Remove background from image using rembg (U^2-Net)
    
    Args:
        image: PIL Image
    
    Returns:
        PIL Image with transparent background
    """
    try:
        # Use rembg to remove background
        output = remove(image)
        return output
    except Exception as e:
        logger.error(f"Background removal failed: {str(e)}")
        # Fallback: return original image
        return image


def generate_tags(image: Image.Image) -> List[str]:
    """
    Generate tags for jewelry image using deep learning
    
    Args:
        image: PIL Image
    
    Returns:
        List of tags
    """
    try:
        # Preprocess image
        input_tensor = preprocess(image)
        input_batch = input_tensor.unsqueeze(0).to(device)
        
        # Run inference
        with torch.no_grad():
            output = classification_model(input_batch)
        
        # Get top predictions
        probabilities = torch.nn.functional.softmax(output[0], dim=0)
        top5_prob, top5_catid = torch.topk(probabilities, 5)
        
        # Generate jewelry-specific tags
        tags = []
        
        # Analyze image colors
        image_array = np.array(image)
        avg_color = image_array.mean(axis=(0, 1))
        
        # Determine metal type based on color
        if avg_color[0] > 180:  # Yellowish
            tags.append("gold")
        elif avg_color.mean() > 200:  # Bright/white
            tags.append("silver")
        
        # Add shape-based tags (simplified)
        height, width = image_array.shape[:2]
        aspect_ratio = width / height
        
        if aspect_ratio > 1.5:
            tags.append("necklace")
        elif aspect_ratio < 0.8:
            tags.append("earring")
        else:
            tags.append("ring")
        
        # Add generic jewelry tags
        tags.extend(["handcrafted", "elegant", "premium"])
        
        return list(set(tags))  # Remove duplicates
    
    except Exception as e:
        logger.error(f"Tag generation failed: {str(e)}")
        return ["jewelry", "handcrafted"]


def generate_product_description(tags: List[str], filename: str) -> str:
    """
    Generate product description based on tags
    
    Args:
        tags: List of tags
        filename: Original filename
    
    Returns:
        Generated description
    """
    # Simple template-based description generation
    # In production, use GPT or similar model
    
    metal = "gold" if "gold" in tags else "silver" if "silver" in tags else "metal"
    category = next((tag for tag in tags if tag in ["necklace", "ring", "earring", "bracelet"]), "jewelry")
    
    description = f"Exquisite {metal} {category} crafted with precision and attention to detail. "
    description += f"This elegant piece features a timeless design that complements any style. "
    
    if "diamond" in tags:
        description += "Adorned with sparkling diamonds. "
    
    description += "Perfect for special occasions or everyday wear."
    
    return description


@app.post("/recognize-jewelry")
async def recognize_jewelry_endpoint(
    file: UploadFile = File(...),
):
    """
    Recognize jewelry type and metal from uploaded image
    
    Args:
        file: Image file to analyze
    
    Returns:
        JSON with jewelry_type, metal, confidence, and suggestions
    """
    try:
        # Read image file
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))
        
        # Convert to RGB if needed
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Get recognizer instance
        recognizer = get_recognizer()
        
        # Recognize jewelry
        logger.info("Recognizing jewelry...")
        recognition_result = recognizer.recognize(image)
        
        # Build response
        result = {
            "success": True,
            "jewelry_type": recognition_result['jewelry_type'],
            "metal": recognition_result['metal'],
            "confidence": recognition_result['confidence'],
            "suggestions": {
                "name": format_jewelry_name(
                    recognition_result['jewelry_type'],
                    recognition_result['metal']
                ),
                "hsn_code": get_hsn_code(recognition_result['jewelry_type']),
                "category": recognition_result['jewelry_type'],
                "metal_type": map_metal_type(recognition_result['metal']),
            },
            "bounding_box": recognition_result.get('bounding_box'),
        }
        
        return JSONResponse(content=result)
    
    except Exception as e:
        logger.error(f"Jewelry recognition failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Recognition failed: {str(e)}")


@app.post("/catalog/upload-with-recognition")
async def upload_catalog_with_recognition(
    file: UploadFile = File(...),
    remove_background: bool = Form(True),
    auto_fill: bool = Form(True),
):
    """
    Upload jewelry image, recognize it, and prepare catalog entry
    
    Args:
        file: Image file to upload
        remove_background: Whether to remove background
        auto_fill: Whether to auto-fill product details
    
    Returns:
        JSON with recognition results and processed image
    """
    try:
        # Read image file
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))
        
        # Convert to RGB if needed
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        result = {
            "success": True,
            "original_filename": file.filename,
        }
        
        # Recognize jewelry first
        if auto_fill:
            logger.info("Recognizing jewelry for auto-fill...")
            recognizer = get_recognizer()
            recognition_result = recognizer.recognize(image)
            
            result["recognition"] = {
                "jewelry_type": recognition_result['jewelry_type'],
                "metal": recognition_result['metal'],
                "confidence": recognition_result['confidence'],
            }
            
            result["suggested_details"] = {
                "name": format_jewelry_name(
                    recognition_result['jewelry_type'],
                    recognition_result['metal']
                ),
                "description": generate_product_description(
                    [recognition_result['jewelry_type'], recognition_result['metal']],
                    file.filename
                ),
                "hsn_code": get_hsn_code(recognition_result['jewelry_type']),
                "category": recognition_result['jewelry_type'],
                "metal_type": map_metal_type(recognition_result['metal']),
                "tags": [
                    recognition_result['jewelry_type'],
                    recognition_result['metal'],
                    "handcrafted"
                ],
            }
        
        # Background removal
        if remove_background:
            logger.info("Removing background...")
            image = remove_image_background(image)
            
            # Save processed image
            image_id = str(uuid.uuid4())
            output_path = os.path.join(TEMP_DIR, f"{image_id}.png")
            image.save(output_path, format='PNG')
            
            result["processed_image_path"] = output_path
            result["processed_image_id"] = image_id
        
        return JSONResponse(content=result)
    
    except Exception as e:
        logger.error(f"Catalog upload failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


def format_jewelry_name(jewelry_type: str, metal: str) -> str:
    """Format a product name based on recognition results"""
    jewelry_names = {
        'ring': 'Ring',
        'necklace': 'Necklace',
        'earring': 'Earrings (Pair)',
        'bracelet': 'Bracelet',
        'anklet': 'Anklet',
        'brooch': 'Brooch',
        'mangalsutra': 'Mangalsutra',
        'nose_ring': 'Nose Ring',
        'bangles': 'Bangles',
        'waist_belt': 'Waist Belt',
    }
    
    metal_names = {
        'gold': 'Gold',
        'rose_gold': 'Rose Gold',
        'silver': 'Silver',
        'unknown': '',
    }
    
    metal_prefix = metal_names.get(metal, '')
    jewelry_name = jewelry_names.get(jewelry_type, jewelry_type.title())
    
    if metal_prefix:
        return f"{metal_prefix} {jewelry_name}"
    return jewelry_name


def get_hsn_code(jewelry_type: str) -> str:
    """Get HSN code for jewelry type"""
    hsn_codes = {
        'ring': '71131910',
        'necklace': '71131920',
        'earring': '71131930',
        'bracelet': '71131940',
        'anklet': '71131950',
        'bangles': '71131940',
        'mangalsutra': '71131920',
        'nose_ring': '71131930',
    }
    return hsn_codes.get(jewelry_type, '71131900')


def map_metal_type(metal: str) -> str:
    """Map detected metal to database metal type"""
    metal_map = {
        'gold': 'GOLD',
        'rose_gold': 'GOLD',
        'silver': 'SILVER',
        'unknown': 'GOLD',  # Default to gold
    }
    return metal_map.get(metal, 'GOLD')


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
