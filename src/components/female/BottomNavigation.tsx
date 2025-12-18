"use client";

import { Home, Search, User, UserCircle } from "lucide-react";
import Image from "next/image";
import HairIcon from '@/app/assets/iconHair.png'
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CiSquarePlus } from "react-icons/ci";
import { RewardModal } from "../RewardModal";
import { useState, useEffect } from "react";
import { getUserData } from "@/lib/userState";
import { supabase } from "@/lib/supabase";

export default function BottomNavigation() {
  const pathname = usePathname();
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      // Get user data from localStorage
      const localUserData = getUserData();
      
      if (localUserData?.user_id) {
        // Fetch latest data from Supabase
        const { data: supabaseData, error } = await supabase
          .from('user')
          .select('*')
          .eq('user_id', localUserData.user_id)
          .single();

        if (!error && supabaseData) {
          setUserData({
            ...localUserData,
            points: supabaseData.points,
            onboarding_completed: supabaseData.onboarding_completed,
            face_shape: supabaseData.face_shape,
            body_shape: supabaseData.body_shape,
            skin_tone: supabaseData.skin_tone,
            personality: supabaseData.personality,
            total_referrals: supabaseData.total_referrals,
            last_login_date: supabaseData.last_login_date,
            user_id: supabaseData.user_id
          });
        } else {
          setUserData(localUserData);
        }
      } else {
        setUserData(localUserData);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      setUserData(getUserData());
    } finally {
      setLoading(false);
    }
  };

  const handlePointsUpdate = async (newUserData: any) => {
    setUserData(newUserData);
    // Optionally update localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('auraasync_user_data', JSON.stringify(newUserData));
    }
    
    // Refresh user data from Supabase to ensure consistency
    setTimeout(() => {
      loadUserData();
    }, 500);
  };


  const isActive = (path: string) => {
    if (!pathname) return false;
    if (path === '/female' && pathname === '/female') return true;
    if (path !== '/female' && pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <nav className="fixed bottom-10 rounded-[35px] left-1/2 transform -translate-x-1/2  w-[70vw] md:w-[30vw] z-50 bg-neutral-800 text-white border-t border-gray-600">
      <div className="flex items-center justify-around px-4 py-5">
        {/* Home */}
        <Link 
          href="/female" 
          className={`flex flex-col items-center space-y-1 transition-colors ${
            isActive('/female') ? 'text-blue-400' : 'text-white hover:text-blue-400'
          }`}
        >
          <Home className="h-8 w-8" />
          {/* <span className="text-xs">Home</span> */}
        </Link>

        {/* Dashboard */}
        <Link 
          href="/dashboard" 
          className={`flex flex-col items-center space-y-1 transition-colors ${
            isActive('/dashboard') ? 'text-blue-400' : 'text-white hover:text-blue-400'
          }`}
        >
          <UserCircle className="h-8 w-8" />
          {/* <span className="text-xs">Dashboard</span> */}
        </Link>

{/* Reward Modal Trigger */}
        <button
          type="button"
          onClick={() => setShowRewardModal(true)}
          className={`flex flex-col items-center space-y-1 transition-colors ${
            isActive("/dashboard") ? "text-blue-400" : "text-white hover:text-blue-400"
          }`}
        >
          <CiSquarePlus className="h-8 w-8" />
        </button>


        {/* Search */}
        <Link 
          href="/search" 
          className={`flex flex-col items-center space-y-1 transition-colors ${
            isActive('/search') ? 'text-blue-400' : 'text-white hover:text-blue-400'
          }`}
        >
          <Search className="h-8 w-8" />
          {/* <span className="text-xs">Search</span> */}
        </Link>

        {/* Hairstyle */}
        <Link 
          href="/hairstyle" 
          className={`flex flex-col items-center space-y-1 transition-colors ${
            isActive('/hairstyle') ? 'text-blue-400' : 'text-white hover:text-blue-400'
          }`}
        >
          <Image src={HairIcon} width={24} height={24} alt="hair icon" className="h-6 w-6"/>
          {/* <span className="text-xs">Hairstyle</span> */}
        </Link>

        {/* Profile - Removed */}
        {/* <Link 
          href="/profile" 
          className={`flex flex-col items-center space-y-1 transition-colors ${
            isActive('/profile') ? 'text-blue-400' : 'text-white hover:text-blue-400'
          }`}
        >
          <User className="h-6 w-6" />
          <span className="text-xs">Profile</span>
        </Link> */}
      </div>
{/* Reward Modal */}
      {showRewardModal && userData && (
        <RewardModal 
          onClose={() => {
            setShowRewardModal(false)
            // Refresh data after modal closes
            setTimeout(() => {
              loadUserData()
            }, 300)
          }} 
          userData={userData}
          onPointsUpdate={handlePointsUpdate}
        />
      )}

    </nav>
  );
}
