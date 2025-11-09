export interface UserData {
  email: string;
  name: string;
  gender: 'male' | 'female' | '';
  location: string;
  skin_tone?: string;
  face_shape?: string | null;
  body_shape?: string | null;
  personality?: string | null;
  onboarding_completed: boolean;
<<<<<<< HEAD
=======
  points?: number;
  last_login_date?: string;
  referral_code?: string;
  total_referrals?: number;
  review_popup_status?: 'enabled' | 'disabled' | 'never_show';
  last_review_popup?: string;
  user_id?: number; // Supabase user_id for database operations
>>>>>>> feature/points-system
}

export interface UserState {
  user: UserData | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

// Local storage keys
const USER_DATA_KEY = 'auraasync_user_data';
const ONBOARDING_COMPLETED_KEY = 'auraasync_onboarding_completed';

// Default user state
export const defaultUserState: UserState = {
  user: null,
  isLoading: true,
  isAuthenticated: false,
};

// User state management functions
export const getUserData = (): UserData | null => {
  if (typeof window === 'undefined') return null;
  
  try {
    const userData = localStorage.getItem(USER_DATA_KEY);
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    console.error('Error reading user data:', error);
    return null;
  }
};

export const setUserData = (userData: UserData): void => {
  if (typeof window === 'undefined') return;
  
  try {
<<<<<<< HEAD
    localStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
=======
    // Only store non-sensitive data in localStorage
    // Points and other critical data should always be fetched from server
    const dataToSave = {
      email: userData.email,
      name: userData.name,
      gender: userData.gender,
      location: userData.location,
      skin_tone: userData.skin_tone,
      face_shape: userData.face_shape,
      body_shape: userData.body_shape,
      personality: userData.personality,
      onboarding_completed: userData.onboarding_completed,
      referral_code: userData.referral_code,
      user_id: userData.user_id,
      last_login_date: userData.last_login_date || new Date().toISOString().split('T')[0],
      // Remove points from localStorage - always fetch from server
      total_referrals: userData.total_referrals || 0,
      review_popup_status: userData.review_popup_status || 'enabled',
      last_review_popup: userData.last_review_popup || null
    };
    localStorage.setItem(USER_DATA_KEY, JSON.stringify(dataToSave));
>>>>>>> feature/points-system
  } catch (error) {
    console.error('Error saving user data:', error);
  }
};

export const updateUserData = (updates: Partial<UserData>): UserData | null => {
  const currentUser = getUserData();
  if (!currentUser) return null;
  
  const updatedUser = { ...currentUser, ...updates };
  setUserData(updatedUser);
  return updatedUser;
};

export const clearUserData = (): void => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(USER_DATA_KEY);
    localStorage.removeItem(ONBOARDING_COMPLETED_KEY);
  } catch (error) {
    console.error('Error clearing user data:', error);
  }
};

export const isOnboardingCompleted = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  try {
    const userData = getUserData();
    return userData?.onboarding_completed || false;
  } catch (error) {
    console.error('Error checking onboarding status:', error);
    return false;
  }
};

export const markOnboardingCompleted = (): void => {
  const currentUser = getUserData();
  if (currentUser) {
    const updatedUser = { ...currentUser, onboarding_completed: true };
    setUserData(updatedUser);
  }
};

// Flow control functions
export const shouldShowGuestUI = (): boolean => {
  const userData = getUserData();
  return !userData || !userData.onboarding_completed;
};

export const shouldShowOnboarding = (): boolean => {
  const userData = getUserData();
  return !!(userData && !userData.onboarding_completed);
};

export const shouldShowGenderHomepage = (): boolean => {
  const userData = getUserData();
  return !!(userData && userData.onboarding_completed && userData.gender);
};

export const getRedirectPath = (): string => {
  const userData = getUserData();
  
  if (!userData) {
    return '/'; // Guest UI
  }
  
  if (!userData.onboarding_completed) {
    return '/onboarding'; // Force onboarding
  }
  
  // Gender-specific homepage
  return userData.gender === 'male' ? '/male' : '/female';
};
<<<<<<< HEAD
=======

// Personality category to MBTI mapping for backward compatibility
export const mapPersonalityToMBTI = (personalityCategory: string): string => {
  const personalityMapping: Record<string, string[]> = {
    'minimalist': ['ISTJ', 'ISFJ', 'INTP'],
    'dreamer': ['INFP', 'ENFP', 'INFJ', 'ENFJ'],
    'charmer': ['ESFP', 'ESFJ', 'ENFP', 'ENFJ'],
    'visionary': ['ENTJ', 'ENTP', 'ESTP', 'INTJ'],
    'explorer': ['ISFP', 'ISTP', 'ESTP', 'ESTJ']
  };

  const mbtiTypes = personalityMapping[personalityCategory] || ['ISTJ'];
  // Return the first MBTI type as default for backward compatibility
  return mbtiTypes[0];
};

// Get personality type for API calls (handles both new categories and old MBTI)
export const getPersonalityForAPI = (userData: UserData | null): string => {
  if (!userData?.personality) {
    return 'ISTJ'; // Default fallback
  }
  
  // If it's already an MBTI type (4 characters), return as is
  if (userData.personality.length === 4 && /^[IE][SN][TF][JP]$/.test(userData.personality)) {
    return userData.personality;
  }
  
  // If it's a new personality category, map to MBTI
  return mapPersonalityToMBTI(userData.personality);
};

// Fetch complete user data from Supabase using Firebase auth
export const fetchUserDataFromSupabase = async (): Promise<UserData | null> => {
  if (typeof window === 'undefined') return null;
  
  try {
    // Import Firebase auth dynamically to avoid SSR issues
    const { auth } = await import('./firebase');
    const { supabase } = await import('./supabase');
    
    const currentUser = auth.currentUser;
    if (!currentUser?.email) {
      console.warn('No authenticated Firebase user found');
      return null;
    }

    // Fetch complete user data from Supabase
    const { data: userData, error } = await supabase
      .from('user')
      .select('*')
      .eq('email', currentUser.email)
      .single();

    if (error) {
      console.error('Error fetching user data from Supabase:', error);
      return null;
    }

    if (!userData) {
      console.warn('User not found in Supabase');
      return null;
    }

    // Transform Supabase data to UserData format
    const transformedUserData: UserData = {
      email: userData.email,
      name: userData.name || '',
      gender: userData.gender || '',
      location: userData.location || '',
      skin_tone: userData.skin_tone || '',
      face_shape: userData.face_shape || null,
      body_shape: userData.body_shape || null,
      personality: userData.personality || null,
      onboarding_completed: userData.onboarding_completed || false,
      points: userData.points || 0,
      last_login_date: userData.last_login_date || new Date().toISOString().split('T')[0],
      referral_code: userData.referral_code || '',
      total_referrals: userData.total_referrals || 0,
      review_popup_status: userData.review_popup_status || 'enabled',
      last_review_popup: userData.last_review_popup || null,
      user_id: userData.user_id
    };

    // Update localStorage with fresh data
    setUserData(transformedUserData);
    
    return transformedUserData;
  } catch (error) {
    console.error('Error in fetchUserDataFromSupabase:', error);
    return null;
  }
};

// Get current user data (localStorage first, then fetch from Supabase if needed)
export const getCurrentUserData = async (): Promise<UserData | null> => {
  // First try to get from localStorage
  const localData = getUserData();
  
  // If we have local data and user is authenticated, return it
  if (localData) {
    return localData;
  }
  
  // Otherwise, fetch fresh from Supabase
  return await fetchUserDataFromSupabase();
};

// Refresh user data from Supabase (force fetch)
export const refreshUserData = async (): Promise<UserData | null> => {
  return await fetchUserDataFromSupabase();
};
>>>>>>> feature/points-system
