'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSecurePoints } from '@/hooks/useSecurePoints';
import { Calendar, Coins, Camera, Info } from 'lucide-react';
import { getUserData, setUserData } from '@/lib/userState';
import OutfitUploadInterface from '@/components/OutfitUploadInterface';
import OutfitCalendarGenerator from '@/components/OutfitCalendarGenerator';
import calenderPc from '/public/CalenderPc.png'
import calenderMobile from '/public/CalenderMobile.png'
import Image from 'next/image';
import BottomNav from '@/components/male/BottomNavigation';
import WalletButton from '@/components/WalletButton';

export default function CalendarPage() {
  const router = useRouter();
  const [currentView, setCurrentView] = useState<'main' | 'upload' | 'calendar'>('main');
  const [topwears, setTopwears] = useState<any[]>([]);
  const [bottomwears, setBottomwears] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCalendarFlow, setIsCalendarFlow] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);

  // Use secure points hook instead of localStorage
  const { points: userPoints, isLoading: pointsLoading, refreshPoints } = useSecurePoints();

  useEffect(() => {
    // Only load non-sensitive data from localStorage
    setLoading(false);
  }, []);

  const handleItemsUploaded = (uploadedTopwears: any[], uploadedBottomwears: any[]) => {
    setTopwears(uploadedTopwears);
    setBottomwears(uploadedBottomwears);
    setCurrentView('calendar');
  };

  const handlePairingsGenerated = () => {
    // Not used in calendar flow, but required by OutfitUploadInterface
  };

  const handlePointsUpdate = async (newPoints: number) => {
    // Refresh points from secure source instead of setting manually
    await refreshPoints();
  };

  const handleGenerateCalendar = async () => {
    if (userPoints < 500) {
      alert(`You need 500 coins to generate a calendar. You currently have ${userPoints} coins.`);
      return;
    }

    setIsCalendarFlow(true);
    try {
      // Use secure points deduction (would be implemented in the secure points hook)
      await refreshPoints();
      setCurrentView('upload');
    } catch (error) {
      console.error('Failed to process calendar purchase:', error);
    }
  };

  const canGenerateCalendar = userPoints >= 500;

  if (loading || pointsLoading) {
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
    <div className="h-screen bg-[url('/CalenderPc.png')] bg-cover bg-center">
      <WalletButton/>
      <div className="absolute inset-0 z-0">
        <Image
          src={calenderPc}
          alt="AI-powered virtual try-on with digital mirror and styling interface"
          className="w-full h-full hidden md:block object-cover"
        />
        <Image
          src={calenderMobile}
          alt="AI-powered virtual try-on with digital mirror and styling interface"
          className="w-full h-full md:hidden object-cover"
        />
        {/* Overlay for better text readability */}
        <div className="absolute inset-0 bg-black/20"></div>
      </div>

      <div className="max-w-6xl  absolute bottom-[5%] md:bottom-auto  px-4 py-12 md:p-20 z-10 flex flex-col">
        {/* Header */}
        <div className="mb-12 p-2 md:p-4   flex flex-col  items-start justify-start z-10 md:flex-auto">
          <div className=" gap-3 mb-3 md:mb-6">
            {/* <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full">
              <Calendar className="w-8 h-8 text-white" />
            </div> */}
            <h1 className="text-[clamp(2rem,3vw,4rem)] font-bold text-white z-10">10-Day Outfit Calendar</h1>
          </div>
          <p className="text-xl text-white/80  leading-tight font-light max-w-xl">
            Upload your wardrobe and get AI-powered personalized styling plan for the next 10 days
          </p>
        </div>

        {/* Main Content Card - Bottom aligned on mobile */}
        <div className="rounded-2xl  max-w-2xl  p-8    w-full md:w-auto flex-shrink-0">
          <div className="flex items-center md:gap-4 md:mb-6">
    
            <div className='hidden md:block'>
              <h2 className="text-2xl font-bold text-white">Generate Your Calendar</h2>
              <p className="text-gray-400">AI-powered 10-day styling plan</p>
            </div>
          </div>

          {/* Info List - Desktop Only */}
          <div className="hidden md:block space-y-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-rose-200 rounded-full"></div>
              <span className="text-gray-300">Upload 5 topwears and 5 bottomwears</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-rose-200 rounded-full"></div>
              <span className="text-gray-300">AI analyzes your wardrobe using Gemini</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-rose-200 rounded-full"></div>
              <span className="text-gray-300">Get 10 unique outfit combinations</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-rose-200 rounded-full"></div>
              <span className="text-gray-300">Daily styling tips & accessories</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-rose-200 rounded-full"></div>
              <span className="text-gray-300">Weather-aware suggestions</span>
            </div>
          </div>

          {/* Info Icon - Mobile Only */}
          

          <div className=" rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Coins className="w-4 h-4 text-yellow-400" />
              <span className="font-semibold text-white">Pricing</span>
            </div>
            <p className="text-gray-300 text-sm">500 coins to unlock</p>
          </div>

          <button
  onClick={handleGenerateCalendar}
  disabled={!canGenerateCalendar || pointsLoading}
  className={`w-full py-4 px-6 rounded-xl font-semibold text-white backdrop-blur-md transition-all duration-300
  ${canGenerateCalendar && !pointsLoading
    ? 'bg-gradient-to-r from-rose-300/70 to-pink-400/70 shadow-[0_0_25px_rgba(244,114,182,0.4)] hover:shadow-[0_0_40px_rgba(244,114,182,0.7)] hover:from-rose-200 hover:to-pink-300'
    : 'bg-white/10 text-gray-300 cursor-not-allowed shadow-[0_0_10px_rgba(255,255,255,0.15)]'
  }`}
>
  {pointsLoading
    ? 'Loading...'
    : canGenerateCalendar
      ? 'Generate Calendar'
      : `Need ${500 - userPoints} more coins`}
</button>


        </div>

        {/* Info Modal */}
        {showInfoModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60" onClick={() => setShowInfoModal(false)}></div>
            <div className="relative bg-[#251F1E] rounded-2xl p-6 max-w-sm w-full border border-purple-500/20">
              <button
                onClick={() => setShowInfoModal(false)}
                className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <h3 className="text-xl font-bold text-white mb-4">Features</h3>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                  <span className="text-gray-300 text-sm">Upload 5 topwears and 5 bottomwears</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                  <span className="text-gray-300 text-sm">AI analyzes your wardrobe using Gemini</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                  <span className="text-gray-300 text-sm">Get 10 unique outfit combinations</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                  <span className="text-gray-300 text-sm">Daily styling tips & accessories</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                  <span className="text-gray-300 text-sm">Weather-aware suggestions</span>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
      <BottomNav />
    </div>
  );
}