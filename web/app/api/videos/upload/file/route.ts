import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  console.log("POST /api/videos/upload/file started (Raw Stream Mode)");

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const fileName = decodeURIComponent(
      request.headers.get("X-File-Name") || "video.mp4",
    );
    const lat = request.headers.get("X-Lat");
    const lng = request.headers.get("X-Lng");

    const mediaServerUrl =
      process.env.MEDIA_SERVER_URL || "http://localhost:8000";

    console.log(
      `Forwarding raw stream to media server: ${mediaServerUrl}/process/stream`,
    );

    // Check if media server is reachable
    try {
      const healthCheck = await fetch(`${mediaServerUrl}/health`, {
        signal: AbortSignal.timeout(2000),
      });
      if (!healthCheck.ok) {
        throw new Error(
          `Media server health check failed: ${healthCheck.statusText}`,
        );
      }
    } catch (e: any) {
      console.error("Media server unreachable:", e.message);
      return NextResponse.json(
        {
          error:
            "Media processing services are currently offline for maintenance. Please try again later.",
        },
        { status: 503 },
      );
    }

    const forwardHeaders: Record<string, string> = {
      "X-Profile-ID": user.id,
      "X-File-Name": fileName,
      "Content-Type": "application/octet-stream",
    };

    if (lat) forwardHeaders["X-Lat"] = lat;
    if (lng) forwardHeaders["X-Lng"] = lng;

    // Forward the raw body stream directly to the media server's stream endpoint
    const response = await fetch(`${mediaServerUrl}/process/stream`, {
      method: "POST",
      headers: forwardHeaders,
      body: request.body,
      // @ts-ignore
      duplex: "half",
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Media server error response:", errorText);
      try {
        const errorData = JSON.parse(errorText);
        return NextResponse.json(
          {
            error:
              errorData.detail || "Failed to forward request to media server",
          },
          { status: response.status },
        );
      } catch (e) {
        return NextResponse.json(
          {
            error: `Media server returned error ${response.status}: ${errorText}`,
          },
          { status: response.status },
        );
      }
    }

    const result = await response.json();
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error("File upload error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}
