'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import BottomNavigation from '@/components/male/BottomNavigation';
import { auth } from '../../lib/firebase';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import axios from 'axios';
import { getUserData, clearUserData } from '@/lib/userState';
import ReviewPopup from '@/components/ReviewPopup';
import { pointsManager, syncLocalPointsToSupabase, ensureUserInSupabase, savePointsToSupabase } from '@/lib/pointsSystem';
import { useAutoReviewPopup } from '@/hooks/useReviewPopup';
import { supabase } from '@/lib/supabase';


interface UserData {
  id?: number;
  user_id?: number; // Supabase user_id field
  email: string;
  name: string;
  gender: 'male' | 'female' | '';
  location: string;
  skin_tone?: string;
  face_shape?: string | null;
  body_shape?: string | null;
  personality?: string | null;
  onboarding_completed: boolean;
  is_new_user?: boolean;
  profile_picture?: string;
  points?: number;
  last_login_date?: string;
  referral_code?: string;
  total_referrals?: number;
}

export default function Dashboard() {
  const [userData, setUserData] = React.useState<UserData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const router = useRouter();
  
  // Review popup hook
  const reviewPopup = useAutoReviewPopup();

  // Fetch user data from backend
  const fetchUserData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setError('No authenticated user found');
        setIsLoading(false);
        return;
      }

      const idToken = await currentUser.getIdToken();
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      
      console.log('Attempting to fetch user data from:', `${API_URL}/auth/me`);
      
      const response = await axios.get(`${API_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        }
              });

      console.log('API Response:', response.data);

      if (response.status === 200) {
        // Initialize user with points system
        const initializedUserData = pointsManager.initializeUser({
          ...response.data,
          user_id: response.data.user_id || response.data.id
        });
        
        console.log('Dashboard - API Response data:', response.data);
        console.log('Dashboard - Initialized user data:', initializedUserData);
        console.log('Dashboard - user_id field:', initializedUserData.user_id);
        
        // Ensure user exists in Supabase and get updated data
        const userWithSupabase = await ensureUserInSupabase(initializedUserData);
        console.log('Dashboard - User with Supabase:', userWithSupabase);
        
        if (!userWithSupabase.user_id) {
          console.error('❌ Failed to ensure user exists in Supabase');
          setError('Failed to sync with database. Please try again.');
          return;
        }
        
        // Sync any local points to Supabase
        const syncSuccess = await syncLocalPointsToSupabase(userWithSupabase);
        if (!syncSuccess) {
          console.warn('⚠️ Points sync failed, but continuing...');
        }
        
        // Check for daily login bonus
        const dailyLoginResult = pointsManager.awardDailyLogin(userWithSupabase);
        if (dailyLoginResult.transaction) {
          console.log('Daily login bonus awarded:', dailyLoginResult.transaction);
          
          // Save daily login transaction to Supabase using the new function
          const saveSuccess = await savePointsToSupabase(dailyLoginResult.userData, dailyLoginResult.transaction);
          if (saveSuccess) {
            console.log('✅ Daily login points saved to Supabase');
          } else {
            console.error('❌ Failed to save daily login points to Supabase');
          }
        }
        
        // Fetch the latest user data from Supabase to ensure we have the most up-to-date points
        try {
          const { data: latestUserData, error: fetchError } = await supabase
            .from('user')
            .select('*')
            .eq('user_id', userWithSupabase.user_id)
            .single();
            
          if (!fetchError && latestUserData) {
            console.log('Dashboard - Latest user data from Supabase:', latestUserData);
            setUserData({
              ...dailyLoginResult.userData,
              points: latestUserData.points,
              user_id: latestUserData.user_id
            });
          } else {
            console.error('Error fetching latest user data:', fetchError);
            setUserData(dailyLoginResult.userData);
          }
        } catch (error) {
          console.error('Error fetching latest user data:', error);
          setUserData(dailyLoginResult.userData);
        }
      } else {
        setError('Failed to fetch user data');
      }
    } catch (error: any) {
      console.error('Error fetching user data:', error);
      
      // Try to get data from localStorage as fallback
      const localUserData = getUserData();
      if (localUserData && localUserData.onboarding_completed) {
        console.log('Using localStorage data as fallback:', localUserData);
        const fallbackUserData = {
          email: localUserData.email || '',
          name: localUserData.name || '',
          gender: localUserData.gender || '',
          location: localUserData.location || '',
          skin_tone: localUserData.skin_tone || '',
          face_shape: localUserData.face_shape || null,
          body_shape: localUserData.body_shape || null,
          personality: localUserData.personality || null,
          onboarding_completed: localUserData.onboarding_completed || false,
          is_new_user: false,
          points: localUserData.points || 0,
          last_login_date: localUserData.last_login_date,
          referral_code: localUserData.referral_code,
          total_referrals: localUserData.total_referrals || 0,
          user_id: localUserData.user_id
        };
        
        // Initialize with points system
        const initializedUserData = pointsManager.initializeUser(fallbackUserData);
        
        // Ensure user exists in Supabase
        const userWithSupabase = await ensureUserInSupabase(initializedUserData);
        
        // Sync points to Supabase
        await syncLocalPointsToSupabase(userWithSupabase);
        
        // Check for daily login bonus
        const dailyLoginResult = pointsManager.awardDailyLogin(userWithSupabase);
        
        // Try to fetch latest data from Supabase
        try {
          const { data: latestUserData, error: fetchError } = await supabase
            .from('user')
            .select('*')
            .eq('user_id', userWithSupabase.user_id)
            .single();
            
          if (!fetchError && latestUserData) {
            setUserData({
              ...dailyLoginResult.userData,
              points: latestUserData.points,
              user_id: latestUserData.user_id
            });
          } else {
            setUserData(dailyLoginResult.userData);
          }
        } catch (error) {
          console.error('Error fetching latest user data in fallback:', error);
          setUserData(dailyLoginResult.userData);
        }
        return;
      }
      
      if (error.response?.status === 401) {
        setError('Authentication failed. Please login again.');
      } else if (error.response?.status === 404) {
        setError('User not found in database');
      } else {
        setError(`Failed to fetch user data: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Wait for Firebase auth state, then fetch
  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      if (!fbUser) {
        setError('No authenticated user found');
        setIsLoading(false);
        return;
      }
      fetchUserData();
    });
    return () => unsubscribe();
  }, []);

  // Redirect if no user data and not loading
  React.useEffect(() => {
    if (!isLoading && !userData && !error) {
      router.push('/');
    }
  }, [userData, isLoading, error, router]);

  // Show feedback popup every time the dashboard loads (after 2 seconds)
  React.useEffect(() => {
    if (!isLoading && userData) {
      const timer = setTimeout(() => {
        reviewPopup.showOnDashboardLoad();
      }, 2000); // Show popup after 2 seconds of dashboard load
      
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, userData]);

 const handleLogout = async () => {
    clearUserData();
     await signOut(auth);
    router.push('/');
  };


  const handleRefresh = () => {
    fetchUserData();
  };

  // Function to refresh user data from Supabase
  const refreshUserDataFromSupabase = async () => {
    if (!userData?.user_id) return;
    
    try {
      const { data: latestUserData, error: fetchError } = await supabase
        .from('user')
        .select('*')
        .eq('user_id', userData.user_id)
        .single();
        
      if (!fetchError && latestUserData) {
        console.log('Refreshed user data from Supabase:', latestUserData);
        setUserData(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            points: latestUserData.points,
            last_login_date: latestUserData.last_login_date,
            referral_code: latestUserData.referral_code,
            total_referrals: latestUserData.total_referrals
          };
        });
      } else {
        console.error('Error refreshing user data:', fetchError);
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
    }
  };

  // Handle points updates from child components
  const handlePointsUpdate = (newUserData: any) => {
    console.log('Dashboard - Points updated:', newUserData);
    setUserData(newUserData);
    
    // Refresh from Supabase to ensure we have the latest data
    setTimeout(() => {
      refreshUserDataFromSupabase();
    }, 1000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#251F1E]">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-white text-center max-w-md mx-auto p-6">
          <div className="text-red-400 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold mb-4">Error Loading Dashboard</h2>
          <p className="text-gray-300 mb-6">{error}</p>
          <div className="space-y-3">
            <button
              onClick={handleRefresh}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-all"
            >
              🔄 Try Again
            </button>
            <button
              onClick={handleLogout}
              className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition-all"
            >
              🚪 Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-white">No user data available</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#251F1E] text-white p-4 md:p-8 pb-20">
      
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">User Dashboard</h1>
          <p className="text-gray-300">Your personalized fashion profile</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Information */}
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6">
            <h2 className="text-2xl font-semibold mb-4 flex items-center">
              <span className="mr-2">👤</span>
              Basic Information
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-300">Name:</span>
                <span className="font-medium">{userData.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Email:</span>
                <span className="font-medium">{userData.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Gender:</span>
                <span className="font-medium capitalize">{userData.gender}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Location:</span>
                <span className="font-medium">{userData.location}</span>
              </div>
            </div>
          </div>

          {/* Analysis Results */}
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6">
            <h2 className="text-2xl font-semibold mb-4 flex items-center">
              <span className="mr-2">🔬</span>
              Analysis Results
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-300">Skin Tone:</span>
                <div className="flex items-center gap-3">
                  <span className={`font-medium ${userData.skin_tone ? 'text-green-400' : 'text-red-400'}`}>
                    {userData.skin_tone || 'Not completed'}
                  </span>
                  <button onClick={() => router.push('/onboarding?mode=single&target=skin')} className="text-xs px-2 py-1 rounded bg-blue-600 hover:bg-blue-700">Redo</button>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Face Shape:</span>
                <div className="flex items-center gap-3">
                  <span className={`font-medium ${userData.face_shape ? 'text-green-400' : 'text-red-400'}`}>
                    {userData.face_shape || 'Not completed'}
                  </span>
                  <button onClick={() => router.push('/onboarding?mode=single&target=face')} className="text-xs px-2 py-1 rounded bg-blue-600 hover:bg-blue-700">Redo</button>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Body Shape:</span>
                <div className="flex items-center gap-3">
                  <span className={`font-medium ${userData.body_shape ? 'text-green-400' : 'text-red-400'}`}>
                    {userData.body_shape || 'Not completed'}
                  </span>
                  <button onClick={() => router.push('/onboarding?mode=single&target=body')} className="text-xs px-2 py-1 rounded bg-blue-600 hover:bg-blue-700">Redo</button>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Personality:</span>
                <div className="flex items-center gap-3">
                  <span className={`font-medium ${userData.personality ? 'text-green-400' : 'text-red-400'}`}>
                    {userData.personality || 'Not completed'}
                  </span>
                  <button onClick={() => router.push('/onboarding?mode=single&target=personality')} className="text-xs px-2 py-1 rounded bg-blue-600 hover:bg-blue-700">Redo</button>
                </div>
              </div>
            </div>
          </div>

          {/* Onboarding Status */}
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6">
            <h2 className="text-2xl font-semibold mb-4 flex items-center">
              <span className="mr-2">✅</span>
              Onboarding Status
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-300">Profile Complete:</span>
                <span className={`font-medium ${userData.onboarding_completed ? 'text-green-400' : 'text-yellow-400'}`}>
                  {userData.onboarding_completed ? 'Yes' : 'In Progress'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Hairstyle Access:</span>
                <span className={`font-medium ${userData.face_shape ? 'text-green-400' : 'text-red-400'}`}>
                  {userData.face_shape ? 'Unlocked' : 'Locked'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6">
            <h2 className="text-2xl font-semibold mb-4 flex items-center">
              <span className="mr-2">⚡</span>
              Quick Actions
            </h2>
            <div className="space-y-3">
              <button
                onClick={() => router.push(`/${userData.gender}`)}
                className="w-full bg-white/10 border border-white/30 text-white py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-purple-700 transition-all"
              >
                 Go to Homepage
              </button>
              <button
                onClick={() => router.push('/search')}
                className="w-full bg-gradient-to-r from-green-500 to-teal-600 text-white py-3 rounded-lg font-semibold hover:from-green-600 hover:to-teal-700 transition-all"
              >
                🔍 Search Products
              </button>
              <button
                onClick={() => router.push('/calendar')}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-600 text-white py-3 rounded-lg font-semibold hover:from-purple-600 hover:to-pink-700 transition-all"
              >
                📅 Outfit Calendar
              </button>
              {userData.face_shape && (
                <button
                  onClick={() => router.push('/hairstyle')}
                  className="w-full bg-gradient-to-r from-pink-500 to-rose-600 text-white py-3 rounded-lg font-semibold hover:from-pink-600 hover:to-rose-700 transition-all"
                >
                  💇 Hairstyle Recommendations
                </button>
              )}
              <button
                onClick={handleLogout}
                className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white py-3 rounded-lg font-semibold hover:from-red-600 hover:to-red-700 transition-all"
              >
                🚪 Logout
              </button>
            </div>
          </div>
        </div>

        {/* Analysis Completion Progress */}
        <div className="mt-8 bg-white/10 backdrop-blur-lg rounded-xl p-6">
          <h2 className="text-2xl font-semibold mb-4 flex items-center">
            <span className="mr-2">📊</span>
            Analysis Completion
          </h2>
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span>Profile Completion</span>
              <span>{userData.onboarding_completed ? '100%' : '75%'}</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-500"
                style={{ width: userData.onboarding_completed ? '100%' : '75%' }}
              ></div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className={`text-center p-3 rounded-lg ${userData.skin_tone ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                Skin Tone
              </div>
              <div className={`text-center p-3 rounded-lg ${userData.face_shape ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                Face Shape
              </div>
              <div className={`text-center p-3 rounded-lg ${userData.body_shape ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                Body Shape
              </div>
              <div className={`text-center p-3 rounded-lg ${userData.personality ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                Personality
              </div>
            </div>
          </div>
        </div>

        {/* Debug Information */}
        <div className="mt-8">
          <div className="bg-white/5 backdrop-blur-lg rounded-xl p-6 mb-4">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <span className="mr-2">🐛</span>
              Debug Information
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-300">User ID:</span>
                <span className="font-mono">{userData.user_id || 'Not set'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Points:</span>
                <span className="font-mono">{userData.points || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Email:</span>
                <span className="font-mono">{userData.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Last Login:</span>
                <span className="font-mono">{userData.last_login_date || 'Not set'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Review Popup */}
      <ReviewPopup
        isOpen={reviewPopup.isOpen}
        onClose={reviewPopup.closePopup}
        onRateNow={reviewPopup.handleRateNow}
        onRemindLater={reviewPopup.handleRemindLater}
        onNeverShow={reviewPopup.handleNeverShow}
        triggerAction={reviewPopup.triggerAction}
      />
      
      <BottomNavigation />
    </div>
  );
}
