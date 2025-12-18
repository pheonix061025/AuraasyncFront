'use client';

import React, { useEffect } from 'react';
import { useUserData, useUserEmail, useUserId } from '@/hooks/useUserData';
import { auth } from '@/lib/firebase';

// Example 1: Using the useUserData hook
export function UserProfile() {
  const { user, isLoading, isAuthenticated, refresh, error } = useUserData();

  if (isLoading) {
    return <div>Loading user data...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!isAuthenticated || !user) {
    return <div>Please sign in to view your profile</div>;
  }

  return (
    <div>
      <h1>Welcome, {user.name}!</h1>
      <p>Email: {user.email}</p>
      <p>Gender: {user.gender}</p>
      <p>Location: {user.location}</p>
      <p>Points: {user.points}</p>
      <p>Referral Code: {user.referral_code}</p>
      <button onClick={refresh}>Refresh Data</button>
    </div>
  );
}

// Example 2: Using simplified hooks
export function UserEmailDisplay() {
  const userEmail = useUserEmail();
  const userId = useUserId();

  return (
    <div>
      <p>Current user email: {userEmail || 'Not authenticated'}</p>
      <p>User ID: {userId || 'Not available'}</p>
    </div>
  );
}

// Example 3: Making authenticated API calls
export function AuthenticatedAPICall() {
  const { user } = useUserData();

  const fetchUserRecommendations = async () => {
    if (!user?.email) {
      console.error('User not authenticated');
      return;
    }

    try {
      // Get Firebase ID token
      const idToken = await auth.currentUser?.getIdToken();
      
      if (!idToken) {
        throw new Error('No authentication token available');
      }

      // Make authenticated API call
      const response = await fetch('/api/user', {
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user data');
      }

      const userData = await response.json();
      console.log('User data from API:', userData);
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  return (
    <button onClick={fetchUserRecommendations}>
      Load User Data from API
    </button>
  );
}

// Example 4: Server-side usage (in API routes)
export async function serverSideUserExample(idToken: string) {
  try {
    // This would be used in API routes
    const response = await fetch('/api/user', {
      headers: {
        'Authorization': `Bearer ${idToken}`,
      }
    });
    
    const userData = await response.json();
    return userData;
  } catch (error) {
    console.error('Server-side user fetch error:', error);
    return null;
  }
}

// Example 5: Component with user data state management
export function UserPreferences() {
  const { user, refresh } = useUserData();

  const updatePreferences = async (preferences: any) => {
    if (!user?.user_id) {
      alert('Please sign in first');
      return;
    }

    try {
      const idToken = await auth.currentUser?.getIdToken();
      
      const response = await fetch('/api/user', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: user.user_id,
          ...preferences
        })
      });

      if (response.ok) {
        // Refresh user data after update
        await refresh();
        alert('Preferences updated successfully!');
      } else {
        throw new Error('Failed to update preferences');
      }
    } catch (error) {
      console.error('Error updating preferences:', error);
      alert('Failed to update preferences');
    }
  };

  return (
    <div>
      <h2>User Preferences</h2>
      {user && (
        <div>
          <p>Current personality: {user.personality || 'Not set'}</p>
          <p>Body shape: {user.body_shape || 'Not set'}</p>
          <p>Face shape: {user.face_shape || 'Not set'}</p>
        </div>
      )}
    </div>
  );
}
