import { render, screen } from "@testing-library/react";
import { MilestoneCard } from "@/components/Milestone/MilestoneCard";
import type { UnifiedMilestone } from "@/types/roadmap";

// Mock Next.js dynamic imports
jest.mock("next/dynamic", () => ({
  __esModule: true,
  default: (_fn: any) => {
    const Component = (props: any) => {
      const MockedComponent = () => (
        <div data-testid="mocked-dynamic-component">{props.children}</div>
      );
      return <MockedComponent />;
    };
    Component.displayName = "DynamicComponent";
    return Component;
  },
}));

// Mock Next.js Image component
jest.mock("next/image", () => ({
  __esModule: true,
  default: ({ src, alt, width, height }: any) => (
    <img src={src} alt={alt} width={width} height={height} />
  ),
}));

// Mock ENS components
jest.mock("@/components/EthereumAddressToENSAvatar", () => ({
  __esModule: true,
  default: ({ address, className }: any) => (
    <div data-testid="ens-avatar" className={className}>
      {address}
    </div>
  ),
}));

jest.mock("@/components/EthereumAddressToENSName", () => ({
  __esModule: true,
  default: ({ address }: any) => <span data-testid="ens-name">{address}</span>,
}));

// Mock ReadMore utility
jest.mock("@/utilities/ReadMore", () => ({
  ReadMore: ({ children, side }: any) => (
    <div data-testid="read-more" data-side={side}>
      {children}
    </div>
  ),
}));

// Mock ExternalLink component
jest.mock("@/components/Utilities/ExternalLink", () => ({
  ExternalLink: ({ href, children, className }: any) => (
    <a href={href} className={className} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
}));

// Mock useMilestoneImpactAnswers hook
jest.mock("@/hooks/useMilestoneImpactAnswers", () => ({
  useMilestoneImpactAnswers: jest.fn(() => ({
    data: null,
    isLoading: false,
    error: null,
  })),
}));

// Mock formatDate utility
jest.mock("@/utilities/formatDate", () => ({
  formatDate: jest.fn((timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }),
}));

// Mock PAGES utility
jest.mock("@/utilities/pages", () => ({
  PAGES: {
    COMMUNITY: {
      ALL_GRANTS: (slug: string, programId: string) => `/community/${slug}/grants/${programId}`,
    },
  },
}));

describe("MilestoneCard", () => {
  const mockProjectMilestone = {
    uid: "milestone-123",
    title: "Test Project Milestone",
    description: "This is a test milestone description",
    completed: false,
    type: "project",
    createdAt: 1704067200000,
    endsAt: null,
    source: {
      projectMilestone: {
        uid: "pm-123",
        attester: "0x1234567890123456789012345678901234567890",
        completed: null,
      },
      grantMilestone: null,
    },
    mergedGrants: [],
  } as unknown as UnifiedMilestone;

  const mockCompletedMilestone = {
    ...mockProjectMilestone,
    completed: true,
    source: {
      projectMilestone: {
        uid: "pm-123",
        attester: "0x1234567890123456789012345678901234567890",
        completed: {
          data: {
            reason: "Milestone completed successfully",
            proofOfWork: "https://github.com/proof",
          },
        },
      },
      grantMilestone: null,
    },
  } as unknown as UnifiedMilestone;

  const mockGrantMilestone = {
    uid: "gm-456",
    title: "Test Grant Milestone",
    description: "This is a grant milestone",
    completed: false,
    type: "grant",
    createdAt: 1704067200000,
    endsAt: 1735689600,
    source: {
      projectMilestone: null,
      grantMilestone: {
        milestone: {
          uid: "gm-456",
          attester: "0x1234567890123456789012345678901234567890",
          completed: null,
        },
        grant: {
          uid: "grant-123",
          details: {
            title: "Test Grant Program",
            programId: "program-123",
          },
          community: {
            details: {
              name: "Test Community",
              slug: "test-community",
              imageURL: "https://example.com/community.jpg",
            },
          },
        },
      },
    },
    mergedGrants: [],
  } as unknown as UnifiedMilestone;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering - Basic Elements", () => {
    it("should render milestone card with title", () => {
      render(<MilestoneCard milestone={mockProjectMilestone} isAuthorized={false} />);

      expect(screen.getByText("Test Project Milestone")).toBeInTheDocument();
    });

    it("should render milestone description", () => {
      render(<MilestoneCard milestone={mockProjectMilestone} isAuthorized={false} />);

      const description = screen.getByTestId("read-more");
      expect(description).toHaveTextContent("This is a test milestone description");
    });

    it("should render milestone badge", () => {
      render(<MilestoneCard milestone={mockProjectMilestone} isAuthorized={false} />);

      expect(screen.getByText("Milestone")).toBeInTheDocument();
      expect(screen.getByAltText("Milestone")).toBeInTheDocument();
    });

    it("should render creation date and attester", () => {
      render(<MilestoneCard milestone={mockProjectMilestone} isAuthorized={false} />);

      expect(screen.getByText(/Created on/i)).toBeInTheDocument();
      expect(screen.getByText(/by$/i)).toBeInTheDocument();
      expect(screen.getByTestId("ens-avatar")).toBeInTheDocument();
      expect(screen.getByTestId("ens-name")).toBeInTheDocument();
    });
  });

  describe("Status Rendering", () => {
    it('should display "Pending" status for incomplete milestone', () => {
      render(<MilestoneCard milestone={mockProjectMilestone} isAuthorized={false} />);

      expect(screen.getByText("Pending")).toBeInTheDocument();
    });

    it('should display "Completed" status for complete milestone', () => {
      render(<MilestoneCard milestone={mockCompletedMilestone} isAuthorized={false} />);

      expect(screen.getByText("Completed")).toBeInTheDocument();
    });

    it("should apply correct styling for pending status", () => {
      render(<MilestoneCard milestone={mockProjectMilestone} isAuthorized={false} />);

      const statusBadge = screen.getByText("Pending");
      expect(statusBadge.className).toContain("bg-[#FFFAEB]");
      expect(statusBadge.className).toContain("text-[#B54708]");
    });

    it("should apply correct styling for completed status", () => {
      render(<MilestoneCard milestone={mockCompletedMilestone} isAuthorized={false} />);

      const statusBadge = screen.getByText("Completed");
      expect(statusBadge.className).toContain("bg-brand-blue");
      expect(statusBadge.className).toContain("text-white");
    });

    it("should have correct border color for completed milestone", () => {
      const { container } = render(
        <MilestoneCard milestone={mockCompletedMilestone} isAuthorized={false} />
      );

      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain("border-brand-blue");
    });

    it("should have correct border color for pending milestone", () => {
      const { container } = render(
        <MilestoneCard milestone={mockProjectMilestone} isAuthorized={false} />
      );

      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain("border-gray-300");
      expect(card.className).toContain("dark:border-zinc-400");
    });
  });

  describe("Grant Milestone Specifics", () => {
    it("should display due date for grant milestones", () => {
      render(<MilestoneCard milestone={mockGrantMilestone} isAuthorized={false} />);

      expect(screen.getByText(/Due by/i)).toBeInTheDocument();
    });

    it("should not display due date for project milestones", () => {
      render(<MilestoneCard milestone={mockProjectMilestone} isAuthorized={false} />);

      expect(screen.queryByText(/Due by/i)).not.toBeInTheDocument();
    });

    it("should display grant program link for grant milestones", () => {
      render(<MilestoneCard milestone={mockGrantMilestone} isAuthorized={false} />);

      expect(screen.getByText("Test Grant Program")).toBeInTheDocument();
      const link = screen.getByText("Test Grant Program").closest("a");
      expect(link).toHaveAttribute("href", "/community/test-community/grants/program-123");
    });

    it("should display community image for grant milestones", () => {
      render(<MilestoneCard milestone={mockGrantMilestone} isAuthorized={false} />);

      const communityImage = screen.getByAltText("Test Community");
      expect(communityImage).toBeInTheDocument();
      expect(communityImage).toHaveAttribute("src", "https://example.com/community.jpg");
    });
  });

  describe("Merged Grants Display", () => {
    it("should display multiple merged grants", () => {
      const milestoneWithMergedGrants = {
        ...mockGrantMilestone,
        mergedGrants: [
          {
            grantUID: "grant-1",
            grantTitle: "Grant Alpha",
            programId: "program-1",
            communityName: "Community A",
            communityImage: "https://example.com/a.jpg",
          },
          {
            grantUID: "grant-2",
            grantTitle: "Grant Beta",
            programId: "program-2",
            communityName: "Community B",
            communityImage: "https://example.com/b.jpg",
          },
        ],
      } as unknown as UnifiedMilestone;

      render(<MilestoneCard milestone={milestoneWithMergedGrants} isAuthorized={false} />);

      expect(screen.getByText("Grant Alpha")).toBeInTheDocument();
      expect(screen.getByText("Grant Beta")).toBeInTheDocument();
    });

    it("should sort merged grants alphabetically", () => {
      const milestoneWithUnsortedGrants = {
        ...mockGrantMilestone,
        mergedGrants: [
          {
            grantUID: "grant-1",
            grantTitle: "Zebra Grant",
            programId: "program-1",
            communityName: "Community A",
            communityImage: null,
          },
          {
            grantUID: "grant-2",
            grantTitle: "Alpha Grant",
            programId: "program-2",
            communityName: "Community B",
            communityImage: null,
          },
        ],
      } as unknown as UnifiedMilestone;

      const { container } = render(
        <MilestoneCard milestone={milestoneWithUnsortedGrants} isAuthorized={false} />
      );

      const grants = screen.getAllByText(/Grant$/);
      expect(grants[0]).toHaveTextContent("Alpha Grant");
      expect(grants[1]).toHaveTextContent("Zebra Grant");
    });
  });

  describe("Completion Information", () => {
    it("should display completion reason when milestone is completed", () => {
      render(<MilestoneCard milestone={mockCompletedMilestone} isAuthorized={false} />);

      expect(screen.getByText("Milestone completed successfully")).toBeInTheDocument();
    });

    it("should display proof of work link when available", () => {
      render(<MilestoneCard milestone={mockCompletedMilestone} isAuthorized={false} />);

      expect(screen.getByText("Proof of Work")).toBeInTheDocument();
      const proofLink = screen.getByText("https://github.com/proof");
      expect(proofLink).toHaveAttribute("href", "https://github.com/proof");
      expect(proofLink).toHaveAttribute("target", "_blank");
    });

    it("should not display completion info for incomplete milestones", () => {
      render(<MilestoneCard milestone={mockProjectMilestone} isAuthorized={false} />);

      expect(screen.queryByText(/Proof of Work/i)).not.toBeInTheDocument();
    });

    it("should handle milestone with deliverables data structure", () => {
      const milestoneWithDeliverables = {
        ...mockCompletedMilestone,
        completed: true,
        source: {
          projectMilestone: {
            uid: "pm-123",
            attester: "0x1234567890123456789012345678901234567890",
            completed: {
              data: {
                reason: "Milestone completed",
                proofOfWork: "",
                deliverables: [
                  {
                    name: "Deliverable 1",
                    description: "First deliverable",
                    proof: "https://proof1.com",
                  },
                  {
                    name: "Deliverable 2",
                    description: "Second deliverable",
                    proof: "https://proof2.com",
                  },
                ],
              },
            },
          } as any,
          grantMilestone: null,
        },
      } as unknown as UnifiedMilestone;

      // Component should render without crashing even with deliverables in data
      render(<MilestoneCard milestone={milestoneWithDeliverables} isAuthorized={false} />);

      // Verify the milestone renders successfully
      expect(screen.getByText("Test Project Milestone")).toBeInTheDocument();
      expect(screen.getByText("Milestone completed")).toBeInTheDocument();
    });
  });

  describe("URL Protocol Handling", () => {
    describe("Deliverable Proof Links", () => {
      it("should prepend https:// to deliverable proof URLs without protocol", () => {
        const milestoneWithDeliverable = {
          ...mockGrantMilestone,
          completed: true,
          source: {
            projectMilestone: null,
            grantMilestone: {
              milestone: {
                uid: "gm-456",
                attester: "0x1234567890123456789012345678901234567890",
                completed: {
                  data: {
                    reason: "Milestone completed",
                    proofOfWork: "",
                    deliverables: [
                      {
                        name: "Moviemeter",
                        description: "A movie tracking app",
                        proof: "Moviemeter.io/home", // Missing protocol
                      },
                    ],
                  },
                },
              },
              grant: {
                uid: "grant-123",
                details: {
                  title: "Test Grant Program",
                  programId: "program-123",
                },
                community: {
                  details: {
                    name: "Test Community",
                    slug: "test-community",
                    imageURL: "https://example.com/community.jpg",
                  },
                },
              },
            } as any,
          },
        } as unknown as UnifiedMilestone;

        render(<MilestoneCard milestone={milestoneWithDeliverable} isAuthorized={false} />);

        const proofLink = screen.getByText("Moviemeter.io/home");
        expect(proofLink).toHaveAttribute("href", "https://Moviemeter.io/home");
      });

      it("should not modify deliverable proof URLs that already have https://", () => {
        const milestoneWithDeliverable = {
          ...mockGrantMilestone,
          completed: true,
          source: {
            projectMilestone: null,
            grantMilestone: {
              milestone: {
                uid: "gm-456",
                attester: "0x1234567890123456789012345678901234567890",
                completed: {
                  data: {
                    reason: "Milestone completed",
                    proofOfWork: "",
                    deliverables: [
                      {
                        name: "Test Deliverable",
                        proof: "https://example.com/proof",
                      },
                    ],
                  },
                },
              },
              grant: {
                uid: "grant-123",
                details: {
                  title: "Test Grant Program",
                  programId: "program-123",
                },
                community: {
                  details: {
                    name: "Test Community",
                    slug: "test-community",
                    imageURL: "https://example.com/community.jpg",
                  },
                },
              },
            } as any,
          },
        } as unknown as UnifiedMilestone;

        render(<MilestoneCard milestone={milestoneWithDeliverable} isAuthorized={false} />);

        const proofLink = screen.getByText("https://example.com/proof");
        expect(proofLink).toHaveAttribute("href", "https://example.com/proof");
      });

      it("should not modify deliverable proof URLs that already have http://", () => {
        const milestoneWithDeliverable = {
          ...mockGrantMilestone,
          completed: true,
          source: {
            projectMilestone: null,
            grantMilestone: {
              milestone: {
                uid: "gm-456",
                attester: "0x1234567890123456789012345678901234567890",
                completed: {
                  data: {
                    reason: "Milestone completed",
                    proofOfWork: "",
                    deliverables: [
                      {
                        name: "Test Deliverable",
                        proof: "http://example.com/proof",
                      },
                    ],
                  },
                },
              },
              grant: {
                uid: "grant-123",
                details: {
                  title: "Test Grant Program",
                  programId: "program-123",
                },
                community: {
                  details: {
                    name: "Test Community",
                    slug: "test-community",
                    imageURL: "https://example.com/community.jpg",
                  },
                },
              },
            } as any,
          },
        } as unknown as UnifiedMilestone;

        render(<MilestoneCard milestone={milestoneWithDeliverable} isAuthorized={false} />);

        const proofLink = screen.getByText("http://example.com/proof");
        expect(proofLink).toHaveAttribute("href", "http://example.com/proof");
      });
    });

    describe("Proof of Work Links", () => {
      it("should prepend https:// to proof of work URLs without protocol", () => {
        const milestoneWithoutProtocol = {
          ...mockCompletedMilestone,
          source: {
            projectMilestone: {
              uid: "pm-123",
              attester: "0x1234567890123456789012345678901234567890",
              completed: {
                data: {
                  reason: "Milestone completed",
                  proofOfWork: "github.com/user/repo", // Missing protocol
                },
              },
            } as any,
            grantMilestone: null,
          },
        } as unknown as UnifiedMilestone;

        render(<MilestoneCard milestone={milestoneWithoutProtocol} isAuthorized={false} />);

        const proofLink = screen.getByText("github.com/user/repo");
        expect(proofLink).toHaveAttribute("href", "https://github.com/user/repo");
      });

      it("should not modify proof of work URLs that already have https://", () => {
        render(<MilestoneCard milestone={mockCompletedMilestone} isAuthorized={false} />);

        const proofLink = screen.getByText("https://github.com/proof");
        expect(proofLink).toHaveAttribute("href", "https://github.com/proof");
      });

      it("should not modify proof of work URLs that already have http://", () => {
        const milestoneWithHttp = {
          ...mockCompletedMilestone,
          source: {
            projectMilestone: {
              uid: "pm-123",
              attester: "0x1234567890123456789012345678901234567890",
              completed: {
                data: {
                  reason: "Milestone completed",
                  proofOfWork: "http://example.com/proof",
                },
              },
            } as any,
            grantMilestone: null,
          },
        } as unknown as UnifiedMilestone;

        render(<MilestoneCard milestone={milestoneWithHttp} isAuthorized={false} />);

        const proofLink = screen.getByText("http://example.com/proof");
        expect(proofLink).toHaveAttribute("href", "http://example.com/proof");
      });
    });

    describe("Metric Proof Links", () => {
      it("should prepend https:// to metric proof URLs without protocol", () => {
        const { useMilestoneImpactAnswers } = require("@/hooks/useMilestoneImpactAnswers");
        useMilestoneImpactAnswers.mockReturnValue({
          data: [
            {
              name: "Test Metric",
              indicator: { data: { title: "Test Indicator" } },
              datapoints: [
                {
                  value: "100",
                  proof: "example.com/metric-proof", // Missing protocol
                },
              ],
            },
          ],
        });

        const milestoneWithMetrics = {
          ...mockGrantMilestone,
          completed: true,
          source: {
            projectMilestone: null,
            grantMilestone: {
              milestone: {
                uid: "gm-456",
                attester: "0x1234567890123456789012345678901234567890",
                completed: {
                  data: {
                    reason: "Milestone completed",
                    proofOfWork: "",
                  },
                },
              },
              grant: {
                uid: "grant-123",
                details: {
                  title: "Test Grant Program",
                  programId: "program-123",
                },
                community: {
                  details: {
                    name: "Test Community",
                    slug: "test-community",
                    imageURL: "https://example.com/community.jpg",
                  },
                },
              },
            } as any,
          },
        } as unknown as UnifiedMilestone;

        render(<MilestoneCard milestone={milestoneWithMetrics} isAuthorized={false} />);

        const proofLink = screen.getByText("example.com/metric-proof");
        expect(proofLink).toHaveAttribute("href", "https://example.com/metric-proof");
      });

      it("should not modify metric proof URLs that already have https://", () => {
        const { useMilestoneImpactAnswers } = require("@/hooks/useMilestoneImpactAnswers");
        useMilestoneImpactAnswers.mockReturnValue({
          data: [
            {
              name: "Test Metric",
              indicator: { data: { title: "Test Indicator" } },
              datapoints: [
                {
                  value: "100",
                  proof: "https://example.com/metric-proof",
                },
              ],
            },
          ],
        });

        const milestoneWithMetrics = {
          ...mockGrantMilestone,
          completed: true,
          source: {
            projectMilestone: null,
            grantMilestone: {
              milestone: {
                uid: "gm-456",
                attester: "0x1234567890123456789012345678901234567890",
                completed: {
                  data: {
                    reason: "Milestone completed",
                    proofOfWork: "",
                  },
                },
              },
              grant: {
                uid: "grant-123",
                details: {
                  title: "Test Grant Program",
                  programId: "program-123",
                },
                community: {
                  details: {
                    name: "Test Community",
                    slug: "test-community",
                    imageURL: "https://example.com/community.jpg",
                  },
                },
              },
            } as any,
          },
        } as unknown as UnifiedMilestone;

        render(<MilestoneCard milestone={milestoneWithMetrics} isAuthorized={false} />);

        const proofLink = screen.getByText("https://example.com/metric-proof");
        expect(proofLink).toHaveAttribute("href", "https://example.com/metric-proof");
      });

      it("should not modify metric proof URLs that already have http://", () => {
        const { useMilestoneImpactAnswers } = require("@/hooks/useMilestoneImpactAnswers");
        useMilestoneImpactAnswers.mockReturnValue({
          data: [
            {
              name: "Test Metric",
              indicator: { data: { title: "Test Indicator" } },
              datapoints: [
                {
                  value: "100",
                  proof: "http://example.com/metric-proof",
                },
              ],
            },
          ],
        });

        const milestoneWithMetrics = {
          ...mockGrantMilestone,
          completed: true,
          source: {
            projectMilestone: null,
            grantMilestone: {
              milestone: {
                uid: "gm-456",
                attester: "0x1234567890123456789012345678901234567890",
                completed: {
                  data: {
                    reason: "Milestone completed",
                    proofOfWork: "",
                  },
                },
              },
              grant: {
                uid: "grant-123",
                details: {
                  title: "Test Grant Program",
                  programId: "program-123",
                },
                community: {
                  details: {
                    name: "Test Community",
                    slug: "test-community",
                    imageURL: "https://example.com/community.jpg",
                  },
                },
              },
            } as any,
          },
        } as unknown as UnifiedMilestone;

        render(<MilestoneCard milestone={milestoneWithMetrics} isAuthorized={false} />);

        const proofLink = screen.getByText("http://example.com/metric-proof");
        expect(proofLink).toHaveAttribute("href", "http://example.com/metric-proof");
      });
    });
  });

  describe("Authorization and Options Menu", () => {
    it("should not display options menu when not authorized", () => {
      render(<MilestoneCard milestone={mockProjectMilestone} isAuthorized={false} />);

      // The dynamic component mock would be rendered if options menu is shown
      expect(screen.queryByTestId("mocked-dynamic-component")).not.toBeInTheDocument();
    });

    it("should render for project milestone with authorization", () => {
      render(<MilestoneCard milestone={mockProjectMilestone} isAuthorized={true} />);

      // Component should render without errors
      expect(screen.getByText("Test Project Milestone")).toBeInTheDocument();
    });

    it("should render for grant milestone with authorization", () => {
      render(<MilestoneCard milestone={mockGrantMilestone} isAuthorized={true} />);

      // Component should render without errors
      expect(screen.getByText("Test Grant Milestone")).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("should handle milestone without description", () => {
      const milestoneWithoutDescription = {
        ...mockProjectMilestone,
        description: "",
      } as unknown as UnifiedMilestone;

      render(<MilestoneCard milestone={milestoneWithoutDescription} isAuthorized={false} />);

      expect(screen.queryByTestId("read-more")).not.toBeInTheDocument();
    });

    it("should handle milestone without attester", () => {
      const milestoneWithoutAttester = {
        ...mockProjectMilestone,
        source: {
          projectMilestone: {
            uid: "pm-123",
            attester: "",
            completed: null,
          },
          grantMilestone: null,
        },
      } as unknown as UnifiedMilestone;

      render(<MilestoneCard milestone={milestoneWithoutAttester} isAuthorized={false} />);

      expect(screen.getByTestId("ens-avatar")).toBeInTheDocument();
    });

    it("should handle grant milestone without community image", () => {
      const milestoneWithoutImage = {
        ...mockGrantMilestone,
        source: {
          ...mockGrantMilestone.source,
          grantMilestone: {
            ...(mockGrantMilestone.source as any).grantMilestone,
            grant: {
              ...(mockGrantMilestone.source as any).grantMilestone.grant,
              community: {
                details: {
                  name: "Test Community",
                  slug: "test-community",
                  imageURL: null,
                },
              },
            },
          },
        },
      } as unknown as UnifiedMilestone;

      render(<MilestoneCard milestone={milestoneWithoutImage} isAuthorized={false} />);

      expect(screen.getByText("Test Grant Program")).toBeInTheDocument();
    });

    it("should handle grant milestone without title", () => {
      const milestoneWithoutGrantTitle = {
        ...mockGrantMilestone,
        source: {
          ...mockGrantMilestone.source,
          grantMilestone: {
            ...(mockGrantMilestone.source as any).grantMilestone,
            grant: {
              ...(mockGrantMilestone.source as any).grantMilestone.grant,
              details: {
                title: "",
                programId: "program-123",
              },
            },
          },
        },
      } as unknown as UnifiedMilestone;

      render(<MilestoneCard milestone={milestoneWithoutGrantTitle} isAuthorized={false} />);

      // Should not render empty grant link
      expect(screen.queryByText("Test Grant Program")).not.toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have proper semantic structure", () => {
      const { container } = render(
        <MilestoneCard milestone={mockProjectMilestone} isAuthorized={false} />
      );

      const card = container.firstChild as HTMLElement;
      expect(card).toBeInTheDocument();
      expect(card.tagName).toBe("DIV");
    });

    it("should have external links with proper security attributes", () => {
      render(<MilestoneCard milestone={mockCompletedMilestone} isAuthorized={false} />);

      const proofLink = screen.getByText("https://github.com/proof");
      expect(proofLink).toHaveAttribute("target", "_blank");
      expect(proofLink).toHaveAttribute("rel", "noopener noreferrer");
    });

    it("should have alt text for milestone icon", () => {
      render(<MilestoneCard milestone={mockProjectMilestone} isAuthorized={false} />);

      const icon = screen.getByAltText("Milestone");
      expect(icon).toBeInTheDocument();
    });
  });

  describe("Dark Mode Support", () => {
    it("should have dark mode classes for card", () => {
      const { container } = render(
        <MilestoneCard milestone={mockProjectMilestone} isAuthorized={false} />
      );

      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain("dark:bg-zinc-800");
    });

    it("should have dark mode classes for text elements", () => {
      render(<MilestoneCard milestone={mockProjectMilestone} isAuthorized={false} />);

      const title = screen.getByText("Test Project Milestone");
      expect(title.className).toContain("dark:text-zinc-100");
    });
  });
});
