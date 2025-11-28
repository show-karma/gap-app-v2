import { SquareCheckBig } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeImage } from "@/src/components/ui/theme-image";
import { marketingLayoutTheme } from "@/src/helper/theme";
import { cn } from "@/utilities/tailwind";

interface FeatureCardProps {
  title: string;
  description: string;
  image: string;
  checklist?: string[];
  size?: "default" | "double";
  imageSize?: "small" | "medium" | "large";
  imageWidth?: number;
  imageHeight?: number;
  imagePosition?: "top" | "bottom";
}

function FeatureCard({
  title,
  description,
  image,
  checklist,
  size = "default",
  imageSize = "medium",
  imageWidth,
  imageHeight,
  imagePosition = "top",
}: FeatureCardProps) {
  const hasChecklist = checklist && checklist.length > 0;
  const isDouble = size === "double";

  // Different image heights based on imageSize prop - reduced heights
  const imageHeightClasses = {
    small: "h-[120px] lg:h-[140px]",
    medium: "h-[160px] lg:h-[180px]",
    large: "h-[200px] lg:h-[220px]",
  };

  // Use custom dimensions if provided, otherwise use imageSize classes
  const imageStyle =
    imageWidth && imageHeight
      ? { width: `${imageWidth}px`, height: `${imageHeight}px` }
      : undefined;

  return (
    <Card
      className={cn(
        "bg-secondary flex flex-col shadow-sm border-none overflow-hidden",
        "h-[377px] lg:h-auto",
        isDouble ? "lg:col-span-2" : ""
      )}
    >
      <CardContent className="p-5 lg:p-0 flex flex-col h-full">
        {hasChecklist ? (
          // Side-by-side layout for cards with checklists (image on right)
          <div className="flex flex-col lg:flex-row lg:items-start gap-6 h-full">
            {/* Left side - Text content */}
            <div className="flex flex-col justify-between gap-4 lg:w-1/2 px-5 pt-5 pb-5 lg:pl-5 lg:pr-0 h-full">
              {/* Title and description together */}
              <div className="flex flex-col gap-1">
                <h3 className="text-sm font-semibold text-foreground">{title}</h3>
                <p className="text-sm font-medium text-muted-foreground leading-relaxed">
                  {description}
                </p>
              </div>
              <ul className="hidden lg:flex flex-col gap-3">
                {checklist.map((item, index) => (
                  <li key={index} className="flex items-start gap-2.5">
                    <SquareCheckBig className="w-3 h-3 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <span className="text-xs font-medium text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            {/* Right side - Image */}
            {image && (
              <div className="flex items-center justify-center flex-shrink-0 lg:w-1/2 lg:h-full h-[200px] overflow-hidden">
                <div className="relative w-full h-full">
                  <ThemeImage
                    src={image}
                    alt={title}
                    fill
                    className="object-contain lg:object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          // Stacked layout: Image position controlled by imagePosition prop
          <div className="flex flex-col justify-between gap-2 h-full">
            {imagePosition === "bottom" ? (
              <>
                {/* Text content on top (image on bottom) */}
                <div className="flex flex-col gap-1 w-full px-5 pt-5 pb-0">
                  <h3 className="text-sm font-semibold text-foreground">{title}</h3>
                  <p className="text-sm font-medium text-muted-foreground leading-relaxed">
                    {description}
                  </p>
                </div>
                {/* Image on bottom */}
                {image && (
                  <div className="flex items-center justify-center w-full overflow-hidden">
                    <div
                      className={cn(
                        "relative",
                        imageStyle ? "" : "w-full",
                        imageStyle ? "" : imageHeightClasses[imageSize]
                      )}
                      style={imageStyle}
                    >
                      <ThemeImage
                        src={image}
                        alt={title}
                        fill={!imageStyle}
                        width={imageWidth}
                        height={imageHeight}
                        className="object-contain lg:object-cover"
                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      />
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Image on top */}
                {image && (
                  <div className="flex items-center justify-center w-full overflow-hidden">
                    <div
                      className={cn(
                        "relative",
                        imageStyle ? "" : "w-full",
                        imageStyle ? "" : imageHeightClasses[imageSize]
                      )}
                      style={imageStyle}
                    >
                      <ThemeImage
                        src={image}
                        alt={title}
                        fill={!imageStyle}
                        width={imageWidth}
                        height={imageHeight}
                        className="object-contain lg:object-cover"
                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      />
                    </div>
                  </div>
                )}
                {/* Text content below (image on top) */}
                <div className="flex flex-col gap-1 w-full px-5 pt-0 pb-5">
                  <h3 className="text-sm font-semibold text-foreground">{title}</h3>
                  <p className="text-sm font-medium text-muted-foreground leading-relaxed">
                    {description}
                  </p>
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const features = [
  {
    title: "Onchain Project Profile",
    description:
      "Create a comprehensive project profile and showcase your work across multiple funding programs, share updates and build reputation onchain.",
    image: "/images/homepage/builder-features-01.png",
    imageSize: "large" as const,
    size: "default" as const,
    imageWidth: 230,
    imageHeight: 146,
  },
  {
    title: "Multi-Program Participation",
    description:
      "Link your project to multiple grant rounds, hackathons, and retro funding programs — all under one profile.",
    image: "/images/homepage/builder-features-02.png",
    imageSize: "medium" as const,
    size: "default" as const,
    imagePosition: "bottom" as const,
  },
  {
    title: "Direct Funding & Donations",
    description:
      "Accept funding directly on your project page through fiat and onchain payments or ecosystem grant disbursals.",
    image: "/images/homepage/builder-features-03.png",
    checklist: [
      "Accept fiat donations",
      "Support for multiple chains and tokens",
      "Track and manage payouts",
    ],
    imageSize: "large" as const,
    size: "double" as const,
  },
  {
    title: "Impact Measurement",
    description:
      "Automatically track activity from GitHub, smart contracts, and other sources by easily linking your repos and contracts.",
    image: "/images/homepage/builder-features-04.png",
    imageSize: "small" as const,
    size: "default" as const,
  },
  {
    title: "Milestones & Updates",
    description:
      "Build your onchain reputation by documenting progress and milestones through Karma's GAP protocol.",
    image: "/images/homepage/builder-features-05.png",
    checklist: ["Add project deliverables", "Add custom metrics to show impact"],
    imageSize: "medium" as const,
    size: "double" as const,
  },
  {
    title: "Endorsements & Reputation",
    description:
      "Receive onchain endorsements from supporters, funders, and collaborators that strengthen your credibility.",
    image: "/images/homepage/builder-features-06.png",
    imageSize: "medium" as const,
    size: "default" as const,
  },
];

export function PlatformFeatures() {
  return (
    <section className={cn(marketingLayoutTheme.padding, "py-16 w-full")}>
      {/* Header */}
      <div className="flex flex-col items-start gap-4 mb-12">
        <Badge variant="secondary">Our Platform</Badge>
        <h2 className={cn("section-title text-foreground max-w-4xl")}>
          Karma connects builders <br />
          <span>to funding opportunities</span>
        </h2>
        <p className="text-base md:text-lg text-muted-foreground max-w-3xl">
          We support builders across their lifecycle to access funding opportunities, grow their
          reputation and track their progress easily.
        </p>
      </div>

      {/* Feature Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {features.map((feature, index) => (
          <FeatureCard
            key={index}
            title={feature.title}
            description={feature.description}
            image={feature.image}
            checklist={feature.checklist}
            imageSize={feature.imageSize}
            size={feature.size}
            imageWidth={feature.imageWidth}
            imageHeight={feature.imageHeight}
            imagePosition={feature.imagePosition}
          />
        ))}
      </div>
    </section>
  );
}
