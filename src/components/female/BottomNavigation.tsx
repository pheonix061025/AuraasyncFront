"use client";

import { Home, Search, UserCircle } from "lucide-react";
import { CiSquarePlus } from "react-icons/ci";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import HairIcon from "@/app/assets/iconHair.png";
import { Dock, DockIcon } from "../ui/dock";
import { RewardModal } from "../RewardModal";
import { getUserData } from "@/lib/userState";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

export default function BottomNavigation() {
  const pathname = usePathname();
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    const localUser = getUserData();
    if (!localUser?.user_id) {
      setUserData(localUser);
      return;
    }

    const { data } = await supabase
      .from("user")
      .select("*")
      .eq("user_id", localUser.user_id)
      .single();

    setUserData({ ...localUser, ...data });
  };

  const isActive = (path: string) =>
    pathname === path || pathname.startsWith(path + "/");

  const iconClass = (active: boolean) =>
    cn(
      "flex items-center justify-center transition-all",
      active
        ? "text-pink-400 drop-shadow-[0_0_10px_rgba(236,72,153,0.9)]"
        : "text-white/70 hover:text-white"
    );

  return (
    <nav className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2">
      <Dock
        iconSize={40}
        iconMagnification={56}
        iconDistance={120}
        className="bg-black/40 border border-white/10 backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.45)]"
      >
        {/* Home */}
        <DockIcon>
          <Link href="/female" className={iconClass(isActive("/female"))}>
            <Home className="h-7 w-7" />
          </Link>
        </DockIcon>

        {/* Dashboard */}
        <DockIcon>
          <Link
            href="/dashboard"
            className={iconClass(isActive("/dashboard"))}
          >
            <UserCircle className="h-7 w-7" />
          </Link>
        </DockIcon>

        {/* Reward */}
        <DockIcon>
          <button
            onClick={() => setShowRewardModal(true)}
            className={iconClass(false)}
          >
            <CiSquarePlus className="h-8 w-8" />
          </button>
        </DockIcon>

        {/* Search */}
        <DockIcon>
          <Link href="/search" className={iconClass(isActive("/search"))}>
            <Search className="h-7 w-7" />
          </Link>
        </DockIcon>

        {/* Hairstyle */}
        <DockIcon>
          <Link
            href="/hairstyle"
            className={iconClass(isActive("/hairstyle"))}
          >
            <Image
              src={HairIcon}
              alt="Hair"
              width={32}
              height={32}
              unoptimized
              className="pointer-events-none"
            />
          </Link>
        </DockIcon>
      </Dock>

      {showRewardModal && userData && (
        <RewardModal
          userData={userData}
          onClose={() => setShowRewardModal(false)}
          onPointsUpdate={setUserData}
        />
      )}
    </nav>
  );
}
