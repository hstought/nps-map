import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { OperatingHoursSection } from "@/app/(map)/_components/OperatingHoursSection";
import type { ParkOperatingHours } from "@/types/park";

afterEach(cleanup);

const allDayHours: ParkOperatingHours = {
  name: "Park Grounds",
  description: "Open year-round",
  standardHours: {
    monday: "All Day",
    tuesday: "All Day",
    wednesday: "All Day",
    thursday: "All Day",
    friday: "All Day",
    saturday: "All Day",
    sunday: "All Day",
  },
  exceptions: [],
};

const variedHours: ParkOperatingHours = {
  name: "Visitor Center",
  description: "Seasonal hours",
  standardHours: {
    monday: "9:00AM - 5:00PM",
    tuesday: "9:00AM - 5:00PM",
    wednesday: "9:00AM - 5:00PM",
    thursday: "9:00AM - 5:00PM",
    friday: "9:00AM - 6:00PM",
    saturday: "8:00AM - 6:00PM",
    sunday: "Closed",
  },
  exceptions: [
    {
      name: "Holiday Closure",
      startDate: "2025-12-25",
      endDate: "2025-12-25",
      exceptionHours: {},
    },
  ],
};

describe("OperatingHoursSection", () => {
  it("renders nothing when operating hours array is empty", () => {
    const { container } = render(
      <OperatingHoursSection operatingHours={[]} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when operatingHours is undefined", () => {
    const { container } = render(
      <OperatingHoursSection operatingHours={undefined as any} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("shows section header", () => {
    render(<OperatingHoursSection operatingHours={[allDayHours]} />);
    expect(screen.getByText("Operating Hours")).toBeInTheDocument();
  });

  it("starts collapsed", () => {
    render(<OperatingHoursSection operatingHours={[allDayHours]} />);
    expect(screen.queryByText("Park Grounds")).not.toBeInTheDocument();
  });

  it("expands to show hours when clicked", () => {
    render(<OperatingHoursSection operatingHours={[allDayHours]} />);

    fireEvent.click(screen.getByText("Operating Hours"));

    expect(screen.getByText("Park Grounds")).toBeInTheDocument();
  });

  it("shows condensed Mon-Sun for uniform hours", () => {
    render(<OperatingHoursSection operatingHours={[allDayHours]} />);

    fireEvent.click(screen.getByText("Operating Hours"));

    // When all days are the same, it should show "Mon–Sun" with one entry
    expect(screen.getByText("Mon–Sun")).toBeInTheDocument();
    expect(screen.getByText("24 Hours")).toBeInTheDocument();
  });

  it("shows individual day entries for varied hours", () => {
    render(<OperatingHoursSection operatingHours={[variedHours]} />);

    fireEvent.click(screen.getByText("Operating Hours"));

    expect(screen.getByText("Mon")).toBeInTheDocument();
    expect(screen.getByText("Fri")).toBeInTheDocument();
    expect(screen.getByText("Sun")).toBeInTheDocument();
    expect(screen.getByText("Closed")).toBeInTheDocument();
  });

  it("shows exceptions when present", () => {
    render(<OperatingHoursSection operatingHours={[variedHours]} />);

    fireEvent.click(screen.getByText("Operating Hours"));

    expect(screen.getByText("Exceptions")).toBeInTheDocument();
    expect(screen.getByText("Holiday Closure")).toBeInTheDocument();
  });

  it("deduplicates exceptions with same name and dates", () => {
    const duplicatedExceptions: ParkOperatingHours = {
      ...variedHours,
      exceptions: [
        {
          name: "Holiday",
          startDate: "2025-12-25",
          endDate: "2025-12-25",
          exceptionHours: {},
        },
        {
          name: "Holiday",
          startDate: "2025-12-25",
          endDate: "2025-12-25",
          exceptionHours: {},
        },
      ],
    };

    render(
      <OperatingHoursSection operatingHours={[duplicatedExceptions]} />,
    );

    fireEvent.click(screen.getByText("Operating Hours"));

    const holidays = screen.getAllByText("Holiday");
    expect(holidays).toHaveLength(1);
  });

  it("shows additional hours entries for multi-entry schedules", () => {
    const secondEntry: ParkOperatingHours = {
      name: "Gift Shop",
      description: "Open during peak season only",
      standardHours: {
        monday: "10:00AM - 4:00PM",
        tuesday: "10:00AM - 4:00PM",
        wednesday: "10:00AM - 4:00PM",
        thursday: "10:00AM - 4:00PM",
        friday: "10:00AM - 4:00PM",
        saturday: "10:00AM - 4:00PM",
        sunday: "10:00AM - 4:00PM",
      },
      exceptions: [],
    };

    render(
      <OperatingHoursSection operatingHours={[allDayHours, secondEntry]} />,
    );

    fireEvent.click(screen.getByText("Operating Hours"));

    expect(screen.getByText("Gift Shop")).toBeInTheDocument();
    expect(
      screen.getByText("Open during peak season only"),
    ).toBeInTheDocument();
  });

  it("has proper aria-expanded attribute", () => {
    render(<OperatingHoursSection operatingHours={[allDayHours]} />);

    const button = screen.getByRole("button", { name: /operating hours/i });
    expect(button).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
  });

  it("collapses when clicked again", () => {
    render(<OperatingHoursSection operatingHours={[allDayHours]} />);

    fireEvent.click(screen.getByText("Operating Hours"));
    expect(screen.getByText("Park Grounds")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Operating Hours"));
    expect(screen.queryByText("Park Grounds")).not.toBeInTheDocument();
  });
});
