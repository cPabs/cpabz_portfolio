'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface AmbientTextProps {
  phase: number; // 0=none, 1="it got… loud.", 2="everything kept moving.", 3="i stopped."
  activated: boolean;
}

const texts: Record<number, string> = {
  1: 'it got… loud.',
  2: 'everything kept moving.',
  3: 'i stopped.',
};

export default function AmbientText({ phase, activated }: AmbientTextProps) {
  if (activated) return null;
  const text = texts[phase];

  return (
    <div className="fixed inset-0 pointer-events-none z-10 flex items-center">
      <AnimatePresence mode="wait">
        {text && (
          <motion.p
            key={phase}
            className="ml-[8vw] sm:ml-[12vw] text-slate-500/50 text-sm sm:text-base tracking-[0.2em] font-light lowercase select-none"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 0.5, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 1, ease: 'easeOut' }}
          >
            {text}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
