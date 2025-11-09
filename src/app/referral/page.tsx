"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { 
  Copy, 
  Users, 
  Gift, 
  Share2, 
  CheckCircle2, 
  Coins,
  ArrowLeft,
  UserPlus,
  Trophy,
  Sparkles,
  Award
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { getUserData } from "@/lib/userState";
import { pointsManager, savePointsToSupabase } from "@/lib/pointsSystem";
import Image from "next/image";

interface UserData {
  user_id: number;
  email: string;
  name: string;
  referral_code: string;
  total_referrals: number;
  points: number;
}

interface ReferralRecord {
  id: string;
  referred_user_id: number;
  created_at: string;
  points_awarded: boolean;
}

export default function ReferralPage() {
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [referralHistory, setReferralHistory] = useState<ReferralRecord[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/");
        return;
      }

      try {
        const localUserData = getUserData();
        if (!localUserData?.user_id) {
          setIsLoading(false);
          return;
        }

        // Fetch fresh user data from Supabase
        const { data, error } = await supabase
          .from("user")
          .select("*")
          .eq("user_id", localUserData.user_id)
          .single();

        if (error) {
          console.error("Error fetching user data:", error);
          setIsLoading(false);
          return;
        }

        setUserData(data);
        
        // Fetch referral history
        const { data: referrals, error: referralsError } = await supabase
          .from("referrals")
          .select("*")
          .eq("referrer_user_id", data.user_id)
          .order("created_at", { ascending: false });

        if (!referralsError && referrals) {
          setReferralHistory(referrals);
        }
      } catch (error) {
        console.error("Error loading user data:", error);
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const referralLink = mounted 
    ? `${window.location.origin}?ref=${userData?.referral_code || ''}`
    : '';

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy: ", err);
    }
  };

  const shareOnWhatsApp = () => {
    const message = encodeURIComponent(
      `Join AuraSync and get personalized AI styling! Use my referral code: ${userData?.referral_code}\n${referralLink}`
    );
    window.open(`https://wa.me/?text=${message}`, "_blank");
  };

  const shareOnTwitter = () => {
    const message = encodeURIComponent(
      `Get personalized AI styling with @AuraSync! Use my code: ${userData?.referral_code}`
    );
    window.open(`https://twitter.com/intent/tweet?text=${message}&url=${referralLink}`, "_blank");
  };

  const handleEnterReferralCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!referralCode.trim() || !userData) return;

    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      // 1. Check if user has already used a referral code
      const { data: existingReferral, error: checkError } = await supabase
        .from("referrals")
        .select("*")
        .eq("referred_user_id", userData.user_id)
        .single();

      if (existingReferral) {
        setErrorMessage("You have already used a referral code!");
        setIsSubmitting(false);
        return;
      }

      // 2. Find the referrer by referral code
      const { data: referrer, error: referrerError } = await supabase
        .from("user")
        .select("*")
        .eq("referral_code", referralCode.trim().toUpperCase())
        .single();

      if (referrerError || !referrer) {
        setErrorMessage("Invalid referral code. Please check and try again.");
        setIsSubmitting(false);
        return;
      }

      // 3. Check if user is trying to use their own code
      if (referrer.user_id === userData.user_id) {
        setErrorMessage("You cannot use your own referral code!");
        setIsSubmitting(false);
        return;
      }

      // 4. Create referral record
      const { error: insertError } = await supabase
        .from("referrals")
        .insert({
          referrer_user_id: referrer.user_id,
          referred_user_id: userData.user_id,
          referral_code: referralCode.trim().toUpperCase(),
          points_awarded: true,
        });

      if (insertError) {
        console.error("Error creating referral:", insertError);
        console.error("Error details:", JSON.stringify(insertError, null, 2));
        
        // Check for specific error types
        if (insertError.code === '23505') {
          setErrorMessage("You have already used a referral code!");
        } else if (insertError.message?.includes('RLS')) {
          setErrorMessage("Database access error. Please contact support.");
        } else {
          setErrorMessage(`Failed to apply referral code: ${insertError.message || 'Unknown error'}`);
        }
        setIsSubmitting(false);
        return;
      }

      // 5. Award points to REFERRER (the person who shared the code)
      const referrerResult = pointsManager.awardPoints(
        referrer,
        "REFERRAL",
        `Referred ${userData.name || userData.email}`
      );

      await savePointsToSupabase(referrerResult.userData, referrerResult.transaction);

      // 6. Award bonus points to NEW USER (the person who entered the code)
      const newUserResult = pointsManager.awardPoints(
        userData,
        "REFERRAL_BONUS",
        `Used referral code: ${referralCode}`
      );

      await savePointsToSupabase(newUserResult.userData, newUserResult.transaction);

      // 7. Update local userData
      setUserData(newUserResult.userData);

      // Play success sound
      if (typeof window !== 'undefined') {
        try {
          const audio = new Audio('/coin-prize.wav');
          audio.volume = 0.5;
          audio.play().catch(() => {});
        } catch (error) {
          console.error('Error playing coin sound:', error);
        }
      }

      setSuccessMessage(
        `Success! You earned ${newUserResult.transaction.points} coins! The referrer also earned 150 coins.`
      );
      setReferralCode("");
      
      // Reload page after 2 seconds to show updated data
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error("Error processing referral:", error);
      setErrorMessage("An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#251F1E] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-400"></div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="min-h-screen bg-[#251F1E] flex items-center justify-center">
        <div className="text-white text-center">
          <p className="text-xl mb-4">Please log in to access referrals</p>
          <button
            onClick={() => router.push("/")}
            className="px-6 py-2 bg-amber-500 rounded-lg hover:bg-amber-600 transition-colors"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#251F1E] text-white py-8 px-4">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>

        <div className="text-center mb-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-block mb-4"
          >
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-4 rounded-full">
              <Users className="w-12 h-12 text-white" />
            </div>
          </motion.div>
          <h1 className="text-4xl md:text-5xl font-bold mb-3 bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
            Refer & Earn
          </h1>
          <p className="text-gray-300 text-lg">
            Share AuraSync with friends and earn amazing rewards!
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Share Your Code */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6"
        >
          {/* Stats Card */}
          <div className="bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-2xl p-6 border border-amber-500/30">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Trophy className="w-6 h-6 text-amber-400" />
                Your Stats
              </h2>
              <Coins className="w-6 h-6 text-amber-400" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/10 rounded-xl p-4">
                <p className="text-gray-300 text-sm mb-1">Total Coins</p>
                <p className="text-3xl font-bold text-amber-400">{userData.points}</p>
              </div>
              <div className="bg-white/10 rounded-xl p-4">
                <p className="text-gray-300 text-sm mb-1">Referrals</p>
                <p className="text-3xl font-bold text-green-400">{userData.total_referrals}</p>
              </div>
            </div>
          </div>

          {/* Your Referral Code */}
          <div className="bg-[#353333] rounded-2xl p-6 border border-white/10">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Gift className="w-5 h-5 text-amber-400" />
              Your Referral Code
            </h3>
            
            <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-xl p-4 mb-4 border border-amber-500/30">
              <p className="text-center text-3xl font-bold tracking-wider text-amber-400">
                {userData.referral_code}
              </p>
            </div>

            <button
              onClick={copyToClipboard}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold py-3 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 mb-4"
            >
              {copied ? (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-5 h-5" />
                  Copy Referral Link
                </>
              )}
            </button>

            {/* Share Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={shareOnWhatsApp}
                className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition-all duration-300 flex items-center justify-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                WhatsApp
              </button>
              <button
                onClick={shareOnTwitter}
                className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 rounded-lg transition-all duration-300 flex items-center justify-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                Twitter
              </button>
            </div>
          </div>

          {/* How it Works */}
          <div className="bg-[#353333] rounded-2xl p-6 border border-white/10">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              How It Works
            </h3>
            
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-amber-500/20 rounded-full flex items-center justify-center text-amber-400 font-bold">
                  1
                </div>
                <div>
                  <p className="font-semibold">Share Your Code</p>
                  <p className="text-gray-400 text-sm">Send your unique referral code to friends</p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-amber-500/20 rounded-full flex items-center justify-center text-amber-400 font-bold">
                  2
                </div>
                <div>
                  <p className="font-semibold">Friend Signs Up</p>
                  <p className="text-gray-400 text-sm">They enter your code and get 50 bonus coins</p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-amber-500/20 rounded-full flex items-center justify-center text-amber-400 font-bold">
                  3
                </div>
                <div>
                  <p className="font-semibold">You Both Earn!</p>
                  <p className="text-gray-400 text-sm">You get 150 coins, they get 50 coins</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
        <h1>Demo</h1>

        {/* Right Column - Enter Referral Code */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6"
        >
          {/* Enter Code Form */}
          <div className="bg-[#353333] rounded-2xl p-6 border border-white/10">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-green-400" />
              Have a Referral Code?
            </h3>
            
            <form onSubmit={handleEnterReferralCode} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">
                  Enter Referral Code
                </label>
                <input
                  type="text"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                  placeholder="AURA123456"
                  className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:border-amber-500 transition-colors uppercase"
                  maxLength={12}
                  disabled={isSubmitting}
                />
              </div>

              {errorMessage && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-300 text-sm">
                  {errorMessage}
                </div>
              )}

              {successMessage && (
                <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-3 text-green-300 text-sm">
                  {successMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={!referralCode.trim() || isSubmitting}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-3 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <Gift className="w-5 h-5" />
                    Claim Bonus Coins
                  </>
                )}
              </button>
            </form>

            <div className="mt-4 bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
              <p className="text-sm text-amber-300 font-semibold flex items-center gap-2">
                <Coins className="w-4 h-4" />
                Earn 50 coins when you use a referral code!
              </p>
            </div>
          </div>

          {/* Referral History */}
          {referralHistory.length > 0 && (
            <div className="bg-[#353333] rounded-2xl p-6 border border-white/10">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-400" />
                Your Referrals ({referralHistory.length})
              </h3>
              
              <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                {referralHistory.map((referral, index) => (
                  <div
                    key={referral.id}
                    className="bg-white/5 rounded-lg p-3 border border-white/10 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">Referral #{index + 1}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(referral.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    {referral.points_awarded && (
                      <div className="flex items-center gap-1 text-green-400 text-sm font-semibold">
                        <CheckCircle2 className="w-4 h-4" />
                        +150
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rewards Preview */}
          <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl p-6 border border-purple-500/30">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-purple-400" />
              Referral Rewards
            </h3>
            
            <div className="space-y-3">
              <div className="bg-white/10 rounded-lg p-4 border border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold">For You</span>
                  <span className="text-amber-400 font-bold text-lg">+150 Coins</span>
                </div>
                <p className="text-sm text-gray-300">Per successful referral</p>
              </div>
              
              <div className="bg-white/10 rounded-lg p-4 border border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold">For Your Friend</span>
                  <span className="text-green-400 font-bold text-lg">+50 Coins</span>
                </div>
                <p className="text-sm text-gray-300">Welcome bonus for new users</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Custom Scrollbar Styles */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(251, 191, 36, 0.5);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(251, 191, 36, 0.7);
        }
      `}</style>
    </div>
  );
}
