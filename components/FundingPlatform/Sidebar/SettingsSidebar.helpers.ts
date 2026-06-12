import {
  CheckCircleIcon,
  Cog6ToothIcon,
  CpuChipIcon,
  DocumentTextIcon,
  IdentificationIcon,
  UserGroupIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/24/solid";
import { Bell } from "lucide-react";
import type React from "react";
import type { SidebarTabKey } from "./SettingsSidebar";

export interface SidebarSection {
  title: string;
  items: SidebarItem[];
}

export interface SidebarItem {
  key: SidebarTabKey;
  label: string;
  icon: React.ElementType;
  required?: boolean;
  description?: string;
}

export const getSidebarSections = (
  kycEnabled: boolean,
  showNotificationConfig: boolean
): SidebarSection[] => [
  {
    title: "Setup",
    items: [
      {
        key: "program-details",
        label: "Program Details",
        icon: DocumentTextIcon,
        description: "Basic program information",
      },
      {
        key: "build",
        label: "Application Form",
        icon: WrenchScrewdriverIcon,
        required: true,
        description: "Build the application form",
      },
      {
        key: "post-approval",
        label: "Post-Approval Form",
        icon: CheckCircleIcon,
        description: "Form shown after approval",
      },
    ],
  },
  {
    title: "Team",
    items: [
      {
        key: "reviewers",
        label: "Reviewers",
        icon: UserGroupIcon,
        description: "Manage who reviews applications",
      },
    ],
  },
  {
    title: "Configuration",
    items: [
      {
        key: "settings",
        label: "Email & Privacy",
        icon: Cog6ToothIcon,
        description: "Email templates and privacy settings",
      },
      // Only show KYC settings if KYC is enabled for the community
      ...(kycEnabled
        ? [
            {
              key: "kyc-settings" as SidebarTabKey,
              label: "KYC/KYB Settings",
              icon: IdentificationIcon,
              description: "Program-specific verification URLs",
            },
          ]
        : []),
      // Notifications tab is read-only and inherits from the community config.
      // Only community admins / staff can see it; everyone else is gated out
      // (the backend also returns 403 for non-admins, but hiding the tab
      // avoids confusing dead-end UI).
      ...(showNotificationConfig
        ? [
            {
              key: "notification-config" as SidebarTabKey,
              label: "Notifications",
              icon: Bell,
              description: "View community notification settings (read-only)",
            },
          ]
        : []),
    ],
  },
  {
    title: "Advanced",
    items: [
      {
        key: "ai-config",
        label: "AI Evaluation",
        icon: CpuChipIcon,
        description: "Configure AI-powered evaluation",
      },
    ],
  },
];
