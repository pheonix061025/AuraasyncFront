'use client';

import { useState, useEffect, useCallback } from 'react';
import { auth } from '@/lib/firebase';
import { supabase } from '@/lib/supabase';

export interface UseSecurePointsReturn {
  points: number;
  isLoading: boolean;
  error: string | null;
  refreshPoints: () => Promise<void>;
  awardPoints: (action: string, points?: number) => Promise<boolean>;
  deductPoints: (points: number, reason: string) => Promise<boolean>;
  hasEnoughPoints: (requiredPoints: number) => Promise<boolean>;
}

export function useSecurePoints(): UseSecurePointsReturn {
  const [points, setPoints] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch points directly from Supabase
  const refreshPoints = useCallback(async () => {
    try {
      setError(null);
      const user = auth.currentUser;
      
      if (!user) {
        setPoints(0);
        setIsLoading(false);
        return;
      }

      // Get user email from Firebase
      const userEmail = user.email;
      if (!userEmail) {
        throw new Error('User email not found');
      }

      // Fetch points directly from Supabase
      const { data, error: supabaseError } = await supabase
        .from('user')
        .select('points')
        .eq('email', userEmail)
        .single();

      if (supabaseError) {
        throw new Error(supabaseError.message);
      }

      setPoints(data?.points || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load points');
      setPoints(0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Award points directly in Supabase
  const awardPoints = useCallback(async (action: string, pointsToAward?: number): Promise<boolean> => {
    try {
      const user = auth.currentUser;
      if (!user || !user.email) {
        throw new Error('User not authenticated');
      }

      const pointsToAdd = pointsToAward || 10; // Default 10 points

      // Update points directly in Supabase
      const { data: currentData, error: fetchError } = await supabase
        .from('user')
        .select('points')
        .eq('email', user.email)
        .single();

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      const currentPoints = currentData?.points || 0;
      const newPoints = currentPoints + pointsToAdd;

      const { error: updateError } = await supabase
        .from('user')
        .update({ 
          points: newPoints,
          updated_at: new Date().toISOString()
        })
        .eq('email', user.email);

      if (updateError) {
        throw new Error(updateError.message);
      }

      setPoints(newPoints);

      // Log the transaction (optional)
      await supabase
        .from('points_transactions')
        .insert({
          user_email: user.email,
          points: pointsToAdd,
          type: 'award',
          reason: action,
          created_at: new Date().toISOString()
        });

      return true;
    } catch (err) {
      console.error('Error awarding points:', err);
      setError(err instanceof Error ? err.message : 'Failed to award points');
      return false;
    }
  }, []);

  // Deduct points directly in Supabase
  const deductPoints = useCallback(async (pointsToDeduct: number, reason: string): Promise<boolean> => {
    try {
      const user = auth.currentUser;
      if (!user || !user.email) {
        throw new Error('User not authenticated');
      }

      // Get current points
      const { data: currentData, error: fetchError } = await supabase
        .from('user')
        .select('points')
        .eq('email', user.email)
        .single();

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      const currentPoints = currentData?.points || 0;

      if (currentPoints < pointsToDeduct) {
        throw new Error('Insufficient points');
      }

      const newPoints = currentPoints - pointsToDeduct;

      // Update points in Supabase
      const { error: updateError } = await supabase
        .from('user')
        .update({ 
          points: newPoints,
          updated_at: new Date().toISOString()
        })
        .eq('email', user.email);

      if (updateError) {
        throw new Error(updateError.message);
      }

      setPoints(newPoints);

      // Log the transaction (optional)
      await supabase
        .from('points_transactions')
        .insert({
          user_email: user.email,
          points: pointsToDeduct,
          type: 'deduct',
          reason: reason,
          created_at: new Date().toISOString()
        });

      return true;
    } catch (err) {
      console.error('Error deducting points:', err);
      setError(err instanceof Error ? err.message : 'Failed to deduct points');
      return false;
    }
  }, []);

  // Check if user has enough points
  const hasEnoughPoints = useCallback(async (requiredPoints: number): Promise<boolean> => {
    try {
      const user = auth.currentUser;
      if (!user || !user.email) {
        return false;
      }

      const { data, error } = await supabase
        .from('user')
        .select('points')
        .eq('email', user.email)
        .single();

      if (error) {
        return false;
      }

      return (data?.points || 0) >= requiredPoints;
    } catch (err) {
      console.error('Error checking points:', err);
      return false;
    }
  }, []);

  // Load points on mount
  useEffect(() => {
    refreshPoints();
  }, [refreshPoints]);

  return {
    points,
    isLoading,
    error,
    refreshPoints,
    awardPoints,
    deductPoints,
    hasEnoughPoints,
  };
}

// Additional helper functions for formatted display
export function usePointsDisplay() {
  const { points, isLoading, error } = useSecurePoints();
  
  return {
    points,
    isLoading,
    error,
    formattedPoints: points.toLocaleString(),
    hasPoints: points > 0,
  };
}

// Hook for points balance card
export function usePointsBalance() {
  const { points, isLoading, error, refreshPoints } = useSecurePoints();
  
  return {
    balance: points,
    isLoading,
    error,
    refreshBalance: refreshPoints,
    canSpend: (amount: number) => points >= amount,
    formattedBalance: points.toLocaleString(),
  };
}
