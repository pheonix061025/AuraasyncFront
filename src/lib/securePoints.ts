import { supabase } from './supabase';
import { auth } from './firebase';
import { getUserDataFromToken } from './firebaseAdmin';

export interface PointsTransaction {
  user_id: number;
  points_change: number;
  reason: string;
  timestamp: string;
}

/**
 * Get user points securely from Supabase
 */
export async function getUserPoints(userId: number): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('user')
      .select('points')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching user points:', error);
      return 0;
    }

    return data?.points || 0;
  } catch (error) {
    console.error('Error in getUserPoints:', error);
    return 0;
  }
}

/**
 * Update user points securely in Supabase
 */
export async function updateUserPoints(
  userId: number, 
  pointsChange: number, 
  reason: string
): Promise<{ success: boolean; newPoints?: number; error?: string }> {
  try {
    // First, get current points
    const { data: currentUser, error: fetchError } = await supabase
      .from('user')
      .select('points')
      .eq('user_id', userId)
      .single();

    if (fetchError || !currentUser) {
      return { success: false, error: 'User not found' };
    }

    const currentPoints = currentUser.points || 0;
    const newPoints = Math.max(0, currentPoints + pointsChange); // Prevent negative points

    // Update points in Supabase
    const { data, error } = await supabase
      .from('user')
      .update({ 
        points: newPoints,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select('points')
      .single();

    if (error) {
      console.error('Error updating points:', error);
      return { success: false, error: 'Failed to update points' };
    }

    // Log the transaction for audit
    await logPointsTransaction(userId, pointsChange, reason);

    return { success: true, newPoints: data.points };
  } catch (error) {
    console.error('Error in updateUserPoints:', error);
    return { success: false, error: 'Internal server error' };
  }
}

/**
 * Log points transaction for audit purposes
 */
async function logPointsTransaction(
  userId: number, 
  pointsChange: number, 
  reason: string
): Promise<void> {
  try {
    await supabase
      .from('points_transactions')
      .insert({
        user_id: userId,
        points_change: pointsChange,
        reason: reason,
        timestamp: new Date().toISOString()
      });
  } catch (error) {
    console.error('Error logging points transaction:', error);
    // Don't fail the main operation if logging fails
  }
}

/**
 * Award points for completing actions
 */
export async function awardPoints(
  userId: number,
  action: 'onboarding_complete' | 'daily_login' | 'review_submit' | 'referral',
  customPoints?: number
): Promise<{ success: boolean; newPoints?: number; error?: string }> {
  const pointsMap = {
    'onboarding_complete': 100,
    'daily_login': 10,
    'review_submit': 25,
    'referral': 50
  };

  const points = customPoints || pointsMap[action];
  const reason = `Points awarded for ${action}`;

  return await updateUserPoints(userId, points, reason);
}

/**
 * Deduct points for purchases/actions
 */
export async function deductPoints(
  userId: number,
  pointsToDeduct: number,
  reason: string
): Promise<{ success: boolean; newPoints?: number; error?: string }> {
  if (pointsToDeduct <= 0) {
    return { success: false, error: 'Invalid points amount' };
  }

  return await updateUserPoints(userId, -pointsToDeduct, reason);
}

/**
 * Check if user has enough points
 */
export async function hasEnoughPoints(userId: number, requiredPoints: number): Promise<boolean> {
  const currentPoints = await getUserPoints(userId);
  return currentPoints >= requiredPoints;
}

/**
 * Get user's points transaction history
 */
export async function getPointsHistory(userId: number, limit: number = 10): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('points_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching points history:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getPointsHistory:', error);
    return [];
  }
}
