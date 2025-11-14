'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins, Gift, Star, TrendingUp, Zap, Calendar } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  pointsManager, 
  getPointsDisplay, 
  getPointsProgress,
  POINTS_REWARDS,
  type PointsTransaction 
} from '@/lib/pointsSystem';

interface PointsDisplayProps {
  userData: any;
  onPointsUpdate?: (newUserData: any) => void;
  showRewards?: boolean;
  compact?: boolean;
  onCalendarGenerate?: () => void;
}

export default function PointsDisplay({ 
  userData, 
  onPointsUpdate, 
  showRewards = false, 
  compact = false,
  onCalendarGenerate
}: PointsDisplayProps) {
  const router = useRouter();
  const [showRewardsModal, setShowRewardsModal] = useState(false);
  const [showTransactionHistory, setShowTransactionHistory] = useState(false);
  const [selectedReward, setSelectedReward] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [rewards, setRewards] = useState<any[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  
  const points = userData?.points || 0;
  const summary = pointsManager.getPointsSummary(userData);

  // Fetch transactions from Supabase
  const fetchTransactions = async () => {
    if (!userData?.user_id) return;
    
    setLoadingTransactions(true);
    try {
      const { data, error } = await supabase
        .from('points_transactions')
        .select('*')
        .eq('user_id', userData.user_id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching transactions:', error);
        setTransactions([]);
      } else {
        setTransactions(data || []);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setTransactions([]);
    } finally {
      setLoadingTransactions(false);
    }
  };

  // Fetch rewards from Supabase
  const fetchRewards = async () => {
    try {
      const { data, error } = await supabase
        .from('rewards')
        .select('*')
        .order('cost', { ascending: true });

      if (error) {
        console.error('Error fetching rewards:', error);
        setRewards([]);
      } else {
        // Check which rewards are already purchased
        const { data: purchases } = await supabase
          .from('reward_purchases')
          .select('reward_id')
          .eq('user_id', userData.user_id);

        const purchasedRewardIds = new Set(purchases?.map(p => p.reward_id) || []);
        
        const rewardsWithStatus = (data || []).map(reward => ({
          ...reward,
          isUnlocked: purchasedRewardIds.has(reward.id)
        }));
        
        setRewards(rewardsWithStatus);
      }
    } catch (error) {
      console.error('Error fetching rewards:', error);
      setRewards([]);
    }
  };

  // Load data when component mounts or userData changes
  React.useEffect(() => {
    if (userData?.user_id) {
      fetchTransactions();
      fetchRewards();
    }
  }, [userData?.user_id]);

  const handleRewardPurchase = async (rewardId: string) => {
    const result = pointsManager.purchaseReward(userData, rewardId);
    
    if (result.success) {
      try {
        // Get the reward details
        const reward = rewards.find(r => r.id === rewardId);
        if (!reward) {
          alert('Reward not found');
          return;
        }

        // Save points transaction to Supabase
        const { error: transactionError } = await supabase
          .from('points_transactions')
          .insert({
            user_id: userData.user_id,
            action: 'reward_purchase',
            points: -reward.cost,
            description: `Purchased ${reward.name}`
          });

        if (transactionError) {
          console.error('Error saving transaction:', transactionError);
          alert('Failed to save transaction. Please try again.');
          return;
        }

        // Save reward purchase to Supabase
        const { error: purchaseError } = await supabase
          .from('reward_purchases')
          .insert({
            user_id: userData.user_id,
            reward_id: rewardId
          });

        if (purchaseError) {
          console.error('Error saving reward purchase:', purchaseError);
          alert('Failed to save reward purchase. Please try again.');
          return;
        }

        // First, get current points
        const { data: currentUser, error: fetchError } = await supabase
          .from('user')
          .select('points')
          .eq('user_id', userData.user_id)
          .single();

        if (fetchError) {
          console.error('Error fetching current user points:', fetchError);
          alert('Failed to fetch current points. Please try again.');
          return;
        }

        const newPoints = (currentUser.points || 0) - reward.cost;

        // Update user points in Supabase
        const { error: updateError } = await supabase
          .from('user')
          .update({ 
            points: newPoints,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userData.user_id);

        if (updateError) {
          console.error('Error updating user points:', updateError);
          alert('Failed to update points. Please try again.');
          return;
        }

        onPointsUpdate?.(result.userData);
        
        // Special handling for calendar reward
        if (rewardId === 'calendar_access') {
          alert('Calendar unlocked! Redirecting to calendar page...');
          setTimeout(() => {
            router.push('/calendar');
          }, 1500);
        } else {
          alert(`Reward purchased! You spent ${reward.cost} coins.`);
        }
        
        setSelectedReward(null);
        fetchRewards(); // Refresh rewards list
      } catch (error) {
        console.error('Error purchasing reward:', error);
        alert('Failed to purchase reward. Please try again.');
      }
    } else {
      alert(result.message);
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 backdrop-blur-lg rounded-lg px-2 py-1.5 md:px-3 md:py-2 border border-yellow-500/30">
        <Coins className="w-3 h-3 md:w-4 md:h-4 text-yellow-400" />
        <span className="text-yellow-400 font-semibold text-xs md:text-sm">
          {getPointsDisplay(points)}
        </span>
        {summary.nextMilestone > points && (
          <div className="hidden md:block text-xs text-gray-400">
            {summary.nextMilestone - points} to next milestone
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      {/* Main Points Display */}
      <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 backdrop-blur-lg rounded-xl p-4 md:p-6 border border-yellow-500/30">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/20 rounded-lg">
              <Coins className="w-5 h-5 md:w-6 md:h-6 text-yellow-400" />
            </div>
            <div>
              <h3 className="text-lg md:text-xl font-bold text-yellow-400">Your Coins</h3>
              <p className="text-xl md:text-2xl font-bold text-white">{points.toLocaleString()}</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setShowRewardsModal(true)}
              className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-lg text-xs md:text-sm font-medium hover:bg-yellow-500/30 transition-all"
            >
              <Gift className="w-3 h-3 md:w-4 md:h-4 inline mr-1" />
              <span className="hidden sm:inline">Rewards</span>
            </button>
            <button
              onClick={() => setShowTransactionHistory(true)}
              className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-lg text-xs md:text-sm font-medium hover:bg-blue-500/30 transition-all"
            >
              <TrendingUp className="w-3 h-3 md:w-4 md:h-4 inline mr-1" />
              <span className="hidden sm:inline">History</span>
            </button>
          </div>
        </div>

        {/* Progress to next milestone */}
        {summary.nextMilestone > points && (
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-300 mb-2">
              <span>Next Milestone</span>
              <span>{summary.nextMilestone - points} coins to go</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-yellow-500 to-orange-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${getPointsProgress(points, summary.nextMilestone)}%` }}
              />
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2 md:gap-4 text-center">
          <div className="bg-white/5 rounded-lg p-2 md:p-3">
            <div className="text-sm md:text-lg font-bold text-yellow-400">{summary.availableRewards}</div>
            <div className="text-xs text-gray-400">Available</div>
          </div>
          <div className="bg-white/5 rounded-lg p-2 md:p-3">
            <div className="text-sm md:text-lg font-bold text-green-400">{summary.unlockedFeatures}</div>
            <div className="text-xs text-gray-400">Unlocked</div>
          </div>
          <div className="bg-white/5 rounded-lg p-2 md:p-3">
            <div className="text-sm md:text-lg font-bold text-blue-400">{transactions.length}</div>
            <div className="text-xs text-gray-400">Transactions</div>
          </div>
        </div>
      </div>

      {/* Rewards Modal */}
      <AnimatePresence>
        {showRewardsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowRewardsModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#251F1E] rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-yellow-400 flex items-center gap-2">
                  <Gift className="w-6 h-6" />
                  Rewards Shop
                </h2>
                <button
                  onClick={() => setShowRewardsModal(false)}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="grid gap-4">
                {rewards.map((reward) => (
                  <div
                    key={reward.id}
                    className={`p-4 rounded-lg border ${
                      reward.isUnlocked
                        ? 'bg-green-500/10 border-green-500/30'
                        : points >= reward.cost
                        ? 'bg-yellow-500/10 border-yellow-500/30'
                        : 'bg-gray-500/10 border-gray-500/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-white flex items-center gap-2">
                          {reward.name}
                          {reward.isUnlocked && <Star className="w-4 h-4 text-green-400" />}
                        </h3>
                        <p className="text-gray-300 text-sm mt-1">{reward.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Coins className="w-4 h-4 text-yellow-400" />
                          <span className="text-yellow-400 font-medium">{reward.cost} coins</span>
                        </div>
                      </div>
                      
                      {reward.id === 'calendar_access' && reward.isUnlocked ? (
                        <button
                          onClick={() => router.push('/calendar')}
                          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-400 hover:from-purple-500/30 hover:to-pink-500/30 rounded-lg font-medium transition-all border border-purple-500/30"
                        >
                          <Calendar className="w-4 h-4" />
                          Generate Calendar
                        </button>
                      ) : (
                        <button
                          onClick={() => handleRewardPurchase(reward.id)}
                          disabled={points < reward.cost || reward.isUnlocked}
                          className={`px-4 py-2 rounded-lg font-medium transition-all ${
                            reward.isUnlocked
                              ? 'bg-green-500/20 text-green-400 cursor-not-allowed'
                              : points >= reward.cost
                              ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                              : 'bg-gray-500/20 text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          {reward.isUnlocked ? 'Unlocked' : points >= reward.cost ? 'Purchase' : 'Insufficient'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transaction History Modal */}
      <AnimatePresence>
        {showTransactionHistory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowTransactionHistory(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#251F1E] rounded-xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-blue-400 flex items-center gap-2">
                  <TrendingUp className="w-6 h-6" />
                   History
                </h2>
                <button
                  onClick={() => setShowTransactionHistory(false)}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-3">
                {loadingTransactions ? (
                  <div className="text-center text-gray-400 py-8">
                    <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p>Loading transactions...</p>
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="text-center text-gray-400 py-8">
                    <Zap className="w-12 h-12 mx-auto mb-4 text-gray-500" />
                    <p>No transactions yet</p>
                    <p className="text-sm">Complete actions to earn coins!</p>
                  </div>
                ) : (
                  transactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="text-white font-medium">{transaction.description}</p>
                        <p className="text-gray-400 text-sm">
                          {new Date(transaction.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className={`font-bold ${
                        transaction.points > 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {transaction.points > 0 ? '+' : ''}{transaction.points}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
