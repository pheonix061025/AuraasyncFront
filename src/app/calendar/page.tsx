'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSecurePoints } from '@/hooks/useSecurePoints';
import { Calendar, Coins, ArrowLeft } from 'lucide-react';
import { getRedirectPath } from '@/lib/userState';
import OutfitUploadInterface from '@/components/OutfitUploadInterface';
import OutfitCalendarGenerator from '@/components/OutfitCalendarGenerator';
import calenderPc from '/public/CalenderPc.png';
import calenderMobile from '/public/CalenderMobile.png';
import Image from 'next/image';
import WalletButton from '@/components/WalletButton';

export default function CalendarPage() {
  const router = useRouter();
  const [currentView, setCurrentView] = useState<'main' | 'upload' | 'calendar'>('main');
  const [topwears, setTopwears] = useState<any[]>([]);
  const [bottomwears, setBottomwears] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCalendarFlow, setIsCalendarFlow] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);

  const { points: userPoints, isLoading: pointsLoading, refreshPoints } = useSecurePoints();

  useEffect(() => {
    setLoading(false);
  }, []);

  const handleItemsUploaded = (uploadedTopwears: any[], uploadedBottomwears: any[]) => {
    setTopwears(uploadedTopwears);
    setBottomwears(uploadedBottomwears);
    setCurrentView('calendar');
  };

  const handlePointsUpdate = async () => {
    await refreshPoints();
  };

  const handleGenerateCalendar = async () => {
    if (userPoints < 500) {
      alert(`You need 500 coins to generate a calendar. You currently have ${userPoints} coins.`);
      return;
    }

    setIsCalendarFlow(true);
    try {
      await refreshPoints();
      setCurrentView('upload');
    } catch (error) {
      console.error('Failed to process calendar purchase:', error);
    }
  };

  const handleBack = () => {
    const redirectPath = getRedirectPath();
    router.push(redirectPath);
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
        onPairingsGenerated={() => {}}
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
    <div className="min-h-screen bg-[url('/CalenderPc.png')] bg-cover bg-center relative overflow-hidden">
      <WalletButton />

      {/* Back Button */}
      <button
        onClick={handleBack}
        className="absolute top-4 left-4 z-20 p-3 bg-white/10 md:backdrop-blur-md rounded-full hover:bg-white/20 transition-all duration-300 group"
      >
        <ArrowLeft className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
      </button>

      {/* Background Images */}
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
        {/* Gentle overlay for improved readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#00000015] via-[#00000010] to-[#00000000]"></div>
      </div>

      {/* Content Section */}
      <div className="max-w-6xl absolute bottom-[5%] md:bottom-auto px-4 py-12 md:p-20 z-10 flex flex-col">

        {/* Header Section */}
        <div className="mb-12 p-2 md:p-4 flex flex-col items-start justify-start z-10">
          <div className="gap-3 mb-3 md:mb-6">
            <h1 className="text-[clamp(2rem,3vw,4rem)] font-bold text-white tracking-tight drop-shadow-[0_0_12px_rgba(255,255,255,0.25)]">
              10-Day{' '}
              <span
                className="text-[#FFD6EC]"
                style={{
                  textShadow:
                    '0 0 8px rgba(255, 214, 236, 0.5), 0 0 16px rgba(255, 180, 220, 0.4)',
                }}
              >
                Outfit Calendar
              </span>
            </h1>
          </div>

          <p
            className="text-xl max-w-xl leading-tight font-light"
            style={{
              color: '#ECE9FF',
              textShadow: '0 0 8px rgba(255,255,255,0.2)',
            }}
          >
            Upload your wardrobe and get AI-powered personalized styling plan for the next 10 days
          </p>
        </div>

        {/* Info Section */}
        <div className="rounded-2xl max-w-2xl p-8 w-full md:w-auto flex-shrink-0 bg-white/5 md:backdrop-blur-md border border-white/10">
          <div className="flex items-center md:gap-4 md:mb-6">
            <div className="hidden md:block">
              <h2
                className="text-2xl font-semibold"
                style={{
                  color: '#F8F8FF',
                  textShadow: '0 0 8px rgba(255,255,255,0.25)',
                }}
              >
                Generate Your Calendar
              </h2>
              <p
                style={{
                  color: '#D8D4E9',
                }}
              >
                AI-powered 10-day styling plan
              </p>
            </div>
          </div>

          <div className="hidden md:block space-y-4 mb-6">
            {[
              'Upload 5 topwears and 5 bottomwears',
              'AI analyzes your wardrobe',
              'Get 10 unique outfit combinations',
              'Daily styling tips & accessories',
              'Weather-aware suggestions',
            ].map((item, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <div className="w-2 h-2 bg-[#FFD6EC] rounded-full"></div>
                <span
                  style={{
                    color: '#E5E2F9',
                    textShadow: '0 0 6px rgba(240,240,255,0.15)',
                  }}
                >
                  {item}
                </span>
              </div>
            ))}
          </div>

          {/* Pricing Section */}
          <div className="rounded-lg p-4 mb-6 bg-white/5 border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <Coins className="w-4 h-4 text-yellow-400" />
              <span
                className="font-semibold"
                style={{ color: '#FFF8FB', textShadow: '0 0 6px rgba(255,255,255,0.2)' }}
              >
                Pricing
              </span>
            </div>
            <p style={{ color: '#DAD6EE' }}>500 coins to unlock</p>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerateCalendar}
            disabled={!canGenerateCalendar || pointsLoading}
            className={`w-full py-4 px-6 rounded-xl font-semibold text-white backdrop-blur-md transition-all duration-300 ${
              canGenerateCalendar && !pointsLoading
                ? 'bg-gradient-to-r from-rose-300/70 to-pink-400/70 shadow-[0_0_25px_rgba(244,114,182,0.4)] hover:shadow-[0_0_40px_rgba(244,114,182,0.7)] hover:from-rose-200 hover:to-pink-300'
                : 'bg-white/10 text-gray-300 cursor-not-allowed shadow-[0_0_10px_rgba(255,255,255,0.15)]'
            }`}
            style={{
              textShadow: '0 0 10px rgba(255,255,255,0.25)',
            }}
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
            <div
              className="absolute inset-0 bg-black/60"
              onClick={() => setShowInfoModal(false)}
            ></div>
            <div className="relative bg-[#251F1E] rounded-2xl p-6 max-w-sm w-full border border-purple-500/20">
              <button
                onClick={() => setShowInfoModal(false)}
                className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <svg
                  className="w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>

              <h3
                className="text-xl font-bold mb-4"
                style={{ color: '#F8F8FF', textShadow: '0 0 8px rgba(255,255,255,0.25)' }}
              >
                Features
              </h3>

              <div className="space-y-3">
                {[
                  'Upload 5 topwears and 5 bottomwears',
                  'AI analyzes your wardrobe using Gemini',
                  'Get 10 unique outfit combinations',
                  'Daily styling tips & accessories',
                  'Weather-aware suggestions',
                ].map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                    <span
                      className="text-sm"
                      style={{ color: '#E5E2F9', textShadow: '0 0 4px rgba(200,180,255,0.15)' }}
                    >
                      {feature}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
