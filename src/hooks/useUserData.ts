'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  UserData, 
  getCurrentUserData, 
  fetchUserDataFromSupabase, 
  refreshUserData,
  getUserData 
} from '@/lib/userState';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export interface UseUserDataReturn {
  user: UserData | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  refresh: () => Promise<void>;
  forceRefresh: () => Promise<void>;
  error: string | null;
}

export function useUserData(): UseUserDataReturn {
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load user data (from localStorage or Supabase)
  const loadUserData = useCallback(async () => {
    try {
      setError(null);
      const userData = await getCurrentUserData();
      
      // Remove points from the returned data - always fetch from server
      const { points, ...userDataWithoutPoints } = userData || {};
      
      setUser(userDataWithoutPoints);
      setIsAuthenticated(!!userData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load user data');
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Force refresh from Supabase
  const forceRefreshFromSupabase = useCallback(async () => {
    try {
      setError(null);
      setIsLoading(true);
      const userData = await refreshUserData();
      
      // Remove points from the returned data - always fetch from server
      const { points, ...userDataWithoutPoints } = userData || {};
      
      setUser(userDataWithoutPoints);
      setIsAuthenticated(!!userData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh user data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Refresh (smart - checks if needed)
  const refresh = useCallback(async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setUser(null);
      setIsAuthenticated(false);
      setIsLoading(false);
      return;
    }
    
    await loadUserData();
  }, [loadUserData]);

  useEffect(() => {
    // Initial load
    loadUserData();

    // Listen for Firebase auth changes
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // User is authenticated with Firebase, fetch from Supabase
        try {
          const userData = await fetchUserDataFromSupabase();
          
          // Remove points from the returned data - always fetch from server
          const { points, ...userDataWithoutPoints } = userData || {};
          
          setUser(userDataWithoutPoints);
          setIsAuthenticated(!!userData);
        } catch (err) {
          console.error('Error fetching user data on auth change:', err);
          setError('Failed to sync user data');
        }
      } else {
        // User is not authenticated
        setUser(null);
        setIsAuthenticated(false);
        // Clear localStorage
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auraasync_user_data');
        }
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [loadUserData]);

  return {
    user,
    isLoading,
    isAuthenticated,
    refresh,
    forceRefresh: forceRefreshFromSupabase,
    error
  };
}

// Simplified hook for just getting user email
export function useUserEmail(): string | null {
  const { user } = useUserData();
  return user?.email || null;
}

// Hook for getting user ID (Supabase user_id)
export function useUserId(): number | null {
  const { user } = useUserData();
  return user?.user_id || null;
}
