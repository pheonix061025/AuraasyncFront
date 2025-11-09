// Points and Rewards System
// This file handles all points-related functionality for the AuraSync app

export interface PointsAction {
  id: string;
  name: string;
  points: number;
  description: string;
  category: 'onboarding' | 'engagement' | 'social' | 'premium';
}

export interface PointsTransaction {
  id: string;
  action: string;
  points: number;
  timestamp: string;
  description: string;
}

export interface PointsReward {
  id: string;
  name: string;
  cost: number;
  description: string;
  category: 'feature' | 'premium' | 'unlock';
  isUnlocked: boolean;
}

// Points earning actions
export const POINTS_ACTIONS: Record<string, PointsAction> = {
  SIGNUP: {
    id: 'signup',
    name: 'Welcome Bonus',
    points: 50,
    description: 'Earned for completing signup',
    category: 'onboarding'
  },
  ONBOARDING_COMPLETE: {
    id: 'onboarding_complete',
    name: 'Profile Complete',
    points: 50,
    description: 'Earned for completing full analysis',
    category: 'onboarding'
  },
  DAILY_LOGIN: {
    id: 'daily_login',
    name: 'Daily Check-in',
    points: 10,
    description: 'Earned for daily login',
    category: 'engagement'
  },
  REFERRAL: {
    id: 'referral',
    name: 'Friend Referral',
    points: 150,
    description: 'Earned for referring a friend',
    category: 'social'
  },
  REFERRAL_BONUS: {
    id: 'referral_bonus',
    name: 'Referral Bonus',
    points: 50,
    description: 'Earned for using a referral code',
    category: 'social'
  },
  REVIEW: {
    id: 'review',
    name: 'Product Review',
    points: 50,
    description: 'Earned for writing a review',
    category: 'engagement'
  },
  ANALYSIS_COMPLETE: {
    id: 'analysis_complete',
    name: 'Analysis Complete',
    points: 50,
    description: 'Earned for completing any analysis',
    category: 'onboarding'
  }
};

// Premium features that can be unlocked with points
export const POINTS_REWARDS: Record<string, PointsReward> = {
  OUTFIT_PAIRING: {
    id: 'outfit_pairing',
    name: 'Outfit Pairing Session',
    cost: 100,
    description: 'Get AI-powered outfit pairing suggestions for your wardrobe',
    category: 'feature',
    isUnlocked: false
  },
  CALENDAR_ACCESS: {
    id: 'calendar_access',
    name: '10-Day Style Calendar',
    cost: 500,
    description: 'Unlock 10-day personalized outfit calendar with daily styling plans',
    category: 'premium',
    isUnlocked: false
  },
  PREMIUM_HAIRSTYLES: {
    id: 'premium_hairstyles',
    name: 'Premium Hairstyles',
    cost: 100,
    description: 'Access to exclusive hairstyle recommendations',
    category: 'unlock',
    isUnlocked: false
  },
  ADVANCED_ANALYSIS: {
    id: 'advanced_analysis',
    name: 'Advanced Analysis',
    cost: 300,
    description: 'Get detailed style analysis with AI insights',
    category: 'premium',
    isUnlocked: false
  }
};

// Points management functions
export class PointsManager {
  private static instance: PointsManager;
  private transactions: PointsTransaction[] = [];

  static getInstance(): PointsManager {
    if (!PointsManager.instance) {
      PointsManager.instance = new PointsManager();
    }
    return PointsManager.instance;
  }

  // Initialize user with default points
  initializeUser(userData: any): any {
    const today = new Date().toISOString().split('T')[0];
    
    return {
      ...userData,
      points: userData.points || 0,
      last_login_date: userData.last_login_date || today,
      referral_code: userData.referral_code || this.generateReferralCode(),
      total_referrals: userData.total_referrals || 0
    };
  }

  // Generate unique referral code
  private generateReferralCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // Award points for specific actions
  awardPoints(userData: any, actionId: string, description?: string): { userData: any; transaction: PointsTransaction } {
    const action = POINTS_ACTIONS[actionId];
    if (!action) {
      throw new Error(`Invalid action: ${actionId}`);
    }

    const currentPoints = userData.points || 0;
    const newPoints = currentPoints + action.points;
    
    const transaction: PointsTransaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      action: actionId,
      points: action.points,
      timestamp: new Date().toISOString(),
      description: description || action.description
    };

    this.transactions.push(transaction);

    const updatedUserData = {
      ...userData,
      points: newPoints
    };

    return { userData: updatedUserData, transaction };
  }

  // Check if user can earn daily login points
  canEarnDailyLogin(userData: any): boolean {
    const today = new Date().toISOString().split('T')[0];
    return userData.last_login_date !== today;
  }

  // Award daily login points if eligible
  awardDailyLogin(userData: any): { userData: any; transaction: PointsTransaction | null } {
    if (!this.canEarnDailyLogin(userData)) {
      return { userData, transaction: null };
    }

    const today = new Date().toISOString().split('T')[0];
    const result = this.awardPoints(userData, 'DAILY_LOGIN', 'Daily login bonus');
    
    return {
      userData: {
        ...result.userData,
        last_login_date: today
      },
      transaction: result.transaction
    };
  }

  // Award points for completing analysis
  awardAnalysisComplete(userData: any, analysisType: string): { userData: any; transaction: PointsTransaction } {
    return this.awardPoints(userData, 'ANALYSIS_COMPLETE', `Completed ${analysisType} analysis`);
  }

  // Award points for referral
  awardReferral(userData: any, referredUserEmail: string): { userData: any; transaction: PointsTransaction } {
    const result = this.awardPoints(userData, 'REFERRAL', `Referred ${referredUserEmail}`);
    
    return {
      userData: {
        ...result.userData,
        total_referrals: (userData.total_referrals || 0) + 1
      },
      transaction: result.transaction
    };
  }

  // Award points for writing review
  awardReview(userData: any, productName: string): { userData: any; transaction: PointsTransaction } {
    return this.awardPoints(userData, 'REVIEW', `Reviewed ${productName}`);
  }

  // Check if user can afford a reward
  canAffordReward(userData: any, rewardId: string): boolean {
    const reward = POINTS_REWARDS[rewardId];
    if (!reward) return false;
    
    return (userData.points || 0) >= reward.cost;
  }

  // Purchase a reward with points
  purchaseReward(userData: any, rewardId: string): { userData: any; success: boolean; message: string } {
    const reward = POINTS_REWARDS[rewardId];
    if (!reward) {
      return { userData, success: false, message: 'Invalid reward' };
    }

    if (!this.canAffordReward(userData, rewardId)) {
      return { userData, success: false, message: 'Insufficient points' };
    }

    const newPoints = (userData.points || 0) - reward.cost;
    const updatedUserData = {
      ...userData,
      points: newPoints
    };

    // Mark reward as unlocked
    const updatedReward = { ...reward, isUnlocked: true };
    POINTS_REWARDS[rewardId] = updatedReward;

    const transaction: PointsTransaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      action: 'reward_purchase',
      points: -reward.cost,
      timestamp: new Date().toISOString(),
      description: `Purchased ${reward.name}`
    };

    this.transactions.push(transaction);

    return {
      userData: updatedUserData,
      success: true,
      message: `Successfully purchased ${reward.name}!`
    };
  }

  // Get user's transaction history
  getTransactionHistory(): PointsTransaction[] {
    return [...this.transactions].reverse();
  }

  // Get available rewards
  getAvailableRewards(): PointsReward[] {
    return Object.values(POINTS_REWARDS);
  }

  // Get user's points summary
  getPointsSummary(userData: any): {
    totalPoints: number;
    availableRewards: number;
    unlockedFeatures: number;
    nextMilestone: number;
  } {
    const totalPoints = userData.points || 0;
    const availableRewards = Object.values(POINTS_REWARDS).filter(
      reward => totalPoints >= reward.cost
    ).length;
    const unlockedFeatures = Object.values(POINTS_REWARDS).filter(
      reward => reward.isUnlocked
    ).length;
    
    // Next milestone (every 100 points)
    const nextMilestone = Math.ceil(totalPoints / 100) * 100;

    return {
      totalPoints,
      availableRewards,
      unlockedFeatures,
      nextMilestone
    };
  }

  // Get points for specific action
  getPointsForAction(actionId: string): number {
    const action = POINTS_ACTIONS[actionId];
    return action ? action.points : 0;
  }

  // Get all available actions
  getAllActions(): PointsAction[] {
    return Object.values(POINTS_ACTIONS);
  }
}

// Export singleton instance
export const pointsManager = PointsManager.getInstance();

// Function to ensure user exists in Supabase
export const ensureUserInSupabase = async (userData: any): Promise<any> => {
  try {
    const { supabase } = await import('./supabase');
    
    // First try to find by user_id if available
    if (userData.user_id) {
      const { data: existingUser, error: userError } = await supabase
        .from('user')
        .select('*')
        .eq('user_id', userData.user_id)
        .single();
        
      if (!userError && existingUser) {
        return { ...userData, user_id: existingUser.user_id };
      }
    }
    
    // Try to find by email
    const { data: userByEmail, error: emailError } = await supabase
      .from('user')
      .select('*')
      .eq('email', userData.email)
      .single();
      
    if (!emailError && userByEmail) {
      return { ...userData, user_id: userByEmail.user_id };
    }
    
    // User doesn't exist, create them
    const { data: newUser, error: createError } = await supabase
      .from('user')
      .insert({
        email: userData.email,
        name: userData.name,
        gender: userData.gender,
        location: userData.location,
        skin_tone: userData.skin_tone,
        face_shape: userData.face_shape,
        body_shape: userData.body_shape,
        personality: userData.personality,
        onboarding_completed: userData.onboarding_completed,
        points: userData.points || 0,
        referral_code: userData.referral_code || `AURA${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        total_referrals: userData.total_referrals || 0
      })
      .select()
      .single();
      
    if (createError) {
      console.error('❌ Error creating user:', createError);
      return userData; // Return original data if creation fails
    }
    
    return { ...userData, user_id: newUser.user_id };
    
  } catch (error) {
    console.error('❌ Error in ensureUserInSupabase:', error);
    return userData; // Return original data if error
  }
};

// Function to save points transaction to Supabase
export const savePointsToSupabase = async (userData: any, transaction: PointsTransaction): Promise<boolean> => {
  try {
    // Import supabase dynamically to avoid SSR issues
    const { supabase } = await import('./supabase');
    
    // Ensure user exists in Supabase first
    const userWithId = await ensureUserInSupabase(userData);
    
    if (!userWithId.user_id) {
      console.warn('❌ No user_id available after ensuring user exists');
      return false;
    }

    // Save transaction to Supabase
    const { error: transactionError } = await supabase
      .from('points_transactions')
      .insert({
        user_id: userWithId.user_id,
        action: transaction.action,
        points: transaction.points,
        description: transaction.description
      });

    if (transactionError) {
      console.error('❌ Error saving points transaction to Supabase:', transactionError);
      return false;
    }

    // Update user points in Supabase
    // First, get current points
    const { data: currentUser, error: fetchError } = await supabase
      .from('user')
      .select('points')
      .eq('user_id', userWithId.user_id)
      .single();

    if (fetchError) {
      console.error('❌ Error fetching current user points:', fetchError);
      return false;
    }

    const newPoints = (currentUser?.points || 0) + transaction.points;
    
    const { error: updateError } = await supabase
      .from('user')
      .update({ 
        points: newPoints,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userWithId.user_id);

    if (updateError) {
      console.error('❌ Error updating user points in Supabase:', updateError);
      return false;
    }

    return true;
  } catch (error) {
    console.error('❌ Error in savePointsToSupabase:', error);
    return false;
  }
};

// Function to sync local points to Supabase
export const syncLocalPointsToSupabase = async (userData: any): Promise<boolean> => {
  try {
    // Import supabase dynamically to avoid SSR issues
    const { supabase } = await import('./supabase');
    
    // Ensure user exists in Supabase first
    const userWithId = await ensureUserInSupabase(userData);
    
    if (!userWithId.user_id) {
      console.warn('❌ No user_id available after ensuring user exists');
      return false;
    }

    // Get current points from Supabase
    const { data: supabaseUser, error: fetchError } = await supabase
      .from('user')
      .select('points')
      .eq('user_id', userWithId.user_id)
      .single();

    if (fetchError) {
      console.error('❌ Error fetching user points from Supabase:', fetchError);
      return false;
    }

    const localPoints = userData.points || 0;
    const supabasePoints = supabaseUser?.points || 0;

    // If local points are higher, sync them to Supabase
    if (localPoints > supabasePoints) {
      const pointsDifference = localPoints - supabasePoints;
      
      // Update user points in Supabase
      const { error: updateError } = await supabase
        .from('user')
        .update({ 
          points: localPoints,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userWithId.user_id);

      if (updateError) {
        console.error('❌ Error syncing points to Supabase:', updateError);
        return false;
      }

      // Create a sync transaction record
      const { error: transactionError } = await supabase
        .from('points_transactions')
        .insert({
          user_id: userWithId.user_id,
          action: 'points_sync',
          points: pointsDifference,
          description: `Synced ${pointsDifference} points from local storage`
        });

      if (transactionError) {
        console.error('⚠️ Error creating sync transaction:', transactionError);
        // Don't return false here as the main sync was successful
      }

      return true;
    }

    return true;
  } catch (error) {
    console.error('❌ Error in syncLocalPointsToSupabase:', error);
    return false;
  }
};

// Utility functions for easy access
export const awardSignupPoints = (userData: any) => pointsManager.awardPoints(userData, 'SIGNUP');
export const awardOnboardingPoints = (userData: any) => pointsManager.awardPoints(userData, 'ONBOARDING_COMPLETE');
export const awardDailyLoginPoints = (userData: any) => pointsManager.awardDailyLogin(userData);
export const awardReferralPoints = (userData: any, email: string) => pointsManager.awardReferral(userData, email);
export const awardReviewPoints = (userData: any, product: string) => pointsManager.awardReview(userData, product);
export const awardAnalysisPoints = (userData: any, type: string) => pointsManager.awardAnalysisComplete(userData, type);

// Points display utilities
export const formatPoints = (points: number): string => {
  return points.toLocaleString();
};

export const getPointsDisplay = (points: number): string => {
  return `🪙 ${formatPoints(points)} coins`;
};

export const getPointsProgress = (current: number, target: number): number => {
  return Math.min((current / target) * 100, 100);
};
