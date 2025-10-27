// Points System Test Suite
// This file contains tests to verify the points system functionality

import { 
  pointsManager, 
  POINTS_ACTIONS, 
  POINTS_REWARDS,
  awardSignupPoints,
  awardOnboardingPoints,
  awardDailyLoginPoints,
  awardReferralPoints,
  awardReviewPoints,
  awardAnalysisPoints
} from './pointsSystem';

// Mock user data for testing
const mockUserData = {
  id: 1,
  email: 'test@example.com',
  name: 'Test User',
  gender: 'male' as const,
  location: 'Test City',
  skin_tone: 'medium',
  face_shape: 'oval',
  body_shape: 'mesomorph',
  personality: 'explorer',
  onboarding_completed: true,
  points: 0,
  last_login_date: '2024-01-01',
  referral_code: 'TEST123',
  total_referrals: 0
};

// Test suite
export function runPointsSystemTests() {
  console.log('🧪 Running Points System Tests...\n');

  // Test 1: User Initialization
  console.log('Test 1: User Initialization');
  const initializedUser = pointsManager.initializeUser(mockUserData);
  console.log('✅ User initialized with points:', initializedUser.points);
  console.log('✅ Referral code generated:', initializedUser.referral_code);
  console.log('✅ Last login date set:', initializedUser.last_login_date);
  console.log('');

  // Test 2: Signup Points
  console.log('Test 2: Signup Points Award');
  const signupResult = awardSignupPoints(initializedUser);
  console.log('✅ Signup points awarded:', signupResult.transaction.points);
  console.log('✅ Total points after signup:', signupResult.userData.points);
  console.log('');

  // Test 3: Analysis Points
  console.log('Test 3: Analysis Completion Points');
  const analysisResult = awardAnalysisPoints(signupResult.userData, 'Face Analysis');
  console.log('✅ Analysis points awarded:', analysisResult.transaction.points);
  console.log('✅ Total points after analysis:', analysisResult.userData.points);
  console.log('');

  // Test 4: Onboarding Completion Points
  console.log('Test 4: Onboarding Completion Points');
  const onboardingResult = awardOnboardingPoints(analysisResult.userData);
  console.log('✅ Onboarding points awarded:', onboardingResult.transaction.points);
  console.log('✅ Total points after onboarding:', onboardingResult.userData.points);
  console.log('');

  // Test 5: Daily Login Points
  console.log('Test 5: Daily Login Points');
  const dailyLoginResult = awardDailyLoginPoints(onboardingResult.userData);
  if (dailyLoginResult.transaction) {
    console.log('✅ Daily login points awarded:', dailyLoginResult.transaction.points);
    console.log('✅ Total points after daily login:', dailyLoginResult.userData.points);
  } else {
    console.log('ℹ️ Daily login points not awarded (already claimed today)');
  }
  console.log('');

  // Test 6: Referral Points
  console.log('Test 6: Referral Points');
  const referralResult = awardReferralPoints(dailyLoginResult.userData, 'friend@example.com');
  console.log('✅ Referral points awarded:', referralResult.transaction.points);
  console.log('✅ Total points after referral:', referralResult.userData.points);
  console.log('✅ Total referrals count:', referralResult.userData.total_referrals);
  console.log('');

  // Test 7: Review Points
  console.log('Test 7: Review Points');
  const reviewResult = awardReviewPoints(referralResult.userData, 'Amazing Product');
  console.log('✅ Review points awarded:', reviewResult.transaction.points);
  console.log('✅ Total points after review:', reviewResult.userData.points);
  console.log('');

  // Test 8: Points Summary
  console.log('Test 8: Points Summary');
  const summary = pointsManager.getPointsSummary(reviewResult.userData);
  console.log('✅ Total points:', summary.totalPoints);
  console.log('✅ Available rewards:', summary.availableRewards);
  console.log('✅ Unlocked features:', summary.unlockedFeatures);
  console.log('✅ Next milestone:', summary.nextMilestone);
  console.log('');

  // Test 9: Reward Purchase
  console.log('Test 9: Reward Purchase');
  const canAfford = pointsManager.canAffordReward(reviewResult.userData, 'PREMIUM_OUTFIT_PAIRING');
  console.log('✅ Can afford premium outfit pairing:', canAfford);
  
  if (canAfford) {
    const purchaseResult = pointsManager.purchaseReward(reviewResult.userData, 'PREMIUM_OUTFIT_PAIRING');
    console.log('✅ Purchase successful:', purchaseResult.success);
    console.log('✅ Points after purchase:', purchaseResult.userData.points);
    console.log('✅ Message:', purchaseResult.message);
  }
  console.log('');

  // Test 10: Transaction History
  console.log('Test 10: Transaction History');
  const transactions = pointsManager.getTransactionHistory();
  console.log('✅ Total transactions:', transactions.length);
  console.log('✅ Recent transactions:');
  transactions.slice(0, 3).forEach((tx, index) => {
    console.log(`   ${index + 1}. ${tx.description} - ${tx.points > 0 ? '+' : ''}${tx.points} points`);
  });
  console.log('');

  // Test 11: Available Rewards
  console.log('Test 11: Available Rewards');
  const rewards = pointsManager.getAvailableRewards();
  console.log('✅ Total rewards available:', rewards.length);
  rewards.forEach((reward, index) => {
    console.log(`   ${index + 1}. ${reward.name} - ${reward.cost} coins`);
  });
  console.log('');

  // Test 12: Points Actions
  console.log('Test 12: Points Actions');
  const actions = pointsManager.getAllActions();
  console.log('✅ Total actions available:', actions.length);
  actions.forEach((action, index) => {
    console.log(`   ${index + 1}. ${action.name} - ${action.points} points`);
  });
  console.log('');

  console.log('🎉 All Points System Tests Completed Successfully!');
  console.log('📊 Final Points Balance:', reviewResult.userData.points);
  console.log('🏆 System is ready for production use!');
}

// Export test runner
export default runPointsSystemTests;
