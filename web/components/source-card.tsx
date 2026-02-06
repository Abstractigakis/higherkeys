"use client";

import { Badge } from "@/components/ui/badge";
import { Tables } from "@/types/supabase";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { MapPin, Layers } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

// Define the richer type that includes highlights
type HighlightWithHigherKeys = Tables<"highlights"> & {
  alias?: string | null;
  higherkeys: any[]; 
};

type SourceWithHighlights = Tables<"sources"> & {
  highlights: HighlightWithHigherKeys[];
  thumbnail_url?: string | null;
  status: string;
};

interface SourceCardProps {
  source: SourceWithHighlights | Tables<"sources">; // Accept both for flexibility, check inside
}

export function SourceCard({ source }: SourceCardProps) {
  const router = useRouter();
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Type guard or simple check
  const highlights = (source as SourceWithHighlights).highlights || [];

  const thumbnailUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/sources/${source.profile_id}/${source.id}/thumbnail.png`;
  const hasLocation = source.latitude !== null && source.longitude !== null;

  const formatDate = (date: string) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(date));
  };

  return (
    <>
      <div className="group relative h-full flex flex-col rounded-3xl overflow-hidden transition-all duration-500 hover:shadow-[0_0_40px_-10px_var(--primary)] hover:scale-[1.02] bg-card">
        {/* Monolith Container */}
        <Link
          href={`/source/${source.id}`}
          className="relative flex-1 flex flex-col min-h-[300px] w-full bg-card overflow-hidden"
        >
          {/* Background Image Layer */}
          <div className="absolute inset-0 z-0">
             {source.status === "completed" ||
            ((source as { thumbnail_url?: string }).thumbnail_url && !imageError) ? (
              <Image
                src={thumbnailUrl}
                alt={source.title}
                fill
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-110 opacity-50 group-hover:opacity-30"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-card to-card/50 flex items-center justify-center opacity-50">
                <div className="w-full h-full opacity-20 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
              </div>
            )}
            
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent z-10" />
            <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay z-20 pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
          </div>

          {/* Content Layer */}
          <div className="relative z-30 flex flex-col h-full p-6">
            
            {/* Header / Status */}
            <div className="flex justify-between items-start">
              <div className="flex gap-2">
                <Badge
                  variant="outline"
                  className={cn(
                    "backdrop-blur-md border-white/10 uppercase tracking-widest text-[9px] font-black px-2 py-1",
                    source.status === "completed" 
                      ? "bg-primary/10 text-primary border-primary/20" 
                      : "bg-white/5 text-muted-foreground"
                  )}
                >
                  {source.status}
                </Badge>
                {hasLocation && (
                   <div className="bg-primary/20 backdrop-blur-md border border-primary/20 rounded-full px-2 py-1 flex items-center gap-1.5 ">
                   <MapPin className="size-2 text-primary" />
                   <span className="text-[8px] font-bold text-primary uppercase tracking-tighter">
                     GEO
                   </span>
                 </div>
                )}
              </div>
            </div>
            
            {/* Highlights Visualizer (Neural Shards) */}
            <div className="flex-1 flex flex-col justify-center gap-2 py-4 group-hover:opacity-100 transition-opacity">
                {highlights.slice(0, 3).map((h, i) => (
                    <div 
                        key={h.id} 
                        className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-500 fill-mode-backwards"
                        style={{ animationDelay: `${i * 100}ms` }}
                    >
                        <div className="w-1 h-1 rounded-full bg-primary shadow-[0_0_10px_var(--primary)]" />
                        <span className="text-xs font-mono text-muted-foreground/80 line-clamp-1 group-hover:text-primary/80 transition-colors">
                            {h.alias || `Highlight ${i + 1}`}
                        </span>
                    </div>
                ))}
                {highlights.length > 3 && (
                    <div className="flex items-center gap-2 pl-3">
                         <span className="text-[10px] uppercase font-bold text-muted-foreground/50 tracking-widest">
                            + {highlights.length - 3} more connections
                         </span>
                    </div>
                )}
            </div>

            {/* Footer / Title info */}
            <div className="space-y-4 translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
              <div>
                <h3 className="text-xl md:text-2xl font-black leading-tight tracking-tight text-white mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                  {source.title}
                </h3>
                <p className="text-sm text-muted-foreground line-clamp-2 font-light opacity-0 group-hover:opacity-80 transition-opacity duration-500 delay-100 h-0 group-hover:h-auto overflow-hidden">
                   {source.description || "Captured into the void."}
                </p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-white/5 opacity-60 group-hover:opacity-100 transition-opacity">
                 <span className="text-[10px] font-mono text-muted-foreground uppercase opacity-70">
                   {formatDate(source.created_at)}
                 </span>
                 
                 <div className="flex items-center gap-2 text-primary opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0">
                    <span className="text-[10px] font-bold uppercase tracking-widest">Enter</span>
                    <Layers className="size-3" />
                 </div>
              </div>
            </div>
          </div>
        </Link>
      </div>
      
       <Dialog open={isLocationOpen} onOpenChange={setIsLocationOpen}>
        <DialogContent className="max-w-md bg-background/95 backdrop-blur-2xl border-white/10 text-white shadow-2xl p-0 overflow-hidden">
        </DialogContent>
      </Dialog>
    </>
  );
}
