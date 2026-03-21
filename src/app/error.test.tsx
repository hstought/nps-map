import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ErrorPage from "@/app/error";

afterEach(cleanup);

describe("ErrorPage", () => {
  const mockReset = vi.fn();

  it("displays the error message", () => {
    const error = new Error("Something broke");

    render(<ErrorPage error={error as any} reset={mockReset} />);

    expect(screen.getByText("Something broke")).toBeInTheDocument();
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("shows a fallback message for errors without a message", () => {
    const error = new Error();

    render(<ErrorPage error={error as any} reset={mockReset} />);

    expect(
      screen.getByText("An unexpected error occurred while loading the map."),
    ).toBeInTheDocument();
  });

  it("calls reset when Try again button is clicked", () => {
    const error = new Error("Test error");

    render(<ErrorPage error={error as any} reset={mockReset} />);

    fireEvent.click(screen.getByText("Try again"));
    expect(mockReset).toHaveBeenCalledOnce();
  });

  it("renders the warning emoji", () => {
    const error = new Error("Test");

    render(<ErrorPage error={error as any} reset={mockReset} />);

    expect(screen.getByText("⚠️")).toBeInTheDocument();
  });
});
