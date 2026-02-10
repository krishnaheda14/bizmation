/**
 * Catalog Upload Component
 * 
 * Allows uploading jewelry images via camera or file picker
 * Uses AI recognition to auto-fill product details
 */

import React, { useState, useRef } from 'react';
import { Camera, Upload, X, Loader2, Sparkles } from 'lucide-react';

interface RecognitionResult {
  jewelry_type: string;
  metal: string;
  confidence: number;
}

interface SuggestedDetails {
  name: string;
  description: string;
  hsn_code: string;
  category: string;
  metal_type: string;
  tags: string[];
}

interface CatalogFormData {
  name: string;
  description: string;
  category: string;
  metalType: string;
  purity: number;
  weightGrams: number;
  makingCharges: number;
  hsnCode: string;
  tags: string[];
}

export const CatalogUpload: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [recognition, setRecognition] = useState<RecognitionResult | null>(null);
  const [formData, setFormData] = useState<CatalogFormData>({
    name: '',
    description: '',
    category: '',
    metalType: 'GOLD',
    purity: 22,
    weightGrams: 0,
    makingCharges: 0,
    hsnCode: '71131910',
    tags: [],
  });
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Start camera
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: 1920, height: 1080 }
      });
      
      setShowCamera(true);
      
      // Wait for next tick to ensure modal is rendered
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(err => console.error('Play failed:', err));
          streamRef.current = stream;
        }
      }, 100);
    } catch (error) {
      console.error('Failed to start camera:', error);
      alert('Failed to access camera. Please check permissions and ensure you\'re using HTTPS.');
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  };

  // Capture photo from camera
  const capturePhoto = () => {
    if (!videoRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(videoRef.current, 0, 0);
    
    canvas.toBlob((blob) => {
      if (!blob) return;
      
      const file = new File([blob], `jewelry-${Date.now()}.jpg`, { type: 'image/jpeg' });
      handleFileSelect(file);
      stopCamera();
    }, 'image/jpeg', 0.95);
  };

  // Handle file selection
  const handleFileSelect = async (file: File) => {
    setSelectedFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Automatically recognize jewelry
    await recognizeJewelry(file);
  };

  // Recognize jewelry from image with multiple AI fallbacks
  const recognizeJewelry = async (file: File) => {
    setIsRecognizing(true);
    
    // Try multiple AI services in order of preference (DeepSeek → OpenAI → Gemini → Local)
    const aiServices = [
      {
        name: 'DeepSeek AI',
        url: '/api/ai/deepseek-vision', // Primary: DeepSeek via backend proxy
      },
      {
        name: 'Primary AI Service',
        url: `${import.meta.env.VITE_AI_SERVICE_URL}/catalog/upload-with-recognition`,
      },
      {
        name: 'OpenAI GPT-4 Vision',
        url: '/api/ai/openai-vision', // Fallback to backend proxy
      },
      {
        name: 'Google Gemini Vision',
        url: '/api/ai/gemini-vision', // Fallback to backend proxy
      },
      {
        name: 'Local Vision Model',
        url: '/api/ai/local-vision', // Local model fallback
      },
    ];
    
    for (const service of aiServices) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('remove_background', 'true');
        formData.append('auto_fill', 'true');

        const response = await fetch(service.url, {
          method: 'POST',
          body: formData,
          signal: AbortSignal.timeout(15000), // 15 second timeout
        });

        if (!response.ok) {
          console.warn(`${service.name} failed with status ${response.status}, trying next...`);
          continue;
        }

        const data = await response.json();
        
        if (data.success && data.recognition) {
          setRecognition(data.recognition);
          
          // Auto-fill form with suggested details
          if (data.suggested_details) {
            const suggested: SuggestedDetails = data.suggested_details;
            setFormData(prev => ({
              ...prev,
              name: suggested.name || prev.name,
              description: suggested.description || prev.description,
              category: suggested.category || prev.category,
              metalType: suggested.metal_type || prev.metalType,
              hsnCode: suggested.hsn_code || prev.hsnCode,
              tags: suggested.tags || prev.tags,
            }));
          }

          alert(`✨ Recognized by ${service.name}: ${data.recognition.jewelry_type} (${data.recognition.metal}) - Confidence: ${(data.recognition.confidence * 100).toFixed(0)}%`);
          setIsRecognizing(false);
          return; // Success - exit function
        }
      } catch (error) {
        console.warn(`${service.name} failed:`, error);
        // Continue to next service
      }
    }
    
    // All services failed - provide helpful message
    setRecognition(null);
    alert('⚠️ AI recognition services are currently unavailable. Please fill product details manually.\n\nTip: You can still save the image - our AI will process it later when services are online.');
    setIsRecognizing(false);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile) {
      alert('Please select an image first');
      return;
    }

    try {
      // Upload to backend (API endpoint to be implemented)
      const uploadData = new FormData();
      uploadData.append('image', selectedFile);
      uploadData.append('data', JSON.stringify(formData));

      const response = await fetch('/api/catalog/items', {
        method: 'POST',
        body: uploadData,
      });

      const result = await response.json();
      
      if (result.success) {
        alert('✅ Catalog item added successfully!');
        resetForm();
      } else {
        alert('Failed to add catalog item');
      }
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload. Please try again.');
    }
  };

  // Reset form
  const resetForm = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setRecognition(null);
    setFormData({
      name: '',
      description: '',
      category: '',
      metalType: 'GOLD',
      purity: 22,
      weightGrams: 0,
      makingCharges: 0,
      hsnCode: '71131910',
      tags: [],
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
          <Sparkles className="text-yellow-500" />
          Add to Catalog (AI-Powered)
        </h2>

        {/* Image Upload Section */}
        <div className="mb-6">
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 bg-gray-50 dark:bg-gray-900/30">
            {!previewUrl ? (
              <div className="text-center">
                <div className="flex justify-center gap-4 mb-4">
                  <button
                    type="button"
                    onClick={startCamera}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Camera size={20} />
                    Take Photo
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    <Upload size={20} />
                    Upload Image
                  </button>
                </div>
                
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  📸 AI will automatically detect jewelry type and metal
                </p>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file);
                  }}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="relative">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="max-h-96 mx-auto rounded-lg"
                />
                
                <button
                  type="button"
                  onClick={resetForm}
                  className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600"
                >
                  <X size={20} />
                </button>

                {isRecognizing && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
                    <div className="text-white text-center">
                      <Loader2 className="animate-spin mx-auto mb-2" size={40} />
                      <p>🔍 AI Recognizing Jewelry...</p>
                    </div>
                  </div>
                )}

                {recognition && (
                  <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="font-semibold text-green-800">
                      ✅ Detected: {recognition.jewelry_type.toUpperCase()} - {recognition.metal.toUpperCase()}
                    </p>
                    <p className="text-sm text-green-600">
                      Confidence: {(recognition.confidence * 100).toFixed(0)}%
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Camera Modal */}
        {showCamera && (
          <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-4xl w-full">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white">Capture Jewelry Photo</h3>
                <button 
                  onClick={stopCamera} 
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
              
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full rounded-lg mb-4 bg-black min-h-[400px] max-h-[600px]"
                style={{ objectFit: 'contain' }}
              />
              
              <button
                onClick={capturePhoto}
                className="w-full py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-lg flex items-center justify-center gap-2"
              >
                <span className="text-2xl">📸</span> Capture Photo
              </button>
            </div>
          </div>
        )}

        {/* Form */}
        {previewUrl && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Product Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="e.g., Gold Necklace"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Category *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Select Category</option>
                  <option value="ring">Ring</option>
                  <option value="necklace">Necklace</option>
                  <option value="earring">Earrings</option>
                  <option value="bracelet">Bracelet</option>
                  <option value="anklet">Anklet</option>
                  <option value="mangalsutra">Mangalsutra</option>
                  <option value="bangles">Bangles</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Metal Type *
                </label>
                <select
                  value={formData.metalType}
                  onChange={(e) => setFormData({ ...formData, metalType: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="GOLD">Gold</option>
                  <option value="SILVER">Silver</option>
                  <option value="PLATINUM">Platinum</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Purity *
                </label>
                <select
                  value={formData.purity}
                  onChange={(e) => setFormData({ ...formData, purity: Number(e.target.value) })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="24">24K</option>
                  <option value="22">22K</option>
                  <option value="18">18K</option>
                  <option value="14">14K</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Weight (grams) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.weightGrams}
                  onChange={(e) => setFormData({ ...formData, weightGrams: Number(e.target.value) })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Making Charges (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.makingCharges}
                  onChange={(e) => setFormData({ ...formData, makingCharges: Number(e.target.value) })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  HSN Code *
                </label>
                <input
                  type="text"
                  value={formData.hsnCode}
                  onChange={(e) => setFormData({ ...formData, hsnCode: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="71131910"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Product description..."
              />
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
              >
                ✅ Add to Catalog
              </button>
              
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-3 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
