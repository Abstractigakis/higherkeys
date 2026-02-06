import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";

export type DisplayMetadata = {
  role?: "user" | "assistant" | "system";
  content?: string;
  icon?: string;
  color?: string;
};

export type SourceEvent = {
  id: string;
  submission_id: string;
  event_type: string;
  display_metadata: DisplayMetadata;
  created_at: string;
};

export function useSubmissionChat(submissionId: string | null) {
  const [messages, setMessages] = useState<SourceEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!submissionId) {
      setMessages([]);
      return;
    }

    const supabase = createClient();
    setLoading(true);

    // 1. Fetch initial history
    const fetchHistory = async () => {
      const { data, error } = await supabase
        .from("source_form_submission_events")
        .select("*")
        .eq("submission_id", submissionId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching chat history:", error);
        setError(error.message);
      } else {
        setMessages(data as SourceEvent[]);
      }
      setLoading(false);
    };

    fetchHistory();

    // 2. Subscribe to new events
    const channel: RealtimeChannel = supabase
      .channel(`submission-${submissionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "source_form_submission_events",
          filter: `submission_id=eq.${submissionId}`,
        },
        (payload) => {
          const newEvent = payload.new as SourceEvent;
          setMessages((prev) => [...prev, newEvent]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [submissionId]);

  return { messages, loading, error };
}
