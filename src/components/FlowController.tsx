'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getUserData, shouldShowGuestUI, shouldShowOnboarding, shouldShowGenderHomepage, getRedirectPath, getCurrentUserData, UserData } from '../lib/userState';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../lib/firebase';

interface FlowControllerProps {
  children: React.ReactNode;
}

export default function FlowController({ children }: FlowControllerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    let mounted = true;
    let authChecked = false;
    
    const checkUserFlow = async (firebaseUser: any) => {
      if (!mounted) return;
      
      try {
        const currentPath = window.location.pathname;
        const searchParams = new URLSearchParams(window.location.search);
        const isSingleAnalysis = currentPath === '/onboarding' && searchParams.get('mode') === 'single';

        // First, check localStorage immediately to avoid unnecessary redirects
        const localUserData = getUserData();
        
        // For gender pages, check localStorage first before async operations
        if (currentPath.startsWith('/male') || currentPath.startsWith('/female')) {
          if (localUserData && localUserData.onboarding_completed) {
            // User has valid local data, allow them to stay on the page
            // Only redirect if gender mismatch
            if (localUserData.gender && !currentPath.startsWith(`/${localUserData.gender}`)) {
              const correctPath = localUserData.gender === 'male' ? '/male' : '/female';
              setIsLoading(false);
              router.replace(correctPath);
              return;
            }
            // Valid user on correct page, stop loading
            setIsLoading(false);
            setUserData(localUserData);
            setIsAuthenticated(!!firebaseUser);
            return;
          }
        }

        let currentUserData: UserData | null = null;
        
        if (firebaseUser) {
          // User is authenticated with Firebase, get fresh data from Supabase
          setIsAuthenticated(true);
          currentUserData = await getCurrentUserData();
        } else {
          // No Firebase user, check localStorage for guest data
          setIsAuthenticated(false);
          currentUserData = localUserData || getUserData();
        }
        
        setUserData(currentUserData);
        authChecked = true;

        // Landing page (guest UI): if authenticated and done, skip to gender homepage
        if (currentPath === '/') {
          if (currentUserData && currentUserData.onboarding_completed) {
            const redirectPath = currentUserData.gender === 'male' ? '/male' : '/female';
            setIsLoading(false);
            router.replace(redirectPath);
            return;
          } else if (firebaseUser && (!currentUserData || !currentUserData.onboarding_completed)) {
            // Authenticated user but no onboarding data
            setIsLoading(false);
            router.replace('/onboarding');
            return;
          }
          // guest stays on /
          setIsLoading(false);
          return;
        }

        // Onboarding: allow guests and incomplete users; skip if already completed
        if (currentPath === '/onboarding') {
          // Allow onboarding even with no user data. Only redirect if it's already completed.
          if (!isSingleAnalysis && currentUserData && currentUserData.onboarding_completed) {
            const redirectPath = currentUserData.gender === 'male' ? '/male' : '/female';
            setIsLoading(false);
            router.replace(redirectPath);
            return;
          }
          setIsLoading(false);
          return;
        }

        // Gender-specific recommendation pages guard
        if (currentPath.startsWith('/male') || currentPath.startsWith('/female')) {
          // Only redirect if we've confirmed there's no user data after checking auth
          if (authChecked && !firebaseUser && !currentUserData) {
            // No authenticated user and no local data, go to guest UI
            setIsLoading(false);
            router.replace('/');
            return;
          } else if (currentUserData && !currentUserData.onboarding_completed) {
            // Onboarding not completed, go to onboarding
            setIsLoading(false);
            router.replace('/onboarding');
            return;
          } else if (currentUserData && currentUserData.gender && !currentPath.startsWith(`/${currentUserData.gender}`)) {
            // Wrong gender page, redirect to correct one
            const correctPath = currentUserData.gender === 'male' ? '/male' : '/female';
            setIsLoading(false);
            router.replace(correctPath);
            return;
          }
        }

        setIsLoading(false);
      } catch (error) {
        console.error('Error in checkUserFlow:', error);
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    // Listen for Firebase auth changes
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      checkUserFlow(firebaseUser);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [router, pathname]);

  if (isLoading && pathname !== '/onboarding' && pathname !== '/') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-black">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading your personalized experience...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
