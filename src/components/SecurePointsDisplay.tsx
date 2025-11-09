'use client';

import React from 'react';
import { usePointsDisplay } from '@/hooks/useSecurePoints';

interface SecurePointsDisplayProps {
  showRefreshButton?: boolean;
  className?: string;
}

export default function SecurePointsDisplay({ 
  showRefreshButton = false, 
  className = '' 
}: SecurePointsDisplayProps) {
  const { points, isLoading, error, formattedPoints, hasPoints } = usePointsDisplay();

  if (isLoading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="animate-pulse bg-gray-600 h-6 w-20 rounded"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <span className="text-red-400 text-sm">Error loading points</span>
        {showRefreshButton && (
          <button 
            onClick={() => window.location.reload()}
            className="text-blue-400 text-xs hover:underline"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className="flex items-center space-x-1">
        <span className="text-yellow-400">💰</span>
        <span className="font-semibold text-white">
          {formattedPoints}
        </span>
        <span className="text-gray-400 text-sm">points</span>
      </div>
      
      {hasPoints && (
        <span className="text-green-400 text-xs">✓</span>
      )}
    </div>
  );
}

// Usage example component
export function PointsBalanceCard() {
  const { points, isLoading, error } = usePointsDisplay();

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <h3 className="text-lg font-semibold text-white mb-2">Your Points Balance</h3>
      
      <div className="flex items-center justify-between">
        <SecurePointsDisplay showRefreshButton={true} />
        
        {points > 0 && (
          <span className="text-green-400 text-sm">
            Ready to spend!
          </span>
        )}
      </div>

      {error && (
        <div className="mt-2 text-red-400 text-xs">
          {error}
        </div>
      )}
    </div>
  );
}

// Component for showing points with actions
export function PointsWithActions() {
  const { points, isLoading, error } = usePointsDisplay();

  if (isLoading) return <div>Loading points...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">Your Rewards</h2>
        <SecurePointsDisplay />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Daily Login Bonus</span>
          <span className="text-green-400">+10 points</span>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Complete Review</span>
          <span className="text-green-400">+25 points</span>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Refer a Friend</span>
          <span className="text-green-400">+50 points</span>
        </div>
      </div>

      {points > 100 && (
        <div className="mt-4 p-3 bg-green-900/20 border border-green-700 rounded">
          <p className="text-green-400 text-sm">
            🎉 You have enough points for premium features!
          </p>
        </div>
      )}
    </div>
  );
}
