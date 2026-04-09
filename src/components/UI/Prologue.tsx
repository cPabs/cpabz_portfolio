'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PrologueProps {
  onComplete: () => void;
}

export default function Prologue({ onComplete }: PrologueProps) {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  const handleClick = () => {
    if (fading) return;
    setFading(true);
    setTimeout(() => {
      setVisible(false);
      onComplete();
    }, 1200);
  };

  if (!visible) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0a0f] cursor-pointer select-none"
          onClick={handleClick}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
        >
          <motion.div
            className="text-center px-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: fading ? 0 : 1 }}
            transition={{ duration: fading ? 0.8 : 2, delay: fading ? 0 : 1 }}
          >
            <motion.p
              className="text-slate-400 text-sm sm:text-base tracking-[0.3em] font-light lowercase"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: fading ? 0 : 0.7, y: 0 }}
              transition={{ duration: 1.5, delay: fading ? 0 : 1.5 }}
            >
              audio on. trust the experience.
            </motion.p>

            <motion.div
              className="mt-8 flex justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: fading ? 0 : 0.4 }}
              transition={{ duration: 1, delay: fading ? 0 : 2.5 }}
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border border-slate-600/40 flex items-center justify-center">
                <motion.div
                  animate={{ scale: [1, 1.15, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-slate-500">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.536 8.464a5 5 0 010 7.072M12 6v12m0-12l-4 4h-2a1 1 0 00-1 1v2a1 1 0 001 1h2l4 4V6z" />
                  </svg>
                </motion.div>
              </div>
            </motion.div>

            <motion.p
              className="mt-6 text-slate-600 text-xs tracking-wider"
              initial={{ opacity: 0 }}
              animate={{ opacity: fading ? 0 : 0.3 }}
              transition={{ duration: 1, delay: fading ? 0 : 3 }}
            >
              tap anywhere to begin
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
