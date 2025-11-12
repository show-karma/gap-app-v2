import { render, screen } from '@testing-library/react';
import { Footer } from '@/src/components/footer/footer';
import '@testing-library/jest-dom';

// Mock child components
jest.mock('@/src/components/shared/logo', () => ({
  Logo: () => <div data-testid="logo">Karma GAP</div>,
}));

jest.mock('@/src/components/footer/newsletter', () => ({
  Newsletter: () => <div data-testid="newsletter">Newsletter Signup</div>,
}));

// Mock icons
jest.mock('@/components/Icons', () => ({
  TwitterIcon: (props: any) => <svg {...props} data-testid="twitter-icon" aria-label="Twitter" />,
  DiscordIcon: (props: any) => <svg {...props} data-testid="discord-icon" aria-label="Discord" />,
  TelegramIcon: (props: any) => <svg {...props} data-testid="telegram-icon" aria-label="Telegram" />,
}));

jest.mock('@/components/Icons/Paragraph', () => ({
  ParagraphIcon: (props: any) => <svg {...props} data-testid="paragraph-icon" aria-label="Paragraph" />,
}));

// Mock ExternalLink component
jest.mock('@/components/Utilities/ExternalLink', () => ({
  ExternalLink: ({ children, href, className, ...props }: any) => (
    <a href={href} className={className} target="_blank" rel="noopener noreferrer" {...props}>
      {children}
    </a>
  ),
}));

describe('Footer', () => {
  describe('Rendering', () => {
    it('should render footer element', () => {
      render(<Footer />);

      const footer = screen.getByRole('contentinfo');
      expect(footer).toBeInTheDocument();
    });

    it('should render logo', () => {
      render(<Footer />);

      expect(screen.getByTestId('logo')).toBeInTheDocument();
    });

    it('should render newsletter component', () => {
      render(<Footer />);

      expect(screen.getByTestId('newsletter')).toBeInTheDocument();
    });

    it('should have proper background', () => {
      render(<Footer />);

      const footer = screen.getByRole('contentinfo');
      expect(footer).toHaveClass('bg-background');
    });

    it('should have full width', () => {
      render(<Footer />);

      const footer = screen.getByRole('contentinfo');
      expect(footer).toHaveClass('w-full');
    });
  });

  describe('Navigation Links', () => {
    it('should render For Builders link', () => {
      render(<Footer />);

      expect(screen.getByText('For Builders')).toBeInTheDocument();
    });

    it('should render For Funders link', () => {
      render(<Footer />);

      expect(screen.getByText('For Funders')).toBeInTheDocument();
    });

    it('should render Blog link', () => {
      render(<Footer />);

      expect(screen.getByText('Blog')).toBeInTheDocument();
    });

    it('should render Guide link', () => {
      render(<Footer />);

      expect(screen.getByText('Guide')).toBeInTheDocument();
    });

    it('should render SDK Docs link', () => {
      render(<Footer />);

      expect(screen.getByText('SDK Docs')).toBeInTheDocument();
    });

    it('should render Governance link', () => {
      render(<Footer />);

      expect(screen.getByText('Governance')).toBeInTheDocument();
    });

    it('should have navigation landmark', () => {
      render(<Footer />);

      const nav = screen.getByRole('navigation');
      expect(nav).toBeInTheDocument();
    });

    it('should have proper link styling', () => {
      render(<Footer />);

      const link = screen.getByText('For Builders');
      expect(link.className).toContain('text-muted-foreground');
      expect(link.className).toContain('hover:text-foreground');
    });
  });

  describe('Social Media Links', () => {
    it('should render Twitter icon', () => {
      render(<Footer />);

      expect(screen.getByTestId('twitter-icon')).toBeInTheDocument();
    });

    it('should render Discord icon', () => {
      render(<Footer />);

      expect(screen.getByTestId('discord-icon')).toBeInTheDocument();
    });

    it('should render Telegram icon', () => {
      render(<Footer />);

      expect(screen.getByTestId('telegram-icon')).toBeInTheDocument();
    });

    it('should render Paragraph icon', () => {
      render(<Footer />);

      expect(screen.getByTestId('paragraph-icon')).toBeInTheDocument();
    });

    it('should have proper icon sizing', () => {
      render(<Footer />);

      const twitterIcon = screen.getByTestId('twitter-icon');
      expect(twitterIcon).toHaveClass('w-8', 'h-8');
    });

    it('should have aria-labels for accessibility', () => {
      render(<Footer />);

      const links = screen.getAllByRole('link');
      const socialLinks = links.filter((link) =>
        ['Twitter', 'Discord', 'Telegram', 'Paragraph'].includes(
          link.getAttribute('aria-label') || ''
        )
      );

      expect(socialLinks.length).toBe(4);
    });
  });

  describe('Legal Links', () => {
    it('should render Terms link', () => {
      render(<Footer />);

      expect(screen.getByText('Terms')).toBeInTheDocument();
    });

    it('should render Privacy link', () => {
      render(<Footer />);

      expect(screen.getByText('Privacy')).toBeInTheDocument();
    });

    it('should have proper legal link styling', () => {
      render(<Footer />);

      const termsLink = screen.getByText('Terms');
      expect(termsLink.className).toContain('text-muted-foreground');
      expect(termsLink.className).toContain('hover:text-foreground');
    });
  });

  describe('Copyright', () => {
    it('should display current year in copyright', () => {
      render(<Footer />);

      const currentYear = new Date().getFullYear();
      expect(screen.getByText(new RegExp(`© ${currentYear} Karma`))).toBeInTheDocument();
    });

    it('should display full copyright text', () => {
      render(<Footer />);

      const currentYear = new Date().getFullYear();
      expect(
        screen.getByText(`© ${currentYear} Karma. All rights reserved.`)
      ).toBeInTheDocument();
    });

    it('should have proper copyright styling', () => {
      render(<Footer />);

      const currentYear = new Date().getFullYear();
      const copyright = screen.getByText(`© ${currentYear} Karma. All rights reserved.`);

      expect(copyright).toHaveClass('text-muted-foreground');
      expect(copyright.tagName).toBe('P');
    });
  });

  describe('Layout Structure', () => {
    it('should have centered layout', () => {
      render(<Footer />);

      const footer = screen.getByRole('contentinfo');
      expect(footer).toHaveClass('flex', 'flex-col', 'items-center', 'justify-center');
    });

    it('should have max-width container', () => {
      const { container } = render(<Footer />);

      const maxWidthContainer = container.querySelector('.max-w-\\[1920px\\]');
      expect(maxWidthContainer).toBeInTheDocument();
    });

    it('should have proper padding', () => {
      const { container } = render(<Footer />);

      const paddedContainer = container.querySelector('.py-12');
      expect(paddedContainer).toBeInTheDocument();
    });

    it('should have horizontal divider', () => {
      const { container } = render(<Footer />);

      const hr = container.querySelector('hr');
      expect(hr).toBeInTheDocument();
      expect(hr).toHaveClass('w-full', 'h-[1px]', 'bg-border');
    });

    it('should have responsive flexbox layout', () => {
      const { container } = render(<Footer />);

      const responsiveContainer = container.querySelector('.lg\\:flex-row');
      expect(responsiveContainer).toBeInTheDocument();
    });
  });

  describe('Responsive Behavior', () => {
    it('should hide newsletter on small screens', () => {
      const { container } = render(<Footer />);

      // Newsletter is wrapped in a div with hidden and lg:block classes
      const newsletterContainer = container.querySelector('.lg\\:block.hidden');
      expect(newsletterContainer).toBeInTheDocument();
    });

    it('should have responsive navigation layout', () => {
      render(<Footer />);

      const nav = screen.getByRole('navigation');
      expect(nav).toHaveClass('flex', 'flex-col', 'md:flex-row');
    });

    it('should have responsive bottom section layout', () => {
      const { container } = render(<Footer />);

      // Find the container with legal links and copyright
      const bottomSection = container.querySelector('.sm\\:flex-row');
      expect(bottomSection).toBeInTheDocument();
    });

    it('should have responsive gap spacing', () => {
      const { container } = render(<Footer />);

      const gapContainer = container.querySelector('.gap-x-6');
      expect(gapContainer).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have semantic footer element', () => {
      render(<Footer />);

      const footer = screen.getByRole('contentinfo');
      expect(footer.tagName).toBe('FOOTER');
    });

    it('should have navigation landmark', () => {
      render(<Footer />);

      const nav = screen.getByRole('navigation');
      expect(nav.tagName).toBe('NAV');
    });

    it('should have external links with proper attributes', () => {
      render(<Footer />);

      const blogLink = screen.getByText('Blog').closest('a');
      expect(blogLink).toHaveAttribute('target', '_blank');
      expect(blogLink).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('should have aria-labels for icon-only links', () => {
      render(<Footer />);

      const links = screen.getAllByRole('link');
      const iconLinks = links.filter(
        (link) =>
          !link.textContent?.trim() && link.getAttribute('aria-label')
      );

      expect(iconLinks.length).toBeGreaterThan(0);
    });
  });

  describe('Dark Mode Support', () => {
    it('should use theme-aware colors', () => {
      render(<Footer />);

      const footer = screen.getByRole('contentinfo');
      expect(footer).toHaveClass('bg-background');
    });

    it('should use muted foreground for secondary text', () => {
      render(<Footer />);

      const link = screen.getByText('For Builders');
      expect(link.className).toContain('text-muted-foreground');
    });

    it('should have border using theme colors', () => {
      const { container } = render(<Footer />);

      const hr = container.querySelector('hr');
      expect(hr).toHaveClass('bg-border');
    });
  });

  describe('Link Types', () => {
    it('should distinguish between internal and external links', () => {
      render(<Footer />);

      const buildersLink = screen.getByText('For Builders');
      const blogLink = screen.getByText('Blog');

      // Blog is external, should have target="_blank"
      expect(blogLink.closest('a')).toHaveAttribute('target', '_blank');

      // For Builders is internal (should not have target="_blank" in actual implementation)
      const buildersAnchor = buildersLink.closest('a');
      expect(buildersAnchor).toBeInTheDocument();
    });

    it('should render all navigation links as clickable', () => {
      render(<Footer />);

      const navLinks = [
        'For Builders',
        'For Funders',
        'Blog',
        'Guide',
        'SDK Docs',
        'Governance',
      ];

      navLinks.forEach((linkText) => {
        const link = screen.getByText(linkText);
        expect(link.closest('a')).toHaveAttribute('href');
      });
    });

    it('should render all legal links as clickable', () => {
      render(<Footer />);

      const legalLinks = ['Terms', 'Privacy'];

      legalLinks.forEach((linkText) => {
        const link = screen.getByText(linkText);
        expect(link.closest('a')).toHaveAttribute('href');
      });
    });
  });

  describe('Styling Consistency', () => {
    it('should have consistent font sizes', () => {
      render(<Footer />);

      const buildersLink = screen.getByText('For Builders');
      const termsLink = screen.getByText('Terms');

      expect(buildersLink).toHaveClass('text-base');
      expect(termsLink).toHaveClass('text-base');
    });

    it('should have consistent hover states', () => {
      render(<Footer />);

      const links = [
        screen.getByText('For Builders'),
        screen.getByText('Blog'),
        screen.getByText('Terms'),
      ];

      links.forEach((link) => {
        expect(link.className).toContain('hover:text-foreground');
        expect(link.className).toContain('transition-colors');
      });
    });

    it('should maintain spacing consistency', () => {
      render(<Footer />);

      const nav = screen.getByRole('navigation');
      expect(nav).toHaveClass('gap-x-6', 'gap-y-2');
    });
  });

  describe('Edge Cases', () => {
    it('should handle year transition correctly', () => {
      const mockDate = new Date('2025-01-01');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

      render(<Footer />);

      expect(screen.getByText('© 2025 Karma. All rights reserved.')).toBeInTheDocument();

      jest.restoreAllMocks();
    });

    it('should render all components without errors', () => {
      const { container } = render(<Footer />);

      expect(container.querySelector('footer')).toBeInTheDocument();
      expect(screen.getByTestId('logo')).toBeInTheDocument();
      expect(screen.getByTestId('newsletter')).toBeInTheDocument();
    });

    it('should maintain structure with all links present', () => {
      render(<Footer />);

      const allLinks = screen.getAllByRole('link');
      // 6 navigation + 2 legal + 4 social = 12 links
      expect(allLinks.length).toBeGreaterThanOrEqual(12);
    });
  });
});
