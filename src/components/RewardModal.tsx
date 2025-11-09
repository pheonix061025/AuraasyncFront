"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { Coins, Zap, Star, Users, MessageSquare, CheckCircle2, Award } from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { supabase } from "@/lib/supabase"
import { pointsManager, savePointsToSupabase } from "@/lib/pointsSystem"
import { useRouter } from "next/navigation"
import ReviewPopup from "./ReviewPopup"
import { useReviewPopup } from "@/hooks/useReviewPopup"


interface Task {
  id: string
  action: string
  points: number
  icon: React.ReactNode
  completed: boolean
  claimed: boolean
  canClaim: boolean
}

interface RewardModalProps {
  onClose?: () => void
  userData?: any
  onPointsUpdate?: (newUserData: any) => void
}

export function RewardModal({ onClose, userData, onPointsUpdate }: RewardModalProps) {
  const [userCoins, setUserCoins] = useState(userData?.points || 0)
  const [tasks, setTasks] = useState<Task[]>([])
  const [isClaimingPoints, setIsClaimingPoints] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)

  const router = useRouter()
  const reviewPopup = useReviewPopup()
  
  // Fetch fresh data from Supabase when modal opens
  const fetchFreshUserData = async () => {
    if (!userData?.user_id) {
      setUserCoins(userData?.points || 0)
      loadTasksData()
      return
    }

    try {
      const { data, error } = await supabase
        .from('user')
        .select('points, last_login_date')
        .eq('user_id', userData.user_id)
        .single()

      if (!error && data) {
        setUserCoins(data.points || 0)
        // Update userData with fresh data
        if (userData) {
          const updatedUserData = {
            ...userData,
            points: data.points,
            last_login_date: data.last_login_date
          }
          onPointsUpdate?.(updatedUserData)
        }
      }
    } catch (error) {
      console.error('Error fetching fresh user data:', error)
    }
    
    loadTasksData()
  }
  
  useEffect(() => {
    setMounted(true)
    fetchFreshUserData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (userData?.points !== undefined) {
      setUserCoins(userData.points)
    }
  }, [userData?.points])

  // Check if user can claim daily login based on last_login_date
  const canClaimDailyLogin = (): boolean => {
    if (!userData?.last_login_date) return true;
    
    const lastLogin = new Date(userData.last_login_date);
    const now = new Date();
    
    // Get dates at midnight
    const lastLoginMidnight = new Date(lastLogin.getFullYear(), lastLogin.getMonth(), lastLogin.getDate());
    const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Check if 24 hours have passed since last login
    const hoursSinceLogin = (now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60);
    
    // Can claim if it's a new day (past midnight) and 24 hours have passed
    return hoursSinceLogin >= 24 && lastLoginMidnight.getTime() < nowMidnight.getTime();
  };

  const loadTasksData = async () => {
    if (!userData) return
    
    setLoading(true)
    try {
      // Check which tasks user has completed
      const { data: transactions, error } = await supabase
        .from('points_transactions')
        .select('*')
        .eq('user_id', userData.user_id)

      const completedActions = new Set(transactions?.map(t => t.action) || [])
      const claimedActions = new Set(transactions?.filter(t => t.points > 0).map(t => t.action) || [])
      
      // Check if daily login was claimed today
      const today = new Date().toISOString().split('T')[0];
      const dailyLoginClaimedToday = transactions?.some(
        t => t.action === 'DAILY_LOGIN' && t.created_at?.startsWith(today)
      ) || false;

      // Check if user has submitted any reviews
      const { data: reviews, error: reviewError } = await supabase
        .from('reviews')
        .select('id')
        .eq('user_id', userData.user_id)
        .limit(1);

      const hasSubmittedReview = !reviewError && reviews && reviews.length > 0;

      const taskList: Task[] = [
        { 
          id: "signup", 
          action: "Signing up (onboarding)", 
          points: 50, 
          icon: <CheckCircle2 className="w-4 h-4" />,
          completed: userData.onboarding_completed || false,
          claimed: claimedActions.has('SIGNUP') || claimedActions.has('signup'),
          canClaim: (userData.onboarding_completed || false) && !claimedActions.has('SIGNUP') && !claimedActions.has('signup')
        },
        { 
          id: "analysis_complete", 
          action: "Completing analysis", 
          points: 50, 
          icon: <Zap className="w-4 h-4" />,
          completed: !!(userData.face_shape && userData.body_shape),
          claimed: claimedActions.has('ANALYSIS_COMPLETE') || claimedActions.has('analysis_complete'),
          canClaim: !!(userData.face_shape && userData.body_shape) && !claimedActions.has('ANALYSIS_COMPLETE') && !claimedActions.has('analysis_complete')
        },
        { 
          id: "daily_login", 
          action: "Daily login bonus", 
          points: 10, 
          icon: <Star className="w-4 h-4" />,
          completed: canClaimDailyLogin(), // Can claim if 24 hours passed and it's a new day
          claimed: dailyLoginClaimedToday,
          canClaim: canClaimDailyLogin() && !dailyLoginClaimedToday
        },
        { 
          id: "referral", 
          action: "Referring a friend", 
          points: 150, 
          icon: <Users className="w-4 h-4" />,
          completed: (userData.total_referrals || 0) > 0,
          claimed: claimedActions.has('REFERRAL') || claimedActions.has('referral'),
          canClaim: (userData.total_referrals || 0) > 0 && !claimedActions.has('REFERRAL') && !claimedActions.has('referral')
        },
        { 
          id: "review", 
          action: "Writing a review", 
          points: 50, 
          icon: <MessageSquare className="w-4 h-4" />,
          completed: hasSubmittedReview,
          claimed: claimedActions.has('REVIEW') || claimedActions.has('review'),
          canClaim: hasSubmittedReview && !claimedActions.has('REVIEW') && !claimedActions.has('review')
        },
      ]

      setTasks(taskList)
    } catch (error) {
      console.error('Error loading tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleClaimTask = async (task: Task) => {
    if (!userData || !task.canClaim) return

    setIsClaimingPoints(true)
    
    try {
      // Award points using points manager
      const actionMap: Record<string, string> = {
        'signup': 'SIGNUP',
        'analysis_complete': 'ANALYSIS_COMPLETE',
        'daily_login': 'DAILY_LOGIN',
        'referral': 'REFERRAL',
        'review': 'REVIEW'
      }

      const actionId = actionMap[task.id] || task.id.toUpperCase()
      const result = pointsManager.awardPoints(userData, actionId, task.action)
      
      // If claiming daily login, update last_login_date
      if (task.id === 'daily_login') {
        const today = new Date().toISOString().split('T')[0];
        result.userData.last_login_date = today;
      }
      
      // Save to Supabase
      const saveSuccess = await savePointsToSupabase(result.userData, result.transaction)
      
      if (saveSuccess) {
        // Also update last_login_date in Supabase if this is daily login
        if (task.id === 'daily_login') {
          const today = new Date().toISOString().split('T')[0];
          await supabase
            .from('user')
            .update({ last_login_date: today })
            .eq('user_id', userData.user_id);
        }
        
        // Fetch fresh data from Supabase to get accurate count
        const { data: freshData, error: fetchError } = await supabase
          .from('user')
          .select('*')
          .eq('user_id', userData.user_id)
          .single()

        if (!fetchError && freshData) {
          setUserCoins(freshData.points || 0)
          
          // Update userData with fresh data
          const updatedUserData = { 
            ...result.userData, 
            points: freshData.points,
            last_login_date: freshData.last_login_date
          }
          onPointsUpdate?.(updatedUserData)
        } else {
          setUserCoins(result.userData.points)
          onPointsUpdate?.(result.userData)
        }
        
        // Reload tasks to update canClaim status
        loadTasksData()
        
        // Play coin sound when claim button is clicked
        if (typeof window !== 'undefined') {
          try {
            const audio = new Audio('/coin-prize.wav');
            audio.volume = 0.5;
            audio.play().catch(() => {
              // Silently fail if audio can't play
            });
          } catch (error) {
            console.error('Error playing coin sound:', error);
          }
          // Trigger coin-to-wallet animation from the claim button area
          const btn = document.getElementById('wallet-anchor');
          const start = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
          const event = new CustomEvent('coin:to-wallet', { detail: { count: 10, start } });
          window.dispatchEvent(event);
        }
      } else {
        alert('Failed to save points. Please try again.')
      }
    } catch (error) {
      console.error('Error claiming task:', error)
      alert('Failed to claim points. Please try again.')
    } finally {
      setIsClaimingPoints(false)
    }
  }

  // Handle clicking on incomplete tasks to redirect or open appropriate action
  const handleIncompleteTask = (task: Task) => {
    console.log('handleIncompleteTask called for task:', task.id, task);
    
    if (task.completed || task.claimed) {
      console.log('Task already completed or claimed, ignoring');
      return;
    }

    switch (task.id) {
      case 'signup':
        console.log('Redirecting to onboarding');
        // Redirect to onboarding
        router.push('/onboarding');
        if (onClose) onClose();
        break;
      case 'analysis_complete':
        console.log('Redirecting to analysis');
        // Redirect to analysis page
        router.push('/onboarding');
        if (onClose) onClose();
        break;
      case 'daily_login':
        console.log('Showing daily login message');
        // Daily login can't be forced, just show message
        alert('Come back tomorrow to claim your daily login bonus!');
        break;
      case 'referral':
        console.log('Showing referral message');
        // Could scroll to referral section or show referral modal
        alert('Share your referral link with friends to earn 150 coins per referral!');
        break;
      case 'review':
        console.log('Opening review popup');
        // Open review popup - use forceShow to bypass restrictions
        reviewPopup.forceShow('rewards_incentive');
        break;
      default:
        console.log('Unknown task type:', task.id);
        break;
    }
  }

  if (!mounted) return null

  const modalContent = (
    <div 
      className="fixed w-full h-full inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-6xl max-h-[90vh] rounded-2xl overflow-hidden shadow-2xl relative flex flex-col" style={{ backgroundColor: "#251F1E" }}>
        {/* Close Button */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 text-white hover:text-gray-300 transition-colors bg-black/50 rounded-full p-2 hover:bg-black/70"
            aria-label="Close modal"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
        
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 px-4 py-3 md:px-8 md:py-6 border-b border-white/10 flex-shrink-0">
          <h2 className="text-xl md:text-3xl font-bold text-white flex items-center gap-2 md:gap-3">
            <Coins className="w-6 h-6 md:w-8 md:h-8 text-amber-400" />
            Points & Rewards
          </h2>
          <p className="text-gray-300 text-xs md:text-sm mt-1">Earn coins by completing tasks and unlock premium features</p>
        </div>

        {/* Main Content - Scrollable */}
        <div className="overflow-y-auto flex-1 px-4 py-4 md:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
          {/* Left Side - Tasks List */}
          <div className="space-y-6 md:border-r-2 md:pr-8 border-white/40">
            {/* Current Points Display */}
            <div className="bg-gradient-to-br from-amber-500/30 to-orange-500/20 rounded-xl p-4 md:p-6 border border-amber-500/30">
              <div className="flex items-center justify-between mb-3 md:mb-4">
                <span className="text-gray-300 text-xs md:text-sm font-medium">YOUR COINS</span>
                <Coins className="w-4 h-4 md:w-5 md:h-5 text-amber-400" />
              </div>
              <div className="text-2xl md:text-4xl font-bold text-white mb-3 md:mb-4">{userCoins}</div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Progress to Premium</span>
                  <span>{Math.min(userCoins, 100)} / 100</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-500"
                    style={{ width: `${Math.min((userCoins / 100) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Tasks List */}
            <div className="space-y-3">
              <h3 className="text-xs md:text-sm font-semibold text-gray-300 uppercase tracking-wider">Available Tasks</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400"></div>
                  </div>
                ) : (
                  tasks.map((task) => (
                    <div
                      key={task.id}
                      className={`rounded-lg p-3 border transition-all duration-200 flex items-center justify-between group ${
                        task.claimed 
                          ? 'bg-green-500/10 border-green-500/30' 
                          : task.completed && task.canClaim
                          ? 'bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20'
                          : 'bg-white/5 border-white/10 hover:bg-white/10 cursor-pointer'
                      }`}
                      onClick={(e) => {
                        console.log('Task card clicked:', task.id, 'completed:', task.completed, 'claimed:', task.claimed);
                        if (!task.completed && !task.claimed) {
                          handleIncompleteTask(task);
                        }
                      }}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`flex-shrink-0 ${task.claimed ? 'text-green-400' : task.completed ? 'text-amber-400' : 'text-gray-400'}`}>
                          {task.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className={`text-sm block ${task.claimed ? 'text-green-300' : task.completed ? 'text-gray-200' : 'text-gray-400'}`}>
                            {task.action}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="flex items-center gap-1 bg-amber-500/20 px-2 py-1 rounded-full">
                          <Coins className="w-3 h-3 text-amber-400" />
                          <span className="text-amber-300 font-semibold text-xs">+{task.points}</span>
                        </div>
                        
                        {task.claimed && (
                          <div className="flex items-center gap-1 text-green-400 text-xs">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Claimed</span>
                          </div>
                        )}
                        
                        {!task.claimed && task.canClaim && (
                          <Button
                            onClick={() => handleClaimTask(task)}
                            disabled={isClaimingPoints}
                            className="px-3 py-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-amber-500/50"
                          >
                            Claim
                          </Button>
                        )}
                        
                        {!task.completed && !task.claimed && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              console.log('Complete Task button clicked for:', task.id);
                              handleIncompleteTask(task);
                            }}
                            className="flex items-center gap-1 text-amber-400 text-xs hover:text-amber-300 transition-colors font-medium hover:underline"
                          >
                            <span>Complete Task →</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Side - Premium Feature Showcase */}
          <div className="space-y-6">
            {/* Feature Visual */}
            <div className="relative rounded-xl overflow-hidden h-48 md:h-64 flex items-center justify-center group">
                {/* Scalable image container for smooth hover zoom */}
                <div className="absolute inset-0 transition-transform duration-700 transform-gpu group-hover:scale-105">
                    <Image
                        fill
                        src="/rewardmodal.png"
                        alt="AI Outfit Pairing - Woman in closet with outfit suggestions"
                        className="w-full h-full object-cover"
                    />
                </div>

                {/* Gradient overlay that becomes a bit stronger on hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent transition-opacity duration-500 group-hover:opacity-90" />

                {/* Caption that subtly lifts on hover */}
                <div className="absolute w-full z-10 bottom-0 p-2 md:p-4 transform transition-all duration-500 group-hover:-translate-y-2">
                    <h1 className="text-base md:text-xl font-bold">AI Outfit Pairing & 10-Day Style Calendar</h1>
                    <p className="text-xs mt-1 md:mt-2 leading-tight">
                        Upload your wardrobe and let our AI stylist create smart outfit combinations for you! Get personalized
                        pairing suggestions based on your tops and bottoms, and unlock a 10-day outfit calendar that plans your daily looks.
                    </p>
                </div>
            </div>

            {/* Feature Description */}
            <div className="space-y-3 md:space-y-4">
              <h3 className="text-lg md:text-xl font-bold text-white">Unlock Premium Styling</h3>
              <p className="text-gray-300 text-xs md:text-sm leading-relaxed">
                Upload your clothes and get AI-generated outfit suggestions powered by AI. Get personalized
                styling recommendations tailored to your wardrobe.
              </p>

              {/* Pricing Tiers */}
              <div className="space-y-3 pt-4 border-t border-white/10">
                {/* <div className="flex items-start gap-3 p-3 bg-white/5 rounded-lg border border-white/10">
                  <Star className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-white font-semibold text-sm">First-Time Users</p>
                    <p className="text-gray-400 text-xs">1 free session included</p>
                  </div>
                </div> */}

                {/* <div className="flex items-start gap-3 p-3 bg-white/5 rounded-lg border border-white/10">
                  <Coins className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-white font-semibold text-sm">Returning Users</p>
                    <p className="text-gray-400 text-xs">100 coins per session</p>
                  </div>
                </div> */}

                <div className="flex items-start gap-3 p-3 bg-white/20 rounded-lg border border-white/40">
                  <Zap className="w-5 h-5 text- flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-white font-semibold text-sm">Premium Unlock</p>
                    <p className="text-gray-300 text-xs">500 coins = 10-day outfit calendar</p>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA Button */}
            <Button
            onClick={()=>router.push('/calendar')}
            className="w-full border bg-stone-950 text-white font-bold py-2 md:py-3 rounded-lg transition-all duration-300 shadow-lg hover:shadow-purple-500/50 text-sm md:text-base">
              Explore Premium Features
            </Button>
          </div>
          </div>
        </div>
      </div>

      {/* Review Popup */}
      <ReviewPopup
        isOpen={reviewPopup.isOpen}
        onClose={reviewPopup.closePopup}
        onRateNow={async (rating, feedback) => {
          await reviewPopup.handleRateNow(rating, feedback);
          // Reload tasks after review submission to update status
          loadTasksData();
        }}
        onRemindLater={reviewPopup.handleRemindLater}
        onNeverShow={reviewPopup.handleNeverShow}
        triggerAction={reviewPopup.triggerAction}
      />
    </div>
  )

  return createPortal(modalContent, document.body)
}
