"use client";

import { SourceCard } from "@/components/source-card";
import { Tables } from "@/types/supabase";
import { cn } from "@/lib/utils";

type HighlightWithHigherKeys = Tables<"highlights"> & {
  alias?: string | null;
  higherkeys: any[];
};

type SourceWithHighlights = Tables<"sources"> & {
  highlights: HighlightWithHigherKeys[];
  thumbnail_url?: string | null;
  status: string;
};

// Wrapper to adapt the Dashboard's list expectations to the Monolith Card
export const SourceItem = ({
  source,
  isActive,
  onClick,
  activeItemRef,
}: {
  source: SourceWithHighlights;
  isActive: boolean;
  onClick: () => void;
  activeItemRef: React.RefObject<HTMLDivElement | null>;
}) => {
  return (
    <div
      ref={activeItemRef}
      onClick={onClick}
      className={cn(
        "h-[320px] w-full transition-all duration-300 rounded-3xl",
        isActive 
          ? "scale-[1.03] z-10 ring-2 ring-primary shadow-[0_0_40px_-5px_var(--primary)]" 
          : "scale-100 hover:scale-[1.01]"
      )}
    >
      <SourceCard source={source} />
    </div>
  );
};
