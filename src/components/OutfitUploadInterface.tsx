'use client';

import React, { useState, useRef, useCallback } from 'react';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { Camera, Upload, X, Check, AlertCircle } from 'lucide-react';

interface ClothingItem {
  id: string;
  name: string;
  color: string;
  style: string;
  image: string;
  imageUrl?: string;
  category: 'topwear' | 'bottomwear';
}

interface OutfitUploadInterfaceProps {
  onItemsUploaded: (topwears: ClothingItem[], bottomwears: ClothingItem[]) => void;
  onClose: () => void;
  userPoints: number;
  onPointsUpdate: (newPoints: number) => void;
}

export default function OutfitUploadInterface({ 
  onItemsUploaded, 
  onClose, 
  userPoints, 
  onPointsUpdate 
}: OutfitUploadInterfaceProps) {
  const [topwears, setTopwears] = useState<ClothingItem[]>([]);
  const [bottomwears, setBottomwears] = useState<ClothingItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const topwearInputRef = useRef<HTMLInputElement>(null);
  const bottomwearInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = useCallback(async (
    file: File, 
    category: 'topwear' | 'bottomwear'
  ): Promise<string> => {
    try {
      // Create a unique filename
      const fileName = `${category}_${uuidv4()}_${file.name}`;
      const storageRef = ref(storage, `outfits/${fileName}`);
      
      // Upload file to Firebase Storage
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      return downloadURL;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw new Error('Failed to upload image');
    }
  }, []);

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
        
        const imageUrl = await handleImageUpload(file, category);
        
        // Convert image to base64 for Gemini API
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result);
          };
          reader.readAsDataURL(file);
        });
        
        const newItem: ClothingItem = {
          id: uuidv4(),
          name: file.name.split('.')[0],
          color: 'Unknown',
          style: 'Unknown',
          image: base64,
          imageUrl,
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
      setError('Failed to upload images. Please try again.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }, [topwears, bottomwears, handleImageUpload]);

  const removeItem = useCallback((itemId: string, category: 'topwear' | 'bottomwear') => {
    if (category === 'topwear') {
      setTopwears(prev => prev.filter(item => item.id !== itemId));
    } else {
      setBottomwears(prev => prev.filter(item => item.id !== itemId));
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
      setTopwears(updateItems);
    } else {
      setBottomwears(updateItems);
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
      
      // Pass the pairings to parent component
      onItemsUploaded(topwears, bottomwears);
      
    } catch (error) {
      console.error('Error generating pairings:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate pairings');
    } finally {
      setUploading(false);
    }
  }, [topwears, bottomwears, userPoints, onPointsUpdate, onItemsUploaded]);

  const renderItemGrid = (items: ClothingItem[], category: 'topwear' | 'bottomwear') => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold capitalize">
          {category}s ({items.length}/5)
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
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {items.map((item) => (
          <div key={item.id} className="relative bg-white rounded-lg border border-gray-200 p-3">
            <div className="aspect-square mb-3 rounded-lg overflow-hidden bg-gray-100">
              <img
                src={item.imageUrl || item.image}
                alt={item.name}
                className="w-full h-full object-cover"
              />
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Upload Your Wardrobe</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Camera className="w-5 h-5 text-blue-500" />
              <h3 className="font-semibold text-blue-900">How it works</h3>
            </div>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Upload up to 5 topwears and 5 bottomwears</li>
              <li>• Add details like color and style for better suggestions</li>
              <li>• Get AI-powered outfit combinations</li>
              <li>• First time is free! After that, 100 coins per session</li>
            </ul>
          </div>
          
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <span className="text-red-700">{error}</span>
            </div>
          )}
          
          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
              <Check className="w-5 h-5 text-green-500" />
              <span className="text-green-700">Images uploaded successfully!</span>
            </div>
          )}
          
          <div className="space-y-8">
            {renderItemGrid(topwears, 'topwear')}
            {renderItemGrid(bottomwears, 'bottomwear')}
          </div>
          
          {uploading && (
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                <span className="text-sm text-gray-600">Processing images...</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}
          
          <div className="flex justify-end gap-4 mt-8">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleGeneratePairings}
              disabled={uploading || topwears.length === 0 || bottomwears.length === 0}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {uploading ? 'Generating...' : 'Generate Outfit Pairings'}
            </button>
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
