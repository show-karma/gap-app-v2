import { describe, expect, it } from "bun:test";
import { render, screen } from "@testing-library/react";
import Index from "@/app/stats/page";
import "@testing-library/jest-dom";

// Mock for Stats is pre-registered in tests/bun-setup.ts

describe("Stats Page", () => {
  it("renders the Stats component", () => {
    render(<Index />);
    expect(screen.getByTestId("stats-component")).toBeInTheDocument();
    expect(screen.getByText("Stats Component")).toBeInTheDocument();
  });
});
