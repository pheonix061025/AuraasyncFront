'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Star, Heart, ThumbsUp, MessageSquare, Zap } from 'lucide-react';
import { useAutoReviewPopup } from '@/hooks/useReviewPopup';
import ReviewPopup from '@/components/ReviewPopup';

export default function TestReviewPopupPage() {
  const reviewPopup = useAutoReviewPopup();

  const triggerActions = [
    {
      name: 'Analysis Complete',
      action: 'analysis_complete',
      icon: '🔬',
      description: 'Trigger after completing any analysis'
    },
    {
      name: 'Onboarding Complete',
      action: 'onboarding_complete',
      icon: '✅',
      description: 'Trigger after finishing onboarding'
    },
    {
      name: 'Outfit Pairing',
      action: 'outfit_pairing',
      icon: '👔',
      description: 'Trigger after using outfit pairing feature'
    },
    {
      name: 'Daily Login',
      action: 'daily_login',
      icon: '📅',
      description: 'Trigger after daily login bonus'
    }
  ];

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Review Popup Test Suite</h1>
          <p className="text-gray-300">Test the in-build review popup system</p>
        </div>

        {/* Test Controls */}
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6">
            <h2 className="text-2xl font-semibold mb-4 flex items-center">
              <Zap className="w-6 h-6 mr-2 text-yellow-400" />
              Trigger Actions
            </h2>
            <p className="text-gray-300 mb-4">
              Click any button to simulate a user action and trigger the review popup
            </p>
            <div className="space-y-3">
              {triggerActions.map((trigger, index) => (
                <motion.button
                  key={index}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => reviewPopup.showPopup(trigger.action)}
                  className="w-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-lg p-4 text-left hover:from-purple-500/30 hover:to-pink-500/30 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{trigger.icon}</span>
                    <div>
                      <div className="font-semibold text-white">{trigger.name}</div>
                      <div className="text-sm text-gray-400">{trigger.description}</div>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6">
            <h2 className="text-2xl font-semibold mb-4 flex items-center">
              <Heart className="w-6 h-6 mr-2 text-red-400" />
              Popup Status
            </h2>
            <div className="space-y-4">
              <div className="bg-white/5 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-300">Popup Open:</span>
                  <span className={`font-semibold ${reviewPopup.isOpen ? 'text-green-400' : 'text-red-400'}`}>
                    {reviewPopup.isOpen ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-300">Trigger Action:</span>
                  <span className="font-semibold text-blue-400">
                    {reviewPopup.triggerAction || 'None'}
                  </span>
                </div>
              </div>

              <div className="bg-white/5 rounded-lg p-4">
                <h3 className="font-semibold text-white mb-2">Quick Actions</h3>
                <div className="space-y-2">
                  <button
                    onClick={reviewPopup.closePopup}
                    className="w-full bg-blue-500/20 text-blue-400 py-2 rounded-lg hover:bg-blue-500/30 transition-all"
                  >
                    Close Popup
                  </button>
                  <button
                    onClick={() => reviewPopup.showPopup('analysis_complete')}
                    className="w-full bg-green-500/20 text-green-400 py-2 rounded-lg hover:bg-green-500/30 transition-all"
                  >
                    Show Analysis Popup
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Popup Features Demo */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-4 flex items-center">
            <Star className="w-6 h-6 mr-2 text-yellow-400" />
            Popup Features
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-white mb-3">Rating System</h3>
              <ul className="text-sm text-gray-300 space-y-2">
                <li>• 5-star rating with hover effects</li>
                <li>• Visual feedback for selected rating</li>
                <li>• Text descriptions (Poor, Fair, Good, etc.)</li>
                <li>• Smooth animations and transitions</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-3">User Actions</h3>
              <ul className="text-sm text-gray-300 space-y-2">
                <li>• Rate Now - Submit review and earn points</li>
                <li>• Remind Me Later - Show again in 3 days</li>
                <li>• Never Show Again - Permanently disable</li>
                <li>• Optional feedback for 4+ star ratings</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Integration Points */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6">
          <h2 className="text-2xl font-semibold mb-4 flex items-center">
            <MessageSquare className="w-6 h-6 mr-2 text-blue-400" />
            Integration Points
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-white/5 rounded-lg p-4">
              <h3 className="font-semibold text-white mb-2">Onboarding</h3>
              <p className="text-sm text-gray-300">
                Popup appears after completing each analysis step and final onboarding
              </p>
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <h3 className="font-semibold text-white mb-2">Dashboard</h3>
              <p className="text-sm text-gray-300">
                Popup can appear after daily login or other major actions
              </p>
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <h3 className="font-semibold text-white mb-2">Points System</h3>
              <p className="text-sm text-gray-300">
                Users earn 50 coins for submitting reviews, integrated with points system
              </p>
            </div>
          </div>
        </div>

        {/* Review Popup Component */}
        <ReviewPopup
          isOpen={reviewPopup.isOpen}
          onClose={reviewPopup.closePopup}
          onRateNow={reviewPopup.handleRateNow}
          onRemindLater={reviewPopup.handleRemindLater}
          onNeverShow={reviewPopup.handleNeverShow}
          triggerAction={reviewPopup.triggerAction}
        />
      </div>
    </div>
  );
}
