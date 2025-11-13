"use client";

import { useRouter } from "next/navigation";
import { MODES, type Mode } from "@/data/modes";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Play, Clock } from "lucide-react";
import { HyperText } from "@/components/HyperText";
import { useEffect, useRef } from "react";

interface PokerModeGridProps {
  onModeClick?: (mode: Mode) => void;
}

export function PokerModeGrid({ onModeClick }: PokerModeGridProps) {
  const router = useRouter();

  const handleModeClick = (mode: Mode) => {
    if (mode.status === "available") {
      if (onModeClick) {
        onModeClick(mode);
      } else if (mode.route) {
        router.push(mode.route);
      }
    }
  };

  return (
    <>
      {/* Title block — give it breathing room */}
      <div className="text-center">
        <HyperText
          text="Choose Your Game"
          className="text-3xl md:text-4xl font-light text-white/90 tracking-wide"
          animateOnLoad={false}
        />
      </div>
    <h2 className="text-3xl md:text-4xl font-light text-black mb-2 tracking-wide">
      .<br />.
    </h2>
      <div className="w-full max-w-7xl mx-auto px-4 text-center mt-[clamp(0.75rem,3.5vh,2.5rem)]">
        
        <div className="w-20 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent mx-auto" />
      </div>

      {/* Modes grid — pushed further down */}
      <div className="w-full max-w-7xl mx-auto px-4 pb-20 mt-[clamp(1rem,6vh,3.5rem)]">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 lg:gap-19">
          {MODES.map((mode, index) => (
            <ModeCard
              key={mode.id}
              mode={mode}
              index={index}
              onClick={() => handleModeClick(mode)}
            />
          ))}
        </div>
      </div>
    </>
  );
}

function ModeCard({
  mode,
  index,
  onClick,
}: {
  mode: Mode;
  index: number;
  onClick: () => void;
}) {
  const isAvailable = mode.status === "available";
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      card.style.setProperty('--x', `${x}px`);
      card.style.setProperty('--y', `${y}px`);
    };

    card.addEventListener('mousemove', handleMouseMove);
    return () => {
      card.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  const glowStyles = `
    .mode-card-glow[data-glow] {
      --x: 50%;
      --y: 50%;
    }
    
    .mode-card-glow[data-glow]::before,
    .mode-card-glow[data-glow]::after {
      pointer-events: none;
      content: "";
      position: absolute;
      inset: -2px;
      border: 2px solid transparent;
      border-radius: 0.75rem;
      background-attachment: fixed;
      background-size: 200% 200%;
      background-repeat: no-repeat;
      background-position: center;
      mask: linear-gradient(transparent, transparent), linear-gradient(white, white);
      mask-clip: padding-box, border-box;
      mask-composite: intersect;
      -webkit-mask-composite: intersect;
      opacity: 0;
      transition: opacity 0.3s ease;
      z-index: 1;
    }
    
    .mode-card-glow[data-glow]:hover::before,
    .mode-card-glow[data-glow]:hover::after {
      opacity: 1;
    }
    
    .mode-card-glow[data-glow]::before {
      background-image: radial-gradient(
        300px 300px at
        var(--x, 50%) var(--y, 50%),
        hsl(280 100% 60% / 0.8), transparent 70%
      );
      filter: brightness(1.5) blur(1px);
    }
    
    .mode-card-glow[data-glow]::after {
      background-image: radial-gradient(
        200px 200px at
        var(--x, 50%) var(--y, 50%),
        hsl(0 0% 100% / 0.6), transparent 60%
      );
      filter: blur(2px);
    }
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: glowStyles }} />
      <motion.div
        ref={cardRef}
        data-glow
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ delay: index * 0.1, duration: 0.5 }}
        onClick={onClick}
        className={cn(
          "mode-card-glow group relative overflow-hidden rounded-xl border transition-all duration-300",
          "bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#0a0a0a]",
          "border-white/10 hover:border-white/20",
          isAvailable
            ? "cursor-pointer hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(255,255,255,0.1)]"
            : "cursor-not-allowed opacity-60"
        )}
        style={{
          '--x': '50%',
          '--y': '50%',
        } as React.CSSProperties}
      >
      <div
        className={cn(
          "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300",
          "bg-gradient-to-br from-white/5 via-transparent to-transparent"
        )}
      />
      <div className="relative p-6 z-10">
        <div className="flex items-center justify-between mb-4">
          <div
            className={cn(
              "flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium",
              isAvailable
                ? "bg-white/10 text-white/90 border border-white/20"
                : "bg-white/5 text-white/50 border border-white/10"
            )}
          >
            {isAvailable ? (
              <>
                <Play className="w-3 h-3" />
                <span>Available</span>
              </>
            ) : (
              <>
                <Clock className="w-3 h-3" />
                <span>Coming Soon</span>
              </>
            )}
          </div>
        </div>

        <div className="mb-2">
          <HyperText
            text={mode.name}
            className="text-xl font-semibold text-white/95 group-hover:text-white transition-colors"
            animateOnLoad={false}
          />
        </div>
        <p className="text-sm text-white/60 leading-relaxed mb-4">{mode.subtitle}</p>
        <div className="w-12 h-px bg-gradient-to-r from-white/30 to-transparent" />
        <div className="mt-4 pl-6">
          {isAvailable ? (
            <div className="flex items-center gap-2 text-xs text-white/70 group-hover:text-white/90 transition-colors">
              <span>Click to play</span>
              <motion.div animate={{ x: [0, 4, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
                →
              </motion.div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-white/50">
              <span>In Production</span>
            </div>
          )}
        </div>
      </div>
      <div
        className={cn(
          "absolute bottom-0 left-0 right-0 h-px transition-all duration-300",
          isAvailable
            ? "bg-gradient-to-r from-transparent via-white/30 to-transparent group-hover:via-white/50"
            : "bg-gradient-to-r from-transparent via-white/10 to-transparent"
        )}
      />
      </motion.div>
    </>
  );
}
