'use client';

import dynamic from 'next/dynamic';

const CoinToWalletFX = dynamic(() => import('./CoinToWalletFX'), { 
  ssr: false 
});

export default function CoinToWalletFXClient() {
  return <CoinToWalletFX />;
}

