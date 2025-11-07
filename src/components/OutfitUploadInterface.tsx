'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Camera, Upload, X, Check, AlertCircle } from 'lucide-react';

// Client-side image compression function
const compressImageClientSide = async (dataUrl: string, maxSizeKB: number = 100): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Cannot get canvas context'));
          return;
        }
        
        // Calculate new dimensions
        let { width, height } = img;
        const maxDimension = 800;
        
        if (width > height && width > maxDimension) {
          height = (height * maxDimension) / width;
          width = maxDimension;
        } else if (height > maxDimension) {
          width = (width * maxDimension) / height;
          height = maxDimension;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        
        // Try different quality levels
        const tryCompress = (quality: number) => {
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const sizeKB = blob.size / 1024;
                if (sizeKB <= maxSizeKB || quality <= 0.1) {
                  const reader = new FileReader();
                  reader.onload = () => {
                    const result = reader.result as string;
                    if (result && result.startsWith('data:image/')) {
                      resolve(result);
                    } else {
                      reject(new Error('Compression produced invalid data URL'));
                    }
                  };
                  reader.onerror = () => reject(new Error('Failed to read compressed blob'));
                  reader.readAsDataURL(blob);
                } else {
                  // Try lower quality
                  tryCompress(Math.max(0.1, quality - 0.1));
                }
              } else {
                reject(new Error('Canvas compression failed - no blob produced'));
              }
            },
            'image/jpeg',
            quality
          );
        };
        
        tryCompress(0.8);
      } catch (error) {
        reject(new Error(`Canvas error: ${error}`));
      }
    };
    
    img.onerror = () => reject(new Error('Failed to load image for compression'));
    img.src = dataUrl;
  });
};

interface ClothingItem {
  id: string;
  name: string;
  color: string;
  style: string;
  image: string;
  category: 'topwear' | 'bottomwear';
}

interface OutfitPairing {
  topwear: {
    name: string;
    color: string;
    style: string;
  };
  bottomwear: {
    name: string;
    color: string;
    style: string;
  };
  accessories: string[];
  description: string;
  confidence: number;
  occasion: string;
  styling_tips: string[];
}

interface OutfitUploadInterfaceProps {
  onItemsUploaded: (topwears: ClothingItem[], bottomwears: ClothingItem[]) => void;
  onPairingsGenerated: (pairings: OutfitPairing[]) => void;
  onClose: () => void;
  userPoints: number;
  onPointsUpdate: (newPoints: number) => void;
  hideGeneratePairingsButton?: boolean;
}

export default function OutfitUploadInterface({ 
  onItemsUploaded, 
  onPairingsGenerated,
  onClose, 
  userPoints, 
  onPointsUpdate,
  hideGeneratePairingsButton = false
}: OutfitUploadInterfaceProps) {
  const [topwears, setTopwears] = useState<ClothingItem[]>([]);
  const [bottomwears, setBottomwears] = useState<ClothingItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const topwearInputRef = useRef<HTMLInputElement>(null);
  const bottomwearInputRef = useRef<HTMLInputElement>(null);

  // Load items from localStorage on mount
  useEffect(() => {
    try {
      const storedTopwears = localStorage.getItem('wardrobe_topwears');
      const storedBottomwears = localStorage.getItem('wardrobe_bottomwears');
      
      if (storedTopwears) {
        const parsed = JSON.parse(storedTopwears);
        // Filter out items with corrupted/empty images
        const validTopwears = parsed.filter((item: any) => 
          item.image && 
          item.image.length > 100 && // Minimum reasonable size for a data URL
          item.image.includes(',')
        );
        if (validTopwears.length !== parsed.length) {
          console.warn(`Filtered out ${parsed.length - validTopwears.length} corrupted topwear items`);
          localStorage.setItem('wardrobe_topwears', JSON.stringify(validTopwears));
        }
        setTopwears(validTopwears);
      }
      if (storedBottomwears) {
        const parsed = JSON.parse(storedBottomwears);
        // Filter out items with corrupted/empty images
        const validBottomwears = parsed.filter((item: any) => 
          item.image && 
          item.image.length > 100 && // Minimum reasonable size for a data URL
          item.image.includes(',')
        );
        if (validBottomwears.length !== parsed.length) {
          console.warn(`Filtered out ${parsed.length - validBottomwears.length} corrupted bottomwear items`);
          localStorage.setItem('wardrobe_bottomwears', JSON.stringify(validBottomwears));
        }
        setBottomwears(validBottomwears);
      }
    } catch (error) {
      console.error('Error loading wardrobe from localStorage:', error);
      // Clear corrupted localStorage
      localStorage.removeItem('wardrobe_topwears');
      localStorage.removeItem('wardrobe_bottomwears');
    }
  }, []);

  // Save items to localStorage whenever they change
  useEffect(() => {
    try {
      const dataToStore = JSON.stringify(topwears);
      // Check if data is too large for localStorage (typically 5-10MB limit)
      if (dataToStore.length > 4 * 1024 * 1024) { // 4MB safety limit
        console.warn('Topwear data too large for localStorage, skipping storage');
        return;
      }
      localStorage.setItem('wardrobe_topwears', dataToStore);
    } catch (error) {
      console.error('Error saving topwears to localStorage:', error);
      // Clear localStorage if it's full
      try {
        localStorage.removeItem('wardrobe_topwears');
      } catch (clearError) {
        console.error('Failed to clear localStorage:', clearError);
      }
    }
  }, [topwears]);

  useEffect(() => {
    try {
      const dataToStore = JSON.stringify(bottomwears);
      // Check if data is too large for localStorage (typically 5-10MB limit)
      if (dataToStore.length > 4 * 1024 * 1024) { // 4MB safety limit
        console.warn('Bottomwear data too large for localStorage, skipping storage');
        return;
      }
      localStorage.setItem('wardrobe_bottomwears', dataToStore);
    } catch (error) {
      console.error('Error saving bottomwears to localStorage:', error);
      // Clear localStorage if it's full
      try {
        localStorage.removeItem('wardrobe_bottomwears');
      } catch (clearError) {
        console.error('Failed to clear localStorage:', clearError);
      }
    }
  }, [bottomwears]);

  const handleFileSelect = useCallback(async (
    files: FileList | null, 
    category: 'topwear' | 'bottomwear'
  ) => {
    if (!files) return;
    
    setError(null);
    setUploading(true);
    setUploadProgress(0);
    
    try {
      const newItems: ClothingItem[] = [];
      const maxItems = category === 'topwear' ? 5 : 5;
      const currentItems = category === 'topwear' ? topwears : bottomwears;
      
      if (currentItems.length + files.length > maxItems) {
        setError(`Maximum ${maxItems} ${category}s allowed`);
        setUploading(false);
        return;
      }
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Validate file type
        if (!file.type.startsWith('image/')) {
          setError('Please select only image files');
          setUploading(false);
          return;
        }
        
        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          setError('Image size must be less than 5MB');
          setUploading(false);
          return;
        }
        
        // Convert image to base64 and compress if needed
        let base64: string;
        try {
          base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async () => {
              const result = reader.result as string;
              if (result && result.startsWith('data:image/')) {
                try {
                  // Validate the base64 data before compression
                  const base64Data = result.split(',')[1];
                  if (!base64Data || base64Data.length === 0) {
                    throw new Error('Empty base64 data');
                  }
                  
                  // Test if base64 is valid
                  try {
                    atob(base64Data);
                  } catch (e) {
                    throw new Error('Invalid base64 encoding');
                  }
                  
                  // Compress image on client side before sending to server
                  const compressedBase64 = await compressImageClientSide(result);
                  
                  // Validate compressed result
                  if (!compressedBase64 || !compressedBase64.startsWith('data:image/')) {
                    throw new Error('Compression failed - invalid result');
                  }
                  
                  console.log('Successfully processed image:', {
                    originalSize: result.length,
                    compressedSize: compressedBase64.length,
                    name: file.name
                  });
                  
                  resolve(compressedBase64);
                } catch (compressionError) {
                  console.warn('Image compression failed, using original:', compressionError);
                  // Fallback to original image if compression fails
                  resolve(result);
                }
              } else {
                reject(new Error('Invalid image data - not a data URL'));
              }
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
          });
        } catch (error) {
          console.error('Image processing completely failed:', error);
          setError(`Failed to process image: ${error instanceof Error ? error.message : 'Unknown error'}`);
          setUploading(false);
          return;
        }
        
        const newItem: ClothingItem = {
          id: uuidv4(),
          name: file.name.split('.')[0] || `${category} ${currentItems.length + newItems.length + 1}`,
          color: 'Unknown',
          style: 'Unknown',
          image: base64,
          category
        };
        
        newItems.push(newItem);
        setUploadProgress(((i + 1) / files.length) * 100);
      }
      
      if (category === 'topwear') {
        setTopwears(prev => [...prev, ...newItems]);
      } else {
        setBottomwears(prev => [...prev, ...newItems]);
      }
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      
    } catch (error) {
      console.error('Error processing files:', error);
      setError(error instanceof Error ? error.message : 'Failed to process images. Please try again.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }, [topwears, bottomwears]);

  const removeItem = useCallback((itemId: string, category: 'topwear' | 'bottomwear') => {
    if (category === 'topwear') {
      setTopwears(prev => {
        const updated = prev.filter(item => item.id !== itemId);
        // Update localStorage
        try {
          localStorage.setItem('wardrobe_topwears', JSON.stringify(updated));
        } catch (error) {
          console.error('Error updating localStorage:', error);
        }
        return updated;
      });
    } else {
      setBottomwears(prev => {
        const updated = prev.filter(item => item.id !== itemId);
        // Update localStorage
        try {
          localStorage.setItem('wardrobe_bottomwears', JSON.stringify(updated));
        } catch (error) {
          console.error('Error updating localStorage:', error);
        }
        return updated;
      });
    }
  }, []);

  const updateItemDetails = useCallback((
    itemId: string, 
    category: 'topwear' | 'bottomwear',
    field: 'name' | 'color' | 'style',
    value: string
  ) => {
    const updateItems = (items: ClothingItem[]) =>
      items.map(item =>
        item.id === itemId ? { ...item, [field]: value } : item
      );
    
    if (category === 'topwear') {
      setTopwears(prev => {
        const updated = updateItems(prev);
        // Update localStorage
        try {
          localStorage.setItem('wardrobe_topwears', JSON.stringify(updated));
        } catch (error) {
          console.error('Error updating localStorage:', error);
        }
        return updated;
      });
    } else {
      setBottomwears(prev => {
        const updated = updateItems(prev);
        // Update localStorage
        try {
          localStorage.setItem('wardrobe_bottomwears', JSON.stringify(updated));
        } catch (error) {
          console.error('Error updating localStorage:', error);
        }
        return updated;
      });
    }
  }, []);

  const handleGeneratePairings = useCallback(async () => {
    if (topwears.length === 0 || bottomwears.length === 0) {
      setError('Please upload at least one topwear and one bottomwear');
      return;
    }
    
    // Check if user has enough points (100 for pairing, free for first time)
    const hasUsedFreePairing = localStorage.getItem('hasUsedFreePairing') === 'true';
    const requiredPoints = hasUsedFreePairing ? 100 : 0;
    
    if (userPoints < requiredPoints) {
      setError(`You need ${requiredPoints} coins to generate outfit pairings. ${hasUsedFreePairing ? '' : 'This is your first time, so it\'s free!'}`);
      return;
    }
    
    setUploading(true);
    setError(null);
    
    try {
      // Call the outfit pairing API
      const response = await fetch('/api/outfit-pairing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topwears: topwears.map(item => ({
            name: item.name,
            color: item.color,
            style: item.style,
            image: item.image
          })),
          bottomwears: bottomwears.map(item => ({
            name: item.name,
            color: item.color,
            style: item.style,
            image: item.image
          }))
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate pairings');
      }
      
      const data = await response.json();
      
      // Mark free pairing as used
      if (!hasUsedFreePairing) {
        localStorage.setItem('hasUsedFreePairing', 'true');
      } else {
        // Deduct points for paid pairing
        const newPoints = userPoints - 100;
        onPointsUpdate(newPoints);
        
        // Update points in Supabase
        try {
          await fetch('/api/points', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'outfit_pairing',
              points: -100,
              description: 'Used outfit pairing feature'
            })
          });
        } catch (error) {
          console.error('Failed to update points:', error);
        }
      }
      
      // Pass the pairings and items to parent component
      if (data.pairings && Array.isArray(data.pairings)) {
        onPairingsGenerated(data.pairings);
      }
      onItemsUploaded(topwears, bottomwears);
      
    } catch (error) {
      console.error('Error generating pairings:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate pairings');
    } finally {
      setUploading(false);
    }
  }, [topwears, bottomwears, userPoints, onPointsUpdate, onItemsUploaded, onPairingsGenerated]);

  const renderItemGrid = (items: ClothingItem[], category: 'topwear' | 'bottomwear') => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className={`text-lg font-semibold capitalize ${hideGeneratePairingsButton && items.length !== 5 ? 'text-orange-600' : ''}`}>
          {category}s ({items.length}/5)
          {hideGeneratePairingsButton && items.length !== 5 && <span className="ml-2 text-sm text-orange-600">*Required</span>}
        </h3>
        <button
          onClick={() => {
            const input = category === 'topwear' ? topwearInputRef.current : bottomwearInputRef.current;
            input?.click();
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          disabled={items.length >= 5}
        >
          <Upload className="w-4 h-4" />
          Add {category}
        </button>
      </div>
      
      {/* Debug info - Always show in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="text-xs text-gray-400 bg-black/20 p-2 rounded mb-2">
          Debug: {items.length} {category}s loaded. 
          Valid images: {items.filter(i => i.image && i.image.startsWith('data:image/') && i.image.length > 100).length}/{items.length}
          {items.length > 0 && (
            <div className="mt-1">
              Sample image size: {items[0]?.image && items[0].image.length > 100 ? Math.round(items[0].image.length * 3 / 4 / 1024) + 'KB' : 'Too small/invalid'}
            </div>
          )}
          {items.some(i => i.image && i.image.length <= 100) && (
            <button
              onClick={() => {
                localStorage.removeItem('wardrobe_topwears');
                localStorage.removeItem('wardrobe_bottomwears');
                setTopwears([]);
                setBottomwears([]);
                console.log('Cleared all wardrobe data');
              }}
              className="mt-1 px-2 py-1 bg-red-500 text-white rounded text-xs"
            >
              Clear Corrupted Data
            </button>
          )}
        </div>
      )}
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {items.map((item) => (
          <div key={item.id} className="relative bg-white rounded-lg border border-gray-200 p-3">
            <div className="aspect-square mb-3 rounded-lg overflow-hidden bg-gray-100">
              {item.image && item.image.startsWith('data:image/') && item.image.length > 100 ? (
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    console.error(`Failed to load ${category} image:`, item.name, {
                      hasImage: !!item.image,
                      imageLength: item.image?.length,
                      imageStart: item.image?.substring(0, 50),
                      isValidBase64: item.image?.startsWith('data:image/')
                    });
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <div className="text-2xl mb-1">🖼️</div>
                    <div className="text-xs">
                      {!item.image ? 'No image' : 
                       item.image.length <= 100 ? 'Image too small/corrupted' : 
                       'Invalid format'}
                    </div>
                    {item.image && item.image.length <= 100 && (
                      <div className="text-xs mt-1 text-red-400">
                        Size: {item.image.length} chars
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <input
                type="text"
                value={item.name}
                onChange={(e) => updateItemDetails(item.id, category, 'name', e.target.value)}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Item name"
              />
              
              <div className="flex gap-1">
                <input
                  type="text"
                  value={item.color}
                  onChange={(e) => updateItemDetails(item.id, category, 'color', e.target.value)}
                  className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Color"
                />
                <input
                  type="text"
                  value={item.style}
                  onChange={(e) => updateItemDetails(item.id, category, 'style', e.target.value)}
                  className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Style"
                />
              </div>
            </div>
            
            <button
              onClick={() => removeItem(item.id, category)}
              className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#251F1E]  flex justify-center items-center w-full bg-[#] text-white overflow-y-auto p-6"
>
      <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">
              {hideGeneratePairingsButton ? 'Upload Your Wardrobe for Calendar' : 'Upload Your Wardrobe'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className={`mb-6 p-4 ${hideGeneratePairingsButton ? 'bg-purple-500/10' : 'bg-blue-500/10'} border ${hideGeneratePairingsButton ? 'border-purple-400/30' : 'border-blue-400/30'} rounded-lg`}> 
            <div className="flex items-center gap-2 mb-2">
              <Camera className={`w-5 h-5 ${hideGeneratePairingsButton ? 'text-purple-300' : 'text-blue-300'}`} />
              <h3 className={`font-semibold ${hideGeneratePairingsButton ? 'text-purple-200' : 'text-blue-200'}`}>How it works</h3>
            </div>
            <ul className={`text-sm space-y-1 ${hideGeneratePairingsButton ? 'text-purple-100' : 'text-blue-100'}`}>
              {hideGeneratePairingsButton ? (
                <>
                  <li>• Upload exactly 5 topwears and 5 bottomwears</li>
                  <li>• Add details like color and style for better suggestions</li>
                  <li>• Gemini AI will analyze your wardrobe</li>
                  <li>• Get a personalized 10-day outfit calendar</li>
                  <li>• 500 coins already deducted</li>
                </>
              ) : (
                <>
                  <li>• Upload up to 5 topwears and 5 bottomwears</li>
                  <li>• Add details like color and style for better suggestions</li>
                  <li>• Get AI-powered outfit combinations</li>
                  <li>• First time is free! After that, 100 coins per session</li>
                </>
              )}
            </ul>
          </div>
          
          {error && (
            <div className="mb-4 p-4 bg-red-500/10 border border-red-400/30 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-300" />
              <span className="text-red-200">{error}</span>
            </div>
          )}
          
          {success && (
            <div className="mb-4 p-4 bg-green-500/10 border border-green-400/30 rounded-lg flex items-center gap-2">
              <Check className="w-5 h-5 text-green-300" />
              <span className="text-green-200">Images saved to your device successfully!</span>
            </div>
          )}
          
          <div className="space-y-8">
            {renderItemGrid(topwears, 'topwear')}
            {renderItemGrid(bottomwears, 'bottomwear')}
          </div>
          
          {uploading && (
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-400"></div>
                <span className="text-sm text-gray-300">Processing images...</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}
          
          <div className="flex justify-end gap-4 mt-8">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-white/20 text-white rounded-lg hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            {!hideGeneratePairingsButton ? (
              <button
                onClick={handleGeneratePairings}
                disabled={uploading || topwears.length === 0 || bottomwears.length === 0}
                className="px-6 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg hover:from-blue-600 hover:to-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {uploading ? 'Generating...' : 'Generate Outfit Pairings'}
              </button>
            ) : (
              <button
                onClick={() => {
                  if (topwears.length !== 5 || bottomwears.length !== 5) {
                    setError('Please upload exactly 5 topwears and 5 bottomwears to generate calendar');
                    return;
                  }
                  
                  // Debug: Log the data being sent
                  console.log('Sending to calendar:', {
                    topwears: topwears.map(t => ({ name: t.name, hasImage: !!t.image, imageSize: t.image?.length })),
                    bottomwears: bottomwears.map(b => ({ name: b.name, hasImage: !!b.image, imageSize: b.image?.length }))
                  });
                  
                  onItemsUploaded(topwears, bottomwears);
                }}
                disabled={uploading || topwears.length !== 5 || bottomwears.length !== 5}
                className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {uploading ? 'Processing...' : 'Generate Calendar'}
              </button>
            )}
          </div>
        </div>
        
        <input
          ref={topwearInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={(e) => handleFileSelect(e.target.files, 'topwear')}
          className="hidden"
        />
        <input
          ref={bottomwearInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={(e) => handleFileSelect(e.target.files, 'bottomwear')}
          className="hidden"
        />
      </div>
    </div>
  );
}
