import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import { CompassAnnouncementBanner } from "@/src/features/home/components/compass-announcement-banner";
import { NONPROFITS_ORIGIN } from "@/utilities/domains";

describe("CompassAnnouncementBanner", () => {
  it("announces Karma Compass", () => {
    render(<CompassAnnouncementBanner />);

    expect(screen.getByText("Introducing Karma Compass")).toBeInTheDocument();
    expect(screen.getByText("AI-powered board management for nonprofits")).toBeInTheDocument();
  });

  it("links the whole banner to the Compass app", () => {
    render(<CompassAnnouncementBanner />);

    const link = screen.getByRole("link", { name: /Introducing Karma Compass/i });
    expect(link).toHaveAttribute("href", NONPROFITS_ORIGIN);
    expect(link).toHaveTextContent("Try Compass");
  });
});
