'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';

interface SupabaseDebugProps {
  userData: any;
}

export default function SupabaseDebug({ userData }: SupabaseDebugProps) {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testSupabaseConnection = async () => {
    setLoading(true);
    try {
      console.log('Testing Supabase connection...');
      console.log('User data:', userData);
      
      // Test 1: Check if user exists by user_id
      const { data: userById, error: userByIdError } = await supabase
        .from('user')
        .select('*')
        .eq('user_id', userData?.user_id)
        .single();
      
      console.log('User by ID result:', { userById, userByIdError });
      
      // Test 2: Check if user exists by email
      const { data: userByEmail, error: userByEmailError } = await supabase
        .from('user')
        .select('*')
        .eq('email', userData?.email)
        .single();
      
      console.log('User by email result:', { userByEmail, userByEmailError });
      
      // Test 3: List all users (first 5)
      const { data: allUsers, error: allUsersError } = await supabase
        .from('user')
        .select('user_id, email, points')
        .limit(5);
      
      console.log('All users sample:', { allUsers, allUsersError });
      
      setDebugInfo({
        userById: { data: userById, error: userByIdError },
        userByEmail: { data: userByEmail, error: userByEmailError },
        allUsers: { data: allUsers, error: allUsersError },
        userData: userData
      });
      
    } catch (error) {
      console.error('Debug test failed:', error);
      setDebugInfo({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-yellow-500/10 backdrop-blur-lg rounded-xl p-6 border border-yellow-500/30">
      <h2 className="text-2xl font-semibold mb-4 flex items-center text-yellow-400">
        <span className="mr-2">🐛</span>
        Supabase Debug
      </h2>
      
      <button
        onClick={testSupabaseConnection}
        disabled={loading}
        className="bg-yellow-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-yellow-700 transition-all mb-4"
      >
        {loading ? 'Testing...' : 'Test Supabase Connection'}
      </button>
      
      {debugInfo && (
        <div className="mt-4 p-4 bg-black/20 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Debug Results:</h3>
          <pre className="text-xs text-gray-300 overflow-auto max-h-96">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}



