import { DisplayMetadata } from "@/hooks/useSubmissionChat";
import { cn } from "@/lib/utils";
import { User, Bot, Terminal, Info } from "lucide-react";

interface ChatBubbleProps {
  metadata: DisplayMetadata;
  createdAt: string;
}

export function ChatBubble({ metadata, createdAt }: ChatBubbleProps) {
  const role = metadata.role || "system";
  const content = metadata.content || "No content";
  const isUser = role === "user";
  const isSystem = role === "system";

  // Icon Mapping
  const Icon = () => {
    if (metadata.icon === "stop") return <Info className="w-4 h-4" />;
    switch (role) {
      case "user":
        return <User className="w-4 h-4" />;
      case "assistant":
        return <Bot className="w-4 h-4" />;
      case "system":
        return <Terminal className="w-4 h-4" />;
      default:
        return <Info className="w-4 h-4" />;
    }
  };

  return (
    <div
      className={cn(
        "flex w-full mb-4 animate-in fade-in slide-in-from-bottom-2 duration-300",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "flex max-w-[80%] rounded-lg p-3 gap-3",
          isUser
            ? "bg-primary text-primary-foreground"
            : isSystem
            ? "bg-muted/50 text-muted-foreground border border-border/50 text-xs font-mono"
            : "bg-muted text-foreground border border-border"
        )}
      >
        <div className="mt-0.5 shrink-0 opacity-70">
          <Icon />
        </div>
        <div className="flex flex-col gap-1">
            <div className="text-sm break-words whitespace-pre-wrap">{content}</div>
            <div className="text-[10px] opacity-50 text-right">
                {new Date(createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
        </div>
      </div>
    </div>
  );
}
