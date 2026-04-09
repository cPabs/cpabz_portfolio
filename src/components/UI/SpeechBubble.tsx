'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface SpeechBubbleProps {
  text: string | null;
  visible: boolean;
}

export default function SpeechBubble({ text, visible }: SpeechBubbleProps) {
  return (
    <AnimatePresence mode="wait">
      {visible && text && (
        <motion.div
          key={text}
          className="fixed bottom-[15%] sm:bottom-[12%] left-1/2 z-40 pointer-events-none"
          initial={{ opacity: 0, scale: 0.8, x: '-50%', y: 10 }}
          animate={{ opacity: 1, scale: 1, x: '-50%', y: 0 }}
          exit={{ opacity: 0, scale: 0.9, x: '-50%', y: -5 }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 20,
            mass: 0.8,
          }}
        >
          <div className="relative px-5 py-3 sm:px-6 sm:py-3.5 rounded-2xl bg-slate-900/85 backdrop-blur-sm border border-slate-700/30 shadow-lg shadow-black/20">
            {/* Speech pointer */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-slate-900/85 border-b border-r border-slate-700/30 rotate-45" />

            <p className="text-slate-300 text-sm sm:text-base font-light tracking-wide lowercase whitespace-nowrap">
              {text}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
