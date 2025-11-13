'use client';

import { type JSX } from 'react';

import { motion, Transition } from 'framer-motion';

import { cn } from '@/lib/utils';



type TextShimmerWave = {

  children: string;

  as?: React.ElementType;

  className?: string;

  duration?: number;

  zDistance?: number;

  xDistance?: number;

  yDistance?: number;

  spread?: number;

  scaleDistance?: number;

  rotateYDistance?: number;

  transition?: Transition;

  baseColor?: string;

  gradientColor?: string;

};



export function TextShimmerWave({

  children,

  as: Component = 'p',

  className,

  duration = 1,

  zDistance = 10,

  xDistance = 2,

  yDistance = -2,

  spread = 1,

  scaleDistance = 1.1,

  rotateYDistance = 10,

  transition,

  baseColor,

  gradientColor,

}: TextShimmerWave) {

  const MotionComponent = motion.create(

    Component as keyof JSX.IntrinsicElements

  );



  const defaultBaseColor = baseColor || '#c084fc';
  const defaultGradientColor = gradientColor || '#38bdf8';

  return (

    <MotionComponent

      className={cn(

        'relative inline-block [perspective:500px]',

        className

      )}

      style={{ 
        color: defaultBaseColor,
        '--base-color': defaultBaseColor,
        '--base-gradient-color': defaultGradientColor,
      } as React.CSSProperties & { '--base-color': string; '--base-gradient-color': string }}

    >

      {children.split('').map((char, i) => {

        const delay = (i * duration * (1 / spread)) / children.length;



        return (

          <motion.span

            key={i}

            className={cn(

              'inline-block whitespace-pre [transform-style:preserve-3d]'

            )}

            initial={{

              translateZ: 0,

              scale: 1,

              rotateY: 0,

              color: 'var(--base-color)',

            }}

            animate={{

              translateZ: [0, zDistance, 0],

              translateX: [0, xDistance, 0],

              translateY: [0, yDistance, 0],

              scale: [1, scaleDistance, 1],

              rotateY: [0, rotateYDistance, 0],

              color: [

                'var(--base-color)',

                'var(--base-gradient-color)',

                'var(--base-color)',

              ],

            }}

            transition={{

              duration: duration,

              repeat: Infinity,

              repeatDelay: (children.length * 0.05) / spread,

              delay,

              ease: 'easeInOut',

              ...transition,

            }}

          >

            {char}

          </motion.span>

        );

      })}

    </MotionComponent>

  );

}

