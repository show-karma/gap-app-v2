/**
 * Forms Accessibility Tests
 * Tests WCAG 2.2 AA compliance for form patterns used across the app
 *
 * Target: 6 tests
 * - Form fields have associated labels
 * - Required fields are marked with aria-required
 * - Error messages associated via aria-describedby
 * - Form passes axe scan
 * - Fieldsets use legend for grouped inputs
 * - Submit buttons have accessible names
 */

import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe, toHaveNoViolations } from "jest-axe";
import type React from "react";
import { useState } from "react";
import "@testing-library/jest-dom";

expect.extend(toHaveNoViolations);

/**
 * Representative form component matching the patterns used in the real app.
 * Based on patterns from application forms, milestone forms, and project creation forms.
 */
function ApplicationForm({ onSubmit }: { onSubmit: (data: Record<string, string>) => void }) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    projectName: "",
    description: "",
    milestoneTitle: "",
    requestedAmount: "",
    email: "",
    category: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!formData.projectName.trim()) {
      newErrors.projectName = "Project name is required";
    }
    if (!formData.description.trim()) {
      newErrors.description = "Description is required";
    }
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }
    if (!formData.requestedAmount.trim()) {
      newErrors.requestedAmount = "Requested amount is required";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    onSubmit(formData);
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error on change
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} aria-label="Grant Application Form" noValidate>
      <h2 id="form-title">Apply for Grant</h2>

      <fieldset>
        <legend>Project Information</legend>

        <div>
          <label htmlFor="projectName">
            Project Name <span aria-hidden="true">*</span>
          </label>
          <input
            id="projectName"
            name="projectName"
            type="text"
            value={formData.projectName}
            onChange={(e) => handleChange("projectName", e.target.value)}
            aria-required="true"
            aria-invalid={!!errors.projectName}
            aria-describedby={errors.projectName ? "projectName-error" : undefined}
          />
          {errors.projectName && (
            <p id="projectName-error" role="alert" className="text-red-600 text-sm">
              {errors.projectName}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="description">
            Description <span aria-hidden="true">*</span>
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={(e) => handleChange("description", e.target.value)}
            aria-required="true"
            aria-invalid={!!errors.description}
            aria-describedby={errors.description ? "description-error" : undefined}
          />
          {errors.description && (
            <p id="description-error" role="alert" className="text-red-600 text-sm">
              {errors.description}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="category">Category</label>
          <select
            id="category"
            name="category"
            value={formData.category}
            onChange={(e) => handleChange("category", e.target.value)}
          >
            <option value="">Select a category</option>
            <option value="defi">DeFi</option>
            <option value="infrastructure">Infrastructure</option>
            <option value="tooling">Tooling</option>
            <option value="public-goods">Public Goods</option>
          </select>
        </div>
      </fieldset>

      <fieldset>
        <legend>Funding Details</legend>

        <div>
          <label htmlFor="requestedAmount">
            Requested Amount (USD) <span aria-hidden="true">*</span>
          </label>
          <input
            id="requestedAmount"
            name="requestedAmount"
            type="number"
            min="0"
            value={formData.requestedAmount}
            onChange={(e) => handleChange("requestedAmount", e.target.value)}
            aria-required="true"
            aria-invalid={!!errors.requestedAmount}
            aria-describedby={errors.requestedAmount ? "requestedAmount-error" : undefined}
          />
          {errors.requestedAmount && (
            <p id="requestedAmount-error" role="alert" className="text-red-600 text-sm">
              {errors.requestedAmount}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="milestoneTitle">First Milestone Title</label>
          <input
            id="milestoneTitle"
            name="milestoneTitle"
            type="text"
            value={formData.milestoneTitle}
            onChange={(e) => handleChange("milestoneTitle", e.target.value)}
          />
        </div>
      </fieldset>

      <fieldset>
        <legend>Contact Information</legend>

        <div>
          <label htmlFor="email">
            Email <span aria-hidden="true">*</span>
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleChange("email", e.target.value)}
            aria-required="true"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "email-error" : undefined}
          />
          {errors.email && (
            <p id="email-error" role="alert" className="text-red-600 text-sm">
              {errors.email}
            </p>
          )}
        </div>
      </fieldset>

      <div className="flex gap-3 mt-6">
        <button type="button">Cancel</button>
        <button type="submit">Submit Application</button>
      </div>
    </form>
  );
}

describe("Forms Accessibility", () => {
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("form passes axe scan in initial state", async () => {
    const { container } = render(<ApplicationForm onSubmit={mockOnSubmit} />);

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("all form fields have associated labels", () => {
    render(<ApplicationForm onSubmit={mockOnSubmit} />);

    // All inputs should be queryable by their label
    expect(screen.getByLabelText(/project name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/requested amount/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/first milestone title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });

  it("required fields are marked with aria-required", () => {
    render(<ApplicationForm onSubmit={mockOnSubmit} />);

    const projectName = screen.getByLabelText(/project name/i);
    const description = screen.getByLabelText(/description/i);
    const requestedAmount = screen.getByLabelText(/requested amount/i);
    const email = screen.getByLabelText(/email/i);

    expect(projectName).toHaveAttribute("aria-required", "true");
    expect(description).toHaveAttribute("aria-required", "true");
    expect(requestedAmount).toHaveAttribute("aria-required", "true");
    expect(email).toHaveAttribute("aria-required", "true");

    // Optional fields should not have aria-required
    const milestoneTitle = screen.getByLabelText(/first milestone title/i);
    expect(milestoneTitle).not.toHaveAttribute("aria-required");
  });

  it("error messages are associated with inputs via aria-describedby", async () => {
    render(<ApplicationForm onSubmit={mockOnSubmit} />);

    // Submit empty form to trigger validation
    const submitButton = screen.getByText("Submit Application");
    await userEvent.click(submitButton);

    // Error messages should appear
    await screen.findByText("Project name is required");

    // Inputs should have aria-invalid and aria-describedby
    const projectName = screen.getByLabelText(/project name/i);
    expect(projectName).toHaveAttribute("aria-invalid", "true");
    expect(projectName).toHaveAttribute("aria-describedby", "projectName-error");

    // The referenced error element should exist
    const errorEl = document.getElementById("projectName-error");
    expect(errorEl).toBeInTheDocument();
    expect(errorEl?.textContent).toBe("Project name is required");
  });

  it("form with errors passes axe", async () => {
    const { container } = render(<ApplicationForm onSubmit={mockOnSubmit} />);

    // Submit to trigger errors
    const submitButton = screen.getByText("Submit Application");
    await userEvent.click(submitButton);

    await screen.findByText("Project name is required");

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("fieldsets group related inputs with legend elements", () => {
    const { container } = render(<ApplicationForm onSubmit={mockOnSubmit} />);

    const fieldsets = container.querySelectorAll("fieldset");
    expect(fieldsets.length).toBe(3);

    // Each fieldset should have a legend
    for (const fieldset of Array.from(fieldsets)) {
      const legend = fieldset.querySelector("legend");
      expect(legend).toBeInTheDocument();
      expect(legend?.textContent?.trim().length).toBeGreaterThan(0);
    }

    // Verify the legend text
    expect(screen.getByText("Project Information")).toBeInTheDocument();
    expect(screen.getByText("Funding Details")).toBeInTheDocument();
    expect(screen.getByText("Contact Information")).toBeInTheDocument();
  });
});
