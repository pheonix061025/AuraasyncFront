"use client";


import React, { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Webcam from "react-webcam";
import { signInWithPopup, signOut, onAuthStateChanged, User, fetchSignInMethodsForEmail } from "firebase/auth";

import { auth, googleProvider } from "../../lib/firebase";
import axios from "axios";
import {
  setUserData,
  updateUserData,
  markOnboardingCompleted,
} from "../../lib/userState";
import { pointsManager, awardSignupPoints, awardAnalysisPoints, awardOnboardingPoints, savePointsToSupabase } from "../../lib/pointsSystem";
import { useAutoReviewPopup } from "../../hooks/useReviewPopup";
import ReviewPopup from "../../components/ReviewPopup";

import FaceAnalysisWidget from "../../components/FaceAnalysisWidget";
import SkinToneAnalysisWidget from "../../components/SkinToneAnalysisWidget";
import BodyAnalysisWidget from "../../components/BodyAnalysisWidget";
import PersonalityAnalysisWidget from "../../components/PersonalityAnalysisWidget";
import SkinFaceAnalysisStep from "../../components/onBoardingPage/SkinFaceAnalysisStep";
import BodyAnalysisStep from "../../components/onBoardingPage/BodyAnalysisStep";
import { guessFemaleType, guessMaleType, inchesToCm, cmToInches } from "../../lib/bodyTypes";
import Image from "next/image";
import FacePhoto from "@/app/assets/onboarding/face.png";
import MobileFacePhoto from "@/app/assets/onboarding/faceMobile.png";
import BodyPhoto from "@/app/assets/onboarding/body.png";
import MobileBodyPhoto from "@/app/assets/onboarding/bodyMobile.png";
import PersonalityPhoto from "@/app/assets/onboarding/personality.png";
import MobilePersonalityPhoto from "@/app/assets/onboarding/personalityMobile.png";
import { Check } from "lucide-react";
import male from "@/app/assets/man-avatar.png";
import female from "@/app/assets/woman-outline.png";
import mobilecam from '@/app/assets/MobileCamera.png'

// Body Type Images - Using placeholder for now
import HourglassImage from "@/app/assets/Bodytype/hourglass.png";
import RectangleImage from "@/app/assets/Bodytype/rectangle.png";
import InvertedTriangleImage from "@/app/assets/Bodytype/inverted_triangle.png";
import AppleImage from "@/app/assets/Bodytype/apple.png";
import PearImage from "@/app/assets/Bodytype/pear.png";
import MesomorphImage from "@/app/assets/Bodytype/mesomorph.png";
import EctomorphImage from "@/app/assets/Bodytype/ectomorph.png";
import TrapezoidImage from "@/app/assets/Bodytype/trapezoid.png";
import EndomorphImage from "@/app/assets/Bodytype/endomorph.png";


// Onboarding steps
const STEPS = {
  LOGIN: "login",
  BASIC_INFO: "basic_info",
  SKIN_FACE_ANALYSIS: "skin_face_analysis",
  BODY_ANALYSIS: "body_analysis",
  PERSONALITY_ANALYSIS: "personality_analysis",
  COMPLETE: "complete",
} as const;

type StepType = (typeof STEPS)[keyof typeof STEPS];
const STEP_ORDER: StepType[] = [
  STEPS.SKIN_FACE_ANALYSIS,
  STEPS.BODY_ANALYSIS,
  STEPS.PERSONALITY_ANALYSIS,
];

interface UserData {
  email: string;
  name: string;
  gender: "male" | "female" | "";
  location: string;
  skin_tone: string;
  face_shape: string | null;
  body_shape: string | null;
  personality: string | null;
  onboarding_completed: boolean;
user_id?: number;
  points?: number;
  referral_code?: string;
  total_referrals?: number;

}

interface Product {
  title: string;
  price: string;
  image: string;
  link: string;
}

const STEP_LABELS: Record<StepType, string> = {
  [STEPS.LOGIN]: "Login",
  [STEPS.BASIC_INFO]: "Basic Info",
  [STEPS.SKIN_FACE_ANALYSIS]: "Face structure",
  [STEPS.BODY_ANALYSIS]: "Body Type",
  [STEPS.PERSONALITY_ANALYSIS]: "Personality",
  [STEPS.COMPLETE]: "Complete",
};

export default function Onboarding() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const singleMode = searchParams?.get('mode') === 'single';
  const singleTarget = (searchParams?.get('target') as 'skin' | 'face' | 'body' | 'personality' | null) || null;
  
  // Skip auth check in single mode - user is already authenticated from dashboard
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  
  // Set isCheckingAuth to false immediately if in single mode
  useEffect(() => {
    if (singleMode) {
      setIsCheckingAuth(false);
    }
  }, [singleMode]);
  
  // Review popup hook
  const reviewPopup = useAutoReviewPopup();
  
  // Check if user is already authenticated and has completed onboarding
  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // Skip auth check entirely if in single mode
      if (singleMode) {
        setIsCheckingAuth(false);
        
        // Load user data for single mode
        if (firebaseUser) {
          try {
            const idToken = await firebaseUser.getIdToken();
            const response = await fetch('/api/user', {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${idToken}`,
                'Content-Type': 'application/json'
              }
            });
            
            if (response.ok) {
              const userData = await response.json();
              setUserDataState({
                email: userData.email || firebaseUser.email || "",
                name: userData.name || firebaseUser.displayName || "",
                gender: userData.gender || "",
                location: userData.location || "Mumbai",
                skin_tone: userData.skin_tone || "",
                face_shape: userData.face_shape || null,
                body_shape: userData.body_shape || null,
                personality: userData.personality || null,
                onboarding_completed: userData.onboarding_completed || false,
                user_id: userData.user_id,
                points: userData.points || 0,
              });
            }
          } catch (error) {
            console.error('Error loading user data in single mode:', error);
          }
        }
        return;
      }
      
      if (firebaseUser) {
        try {
          // Get the Firebase ID token
          const idToken = await firebaseUser.getIdToken();
          
          // Check user's onboarding status from Supabase
          const response = await fetch('/api/user', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${idToken}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            const userData = await response.json();
            console.log('User data from API:', userData)
            
            // If user has completed onboarding, redirect to appropriate gender page
            if (userData.onboarding_completed && userData.gender){
              console.log('Redirecting to gender page:', userData.gender);
              router.replace(userData.gender === 'male' ? '/male' : '/female');
              return;
            }
            
            // If user exists but hasn't completed onboarding, set their data and go to basic info
            if (userData && !userData.onboarding_completed) {
              console.log('User exists but onboarding not completed, going to basic info');
              setUserDataState({
                email: userData.email || firebaseUser.email || "",
                name: userData.name || firebaseUser.displayName || "",
                gender: userData.gender || "",
                location: userData.location || "Mumbai",
                skin_tone: userData.skin_tone || "",
                face_shape: userData.face_shape || null,
                body_shape: userData.body_shape || null,
                personality: userData.personality || null,
                onboarding_completed: false,
              });
              setCurrentStep(STEPS.BASIC_INFO);
              setIsCheckingAuth(false);
            }
          } else if (response.status === 404) {
            // User not found in database - this is normal for brand new users
            // Set up initial user data and proceed to basic info
            console.log('New user detected (404) - proceeding to basic info');
            setUserDataState({
              email: firebaseUser.email || "",
              name: firebaseUser.displayName || "",
              gender: "",
              location: "Mumbai",
              skin_tone: "",
              face_shape: null,
              body_shape: null,
              personality: null,
              onboarding_completed: false,
            });
            setCurrentStep(STEPS.BASIC_INFO);
            setIsCheckingAuth(false);
          } else {
            console.log('User API returned non-OK status:', response.status);
            setIsCheckingAuth(false);
          }
        } catch (error) {
          console.error('Error checking user status:', error);
          // If there's an error, continue with normal flow
          setIsCheckingAuth(false);
        }
      } else {
        // No user logged in or in single mode
        setIsCheckingAuth(false);
      }
    });
    
    return () => unsubscribe();
  }, [router, singleMode]);
  

  // Initialize step - LOGIN by default, will be updated by effect if in single mode
  const [currentStep, setCurrentStep] = useState<StepType>(STEPS.LOGIN);
  
  // Set initial step based on single mode target
  useEffect(() => {
    if (singleMode) {
      if (singleTarget === 'skin' || singleTarget === 'face') {
        setCurrentStep(STEPS.SKIN_FACE_ANALYSIS);
      } else if (singleTarget === 'body') {
        setCurrentStep(STEPS.BODY_ANALYSIS);
      } else if (singleTarget === 'personality') {
        setCurrentStep(STEPS.PERSONALITY_ANALYSIS);
      }
    }
  }, [singleMode, singleTarget]);
  
  const [userData, setUserDataState] = useState<UserData>({
    email: "",
    name: "",
    gender: "",
    location: "",
    skin_tone: "",
    face_shape: null,
    body_shape: null,
    personality: null,
    onboarding_completed: false,
  });

  // Helper function to save user data to Supabase
  const saveUserDataToSupabase = async (dataToSave: UserData) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        console.warn('No authenticated user for Supabase save');
        return false;
      }
      
      const idToken = await currentUser.getIdToken();
      const response = await fetch('/api/user', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: dataToSave.email,
          name: dataToSave.name,
          gender: dataToSave.gender,
          location: dataToSave.location || 'Mumbai',
          skin_tone: dataToSave.skin_tone || null,
          face_shape: dataToSave.face_shape || null,
          body_shape: dataToSave.body_shape || null,
          personality: dataToSave.personality || null,
          // Use nullish coalescing to preserve undefined and only default null/undefined to false
          onboarding_completed: dataToSave.onboarding_completed ?? false
        })
      });
      
      if (response.ok) {
        const updatedUserData = await response.json();
        console.log('✅ User data saved to Supabase:', updatedUserData);
        return true;
      } else {
        console.error('❌ Failed to save user data to Supabase:', response.statusText);
        return false;
      }
    } catch (err) {
      console.error('❌ Error saving user data to Supabase:', err);
      return false;
    }
  };


  // Helpers for single-mode save from within step UIs
  const saveSingleModeAndReturn = async (updates: Partial<UserData>) => {
    if (!singleMode || !singleTarget) return false;
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        router.replace('/login');
        return true;
      }
      const idToken = await currentUser.getIdToken();
// Merge updates with existing userData
      const updatedData = { ...userData, ...updates };
      
      // Use your local API to update user data
      const response = await fetch('/api/user', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: updatedData.email,
          name: updatedData.name,
          gender: updatedData.gender,
          location: updatedData.location || 'Mumbai',
          skin_tone: updatedData.skin_tone || null,
          face_shape: updatedData.face_shape || null,
          body_shape: updatedData.body_shape || null,
          personality: updatedData.personality || null,
          onboarding_completed: updatedData.onboarding_completed || false
        })
      });
      
      if (response.ok) {
        const updatedUserData = await response.json();
        const finalData = { ...updatedData, ...updatedUserData };
        
        // Update localStorage with the new data
        updateUserData(finalData);
        localStorage.setItem('aurasync_user_data', JSON.stringify(finalData));
        
        console.log('✅ Single-mode data saved to Supabase and localStorage:', finalData);
        
        // Update local state
        setUserData(finalData);
        setUserDataState(finalData);
      } else {
        console.error('❌ Failed to save single-mode data:', response.statusText);
        // Still update localStorage even if Supabase save fails
        updateUserData(updatedData);
        localStorage.setItem('aurasync_user_data', JSON.stringify(updatedData));
      }
    } catch (err) {
      console.error('❌ Single-mode save failed:', err);
      // Still update localStorage even if API call fails
      const updatedData = { ...userData, ...updates };
      updateUserData(updatedData);
      localStorage.setItem('aurasync_user_data', JSON.stringify(updatedData));
    } finally {
      // Add a small delay to ensure data is saved before redirect
      setTimeout(() => {
        router.replace('/dashboard');
      }, 500);

    }
    return true;
  };

  // Step 1: Login Component
  const LoginStep = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [user, setUser] = useState<User | null>(null);

    const handleGoogleLogin = async () => {
      try {
        setIsLoading(true);
        const result = await signInWithPopup(auth, googleProvider);

        if (result.user) {
          // Get the Firebase ID token
          const idToken = await result.user.getIdToken();

try {
            // Use your local API to create/update user in Supabase
            const response = await fetch('/api/user', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${idToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                email: result.user.email,
                name: result.user.displayName,
                gender: '',
                location: 'Mumbai', // Default location
                skin_tone: '',
                face_shape: null,
                body_shape: null,
                personality: null,
                onboarding_completed: false
              })
            });

            if (!response.ok) {
              throw new Error('Failed to create/update user');
            }

            const backendUserData = await response.json();


            // Create user data for frontend state
            const userData: UserData = {
              email: backendUserData.email || result.user.email || "",
              name: backendUserData.name || result.user.displayName || "",
              gender: backendUserData.gender || "",

              location: backendUserData.location || "Mumbai",
              skin_tone: backendUserData.skin_tone || "",
              face_shape: backendUserData.face_shape || null,
              body_shape: backendUserData.body_shape || null,
              personality: backendUserData.personality || null,
              onboarding_completed: backendUserData.onboarding_completed || false,
user_id: backendUserData.user_id || undefined,
              points: backendUserData.points || 0,
              referral_code: backendUserData.referral_code || '',
              total_referrals: backendUserData.total_referrals || 0

            };

            setUserData(userData);
            setUserDataState(userData);

// Proceed to onboarding since user just logged in
            setCurrentStep(STEPS.BASIC_INFO);

          } catch (apiError: any) {
            console.error("API error:", apiError);
            alert("Authentication failed. Please try again.");
            await signOut(auth);
          }
        }
      } catch (error: any) {
        console.error("Google login error:", error?.code, error?.message, error);
        const code = error?.code as string | undefined;
        const message = error?.message as string | undefined;
        const email = error?.customData?.email as string | undefined;

        if (code === 'auth/popup-closed-by-user') {
          alert("Sign-in was cancelled. Please try again.");
        } else if (code === 'auth/popup-blocked') {
          alert("Popup was blocked by the browser. Allow popups for this site and try again.");
        } else if (code === 'auth/unauthorized-domain') {
          alert("Unauthorized domain. Add your domain (e.g., localhost, 127.0.0.1, yoursite.com) to Firebase Auth > Settings > Authorized domains.");
        } else if (code === 'auth/operation-not-allowed') {
          alert("Google Sign-in is disabled. Enable the Google provider in Firebase Console > Authentication > Sign-in method.");
        } else if (code === 'auth/invalid-api-key') {
          alert("Invalid Firebase API key. Check NEXT_PUBLIC_FIREBASE_API_KEY and restart the dev server.");
        } else if (code === 'auth/account-exists-with-different-credential' && email) {
          try {
            const methods = await fetchSignInMethodsForEmail(auth, email);
            alert(`An account already exists with a different sign-in method for ${email}. Supported methods: ${methods.join(', ')}. Please sign in using one of these methods, then link Google from your account settings.`);
          } catch (e) {
            alert("Account exists with different credential. Please sign in with your original method and link Google later.");
          }
        } else {
          alert(message || "Failed to sign in with Google. Please try again.");
        }
      } finally {
        setIsLoading(false);
      }
    };


    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-black"
      >
        <div className="text-center text-white p-8">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Welcome to Auraasync
          </h1>
          <p className="text-xl mb-8 text-gray-300">
            Let&apos;s personalize your fashion journey
          </p>

          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="bg-white text-gray-900 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-colors flex items-center justify-center mx-auto gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
            ) : (
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            )}
            {isLoading ? "Signing in..." : "Continue with Google"}
          </button>

{!user && process.env.NODE_ENV === 'development' && (
            <div className="mt-8">
              <button
                onClick={() => {
                // For testing - skip to next step
                const mockUserData: UserData = {
                  email: "test@gmail.com", 
                  name: "",
                  gender: "",
                  location: "Mumbai",
                  skin_tone: "",
                  face_shape: null,
                  body_shape: null,
                  personality: null,
                  onboarding_completed: false,
                };
                setUserData(mockUserData);
                setUserDataState(mockUserData);
                setCurrentStep(STEPS.BASIC_INFO);

                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                Skip for testing →
              </button>
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  const ProgressBar = ({ currentStep }: { currentStep: StepType }) => {
    const currentIndex = STEP_ORDER.indexOf(currentStep);

    return (
      <>
        {/* Desktop Progress Bar */}
        <div className="hidden md:flex sticky top-0 items-center justify-between w-full max-w-4xl mx-auto pt-6 z-40 px-4">
          {STEP_ORDER.map((step, index) => {
            const isActive = index === currentIndex;
            const isCompleted = index < currentIndex;

            return (
              <div
                key={step}
                className="flex flex-col items-center flex-1 relative"
              >
                {/* Step Circle */}
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold z-10
                  ${isActive
                      ? "bg-green-500 text-white"
                      : isCompleted
                        ? "bg-green-600 text-white"
                        : "bg-gray-900 text-white"
                    }
                `}
                >
                  {isCompleted ? <Check size={16} /> : index + 1}
                </div>

                {/* Step Label */}
                <div className="mt-2 text-sm text-gray-200">
                  {STEP_LABELS[step]}
                </div>

                {/* Connector Line */}
                {index !== STEP_ORDER.length - 1 && (
                  <div className="absolute top-4 left-1/2 w-full h-[4px] bg-gray-700 -z-10">
                    <div
                      className="h-[4px] bg-green-500 transition-all duration-500"
                      style={{ width: isCompleted ? "100%" : "0%" }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Mobile Progress Bar - Fixed positioning */}
        <div className="md:hidden flex items-center justify-between w-full px-4 py-2 z-40 sticky top-0 left-0 right-0 bg-transparent">
          {STEP_ORDER.map((step, index) => {
            const isActive = index === currentIndex;
            const isCompleted = index < currentIndex;

            return (
              <div
                key={step}
                className="flex flex-col items-center flex-1 relative"
              >
                {/* Step Circle */}
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold mb-2 z-10
                  ${isActive
                      ? "bg-green-500 text-white"
                      : isCompleted
                        ? "bg-green-600 text-white"
                        : "bg-gray-900 text-white"
                    }
                `}
                >
                  {isCompleted ? <Check size={8} /> : index + 1}
                </div>

                {/* Step Label */}
                <div className="text-xs text-gray-200 text-center max-w-[90px]">
                  {STEP_LABELS[step]}
                </div>

                {/* Connector Line */}
                {index !== STEP_ORDER.length - 1 && (
                  <div className="absolute top-3 left-1/2 w-full h-[3px] bg-gray-700 -z-10">
                    <div
                      className="h-[3px] bg-green-500 transition-all duration-500"
                      style={{ width: isCompleted ? "100%" : "0%" }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </>
    );
  };
  // Step 2: Basic Info Component
  const BasicInfoStep = ({
    userData,
    updateUserData,
    setUserDataState,
    setCurrentStep,
    STEPS,
  }: any) => {
    const [localName, setLocalName] = useState(userData.name || "");
    const [localGender, setLocalGender] = useState(userData.gender || "");

const handleSubmit = async (e: React.FormEvent) => {

      e.preventDefault();
      if (localName && localGender) {
        const updatedData = {
          ...userData,
          name: localName,
          gender: localGender,
        };

        // Update local state only
        updateUserData(updatedData);
        setUserDataState(updatedData);

        // Update localStorage with the new data
        localStorage.setItem('aurasync_user_data', JSON.stringify(updatedData));

// Also save to database
        try {
          const currentUser = auth.currentUser;
          if (currentUser) {
            const idToken = await currentUser.getIdToken();
            
            const response = await fetch('/api/user', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${idToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                email: updatedData.email,
                name: updatedData.name,
                gender: updatedData.gender,
                location: updatedData.location || 'Mumbai',
                skin_tone: updatedData.skin_tone || '',
                face_shape: updatedData.face_shape || null,
                body_shape: updatedData.body_shape || null,
                personality: updatedData.personality || null,
                // IMPORTANT: Don't set onboarding_completed during intermediate steps
                // Only set it explicitly to true in the final completion step
                onboarding_completed: updatedData.onboarding_completed ?? false
              })
            });
            
            if (!response.ok) {
              console.error('Failed to save gender to database');
            }
          }
        } catch (error) {
          console.error('Error saving gender to database:', error);
        }


        setCurrentStep(STEPS.SKIN_FACE_ANALYSIS);
      }
    };

    return (
      <>
        {/* Desktop */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="min-h-screen bg-[#251F1E] hidden md:flex items-center justify-center"
        >
          {/* Background Galaxy */}
          <div
            style={{ width: "100%", height: "100vh", position: "relative" }}
          ></div>

          {/* Form */}
          <div className="bg-[#353333] absolute backdrop-blur-lg rounded-2xl p-8 w-full max-w-md text-white">
            <h2 className="text-3xl font-bold mb-6 text-center">
              Tell us about yourself
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  What is your full name
                </label>
                <input
                  type="text"
                  value={localName}
                  onChange={(e) => setLocalName(e.target.value)}
                  className="w-full px-4 py-3 rounded-tr-3xl rounded-bl-3xl bg-white/20 border border-white/30 text-white placeholder-gray-300 focus:outline-none focus:border-white/50"
                  placeholder="Enter your full name"
                  required
                />
              </div>

              {/* Gender */}
              <div>
                <label className="block text-sm font-medium mb-2">Gender</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setLocalGender("male")}
                    className={`p-4 rounded-lg border-2 transition-colors ${localGender === "male"
                      ? "border-blue-400 bg-blue-400/20"
                      : "border-white/30 bg-white/10 hover:border-white/50"
                      }`}
                  >
                    <div className="text-center">
                      <div className="text-2xl mb-2 flex items-center justify-center">
                        <Image src={male} height={100} width={100} alt="male" />
                      </div>
                      <div className="font-medium">Male</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLocalGender("female")}
                    className={`p-4 rounded-lg border-2 transition-colors ${localGender === "female"
                      ? "border-pink-400 bg-pink-400/20"
                      : "border-white/30 bg-white/10 hover:border-white/50"
                      }`}
                  >
                    <div className="text-center">
                      <div className="text-2xl mb-2 flex items-center justify-center">
                        <Image
                          src={female}
                          height={100}
                          width={100}
                          alt="female"
                        />
                      </div>
                      <div className="font-medium">Female</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={!localName || !localGender}
                className="w-full rounded-full bg-[#4F4D4D] py-3 transition-all"
              >
                Proceed
              </button>
            </form>
          </div>
        </motion.div>

        {/* Mobile */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="min-h-screen bg-[#251F1E] md:hidden flex items-center justify-center"
        >
          {/* Form */}
          <div className="bg-[#353333] absolute backdrop-blur-lg rounded-2xl p-6 w-full max-w-sm text-white mx-4">
            <h2 className="text-2xl font-bold mb-6 text-center">
              Tell us about yourself
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  What is your full name
                </label>
                <input
                  type="text"
                  value={localName}
                  onChange={(e) => setLocalName(e.target.value)}
                  className="w-full px-4 py-3 rounded-tr-3xl rounded-bl-3xl bg-white/20 border border-white/30 text-white placeholder-gray-300 focus:outline-none focus:border-white/50"
                  placeholder="Enter your full name"
                  required
                />
              </div>

              {/* Gender */}
              <div>
                <label className="block text-sm font-medium mb-2">Gender</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setLocalGender("male")}
                    className={`p-3 rounded-lg border-2 transition-colors ${localGender === "male"
                      ? "border-blue-400 bg-blue-400/20"
                      : "border-white/30 bg-white/10 hover:border-white/50"
                      }`}
                  >
                    <div className="text-center">
                      <div className="text-xl mb-2 flex items-center justify-center">
                        <Image src={male} height={80} width={80} alt="male" />
                      </div>
                      <div className="font-medium text-sm">Male</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLocalGender("female")}
                    className={`p-3 rounded-lg border-2 transition-colors ${localGender === "female"
                      ? "border-pink-400 bg-pink-400/20"
                      : "border-white/30 bg-white/10 hover:border-white/50"
                      }`}
                  >
                    <div className="text-center">
                      <div className="text-xl mb-2 flex items-center justify-center">
                        <Image
                          src={female}
                          height={80}
                          width={80}
                          alt="female"
                        />
                      </div>
                      <div className="font-medium text-sm">Female</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={!localName || !localGender}
                className="w-full rounded-full bg-[#4F4D4D] py-3 transition-all"
              >
                Proceed
              </button>
            </form>
          </div>
        </motion.div>
      </>
    );
  };

  // Step 5:PersonalityAnalysis Component
  const PersonalityAnalysisStep = ({
    userData,
    setUserDataState,
    setCurrentStep,
    STEPS,
  }: any) => {
    const [hasStarted, setHasStarted] = useState(false);
    const [showPersonalityInstructions, setShowPersonalityInstructions] =
      useState(false);

const handleNext = async (personalityType: string) => {
      const updatedData = { ...userData, personality: personalityType };
      
      // Award points for completing personality analysis
      const pointsResult = awardAnalysisPoints(updatedData, 'Personality Analysis');
      const finalData = pointsResult.userData;
      
      // Save points to Supabase if user_id is available
      if (finalData.user_id) {
        await savePointsToSupabase(finalData, pointsResult.transaction);
      }
      
      // Save analysis data to Supabase
      await saveUserDataToSupabase(finalData);
      
      updateUserData(finalData);
      setUserDataState(finalData);

      // Update localStorage with the new data
      localStorage.setItem('aurasync_user_data', JSON.stringify(finalData));

      // Show review popup after analysis completion
      setTimeout(() => {
        reviewPopup.showAfterAnalysis();
      }, 1000);

      // Trigger coin-to-wallet animation (from screen center to wallet)
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('coin:to-wallet', { detail: { count: 10 } });
        window.dispatchEvent(event);
      }

      setCurrentStep(STEPS.COMPLETE);
    };

    return (
      <>
        {/* Desktop */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="min-h-screen hidden md:flex bg-[#251F1E] items-center justify-center text-white p-4 md:p-8"
        >
          <div className="mx-auto flex flex-col items-center w-full">
            {/* Progress */}
            <div className="w-full mb-6">
              <ProgressBar currentStep={STEPS.PERSONALITY_ANALYSIS} />
            </div>

            <div className="w-full flex flex-col md:flex-row gap-6">
              {/* LEFT PANEL: IMAGE / CONTENT */}
              <div className="md:w-[65%] w-full flex items-center justify-center h-[60vh] md:h-[80vh] relative rounded-lg overflow-hidden">
                <Image
                  src={PersonalityPhoto}
                  alt="Personality Analysis"
                  fill
                  className="object-contain"
                />
              </div>

              {/* RIGHT PANEL: CONTROLS */}
              <div className="md:w-[35%] w-full flex flex-col space-y-6">
                {/* Instructions */}
                <div className="w-full bg-[#444141] p-5 rounded-3xl text-white">
                  <h1 className="text-xl font-bold mb-4">
                    Personality Analysis Instructions
                  </h1>
                  <p className="text-sm text-gray-300 mb-3">
                    Welcome to the Personality Analysis Test! ✨
                  </p>
                  <p className="text-sm text-gray-300 mb-3">
This test identifies your style personality to tailor fashion suggestions.localhost:3000

                  </p>
                  <ul className="list-disc list-inside text-sm space-y-2 mb-3">
                    <li>16-20 questions in total.</li>
                    <li>Answer honestly - no right or wrong answers.</li>
                    <li>Trust your first instinct.</li>
                    <li>Think about your usual behavior.</li>
                    <li>Estimated time: 5-7 minutes.</li>
                  </ul>
                  <p className="text-sm">
                    ✨ <span className="font-semibold">Tip:</span> Take your time and be honest with your answers.
                  </p>
                </div>

                {/* Action Buttons */}
                {!hasStarted ? (
                  <>
                    <button
                      onClick={() => setHasStarted(true)}
                      className="w-full bg-[#444141] text-white py-3 rounded-lg font-semibold hover:bg-[#555] transition-all"
                    >
                      Start the Test
                    </button>

                    <button
                      onClick={() => setCurrentStep(STEPS.COMPLETE)}
                      className="w-full text-white py-3 rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      <span className="underline">I&apos;ll do it later</span>
                    </button>
                  </>
                ) : (
                  <div className="w-full bg-[#444141] p-4 rounded-3xl text-center">
                    <h3 className="text-lg font-bold mb-2">Test in Progress</h3>
                    <p className="text-sm text-gray-300">
                      Complete the personality assessment to continue
                    </p>
                  </div>
                )}

                {/* Navigation */}
                <div className="flex justify-between gap-4 mt-6">
                  <button
                    onClick={() => setCurrentStep(STEPS.BODY_ANALYSIS)}
                    className="w-1/2 py-3 rounded-lg border-2 border-white/30 bg-white/10 text-white hover:border-white/50 transition-colors"
                  >
                    Back
                  </button>
                  {!hasStarted && (
                    <button
                      onClick={() => setCurrentStep(STEPS.COMPLETE)}
                      className="w-1/2 py-3 rounded-lg bg-[#444141] text-white font-semibold hover:bg-[#555] transition-all"
                    >
                      Skip
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
          {hasStarted && (
            <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center ">
              <div className="relative w-full h-full md:w-[100vw] md:h-[100vh] bg-[#251F1E] rounded-none md:rounded-2xl p-4 md:p-8 overflow-auto">

                <div className="w-full h-full flex items-center justify-center">
                  <div className="w-full">
<PersonalityAnalysisWidget onComplete={handleNext} gender={userData.gender}/>

                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Mobile */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="min-h-screen md:hidden bg-[#251F1E] flex items-center justify-center text-white p-4 md:p-8"
        >
          <div className="max-w-4xl mx-auto flex flex-col items-center">
            <div className="w-full">
              <ProgressBar currentStep={STEPS.PERSONALITY_ANALYSIS} />
            </div>

            {!hasStarted ? (
              <div className="w-full md:w-[100vw] md:h-[80vh] gap-8">
                {/* Personality Analysis */}
                <div className="backdrop-blur-lg rounded-xl p-6 mt-20">
                  <div className="flex flex-col gap-6 items-start">
                    {/* Image Section - Now on Top */}
                    <div className="w-full flex items-center justify-center relative overflow-hidden">
                      <Image
                        src={MobilePersonalityPhoto}
                        alt="Personality Analysis"
                        height={200}
                        width={200}
                        className="object-cover w-[300px] h-[300px] rounded-full"
                      />
                    </div>

                    {/* Content Section - Now Below */}
                    <div className="w-full flex flex-col space-y-4">
                      {/* Instructions */}
                      <div className="w-full h-auto bg-[#444141] p-4 rounded-3xl backdrop-blur-lg text-white">
                        <h3 className="text-lg font-bold mb-3">
                          Personality Analysis Instructions
                        </h3>
                        <p className="text-sm text-gray-300 mb-3">
                          Welcome to the Personality Analysis Test! ✨
                        </p>
                        <p className="text-sm text-gray-300 mb-3">
This test identifies your style personality to tailor fashion suggestions.

                        </p>
                        <ul className="list-disc list-inside text-sm space-y-1 mb-3">
                          <li>16-20 questions in total.</li>
                          <li>Answer honestly - no right or wrong answers.</li>
                          <li>Trust your first instinct.</li>
                          <li>Think about your usual behavior.</li>
                          <li>Estimated time: 5-7 minutes.</li>
                        </ul>
                        <p className="text-sm">
                          ✨ <span className="font-semibold">Tip:</span> Take your time and be honest with your answers.
                        </p>
                      </div>

                      <button
                        onClick={() => setHasStarted(true)}
                        className="w-full bg-[#444141] text-white py-3 rounded-lg font-semibold hover:bg-[#555] transition-all"
                      >
                        Start the Test
                      </button>

                      <button
                        onClick={() => setShowPersonalityInstructions(true)}
                        className="w-full bg-[#444141] text-white py-3 rounded-lg font-semibold hover:bg-[#555555] transition-all"
                      >
                        Instructions
                      </button>

                      <button
                        onClick={() => setCurrentStep(STEPS.COMPLETE)}
                        className="w-full text-white py-3 rounded-lg hover:bg-gray-700 transition-colors"
                      >
                        <span className="underline">I&apos;ll do it later</span>
                      </button>

                      <div className="flex justify-center gap-4 mt-8">
                        <button
                          onClick={() => setCurrentStep(STEPS.BODY_ANALYSIS)}
                          className="px-8 py-3 rounded-lg border-2 border-white/30 bg-white/10 text-white hover:border-white/50 transition-colors"
                        >
                          Back
                        </button>
                        <button
                          onClick={() => setCurrentStep(STEPS.COMPLETE)}
                          className="px-8 py-3 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold hover:from-blue-600 hover:to-purple-700 transition-all"
                        >
                          Skip
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-full mt-20">
<PersonalityAnalysisWidget onComplete={handleNext} gender={userData.gender} />

              </div>
            )}

            {/* Personality Instructions Modal */}
            {showPersonalityInstructions && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-[#444141] rounded-xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-white">
                      🧠 Personality Analysis Instructions
                    </h3>
                    <button
                      onClick={() => setShowPersonalityInstructions(false)}
                      className="text-white hover:text-gray-300 text-2xl"
                    >
                      ×
                    </button>
                  </div>
                  <div className="text-white text-sm space-y-3">
                    <p>Welcome to the Personality Analysis Test! ✨</p>
                    <p>
                      This test identifies your personality type (MBTI) to tailor
                      fashion suggestions.
                    </p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>16-20 questions in total.</li>
                      <li>Answer honestly - no right or wrong answers.</li>
                      <li>Trust your first instinct.</li>
                      <li>Think about your usual behavior.</li>
                      <li>Estimated time: 5-7 minutes.</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Personality Instructions Modal */}
        {showPersonalityInstructions && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#444141] rounded-xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white">
                  ðŸ§ Personality Analysis Instructions
                </h3>
                <button
                  onClick={() => setShowPersonalityInstructions(false)}
                  className="text-white hover:text-gray-300 text-2xl"
                >
                  Ã—
                </button>
              </div>
              <div className="text-white text-sm space-y-3">
                <p>Welcome to the Personality Analysis Test! âœ¨</p>
                <p>
                  This test identifies your personality type (MBTI) to tailor
                  fashion suggestions.
                </p>
                <ul className="list-disc list-inside space-y-1">
                  <li>16-20 questions in total.</li>
                  <li>Answer honestly - no right or wrong answers.</li>
                  <li>Trust your first instinct.</li>
                  <li>Think about your usual behavior.</li>
                  <li>Estimated time: 5-7 minutes.</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </>
    );
  };

  // Step 6: Complete Component
  const CompleteStep = ({ userData }: any) => {
    const handleComplete = async () => {
try {
        console.log('🎯 handleComplete called');
        console.log('📊 userData:', userData);
        
        // Award points for completing full onboarding
        const onboardingResult = awardOnboardingPoints(userData);
        const completedUserData = { ...onboardingResult.userData, onboarding_completed: true };
        
        console.log('✅ completedUserData:', completedUserData);
        
        // Save points to Supabase if user_id is available
        if (completedUserData.user_id) {
          await savePointsToSupabase(completedUserData, onboardingResult.transaction);
        }
        
        markOnboardingCompleted();

        // Show review popup after onboarding completion
        setTimeout(() => {
          reviewPopup.showAfterOnboarding();
        }, 2000);

        // Complete onboarding by sending all user data to your local API
        const currentUser = auth.currentUser;
        console.log('👤 Current user:', currentUser?.email);
        
        if (!currentUser) {
          console.error('❌ No current user found');
          alert('No user logged in. Please login again.');
          router.push('/onboarding');
          return;
        }
        
        const idToken = await currentUser.getIdToken();
        
        console.log('📤 Sending data to API:', {
          email: completedUserData.email,
          name: completedUserData.name,
          gender: completedUserData.gender,
          location: completedUserData.location || "Mumbai",
          skin_tone: completedUserData.skin_tone,
          face_shape: completedUserData.face_shape,
          body_shape: completedUserData.body_shape,
          personality: completedUserData.personality,
          onboarding_completed: true
        });

        const response = await fetch('/api/user', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${idToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: completedUserData.email,
            name: completedUserData.name,
            gender: completedUserData.gender,
            location: completedUserData.location || "Mumbai",
            skin_tone: completedUserData.skin_tone,
            face_shape: completedUserData.face_shape,
            body_shape: completedUserData.body_shape,
            personality: completedUserData.personality,
            onboarding_completed: true
          })
        });

        console.log('📥 API response status:', response.status);

        if (response.ok) {
          const updatedUserData = await response.json();
          console.log('✅ Updated user data from API:', updatedUserData);
          
          // Update local state with fresh data
          setUserData(updatedUserData);
          setUserDataState(updatedUserData);
          
          // Redirect to gender-specific page
          const redirectPath = completedUserData.gender === "male" ? "/male" : "/female";
          console.log('🚀 Redirecting to:', redirectPath);
          router.push(redirectPath);
        } else {
          const errorText = await response.text();
          console.error('❌ API error response:', errorText);
          throw new Error('Failed to complete onboarding: ' + errorText);
        }
      } catch (error) {
        console.error('❌ ERROR in handleComplete:', error);
        alert('An error occurred. Redirecting anyway...');
        // Still redirect even if API fails
        const redirectPath = userData?.gender === "male" ? "/male" : "/female";
        console.log('🚀 Redirecting anyway to:', redirectPath);
        if (redirectPath && userData?.gender) {
          router.push(redirectPath);
        } else {
          console.error('❌ No gender set, cannot redirect');
          alert('Please complete all steps including gender selection.');
        }
      }

    };

    return (
      <>
        {/* Desktop */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="min-h-screen hidden md:flex items-center justify-center bg-[#251F1E]"
        >
          <div className="text-center text-white p-8">

            <div className="text-6xl text-center flex gap-6 mb-6">


            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Welcome to Auraasync!
            </h1>
            <p className="text-xl mb-8 text-gray-300">
              Your personalized fashion journey is ready to begin
            </p>

            <button
onClick={() => {
                console.log('🔘 Button clicked!');
                handleComplete();
              }}
              className="text-white bg-blue-600 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-blue-700 transition-all cursor-pointer z-50 relative"

            >
              Start Exploring
            </button>
          </div>
        </motion.div>

        {/* Mobile */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="min-h-screen md:hidden flex items-center justify-center bg-[#251F1E]"
        >
          <div className="text-center text-white p-8">
            <div className="text-4xl flex gap-4 mb-6 justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                className="lucide lucide-party-popper h-6 w-6 text-amber-300"
                aria-hidden="true"
              >
                <path d="M5.8 11.3 2 22l10.7-3.79"></path>
                <path d="M4 3h.01"></path>
                <path d="M22 8h.01"></path>
                <path d="M15 2h.01"></path>
                <path d="M22 20h.01"></path>
                <path d="m22 2-2.24.75a2.9 2.9 0 0 0-1.96 3.12v0c.1.86-.57 1.63-1.45 1.63h-.38c-.86 0-1.6.6-1.76 1.44L14 10"></path>
                <path d="m22 13-.82-.33c-.86-.34-1.82.2-1.98 1.11v0c-.11.7-.72 1.22-1.43 1.22H17"></path>
                <path d="m11 2 .33.82c.34.86-.2 1.82-1.11 1.98v0C9.52 4.9 9 5.52 9 6.23V7"></path>
                <path d="M11 13c1.93 1.93 2.83 4.17 2 5-.83.83-3.07-.07-5-2-1.93-1.93-2.83-4.17-2-5 .83-.83 3.07.07 5 2Z"></path>
              </svg>
              <span className="text-lg">Quiz Completed</span>
            </div>
            <h1 className="text-3xl font-bold mb-6">Welcome to Auraasync!</h1>
            <p className="text-lg mb-8 text-gray-300">
              Your personalized fashion journey is ready to begin
            </p>

            <button
onClick={() => {
                console.log('🔘 Mobile Button clicked!');
                handleComplete();
              }}
              className="text-white bg-blue-600 px-6 py-3 rounded-lg font-semibold text-base hover:bg-blue-700 transition-all cursor-pointer z-50 relative"

            >
              Start Exploring
            </button>
          </div>
        </motion.div>
      </>
    );
  };

  // Render current step
  return (
    <AnimatePresence mode="wait">
      {/* Show loading screen while checking authentication - skip in single mode */}
      {isCheckingAuth && !singleMode ? (
        <motion.div
          key="checking-auth"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center"
        >
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-white text-lg">Checking your account...</p>
          </div>
        </motion.div>
      ) : (
        <>
          {currentStep === STEPS.LOGIN && <LoginStep key="login" />}

          {currentStep === STEPS.BASIC_INFO && (
            <BasicInfoStep
              key="basic_info"
              userData={userData}
              updateUserData={updateUserData}
              setUserDataState={setUserDataState}
              setCurrentStep={setCurrentStep}
              STEPS={STEPS}
            />
          )}

          {currentStep === STEPS.SKIN_FACE_ANALYSIS && (
            <SkinFaceAnalysisStep
              key="skin_analysis"
              userData={userData}
              setUserDataState={setUserDataState}
              setCurrentStep={setCurrentStep}
              STEPS={STEPS}
              reviewPopup={reviewPopup}
              ProgressBar={ProgressBar}
              saveUserDataToSupabase={saveUserDataToSupabase}
              singleMode={singleMode}
              singleTarget={singleTarget}
              saveSingleModeAndReturn={saveSingleModeAndReturn}
            />
          )}

          {currentStep === STEPS.BODY_ANALYSIS && (
            <BodyAnalysisStep
              key="body_analysis"
              userData={userData}
              setUserDataState={setUserDataState}
              setCurrentStep={setCurrentStep}
              STEPS={STEPS}
              reviewPopup={reviewPopup}
              ProgressBar={ProgressBar}
              saveUserDataToSupabase={saveUserDataToSupabase}
              singleMode={singleMode}
              singleTarget={singleTarget}
              saveSingleModeAndReturn={saveSingleModeAndReturn}
            />
          )}

          {currentStep === STEPS.PERSONALITY_ANALYSIS && (
            <PersonalityAnalysisStep
              key="personality_analysis"
              userData={userData}
              setUserDataState={setUserDataState}
              setCurrentStep={setCurrentStep}
              STEPS={STEPS}
            />
          )}

          {currentStep === STEPS.COMPLETE && (
            <CompleteStep key="complete" userData={userData} />
          )}
        </>
      )}

      {/* Review Popup */}
    {/* <ReviewPopup
        isOpen={reviewPopup.isOpen}
        onClose={reviewPopup.closePopup}
        onRateNow={reviewPopup.handleRateNow}
        onRemindLater={reviewPopup.handleRemindLater}
        onNeverShow={reviewPopup.handleNeverShow}
        triggerAction={reviewPopup.triggerAction}
      /> */}
    </AnimatePresence>
  );
}

