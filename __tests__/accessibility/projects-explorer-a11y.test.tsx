/**
 * Projects Explorer card accessibility tests (issue #1481).
 *
 * Root cause: ProjectCard piped the full user-authored description through the
 * default Streamdown renderer, which injects icon-only copy/download/image
 * buttons for every code block, image, and table. Inside the card's <Link>
 * those produced hundreds of blank-name buttons and invalid interactive-inside-
 * anchor nesting (WCAG 2.2 4.1.2).
 *
 * These tests render the REAL ProjectCard (which now uses the "excerpt" markdown
 * variant) against a hostile, markdown-rich description and assert it is
 * structurally impossible for interactive elements to appear inside the card.
 */

import { configure, render, screen, waitFor } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import "@testing-library/jest-dom";

// MarkdownPreview lazy-loads streamdown via real dynamic import()s; give the
// async assertions room to resolve inside the shared worker, matching the
// existing MarkdownPreview.test.tsx pattern.
beforeAll(() => configure({ asyncUtilTimeout: 5000 }));
afterAll(() => configure({ asyncUtilTimeout: 1000 }));

expect.extend(toHaveNoViolations);

vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: "light" }),
}));

vi.mock("@/styles/markdown.module.css", () => ({
  default: { wmdeMarkdown: "wmdeMarkdown-module" },
  wmdeMarkdown: "wmdeMarkdown-module",
}));

vi.mock("streamdown/styles.css", () => ({}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/Utilities/ProfilePicture", () => ({
  ProfilePicture: ({ name, alt }: { name: string; alt?: string }) => (
    <div data-testid="profile-picture">{alt || name}</div>
  ),
}));

import { ProjectCard } from "@/components/Pages/Projects/ProjectCard";
import type { Project } from "@/types/v2/project";

// A description that exercises every Streamdown chrome-injecting node type:
// code fence (copy + download buttons), image ("Download image" button),
// table (copy/download toolbar), link (nested <a>), and a task-list checkbox.
const HOSTILE_DESCRIPTION = [
  "# Project heading",
  "",
  "Some **bold** intro with a [external link](https://example.com).",
  "",
  "```ts",
  "const secret = 42;",
  "console.log(secret);",
  "```",
  "",
  "![architecture diagram](https://example.com/diagram.png)",
  "",
  "| Token | Amount |",
  "| ----- | ------ |",
  "| ETH   | 10     |",
  "| OP    | 25     |",
  "",
  "- [ ] todo item one",
  "- [x] done item two",
].join("\n");

function makeProject(): Project {
  return {
    uid: "0xabc" as `0x${string}`,
    chainID: 10,
    owner: "0xowner" as `0x${string}`,
    details: {
      title: "Hostile Markdown Project",
      description: HOSTILE_DESCRIPTION,
      slug: "hostile-markdown-project",
      tags: [],
    },
    members: [],
    createdAt: "2024-01-15T00:00:00.000Z",
  };
}

describe("ProjectCard excerpt accessibility (#1481)", () => {
  it("renders no interactive elements inside the card link, even for hostile markdown", async () => {
    const { container } = render(<ProjectCard project={makeProject()} index={0} />);

    const cardLink = screen.getByRole("link", { name: /Hostile Markdown Project/i });

    // Wait for streamdown to resolve out of the plain-text fallback.
    await waitFor(
      () => {
        expect(container.querySelector(".wmdeMarkdown")).toBeInTheDocument();
      },
      { timeout: 4000 }
    );

    // No nested anchors (the card itself is the only link).
    expect(cardLink.querySelectorAll("a").length).toBe(0);
    // No buttons whatsoever — the excerpt variant disables Streamdown controls.
    expect(cardLink.querySelectorAll("button").length).toBe(0);
    // No images — the "Download image" wrapper button class is eliminated.
    expect(cardLink.querySelectorAll("img").length).toBe(0);
    // No interactive form controls (task-list checkboxes).
    expect(cardLink.querySelectorAll("input").length).toBe(0);
  });

  it("has no axe button-name or nested-interactive violations", async () => {
    const { container } = render(<ProjectCard project={makeProject()} index={1} />);

    await waitFor(
      () => {
        expect(container.querySelector(".wmdeMarkdown")).toBeInTheDocument();
      },
      { timeout: 4000 }
    );

    const results = await axe(container, {
      rules: {
        "button-name": { enabled: true },
        "nested-interactive": { enabled: true },
        "link-name": { enabled: true },
      },
    });
    expect(results).toHaveNoViolations();
  });

  it("preserves prose typography (bold text) in the excerpt", async () => {
    const { container } = render(<ProjectCard project={makeProject()} index={2} />);

    await waitFor(
      () => {
        expect(screen.getByText("bold")).toBeInTheDocument();
      },
      { timeout: 4000 }
    );

    // Streamdown renders strong emphasis as a non-interactive element carrying
    // data-streamdown="strong"; the excerpt keeps that emphasis (it only strips
    // interactive chrome), so bold prose still reads as emphasized, not plain.
    const bold = screen.getByText("bold");
    expect(bold).toHaveAttribute("data-streamdown", "strong");
    expect(container.querySelector("button")).not.toBeInTheDocument();
  });
});
