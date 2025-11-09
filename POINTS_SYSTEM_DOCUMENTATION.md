# AuraSync Points & Rewards System Documentation

## Overview

The AuraSync Points & Rewards System is a comprehensive gamification feature that encourages user engagement and loyalty through a coin-based reward system. Users earn points (coins) for various actions and can redeem them for premium features.

## Features

### 🪙 Points Earning Actions

| Action | Points | Description |
|--------|--------|-------------|
| **Signup** | +50 | Welcome bonus for new users |
| **Analysis Complete** | +50 | Completing any analysis (skin, face, body, personality) |
| **Onboarding Complete** | +50 | Finishing the full onboarding process |
| **Daily Login** | +10 | Daily check-in bonus (once per day) |
| **Friend Referral** | +150 | Referring a friend who signs up |
| **Product Review** | +50 | Writing a review for a product |

### 🎁 Premium Rewards

| Reward | Cost | Description |
|--------|------|-------------|
| **Premium Outfit Pairing** | 200 coins | Advanced outfit pairing features |
| **Style Calendar** | 150 coins | Access to personalized style calendar |
| **Premium Hairstyles** | 100 coins | Exclusive hairstyle recommendations |
| **Advanced Analysis** | 300 coins | Detailed AI-powered style analysis |

## Technical Implementation

### Core Files

1. **`src/lib/pointsSystem.ts`** - Main points management system
2. **`src/components/PointsDisplay.tsx`** - Points display component
3. **`src/components/ReferralSystem.tsx`** - Referral system component
4. **`src/components/ReviewSystem.tsx`** - Review system component
5. **`src/app/test-points/page.tsx`** - Test suite and demo page

### Database Schema Updates

The user data interface has been updated to include:

```typescript
interface UserData {
  // ... existing fields
  points?: number;                    // User's current coin balance
  last_login_date?: string;         // Last login date for daily bonus
  referral_code?: string;           // Unique referral code
  total_referrals?: number;         // Total referrals made
}
```

### Key Components

#### PointsManager Class

The `PointsManager` class handles all points-related operations:

```typescript
// Initialize user with points system
const userData = pointsManager.initializeUser(userData);

// Award points for actions
const result = pointsManager.awardPoints(userData, 'SIGNUP');

// Check daily login eligibility
const canEarn = pointsManager.canEarnDailyLogin(userData);

// Purchase rewards
const purchase = pointsManager.purchaseReward(userData, 'PREMIUM_OUTFIT_PAIRING');
```

#### Points Display Component

The `PointsDisplay` component shows user's points and provides access to rewards:

```tsx
<PointsDisplay 
  userData={userData} 
  onPointsUpdate={setUserData}
  showRewards={true}
  compact={false}
/>
```

#### Referral System

The `ReferralSystem` component handles friend referrals:

```tsx
<ReferralSystem 
  userData={userData} 
  onPointsUpdate={setUserData}
/>
```

#### Review System

The `ReviewSystem` component allows users to write reviews and earn points:

```tsx
<ReviewSystem 
  userData={userData} 
  onPointsUpdate={setUserData}
  productName="Product Name"
  productId="product-id"
/>
```

## Integration Points

### Dashboard Integration

The points system is integrated into the main dashboard (`src/app/dashboard/page.tsx`):

- Points display at the top of the dashboard
- Referral system for earning points
- Review system for earning points
- Daily login bonus automation

### Navigation Integration

Points are displayed in the navigation bar (`src/components/GenderNavbar.tsx`):

- Compact points display in desktop navigation
- Mobile-friendly points display in mobile menu
- Real-time points updates

### Onboarding Integration

Points are awarded during the onboarding process (`src/app/onboarding/page.tsx`):

- Signup bonus for new users
- Analysis completion bonuses
- Onboarding completion bonus

## Usage Examples

### Awarding Points

```typescript
import { awardSignupPoints, awardAnalysisPoints } from '@/lib/pointsSystem';

// Award signup points
const signupResult = awardSignupPoints(userData);
setUserData(signupResult.userData);

// Award analysis points
const analysisResult = awardAnalysisPoints(userData, 'Face Analysis');
setUserData(analysisResult.userData);
```

### Checking Points Balance

```typescript
import { pointsManager } from '@/lib/pointsSystem';

const summary = pointsManager.getPointsSummary(userData);
console.log('Total points:', summary.totalPoints);
console.log('Available rewards:', summary.availableRewards);
```

### Purchasing Rewards

```typescript
const canAfford = pointsManager.canAffordReward(userData, 'PREMIUM_OUTFIT_PAIRING');
if (canAfford) {
  const result = pointsManager.purchaseReward(userData, 'PREMIUM_OUTFIT_PAIRING');
  if (result.success) {
    setUserData(result.userData);
  }
}
```

## Testing

### Test Suite

Run the comprehensive test suite at `/test-points`:

```typescript
import { runPointsSystemTests } from '@/lib/pointsSystem.test';
runPointsSystemTests();
```

### Manual Testing

1. Navigate to `/test-points` page
2. Click "Run Tests" to execute the test suite
3. Click "Simulate User Journey" to see points being earned
4. Test the referral and review systems
5. Try purchasing rewards

## Configuration

### Points Values

Points values can be configured in `src/lib/pointsSystem.ts`:

```typescript
export const POINTS_ACTIONS = {
  SIGNUP: { points: 50, ... },
  DAILY_LOGIN: { points: 10, ... },
  REFERRAL: { points: 150, ... },
  // ... other actions
};
```

### Reward Costs

Reward costs can be configured in the same file:

```typescript
export const POINTS_REWARDS = {
  PREMIUM_OUTFIT_PAIRING: { cost: 200, ... },
  CALENDAR_ACCESS: { cost: 150, ... },
  // ... other rewards
};
```

## Best Practices

### Points Awarding

1. Always check if user is eligible for points before awarding
2. Use the provided utility functions for consistency
3. Update user data immediately after awarding points
4. Log transactions for debugging

### UI Integration

1. Use the `PointsDisplay` component for consistent UI
2. Show points in navigation for easy access
3. Provide clear feedback when points are earned
4. Make rewards easily discoverable

### Performance

1. Points calculations are lightweight and fast
2. Transaction history is stored in memory (consider persistence for production)
3. Use compact mode for navigation displays
4. Debounce rapid point updates

## Future Enhancements

### Planned Features

1. **Streaks** - Bonus points for consecutive daily logins
2. **Achievements** - Special rewards for milestones
3. **Leaderboards** - Compare points with other users
4. **Seasonal Events** - Limited-time bonus point opportunities
5. **Social Sharing** - Share achievements on social media

### Technical Improvements

1. **Backend Integration** - Store points in database
2. **Real-time Updates** - WebSocket integration for live updates
3. **Analytics** - Track points earning patterns
4. **A/B Testing** - Test different point values and rewards

## Troubleshooting

### Common Issues

1. **Points not updating** - Check if `onPointsUpdate` callback is provided
2. **Daily login not working** - Verify `last_login_date` format
3. **Rewards not unlocking** - Check if user has enough points
4. **Referral not working** - Ensure referral code is unique

### Debug Mode

Enable debug logging by setting:

```typescript
localStorage.setItem('aurasync_debug', 'true');
```

This will log all points transactions to the console.

## Support

For issues or questions about the points system:

1. Check the test suite results
2. Review the console logs
3. Verify user data structure
4. Test with the demo page at `/test-points`

The points system is designed to be robust and user-friendly, encouraging engagement while providing clear value to users through the reward system.
