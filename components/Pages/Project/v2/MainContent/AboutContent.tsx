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
import { Fragment, type ReactNode } from "react";
import { MarkdownPreview } from "@/components/Utilities/MarkdownPreview";
import type { Project } from "@/types/v2/project";
import { cn } from "@/utilities/tailwind";
import { TeamContent } from "../TeamContent/TeamContent";

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

function AboutSection({ icon, title, content, testId }: AboutSectionProps) {
  const sectionId = testId.replace("about-section-", "");

  return (
    <div id={sectionId} className="px-10 py-9 scroll-mt-64" data-testid={testId}>
      <div className="flex items-center gap-3 mb-5">
        <span className="text-muted-foreground">{icon}</span>
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      </div>
      <MarkdownPreview source={content} className="text-sm text-muted-foreground leading-relaxed" />
    </div>
  );
}

/**
 * AboutContent displays project details as a single doc-style card.
 * All sections live inside one white card with separators between them.
 */
export function AboutContent({ project, className }: AboutContentProps) {
  const details = project?.details;

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

  const activeSections = sections.filter((section) => section.content?.trim());

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
    <div className={cn("flex flex-col gap-8", className)} data-testid="about-content">
      {/* Doc-style card */}
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-background overflow-hidden shadow-inner">
        {activeSections.map((section, index) => (
          <Fragment key={section.key}>
            {index > 0 && <div className="h-px bg-border dark:bg-neutral-800 mx-10" />}
            <AboutSection
              icon={section.icon}
              title={section.title}
              content={section.content!}
              testId={section.testId}
            />
          </Fragment>
        ))}
      </div>

      {/* Team at the bottom */}
      <TeamContent />
    </div>
  );
}
