'use client';

import React, { useState } from 'react';
import { Heart, Star, Calendar, Download, Share2, ArrowLeft } from 'lucide-react';

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

interface OutfitPairingResultsProps {
  pairings: OutfitPairing[];
  topwears: any[];
  bottomwears: any[];
  onBack: () => void;
  onGenerateCalendar?: () => void;
  userPoints: number;
  canGenerateCalendar: boolean;
}

export default function OutfitPairingResults({
  pairings,
  topwears,
  bottomwears,
  onBack,
  onGenerateCalendar,
  userPoints,
  canGenerateCalendar
}: OutfitPairingResultsProps) {
  const [favorites, setFavorites] = useState<Set<number>>(new Set());
  const [selectedPairing, setSelectedPairing] = useState<number | null>(null);

  const toggleFavorite = (index: number) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(index)) {
      newFavorites.delete(index);
    } else {
      newFavorites.add(index);
    }
    setFavorites(newFavorites);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-100';
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getConfidenceText = (confidence: number) => {
    if (confidence >= 0.8) return 'Excellent';
    if (confidence >= 0.6) return 'Good';
    return 'Fair';
  };

  const downloadOutfit = (pairing: OutfitPairing, index: number) => {
    // Create a simple text file with outfit details
    const content = `Outfit #${index + 1}
================

Topwear: ${pairing.topwear.name} (${pairing.topwear.color}, ${pairing.topwear.style})
Bottomwear: ${pairing.bottomwear.name} (${pairing.bottomwear.color}, ${pairing.bottomwear.style})

Accessories: ${pairing.accessories.join(', ')}

Description: ${pairing.description}

Occasion: ${pairing.occasion}

Styling Tips:
${pairing.styling_tips.map(tip => `• ${tip}`).join('\n')}

Confidence: ${Math.round(pairing.confidence * 100)}%`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `outfit-${index + 1}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const shareOutfit = async (pairing: OutfitPairing, index: number) => {
    const shareData = {
      title: `Outfit #${index + 1} - AuraSync`,
      text: `Check out this outfit combination: ${pairing.description}`,
      url: window.location.href
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback to copying to clipboard
        await navigator.clipboard.writeText(
          `Outfit #${index + 1}: ${pairing.description}\n\nTopwear: ${pairing.topwear.name}\nBottomwear: ${pairing.bottomwear.name}\nAccessories: ${pairing.accessories.join(', ')}`
        );
        alert('Outfit details copied to clipboard!');
      }
    } catch (error) {
      console.error('Error sharing outfit:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-200 rounded-full transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Your Outfit Pairings</h1>
              <p className="text-gray-600">AI-generated combinations from your wardrobe</p>
            </div>
          </div>
          
          {canGenerateCalendar && onGenerateCalendar && (
            <button
              onClick={onGenerateCalendar}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-200 shadow-lg"
            >
              <Calendar className="w-5 h-5" />
              Generate 10-Day Calendar
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="text-2xl font-bold text-blue-600">{pairings.length}</div>
            <div className="text-gray-600">Outfit Combinations</div>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="text-2xl font-bold text-green-600">{topwears.length + bottomwears.length}</div>
            <div className="text-gray-600">Items Analyzed</div>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="text-2xl font-bold text-purple-600">{favorites.size}</div>
            <div className="text-gray-600">Favorites</div>
          </div>
        </div>

        {/* Outfit Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {pairings.map((pairing, index) => (
            <div
              key={index}
              className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300"
            >
              {/* Outfit Images */}
              <div className="relative h-64 bg-gradient-to-br from-gray-100 to-gray-200">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-6xl mb-2">👕</div>
                    <div className="text-sm text-gray-600">Outfit Preview</div>
                  </div>
                </div>
                
                {/* Confidence Badge */}
                <div className="absolute top-4 right-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getConfidenceColor(pairing.confidence)}`}>
                    {getConfidenceText(pairing.confidence)} ({Math.round(pairing.confidence * 100)}%)
                  </span>
                </div>
                
                {/* Favorite Button */}
                <button
                  onClick={() => toggleFavorite(index)}
                  className="absolute top-4 left-4 p-2 bg-white rounded-full shadow-md hover:bg-gray-50 transition-colors"
                >
                  <Heart 
                    className={`w-5 h-5 ${favorites.has(index) ? 'text-red-500 fill-current' : 'text-gray-400'}`} 
                  />
                </button>
              </div>

              {/* Outfit Details */}
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-gray-900">Outfit #{index + 1}</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => downloadOutfit(pairing, index)}
                      className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                      title="Download outfit details"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => shareOutfit(pairing, index)}
                      className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                      title="Share outfit"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Occasion */}
                <div className="mb-4">
                  <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                    {pairing.occasion}
                  </span>
                </div>

                {/* Description */}
                <p className="text-gray-700 mb-4 leading-relaxed">
                  {pairing.description}
                </p>

                {/* Items */}
                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 text-sm">👕</span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{pairing.topwear.name}</div>
                      <div className="text-sm text-gray-600">{pairing.topwear.color} • {pairing.topwear.style}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-green-600 text-sm">👖</span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{pairing.bottomwear.name}</div>
                      <div className="text-sm text-gray-600">{pairing.bottomwear.color} • {pairing.bottomwear.style}</div>
                    </div>
                  </div>
                </div>

                {/* Accessories */}
                {pairing.accessories.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Accessories</h4>
                    <div className="flex flex-wrap gap-2">
                      {pairing.accessories.map((accessory, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                        >
                          {accessory}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Styling Tips */}
                {pairing.styling_tips.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Styling Tips</h4>
                    <ul className="space-y-1">
                      {pairing.styling_tips.map((tip, idx) => (
                        <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                          <Star className="w-3 h-3 text-yellow-500 mt-0.5 flex-shrink-0" />
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {pairings.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">👗</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No outfit pairings found</h3>
            <p className="text-gray-600 mb-6">Try uploading more items or adjusting your preferences.</p>
            <button
              onClick={onBack}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
