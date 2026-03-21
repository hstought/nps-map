import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ParkDetailPopup } from "@/app/(map)/_components/ParkDetailPopup";
import { createMockParkDetail } from "@/test/fixtures";

// Mock child components to isolate ParkDetailPopup logic
vi.mock("@/app/(map)/_components/CurrentWeatherSection", () => ({
  CurrentWeatherSection: ({ unitCode }: { unitCode: string }) => (
    <div data-testid="weather-section">Weather for {unitCode}</div>
  ),
}));

vi.mock("@/app/(map)/_components/ImageCarousel", () => ({
  ImageCarousel: ({ parkName }: { parkName: string }) => (
    <div data-testid="image-carousel">{parkName}</div>
  ),
}));

vi.mock("@/app/(map)/_components/EntranceFeesSection", () => ({
  EntranceFeesSection: () => <div data-testid="entrance-fees">Fees</div>,
}));

vi.mock("@/app/(map)/_components/OperatingHoursSection", () => ({
  OperatingHoursSection: () => <div data-testid="operating-hours">Hours</div>,
}));

afterEach(cleanup);

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("ParkDetailPopup", () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("shows loading state while fetching", () => {
    mockFetch.mockReturnValue(new Promise(() => {})); // never resolves

    render(<ParkDetailPopup unitCode="YELL" onClose={onClose} />);

    expect(screen.getByText("Loading park info…")).toBeInTheDocument();
  });

  it("renders park details on successful fetch", async () => {
    const detail = createMockParkDetail();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(detail),
    });

    render(<ParkDetailPopup unitCode="YELL" onClose={onClose} />);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Yellowstone National Park" }),
      ).toBeInTheDocument();
    });

    expect(screen.getByText("National Park")).toBeInTheDocument();
    expect(screen.getByTestId("image-carousel")).toBeInTheDocument();
    expect(screen.getByTestId("weather-section")).toBeInTheDocument();
    expect(screen.getByTestId("entrance-fees")).toBeInTheDocument();
    expect(screen.getByTestId("operating-hours")).toBeInTheDocument();
  });

  it("shows error state when fetch fails", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
    });

    render(<ParkDetailPopup unitCode="YELL" onClose={onClose} />);

    await waitFor(() => {
      expect(
        screen.getByText("Failed to load park details"),
      ).toBeInTheDocument();
    });

    expect(screen.getByText("Close")).toBeInTheDocument();
  });

  it("calls onClose when close button is clicked in error state", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500 });

    render(<ParkDetailPopup unitCode="YELL" onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByText("Close")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText("Close"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("truncates long descriptions with see more button", async () => {
    const longDescription = "A".repeat(200);
    const detail = createMockParkDetail({ description: longDescription });
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(detail),
    });

    render(<ParkDetailPopup unitCode="YELL" onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByText("See more")).toBeInTheDocument();
    });

    // Description should be truncated (ends with "…")
    const descriptionEl = screen.getByText(/A+…$/);
    expect(descriptionEl).toBeInTheDocument();
  });

  it("expands description when see more is clicked", async () => {
    const longDescription = "A".repeat(200);
    const detail = createMockParkDetail({ description: longDescription });
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(detail),
    });

    render(<ParkDetailPopup unitCode="YELL" onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByText("See more")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText("See more"));
    expect(screen.getByText("See less")).toBeInTheDocument();
    expect(screen.getByText(longDescription)).toBeInTheDocument();
  });

  it("does not show see more for short descriptions", async () => {
    const detail = createMockParkDetail({
      description: "Short description.",
    });
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(detail),
    });

    render(<ParkDetailPopup unitCode="YELL" onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByText("Short description.")).toBeInTheDocument();
    });

    expect(screen.queryByText("See more")).not.toBeInTheDocument();
  });

  it("renders NPS URL as external link", async () => {
    const detail = createMockParkDetail({
      url: "https://www.nps.gov/yell/index.htm",
    });
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(detail),
    });

    render(<ParkDetailPopup unitCode="YELL" onClose={onClose} />);

    await waitFor(() => {
      const link = screen.getByText("Visit NPS.gov");
      expect(link).toHaveAttribute(
        "href",
        "https://www.nps.gov/yell/index.htm",
      );
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    });
  });

  it("formats state abbreviations correctly", async () => {
    const detail = createMockParkDetail({ state: "WY,MT,ID" });
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(detail),
    });

    render(<ParkDetailPopup unitCode="YELL" onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByText("WY, MT, ID")).toBeInTheDocument();
    });
  });

  it("fetches the correct park by unitCode", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(createMockParkDetail()),
    });

    render(<ParkDetailPopup unitCode="GRCA" onClose={onClose} />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/parks/GRCA");
    });
  });
});
