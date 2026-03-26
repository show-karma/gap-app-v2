import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Newsletter } from "@/src/components/footer/newsletter";

describe("Newsletter", () => {
  it("should render iframes with loading='lazy' attribute", () => {
    render(<Newsletter />);

    const iframes = screen.getAllByTitle(/Subscribe to KarmaHQ/);
    expect(iframes).toHaveLength(2);

    for (const iframe of iframes) {
      expect(iframe).toHaveAttribute("loading", "lazy");
    }
  });
});
