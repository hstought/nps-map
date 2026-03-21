import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ImageCarousel } from "@/app/(map)/_components/ImageCarousel";
import { createMockImage } from "@/test/fixtures";
import type { ParkImage } from "@/types/park";

// Mock next/image to render a standard img tag
vi.mock("next/image", () => ({
  __esModule: true,
  default: (props: any) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

// Mock embla-carousel-react
vi.mock("embla-carousel-react", () => ({
  __esModule: true,
  default: () => [
    vi.fn(),
    {
      selectedScrollSnap: () => 0,
      canScrollPrev: () => false,
      canScrollNext: () => true,
      scrollPrev: vi.fn(),
      scrollNext: vi.fn(),
      scrollTo: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
    },
  ],
}));

afterEach(cleanup);

describe("ImageCarousel", () => {
  it("shows fallback when images array is empty", () => {
    render(<ImageCarousel images={[]} parkName="Test Park" />);

    expect(screen.getByText("🏞️")).toBeInTheDocument();
  });

  it("renders a single image without carousel controls", () => {
    const images = [createMockImage({ altText: "Old Faithful" })];

    render(<ImageCarousel images={images} parkName="Yellowstone" />);

    expect(screen.getByAltText("Old Faithful")).toBeInTheDocument();
    expect(screen.queryByLabelText("Previous image")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Next image")).not.toBeInTheDocument();
  });

  it("renders credit text when provided", () => {
    const images = [createMockImage({ credit: "NPS / Jane Doe" })];

    render(<ImageCarousel images={images} parkName="Yellowstone" />);

    expect(screen.getByText("NPS / Jane Doe")).toBeInTheDocument();
  });

  it("renders multiple images in carousel mode", () => {
    const images: ParkImage[] = [
      createMockImage({
        url: "https://example.com/1.jpg",
        altText: "Photo 1",
      }),
      createMockImage({
        url: "https://example.com/2.jpg",
        altText: "Photo 2",
      }),
      createMockImage({
        url: "https://example.com/3.jpg",
        altText: "Photo 3",
      }),
    ];

    render(<ImageCarousel images={images} parkName="Yellowstone" />);

    // All images should be present in the carousel
    expect(screen.getByAltText("Photo 1")).toBeInTheDocument();
    expect(screen.getByAltText("Photo 2")).toBeInTheDocument();
    expect(screen.getByAltText("Photo 3")).toBeInTheDocument();
  });

  it("uses park name as fallback alt text", () => {
    const images = [createMockImage({ altText: "" })];

    render(<ImageCarousel images={images} parkName="Yellowstone" />);

    expect(screen.getByAltText("Yellowstone")).toBeInTheDocument();
  });

  it("generates numbered alt text for multiple images without alt text", () => {
    const images: ParkImage[] = [
      createMockImage({
        url: "https://example.com/1.jpg",
        altText: "",
      }),
      createMockImage({
        url: "https://example.com/2.jpg",
        altText: "",
      }),
    ];

    render(<ImageCarousel images={images} parkName="Yellowstone" />);

    expect(
      screen.getByAltText("Yellowstone photo 2"),
    ).toBeInTheDocument();
  });

  it("renders dot indicators for multiple images", () => {
    const images: ParkImage[] = [
      createMockImage({ url: "https://example.com/1.jpg" }),
      createMockImage({ url: "https://example.com/2.jpg" }),
      createMockImage({ url: "https://example.com/3.jpg" }),
    ];

    render(<ImageCarousel images={images} parkName="Yellowstone" />);

    const dotButtons = screen.getAllByLabelText(/Go to image \d+/);
    expect(dotButtons).toHaveLength(3);
  });
});
