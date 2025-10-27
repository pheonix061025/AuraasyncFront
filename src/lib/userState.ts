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
  points?: number;
  last_login_date?: string;
  referral_code?: string;
  total_referrals?: number;
  review_popup_status?: 'enabled' | 'disabled' | 'never_show';
  last_review_popup?: string;
  user_id?: number; // Supabase user_id for database operations
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
    // Ensure points and related fields are included
    const dataToSave = {
      ...userData,
      points: userData.points || 0,
      last_login_date: userData.last_login_date || new Date().toISOString().split('T')[0],
      referral_code: userData.referral_code || '',
      total_referrals: userData.total_referrals || 0
    };
    localStorage.setItem(USER_DATA_KEY, JSON.stringify(dataToSave));
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