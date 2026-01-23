"use client";

import {
  BookOpen,
  Building2,
  Compass,
  DollarSign,
  FileText,
  Lightbulb,
  MapPin,
  Target,
} from "lucide-react";
import type { ReactNode } from "react";
import { MarkdownPreview } from "@/components/Utilities/MarkdownPreview";
import type { Project } from "@/types/v2/project";
import { cn } from "@/utilities/tailwind";

interface AboutContentProps {
  project: Project;
  className?: string;
}

interface AboutSectionProps {
  icon: ReactNode;
  title: string;
  content: string;
  testId: string;
}

/**
 * AboutSection displays a single section with an icon, title, and markdown content.
 */
function AboutSection({ icon, title, content, testId }: AboutSectionProps) {
  return (
    <div
      className="flex flex-col gap-3 p-6 rounded-xl border border-border bg-card"
      data-testid={testId}
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      </div>
      <div className="pl-[52px]">
        <MarkdownPreview
          source={content}
          className="text-sm text-muted-foreground leading-relaxed"
        />
      </div>
    </div>
  );
}

/**
 * AboutContent displays the project's detailed information:
 * - Description
 * - Mission
 * - Problem
 * - Solution
 * - Business Model
 * - Path to Success
 * - Location of Impact
 * - Total Funds Raised
 *
 * This component renders the content for the "About" tab on the project profile page.
 */
export function AboutContent({ project, className }: AboutContentProps) {
  const details = project?.details;

  // Define all possible sections with their metadata
  const sections: Array<{
    key: string;
    icon: ReactNode;
    title: string;
    content: string | undefined;
    testId: string;
  }> = [
    {
      key: "description",
      icon: <FileText className="w-5 h-5" />,
      title: "Description",
      content: details?.description,
      testId: "about-section-description",
    },
    {
      key: "mission",
      icon: <Target className="w-5 h-5" />,
      title: "Mission",
      content: details?.missionSummary,
      testId: "about-section-mission",
    },
    {
      key: "problem",
      icon: <Lightbulb className="w-5 h-5" />,
      title: "Problem",
      content: details?.problem,
      testId: "about-section-problem",
    },
    {
      key: "solution",
      icon: <Compass className="w-5 h-5" />,
      title: "Solution",
      content: details?.solution,
      testId: "about-section-solution",
    },
    {
      key: "businessModel",
      icon: <Building2 className="w-5 h-5" />,
      title: "Business Model",
      content: details?.businessModel,
      testId: "about-section-business-model",
    },
    {
      key: "pathToSuccess",
      icon: <BookOpen className="w-5 h-5" />,
      title: "Path to Success",
      content: details?.pathToTake,
      testId: "about-section-path-to-success",
    },
    {
      key: "locationOfImpact",
      icon: <MapPin className="w-5 h-5" />,
      title: "Location of Impact",
      content: details?.locationOfImpact,
      testId: "about-section-location",
    },
    {
      key: "fundsRaised",
      icon: <DollarSign className="w-5 h-5" />,
      title: "Total Funds Raised",
      content: details?.raisedMoney,
      testId: "about-section-funds-raised",
    },
  ];

  // Filter out sections that don't have content
  const activeSections = sections.filter((section) => section.content?.trim());

  // Check if there's any content to display
  if (activeSections.length === 0) {
    return (
      <div
        className={cn("flex flex-col items-center justify-center py-12", className)}
        data-testid="about-content-empty"
      >
        <FileText className="w-12 h-12 text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground text-center">
          No additional information available for this project.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-4", className)} data-testid="about-content">
      {activeSections.map((section) => (
        <AboutSection
          key={section.key}
          icon={section.icon}
          title={section.title}
          content={section.content!}
          testId={section.testId}
        />
      ))}
    </div>
  );
}
