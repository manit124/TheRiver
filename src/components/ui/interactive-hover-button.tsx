import React from "react";

import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { HyperText } from "@/components/HyperText";

interface InteractiveHoverButtonProps

  extends React.ButtonHTMLAttributes<HTMLButtonElement> {

  text?: string;

}

const InteractiveHoverButton = React.forwardRef<

  HTMLButtonElement,

  InteractiveHoverButtonProps

>(({ text = "Button", className, ...props }, ref) => {

  return (

    <button

      ref={ref}

      className={cn(

        "group relative w-52 overflow-hidden rounded-lg border border-white/20 bg-white/10 backdrop-blur-md px-10 py-8 text-center font-semibold text-white transition-all duration-300 min-h-14 shadow-lg cursor-pointer",
        "hover:bg-white/20 hover:border-white/30",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white/10 disabled:hover:border-white/20",

        className,

      )}

      {...props}

    >

      <span className="inline-block translate-x-1 transition-all duration-300 group-hover:translate-x-12 group-hover:opacity-0">

        <HyperText
          text={text}
          className="text-white font-semibold"
          animateOnLoad={false}
        />

      </span>

      <div className="absolute top-0 z-10 flex h-full w-full translate-x-12 items-center justify-center gap-2 text-white opacity-0 transition-all duration-300 group-hover:-translate-x-1 group-hover:opacity-100 group-hover:text-white">

        <HyperText
          text={text}
          className="text-white font-semibold"
          animateOnLoad={false}
        />

        <ArrowRight />

      </div>

    </button>

  );

});

InteractiveHoverButton.displayName = "InteractiveHoverButton";

export { InteractiveHoverButton };

