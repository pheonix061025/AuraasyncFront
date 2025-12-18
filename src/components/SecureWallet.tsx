'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, X, RefreshCw } from 'lucide-react';
import { useSecurePoints } from '@/hooks/useSecurePoints';

export default function SecureWallet() {
  const [isOpen, setIsOpen] = useState(false);
  const { points, isLoading, error, refreshPoints } = useSecurePoints();

  return (
    <>
      {/* Floating Wallet Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-4 right-4 z-40 bg-white/10 backdrop-blur-lg rounded-full p-3 hover:bg-white/20 transition-all border border-white/20 shadow-lg hover:scale-110"
        title="Wallet"
      >
        <Wallet className="w-6 h-6 text-white" />
        {!isLoading && points !== null && (
          <span className="absolute -top-1 -right-1 bg-yellow-500 text-black text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {points}
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
              className="bg-[#251F1E] rounded-2xl p-6 max-w-md w-full border border-white/20"
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

              {/* Points Display */}
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Your Points</h3>
                  <button
                    onClick={refreshPoints}
                    disabled={isLoading}
                    className="text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                    title="Refresh points"
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {isLoading ? (
                  <div className="text-center py-4">
                    <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-gray-400 text-sm">Loading points...</p>
                  </div>
                ) : error ? (
                  <div className="text-center py-4">
                    <p className="text-red-400 text-sm mb-2">{error}</p>
                    <button 
                      onClick={refreshPoints}
                      className="text-blue-400 text-sm hover:underline"
                    >
                      Try Again
                    </button>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="text-4xl font-bold text-yellow-400 mb-2">
                      {points?.toLocaleString() || '0'}
                    </div>
                    <p className="text-gray-400 text-sm">Available Points</p>
                    
                    {points > 0 && (
                      <div className="mt-4 p-3 bg-green-900/20 border border-green-700 rounded">
                        <p className="text-green-400 text-sm">
                          🎉 You have points to spend!
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="mt-6 space-y-3">
                <div className="text-sm text-gray-400 mb-2">Quick Actions</div>
                <button 
                  className="w-full p-3 bg-white/10 rounded-lg text-white hover:bg-white/20 transition-colors text-sm"
                  disabled
                >
                  🏪 Store (Coming Soon)
                </button>
                <button 
                  className="w-full p-3 bg-white/10 rounded-lg text-white hover:bg-white/20 transition-colors text-sm"
                  disabled
                >
                  🎁 Rewards (Coming Soon)
                </button>
                <button 
                  className="w-full p-3 bg-white/10 rounded-lg text-white hover:bg-white/20 transition-colors text-sm"
                  disabled
                >
                  📊 Transaction History (Coming Soon)
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
