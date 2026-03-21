import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ParkSearch } from "@/app/(map)/_components/ParkSearch";
import type { ParkSearchResult } from "@/types/park";

afterEach(cleanup);

const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockOnSelectPark = vi.fn();

const mockResults: ParkSearchResult[] = [
  {
    unitCode: "YELL",
    unitName: "Yellowstone National Park",
    unitType: "National Park",
    state: "WY",
    latitude: 44.6,
    longitude: -110.5,
  },
  {
    unitCode: "YOSE",
    unitName: "Yosemite National Park",
    unitType: "National Park",
    state: "CA",
    latitude: 37.8,
    longitude: -119.5,
  },
];

describe("ParkSearch", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders search input with placeholder", () => {
    render(<ParkSearch onSelectPark={mockOnSelectPark} />);

    expect(screen.getByPlaceholderText("Search parks…")).toBeInTheDocument();
  });

  it("does not search for queries shorter than 2 characters", async () => {
    render(<ParkSearch onSelectPark={mockOnSelectPark} />);

    const input = screen.getByPlaceholderText("Search parks…");
    await userEvent.type(input, "a");

    await vi.advanceTimersByTimeAsync(300);

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("debounces search requests", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResults),
    });

    render(<ParkSearch onSelectPark={mockOnSelectPark} />);

    const input = screen.getByPlaceholderText("Search parks…");

    // Type rapidly
    await userEvent.type(input, "yellow");

    // Should not have called fetch during typing (debounce period)
    expect(mockFetch).not.toHaveBeenCalled();

    // Advance past debounce delay
    await vi.advanceTimersByTimeAsync(300);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  it("displays search results in a dropdown", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResults),
    });

    render(<ParkSearch onSelectPark={mockOnSelectPark} />);

    const input = screen.getByPlaceholderText("Search parks…");
    await userEvent.type(input, "ye");
    await vi.advanceTimersByTimeAsync(300);

    await waitFor(() => {
      expect(
        screen.getByText("Yellowstone National Park"),
      ).toBeInTheDocument();
      expect(screen.getByText("Yosemite National Park")).toBeInTheDocument();
    });
  });

  it("calls onSelectPark when a result is clicked", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResults),
    });

    render(<ParkSearch onSelectPark={mockOnSelectPark} />);

    const input = screen.getByPlaceholderText("Search parks…");
    await userEvent.type(input, "ye");
    await vi.advanceTimersByTimeAsync(300);

    await waitFor(() => {
      expect(
        screen.getByText("Yellowstone National Park"),
      ).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText("Yellowstone National Park"));

    expect(mockOnSelectPark).toHaveBeenCalledWith(mockResults[0]);
  });

  it("clears input after selecting a result", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResults),
    });

    render(<ParkSearch onSelectPark={mockOnSelectPark} />);

    const input = screen.getByPlaceholderText("Search parks…");
    await userEvent.type(input, "ye");
    await vi.advanceTimersByTimeAsync(300);

    await waitFor(() => {
      expect(
        screen.getByText("Yellowstone National Park"),
      ).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText("Yellowstone National Park"));

    expect(input).toHaveValue("");
  });

  it("shows clear button when query has content", async () => {
    render(<ParkSearch onSelectPark={mockOnSelectPark} />);

    const input = screen.getByPlaceholderText("Search parks…");
    expect(screen.queryByLabelText("Clear search")).not.toBeInTheDocument();

    await userEvent.type(input, "test");
    expect(screen.getByLabelText("Clear search")).toBeInTheDocument();
  });

  it("clears search when clear button is clicked", async () => {
    render(<ParkSearch onSelectPark={mockOnSelectPark} />);

    const input = screen.getByPlaceholderText("Search parks…");
    await userEvent.type(input, "test");

    await userEvent.click(screen.getByLabelText("Clear search"));

    expect(input).toHaveValue("");
  });

  it("shows no results message for empty results", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });

    render(<ParkSearch onSelectPark={mockOnSelectPark} />);

    const input = screen.getByPlaceholderText("Search parks…");
    await userEvent.type(input, "xyznonexistent");
    await vi.advanceTimersByTimeAsync(300);

    await waitFor(() => {
      expect(screen.getByText("No parks found")).toBeInTheDocument();
    });
  });

  it("encodes query parameter in URL", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });

    render(<ParkSearch onSelectPark={mockOnSelectPark} />);

    const input = screen.getByPlaceholderText("Search parks…");
    await userEvent.type(input, "grand canyon");
    await vi.advanceTimersByTimeAsync(300);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/parks/search?q=grand%20canyon",
      );
    });
  });

  it("supports keyboard navigation with ArrowDown", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResults),
    });

    render(<ParkSearch onSelectPark={mockOnSelectPark} />);

    const input = screen.getByPlaceholderText("Search parks…");
    await userEvent.type(input, "ye");
    await vi.advanceTimersByTimeAsync(300);

    await waitFor(() => {
      expect(
        screen.getByText("Yellowstone National Park"),
      ).toBeInTheDocument();
    });

    await userEvent.keyboard("{ArrowDown}");
    await userEvent.keyboard("{Enter}");

    expect(mockOnSelectPark).toHaveBeenCalledWith(mockResults[0]);
  });

  it("closes dropdown on Escape key", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResults),
    });

    render(<ParkSearch onSelectPark={mockOnSelectPark} />);

    const input = screen.getByPlaceholderText("Search parks…");
    await userEvent.type(input, "ye");
    await vi.advanceTimersByTimeAsync(300);

    await waitFor(() => {
      expect(
        screen.getByText("Yellowstone National Park"),
      ).toBeInTheDocument();
    });

    await userEvent.keyboard("{Escape}");

    expect(
      screen.queryByText("Yellowstone National Park"),
    ).not.toBeInTheDocument();
  });

  it("displays unit type and state in results", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResults),
    });

    render(<ParkSearch onSelectPark={mockOnSelectPark} />);

    const input = screen.getByPlaceholderText("Search parks…");
    await userEvent.type(input, "ye");
    await vi.advanceTimersByTimeAsync(300);

    await waitFor(() => {
      expect(screen.getByText("WY")).toBeInTheDocument();
      expect(screen.getByText("CA")).toBeInTheDocument();
    });
  });
});
