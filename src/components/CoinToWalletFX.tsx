'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

type CoinEventDetail = {
  count?: number;
  start?: { x: number; y: number };
};

export default function CoinToWalletFX() {
  const [coins, setCoins] = React.useState<Array<{ id: number; start: { x: number; y: number }; end: { x: number; y: number } }>>([]);

  React.useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<CoinEventDetail>).detail || {};
      const count = Math.min(Math.max(detail.count ?? 8, 3), 20);

      const wallet = document.getElementById('wallet-anchor');
      if (!wallet) return;
      const walletRect = wallet.getBoundingClientRect();
      const end = { x: walletRect.left + walletRect.width / 2, y: walletRect.top + walletRect.height / 2 };

      const startBase = detail.start || { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      const newCoins = Array.from({ length: count }).map((_, i) => ({
        id: Date.now() + i,
        start: { x: startBase.x + (Math.random() - 0.5) * 120, y: startBase.y + (Math.random() - 0.5) * 80 },
        end,
      }));
      setCoins((prev) => [...prev, ...newCoins]);

      // Cleanup after animation
      setTimeout(() => {
        setCoins((prev) => prev.slice(newCoins.length));
      }, 1200);
    };

    window.addEventListener('coin:to-wallet', handler as EventListener);
    return () => window.removeEventListener('coin:to-wallet', handler as EventListener);
  }, []);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {coins.map((c) => (
        <motion.div
          key={c.id}
          initial={{ x: c.start.x, y: c.start.y, scale: 0.6, opacity: 0 }}
          animate={{ x: c.end.x, y: c.end.y, scale: 0.2, opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.9, ease: 'easeInOut' }}
          className="pointer-events-none fixed z-[60]"
        >
          <div className="w-6 h-6 rounded-full bg-yellow-400 shadow-[0_0_12px_rgba(250,204,21,0.8)] border border-yellow-300" />
        </motion.div>
      ))}
    </AnimatePresence>,
    document.body
  );
}


