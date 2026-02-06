"use client";

import { useSubmissionChat } from "@/hooks/useSubmissionChat";
import { ChatBubble } from "./ChatBubble";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useEffect, useRef } from "react";

interface ChatThreadProps {
  submissionId: string | null;
  title?: string;
  className?: string;
}

export function ChatThread({ submissionId, title = "Activity Log", className }: ChatThreadProps) {
  const { messages, loading, error } = useSubmissionChat(submissionId);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
        // Access the viewport of the ScrollArea if possible, or just the div
         const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
         if (scrollContainer) {
             scrollContainer.scrollTop = scrollContainer.scrollHeight;
         }
    }
  }, [messages]);

  if (!submissionId) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        </CardHeader>
        <CardContent className="h-[400px] flex items-center justify-center text-muted-foreground text-sm">
          Select a submission to view details
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="py-3 border-b">
        <CardTitle className="text-sm font-medium flex justify-between items-center">
            {title}
            {loading && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px] p-4" ref={scrollRef}>
          {error && (
             <div className="p-4 mb-4 text-sm text-red-500 bg-red-500/10 rounded-md border border-red-500/20">
                Error loading history: {error}
             </div> 
          )}
          
          {messages.length === 0 && !loading && (
             <div className="text-center text-muted-foreground text-sm py-8">
                No events recorded yet.
             </div>
          )}

          {messages.map((event) => (
            <ChatBubble 
                key={event.id} 
                metadata={event.display_metadata} 
                createdAt={event.created_at} 
            />
          ))}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
