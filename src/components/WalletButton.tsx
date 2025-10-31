'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, X } from 'lucide-react';
import PointsDisplay from './PointsDisplay';
import { getUserData } from '@/lib/userState';
import { supabase } from '@/lib/supabase';

export default function WalletButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Fetch user data on mount
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Get from localStorage first
        const localData = getUserData();
        console.log('WalletButton - Local data:', localData);
        
        if (localData?.user_id || localData?.email) {
          setUserData(localData); // Set immediately from localStorage
          
          if (localData.user_id) {
            // Fetch latest data from Supabase
            const { data, error } = await supabase
              .from('user')
              .select('*')
              .eq('user_id', localData.user_id)
              .single();
              
            console.log('WalletButton - Supabase data:', data, 'Error:', error);
            
            if (!error && data) {
              setUserData({
                ...localData,
                points: data.points,
                user_id: data.user_id
              });
            }
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUserData();
  }, []); // Run on mount

  // Refresh data when modal opens
  useEffect(() => {
    const refreshData = async () => {
      if (!isOpen) return;
      
      setLoading(true);
      try {
        const localData = getUserData();
        
        if (localData?.user_id) {
          const { data, error } = await supabase
            .from('user')
            .select('*')
            .eq('user_id', localData.user_id)
            .single();
            
          if (!error && data) {
            setUserData({
              ...localData,
              points: data.points,
              user_id: data.user_id
            });
          }
        }
      } catch (error) {
        console.error('Error refreshing wallet data:', error);
      } finally {
        setLoading(false);
      }
    };

    refreshData();
  }, [isOpen]);

  const handlePointsUpdate = (newUserData: any) => {
    setUserData(newUserData);
    // Update localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('aurasync_user_data', JSON.stringify(newUserData));
    }
  };

  // Always show the button, even if userData is null
  return (
    <>
      {/* Floating Wallet Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-4 right-4 z-40 bg-white/10 backdrop-blur-lg rounded-full p-3 hover:bg-white/20 transition-all border border-white/20 shadow-lg hover:scale-110"
        id="wallet-anchor"
        title="Wallet"
      >
        <Wallet className="w-6 h-6 text-white" />
        {userData && (
          <span className="absolute -top-1 -right-1 bg-yellow-500 text-black text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {userData.points || 0}
          </span>
        )}
      </button>

      {/* Wallet Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-[#251F1E] rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-white/20"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/10 rounded-lg">
                    <Wallet className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Wallet</h2>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Points Display Component */}
              {loading ? (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-gray-400">Loading wallet data...</p>
                </div>
              ) : userData ? (
                <PointsDisplay 
                  userData={userData} 
                  onPointsUpdate={handlePointsUpdate}
                  showRewards={true}
                />
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-400">Please log in to view your wallet</p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

