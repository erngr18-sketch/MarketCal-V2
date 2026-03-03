'use client';

import { useEffect, type ReactNode } from 'react';

type TextShimmerProps = {
  children: ReactNode;
  className?: string;
  duration?: number;
};

const KEYFRAME_ID = 'text-shimmer-keyframes';

export function TextShimmer({ children, className = '', duration = 1.1 }: TextShimmerProps) {
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (document.getElementById(KEYFRAME_ID)) return;

    const style = document.createElement('style');
    style.id = KEYFRAME_ID;
    style.textContent = `
      @keyframes text-shimmer-keyframes {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
    `;
    document.head.appendChild(style);
  }, []);

  return (
    <span
      className={`inline-block bg-[linear-gradient(110deg,#64748b,40%,#cbd5e1,50%,#64748b,60%)] bg-[length:200%_100%] bg-clip-text text-transparent ${className}`}
      style={{
        animationName: 'text-shimmer-keyframes',
        animationDuration: `${duration}s`,
        animationTimingFunction: 'linear',
        animationIterationCount: 'infinite'
      }}
    >
      {children}
    </span>
  );
}
