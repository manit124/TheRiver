"use client";

import React, {
  useRef,
  useEffect,
  useState,
  TouchEvent,
} from "react";
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useIsMobile } from "@/hooks/use-mobile";
import { MODES, type Mode } from '@/data/modes';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const getModeGradient = (mode: Mode) => {
  // Star Wars style dark purple/blue gradients for each mode
  const gradients: Record<string, string> = {
    texas: 'linear-gradient(135deg, #1a1a3e 0%, #2d1b4e 50%, #4a1a5c 100%)', // Dark purple to deep purple
    omaha: 'linear-gradient(135deg, #0f1b3a 0%, #1a2b4a 50%, #2d3f6a 100%)', // Dark blue to navy
    shortdeck: 'linear-gradient(135deg, #1a1a3e 0%, #2d1b4e 50%, #1a2b4a 100%)', // Purple to blue
    razz: 'linear-gradient(135deg, #2d1b4e 0%, #1a1a3e 50%, #0f1b3a 100%)', // Deep purple to dark blue
    '5card': 'linear-gradient(135deg, #1a2b4a 0%, #2d3f6a 50%, #1a1a3e 100%)', // Navy to purple
    pineapple: 'linear-gradient(135deg, #4a1a5c 0%, #2d1b4e 50%, #1a2b4a 100%)', // Deep purple to blue
    default: 'linear-gradient(135deg, #1a1a3e 0%, #2d1b4e 50%, #0f1b3a 100%)', // Default purple-blue
  };
  
  return gradients[mode.id] || gradients.default;
};

const getModeTags = (mode: Mode) => {
  const tags = [];
  if (mode.variant) {
    tags.push(mode.variant.charAt(0).toUpperCase() + mode.variant.slice(1));
  }
  tags.push('Poker');
  if (mode.status === 'available') {
    tags.push('Available');
  } else {
    tags.push('Coming Soon');
  }
  return tags;
};

const ModeCarousel3D = () => {
  const router = useRouter();
  const [active, setActive] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const isMobile = useIsMobile();

  const autoRotate = false; // Disabled for better performance
  const rotateInterval = 4000;
  const minSwipeDistance = 50;

  // Restore last selected mode from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('lastSelectedModeId');
    if (saved) {
      const index = MODES.findIndex((m) => m.id === saved);
      if (index !== -1) {
        setActive(index);
      }
    }
  }, []);

  // Save current mode to localStorage
  useEffect(() => {
    localStorage.setItem('lastSelectedModeId', MODES[active].id);
  }, [active]);

  // Auto-rotate
  useEffect(() => {
    if (autoRotate && isInView && !isHovering) {
      const interval = setInterval(() => {
        setActive((prev) => (prev + 1) % MODES.length);
      }, rotateInterval);
      return () => clearInterval(interval);
    }
  }, [isInView, isHovering, autoRotate, rotateInterval]);

  // Intersection observer for auto-rotate
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setIsInView(entry.isIntersecting),
      { threshold: 0.2 }
    );
    if (carouselRef.current) {
      observer.observe(carouselRef.current);
    }
    return () => observer.disconnect();
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setActive((prev) => (prev - 1 + MODES.length) % MODES.length);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setActive((prev) => (prev + 1) % MODES.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const mode = MODES[active];
        if (mode.status === 'available' && mode.route) {
          router.push(mode.route);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [active, router]);

  const onTouchStart = (e: TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
    setTouchEnd(null);
  };

  const onTouchMove = (e: TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance > minSwipeDistance) {
      setActive((prev) => (prev + 1) % MODES.length);
    } else if (distance < -minSwipeDistance) {
      setActive((prev) => (prev - 1 + MODES.length) % MODES.length);
    }
  };

  const getCardAnimationClass = (index: number) => {
    if (index === active) return "scale-100 opacity-100 z-20";
    if (index === (active + 1) % MODES.length)
      return "translate-x-[40%] scale-95 opacity-60 z-10";
    if (index === (active - 1 + MODES.length) % MODES.length)
      return "translate-x-[-40%] scale-95 opacity-60 z-10";
    return "scale-90 opacity-0";
  };

  const handleModeClick = (index: number) => {
    if (index === active) {
      const mode = MODES[index];
      if (mode.status === 'available' && mode.route) {
        router.push(mode.route);
      }
    } else {
      setActive(index);
    }
  };

  return (
    <section
      id="ModeCarousel3D"
      className="bg-transparent min-w-full mx-auto flex items-center justify-center"
    >
      <div className="w-full px-4 sm:px-6 lg:px-8 min-w-[350px] md:min-w-[1000px] max-w-7xl">
        <div
          className="relative overflow-hidden h-[420px]"
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          ref={carouselRef}
        >
          <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center">
            {MODES.map((mode, index) => (
              <div
                key={mode.id}
                className={cn(
                  "absolute top-0 transform transition-transform duration-500 ease-out",
                  getCardAnimationClass(index)
                )}
                style={{ willChange: 'transform' }}
                onClick={() => handleModeClick(index)}
              >
                <Card className="overflow-hidden bg-background w-[380px] h-[400px] border shadow-sm hover:shadow-md flex flex-col" style={{ willChange: 'transform' }}>
                  {/* Header Section with Dark Gradient */}
                  <div 
                    className="relative p-6 flex items-center justify-center h-48 overflow-hidden"
                    style={{
                      background: getModeGradient(mode),
                    }}
                  >
                    <div className="absolute inset-0 bg-black/30" />
                    <div className="relative z-10 text-center text-white">
                      <h3 className="text-2xl font-bold mb-2">
                        {mode.name.toUpperCase()}
                      </h3>
                      <div className="w-12 h-1 bg-white mx-auto mb-2" />
                      <p className="text-sm">{mode.subtitle}</p>
                        </div>
                        {mode.status === 'comingSoon' && (
                      <div className="absolute top-4 right-4 z-20">
                            <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm">
                              Soon
                            </Badge>
                          </div>
                        )}
                    {mode.status === 'available' && (
                      <div className="absolute top-4 right-4 z-20">
                        <Badge className="bg-green-500/20 text-green-300 border-green-400/30 backdrop-blur-sm">
                          Available
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* Content Section */}
                  <CardContent className="p-4 flex flex-col flex-grow bg-white dark:bg-gray-900 text-center">
                    <h3 className="text-base font-light tracking-tight mb-0.5 text-foreground">
                      {mode.name}
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 text-[10px] font-light tracking-wide mb-1.5 uppercase">
                      TheRiver Poker
                    </p>
                    <p className="text-gray-600 dark:text-gray-300 text-xs font-light leading-relaxed flex-grow mb-2">
                      {mode.status === 'available' 
                        ? `Experience ${mode.name.toLowerCase()} poker with our complete game interface. ${mode.subtitle}.` 
                        : `${mode.name} is coming soon! ${mode.subtitle}.`}
                    </p>
                    
                    {/* Tags */}
                    <div className="flex flex-wrap gap-1.5 mb-2 justify-center">
                      {getModeTags(mode).map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-1.5 py-0.5 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-full text-[10px]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    {/* Learn More Link */}
                    {mode.status === 'available' && mode.route ? (
                      <a
                        href={mode.route}
                        className="text-gray-500 dark:text-gray-400 flex items-center justify-center hover:underline relative group text-xs mx-auto"
                        onClick={(e) => {
                          e.preventDefault();
                          router.push(mode.route!);
                        }}
                      >
                        <span className="relative z-10">Learn more</span>
                        <ArrowRight className="ml-1.5 w-3 h-3 relative z-10 transition-transform group-hover:translate-x-1" />
                        <span className="absolute left-0 bottom-0 w-0 h-0.5 bg-gray-500 dark:bg-gray-400 transition-all duration-300 group-hover:w-full"></span>
                      </a>
                    ) : (
                      <div className="text-gray-400 dark:text-gray-500 text-xs">
                        Coming soon
                    </div>
                  )}
                  </CardContent>
                </Card>
                </div>
            ))}
      </div>

          {/* Navigation Arrows */}
          {!isMobile && (
            <>
              <button
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-transparent rounded-full flex items-center justify-center text-white border border-white/50 hover:bg-white/10 z-30 shadow-md transition-all hover:scale-110"
                onClick={() =>
                  setActive((prev) => (prev - 1 + MODES.length) % MODES.length)
                }
                aria-label="Previous"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-transparent rounded-full flex items-center justify-center text-white border border-white/50 hover:bg-white/10 z-30 shadow-md transition-all hover:scale-110"
                onClick={() => setActive((prev) => (prev + 1) % MODES.length)}
                aria-label="Next"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}

          {/* Pagination Dots */}
          <div className="absolute bottom-1 left-0 right-0 flex justify-center items-center space-x-3 z-30">
            {MODES.map((_, idx) => (
          <button
                key={idx}
                className={cn(
                  "rounded-full transition-all duration-300",
                  active === idx
                    ? "bg-white w-3 h-3 shadow-[0_0_12px_rgba(255,255,255,0.8),0_0_24px_rgba(255,255,255,0.4)]"
                    : "bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 w-2 h-2"
                )}
                onClick={() => setActive(idx)}
                aria-label={`Go to ${MODES[idx].name}`}
          />
        ))}
      </div>
    </div>
      </div>
    </section>
  );
};

export { ModeCarousel3D };
