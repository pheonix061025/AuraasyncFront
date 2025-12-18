'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Star, ThumbsUp, MessageSquare, Award } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { awardReviewPoints } from '@/lib/pointsSystem';

interface ReviewSystemProps {
  userData: any;
  onPointsUpdate?: (newUserData: any) => void;
  productName?: string;
  productId?: string;
}

export default function ReviewSystem({ 
  userData, 
  onPointsUpdate, 
  productName = "Product",
  productId = "product-1"
}: ReviewSystemProps) {
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0 || !review.trim()) return;

    setIsSubmitting(true);
    
    try {
      // Award review points
      const result = awardReviewPoints(userData, productName);
      
      // Save review to Supabase
      const { error: reviewError } = await supabase
        .from('reviews')
        .insert({
          user_id: userData.user_id,
          product_id: productId,
          product_name: productName,
          review_text: review,
          rating: rating,
          points_awarded: result.transaction.points
        });

      if (reviewError) {
        console.error('Error saving review:', reviewError);
        alert('Failed to save review. Please try again.');
        return;
      }

      // Save points transaction to Supabase
      const { error: transactionError } = await supabase
        .from('points_transactions')
        .insert({
          user_id: userData.user_id,
          action: result.transaction.action,
          points: result.transaction.points,
          description: result.transaction.description
        });

      if (transactionError) {
        console.error('Error saving review transaction:', transactionError);
        alert('Failed to save transaction. Please try again.');
        return;
      }

      // Update user points in Supabase
      // First, check if user exists and get current points
      let currentUser;
      const { data: userFromDB, error: fetchError } = await supabase
        .from('user')
        .select('points, user_id')
        .eq('user_id', userData.user_id)
        .single();

      if (fetchError) {
        console.error('Error fetching current user points:', fetchError);
        console.error('User lookup failed for user_id:', userData.user_id);
        
        // Try to find user by email as fallback
        const { data: userByEmail, error: emailError } = await supabase
          .from('user')
          .select('points, user_id')
          .eq('email', userData.email)
          .single();
          
        if (emailError) {
          console.error('Error fetching user by email:', emailError);
          alert(`Failed to find user in database. Please try again. Error: ${fetchError.message}`);
          return;
        }
        
        // Update userData with correct user_id
        userData.user_id = userByEmail.user_id;
        currentUser = userByEmail;
      } else {
        currentUser = userFromDB;
      }

      const newPoints = (currentUser.points || 0) + result.transaction.points;
      
      const { error: updateError } = await supabase
        .from('user')
        .update({ 
          points: newPoints,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userData.user_id);

      if (updateError) {
        console.error('Error updating user points:', updateError);
        console.error('Update query details:', {
          user_id: userData.user_id,
          points_increment: result.transaction.points,
          error_details: updateError
        });
        alert(`Failed to update points: ${updateError.message}. Please try again.`);
        return;
      }

      onPointsUpdate?.(result.userData);
      setSubmitted(true);
      alert(`Review submitted! You earned ${result.transaction.points} coins for your review.`);
    } catch (error) {
      console.error('Review submission failed:', error);
      alert('Failed to submit review. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 backdrop-blur-lg rounded-xl p-6 border border-green-500/30"
      >
        <div className="text-center">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Award className="w-8 h-8 text-green-400" />
          </div>
          <h3 className="text-xl font-bold text-green-400 mb-2">Review Submitted!</h3>
          <p className="text-gray-300 mb-4">
            Thank you for your feedback. You earned 50 coins for writing a review!
          </p>
          <button
            onClick={() => {
              setSubmitted(false);
              setRating(0);
              setReview('');
            }}
            className="px-4 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-all"
          >
            Write Another Review
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 backdrop-blur-lg rounded-xl p-4 md:p-6 border border-blue-500/30">
      <div className="flex items-center gap-3 mb-4 md:mb-6">
        <div className="p-2 bg-blue-500/20 rounded-lg">
          <MessageSquare className="w-5 h-5 md:w-6 md:h-6 text-blue-400" />
        </div>
        <div>
          <h3 className="text-lg md:text-xl font-bold text-blue-400">Write a Review</h3>
          <p className="text-gray-300 text-xs md:text-sm">Earn 50 coins for sharing your experience</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
        {/* Product Info */}
        <div className="bg-white/5 rounded-lg p-3 md:p-4">
          <h4 className="font-semibold text-white mb-2 text-sm md:text-base">{productName}</h4>
          <p className="text-xs md:text-sm text-gray-400">Share your experience with this product</p>
        </div>

        {/* Rating */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-3">
            Rate this product
          </label>
          <div className="flex gap-1 md:gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className={`p-1.5 md:p-2 rounded-lg transition-all ${
                  star <= rating
                    ? 'bg-yellow-500/20 text-yellow-400'
                    : 'bg-white/10 text-gray-400 hover:bg-white/20'
                }`}
              >
                <Star className="w-4 h-4 md:w-6 md:h-6" />
              </button>
            ))}
          </div>
          {rating > 0 && (
            <p className="text-sm text-gray-400 mt-2">
              {rating === 1 && "Poor"}
              {rating === 2 && "Fair"}
              {rating === 3 && "Good"}
              {rating === 4 && "Very Good"}
              {rating === 5 && "Excellent"}
            </p>
          )}
        </div>

        {/* Review Text */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-3">
            Write your review
          </label>
          <textarea
            value={review}
            onChange={(e) => setReview(e.target.value)}
            placeholder="Share your thoughts about this product..."
            className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 resize-none"
            rows={4}
            required
          />
          <div className="flex justify-between items-center mt-2">
            <span className="text-xs text-gray-400">
              {review.length}/500 characters
            </span>
            <span className="text-xs text-blue-400">
              +50 coins reward
            </span>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting || rating === 0 || !review.trim()}
          className="w-full bg-blue-500/20 text-blue-400 py-3 rounded-lg font-semibold hover:bg-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <ThumbsUp className="w-4 h-4" />
              Submit Review (+50 coins)
            </>
          )}
        </button>
      </form>

      {/* Review Guidelines */}
      <div className="mt-6 p-4 bg-white/5 rounded-lg">
        <h4 className="font-semibold text-white mb-2">Review Guidelines</h4>
        <ul className="text-sm text-gray-400 space-y-1">
          <li>• Be honest and constructive in your feedback</li>
          <li>• Focus on the product&apos;s quality and your experience</li>
          <li>• Avoid personal attacks or inappropriate content</li>
          <li>• Your review helps other users make informed decisions</li>
        </ul>
      </div>
    </div>
  );
}
