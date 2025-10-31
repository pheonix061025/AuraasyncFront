'use client';

import React, { useState, useEffect } from 'react';
import { Camera, Sparkles, Calendar, Coins, ArrowRight } from 'lucide-react';
import OutfitUploadInterface from '@/components/OutfitUploadInterface';
import OutfitPairingResults from '@/components/OutfitPairingResults';
import OutfitCalendarGenerator from '@/components/OutfitCalendarGenerator';

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

export default function OutfitPairingPage() {
  const [currentView, setCurrentView] = useState<'main' | 'upload' | 'results' | 'calendar'>('main');
  const [userPoints, setUserPoints] = useState(0);
  const [pairings, setPairings] = useState<OutfitPairing[]>([]);
  const [topwears, setTopwears] = useState<any[]>([]);
  const [bottomwears, setBottomwears] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCalendarFlow, setIsCalendarFlow] = useState(false);

  // Check if user has used free pairing
  const [hasUsedFreePairing, setHasUsedFreePairing] = useState(false);

  useEffect(() => {
    // Load user points and free pairing status
    const loadUserData = async () => {
      try {
        // Get user points from localStorage or API
        const storedPoints = localStorage.getItem('userPoints');
        if (storedPoints) {
          setUserPoints(parseInt(storedPoints));
        }

        // Check if user has used free pairing
        const freePairingUsed = localStorage.getItem('hasUsedFreePairing') === 'true';
        setHasUsedFreePairing(freePairingUsed);

        // Try to get points from Supabase
        try {
          const response = await fetch('/api/user');
          if (response.ok) {
            const userData = await response.json();
            setUserPoints(userData.points || 0);
          }
        } catch (error) {
          console.log('Using local points data');
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, []);

  const handleItemsUploaded = (uploadedTopwears: any[], uploadedBottomwears: any[]) => {
    setTopwears(uploadedTopwears);
    setBottomwears(uploadedBottomwears);
    setCurrentView(isCalendarFlow ? 'calendar' : 'results');
  };

  const handlePairingsGenerated = (generatedPairings: OutfitPairing[]) => {
    setPairings(generatedPairings);
  };

  const handlePointsUpdate = (newPoints: number) => {
    setUserPoints(newPoints);
    localStorage.setItem('userPoints', newPoints.toString());
  };

  const canGeneratePairings = hasUsedFreePairing ? userPoints >= 100 : true;
  const canGenerateCalendar = userPoints >= 500;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading outfit pairing...</p>
        </div>
      </div>
    );
  }

  if (currentView === 'upload') {
    return (
      <OutfitUploadInterface
        onItemsUploaded={handleItemsUploaded}
        onPairingsGenerated={handlePairingsGenerated}
        onClose={() => setCurrentView('main')}
        userPoints={userPoints}
        onPointsUpdate={handlePointsUpdate}
        hideGeneratePairingsButton={isCalendarFlow}
      />
    );
  }

  if (currentView === 'results') {
    return (
      <OutfitPairingResults
        pairings={pairings}
        topwears={topwears}
        bottomwears={bottomwears}
        onBack={() => setCurrentView('main')}
        onGenerateCalendar={() => setCurrentView('calendar')}
        userPoints={userPoints}
        canGenerateCalendar={canGenerateCalendar}
      />
    );
  }

  if (currentView === 'calendar') {
    return (
      <OutfitCalendarGenerator
        topwears={topwears}
        bottomwears={bottomwears}
        onBack={() => setCurrentView('results')}
        userPoints={userPoints}
        onPointsUpdate={handlePointsUpdate}
        alreadyPaid={isCalendarFlow}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50">
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full">
              <Camera className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900">Outfit Pairing</h1>
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Upload your wardrobe and get AI-powered outfit suggestions tailored to your style
          </p>
        </div>

        {/* Points Display */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2 px-6 py-3 bg-white rounded-full shadow-lg">
            <Coins className="w-5 h-5 text-yellow-500" />
            <span className="font-semibold text-gray-900">{userPoints} coins</span>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {/* Outfit Pairing Card */}
          <div className="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-shadow duration-300">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-blue-100 rounded-full">
                <Sparkles className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Smart Pairing</h2>
                <p className="text-gray-600">Get AI-powered outfit combinations</p>
              </div>
            </div>
            
            <div className="space-y-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-gray-700">Upload up to 5 topwears & 5 bottomwears</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-gray-700">AI analyzes colors, patterns & styles</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-gray-700">Get personalized styling suggestions</span>
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Coins className="w-4 h-4 text-blue-600" />
                <span className="font-semibold text-blue-900">Pricing</span>
              </div>
              <p className="text-blue-800 text-sm">
                {hasUsedFreePairing ? '100 coins per session' : 'First time is FREE! Then 100 coins per session'}
              </p>
            </div>

            <button
              onClick={() => setCurrentView('upload')}
              disabled={!canGeneratePairings}
              className={`w-full py-4 px-6 rounded-xl font-semibold text-white transition-all duration-200 ${
                canGeneratePairings
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 shadow-lg hover:shadow-xl'
                  : 'bg-gray-300 cursor-not-allowed'
              }`}
            >
              {canGeneratePairings ? 'Start Pairing' : `Need ${100 - userPoints} more coins`}
            </button>
          </div>

          {/* Calendar Card */}
          <div className="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-shadow duration-300">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-purple-100 rounded-full">
                <Calendar className="w-8 h-8 text-purple-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">10-Day Calendar</h2>
                <p className="text-gray-600">Personalized styling plan</p>
              </div>
            </div>
            
            <div className="space-y-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span className="text-gray-700">10 unique outfit combinations</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span className="text-gray-700">Daily styling tips & accessories</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span className="text-gray-700">Weather-aware suggestions</span>
              </div>
            </div>

            <div className="bg-purple-50 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Coins className="w-4 h-4 text-purple-600" />
                <span className="font-semibold text-purple-900">Pricing</span>
              </div>
              <p className="text-purple-800 text-sm">500 coins to unlock</p>
            </div>

            <button
              onClick={async () => {
                if (!canGenerateCalendar) return;
                // Deduct 500 coins upfront and open upload flow for calendar
                const newPoints = userPoints - 500;
                setIsCalendarFlow(true);
                handlePointsUpdate(newPoints);
                try {
                  await fetch('/api/points', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      action: 'calendar_access',
                      points: -500,
                      description: 'Unlocked 10-day outfit calendar'
                    })
                  });
                } catch (e) {
                  console.error('Failed to log calendar purchase');
                }
                setCurrentView('upload');
              }}
              disabled={!canGenerateCalendar}
              className={`w-full py-4 px-6 rounded-xl font-semibold text-white transition-all duration-200 ${
                canGenerateCalendar
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-lg hover:shadow-xl'
                  : 'bg-gray-300 cursor-not-allowed'
              }`}
            >
              {canGenerateCalendar ? 'Generate Calendar' : `Need ${500 - userPoints} more coins`}
            </button>
          </div>
        </div>

        {/* How It Works */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-12">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">How It Works</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📸</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">1. Upload Your Wardrobe</h3>
              <p className="text-gray-600">Take photos of your clothes and add details like color and style</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🤖</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">2. AI Analysis</h3>
              <p className="text-gray-600">Our AI analyzes patterns, colors, and creates perfect combinations</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">✨</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">3. Get Suggestions</h3>
              <p className="text-gray-600">Receive personalized outfit recommendations and styling tips</p>
            </div>
          </div>
        </div>

        {/* Earn Points Section */}
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Need More Coins?</h2>
          <p className="text-gray-600 mb-6">Earn coins by completing daily tasks and engaging with the app</p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg p-4">
              <div className="text-2xl mb-2">📝</div>
              <div className="font-semibold text-gray-900">Complete Profile</div>
              <div className="text-sm text-gray-600">+50 coins</div>
            </div>
            <div className="bg-white rounded-lg p-4">
              <div className="text-2xl mb-2">📅</div>
              <div className="font-semibold text-gray-900">Daily Login</div>
              <div className="text-sm text-gray-600">+10 coins</div>
            </div>
            <div className="bg-white rounded-lg p-4">
              <div className="text-2xl mb-2">⭐</div>
              <div className="font-semibold text-gray-900">Write Review</div>
              <div className="text-sm text-gray-600">+50 coins</div>
            </div>
            <div className="bg-white rounded-lg p-4">
              <div className="text-2xl mb-2">👥</div>
              <div className="font-semibold text-gray-900">Refer Friends</div>
              <div className="text-sm text-gray-600">+150 coins</div>
            </div>
          </div>
          
          <button className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-lg hover:from-yellow-600 hover:to-orange-600 transition-all duration-200 shadow-lg">
            View All Tasks
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
