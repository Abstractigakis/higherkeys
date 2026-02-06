"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type KeyboardLegendProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  hasDeleteTarget: boolean;
};

export function KeyboardLegend({
  isOpen,
  onOpenChange,
  hasDeleteTarget,
}: KeyboardLegendProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-background/95 backdrop-blur-md border border-white/10 shadow-2xl p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2 border-b border-white/5">
          <DialogTitle className="text-xl font-medium text-primary uppercase tracking-widest text-[10px]">
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-x-8 p-6 pt-4 items-start">
          {/* Column 1: Global Controls */}
          <div className="space-y-6">
            <div className="space-y-1">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-2">
                Global
              </h4>
              {[
                ["Profile Menu", ["I"]],
                ["Play Playlist", ["P"]],
                ["Higher Keys Modal", ["Tab"]],
                ["Toggle Legend", ["L"]],
              ].map(([desc, keys]: any) => (
                <div
                  key={desc}
                  className="flex justify-between items-center py-1"
                >
                  <span className="text-xs text-foreground/70">{desc}</span>
                  <div className="flex gap-1">
                    {keys.map((k: string) => (
                      <kbd
                        key={k}
                        className="bg-white/5 px-1.5 py-0.5 rounded text-[10px] font-mono border border-white/10 text-primary uppercase"
                      >
                        {k}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-1">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-2">
                Input
              </h4>
              {[
                ["Add from URL", "D"],
                ["Upload File", "U"],
              ].map(([desc, key]) => (
                <div
                  key={desc}
                  className="flex justify-between items-center py-1"
                >
                  <span className="text-xs text-foreground/70">{desc}</span>
                  <kbd className="bg-white/5 px-2 py-0.5 rounded text-[10px] font-mono border border-white/10 text-primary uppercase">
                    {key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>

          {/* Column 2: Sources & Highlights */}
          <div className="space-y-6">
            <div className="space-y-1">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary/50 mb-2">
                Navigation
              </h4>
              {[
                ["↑ / ↓", "Change Source"],
                ["← / →", "Browse Highlights"],
                ["Enter", "Open Focused"],
                ["K", "Tag Highlight"],
                ["D", "Done Tagging"],
                ["A", "Alias Highlight"],
                ["Del / Bksp", "Delete"],
              ].map(([desc, key]) => (
                <div
                  key={desc}
                  className="flex justify-between items-center py-1"
                >
                  <span className="text-xs text-foreground/70">{key}</span>
                  <kbd className="bg-white/5 px-2 py-0.5 rounded text-[10px] font-mono border border-white/10 text-primary uppercase">
                    {desc}
                  </kbd>
                </div>
              ))}
            </div>

            <div className="space-y-1">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-2">
                Search & Filter
              </h4>
              {[
                ["⌘ + S", "Search"],
                ["⌘ + K", "Filter by Key"],
                ["X", "Clear Filters"],
                ["Esc", "Close / Blur"],
              ].map(([key, desc]) => (
                <div
                  key={key}
                  className="flex justify-between items-center py-1"
                >
                  <span className="text-xs text-foreground/70">{desc}</span>
                  <kbd className="bg-white/5 px-2 py-0.5 rounded text-[10px] font-mono border border-white/10 text-primary uppercase">
                    {key}
                  </kbd>
                </div>
              ))}
            </div>

            {hasDeleteTarget && (
              <div className="pt-4 border-t border-white/10 space-y-1">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-destructive mb-2">
                  Confirm Delete
                </h4>
                <div className="flex justify-between items-center py-1">
                  <span className="text-xs text-foreground/70">Toggle</span>
                  <kbd className="bg-white/5 px-2 py-0.5 rounded text-[10px] font-mono border border-white/10 text-primary uppercase">
                    ← / →
                  </kbd>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-xs text-foreground/70">Confirm</span>
                  <kbd className="bg-white/5 px-2 py-0.5 rounded text-[10px] font-mono border border-white/10 text-primary uppercase">
                    Enter
                  </kbd>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
