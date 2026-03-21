import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { EntranceFeesSection } from "@/app/(map)/_components/EntranceFeesSection";
import type { ParkEntranceFee } from "@/types/park";

afterEach(cleanup);

const mockFees: ParkEntranceFee[] = [
  {
    cost: "35.00",
    description: "Admits one private vehicle and all its passengers.",
    title: "Private Vehicle",
  },
  {
    cost: "30.00",
    description: "Per motorcycle, admits rider and one passenger.",
    title: "Motorcycle",
  },
  {
    cost: "20.00",
    description: "Per person on foot or bicycle.",
    title: "Per Person",
  },
];

describe("EntranceFeesSection", () => {
  it("renders nothing when fees array is empty", () => {
    const { container } = render(<EntranceFeesSection entranceFees={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when fees are undefined", () => {
    const { container } = render(
      <EntranceFeesSection entranceFees={undefined as any} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("shows the section header with first fee cost", () => {
    render(<EntranceFeesSection entranceFees={mockFees} />);

    expect(screen.getByText("Entrance Fees")).toBeInTheDocument();
    expect(screen.getByText("$35.00")).toBeInTheDocument();
  });

  it("starts collapsed", () => {
    render(<EntranceFeesSection entranceFees={mockFees} />);

    // Individual fee titles should not be visible when collapsed
    expect(screen.queryByText("Motorcycle")).not.toBeInTheDocument();
    expect(screen.queryByText("Per Person")).not.toBeInTheDocument();
  });

  it("expands to show all fees when clicked", () => {
    render(<EntranceFeesSection entranceFees={mockFees} />);

    fireEvent.click(screen.getByText("Entrance Fees"));

    expect(screen.getByText("Private Vehicle")).toBeInTheDocument();
    expect(screen.getByText("Motorcycle")).toBeInTheDocument();
    expect(screen.getByText("Per Person")).toBeInTheDocument();
  });

  it("collapses when clicked again", () => {
    render(<EntranceFeesSection entranceFees={mockFees} />);

    // Open
    fireEvent.click(screen.getByText("Entrance Fees"));
    expect(screen.getByText("Motorcycle")).toBeInTheDocument();

    // Close
    fireEvent.click(screen.getByText("Entrance Fees"));
    expect(screen.queryByText("Motorcycle")).not.toBeInTheDocument();
  });

  it("shows fee descriptions when individual fee is clicked", () => {
    render(<EntranceFeesSection entranceFees={mockFees} />);

    // Expand section
    fireEvent.click(screen.getByText("Entrance Fees"));

    // Click on a fee to see description
    fireEvent.click(screen.getByText("Private Vehicle"));

    expect(
      screen.getByText("Admits one private vehicle and all its passengers."),
    ).toBeInTheDocument();
  });

  it('formats $0 costs as "Free"', () => {
    const freeFee: ParkEntranceFee[] = [
      { cost: "0.00", description: "No entrance fee.", title: "Entrance" },
    ];

    render(<EntranceFeesSection entranceFees={freeFee} />);

    expect(screen.getByText("Free")).toBeInTheDocument();
  });

  it("formats non-zero costs with dollar sign and two decimals", () => {
    const fees: ParkEntranceFee[] = [
      { cost: "25", description: "", title: "Day Pass" },
    ];

    render(<EntranceFeesSection entranceFees={fees} />);

    expect(screen.getByText("$25.00")).toBeInTheDocument();
  });

  it("has proper aria-expanded attribute", () => {
    render(<EntranceFeesSection entranceFees={mockFees} />);

    const button = screen.getByRole("button", { name: /entrance fees/i });
    expect(button).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
  });
});
