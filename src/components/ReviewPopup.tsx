'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, X, Heart, ThumbsUp, MessageSquare } from 'lucide-react';

interface ReviewPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onRateNow: (rating: number, feedback?: string) => void;
  onRemindLater: () => void;
  onNeverShow: () => void;
  triggerAction?: string; // e.g., "analysis_complete", "onboarding_complete"
}

export default function ReviewPopup({
  isOpen,
  onClose,
  onRateNow,
  onRemindLater,
  onNeverShow,
  triggerAction = "using AuraSync"
}: ReviewPopupProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset state when popup opens
  useEffect(() => {
    if (isOpen) {
      setRating(0);
      setHoveredRating(0);
      setShowFeedback(false);
      setFeedback('');
    }
  }, [isOpen]);

  const handleRatingClick = (selectedRating: number) => {
    setRating(selectedRating);
    if (selectedRating >= 4) {
      setShowFeedback(true);
    }
  };

  const handleRateNow = async () => {
    if (rating === 0) return;
    
    setIsSubmitting(true);
    try {
      await onRateNow(rating, feedback);
      onClose();
    } catch (error) {
      console.error('Error submitting review:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRatingText = (rating: number) => {
    switch (rating) {
      case 1: return "Poor";
      case 2: return "Fair";
      case 3: return "Good";
      case 4: return "Very Good";
      case 5: return "Excellent";
      default: return "";
    }
  };

  const getActionText = () => {
    switch (triggerAction) {
      case "analysis_complete": return "completing your analysis";
      case "onboarding_complete": return "setting up your profile";
      case "outfit_pairing": return "using outfit pairing";
      case "daily_login": return "using AuraSync";
      case "dashboard_visit": return "returning to AuraSync";
      default: return "using AuraSync";
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="bg-[#251F1E] backdrop-blur-lg rounded-2xl p-6 max-w-md w-full border border-white/20 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/20">
              <Heart className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Enjoying AuraSync?
            </h2>
            <p className="text-gray-300 text-sm">
              How was your experience {getActionText()}?
            </p>
          </div>

          {/* Rating Stars */}
          <div className="text-center mb-6">
            <div className="flex justify-center gap-2 mb-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => handleRatingClick(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className={`p-2 rounded-lg transition-all duration-200 ${
                    star <= (hoveredRating || rating)
                      ? 'bg-white/20 text-white scale-110'
                      : 'bg-white/10 text-gray-400 hover:bg-white/20'
                  }`}
                >
                  <Star className="w-6 h-6 fill-current" />
                </button>
              ))}
            </div>
            
            {rating > 0 && (
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-gray-300 font-semibold"
              >
                {getRatingText(rating)}
              </motion.p>
            )}
          </div>

          {/* Feedback Form (for 4+ stars) */}
          <AnimatePresence>
            {showFeedback && rating >= 4 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6"
              >
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  What did you love most? (Optional)
                </label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Tell us what made your experience great..."
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-white/40 resize-none"
                  rows={3}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action Buttons */}
          <div className="space-y-3">
            {rating > 0 && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={handleRateNow}
                disabled={isSubmitting}
                className="w-full bg-white/20 text-white py-3 rounded-lg font-semibold hover:bg-white/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 border border-white/30"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <ThumbsUp className="w-4 h-4" />
                    Rate Now
                  </>
                )}
              </motion.button>
            )}

            <div className="flex gap-2">
              <button
                onClick={onRemindLater}
                className="flex-1 bg-white/10 text-white py-2.5 rounded-lg font-medium hover:bg-white/20 transition-all flex items-center justify-center gap-2"
              >
                <MessageSquare className="w-4 h-4" />
                Remind Me Later
              </button>
              
              <button
                onClick={onNeverShow}
                className="flex-1 bg-gray-500/20 text-gray-300 py-2.5 rounded-lg font-medium hover:bg-gray-500/30 transition-all"
              >
                Never Show Again
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-400">
              Your feedback helps us improve AuraSync for everyone
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
