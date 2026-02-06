"use client";

import { useRef, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface ManifestoSectionProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  threshold?: number;
}

export function ManifestoSection({
  children,
  className,
  delay = 0,
  threshold = 0.2,
}: ManifestoSectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      {
        threshold,
        rootMargin: "0px 0px -100px 0px",
      },
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [threshold]);

  return (
    <div
      ref={ref}
      className={cn(
        "transition-all duration-1000 ease-out transform",
        isVisible
          ? "opacity-100 translate-y-0 filter-none"
          : "opacity-0 translate-y-12 blur-sm",
        className,
      )}
      style={{
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

export function ManifestoText({
  children,
  className,
  highlight = false,
}: {
  children: React.ReactNode;
  className?: string;
  highlight?: boolean;
}) {
  return (
    <p
      className={cn(
        "text-xl md:text-3xl leading-relaxed text-muted-foreground/80 font-light",
        highlight && "text-primary/90 font-normal",
        className,
      )}
    >
      {children}
    </p>
  );
}

export function ManifestoHeading({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h2
      className={cn(
        "text-4xl md:text-6xl lg:text-8xl font-black uppercase tracking-tighter text-foreground mb-8",
        className,
      )}
    >
      {children}
    </h2>
  );
}
