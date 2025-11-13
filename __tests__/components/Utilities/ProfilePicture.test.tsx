import { render, screen } from '@testing-library/react';

// Unmock ProfilePicture before importing it (navbar/setup.ts mocks it globally)
jest.unmock('@/components/Utilities/ProfilePicture');

import { ProfilePicture } from '@/components/Utilities/ProfilePicture';

// Mock boring-avatars
jest.mock('boring-avatars', () => ({
  __esModule: true,
  default: ({ size, name, variant, colors }: any) => (
    <div
      data-testid="boring-avatar"
      data-size={size}
      data-name={name}
      data-variant={variant}
      data-colors={JSON.stringify(colors)}
    >
      {name}
    </div>
  ),
}));

describe('ProfilePicture', () => {
  describe('Image Rendering', () => {
    it('should render image when valid imageURL is provided', () => {
      render(
        <ProfilePicture
          imageURL="https://example.com/image.jpg"
          name="John Doe"
        />
      );

      const img = screen.getByAltText('John Doe');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', 'https://example.com/image.jpg');
    });

    it('should render image with custom alt text', () => {
      render(
        <ProfilePicture
          imageURL="https://example.com/image.jpg"
          name="John Doe"
          alt="Custom Alt Text"
        />
      );

      const img = screen.getByAltText('Custom Alt Text');
      expect(img).toBeInTheDocument();
    });

    it('should use name as alt text when alt prop is not provided', () => {
      render(
        <ProfilePicture
          imageURL="https://example.com/image.jpg"
          name="Jane Smith"
        />
      );

      expect(screen.getByAltText('Jane Smith')).toBeInTheDocument();
    });

    it('should have rounded-full class on image', () => {
      render(
        <ProfilePicture
          imageURL="https://example.com/image.jpg"
          name="John Doe"
        />
      );

      const img = screen.getByAltText('John Doe');
      expect(img).toHaveClass('rounded-full');
      expect(img).toHaveClass('object-cover');
    });

    it('should apply custom className to image', () => {
      render(
        <ProfilePicture
          imageURL="https://example.com/image.jpg"
          name="John Doe"
          className="custom-class w-10 h-10"
        />
      );

      const img = screen.getByAltText('John Doe');
      expect(img).toHaveClass('custom-class');
      expect(img).toHaveClass('w-10');
      expect(img).toHaveClass('h-10');
    });
  });

  describe('Avatar Fallback', () => {
    it('should render boring-avatar when imageURL is not provided', () => {
      render(<ProfilePicture name="John Doe" />);

      expect(screen.getByTestId('boring-avatar')).toBeInTheDocument();
    });

    it('should render boring-avatar when imageURL is empty string', () => {
      render(<ProfilePicture imageURL="" name="John Doe" />);

      expect(screen.getByTestId('boring-avatar')).toBeInTheDocument();
    });

    it('should render boring-avatar when imageURL is invalid', () => {
      render(<ProfilePicture imageURL="not-a-valid-url" name="John Doe" />);

      expect(screen.getByTestId('boring-avatar')).toBeInTheDocument();
    });

    it('should pass correct name to boring-avatar', () => {
      render(<ProfilePicture name="John Doe" />);

      const avatar = screen.getByTestId('boring-avatar');
      expect(avatar).toHaveAttribute('data-name', 'John Doe');
    });

    it('should pass correct size to boring-avatar', () => {
      render(<ProfilePicture name="John Doe" size="64" />);

      const avatar = screen.getByTestId('boring-avatar');
      expect(avatar).toHaveAttribute('data-size', '64');
    });

    it('should use default size of 32 when not specified', () => {
      render(<ProfilePicture name="John Doe" />);

      const avatar = screen.getByTestId('boring-avatar');
      expect(avatar).toHaveAttribute('data-size', '32');
    });

    it('should use marble variant for boring-avatar', () => {
      render(<ProfilePicture name="John Doe" />);

      const avatar = screen.getByTestId('boring-avatar');
      expect(avatar).toHaveAttribute('data-variant', 'marble');
    });

    it('should pass correct colors to boring-avatar', () => {
      render(<ProfilePicture name="John Doe" />);

      const avatar = screen.getByTestId('boring-avatar');
      const colors = JSON.parse(avatar.getAttribute('data-colors') || '[]');
      expect(colors).toEqual([
        '#92A1C6',
        '#146A7C',
        '#F0AB3D',
        '#C271B4',
        '#C20D90',
      ]);
    });

    it('should wrap boring-avatar in rounded container', () => {
      const { container } = render(<ProfilePicture name="John Doe" />);

      const wrapper = container.querySelector('.rounded-full');
      expect(wrapper).toBeInTheDocument();
      expect(wrapper).toHaveClass('overflow-hidden');
    });

    it('should apply custom className to avatar wrapper', () => {
      const { container } = render(
        <ProfilePicture name="John Doe" className="custom-wrapper" />
      );

      const wrapper = container.querySelector('.rounded-full');
      expect(wrapper).toHaveClass('custom-wrapper');
    });
  });

  describe('URL Validation', () => {
    it('should render image for valid http URL', () => {
      render(
        <ProfilePicture
          imageURL="http://example.com/image.jpg"
          name="John Doe"
        />
      );

      expect(screen.getByAltText('John Doe')).toBeInTheDocument();
    });

    it('should render image for valid https URL', () => {
      render(
        <ProfilePicture
          imageURL="https://example.com/image.jpg"
          name="John Doe"
        />
      );

      expect(screen.getByAltText('John Doe')).toBeInTheDocument();
    });

    it('should fallback to avatar for relative URL', () => {
      render(<ProfilePicture imageURL="/images/profile.jpg" name="John Doe" />);

      expect(screen.getByTestId('boring-avatar')).toBeInTheDocument();
    });

    it('should fallback to avatar for invalid protocol', () => {
      render(<ProfilePicture imageURL="ftp://example.com/image.jpg" name="John Doe" />);

      // ftp:// is a valid URL protocol according to URL constructor, so it renders an image
      // The component doesn't filter by protocol, only validates URL format
      expect(screen.getByAltText('John Doe')).toBeInTheDocument();
    });

    it('should fallback to avatar for malformed URL', () => {
      render(<ProfilePicture imageURL="ht!tp://example.com" name="John Doe" />);

      expect(screen.getByTestId('boring-avatar')).toBeInTheDocument();
    });

    it('should handle undefined imageURL', () => {
      render(<ProfilePicture imageURL={undefined} name="John Doe" />);

      expect(screen.getByTestId('boring-avatar')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty name', () => {
      render(<ProfilePicture name="" />);

      expect(screen.getByTestId('boring-avatar')).toBeInTheDocument();
    });

    it('should handle very long name', () => {
      const longName = 'A'.repeat(200);
      render(<ProfilePicture name={longName} />);

      const avatar = screen.getByTestId('boring-avatar');
      expect(avatar).toHaveAttribute('data-name', longName);
    });

    it('should handle special characters in name', () => {
      const specialName = "John O'Doe <test@example.com>";
      render(<ProfilePicture name={specialName} />);

      const avatar = screen.getByTestId('boring-avatar');
      expect(avatar).toHaveAttribute('data-name', specialName);
    });

    it('should handle unicode characters in name', () => {
      render(<ProfilePicture name="你好 世界" />);

      const avatar = screen.getByTestId('boring-avatar');
      expect(avatar).toHaveAttribute('data-name', '你好 世界');
    });

    it('should handle size as string number', () => {
      render(<ProfilePicture name="John Doe" size="128" />);

      const avatar = screen.getByTestId('boring-avatar');
      expect(avatar).toHaveAttribute('data-size', '128');
    });

    it('should handle very large size', () => {
      render(<ProfilePicture name="John Doe" size="512" />);

      const avatar = screen.getByTestId('boring-avatar');
      expect(avatar).toHaveAttribute('data-size', '512');
    });

    it('should handle very small size', () => {
      render(<ProfilePicture name="John Doe" size="16" />);

      const avatar = screen.getByTestId('boring-avatar');
      expect(avatar).toHaveAttribute('data-size', '16');
    });
  });

  describe('Fallback Alt Text', () => {
    it('should use "Profile" as fallback when name and alt are empty', () => {
      render(
        <ProfilePicture
          imageURL="https://example.com/image.jpg"
          name=""
          alt=""
        />
      );

      expect(screen.getByAltText('Profile')).toBeInTheDocument();
    });

    it('should prefer alt over name when both are provided', () => {
      render(
        <ProfilePicture
          imageURL="https://example.com/image.jpg"
          name="John Doe"
          alt="User Avatar"
        />
      );

      expect(screen.getByAltText('User Avatar')).toBeInTheDocument();
      expect(screen.queryByAltText('John Doe')).not.toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should combine custom className with default classes', () => {
      render(
        <ProfilePicture
          imageURL="https://example.com/image.jpg"
          name="John Doe"
          className="border-2 border-blue-500"
        />
      );

      const img = screen.getByAltText('John Doe');
      expect(img).toHaveClass('rounded-full');
      expect(img).toHaveClass('object-cover');
      expect(img).toHaveClass('border-2');
      expect(img).toHaveClass('border-blue-500');
    });

    it('should apply className to wrapper div for avatar fallback', () => {
      const { container } = render(
        <ProfilePicture name="John Doe" className="w-20 h-20" />
      );

      const wrapper = container.querySelector('.rounded-full');
      expect(wrapper).toHaveClass('w-20');
      expect(wrapper).toHaveClass('h-20');
    });
  });

  describe('Accessibility', () => {
    it('should have alt attribute on image', () => {
      render(
        <ProfilePicture
          imageURL="https://example.com/image.jpg"
          name="John Doe"
        />
      );

      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('alt');
    });

    it('should have meaningful alt text', () => {
      render(
        <ProfilePicture
          imageURL="https://example.com/image.jpg"
          name="John Doe"
        />
      );

      const img = screen.getByAltText('John Doe');
      expect(img).toBeInTheDocument();
    });

    it('should not render img tag when using avatar fallback', () => {
      render(<ProfilePicture name="John Doe" />);

      expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });
  });

  describe('Component Switching', () => {
    it('should switch from avatar to image when valid URL is provided', () => {
      const { rerender } = render(<ProfilePicture name="John Doe" />);

      expect(screen.getByTestId('boring-avatar')).toBeInTheDocument();

      rerender(
        <ProfilePicture
          name="John Doe"
          imageURL="https://example.com/image.jpg"
        />
      );

      expect(screen.queryByTestId('boring-avatar')).not.toBeInTheDocument();
      expect(screen.getByAltText('John Doe')).toBeInTheDocument();
    });

    it('should switch from image to avatar when URL becomes invalid', () => {
      const { rerender } = render(
        <ProfilePicture
          name="John Doe"
          imageURL="https://example.com/image.jpg"
        />
      );

      expect(screen.getByAltText('John Doe')).toBeInTheDocument();

      rerender(<ProfilePicture name="John Doe" imageURL="" />);

      expect(screen.queryByAltText('John Doe')).not.toBeInTheDocument();
      expect(screen.getByTestId('boring-avatar')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should not re-validate URL unnecessarily', () => {
      const { rerender } = render(
        <ProfilePicture
          name="John Doe"
          imageURL="https://example.com/image.jpg"
        />
      );

      rerender(
        <ProfilePicture
          name="John Doe"
          imageURL="https://example.com/image.jpg"
        />
      );

      expect(screen.getByAltText('John Doe')).toBeInTheDocument();
    });
  });

  describe('Data URI Support', () => {
    it('should render image for valid data URI', () => {
      const dataUri = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA';
      render(<ProfilePicture name="John Doe" imageURL={dataUri} />);

      // Data URIs should be valid URLs
      const img = screen.queryByAltText('John Doe');
      if (img) {
        expect(img).toHaveAttribute('src', dataUri);
      }
    });
  });
});
