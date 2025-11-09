// Review Popup Manager
// Handles the logic for showing review popups based on user actions and preferences

export interface ReviewPopupPreferences {
  showPopup: boolean;
  lastShown?: string; // ISO date string
  remindAfterDays: number;
  neverShowAgain: boolean;
  popupTriggers: {
    analysis_complete: boolean;
    onboarding_complete: boolean;
    outfit_pairing: boolean;
    daily_login: boolean;
    rewards_incentive?: boolean; // Optional for backward compatibility
  };
}

export interface ReviewData {
  rating: number;
  feedback?: string;
  triggerAction: string;
  timestamp: string;
}

export class ReviewPopupManager {
  private static instance: ReviewPopupManager;
  private preferences: ReviewPopupPreferences;
  private reviewData: ReviewData[] = [];

  static getInstance(): ReviewPopupManager {
    if (!ReviewPopupManager.instance) {
      ReviewPopupManager.instance = new ReviewPopupManager();
    }
    return ReviewPopupManager.instance;
  }

  constructor() {
    this.preferences = this.loadPreferences();
  }

  // Load user preferences from localStorage
  private loadPreferences(): ReviewPopupPreferences {
    if (typeof window === 'undefined') {
      return this.getDefaultPreferences();
    }

    try {
      const stored = localStorage.getItem('aurasync_review_preferences');
      if (stored) {
        return { ...this.getDefaultPreferences(), ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Error loading review preferences:', error);
    }

    return this.getDefaultPreferences();
  }

  // Get default preferences
  private getDefaultPreferences(): ReviewPopupPreferences {
    return {
      showPopup: true,
      remindAfterDays: 3,
      neverShowAgain: false,
      popupTriggers: {
        analysis_complete: true,
        onboarding_complete: true,
        outfit_pairing: true,
        daily_login: false,
        rewards_incentive: true // Allow review popup from rewards modal
      }
    };
  }

  // Save preferences to localStorage
  private savePreferences(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem('aurasync_review_preferences', JSON.stringify(this.preferences));
    } catch (error) {
      console.error('Error saving review preferences:', error);
    }
  }

  // Check if popup should be shown for a specific action
  shouldShowPopup(action: string): boolean {
    // Don't show if user disabled it
    if (this.preferences.neverShowAgain) {
      return false;
    }

    // Don't show if popup is globally disabled
    if (!this.preferences.showPopup) {
      return false;
    }

    // Check if this action should trigger popup
    const triggerKey = action as keyof typeof this.preferences.popupTriggers;
    if (!this.preferences.popupTriggers[triggerKey]) {
      return false;
    }

    // Check if enough time has passed since last shown
    if (this.preferences.lastShown) {
      const lastShown = new Date(this.preferences.lastShown);
      const now = new Date();
      const daysSinceLastShown = Math.floor((now.getTime() - lastShown.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysSinceLastShown < this.preferences.remindAfterDays) {
        return false;
      }
    }

    return true;
  }

  // Mark popup as shown
  markPopupShown(): void {
    this.preferences.lastShown = new Date().toISOString();
    this.savePreferences();
  }

  // Handle "Remind Me Later" action
  handleRemindLater(): void {
    this.markPopupShown();
  }

  // Handle "Never Show Again" action
  handleNeverShow(): void {
    this.preferences.neverShowAgain = true;
    this.savePreferences();
  }

  // Handle review submission
  async handleReviewSubmission(rating: number, feedback: string, triggerAction: string): Promise<void> {
    const reviewData: ReviewData = {
      rating,
      feedback,
      triggerAction,
      timestamp: new Date().toISOString()
    };

    this.reviewData.push(reviewData);
    this.markPopupShown();

    // Save review data locally
    this.saveReviewData();

    // Save to Supabase database
    await this.saveReviewToDatabase(rating, feedback, triggerAction);

    // Award points for review
    this.awardReviewPoints(rating);
  }

  // Save review to Supabase database
  private async saveReviewToDatabase(rating: number, feedback: string, triggerAction: string): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      // Try multiple ways to get user_id
      let user_id = null;
      
      // Method 1: Check aurasync_user_data (with single 'a')
      try {
        const userData = JSON.parse(localStorage.getItem('aurasync_user_data') || '{}');
        user_id = userData.user_id || userData.id;
        console.log('User data from aurasync_user_data:', userData);
      } catch (e) {
        console.warn('Failed to parse aurasync_user_data:', e);
      }

      // Method 1b: Check auraasync_user_data (with double 'a' - typo variation)
      if (!user_id) {
        try {
          const userData = JSON.parse(localStorage.getItem('auraasync_user_data') || '{}');
          user_id = userData.user_id || userData.id;
          console.log('User data from auraasync_user_data:', userData);
        } catch (e) {
          console.warn('Failed to parse auraasync_user_data:', e);
        }
      }

      // Method 2: Check other possible localStorage keys
      if (!user_id) {
        try {
          const authData = JSON.parse(localStorage.getItem('auth_user') || '{}');
          user_id = authData.user_id || authData.id || authData.uid;
          console.log('User data from auth_user:', authData);
        } catch (e) {
          console.warn('Failed to parse auth_user:', e);
        }
      }

      // Method 3: Check all localStorage keys for user data
      if (!user_id) {
        console.log('Checking all localStorage keys...');
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          console.log(`localStorage[${key}]:`, localStorage.getItem(key || ''));
        }
      }

      if (!user_id) {
        console.error('No user_id found in localStorage. Available keys:', Object.keys(localStorage));
        alert('Please log in again to submit reviews. User session not found.');
        return;
      }

      console.log('Using user_id:', user_id);

      // Prepare review data for API
      const reviewPayload = {
        user_id: user_id,
        product_id: 'aurasync-app', // General app review
        product_name: 'AuraSync Application',
        review_text: feedback || `User rated ${rating} stars`, // Required field
        feedback: feedback || '', // Optional additional feedback field
        rating: rating,
        points_awarded: this.calculateReviewPoints(rating),
        trigger_action: triggerAction
      };

      console.log('Sending review to API:', reviewPayload);

      // Send to API
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reviewPayload)
      });

      const responseText = await response.text();
      console.log('API Response Status:', response.status);
      console.log('API Response Text:', responseText);

      if (!response.ok) {
        let errorData;
        try {
          errorData = JSON.parse(responseText);
        } catch (e) {
          errorData = { error: responseText };
        }
        console.error('API error response:', errorData);
        alert(`Failed to save review: ${errorData.error || 'Unknown error'}. Please check console for details.`);
        throw new Error(errorData.error || 'Failed to save review');
      }

      const savedReview = JSON.parse(responseText);
      console.log('Review saved to database successfully:', savedReview);
      alert('Review submitted successfully! You earned ' + this.calculateReviewPoints(rating) + ' coins!');
    } catch (error) {
      console.error('Error saving review to database:', error);
      // Don't throw error - review is still saved locally
    }
  }

  // Calculate points for review based on rating
  private calculateReviewPoints(rating: number): number {
    // Award more points for higher ratings
    const basePoints = 50; // Base points for any review
    const bonusPoints = rating >= 4 ? 25 : 0; // Bonus for good reviews
    return basePoints + bonusPoints;
  }

  // Save review data to localStorage
  private saveReviewData(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem('aurasync_review_data', JSON.stringify(this.reviewData));
    } catch (error) {
      console.error('Error saving review data:', error);
    }
  }

  // Load review data from localStorage
  loadReviewData(): ReviewData[] {
    if (typeof window === 'undefined') return [];

    try {
      const stored = localStorage.getItem('aurasync_review_data');
      if (stored) {
        this.reviewData = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading review data:', error);
    }

    return this.reviewData;
  }

  // Award points for review submission
  private awardReviewPoints(rating: number): void {
    // Import points manager dynamically to avoid circular dependencies
    import('./pointsSystem').then(({ pointsManager }) => {
      try {
        const userData = JSON.parse(localStorage.getItem('aurasync_user_data') || '{}');
        if (userData && userData.points !== undefined) {
          const result = pointsManager.awardPoints(userData, 'REVIEW', `App review (${rating} stars)`);
          localStorage.setItem('aurasync_user_data', JSON.stringify(result.userData));
        }
      } catch (error) {
        console.error('Error awarding review points:', error);
      }
    });
  }

  // Get user preferences
  getPreferences(): ReviewPopupPreferences {
    return { ...this.preferences };
  }

  // Update preferences
  updatePreferences(updates: Partial<ReviewPopupPreferences>): void {
    this.preferences = { ...this.preferences, ...updates };
    this.savePreferences();
  }

  // Reset preferences to default
  resetPreferences(): void {
    this.preferences = this.getDefaultPreferences();
    this.savePreferences();
  }

  // Get review statistics
  getReviewStats(): {
    totalReviews: number;
    averageRating: number;
    lastReviewDate?: string;
  } {
    if (this.reviewData.length === 0) {
      return { totalReviews: 0, averageRating: 0 };
    }

    const totalRating = this.reviewData.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / this.reviewData.length;
    const lastReviewDate = this.reviewData[this.reviewData.length - 1]?.timestamp;

    return {
      totalReviews: this.reviewData.length,
      averageRating: Math.round(averageRating * 10) / 10,
      lastReviewDate
    };
  }

  // Check if user has given any reviews
  hasUserReviewed(): boolean {
    return this.reviewData.length > 0;
  }

  // Get trigger actions that are enabled
  getEnabledTriggers(): string[] {
    return Object.entries(this.preferences.popupTriggers)
      .filter(([_, enabled]) => enabled)
      .map(([action, _]) => action);
  }
}

// Export singleton instance
export const reviewPopupManager = ReviewPopupManager.getInstance();

// Utility functions for easy access
export const shouldShowReviewPopup = (action: string): boolean => {
  return reviewPopupManager.shouldShowPopup(action);
};

export const handleReviewPopupShown = (): void => {
  reviewPopupManager.markPopupShown();
};

export const handleReviewPopupRemindLater = (): void => {
  reviewPopupManager.handleRemindLater();
};

export const handleReviewPopupNeverShow = (): void => {
  reviewPopupManager.handleNeverShow();
};

export const handleReviewSubmission = async (rating: number, feedback: string, triggerAction: string): Promise<void> => {
  await reviewPopupManager.handleReviewSubmission(rating, feedback, triggerAction);
};
