import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { signOut, syncSessionWithWebsite } from "@/lib/auth";
import type { Session } from "@supabase/supabase-js";
import { Loader2, CheckCircle2, ExternalLink, Download } from "lucide-react";

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUrl, setCurrentUrl] = useState("");
  const [videoId, setVideoId] = useState<string | null>(null);
  const [videoType, setVideoType] = useState<"youtube" | "pornhub" | null>(
    null
  );
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "saving" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const getVideoInfo = (url: string) => {
    const youtubeRegExp =
      /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
    const youtubeMatch = url.match(youtubeRegExp);
    if (youtubeMatch && youtubeMatch[2].length === 11) {
      return { type: "youtube" as const, id: youtubeMatch[2] };
    }

    const pornhubRegExp = /viewkey=([a-zA-Z0-9]+)/;
    const pornhubMatch = url.match(pornhubRegExp);
    if (pornhubMatch) {
      return { type: "pornhub" as const, id: pornhubMatch[1] };
    }

    return null;
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        await syncSessionWithWebsite();
      } catch (e) {
        console.error("Sync failed:", e);
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      setSession(session);

      if (typeof chrome !== "undefined" && chrome.tabs) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]?.url) {
            const url = tabs[0].url;
            setCurrentUrl(url);
            const info = getVideoInfo(url);
            if (info) {
              setVideoId(info.id);
              setVideoType(info.type);
            }
          }
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    };

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    const handleCookieChange = (
      changeInfo: chrome.cookies.CookieChangeInfo
    ) => {
      const domain = changeInfo.cookie.domain;
      const name = changeInfo.cookie.name;

      if (
        (domain.includes("higherkeys.com") || domain.includes("localhost")) &&
        (name.includes("auth-token") || name.startsWith("sb-"))
      ) {
        initAuth();
      }
    };

    if (typeof chrome !== "undefined" && chrome.cookies) {
      chrome.cookies.onChanged.addListener(handleCookieChange);
    }

    return () => {
      subscription.unsubscribe();
      if (typeof chrome !== "undefined" && chrome.cookies) {
        chrome.cookies.onChanged.removeListener(handleCookieChange);
      }
    };
  }, []);

  const handleLogin = () => {
    if (typeof chrome !== "undefined" && chrome.tabs) {
      chrome.tabs.create({ url: "https://higherkeys.com/login" });
    } else {
      window.open("https://higherkeys.com/login", "_blank");
    }
  };

  const handleSaveLink = async () => {
    if (!session || !currentUrl || !videoId) return;
    setUploadStatus("saving");
    try {
      // Construct the URL for the API
      const uploadUrl =
        videoType === "youtube"
          ? `https://www.youtube.com/watch?v=${videoId}`
          : currentUrl;

      const response = await fetch(
        "https://higherkeys.com/api/videos/upload/url",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            url: uploadUrl,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to add ${videoType} video`);
      }
      setUploadStatus("success");
    } catch (error: unknown) {
      console.error("Failed to save link:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to save link"
      );
      setUploadStatus("error");
    }
  };

  const handleRedirect = () => {
    if (typeof chrome !== "undefined" && chrome.tabs) {
      chrome.tabs.create({ url: "https://higherkeys.com" });
    } else {
      window.open("https://higherkeys.com", "_blank");
    }
  };

  if (loading) {
    return (
      <div className="w-[350px] h-[200px] p-4 flex flex-col items-center justify-center bg-background text-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-2 text-sm text-muted-foreground">
          Identifying page...
        </p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="w-[350px] p-4 flex flex-col gap-4 bg-background text-foreground">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold">HKS Saver</h1>
        </div>
        <p className="text-sm text-muted-foreground text-center py-4">
          Sign in at higherkeys.com to save videos.
        </p>
        <Button className="w-full" onClick={handleLogin}>
          Login at higherkeys.com
        </Button>
      </div>
    );
  }

  if (!videoId) {
    return (
      <div className="w-[350px] p-4 flex flex-col gap-4 bg-background text-foreground">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold">HKS Saver</h1>
          <Button variant="ghost" size="sm" onClick={() => signOut()}>
            Logout
          </Button>
        </div>
        <div className="py-8 flex flex-col items-center text-center gap-2">
          <p className="text-sm text-muted-foreground">
            This extension works on YouTube video pages.
          </p>
          <p className="text-xs text-muted-foreground/60">
            Please navigate to a supported video to continue.
          </p>
        </div>
      </div>
    );
  }

  if (uploadStatus === "saving") {
    return (
      <div className="w-[350px] h-[300px] p-4 flex flex-col items-center justify-center bg-background text-foreground">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="mt-4 text-base font-medium">Saving video...</p>
      </div>
    );
  }

  if (uploadStatus === "success") {
    return (
      <div className="w-[350px] p-6 flex flex-col items-center justify-center bg-background text-foreground gap-6">
        <div className="flex flex-col items-center gap-2">
          <CheckCircle2 className="h-16 w-16 text-green-500" />
          <h2 className="text-lg font-semibold text-center">
            {videoType === "youtube" ? "YouTube" : "Pornhub"} video upload
            started
          </h2>
        </div>
        <Button className="w-full" onClick={handleRedirect}>
          Redirect to higherkeys.com
          <ExternalLink className="ml-2 h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="w-[350px] p-4 flex flex-col gap-4 bg-background text-foreground">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <h1 className="text-lg font-bold leading-none">HKS Saver</h1>
          <span className="text-[10px] text-muted-foreground truncate max-w-[150px] mt-1">
            {session.user.email}
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={() => signOut()}>
          Logout
        </Button>
      </div>

      <div className="aspect-video w-full bg-muted rounded-lg overflow-hidden relative group">
        {videoType === "youtube" ? (
          <img
            src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
            alt="YouTube Video Thumbnail"
            className="w-full h-full object-cover"
            onError={(e) => {
              // Fallback to standard quality if maxres is not available
              (
                e.target as HTMLImageElement
              ).src = `https://img.youtube.com/vi/${videoId}/0.jpg`;
            }}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-white p-4 text-center">
            <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center mb-2">
              <Download className="w-6 h-6 text-black" />
            </div>
            <span className="text-sm font-bold">Pornhub Video Detected</span>
            <span className="text-[10px] opacity-60 mt-1 truncate w-full">
              {videoId}
            </span>
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 group-hover:bg-black/40 transition-colors">
          <button
            onClick={handleSaveLink}
            className="w-16 h-16 flex items-center justify-center rounded-full bg-primary text-primary-foreground hover:scale-110 transition-transform shadow-lg"
            title="Save to Higher Keys"
          >
            <Download className="w-8 h-8" />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Button
          variant="outline"
          className="w-full flex items-center justify-center gap-2"
          onClick={handleRedirect}
        >
          <img src="/logo.png" alt="HKS Logo" className="w-5 h-5" />
          Go to Higher Keys
        </Button>
      </div>

      {uploadStatus === "error" && (
        <p className="text-xs text-destructive text-center">{errorMessage}</p>
      )}
    </div>
  );
}

export default App;
