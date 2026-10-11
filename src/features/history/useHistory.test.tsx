import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { fetchHistory } from "./historyApi";
import { useHistory } from "./useHistory";

vi.mock("./historyApi", () => ({ fetchHistory: vi.fn() }));

const reply = () =>
  ({ content: [], pagination: { page: 1, size: 25, totalElements: 0, totalPages: 1 } }) as never;

beforeEach(() => {
  vi.mocked(fetchHistory).mockReset().mockResolvedValue(reply());
});

describe("useHistory", () => {
  it("FR-HIST-026: loads the first page with no search", async () => {
    const { result } = renderHook(() => useHistory("alice"));
    await waitFor(() => {
      expect(result.current.state.status).toBe("loaded");
    });
    expect(fetchHistory).toHaveBeenCalledWith("alice", { search: "", page: 1 });
  });

  it("searching asks the server, restarts at page 1 and collapses the open card", async () => {
    const { result } = renderHook(() => useHistory("alice"));
    await waitFor(() => {
      expect(result.current.state.status).toBe("loaded");
    });
    act(() => {
      result.current.setPage(3);
      result.current.toggle(1);
    });
    act(() => {
      result.current.setSearch("che");
    });
    expect(result.current).toMatchObject({ search: "che", page: 1, expanded: null });
    await waitFor(() => {
      expect(fetchHistory).toHaveBeenLastCalledWith("alice", { search: "che", page: 1 });
    });
  });

  it("changing page collapses the open card", async () => {
    const { result } = renderHook(() => useHistory("alice"));
    act(() => {
      result.current.toggle(0);
    });
    expect(result.current.expanded).toBe(0);
    act(() => {
      result.current.setPage(2);
    });
    expect(result.current.expanded).toBeNull();
    await waitFor(() => {
      expect(fetchHistory).toHaveBeenLastCalledWith("alice", { search: "", page: 2 });
    });
  });

  it("toggling the open card closes it", () => {
    const { result } = renderHook(() => useHistory("alice"));
    act(() => {
      result.current.toggle(2);
    });
    act(() => {
      result.current.toggle(2);
    });
    expect(result.current.expanded).toBeNull();
  });

  it("reports a failure, and retry loads again", async () => {
    vi.mocked(fetchHistory).mockRejectedValueOnce(new Error("down"));
    const { result } = renderHook(() => useHistory("alice"));
    await waitFor(() => {
      expect(result.current.state.status).toBe("error");
    });
    act(() => {
      result.current.retry();
    });
    await waitFor(() => {
      expect(result.current.state.status).toBe("loaded");
    });
  });
});
