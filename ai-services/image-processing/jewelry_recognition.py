"""
Jewelry Recognition Module

Uses YOLO for object detection and custom classification for jewelry type and metal detection
"""

import cv2
import numpy as np
from PIL import Image
from typing import Dict, List, Tuple, Optional
import torch
from ultralytics import YOLO  # YOLOv8
import logging

logger = logging.getLogger(__name__)


class JewelryRecognizer:
    """
    Recognizes jewelry types and metals from images using computer vision
    """
    
    def __init__(self):
        """Initialize YOLO model and classification parameters"""
        logger.info("Initializing Jewelry Recognizer...")
        
        # Load YOLOv8 model (nano version for speed)
        # In production, you would fine-tune this on jewelry dataset
        self.yolo_model = YOLO('yolov8n.pt')
        
        # Jewelry type keywords for classification
        self.jewelry_types = {
            'ring': ['ring', 'band', 'engagement ring', 'wedding ring'],
            'necklace': ['necklace', 'chain', 'pendant', 'locket'],
            'earring': ['earring', 'ear stud', 'hoop', 'drop earring'],
            'bracelet': ['bracelet', 'bangle', 'cuff', 'wristband'],
            'anklet': ['anklet', 'ankle bracelet'],
            'brooch': ['brooch', 'pin'],
            'mangalsutra': ['mangalsutra', 'thali'],
            'nose_ring': ['nose ring', 'nath'],
            'bangles': ['bangles', 'kada'],
            'waist_belt': ['waist belt', 'vaddanam', 'belly chain'],
        }
        
        # Metal detection color ranges (HSV)
        self.metal_colors = {
            'yellow_gold': {
                'lower': np.array([15, 50, 50]),
                'upper': np.array([35, 255, 255]),
                'keywords': ['gold', 'yellow gold', '22k gold', '24k gold', '18k gold']
            },
            'rose_gold': {
                'lower': np.array([0, 30, 100]),
                'upper': np.array([15, 180, 255]),
                'keywords': ['rose gold', 'pink gold', 'red gold']
            },
            'white_gold_silver': {
                'lower': np.array([0, 0, 150]),
                'upper': np.array([180, 50, 255]),
                'keywords': ['white gold', 'silver', 'platinum', 'white metal']
            },
        }
        
        logger.info("Jewelry Recognizer initialized successfully")
    
    def recognize(self, image: Image.Image) -> Dict:
        """
        Recognize jewelry type and metal from image
        
        Args:
            image: PIL Image object
            
        Returns:
            Dictionary with jewelry_type, metal, confidence, and bounding_box
        """
        # Convert PIL to CV2
        cv_image = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        
        # Detect objects using YOLO
        results = self.yolo_model(cv_image, conf=0.3)
        
        # Analyze detected objects
        jewelry_detections = []
        
        for result in results:
            boxes = result.boxes
            for box in boxes:
                # Get bounding box coordinates
                x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                confidence = box.conf[0].cpu().numpy()
                class_id = int(box.cls[0].cpu().numpy())
                class_name = result.names[class_id]
                
                # Crop detected region
                cropped = cv_image[int(y1):int(y2), int(x1):int(x2)]
                
                # Classify jewelry type based on shape and features
                jewelry_type = self._classify_jewelry_type(cropped, class_name)
                
                # Detect metal based on color analysis
                metal = self._detect_metal(cropped)
                
                jewelry_detections.append({
                    'jewelry_type': jewelry_type,
                    'metal': metal,
                    'confidence': float(confidence),
                    'bounding_box': {
                        'x1': int(x1), 'y1': int(y1),
                        'x2': int(x2), 'y2': int(y2)
                    },
                    'detected_class': class_name
                })
        
        # If no specific jewelry detected, analyze full image
        if not jewelry_detections:
            jewelry_type = self._classify_jewelry_type(cv_image)
            metal = self._detect_metal(cv_image)
            
            return {
                'jewelry_type': jewelry_type,
                'metal': metal,
                'confidence': 0.6,  # Lower confidence for full image analysis
                'bounding_box': None,
                'detected_class': 'unknown'
            }
        
        # Return the detection with highest confidence
        best_detection = max(jewelry_detections, key=lambda x: x['confidence'])
        return best_detection
    
    def _classify_jewelry_type(self, image: np.ndarray, detected_class: str = '') -> str:
        """
        Classify jewelry type based on shape analysis and detected class
        
        Args:
            image: OpenCV image (BGR)
            detected_class: Pre-detected class from YOLO
            
        Returns:
            Jewelry type string
        """
        # Check detected class against jewelry types
        detected_lower = detected_class.lower()
        for jewelry_type, keywords in self.jewelry_types.items():
            for keyword in keywords:
                if keyword in detected_lower:
                    return jewelry_type
        
        # Shape-based classification
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        edges = cv2.Canny(blurred, 50, 150)
        
        # Find contours
        contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        if contours:
            # Analyze largest contour
            largest_contour = max(contours, key=cv2.contourArea)
            perimeter = cv2.arcLength(largest_contour, True)
            approx = cv2.approxPolyDP(largest_contour, 0.04 * perimeter, True)
            
            # Get bounding rect aspect ratio
            x, y, w, h = cv2.boundingRect(largest_contour)
            aspect_ratio = float(w) / h if h > 0 else 1
            
            # Calculate circularity
            area = cv2.contourArea(largest_contour)
            circularity = 4 * np.pi * area / (perimeter * perimeter) if perimeter > 0 else 0
            
            # Classify based on shape features
            if circularity > 0.7 and aspect_ratio > 0.8 and aspect_ratio < 1.2:
                # Circular shape - likely ring or bangle
                if aspect_ratio > 0.95:
                    return 'ring'
                else:
                    return 'bracelet'
            elif aspect_ratio > 0.3 and aspect_ratio < 0.7:
                # Vertical elongated - likely earring or pendant
                return 'earring'
            elif aspect_ratio > 1.5:
                # Horizontal elongated - likely necklace or bracelet
                if w > h * 3:
                    return 'necklace'
                else:
                    return 'bracelet'
        
        # Default fallback
        return 'jewelry'
    
    def _detect_metal(self, image: np.ndarray) -> str:
        """
        Detect metal type based on color analysis
        
        Args:
            image: OpenCV image (BGR)
            
        Returns:
            Metal type string
        """
        # Convert to HSV for better color detection
        hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
        
        # Calculate percentage of each metal color
        metal_percentages = {}
        
        for metal_name, color_range in self.metal_colors.items():
            mask = cv2.inRange(hsv, color_range['lower'], color_range['upper'])
            percentage = (np.sum(mask > 0) / mask.size) * 100
            metal_percentages[metal_name] = percentage
        
        # Determine dominant metal
        if metal_percentages['yellow_gold'] > 10:
            return 'gold'
        elif metal_percentages['rose_gold'] > 8:
            return 'rose_gold'
        elif metal_percentages['white_gold_silver'] > 15:
            return 'silver'
        else:
            # Fallback: analyze brightness
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            avg_brightness = np.mean(gray)
            
            if avg_brightness > 180:
                return 'silver'
            elif avg_brightness > 100:
                return 'gold'
            else:
                return 'unknown'
    
    def recognize_batch(self, images: List[Image.Image]) -> List[Dict]:
        """
        Recognize multiple jewelry images in batch
        
        Args:
            images: List of PIL Image objects
            
        Returns:
            List of recognition results
        """
        results = []
        for image in images:
            try:
                result = self.recognize(image)
                results.append(result)
            except Exception as e:
                logger.error(f"Error recognizing image: {e}")
                results.append({
                    'jewelry_type': 'unknown',
                    'metal': 'unknown',
                    'confidence': 0.0,
                    'error': str(e)
                })
        
        return results


# Global instance
recognizer: Optional[JewelryRecognizer] = None


def get_recognizer() -> JewelryRecognizer:
    """Get or create global recognizer instance"""
    global recognizer
    if recognizer is None:
        recognizer = JewelryRecognizer()
    return recognizer
