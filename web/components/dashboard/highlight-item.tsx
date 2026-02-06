"use client";

import { cn } from "@/lib/utils";
import { Tables } from "@/types/supabase";

type HighlightWithHigherKeys = Tables<"highlights"> & {
  alias?: string | null;
  higherkeys: (Tables<"higherkeys"> & {
    path?: string | any;
    parent?: {
      source_id: string | null;
      highlight_id: string | null;
      name: string;
    } | null;
  })[];
};

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const slugify = (txt: string) => {
  let slug = txt.toLowerCase().replace(/[^a-z0-9]/g, "_");
  slug = slug.replace(/_+/g, "_");
  slug = slug.replace(/^_+|_+$/g, "");
  return slug || "u";
};

export const HighlightItem = ({
  highlight,
  isActive,
  onClick,
  activeItemRef,
  sourceTitle,
}: {
  highlight: HighlightWithHigherKeys;
  isActive: boolean;
  onClick: () => void;
  activeItemRef: React.RefObject<HTMLDivElement | null>;
  sourceTitle?: string;
}) => {
  const duration = (highlight.end_time || 0) - highlight.start_time;

  return (
    <div
      className={cn(
        "flex flex-col gap-2 p-3 rounded-xl border transition-all group cursor-pointer min-w-[180px] max-w-[180px] justify-between h-[100px]",
        isActive
          ? "bg-primary/10 border-primary ring-1 ring-primary shadow-lg"
          : "bg-card/40 border-white/5 hover:border-white/10 hover:bg-card/60",
      )}
      ref={isActive ? activeItemRef : null}
      onClick={onClick}
    >
      <div className="flex flex-col gap-1.5 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-mono text-primary/70 font-black bg-primary/5 px-1.5 py-0.5 rounded tracking-tighter">
            {formatTime(highlight.start_time)}
          </span>
          <span className="text-[9px] font-mono text-muted-foreground/40 font-bold">
            {duration > 0 ? `${duration.toFixed(1)}s` : "0s"}
          </span>
        </div>

        <h4 className="text-[10px] font-black truncate text-foreground/90 uppercase tracking-widest leading-tight">
          {highlight.alias || `Clip at ${Math.floor(highlight.start_time)}`}
        </h4>
      </div>

      <div className="flex flex-wrap gap-1 mt-auto">
        {(() => {
          const sourceSlug = sourceTitle ? slugify(sourceTitle) : null;

          const visibleKeys = (highlight.higherkeys || []).filter((kh: any) => {
            // Handle both object and array forms of parent metadata
            const parent = Array.isArray(kh.parent) ? kh.parent[0] : kh.parent;

            // Determine if the parent is a custom folder or a system/source mirror
            // Source Keys (folders representing videos) have source_id set.
            // Custom folders have NEITHER source_id nor highlight_id.
            const isCustomFolder =
              parent && !parent.source_id && !parent.highlight_id;

            // NEW RULE: If f is the source higherkey then we dont show this highlight higherkey on the UI at all.
            if (parent && parent.source_id) return false;

            // Also ignore root level tags (Inbox) to avoid clutter (path length 2)
            const pathStr = typeof kh.path === "string" ? kh.path : "";
            const pathParts = pathStr.split(".");

            // IF path length is 3 (root.folder.item), only show if it's a custom folder
            if (pathParts.length === 3 && !isCustomFolder) return false;

            // If path length is > 3, it's a nested folder which we always show (assuming it's user-organized)
            return pathParts.length > 2;
          });

          if (visibleKeys.length === 0) {
            return <div className="size-1 rounded-full bg-white/5" />;
          }

          return visibleKeys.slice(0, 3).map((kh: any) => {
            const parent = Array.isArray(kh.parent) ? kh.parent[0] : kh.parent;
            const pathStr = typeof kh.path === "string" ? kh.path : "";
            const pathSegments = pathStr.split(".");
            // a.b.c.e.f.g
            // g is highlight (last) - exclude
            // a is profile (first) - exclude
            // filter out any segment that matches the current source's slug
            const segmentsToShow = pathSegments
              .slice(1, -1)
              .filter((seg: string) => seg !== sourceSlug);

            if (segmentsToShow.length === 0) return null;

            return (
              <div
                key={kh.id}
                className="px-1 py-0.5 rounded-[2px] bg-primary/10 border border-primary/20"
                title={parent?.name || kh.name}
              >
                <span className="text-[7px] font-black text-primary/80 uppercase tracking-tighter">
                  #{segmentsToShow.join("/")}
                </span>
              </div>
            );
          });
        })()}
      </div>
    </div>
  );
};
