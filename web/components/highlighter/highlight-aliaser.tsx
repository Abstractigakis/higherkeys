"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface HighlightAliaserProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  highlightIds: string[];
  onSuccess?: () => void;
}

export function HighlightAliaser({
  open,
  onOpenChange,
  highlightIds,
  onSuccess,
}: HighlightAliaserProps) {
  const supabase = createClient();
  const [alias, setAlias] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open && highlightIds.length === 1) {
      // Fetch current alias if only one highlight is selected
      const fetchCurrentAlias = async () => {
        const { data } = await supabase
          .from("highlights")
          .select("alias")
          .eq("id", highlightIds[0])
          .single();
        if (data?.alias) {
          setAlias(data.alias);
        } else {
          setAlias("");
        }
      };
      fetchCurrentAlias();
    } else {
      setAlias("");
    }
  }, [open, highlightIds, supabase]);

  const handleSave = async () => {
    if (highlightIds.length === 0) return;
    setIsLoading(true);

    try {
      const { error } = await supabase
        .from("highlights")
        .update({ alias: alias || null })
        .in("id", highlightIds);

      if (error) throw error;

      toast.success(
        highlightIds.length > 1
          ? `Updated ${highlightIds.length} highlights`
          : "Highlight aliased"
      );
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to save alias");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-zinc-950 border-white/10 rounded-3xl p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-xl font-bold text-white/90">
            {highlightIds.length > 1
              ? `Alias ${highlightIds.length} Highlights`
              : "Alias Highlight"}
          </DialogTitle>
          <DialogDescription className="text-sm text-white/40 font-medium uppercase tracking-widest pt-1">
            Give this clip a descriptive alias
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 pt-4 space-y-4">
          <Input
            autoFocus
            placeholder="Enter alias..."
            value={alias}
            onChange={(e) => setAlias(e.target.value)}
            className="bg-white/5 border-white/10 rounded-2xl h-12 text-white placeholder:text-white/20 focus:ring-primary/50"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSave();
              }
              if (e.key === "Escape") {
                onOpenChange(false);
              }
            }}
          />

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 bg-white/5 border-white/10 hover:bg-white/10 hover:text-white rounded-xl h-11 transition-all"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isLoading}
              className="flex-1 bg-primary text-primary-foreground font-bold rounded-xl h-11 transition-all shadow-lg shadow-primary/20"
            >
              {isLoading ? "Saving..." : "Save Alias"}
            </Button>
          </div>
        </div>

        <div className="px-6 py-3 bg-muted/10 border-t border-white/5 flex items-center justify-between text-[10px] font-medium text-white/20 select-none">
          <div className="flex gap-4">
            <span className="flex items-center gap-1">
              <kbd className="bg-white/5 border border-white/10 rounded px-1 py-0.5">
                Enter
              </kbd>{" "}
              Save
            </span>
            <span className="flex items-center gap-1">
              <kbd className="bg-white/5 border border-white/10 rounded px-1 py-0.5">
                Esc
              </kbd>{" "}
              Cancel
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
