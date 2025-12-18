'use client';

import { useState, useEffect } from 'react';
import { 
  reviewPopupManager, 
  shouldShowReviewPopup, 
  handleReviewPopupShown,
  handleReviewPopupRemindLater,
  handleReviewPopupNeverShow,
  handleReviewSubmission
} from '@/lib/reviewPopupManager';

interface UseReviewPopupReturn {
  isOpen: boolean;
  triggerAction: string;
  showPopup: (action: string) => void;
  closePopup: () => void;
  handleRateNow: (rating: number, feedback?: string) => void;
  handleRemindLater: () => void;
  handleNeverShow: () => void;
  forceShow: (action: string) => void; // Forces popup to show regardless of restrictions
}

export function useReviewPopup(): UseReviewPopupReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [triggerAction, setTriggerAction] = useState('');

  // Show popup for specific action
  const showPopup = (action: string) => {
    if (shouldShowReviewPopup(action)) {
      setTriggerAction(action);
      setIsOpen(true);
      handleReviewPopupShown();
    }
  };

  // Close popup
  const closePopup = () => {
    setIsOpen(false);
    setTriggerAction('');
  };

  // Handle "Rate Now" action
  const handleRateNow = async (rating: number, feedback?: string) => {
    try {
      handleReviewSubmission(rating, feedback || '', triggerAction);
      closePopup();
    } catch (error) {
      console.error('Error submitting review:', error);
    }
  };

  // Handle "Remind Me Later" action
  const handleRemindLater = () => {
    handleReviewPopupRemindLater();
    closePopup();
  };

  // Handle "Never Show Again" action
  const handleNeverShow = () => {
    handleReviewPopupNeverShow();
    closePopup();
  };

  // Force show popup regardless of restrictions (for returning users)
  const forceShow = (action: string) => {
    // Only bypass if user hasn't explicitly chosen "Never Show Again"
    if (!reviewPopupManager.getPreferences().neverShowAgain) {
      setTriggerAction(action);
      setIsOpen(true);
      // Don't mark as shown yet - only mark when user actually interacts with it
    }
  };

  return {
    isOpen,
    triggerAction,
    showPopup,
    closePopup,
    handleRateNow,
    handleRemindLater,
    handleNeverShow,
    forceShow
  };
}

// Hook for automatically showing popup after specific actions
export function useAutoReviewPopup() {
  const reviewPopup = useReviewPopup();

  // Show popup after analysis completion
  const showAfterAnalysis = () => {
    reviewPopup.showPopup('analysis_complete');
  };

  // Show popup after onboarding completion
  const showAfterOnboarding = () => {
    reviewPopup.showPopup('onboarding_complete');
  };

  // Show popup after outfit pairing
  const showAfterOutfitPairing = () => {
    reviewPopup.showPopup('outfit_pairing');
  };

  // Show popup after daily login (if enabled)
  const showAfterDailyLogin = () => {
    reviewPopup.showPopup('daily_login');
  };

  // Force show popup on dashboard load (bypasses restrictions)
  const showOnDashboardLoad = () => {
    reviewPopup.forceShow('dashboard_visit');
  };

  return {
    ...reviewPopup,
    showAfterAnalysis,
    showAfterOnboarding,
    showAfterOutfitPairing,
    showAfterDailyLogin,
    showOnDashboardLoad
  };
}
