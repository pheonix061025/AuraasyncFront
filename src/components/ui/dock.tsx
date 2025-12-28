"use client";

import * as React from "react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const dockVariants = cva(
  "mx-auto flex h-[64px] items-center gap-3 rounded-2xl px-4"
);

interface DockProps {
  className?: string;
  iconSize?: number;
  iconMagnification?: number;
  iconDistance?: number;
  children: React.ReactNode;
}

export const Dock = ({
  className,
  children,
  iconSize = 40,
  iconMagnification = 56,
  iconDistance = 120,
}: DockProps) => {
  const mouseX = useMotionValue(Infinity);

  return (
    <motion.div
      onMouseMove={(e) => mouseX.set(e.pageX)}
      onMouseLeave={() => mouseX.set(Infinity)}
      className={cn(dockVariants(), className)}
    >
      {React.Children.map(children, (child) =>
        React.isValidElement(child)
          ? React.cloneElement(child, {
              mouseX,
              size: iconSize,
              magnification: iconMagnification,
              distance: iconDistance,
            })
          : child
      )}
    </motion.div>
  );
};

interface DockIconProps {
  mouseX?: any;
  size?: number;
  magnification?: number;
  distance?: number;
  className?: string;
  children: React.ReactNode;
}

export const DockIcon = ({
  mouseX,
  size = 40,
  magnification = 56,
  distance = 120,
  className,
  children,
}: DockIconProps) => {
  const ref = React.useRef<HTMLDivElement>(null);

  const distanceCalc = useTransform(mouseX, (val: number) => {
    const bounds = ref.current?.getBoundingClientRect();
    if (!bounds) return distance;
    return val - bounds.x - bounds.width / 2;
  });

  const sizeTransform = useTransform(
    distanceCalc,
    [-distance, 0, distance],
    [size, magnification, size]
  );

  const scale = useSpring(sizeTransform, {
    mass: 0.2,
    stiffness: 180,
    damping: 14,
  });

  return (
    <motion.div
      ref={ref}
      style={{ width: scale, height: scale }}
      className={cn(
        "flex items-center justify-center rounded-xl hover:bg-white/10 transition-colors",
        className
      )}
    >
      {children}
    </motion.div>
  );
};
