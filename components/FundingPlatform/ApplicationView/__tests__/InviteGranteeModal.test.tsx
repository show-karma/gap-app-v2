import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import InviteGranteeModal from "../InviteGranteeModal";

const onInviteGrantee = vi.fn();
const onInvited = vi.fn();
const onClose = vi.fn();

function renderModal(existingEmails?: string[]) {
  render(
    <InviteGranteeModal
      isOpen
      onClose={onClose}
      onInviteGrantee={onInviteGrantee}
      onInvited={onInvited}
      existingEmails={existingEmails}
    />
  );
}

function submit(name: string, email: string) {
  fireEvent.change(screen.getByLabelText("Name *"), { target: { value: name } });
  fireEvent.change(screen.getByLabelText("Email *"), { target: { value: email } });
  fireEvent.click(screen.getByRole("button", { name: "Add co-applicant" }));
}

describe("InviteGranteeModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    onInviteGrantee.mockResolvedValue(undefined);
  });

  it("flags an email that is already a co-applicant without calling the API", async () => {
    renderModal(["jennifer@filoz.org"]);

    submit("Jennifer", " Jennifer@FilOz.org ");

    expect(await screen.findByText("This person is already a co-applicant.")).toBeInTheDocument();
    expect(onInviteGrantee).not.toHaveBeenCalled();
  });

  it("adds a new co-applicant", async () => {
    renderModal(["jennifer@filoz.org"]);

    submit("Natascia", "natascia@filoz.org");

    await waitFor(() =>
      expect(onInviteGrantee).toHaveBeenCalledWith({
        name: "Natascia",
        email: "natascia@filoz.org",
      })
    );
    expect(onInvited).toHaveBeenCalled();
  });
});
