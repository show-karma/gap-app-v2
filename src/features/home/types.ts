// Home feature types
export interface HomePageProps {
  // Add specific props as needed
}

export interface CommunityCardProps {
  name: string;
  description?: string;
  imageUrl?: string;
  slug: string;
}

export interface FeatureBannerProps {
  title: string;
  description: string;
  link?: string;
}