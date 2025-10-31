'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Coins, Camera } from 'lucide-react';
import { getUserData, setUserData } from '@/lib/userState';
import OutfitUploadInterface from '@/components/OutfitUploadInterface';
import OutfitCalendarGenerator from '@/components/OutfitCalendarGenerator';

export default function CalendarPage() {
  const router = useRouter();
  const [currentView, setCurrentView] = useState<'main' | 'upload' | 'calendar'>('main');
  const [userPoints, setUserPoints] = useState(0);
  const [topwears, setTopwears] = useState<any[]>([]);
  const [bottomwears, setBottomwears] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCalendarFlow, setIsCalendarFlow] = useState(false);

  useEffect(() => {
    // Load user points and free pairing status
    const loadUserData = async () => {
      try {
        // Prefer structured user state
        const localUser = getUserData();
        if (localUser?.points != null) {
          setUserPoints(localUser.points);
        } else {
          const storedPoints = localStorage.getItem('userPoints');
          if (storedPoints) setUserPoints(parseInt(storedPoints));
        }

        // Try to refresh from Supabase if email is available
        if (localUser?.email) {
          try {
            const response = await fetch(`/api/user?email=${encodeURIComponent(localUser.email)}`);
            if (response.ok) {
              const userFromApi = await response.json();
              const apiPoints = userFromApi.points || 0;
              setUserPoints(apiPoints);
              // keep local user data in sync
              setUserData({ ...(localUser || {}), points: apiPoints } as any);
              localStorage.setItem('userPoints', String(apiPoints));
            }
          } catch (_) {
            // ignore, keep local
          }
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
    setCurrentView('calendar');
  };

  const handlePairingsGenerated = () => {
    // Not used in calendar flow, but required by OutfitUploadInterface
  };

  const handlePointsUpdate = (newPoints: number) => {
    setUserPoints(newPoints);
    localStorage.setItem('userPoints', newPoints.toString());
  };

  const handleGenerateCalendar = async () => {
    if (userPoints < 500) {
      alert(`You need 500 coins to generate a calendar. You currently have ${userPoints} coins.`);
      return;
    }

    // Deduct 500 coins upfront and open upload flow for calendar
    const newPoints = userPoints - 500;
    setIsCalendarFlow(true);
    handlePointsUpdate(newPoints);
    // sync structured user object if present
    const localUser = getUserData();
    if (localUser) {
      setUserData({ ...localUser, points: newPoints });
    }
    
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
      console.error('Failed to log calendar purchase:', e);
    }
    
    setCurrentView('upload');
  };

  const canGenerateCalendar = userPoints >= 500;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#251F1E] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-gray-400">Loading calendar...</p>
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
        hideGeneratePairingsButton={true}
      />
    );
  }

  if (currentView === 'calendar') {
    return (
      <OutfitCalendarGenerator
        topwears={topwears}
        bottomwears={bottomwears}
        onBack={() => setCurrentView('main')}
        userPoints={userPoints}
        onPointsUpdate={handlePointsUpdate}
        alreadyPaid={isCalendarFlow}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#251F1E]">
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full">
              <Calendar className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-white">10-Day Outfit Calendar</h1>
          </div>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Upload your wardrobe and get AI-powered personalized styling plan for the next 10 days
          </p>
        </div>

        {/* Points Display */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2 px-6 py-3 bg-white/10 rounded-full shadow-lg">
            <Coins className="w-5 h-5 text-yellow-400" />
            <span className="font-semibold text-white">{userPoints} coins</span>
          </div>
        </div>

        {/* Main Content Card */}
        <div className="bg-white/10 rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-shadow duration-300">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-purple-100 rounded-full">
              <Calendar className="w-8 h-8 text-purple-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Generate Your Calendar</h2>
              <p className="text-gray-400">AI-powered 10-day styling plan</p>
            </div>
          </div>
          
          <div className="space-y-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span className="text-gray-300">Upload 5 topwears and 5 bottomwears</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span className="text-gray-300">AI analyzes your wardrobe using Gemini</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span className="text-gray-300">Get 10 unique outfit combinations</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span className="text-gray-300">Daily styling tips & accessories</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span className="text-gray-300">Weather-aware suggestions</span>
            </div>
          </div>

          <div className="bg-purple-50/10 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Coins className="w-4 h-4 text-purple-400" />
              <span className="font-semibold text-purple-300">Pricing</span>
            </div>
            <p className="text-purple-200 text-sm">500 coins to unlock</p>
          </div>

          <button
            onClick={handleGenerateCalendar}
            disabled={!canGenerateCalendar}
            className={`w-full py-4 px-6 rounded-xl font-semibold text-white transition-all duration-200 ${
              canGenerateCalendar
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-lg hover:shadow-xl'
                : 'bg-gray-600 cursor-not-allowed'
            }`}
          >
            {canGenerateCalendar ? 'Generate Calendar (500 coins)' : `Need ${500 - userPoints} more coins`}
          </button>
        </div>

        {/* How It Works */}
        <div className="mt-12 bg-white/5 rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-bold text-white text-center mb-8">How It Works</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Camera className="w-8 h-8 text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">1. Upload Your Wardrobe</h3>
              <p className="text-gray-400">Upload 5 topwears and 5 bottomwears with clear photos</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🤖</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">2. AI Analysis</h3>
              <p className="text-gray-400">Gemini AI analyzes your clothes and creates perfect combinations</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-pink-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-pink-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">3. Get Your Calendar</h3>
              <p className="text-gray-400">Receive a personalized 10-day outfit calendar with styling tips</p>
            </div>
          </div>
        </div>

        {/* Earn Points Section */}
        <div className="mt-12 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Need More Coins?</h2>
          <p className="text-gray-300 mb-6">Earn coins by completing daily tasks and engaging with the app</p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white/10 rounded-lg p-4">
              <div className="text-2xl mb-2">📝</div>
              <div className="font-semibold text-white">Complete Profile</div>
              <div className="text-sm text-gray-400">+50 coins</div>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <div className="text-2xl mb-2">📅</div>
              <div className="font-semibold text-white">Daily Login</div>
              <div className="text-sm text-gray-400">+10 coins</div>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <div className="text-2xl mb-2">⭐</div>
              <div className="font-semibold text-white">Write Review</div>
              <div className="text-sm text-gray-400">+50 coins</div>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <div className="text-2xl mb-2">👥</div>
              <div className="font-semibold text-white">Refer Friends</div>
              <div className="text-sm text-gray-400">+150 coins</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}