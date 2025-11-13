'use client';

import { useState, useEffect, useRef } from 'react';
import NumberFlow from '@number-flow/react';

interface AnimatedPotProps {
  value: number;
  className?: string;
  emptyPot?: boolean; // Trigger pot emptying animation
}

export function AnimatedPot({ value, className = '', emptyPot = false }: AnimatedPotProps) {
  const [displayValue, setDisplayValue] = useState(Math.round(value));
  const isEmptyingRef = useRef(false);
  const previousValueRef = useRef(Math.round(value));

  useEffect(() => {
    const roundedValue = Math.round(value);
    const previousValue = previousValueRef.current;
    
    // Handle pot emptying animation (when winner is declared)
    if (emptyPot && roundedValue > 0 && !isEmptyingRef.current) {
      isEmptyingRef.current = true;
      const startValue = roundedValue;
      const duration = 1500; // 1.5 seconds to empty
      const steps = 40;
      const stepValue = startValue / steps;
      const stepDuration = duration / steps;
      
      let currentStep = 0;
      const interval = setInterval(() => {
        currentStep++;
        const newValue = Math.max(0, Math.round(startValue - (stepValue * currentStep)));
        setDisplayValue(newValue);
        
        if (currentStep >= steps || newValue <= 0) {
          clearInterval(interval);
          setDisplayValue(0);
          isEmptyingRef.current = false;
          previousValueRef.current = 0;
        }
      }, stepDuration);

      return () => clearInterval(interval);
    }
    
    // For normal increases, NumberFlow will handle animation
    // For decreases (not emptyPot), update immediately
    if (!emptyPot && !isEmptyingRef.current) {
      if (roundedValue > previousValue) {
        // Increasing - NumberFlow will animate
        setDisplayValue(roundedValue);
        previousValueRef.current = roundedValue;
      } else if (roundedValue < previousValue) {
        // Decreasing (shouldn't happen except when emptying)
        setDisplayValue(roundedValue);
        previousValueRef.current = roundedValue;
      } else {
        // Same value, just sync
        setDisplayValue(roundedValue);
      }
    }
  }, [value, emptyPot]);

  return (
    <NumberFlow
      willChange
      value={displayValue}
      isolate
      opacityTiming={{ duration: 250, easing: 'ease-out' }}
      transformTiming={{
        easing: `linear(0, 0.0033 0.8%, 0.0263 2.39%, 0.0896 4.77%, 0.4676 15.12%, 0.5688, 0.6553, 0.7274, 0.7862, 0.8336 31.04%, 0.8793, 0.9132 38.99%, 0.9421 43.77%, 0.9642 49.34%, 0.9796 55.71%, 0.9893 62.87%, 0.9952 71.62%, 0.9983 82.76%, 0.9996 99.47%)`,
        duration: 500,
      }}
      className={`text-4xl font-bold text-white font-mono ${className}`}
    />
  );
}

