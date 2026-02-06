import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { url, lat, lng } = await request.json();

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    console.log("Received URL upload request:", {
      url,
      userId: user.id,
      lat,
      lng,
    });

    const mediaServerUrl =
      process.env.MEDIA_SERVER_URL || "http://localhost:8000";
    console.log(`Forwarding to media server: ${mediaServerUrl}/process/url`);

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

    const formData = new FormData();
    formData.append("url", url);
    formData.append("profile_id", user.id);
    if (lat) formData.append("lat", lat.toString());
    if (lng) formData.append("lng", lng.toString());

    const response = await fetch(`${mediaServerUrl}/process/url`, {
      method: "POST",
      body: formData,
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
    console.error("URL upload error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}
