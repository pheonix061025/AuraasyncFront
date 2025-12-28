'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, X, Zap, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { FaCoins } from 'react-icons/fa6';
import Image from 'next/image';
import PointsDisplay from './PointsDisplay';
import SecurePointsDisplay from './SecurePointsDisplay';
import { getUserData } from '@/lib/userState';
import { useSecurePoints, usePointsDisplay } from '@/hooks/useSecurePoints';

declare global {
  interface Window {
    Razorpay: any;
  }
}

const coinPackages = [
  { id: 1, coins: 100, price: 19, badge: "SAVE 10%" },
  { id: 2, coins: 310, price: 39, badge: "POPULAR" },
  { id: 3, coins: 750, price: 99, badge: "SAVE 15%" },
  { id: 4, coins: 1200, price: 199, badge: "BEST DEAL" },
  { id: 5, coins: 2400, price: 399, badge: "PREMIUM" },
  { id: 6, coins: 5000, price: 999, badge: "ULTIMATE" },
];

export default function WalletButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [paymentError, setPaymentError] = useState('');
  
  // Use the secure points hook
  const { points, isLoading: pointsLoading, error: pointsError, refreshPoints } = useSecurePoints();

  // Fetch user data on mount
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Get from localStorage (points are excluded from localStorage now)
        const localData = getUserData();
        
        if (localData?.user_id || localData?.email) {
          setUserData(localData); // Set immediately from localStorage
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUserData();

    // Load Razorpay script
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  // Refresh points when wallet opens
  useEffect(() => {
    if (isOpen) {
      refreshPoints();
    }
  }, [isOpen, refreshPoints]);

  // Handle user data updates (without localStorage)
  const handlePointsUpdate = (newUserData: any) => {
    // Only update component state, never store to localStorage
    setUserData(newUserData);
  };

  // Handle payment initiation
  const handleBuyCoins = async (pkg: typeof coinPackages[0]) => {
    if (!userData?.user_id) {
      setPaymentError('Please log in to make a purchase');
      setPaymentStatus('error');
      setTimeout(() => setPaymentStatus('idle'), 3000);
      return;
    }

    try {
      setProcessingPayment(true);
      setPaymentStatus('processing');
      setPaymentError('');

      // Create order from backend
      const orderResponse = await fetch('/api/wallet/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userData.user_id,
          amount: pkg.price,
          coins: pkg.coins,
        }),
      });

      if (!orderResponse.ok) {
        const error = await orderResponse.json();
        throw new Error(error.error || 'Failed to create order');
      }

      const orderData = await orderResponse.json();

      // Open Razorpay checkout
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.amount * 100, // Amount in paise
        currency: 'INR',
        name: 'AuraaSync',
        description: `Buy ${pkg.coins} Coins`,
        image: '/favicon.ico',
        order_id: orderData.orderId,
        handler: async (response: any) => {
          try {
            setPaymentStatus('processing');

            // Verify payment on backend
            const verifyResponse = await fetch('/api/wallet/verify-payment', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                userId: userData.user_id,
              }),
            });

            if (!verifyResponse.ok) {
              const error = await verifyResponse.json();
              throw new Error(error.error || 'Payment verification failed');
            }

            const verifyData = await verifyResponse.json();

            // Payment successful
            setPaymentStatus('success');
            refreshPoints(); // Refresh wallet balance
            
            // Close modal after 2 seconds
            setTimeout(() => {
              setIsOpen(false);
              setPaymentStatus('idle');
            }, 2000);
          } catch (error) {
            console.error('Payment verification error:', error);
            setPaymentError((error as Error).message || 'Payment verification failed');
            setPaymentStatus('error');
            setTimeout(() => setPaymentStatus('idle'), 3000);
          }
        },
        prefill: {
          email: userData?.email || '',
          contact: userData?.phone || '',
        },
        theme: {
          color: '#1a1414',
        },
        modal: {
          ondismiss: () => {
            setProcessingPayment(false);
            setPaymentStatus('idle');
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error('Payment initiation error:', error);
      setPaymentError((error as Error).message || 'Failed to initiate payment');
      setPaymentStatus('error');
      setTimeout(() => setPaymentStatus('idle'), 3000);
    } finally {
      setProcessingPayment(false);
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
        {!pointsLoading && points !== null && (
          <span className="absolute -top-3 -right-4 bg-yellow-500 text-black text-xs font-bold rounded-full w-15 p-2 h-5 flex items-center justify-center">
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
              className="bg-gradient-to-b from-[#1a1a1a] to-[#0f0f0f] rounded-3xl max-w-6xl w-full max-h-[90vh] overflow-y-auto border border-white/10 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header with Balance */}
              <div className="relative h-64 md:h-80 overflow-hidden rounded-t-3xl">
                {/* Banner Image Background */}
                <Image
                  src="/walletBack.png"
                  alt="Wallet Banner"
                  fill
                  className="object-cover"
                  priority
                />
                
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0f0f0f]" />
                
                {/* Close Button */}
                <button
                  onClick={() => setIsOpen(false)}
                  className="absolute top-4 right-4 z-20 text-white hover:text-gray-300 transition-colors bg-black/50 rounded-full p-2 hover:bg-black/70"
                >
                  <X className="w-6 h-6" />
                </button>

                {/* Content Overlay */}
                <div className="absolute inset-0 flex flex-col justify-between p-8">
                  <div>
                    <h2 className="text-3xl md:text-[4rem] font-bold text-center text-white mb-2">AuraaSync Coins</h2>
                    <p className="text-gray-200 mb-4 md:text-[1rem] text-center mt-3">Top-Up Instantly</p>
                  </div>

                  {/* Wallet Balance Display */}
                  {!pointsLoading && (
                    <div className="flex items-center gap-4 bg-[#0A0A0A]/80 backdrop-blur-lg rounded-2xl p-4 border border-white/20 w-fit">
                      <div className="flex items-center gap-2">
                        <div className="text-2xl"></div>
                        <div>
                          <p className="text-gray-300 text-xs">WALLET BALANCE</p>
                          <p className="text-white text-2xl font-bold">{points?.toLocaleString() || 0}</p>
                        </div>
                      </div>
                      <div className="h-12 w-px bg-white/10"></div>
                      <button className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm font-semibold transition-all">
                        + MORE
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Coin Packages Grid */}
              <div className="p-8">
                <div className="mb-12 text-center">
                  <h3 className="text-xl font-bold text-white mb-2 flex items-center justify-center gap-2">
                   
                    Available Packages
                  </h3>
                  <p className="text-gray-400 text-sm">RECHARGE NOW - UNLOCK EXCLUSIVE AI FASHION REWARDS</p>
                </div>

                {/* Payment Status Messages */}
                {paymentStatus === 'success' && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 flex items-center gap-3 bg-green-500/20 border border-green-500/50 rounded-lg p-4 text-green-300"
                  >
                    <CheckCircle className="w-5 h-5" />
                    <p>Payment successful! Coins added to your wallet.</p>
                  </motion.div>
                )}

                {paymentStatus === 'error' && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 flex items-center gap-3 bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-300"
                  >
                    <AlertCircle className="w-5 h-5" />
                    <p>{paymentError || 'Payment failed. Please try again.'}</p>
                  </motion.div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-[90%] mx-auto">
                  {coinPackages.map((pkg) => (
                    <motion.div
                      key={pkg.id}
                      whileHover={{ scale: 1.05 }}
                      className="relative"
                    >
                      {/* Card with rounded corners */}
                      <div className="rounded-3xl relative p-6 bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border border-white/10 hover:border-white/30 transition-all shadow-lg overflow-hidden">
                        {/* Top section - Badge area */}
                        <div className="mb-6 absolute top-2 left-0">
                          <span className="inline-block px-4 py-2 rounded-r-full text-xs font-bold text-black bg-gradient-to-r from-white to-gray-200 shadow-md">
                            {pkg.badge}
                          </span>
                        </div>

                        {/* Center section - Coin icon and amount */}
                        <div className="text-center mb-6">
                          <div className="text-5xl mb-2 text-[#fff01f]">
                            <FaCoins className="w-12 h-12 mx-auto" />
                          </div>
                          <div className="text-3xl font-bold text-white mb-1">{pkg.coins}</div>
                          <p className="text-gray-400 text-sm font-medium">Coins</p>
                        </div>

                        {/* Price section */}
                        {/* Button */}
                        <button
                          onClick={() => handleBuyCoins(pkg)}
                          disabled={processingPayment}
                          className="w-full py-3 rounded-full font-bold text-black bg-white hover:bg-gray-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {processingPayment ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              BUY NOW - ₹{pkg.price}
                            </>
                          )}
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Privacy Policy Section */}
              <div className="border-t border-white/5 p-8 bg-[#0A0A0A]/50">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-white">🔒</span>
                  Privacy & Security
                </h3>
                <div className="space-y-3 text-sm text-gray-300">
                  <div className="flex gap-3">
                    <span className="text-white mt-1">•</span>
                    <p>All transactions are encrypted and secured using industry-standard protocols. Your payment information is never stored on our servers.</p>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-white mt-1">•</span>
                    <p>Coins are instantly delivered to your account and never expire. You own your coins forever and can use them anytime.</p>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-white mt-1">•</span>
                    <p>By purchasing coins, you agree to our Terms of Service. Refunds cannot be issued for purchased coins except where required by law.</p>
                  </div>
                </div>
              </div>
              
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

