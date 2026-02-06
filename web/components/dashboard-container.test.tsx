import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DashboardContainer } from "./dashboard-container";
import { vi, describe, it, expect, beforeEach } from "vitest";

// Mock dependencies to avoid complex rendering
vi.mock("@/components/dashboard/source-item", () => ({
  SourceItem: () => <div data-testid="source-item">Source Item</div>,
}));
vi.mock("@/components/dashboard/higherkeys/higher-key-editor", () => ({
  HigherKeyEditor: () => <div data-testid="higher-key-editor">HK Editor</div>,
}));
vi.mock("@/components/ui/command", () => ({
    Command: ({ children }: any) => <div>{children}</div>,
    CommandInput: () => <input />,
    CommandList: ({ children }: any) => <div>{children}</div>,
    CommandEmpty: () => <div></div>,
    CommandGroup: ({ children }: any) => <div>{children}</div>,
    CommandItem: ({ children }: any) => <div>{children}</div>,
}));
// Mock DownloadModal to easily check if it opens
vi.mock("@/components/dashboard/download-modal", () => ({
  DownloadModal: ({ open }: { open: boolean }) => (
    open ? <div data-testid="download-modal">Download Modal Open</div> : null
  ),
}));

// Mock Router
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  useSearchParams: () => ({ get: vi.fn() }),
}));

// Mock Supabase wrapper custom hooks if necessary
// But useDashboardData and useDashboardActions are hooks used INSIDE DashboardContainer.
// We might need to mock them if they trigger side effects or data fetching.
// For now, let's see if we can run without mocking them, or just mock the supabase client.

// Mock useDashboardData hook to bypass React Query
vi.mock("@/components/dashboard/hooks/use-dashboard-data", () => ({
  useDashboardData: () => ({
    filteredSources: [],
    allHigherKeys: [],
    isSearchLoading: false,
    refreshSources: vi.fn(),
    sources: [],
  }),
}));
vi.mock("@/components/dashboard/hooks/use-dashboard-actions", () => ({
  useDashboardActions: () => ({
    handleDeleteSource: vi.fn(),
    handleDeleteHighlight: vi.fn(),
  }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => ({ data: {} }),
          order: () => ({ data: [] }),
        }),
      }),
    }),
  }),
}));

describe("DashboardContainer", () => {
  const mockUser: any = { id: "user-1", email: "test@example.com" };
  const mockProfile: any = { id: "user-1", username: "tester" };
  const mockSources: any[] = [];
  const mockKeys: any[] = [];

  it("opens Download Modal when 'D' is pressed", async () => {
    render(
      <DashboardContainer
        initialSources={mockSources}
        initialKeys={mockKeys}
        user={mockUser}
        profile={mockProfile}
      />
    );

    // Initially modal should not be visible
    expect(screen.queryByTestId("download-modal")).not.toBeInTheDocument();

    // Press 'D'
    fireEvent.keyDown(window, { key: "d" });

    // Expect modal to open
    await waitFor(() => {
        expect(screen.getByTestId("download-modal")).toBeInTheDocument();
    });
  });
});
