"use client";

import { AnimatePresence, motion, Variants } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface HyperTextProps {
  text: string;
  duration?: number;
  framerProps?: Variants;
  className?: string;
  animateOnLoad?: boolean;
}

const alphabets = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const getRandomInt = (max: number) => Math.floor(Math.random() * max);

export function HyperText({
  text,
  duration = 800,
  framerProps = {
    initial: { opacity: 0, y: -10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 3 },
  },
  className,
  animateOnLoad = true,
}: HyperTextProps) {
  // Initialize with actual text to prevent hydration mismatch
  const [displayText, setDisplayText] = useState(
    text.split("")
  );
  const [trigger, setTrigger] = useState(false);
  const interations = useRef(0);
  const isFirstRender = useRef(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

  const triggerAnimation = (allowRetrigger = false) => {
    if (hasAnimated.current && !allowRetrigger) return;
    interations.current = 0;
    setTrigger(true);
    hasAnimated.current = true;
  };

  // Initialize random letters only on client after mount to prevent hydration mismatch
  useEffect(() => {
    if (animateOnLoad) {
      // Set initial random letters only on client
      setDisplayText(
        text.split("").map((char) => (char === " " ? " " : alphabets[getRandomInt(26)]))
      );
      // Trigger animation on mount if animateOnLoad is true
      setTimeout(() => {
        triggerAnimation();
      }, 100);
    }
  }, [animateOnLoad, text]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimated.current) {
            triggerAnimation();
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -100px 0px" }
    );

    const currentRef = containerRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, []);

  useEffect(() => {
    if (!trigger) return;

    const interval = setInterval(
      () => {
        if (interations.current < text.length) {
          setDisplayText((t) =>
            t.map((l, i) =>
              l === " "
                ? l
                : i <= interations.current
                  ? text[i]
                  : alphabets[getRandomInt(26)],
            ),
          );
          interations.current = interations.current + 0.1;
        } else {
          setTrigger(false);
          clearInterval(interval);
        }
      },
      duration / (text.length * 10),
    );

    return () => clearInterval(interval);
  }, [text, duration, trigger]);

  return (
    <div
      ref={containerRef}
      className="flex scale-100 cursor-default overflow-hidden py-2"
    >
      <AnimatePresence mode="wait">
        {displayText.map((letter, i) => (
          <motion.span
            key={i}
            className={cn("font-mono", letter === " " ? "w-3" : "", className)}
            {...framerProps}
          >
            {letter.toUpperCase()}
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
}

