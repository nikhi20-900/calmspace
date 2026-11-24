import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  distance?: number;
}

/**
 * Lightweight entrance animation using native IntersectionObserver & CSS transforms.
 * Zero external bundle cost (replaces framer-motion).
 * Removes blur filter below the small-screen breakpoint (sm:) to ensure silky mobile performance.
 */
export const ScrollReveal: React.FC<ScrollRevealProps> = ({
  children,
  className = '',
  delay = 0,
  distance = 32,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile, { passive: true });
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) {
      setIsVisible(true);
      return;
    }

    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(element);
        }
      },
      {
        threshold: 0.12,
        rootMargin: '0px 0px -40px 0px',
      }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [prefersReducedMotion]);

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  // Mobile pacing tuning: no blur on mobile, reduced distance and shortened delay
  const activeDistance = isMobile ? Math.min(distance, 18) : distance;
  const activeDelay = isMobile ? delay * 0.35 : delay;
  const activeDuration = isMobile ? 0.42 : 0.65;

  const style: React.CSSProperties = {
    opacity: isVisible ? 1 : 0,
    transform: isVisible ? 'translateY(0)' : `translateY(${activeDistance}px)`,
    filter: isMobile ? 'none' : isVisible ? 'blur(0px)' : 'blur(6px)',
    transitionProperty: isMobile ? 'opacity, transform' : 'opacity, transform, filter',
    transitionDuration: `${activeDuration}s`,
    transitionDelay: `${activeDelay}s`,
    transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
    willChange: isVisible ? 'auto' : 'opacity, transform',
  };

  return (
    <div ref={ref} className={className} style={style}>
      {children}
    </div>
  );
};

interface StaggerContextType {
  isVisible: boolean;
  isMobile: boolean;
  registerItem: () => number;
}

const StaggerContext = createContext<StaggerContextType>({
  isVisible: false,
  isMobile: false,
  registerItem: () => 0,
});

interface ScrollStaggerProps {
  children: React.ReactNode;
  className?: string;
}

/** Coordinates a progressive entrance cascade for cards and tiles. */
export const ScrollStagger: React.FC<ScrollStaggerProps> = ({ children, className = '' }) => {
  const prefersReducedMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const counterRef = useRef(0);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile, { passive: true });
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) {
      setIsVisible(true);
      return;
    }

    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(element);
        }
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -30px 0px',
      }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [prefersReducedMotion]);

  counterRef.current = 0;
  const registerItem = () => {
    const idx = counterRef.current;
    counterRef.current += 1;
    return idx;
  };

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <StaggerContext.Provider value={{ isVisible, isMobile, registerItem }}>
      <div ref={ref} className={className}>
        {children}
      </div>
    </StaggerContext.Provider>
  );
};

interface ScrollStaggerItemProps {
  children: React.ReactNode;
  className?: string;
}

/** Individual staggered card item with tuned mobile delay & zero blur. */
export const ScrollStaggerItem: React.FC<ScrollStaggerItemProps> = ({ children, className = '' }) => {
  const { isVisible, isMobile, registerItem } = useContext(StaggerContext);
  const prefersReducedMotion = useReducedMotion();
  const [itemIndex] = useState(() => registerItem());

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  // Refinement 3: Shorten card delays and remove blur below small-screen breakpoint
  // Mobile: 35ms stagger per card, 16px offset, 0.38s duration, filter: none
  // Desktop: 80ms stagger per card, 24px offset, 0.52s duration
  const staggerDelay = isMobile ? itemIndex * 0.035 : itemIndex * 0.08;
  const distance = isMobile ? 16 : 24;
  const duration = isMobile ? 0.38 : 0.52;

  const style: React.CSSProperties = {
    opacity: isVisible ? 1 : 0,
    transform: isVisible ? 'translateY(0) scale(1)' : `translateY(${distance}px) scale(0.985)`,
    filter: 'none', // No blur filter on cards to avoid mobile raster/GPU compositing penalties
    transitionProperty: 'opacity, transform',
    transitionDuration: `${duration}s`,
    transitionDelay: `${staggerDelay}s`,
    transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
    willChange: isVisible ? 'auto' : 'opacity, transform',
  };

  return (
    <div className={className} style={style}>
      {children}
    </div>
  );
};
