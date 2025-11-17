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
    <div className="w-full max-w-7xl mx-auto px-4">
      {/* Title */}
      <div className="text-center" style={{ marginBottom: '5rem', paddingBottom: '0' }}>
        <h2 className="text-5xl md:text-6xl font-bold text-white mb-6 font-mono tracking-tight">
          Choose Your Game
        </h2>
        <p className="text-white/40 text-sm font-mono uppercase tracking-wider">Select a poker variant</p>
      </div>

      {/* Modes - Card Grid Design */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" style={{ marginTop: '0', paddingTop: '0' }}>
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
  const isProduction = mode.status === "production";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ delay: index * 0.1, duration: 0.5, ease: "easeOut" }}
      onClick={isAvailable ? onClick : undefined}
      className={cn(
        "group relative overflow-hidden rounded-2xl transition-all duration-300",
        "bg-[#0a0a0a] border-2",
        isAvailable
          ? "cursor-pointer border-[#ffd54a]/30 hover:border-[#ffd54a] hover:shadow-[0_0_50px_rgba(255,213,74,0.2)] hover:-translate-y-1"
          : "cursor-not-allowed border-white/5 opacity-40"
      )}
    >
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a1a] via-[#0a0a0a] to-[#1a1a1a] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      {/* Content */}
      <div className="relative p-8 h-full flex flex-col text-center">
        {/* Status indicator - Top right */}
        <div className="absolute top-4 right-4">
          <div
            className={cn(
              "w-3 h-3 rounded-full",
              isAvailable
                ? "bg-[#ffd54a] shadow-[0_0_10px_rgba(255,213,74,0.5)]"
                : "bg-white/20"
            )}
          />
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col justify-center">
          <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-[#ffd54a] transition-colors duration-300 font-mono">
            {mode.name}
          </h3>
          <p className="text-white/40 text-sm mb-6 font-mono leading-relaxed">
            {mode.subtitle}
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-2 pt-4 border-t border-white/5">
          <div
            className={cn(
              "text-xs font-medium uppercase tracking-wider",
              isAvailable
                ? "text-[#ffd54a]"
                : "text-white/30"
            )}
          >
            {isAvailable ? (
              "Ready to Play"
            ) : isProduction ? (
              "In Production"
            ) : (
              "Coming Soon"
            )}
          </div>
          {isAvailable && (
            <motion.div
              animate={{ x: [0, 5, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              className="text-[#ffd54a] text-xl"
            >
              →
            </motion.div>
          )}
        </div>
      </div>

      {/* Shine effect on hover */}
      {isAvailable && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 group-hover:animate-shimmer pointer-events-none" />
      )}
    </motion.div>
  );
}
