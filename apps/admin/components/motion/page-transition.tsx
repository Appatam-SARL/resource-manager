'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

type PageTransitionProps = {
  children: ReactNode;
  className?: string;
};

export function PageTransition({ children, className }: PageTransitionProps) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        className={className}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
