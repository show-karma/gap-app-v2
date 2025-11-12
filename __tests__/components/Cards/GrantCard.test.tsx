/**
 * @file Tests for GrantCard component
 * @description Tests for grant card component rendering and color picking functionality
 */

import { render, screen } from '@testing-library/react';
import { GrantCard, pickColor } from '@/components/GrantCard';
import { IGrantResponse } from '@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types';

// Mock Next.js Link component
jest.mock('next/link', () => {
  const MockLink = ({ children, href, className, ...props }: any) => (
    <a href={href} className={className} {...props}>
      {children}
    </a>
  );
  MockLink.displayName = 'MockLink';

  // Mock useLinkStatus hook
  const useLinkStatus = () => ({ pending: false });

  return {
    __esModule: true,
    default: MockLink,
    useLinkStatus,
  };
});

// Mock ProfilePicture component
jest.mock('@/components/Utilities/ProfilePicture', () => ({
  ProfilePicture: ({ imageURL, name, className, alt }: any) => (
    <div data-testid="profile-picture" className={className} aria-label={alt}>
      {name}
    </div>
  ),
}));

// Mock MarkdownPreview component
jest.mock('@/components/Utilities/MarkdownPreview', () => ({
  MarkdownPreview: ({ source }: any) => <div data-testid="markdown-preview">{source}</div>,
}));

// Mock TrackTags component
jest.mock('@/components/TrackTags', () => ({
  TrackTags: ({ communityId, trackIds }: any) => (
    <div data-testid="track-tags" data-community-id={communityId}>
      {trackIds?.map((id: string) => (
        <span key={id} data-testid={`track-${id}`}>{id}</span>
      ))}
    </div>
  ),
}));

// Mock GrantPercentage component
jest.mock('@/components/Pages/Project/Grants/components/GrantPercentage', () => ({
  GrantPercentage: ({ grant, className }: any) => (
    <div data-testid="grant-percentage" className={className}>
      75%
    </div>
  ),
}));

// Mock Spinner component
jest.mock('@/components/Utilities/Spinner', () => ({
  Spinner: () => <div data-testid="spinner">Loading...</div>,
}));

// Mock utilities
jest.mock('@/utilities/formatCurrency', () => ({
  __esModule: true,
  default: jest.fn((value: number) => value.toString()),
}));

jest.mock('@/utilities/formatDate', () => ({
  formatDate: jest.fn((date: string | number) => 'Jan 1, 2024'),
}));

jest.mock('@/utilities/pages', () => ({
  PAGES: {
    PROJECT: {
      OVERVIEW: (slug: string) => `/project/${slug}`,
    },
  },
}));

jest.mock('@/utilities/markdown', () => ({
  rewriteHeadingsToLevel: jest.fn(() => jest.fn()),
}));

describe('GrantCard', () => {
  const mockGrant = {
    uid: 'grant-123',
    refUID: 'ref-123',
    createdAt: 1704067200000,
    data: {
      communityUID: 'community-123',
    },
    details: {
      data: {
        title: 'Test Grant',
        selectedTrackIds: ['track-1', 'track-2'],
        programId: 'program-123',
      },
    } as any,
    project: {
      uid: 'project-123',
      details: {
        data: {
          title: 'Test Project',
          slug: 'test-project',
          description: 'This is a test project description for testing purposes.',
          imageURL: 'https://example.com/image.jpg',
        },
      },
    } as any,
    milestones: [
      { uid: 'milestone-1', completed: false } as any,
      { uid: 'milestone-2', completed: true } as any,
    ],
    updates: [
      { uid: 'update-1' } as any,
    ],
    categories: ['DeFi', 'Infrastructure'],
  } as unknown as IGrantResponse;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render grant card with all required elements', () => {
      render(<GrantCard grant={mockGrant} index={0} />);

      expect(screen.getByTestId('profile-picture')).toBeInTheDocument();
      expect(screen.getByText('Test Project')).toBeInTheDocument();
      expect(screen.getByText('Created on Jan 1, 2024')).toBeInTheDocument();
      expect(screen.getByTestId('markdown-preview')).toBeInTheDocument();
    });

    it('should render correct link href', () => {
      render(<GrantCard grant={mockGrant} index={0} />);

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', '/project/test-project');
    });

    it('should display milestone statistics', () => {
      render(<GrantCard grant={mockGrant} index={0} />);

      expect(screen.getByText(/2.*Milestones/i)).toBeInTheDocument();
    });

    it('should display update statistics', () => {
      render(<GrantCard grant={mockGrant} index={0} />);

      // 1 completed milestone + 1 update = 2 updates
      expect(screen.getByText(/2.*Updates/i)).toBeInTheDocument();
    });

    it('should display grant percentage', () => {
      render(<GrantCard grant={mockGrant} index={0} />);

      expect(screen.getByTestId('grant-percentage')).toBeInTheDocument();
      expect(screen.getByText('75%')).toBeInTheDocument();
    });

    it('should display categories when provided', () => {
      render(<GrantCard grant={mockGrant} index={0} />);

      expect(screen.getByText('DeFi')).toBeInTheDocument();
      expect(screen.getByText('Infrastructure')).toBeInTheDocument();
    });

    it('should display track tags when communityId and trackIds are present', () => {
      render(<GrantCard grant={mockGrant} index={0} />);

      expect(screen.getByTestId('track-tags')).toBeInTheDocument();
      expect(screen.getByTestId('track-tags')).toHaveAttribute('data-community-id', 'community-123');
    });
  });

  describe('Color Picker', () => {
    it('should apply correct color based on index', () => {
      const { container } = render(<GrantCard grant={mockGrant} index={0} />);

      const colorBar = container.querySelector('[style*="background"]');
      expect(colorBar).toBeInTheDocument();
    });

    it('pickColor function should cycle through colors', () => {
      const color0 = pickColor(0);
      const color10 = pickColor(10);
      const color0Again = pickColor(0);

      expect(color0).toBe(color0Again);
      expect(color0).toBe(color10);
    });

    it('pickColor function should return valid hex colors', () => {
      const hexColorRegex = /^#[0-9A-F]{6}$/i;

      for (let i = 0; i < 15; i++) {
        const color = pickColor(i);
        expect(color).toMatch(hexColorRegex);
      }
    });
  });

  describe('Conditional Rendering', () => {
    it('should hide statistics when hideStats is true', () => {
      render(<GrantCard grant={mockGrant} index={0} hideStats={true} />);

      expect(screen.queryByText(/Milestones/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Updates/i)).not.toBeInTheDocument();
    });

    it('should hide categories when hideCategories is true', () => {
      render(<GrantCard grant={mockGrant} index={0} hideCategories={true} />);

      expect(screen.queryByText('DeFi')).not.toBeInTheDocument();
      expect(screen.queryByText('Infrastructure')).not.toBeInTheDocument();
    });

    it('should not render track tags when trackIds are empty', () => {
      const grantWithoutTracks = {
        ...mockGrant,
        details: {
          ...mockGrant.details,
          data: {
            ...mockGrant.details?.data,
            selectedTrackIds: [],
          },
        },
      } as IGrantResponse;

      render(<GrantCard grant={grantWithoutTracks} index={0} />);

      expect(screen.queryByTestId('track-tags')).not.toBeInTheDocument();
    });

    it('should render action slot when provided', () => {
      const actionSlot = <button data-testid="action-button">Action</button>;

      render(<GrantCard grant={mockGrant} index={0} actionSlot={actionSlot} />);

      expect(screen.getByTestId('action-button')).toBeInTheDocument();
    });

    it('should not display creation date when actionSlot is provided', () => {
      const actionSlot = <button>Action</button>;

      render(<GrantCard grant={mockGrant} index={0} actionSlot={actionSlot} />);

      expect(screen.queryByText(/Created on/i)).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle grant without project details', () => {
      const grantWithoutProject = {
        ...mockGrant,
        project: undefined,
      } as unknown as IGrantResponse;

      render(<GrantCard grant={grantWithoutProject} index={0} />);

      expect(screen.getByText('grant-123')).toBeInTheDocument();
    });

    it('should handle grant without milestones', () => {
      const grantWithoutMilestones = {
        ...mockGrant,
        milestones: [],
      } as IGrantResponse;

      render(<GrantCard grant={grantWithoutMilestones} index={0} />);

      expect(screen.getByText(/0.*Milestones/i)).toBeInTheDocument();
    });

    it('should handle grant without updates', () => {
      const grantWithoutUpdates = {
        ...mockGrant,
        updates: [],
        milestones: [],
      } as IGrantResponse;

      render(<GrantCard grant={grantWithoutUpdates} index={0} />);

      expect(screen.getByText(/0.*Update/i)).toBeInTheDocument();
    });

    it('should handle grant without categories', () => {
      const grantWithoutCategories = {
        ...mockGrant,
        categories: undefined,
      } as IGrantResponse;

      render(<GrantCard grant={grantWithoutCategories} index={0} />);

      expect(screen.queryByText('DeFi')).not.toBeInTheDocument();
    });

    it('should handle empty categories array', () => {
      const grantWithEmptyCategories = {
        ...mockGrant,
        categories: [],
      } as IGrantResponse;

      render(<GrantCard grant={grantWithEmptyCategories} index={0} />);

      expect(screen.queryByText('DeFi')).not.toBeInTheDocument();
    });

    it('should use fallback slug when slug is not available', () => {
      const grantWithoutSlug = {
        ...mockGrant,
        project: {
          ...mockGrant.project,
          details: {
            data: {
              ...mockGrant.project?.details?.data,
              slug: '',
            },
          },
        },
      } as IGrantResponse;

      render(<GrantCard grant={grantWithoutSlug} index={0} />);

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', '/project/ref-123');
    });
  });

  describe('Custom Styling', () => {
    it('should apply custom card className', () => {
      const customClass = 'custom-card-class';
      const { container } = render(
        <GrantCard grant={mockGrant} index={0} cardClassName={customClass} />
      );

      const link = container.querySelector('a');
      expect(link).toHaveClass(customClass);
    });

    it('should have responsive classes', () => {
      const { container } = render(<GrantCard grant={mockGrant} index={0} />);

      const link = container.querySelector('a');
      expect(link?.className).toContain('max-sm:w-[320px]');
    });

    it('should have dark mode classes', () => {
      const { container } = render(<GrantCard grant={mockGrant} index={0} />);

      const link = container.querySelector('a');
      expect(link?.className).toContain('dark:bg-zinc-900');
    });
  });

  describe('Accessibility', () => {
    it('should have proper link role', () => {
      render(<GrantCard grant={mockGrant} index={0} />);

      expect(screen.getByRole('link')).toBeInTheDocument();
    });

    it('should have profile picture with alt text', () => {
      render(<GrantCard grant={mockGrant} index={0} />);

      const profilePic = screen.getByTestId('profile-picture');
      expect(profilePic).toHaveAttribute('aria-label', 'Test Project');
    });

    it('should truncate long project titles properly', () => {
      const grantWithLongTitle = {
        ...mockGrant,
        project: {
          ...mockGrant.project,
          details: {
            data: {
              ...mockGrant.project?.details?.data,
              title: 'This is a very long project title that should be truncated',
            },
          },
        },
      } as IGrantResponse;

      render(<GrantCard grant={grantWithLongTitle} index={0} />);

      const titleElement = screen.getByText(/This is a very long project title/i);
      expect(titleElement.className).toContain('line-clamp-1');
    });
  });

  describe('Data Display', () => {
    it('should display singular milestone text when count is 1', () => {
      const grantWithOneMilestone = {
        ...mockGrant,
        milestones: [{ uid: 'milestone-1', completed: false } as any],
      } as IGrantResponse;

      render(<GrantCard grant={grantWithOneMilestone} index={0} />);

      expect(screen.getByText(/1.*Milestone$/i)).toBeInTheDocument();
    });

    it('should display plural milestone text when count is not 1', () => {
      render(<GrantCard grant={mockGrant} index={0} />);

      expect(screen.getByText(/2.*Milestones/i)).toBeInTheDocument();
    });

    it('should truncate description to 100 characters', () => {
      const grantWithLongDescription = {
        ...mockGrant,
        project: {
          ...mockGrant.project,
          details: {
            data: {
              ...mockGrant.project?.details?.data,
              description: 'A'.repeat(200),
            },
          },
        },
      } as IGrantResponse;

      render(<GrantCard grant={grantWithLongDescription} index={0} />);

      const markdownPreview = screen.getByTestId('markdown-preview');
      expect(markdownPreview.textContent?.length).toBe(100);
    });

    it('should calculate updates correctly (completed milestones + updates)', () => {
      const grantWithMultipleUpdates = {
        ...mockGrant,
        milestones: [
          { uid: 'm1', completed: true } as any,
          { uid: 'm2', completed: true } as any,
          { uid: 'm3', completed: false } as any,
        ],
        updates: [
          { uid: 'u1' } as any,
          { uid: 'u2' } as any,
        ],
      } as IGrantResponse;

      render(<GrantCard grant={grantWithMultipleUpdates} index={0} />);

      // 2 completed milestones + 2 updates = 4 total updates
      expect(screen.getByText(/4.*Updates/i)).toBeInTheDocument();
    });
  });

  describe('programId Extraction', () => {
    it('should handle programId with chainId suffix', () => {
      const grantWithChainSuffix = {
        ...mockGrant,
        details: {
          ...mockGrant.details,
          data: {
            ...mockGrant.details?.data,
            programId: 'program-123_42',
          },
        },
      } as IGrantResponse;

      render(<GrantCard grant={grantWithChainSuffix} index={0} />);

      // Component should still render correctly
      expect(screen.getByText('Test Project')).toBeInTheDocument();
    });

    it('should handle programId without chainId suffix', () => {
      render(<GrantCard grant={mockGrant} index={0} />);

      expect(screen.getByText('Test Project')).toBeInTheDocument();
    });
  });
});
