"use client";

import { cn } from "@/lib/utils";
import React, { useEffect, useRef, useState } from "react";
import { createNoise3D } from "simplex-noise";

interface AnimatedGradientBackgroundProps {
  className?: string;
  children?: React.ReactNode;
  intensity?: "subtle" | "medium" | "strong";
}

export function BeamsBackground({
  children,
  className,
  intensity = "strong",
}: AnimatedGradientBackgroundProps) {
  const noise = createNoise3D();
  let w: number,
    h: number,
    nt: number,
    i: number,
    x: number,
    ctx: any,
    canvas: any;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isSafari, setIsSafari] = useState(false);

  const getSpeed = () => {
    return 0.002;
  };

  const init = () => {
    canvas = canvasRef.current;
    if (!canvas) return;
    
    ctx = canvas.getContext("2d");
    if (!ctx) return;

    w = ctx.canvas.width = window.innerWidth;
    h = ctx.canvas.height = window.innerHeight;
    ctx.filter = `blur(10px)`;
    nt = 0;

    const handleResize = () => {
      w = ctx.canvas.width = window.innerWidth;
      h = ctx.canvas.height = window.innerHeight;
      ctx.filter = `blur(10px)`;
    };

    window.addEventListener("resize", handleResize);
    render();

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  };

  const waveColors = [
    "#38bdf8",
    "#818cf8",
    "#c084fc",
    "#e879f9",
    "#22d3ee",
  ];

  const drawWave = (n: number) => {
    nt += getSpeed();
    for (i = 0; i < n; i++) {
      ctx.beginPath();
      ctx.lineWidth = 50;
      ctx.strokeStyle = waveColors[i % waveColors.length];
      for (x = 0; x < w; x += 5) {
        var y = noise(x / 800, 0.3 * i, nt) * 100;
        ctx.lineTo(x, y + h * 0.5);
      }
      ctx.stroke();
      ctx.closePath();
    }
  };

  let animationId: number;

  const render = () => {
    if (!ctx) return;
    ctx.fillStyle = "black";
    ctx.globalAlpha = 0.5;
    ctx.fillRect(0, 0, w, h);
    drawWave(5);
    animationId = requestAnimationFrame(render);
  };

  useEffect(() => {
    setIsSafari(
      typeof window !== "undefined" &&
        navigator.userAgent.includes("Safari") &&
        !navigator.userAgent.includes("Chrome")
    );
  }, []);

  useEffect(() => {
    const cleanup = init();
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
      if (cleanup) cleanup();
    };
  }, []);

  return (
    <div
      className={cn(
        "relative min-h-screen w-full overflow-hidden bg-black",
        className
      )}
    >
      <canvas
        className="absolute inset-0 z-0"
        ref={canvasRef}
        id="canvas"
        style={{
          ...(isSafari ? { filter: `blur(10px)` } : {}),
        }}
      />
      {children && <div className="relative z-10">{children}</div>}
    </div>
  );
}
