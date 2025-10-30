"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import type { FundingProgram } from "@/services/fundingPlatformService";
import { PAGES } from "@/utilities/pages";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface FundingOpportunityCardProps {
  program: FundingProgram;
  isFeatured?: boolean;
}

function formatCurrency(amount: string | undefined): string {
  if (!amount) return "TBD";
  const num = parseFloat(amount);
  if (num >= 1000000) return `$${(num / 1000000).toFixed(0)}M`;
  if (num >= 1000) return `$${(num / 1000).toFixed(0)}k`;
  return `$${num.toFixed(0)}`;
}

function getProgramStatus(program: FundingProgram): {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
  endsSoon: boolean;
} {
  const endsAt = program.metadata?.endsAt;
  const isEnabled = program.applicationConfig?.isEnabled;
  
  if (!isEnabled) {
    return { label: "Closed", variant: "secondary", endsSoon: false };
  }

  if (endsAt) {
    const daysUntilEnd = Math.ceil(
      (new Date(endsAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysUntilEnd <= 7 && daysUntilEnd > 0) {
      return { label: "Ends soon", variant: "destructive", endsSoon: true };
    }
  }

  return { label: "Open for Applications", variant: "default", endsSoon: false };
}

export function FundingOpportunityCard({ 
  program, 
  isFeatured = false 
}: FundingOpportunityCardProps) {
  const status = getProgramStatus(program);
  const title = program.metadata?.title || program.name;
  const budget = program.metadata?.programBudget;
  const communityName = program.communityName || program.communitySlug || "Unknown";
  const communityImage = program.communityImage || program.metadata?.logoImg;
  const applyUrl = program.communitySlug 
    ? PAGES.COMMUNITY.FUNDING_PLATFORM_APPLY(program.communitySlug, program.programId)
    : "#";

  if (isFeatured) {
    // Mobile featured card with gradient background
    return (
      <Card className="relative overflow-hidden border-0">
        <div 
          className="absolute inset-0 bg-gradient-to-b from-blue-900 via-purple-900 to-blue-800"
          style={{
            backgroundImage: "linear-gradient(to bottom, rgba(30, 58, 138, 0.9), rgba(88, 28, 135, 0.9), rgba(30, 64, 175, 0.9))"
          }}
        />
        <CardContent className="relative p-6 md:p-8 min-h-[400px] flex flex-col justify-between">
          {/* Top section */}
          <div className="flex items-start justify-between mb-4">
            <Badge 
              variant="secondary" 
              className="bg-green-100 text-green-800 border-green-200 flex items-center gap-1.5"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-green-600" />
              Apply now
            </Badge>
            {status.endsSoon && (
              <div className="flex items-center gap-1.5 text-white text-sm font-medium">
                <Clock className="w-4 h-4" />
                {status.label}
              </div>
            )}
          </div>

          {/* Title section */}
          <div className="flex-1 flex flex-col justify-center mb-6">
            <div className="relative">
              {/* Layered text effect */}
              <div className="absolute inset-0 opacity-20">
                <h3 className="text-5xl md:text-6xl font-bold text-white leading-none">
                  {title.split(" ")[0]}
                </h3>
              </div>
              <h3 className="text-4xl md:text-5xl font-bold text-white leading-tight relative z-10">
                {title}
              </h3>
            </div>
            {program.metadata?.description && (
              <p className="text-white/80 text-sm mt-2">
                {program.metadata.description.substring(0, 100)}...
              </p>
            )}
          </div>

          {/* Bottom section */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {communityImage && (
                <Image
                  src={communityImage}
                  alt={communityName}
                  width={24}
                  height={24}
                  className="rounded-full"
                />
              )}
              <span className="text-white text-sm font-medium">{communityName.toUpperCase()}</span>
            </div>
            <div className="text-right">
              <div className="text-white text-lg font-bold">{formatCurrency(budget)}</div>
              <div className="text-white/70 text-xs">Available</div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Desktop card (3-card layout)
  return (
    <Card className="h-full flex flex-col">
      <CardContent className="p-6 flex flex-col h-full">
        {/* Top section */}
        <div className="flex items-start justify-between mb-4">
          <Badge 
            variant={status.variant === "default" ? "default" : "secondary"}
            className={cn(
              status.variant === "default" && "bg-teal-100 text-teal-800 border-teal-200"
            )}
          >
            {status.label}
          </Badge>
          <div className="text-right">
            <div className="text-lg font-bold text-foreground">{formatCurrency(budget)}</div>
            <div className="text-xs text-muted-foreground">Available</div>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-foreground mb-4 flex-1">
          {title}
        </h3>

        {/* Bottom section */}
        <div className="flex items-center justify-between mt-auto">
          <div className="flex items-center gap-2">
            {communityImage && (
              <Image
                src={communityImage}
                alt={communityName}
                width={20}
                height={20}
                className="rounded-full"
              />
            )}
            <span className="text-sm text-foreground">{communityName}</span>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            asChild
            className="border-border"
          >
            <Link href={applyUrl}>Apply now</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

