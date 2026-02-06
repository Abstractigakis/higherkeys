import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DownloadModal } from "./download-modal";
import { vi, describe, it, expect, beforeEach } from "vitest";

// Mock dependencies
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@/components/location-guard", () => ({
  useLocation: () => ({ location: { lat: 0, lng: 0 } }),
}));

// Mock Sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("DownloadModal", () => {
  const onOpenChange = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it("renders when open", () => {
    render(<DownloadModal open={true} onOpenChange={onOpenChange} />);
    expect(screen.getByText("Add Video from URL")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/youtube.com/i)).toBeInTheDocument();
  });

  it("submits the form with URL", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    render(<DownloadModal open={true} onOpenChange={onOpenChange} />);
    
    const input = screen.getByPlaceholderText(/youtube.com/i);
    const submitBtn = screen.getByText("Add Video");

    fireEvent.change(input, { target: { value: "https://www.youtube.com/watch?v=123" } });
    fireEvent.click(submitBtn);

    expect(global.fetch).toHaveBeenCalledWith("/api/videos/upload/url", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({
        url: "https://www.youtube.com/watch?v=123",
        lat: 0,
        lng: 0,
      }),
    }));

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it("shows error modal on 503 service unavailable", async () => {
     (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 503,
    });

    render(<DownloadModal open={true} onOpenChange={onOpenChange} />);
    
    const input = screen.getByPlaceholderText(/youtube.com/i);
    const submitBtn = screen.getByText("Add Video");

    fireEvent.change(input, { target: { value: "https://www.youtube.com/watch?v=123" } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      // Check for the error modal content
      expect(screen.getByText("Media Server Offline")).toBeInTheDocument();
      expect(screen.getByText(/currently offline/i)).toBeInTheDocument();
    });
  });
});
