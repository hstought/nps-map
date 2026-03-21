import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Mock next/dynamic to render a simple placeholder
vi.mock("next/dynamic", () => ({
  __esModule: true,
  default: () => {
    const MockMapView = () => <div data-testid="map-view">MapView</div>;
    MockMapView.displayName = "MockMapView";
    return MockMapView;
  },
}));

import { MapContainer } from "@/app/(map)/_components/MapContainer";

afterEach(cleanup);

describe("MapContainer", () => {
  it("renders a full-screen container", () => {
    const { container } = render(<MapContainer />);

    const wrapper = container.firstElementChild;
    expect(wrapper).toHaveClass("h-screen", "w-screen");
  });

  it("renders the MapView component", () => {
    render(<MapContainer />);

    expect(screen.getByTestId("map-view")).toBeInTheDocument();
  });
});
