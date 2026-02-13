import { render, screen } from "@testing-library/react";
import { SuperAdminSection } from "@/components/Pages/Dashboard/SuperAdminSection/SuperAdminSection";

describe("SuperAdminSection", () => {
  it("renders the admin panel link card", () => {
    render(<SuperAdminSection />);

    expect(screen.getByText("Admin Panel")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open Admin Panel" })).toHaveAttribute(
      "href",
      "/admin"
    );
  });
});
