'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Coins, Gift, Users, Star, Zap, CheckCircle } from 'lucide-react';
import { runPointsSystemTests } from '@/lib/pointsSystem.test';
import PointsDisplay from '@/components/PointsDisplay';
import ReferralSystem from '@/components/ReferralSystem';
import ReviewSystem from '@/components/ReviewSystem';

export default function TestPointsPage() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [userData, setUserData] = useState({
    id: 1,
    user_id: 1, // Add user_id for Supabase testing
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
  });

  const runTests = async () => {
    setIsRunning(true);
    setTestResults([]);
    
    // Capture console.log output
    const originalLog = console.log;
    const logs: string[] = [];
    
    console.log = (...args) => {
      logs.push(args.join(' '));
      originalLog(...args);
    };

    try {
      // Run the tests
      runPointsSystemTests();
      
      // Wait a bit for all logs to be captured
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setTestResults(logs);
    } catch (error) {
      console.error('Test failed:', error);
      setTestResults([`❌ Test failed: ${error}`]);
    } finally {
      console.log = originalLog;
      setIsRunning(false);
    }
  };


  const simulateUserActions = () => {
    // Simulate user earning points through various actions
    const actions = [
      { name: 'Signup', points: 50 },
      { name: 'Face Analysis', points: 50 },
      { name: 'Body Analysis', points: 50 },
      { name: 'Personality Analysis', points: 50 },
      { name: 'Onboarding Complete', points: 50 },
      { name: 'Daily Login', points: 10 },
      { name: 'Friend Referral', points: 150 },
      { name: 'Product Review', points: 50 }
    ];

    let currentPoints = userData.points;
    actions.forEach((action, index) => {
      setTimeout(() => {
        currentPoints += action.points;
        setUserData(prev => ({
          ...prev,
          points: currentPoints,
          total_referrals: action.name === 'Friend Referral' ? 1 : prev.total_referrals
        }));
      }, index * 500);
    });
  };


  return (
    <div className="min-h-screen bg-[#251F1E] text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Points System Test Suite</h1>
          <p className="text-gray-300">Test and demonstrate the AuraSync points and rewards system</p>
        </div>

        {/* Test Controls */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6">
            <h2 className="text-2xl font-semibold mb-4 flex items-center">
              <Zap className="w-6 h-6 mr-2 text-yellow-400" />
              System Tests
            </h2>
            <p className="text-gray-300 mb-4">
              Run comprehensive tests to verify the points system functionality
            </p>
            <button
              onClick={runTests}
              disabled={isRunning}
              className="w-full bg-yellow-500/20 text-yellow-400 py-3 rounded-lg font-semibold hover:bg-yellow-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isRunning ? (
                <>
                  <div className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
                  Running Tests...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Run Tests
                </>
              )}
            </button>
          </div>



          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6">
            <h2 className="text-2xl font-semibold mb-4 flex items-center">
              <Star className="w-6 h-6 mr-2 text-blue-400" />
              Simulate Actions
            </h2>
            <p className="text-gray-300 mb-4">
              Simulate user actions to see points being earned in real-time
            </p>
            <button
              onClick={simulateUserActions}
              className="w-full bg-blue-500/20 text-blue-400 py-3 rounded-lg font-semibold hover:bg-blue-500/30 transition-all flex items-center justify-center gap-2"
            >
              <Star className="w-4 h-4" />
              Simulate User Journey
            </button>
          </div>
        </div>

        {/* Points Display */}
        <div className="mb-8">
          <PointsDisplay 
            userData={userData} 
            onPointsUpdate={setUserData}
            showRewards={true}
            onCalendarGenerate={() => {
              // Add some points for testing calendar access
              const newUserData = { ...userData, points: userData.points + 500 };
              setUserData(newUserData);
              alert('Added 500 coins for testing calendar access!');
            }}
          />
        </div>

        {/* Test Results */}
        {testResults.length > 0 && (
          <div className="mb-8 bg-white/10 backdrop-blur-lg rounded-xl p-6">
            <h2 className="text-2xl font-semibold mb-4 flex items-center">
              <CheckCircle className="w-6 h-6 mr-2 text-green-400" />
              Test Results
            </h2>
            <div className="bg-black/20 rounded-lg p-4 max-h-96 overflow-y-auto">
              <pre className="text-sm text-gray-300 whitespace-pre-wrap">
                {testResults.join('\n')}
              </pre>
            </div>
          </div>
        )}

        {/* System Components Demo */}
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h2 className="text-2xl font-semibold mb-4 flex items-center">
              <Users className="w-6 h-6 mr-2 text-purple-400" />
              Referral System
            </h2>
            <ReferralSystem 
              userData={userData} 
              onPointsUpdate={setUserData}
            />
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-4 flex items-center">
              <Gift className="w-6 h-6 mr-2 text-blue-400" />
              Review System
            </h2>
            <ReviewSystem 
              userData={userData} 
              onPointsUpdate={setUserData}
              productName="Test Product"
              productId="test-product"
            />
          </div>
        </div>

        {/* Points Actions Demo */}
        <div className="mt-8 bg-white/10 backdrop-blur-lg rounded-xl p-6">
          <h2 className="text-2xl font-semibold mb-4 flex items-center">
            <Coins className="w-6 h-6 mr-2 text-yellow-400" />
            Points Actions Demo
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { name: 'Signup', points: 50, icon: '🎉' },
              { name: 'Analysis', points: 50, icon: '🔬' },
              { name: 'Daily Login', points: 10, icon: '📅' },
              { name: 'Referral', points: 150, icon: '👥' },
              { name: 'Review', points: 50, icon: '⭐' },
              { name: 'Onboarding', points: 50, icon: '✅' }
            ].map((action, index) => (
              <motion.div
                key={index}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-white/5 rounded-lg p-4 text-center cursor-pointer hover:bg-white/10 transition-all"
                onClick={() => {
                  setUserData(prev => ({
                    ...prev,
                    points: prev.points + action.points
                  }));
                }}
              >
                <div className="text-2xl mb-2">{action.icon}</div>
                <div className="font-semibold text-white">{action.name}</div>
                <div className="text-sm text-yellow-400">+{action.points} coins</div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
