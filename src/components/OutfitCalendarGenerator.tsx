'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, ArrowLeft, Download, Share2, CheckCircle, Clock } from 'lucide-react';

interface CalendarDay {
  date: string;
  dayName: string;
  outfit: {
    topwear: string;
    bottomwear: string;
    accessories: string[];
    description: string;
    occasion: string;
    styling_tips: string[];
  };
  weather?: {
    temperature: number;
    condition: string;
    icon: string;
  };
}

interface OutfitCalendarGeneratorProps {
  topwears: any[];
  bottomwears: any[];
  onBack: () => void;
  userPoints: number;
  onPointsUpdate: (newPoints: number) => void;
  alreadyPaid?: boolean;
}

export default function OutfitCalendarGenerator({
  topwears,
  bottomwears,
  onBack,
  userPoints,
  onPointsUpdate,
  alreadyPaid = false
}: OutfitCalendarGeneratorProps) {
  const [calendar, setCalendar] = useState<CalendarDay[]>([]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Items received and ready for calendar generation

  // Check if user has access: either already paid in this flow or has enough points
  const canGenerateCalendar = alreadyPaid || userPoints >= 500;

  const generateCalendar = async () => {
    if (!canGenerateCalendar) {
      setError('You need 500 coins to generate a 10-day outfit calendar');
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      // Call the calendar generation API
      const response = await fetch('/api/outfit-calendar', {
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
          })),
          startDate: new Date().toISOString().split('T')[0]
        })
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (jsonError) {
          // If JSON parsing fails, try to get text response or use generic error
          const errorText = await response.text().catch(() => 'Failed to generate calendar');
          throw new Error(errorText.slice(0, 200) || 'Failed to generate calendar');
        }
        throw new Error(errorData.error || 'Failed to generate calendar');
      }

      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        console.error('JSON parsing error:', jsonError);
        throw new Error('Invalid response from server. Please try again.');
      }
      
      if (!data || !data.calendar) {
        throw new Error('Invalid calendar data received from server.');
      }
      
      // Show warning if response was simplified due to size
      if (data.warning) {
        console.warn('Server warning:', data.warning);
        // You could show this as a toast or notification if you have one
      }
      
      setCalendar(data.calendar);

      // Only deduct if not paid already in this flow
      if (!alreadyPaid) {
        const newPoints = userPoints - 500;
        onPointsUpdate(newPoints);
        try {
          await fetch('/api/points', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'calendar_generation',
              points: -500,
              description: 'Generated 10-day outfit calendar'
            })
          });
        } catch (error) {
          console.error('Failed to update points:', error);
        }
      }

    } catch (error) {
      console.error('Error generating calendar:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate calendar');
    } finally {
      setGenerating(false);
    }
  };

  const downloadCalendar = () => {
    const content = calendar.map(day => 
      `${day.date} (${day.dayName})
================

Outfit: ${day.outfit.description}
Topwear: ${day.outfit.topwear}
Bottomwear: ${day.outfit.bottomwear}
Accessories: ${day.outfit.accessories.join(', ')}

Occasion: ${day.outfit.occasion}

Styling Tips:
${day.outfit.styling_tips.map(tip => `• ${tip}`).join('\n')}

${day.weather ? `Weather: ${day.weather.temperature}°C, ${day.weather.condition}` : ''}

`
    ).join('\n\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `outfit-calendar-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const shareCalendar = async () => {
    const shareData = {
      title: 'My 10-Day Outfit Calendar - AuraSync',
      text: `Check out my personalized 10-day outfit calendar generated by AuraSync!`,
      url: window.location.href
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(
          `My 10-Day Outfit Calendar:\n\n${calendar.map(day => `${day.date}: ${day.outfit.description}`).join('\n')}`
        );
        alert('Calendar details copied to clipboard!');
      }
    } catch (error) {
      console.error('Error sharing calendar:', error);
    }
  };

  // Helper function to remove number prefixes from item names
  const removeNumberPrefix = (text: string): string => {
    if (!text) return text;
    // Remove patterns like "5 - ", "1. ", "2 -", etc.
    return text.replace(/^\d+\s*[.-]\s*/, '').trim();
  };

  // Helper function to find matching item by name/description
  const findMatchingItem = (description: string, items: any[]) => {
    if (!description || !items || items.length === 0) return null;
    
    // Clean the description to extract the core item name
    const cleanDescription = description.toLowerCase().trim();
    
    // Try to extract item number from description (e.g., "1", "Item 1", "#1")
    const numberMatch = description.match(/\b(\d+)\b/);
    if (numberMatch) {
      const itemIndex = parseInt(numberMatch[1]) - 1; // Convert to 0-based index
      if (itemIndex >= 0 && itemIndex < items.length) {
        return items[itemIndex];
      }
    }
    
    // Try exact match first
    const exactMatch = items.find(item => 
      item.name?.toLowerCase() === cleanDescription ||
      cleanDescription === item.name?.toLowerCase()
    );
    if (exactMatch) return exactMatch;
    
    // Try partial match - check if description contains item name or vice versa
    const partialMatch = items.find(item => 
      item.name && (
        cleanDescription.includes(item.name.toLowerCase()) ||
        item.name.toLowerCase().includes(cleanDescription)
      )
    );
    if (partialMatch) return partialMatch;
    
    // Try matching by color
    const colorMatch = items.find(item => 
      item.color && (
        cleanDescription.includes(item.color.toLowerCase()) ||
        item.color.toLowerCase().includes(cleanDescription)
      )
    );
    if (colorMatch) return colorMatch;
    
    // Try matching by style
    const styleMatch = items.find(item => 
      item.style && (
        cleanDescription.includes(item.style.toLowerCase()) ||
        item.style.toLowerCase().includes(cleanDescription)
      )
    );
    if (styleMatch) return styleMatch;
    
    // If no match found, return null instead of first item to avoid wrong images
    return null;
  };
  
  // Get images for a specific day's outfit
  const getOutfitImages = (day: CalendarDay) => {
    const topwearItem = findMatchingItem(day.outfit.topwear, topwears);
    const bottomwearItem = findMatchingItem(day.outfit.bottomwear, bottomwears);
    
    return {
      topwearImage: topwearItem?.image || null,
      bottomwearImage: bottomwearItem?.image || null,
      topwearItem: topwearItem,
      bottomwearItem: bottomwearItem
    };
  };

  if (!canGenerateCalendar) {
    return (
      <div className="min-h-screen bg-[#251F1E] flex items-center justify-center">
        <div className="max-w-md mx-auto text-center p-8 bg-white/10 border border-white/15 rounded-2xl backdrop-blur-md">
          <div className="text-6xl mb-6"></div>
          <h2 className="text-2xl font-bold text-white mb-4">Calendar Access Required</h2>
          <p className="text-gray-300 mb-6">
            You need 500 coins to unlock the 10-day outfit calendar feature.
          </p>
          <div className="bg-yellow-500/10 border border-yellow-400/30 rounded-lg p-4 mb-6">
            <div className="text-yellow-200 font-medium">Current Balance: {userPoints} coins</div>
            <div className="text-yellow-200/80 text-sm">Required: 500 coins</div>
          </div>
          <button
            onClick={onBack}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (generating) {
    return (
      <div className="min-h-screen bg-[#251F1E] flex items-center justify-center">
        <div className="max-w-md mx-auto text-center p-8">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-400 mx-auto mb-6"></div>
          <h2 className="text-2xl font-bold text-white mb-4">Generating Your Calendar</h2>
          <p className="text-gray-300 mb-6">
            Our AI is creating your personalized 10-day outfit calendar...
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
            <Clock className="w-4 h-4" />
            This may take a few moments
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#251F1E] flex items-center justify-center">
        <div className="max-w-md mx-auto text-center p-8 bg-white/10 border border-white/15 rounded-2xl backdrop-blur-md">
          <div className="text-6xl mb-6">❌</div>
          <h2 className="text-2xl font-bold text-white mb-4">Generation Failed</h2>
          <p className="text-gray-300 mb-6">{error}</p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={onBack}
              className="px-6 py-3 border border-white/20 text-white rounded-lg hover:bg-white/10 transition-colors"
            >
              Go Back
            </button>
            <button
              onClick={generateCalendar}
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#251F1E]">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-white/10 text-white rounded-full transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-white">Your 10-Day Outfit Calendar</h1>
              <p className="text-gray-300">Personalized styling plan for the next 10 days</p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={downloadCalendar}
              className="flex items-center gap-2 px-4 py-2 border border-white/20 text-white rounded-lg hover:bg-white/10 transition-colors"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
            <button
              onClick={shareCalendar}
              className="flex items-center gap-2 px-4 py-2 border border-white/20 text-white rounded-lg hover:bg-white/10 transition-colors"
            >
              <Share2 className="w-4 h-4" />
              Share
            </button>
          </div>
        </div>

        {/* All Uploaded Wardrobe Items Section */}
        <div className="mb-8 bg-white/5 rounded-xl p-6 border border-white/10">
          <h2 className="text-xl font-bold text-white mb-4">Your Complete Wardrobe</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Topwears Section */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <span></span>
                Topwears ({topwears.length})
              </h3>
              <div className="grid grid-cols-3 gap-3">
                {topwears.map((item, index) => (
                  <div key={item.id || index} className="relative group">
                    <div className="aspect-square rounded-lg overflow-hidden bg-white/5 border border-white/10">
                      {item.image && item.image.startsWith('data:image/') ? (
                        <img
                          src={item.image}
                          alt={item.name || `Topwear ${index + 1}`}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          onError={(e) => {
                            console.error('Failed to load wardrobe topwear image:', item.name, 'Size:', item.image?.length);
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-red-400">
                          <div className="text-center">
                            <div className="text-2xl mb-1">❌</div>
                            <div className="text-xs">No valid image</div>
                            <div className="text-xs mt-1">{item.image ? 'Invalid format' : 'Missing'}</div>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="mt-2 text-center">
                      <p className="text-xs text-gray-300 truncate">{item.name || `Item ${index + 1}`}</p>
                      {(item.color || item.style) && (
                        <p className="text-xs text-gray-400 truncate">
                          {item.color && item.style ? `${item.color} • ${item.style}` : item.color || item.style}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                {topwears.length === 0 && (
                  <div className="col-span-3 text-center py-8 text-gray-400">
                    <p>No topwears uploaded</p>
                  </div>
                )}
              </div>
            </div>

            {/* Bottomwears Section */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <span>👖</span>
                Bottomwears ({bottomwears.length})
              </h3>
              <div className="grid grid-cols-3 gap-3">
                {bottomwears.map((item, index) => (
                  <div key={item.id || index} className="relative group">
                    <div className="aspect-square rounded-lg overflow-hidden bg-white/5 border border-white/10">
                      {item.image && item.image.startsWith('data:image/') ? (
                        <img
                          src={item.image}
                          alt={item.name || `Bottomwear ${index + 1}`}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          onError={(e) => {
                            console.error('Failed to load wardrobe bottomwear image:', item.name, 'Size:', item.image?.length);
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-red-400">
                          <div className="text-center">
                            <div className="text-2xl mb-1">❌</div>
                            <div className="text-xs">No valid image</div>
                            <div className="text-xs mt-1">{item.image ? 'Invalid format' : 'Missing'}</div>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="mt-2 text-center">
                      <p className="text-xs text-gray-300 truncate">{item.name || `Item ${index + 1}`}</p>
                      {(item.color || item.style) && (
                        <p className="text-xs text-gray-400 truncate">
                          {item.color && item.style ? `${item.color} • ${item.style}` : item.color || item.style}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                {bottomwears.length === 0 && (
                  <div className="col-span-3 text-center py-8 text-gray-400">
                    <p>No bottomwears uploaded</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {calendar.map((day, index) => (
            <div
              key={day.date}
              className={`bg-white/10 border border-white/15 rounded-xl overflow-hidden hover:bg-white/15 transition-all duration-300 cursor-pointer ${
                selectedDate === day.date ? 'ring-2 ring-purple-500' : ''
              }`}
              onClick={() => setSelectedDate(selectedDate === day.date ? null : day.date)}
            >
              {/* Date Header */}
              <div className="bg-white/30 text-white p-4">
                <div className="text-sm font-medium">{day.dayName}</div>
                <div className="text-lg font-bold">{new Date(day.date).getDate()}</div>
              </div>

              {/* Outfit Preview with Actual Images */}
              <div className="p-4">
                {(() => {
                  const { topwearImage, bottomwearImage } = getOutfitImages(day);
                  return (
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      {/* Topwear Image */}
                      <div className="aspect-square bg-white/5 rounded-lg overflow-hidden">
                        {topwearImage ? (
                          <img
                            src={topwearImage}
                            alt={day.outfit.topwear}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              console.error('Failed to load topwear image:', day.outfit.topwear);
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <div className="text-center">
                              <div className="text-2xl mb-1">👕</div>
                              <div className="text-xs text-gray-300">Top</div>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Bottomwear Image */}
                      <div className="aspect-square bg-white/5 rounded-lg overflow-hidden">
                        {bottomwearImage ? (
                          <img
                            src={bottomwearImage}
                            alt={day.outfit.bottomwear}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              console.error('Failed to load bottomwear image:', day.outfit.bottomwear);
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <div className="text-center">
                              <div className="text-2xl mb-1">👖</div>
                              <div className="text-xs text-gray-300">Bottom</div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                <div className="space-y-2">
                  {/* <div className="text-xs text-gray-300">
                    <div className="flex items-center gap-1 mb-1">
                      <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                      {removeNumberPrefix(day.outfit.topwear)}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      {removeNumberPrefix(day.outfit.bottomwear)}
                    </div>
                  </div> */}

                  {day.outfit.accessories.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1 mt-2">
                      <span className="text-xs text-purple-200 font-medium">✨ Accessories:</span>
                      {day.outfit.accessories.slice(0, 2).map((accessory, idx) => (
                        <span key={idx} className="px-2 py-1 bg-purple-500/20 text-purple-200 text-xs rounded-full">
                          {accessory}
                        </span>
                      ))}
                      {day.outfit.accessories.length > 2 && (
                        <span className="px-2 py-1 bg-purple-500/20 text-purple-200 text-xs rounded-full">
                          +{day.outfit.accessories.length - 2} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Detailed View */}
        {selectedDate && (
          <div className="mt-8 bg- rounded-xl shadow-lg p-6">
            {(() => {
              const day = calendar.find(d => d.date === selectedDate);
              if (!day) return null;

              return (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-white">
                      {day.dayName}, {new Date(day.date).toLocaleDateString()}
                    </h2>
                    <button
                      onClick={() => setSelectedDate(null)}
                      className="p-2 hover:bg-white/10 text-white rounded-full transition-colors"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Outfit Details */}
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-4">Outfit Details</h3>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-medium text-white mb-2">Topwear</h4>
                            <p className="text-gray-300">{removeNumberPrefix(day.outfit.topwear)}</p>
                          </div>
                          <div>
                            <h4 className="font-medium text-white mb-2">Bottomwear</h4>
                            <p className="text-gray-300">{removeNumberPrefix(day.outfit.bottomwear)}</p>
                          </div>
                        </div>

                        <div>
                          <h4 className="font-medium text-white mb-3 flex items-center gap-2">
                            <span className="text-lg">✨</span>
                            Accessories That Will Suit You
                          </h4>
                          {day.outfit.accessories.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {day.outfit.accessories.map((accessory, idx) => (
                                <span
                                  key={idx}
                                  className="px-3 py-1.5 bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-200 text-sm font-medium rounded-full border border-purple-400/30"
                                >
                                  {accessory}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-400 italic">Consider adding accessories to complete this look</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Styling Tips */}
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-4">Styling Tips</h3>
                      <div className="space-y-3">
                        {day.outfit.styling_tips.map((tip, idx) => (
                          <div key={idx} className="flex items-start gap-3">
                            <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                            <p className="text-gray-300">{tip}</p>
                          </div>
                        ))}
                      </div>
                      
                      {/* Outfit Images in Detail View */}
                      <div className="mt-6">
                        <h4 className="font-medium text-white mb-3">Outfit Items</h4>
                        {(() => {
                          const { topwearImage, bottomwearImage, topwearItem, bottomwearItem } = getOutfitImages(day);
                          return (
                            <div className="grid grid-cols-2 gap-3">
                              <div className="bg-white/5 rounded-lg overflow-hidden">
                                {topwearImage ? (
                                  <img
                                    src={topwearImage}
                                    alt={day.outfit.topwear}
                                    className="w-full h-32 object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-32 flex items-center justify-center bg-white/5">
                                    <span className="text-2xl">👕</span>
                                  </div>
                                )}
                                <div className="p-2">
                                  <p className="text-xs text-gray-300 text-center">Topwear</p>
                                  {topwearItem && (
                                    <p className="text-xs text-white text-center font-medium mt-1">{removeNumberPrefix(topwearItem.name)}</p>
                                  )}
                                </div>
                              </div>
                              
                              <div className="bg-white/5 rounded-lg overflow-hidden">
                                {bottomwearImage ? (
                                  <img
                                    src={bottomwearImage}
                                    alt={day.outfit.bottomwear}
                                    className="w-full h-32 object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-32 flex items-center justify-center bg-white/5">
                                    <span className="text-2xl">👖</span>
                                  </div>
                                )}
                                <div className="p-2">
                                  <p className="text-xs text-gray-300 text-center">Bottomwear</p>
                                  {bottomwearItem && (
                                    <p className="text-xs text-white text-center font-medium mt-1">{removeNumberPrefix(bottomwearItem.name)}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Empty State */}
        {calendar.length === 0 && !generating && !error && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📅</div>
            <h3 className="text-xl font-semibold text-white mb-2">No calendar generated</h3>
            <p className="text-gray-300 mb-6">Something went wrong. Please try again.</p>
            <button
              onClick={generateCalendar}
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-colors"
            >
              Generate Calendar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
