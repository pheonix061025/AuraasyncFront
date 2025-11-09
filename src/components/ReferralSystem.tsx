'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, Users, Gift, Share2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { pointsManager, awardReferralPoints } from '@/lib/pointsSystem';

interface ReferralSystemProps {
  userData: any;
  onPointsUpdate?: (newUserData: any) => void;
}

export default function ReferralSystem({ userData, onPointsUpdate }: ReferralSystemProps) {
  const [copied, setCopied] = useState(false);
  const [referralEmail, setReferralEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const referralCode = userData?.referral_code || 'AURA123';
  const referralLink = `${window.location.origin}?ref=${referralCode}`;
  const totalReferrals = userData?.total_referrals || 0;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  const handleReferralSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!referralEmail.trim()) return;

    setIsSubmitting(true);
    
    try {
      // Award referral points
      const result = awardReferralPoints(userData, referralEmail);
      
      // Save points transaction to Supabase
      const { error: transactionError } = await supabase
        .from('points_transactions')
        .insert({
          user_id: userData.user_id,
          action: result.transaction.action,
          points: result.transaction.points,
          description: result.transaction.description
        });

      if (transactionError) {
        console.error('Error saving referral transaction:', transactionError);
        alert('Failed to save referral transaction. Please try again.');
        return;
      }

      // First, get current user data
      const { data: currentUser, error: fetchError } = await supabase
        .from('user')
        .select('points, total_referrals')
        .eq('user_id', userData.user_id)
        .single();

      if (fetchError) {
        console.error('Error fetching current user data:', fetchError);
        alert('Failed to fetch current user data. Please try again.');
        return;
      }

      const newPoints = (currentUser.points || 0) + result.transaction.points;
      const newReferrals = (currentUser.total_referrals || 0) + 1;

      // Update user points and referral count in Supabase
      const { error: updateError } = await supabase
        .from('user')
        .update({ 
          points: newPoints,
          total_referrals: newReferrals,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userData.user_id);

      if (updateError) {
        console.error('Error updating user data:', updateError);
        alert('Failed to update user data. Please try again.');
        return;
      }

      onPointsUpdate?.(result.userData);
      setReferralEmail('');
      alert(`Referral points awarded! You earned ${result.transaction.points} coins for referring ${referralEmail}`);
    } catch (error) {
      console.error('Referral submission failed:', error);
      alert('Failed to process referral. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const shareOptions = [
    {
      name: 'WhatsApp',
      icon: '💬',
      action: () => window.open(`https://wa.me/?text=Check out AuraSync - AI-powered fashion recommendations! ${referralLink}`)
    },
    {
      name: 'Twitter',
      icon: '🐦',
      action: () => window.open(`https://twitter.com/intent/tweet?text=Check out AuraSync - AI-powered fashion recommendations!&url=${referralLink}`)
    },
    {
      name: 'Email',
      icon: '📧',
      action: () => window.open(`mailto:?subject=Check out AuraSync&body=Hi! I found this amazing AI-powered fashion app called AuraSync. Check it out: ${referralLink}`)
    },
    {
      name: 'Copy Link',
      icon: '📋',
      action: copyToClipboard
    }
  ];

  return (
    <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-lg rounded-xl p-4 md:p-6 border border-purple-500/30">
      <div className="flex items-center gap-3 mb-4 md:mb-6">
        <div className="p-2 bg-purple-500/20 rounded-lg">
          <Users className="w-5 h-5 md:w-6 md:h-6 text-purple-400" />
        </div>
        <div>
          <h3 className="text-lg md:text-xl font-bold text-purple-400">Refer Friends</h3>
          <p className="text-gray-300 text-xs md:text-sm">Earn 150 coins for each friend who signs up</p>
        </div>
      </div>

      {/* Referral Stats */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 mb-4 md:mb-6">
        <div className="bg-white/5 rounded-lg p-3 md:p-4 text-center">
          <div className="text-lg md:text-2xl font-bold text-purple-400">{totalReferrals}</div>
          <div className="text-xs md:text-sm text-gray-400">Friends Referred</div>
        </div>
        <div className="bg-white/5 rounded-lg p-3 md:p-4 text-center">
          <div className="text-lg md:text-2xl font-bold text-yellow-400">{totalReferrals * 150}</div>
          <div className="text-xs md:text-sm text-gray-400">Coins Earned</div>
        </div>
      </div>

      {/* Referral Code */}
      <div className="mb-4 md:mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Your Referral Code
        </label>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="flex-1 bg-white/10 rounded-lg px-3 md:px-4 py-2 md:py-3 font-mono text-sm md:text-lg font-bold text-purple-400 break-all">
            {referralCode}
          </div>
          <button
            onClick={copyToClipboard}
            className="px-3 md:px-4 py-2 md:py-3 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-all flex items-center justify-center gap-2 text-sm md:text-base"
          >
            <Copy className="w-3 h-3 md:w-4 md:h-4" />
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Referral Link */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Share Link
        </label>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-white/10 rounded-lg px-4 py-3 text-sm text-gray-300 break-all">
            {referralLink}
          </div>
          <button
            onClick={copyToClipboard}
            className="px-4 py-3 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-all"
          >
            <Copy className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Share Options */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-3">
          Share on Social Media
        </label>
        <div className="grid grid-cols-2 gap-3">
          {shareOptions.map((option, index) => (
            <button
              key={index}
              onClick={option.action}
              className="flex items-center gap-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-all"
            >
              <span className="text-xl">{option.icon}</span>
              <span className="text-sm font-medium text-white">{option.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Manual Referral Form */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">
          Or manually track a referral
        </label>
        <form onSubmit={handleReferralSubmit} className="flex gap-2">
          <input
            type="email"
            value={referralEmail}
            onChange={(e) => setReferralEmail(e.target.value)}
            placeholder="Enter friend's email"
            className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
            required
          />
          <button
            type="submit"
            disabled={isSubmitting || !referralEmail.trim()}
            className="px-6 py-3 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSubmitting ? (
              <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Gift className="w-4 h-4" />
            )}
            Submit
          </button>
        </form>
      </div>

      {/* Referral Benefits */}
      <div className="mt-6 p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-lg border border-purple-500/20">
        <h4 className="font-semibold text-purple-400 mb-2 flex items-center gap-2">
          <Gift className="w-4 h-4" />
          Referral Benefits
        </h4>
        <ul className="text-sm text-gray-300 space-y-1">
          <li>• You earn 150 coins for each successful referral</li>
          <li>• Your friend gets 50 bonus coins when they sign up</li>
          <li>• Track your referrals and earnings in real-time</li>
          <li>• Use coins to unlock premium features</li>
        </ul>
      </div>
    </div>
  );
}
