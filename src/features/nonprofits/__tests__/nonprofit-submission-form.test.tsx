/**
 * NonprofitSubmissionForm tests
 *
 * Covers validation (required fields, URL protocol normalization, phone
 * format), the loading/error/success states driven by the mutation, and
 * the accessibility wiring (labels, aria-invalid, aria-describedby,
 * role=alert, aria-live success output).
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NonprofitSubmissionForm } from "../components/nonprofit-submission-form";

const mockMutate = vi.fn();
const mockUseNonprofitSubmission = vi.fn();

vi.mock("@/src/features/nonprofits/hooks/use-nonprofit-submission", () => ({
  useNonprofitSubmission: () => mockUseNonprofitSubmission(),
}));

function mutationState(overrides: Record<string, unknown> = {}) {
  return {
    mutate: mockMutate,
    isPending: false,
    isError: false,
    isSuccess: false,
    ...overrides,
  };
}

function fillValidForm() {
  fireEvent.change(screen.getByLabelText(/Your website/i), {
    target: { value: "yournonprofit.org" },
  });
  fireEvent.change(screen.getByLabelText(/Your email/i), {
    target: { value: "you@yournonprofit.org" },
  });
}

describe("NonprofitSubmissionForm", () => {
  beforeEach(() => {
    mockMutate.mockReset();
    mockUseNonprofitSubmission.mockReturnValue(mutationState());
  });

  describe("Validation", () => {
    it("shows required errors and does not submit when fields are empty", async () => {
      render(<NonprofitSubmissionForm />);

      fireEvent.click(screen.getByRole("button", { name: /Add your nonprofit free/i }));

      expect(await screen.findByText("Website URL is required")).toBeInTheDocument();
      expect(screen.getByText("Email is required")).toBeInTheDocument();
      expect(mockMutate).not.toHaveBeenCalled();
    });

    it("wires aria-invalid and aria-describedby to the error message", async () => {
      render(<NonprofitSubmissionForm />);

      fireEvent.click(screen.getByRole("button", { name: /Add your nonprofit free/i }));
      await screen.findByText("Website URL is required");

      const urlInput = screen.getByLabelText(/Your website/i);
      expect(urlInput).toHaveAttribute("aria-invalid", "true");
      expect(urlInput).toHaveAttribute("aria-describedby", "nonprofit-url-error");
    });

    it("rejects an invalid email", async () => {
      render(<NonprofitSubmissionForm />);

      fillValidForm();
      fireEvent.change(screen.getByLabelText(/Your email/i), {
        target: { value: "not-an-email" },
      });
      fireEvent.click(screen.getByRole("button", { name: /Add your nonprofit free/i }));

      expect(await screen.findByText("Enter a valid email address")).toBeInTheDocument();
      expect(mockMutate).not.toHaveBeenCalled();
    });

    it("rejects an invalid phone but accepts an empty one", async () => {
      render(<NonprofitSubmissionForm />);

      fillValidForm();
      fireEvent.change(screen.getByLabelText(/Phone/i), { target: { value: "abc" } });
      fireEvent.click(screen.getByRole("button", { name: /Add your nonprofit free/i }));

      expect(await screen.findByText("Enter a valid phone number")).toBeInTheDocument();
      expect(mockMutate).not.toHaveBeenCalled();
    });

    it("rejects a leading-paren phone to match the backend PHONE_PATTERN", async () => {
      // The gap-indexer contract's regex is /^[+\d][\d\s()\-.]{5,}$/ — a
      // leading "(" is rejected server-side, so the client must reject it
      // too rather than let the request 400.
      render(<NonprofitSubmissionForm />);

      fillValidForm();
      fireEvent.change(screen.getByLabelText(/Phone/i), { target: { value: "(555) 123-4567" } });
      fireEvent.click(screen.getByRole("button", { name: /Add your nonprofit free/i }));

      expect(await screen.findByText("Enter a valid phone number")).toBeInTheDocument();
      expect(mockMutate).not.toHaveBeenCalled();
    });

    it("prepends https:// to a protocol-less URL before submitting", async () => {
      render(<NonprofitSubmissionForm />);

      fillValidForm();
      fireEvent.click(screen.getByRole("button", { name: /Add your nonprofit free/i }));

      await waitFor(() => expect(mockMutate).toHaveBeenCalledTimes(1));
      expect(mockMutate).toHaveBeenCalledWith({
        websiteUrl: "https://yournonprofit.org",
        email: "you@yournonprofit.org",
        phone: undefined,
      });
    });

    it("keeps an explicit protocol untouched and passes the phone through", async () => {
      render(<NonprofitSubmissionForm />);

      fireEvent.change(screen.getByLabelText(/Your website/i), {
        target: { value: "http://legacy.yournonprofit.org" },
      });
      fireEvent.change(screen.getByLabelText(/Your email/i), {
        target: { value: "you@yournonprofit.org" },
      });
      fireEvent.change(screen.getByLabelText(/Phone/i), {
        target: { value: "+1 555 123 4567" },
      });
      fireEvent.click(screen.getByRole("button", { name: /Add your nonprofit free/i }));

      await waitFor(() => expect(mockMutate).toHaveBeenCalledTimes(1));
      expect(mockMutate).toHaveBeenCalledWith({
        websiteUrl: "http://legacy.yournonprofit.org",
        email: "you@yournonprofit.org",
        phone: "+1 555 123 4567",
      });
    });
  });

  describe("Mutation states", () => {
    it("disables the submit button and shows a spinner while pending", () => {
      mockUseNonprofitSubmission.mockReturnValue(mutationState({ isPending: true }));
      render(<NonprofitSubmissionForm />);

      const button = screen.getByRole("button", { name: /Submitting/i });
      expect(button).toBeDisabled();
    });

    it("shows an alert with the support email when the submission fails", () => {
      mockUseNonprofitSubmission.mockReturnValue(mutationState({ isError: true }));
      render(<NonprofitSubmissionForm />);

      const alert = screen.getByRole("alert");
      expect(alert).toHaveTextContent(/Something went wrong/i);
      expect(alert).toHaveTextContent("hello@karmahq.xyz");
      // The form stays rendered so the visitor can retry.
      expect(screen.getByLabelText(/Your website/i)).toBeInTheDocument();
    });

    it("replaces the form with an aria-live confirmation on success", () => {
      mockUseNonprofitSubmission.mockReturnValue(mutationState({ isSuccess: true }));
      render(<NonprofitSubmissionForm />);

      expect(screen.getByText("Thank you.")).toBeInTheDocument();
      expect(screen.queryByLabelText(/Your website/i)).not.toBeInTheDocument();

      const output = screen.getByText("Thank you.").closest("output");
      expect(output).toHaveAttribute("aria-live", "polite");
    });
  });
});
