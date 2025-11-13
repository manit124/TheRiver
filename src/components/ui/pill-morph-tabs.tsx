"use client";

import * as React from "react";

import { motion } from "framer-motion";

import { cn } from "@/lib/utils";

import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";

export interface PillTab {
  value: string;
  label: React.ReactNode;
  panel?: React.ReactNode;
}

interface PillMorphTabsProps {
  items?: PillTab[];
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  className?: string;
}

export default function PillMorphTabs({
  items = [
    { value: "overview", label: "Overview", panel: <div>Overview content</div> },
    { value: "features", label: "Features", panel: <div>Feature list</div> },
    { value: "pricing", label: "Pricing", panel: <div>Pricing & plans</div> },
    { value: "faq", label: "FAQ", panel: <div>FAQ content</div> },
  ],
  defaultValue,
  onValueChange,
  className,
}: PillMorphTabsProps) {
  const first = items[0]?.value ?? "tab-0";
  const [value, setValue] = React.useState<string>(defaultValue ?? first);
  const listRef = React.useRef<HTMLDivElement | null>(null);
  const triggerRefs = React.useRef<Record<string, HTMLButtonElement | null>>({});
  const [indicator, setIndicator] = React.useState<{ left: number; width: number } | null>(null);
  const [isExpanding, setIsExpanding] = React.useState(false);

  // measure position & width of active trigger and set indicator
  const measure = React.useCallback(() => {
    const list = listRef.current;
    const activeEl = triggerRefs.current[value];
    if (!list || !activeEl) {
      setIndicator(null);
      return;
    }
    const listRect = list.getBoundingClientRect();
    const tRect = activeEl.getBoundingClientRect();
    setIndicator({
      left: tRect.left - listRect.left + list.scrollLeft,
      width: tRect.width,
    });
  }, [value]);

  // measure on mount, value changes and resize
  React.useEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (listRef.current) ro.observe(listRef.current);
    Object.values(triggerRefs.current).forEach((el) => el && ro.observe(el));
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [measure]);

  // when value changes, trigger a short "expand" animation effect
  React.useEffect(() => {
    setIsExpanding(true);
    const id = window.setTimeout(() => setIsExpanding(false), 300);
    return () => window.clearTimeout(id);
  }, [value]);

  React.useEffect(() => {
    if (onValueChange) onValueChange(value);
  }, [value, onValueChange]);

  return (
    <div className={cn("w-full", className)}>
      <Tabs value={value} onValueChange={(v) => setValue(v)}>
        <div
          ref={listRef}
          className={cn(
            "relative",
            "inline-flex items-center gap-2 p-1.5 rounded-full",
            "border border-white/10"
          )}
          style={{
            backgroundColor: '#000000',
          }}
        >
          {/* animated pill indicator */}
          {indicator && (
            <motion.div
              layout
              initial={false}
              animate={{
                left: indicator.left,
                width: indicator.width,
                scaleY: isExpanding ? 1.06 : 1,
                borderRadius: isExpanding ? 24 : 999,
              }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 28,
              }}
              className="absolute pointer-events-none top-1 bottom-1 rounded-full"
              style={{
                background: "linear-gradient(90deg, rgba(124,58,237,0.18), rgba(6,182,212,0.14))",
                boxShadow: "0 6px 20px rgba(16,24,40,0.08)",
                border: "none",
                left: indicator.left,
                width: indicator.width,
              }}
            />
          )}

          {/* blur glow behind pill for extra depth */}
          {indicator && (
            <motion.div
              layout
              initial={false}
              animate={{ left: indicator.left, width: indicator.width }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              className="absolute pointer-events-none top-0 bottom-0 rounded-full filter blur-2xl opacity-40"
              style={{
                background: "linear-gradient(90deg,#7c3aed,#06b6d4)",
                mixBlendMode: "screen",
                left: indicator.left,
                width: indicator.width,
              }}
            />
          )}

          {/* TabsList using shadcn TabsTrigger */}
          <TabsList className="relative flex gap-3 p-1.5 bg-transparent border-none [&>button]:bg-transparent">
            {items.map((it) => {
              const isActive = it.value === value;
              return (
                <TabsTrigger
                  key={it.value}
                  value={it.value}
                  ref={(el: HTMLButtonElement | null) => { triggerRefs.current[it.value] = el; }}
                  className={cn(
                    "relative z-10 px-5 py-2 rounded-full text-sm font-medium transition-colors bg-transparent",
                    "data-[state=active]:bg-transparent",
                    "focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none",
                    isActive ? "text-white" : "text-white/70 hover:text-white"
                  )}
                >
                  {it.label}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        {/* Panels - only render if panel content exists */}
        {items.some(it => it.panel) && (
          <div className="mt-4">
            {items.map((it) => (
              <TabsContent key={it.value} value={it.value} className="p-2">
                {it.panel ?? null}
              </TabsContent>
            ))}
          </div>
        )}
      </Tabs>
    </div>
  );
}

