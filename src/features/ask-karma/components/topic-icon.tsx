import {
  ArrowLeftIcon,
  BarChart3Icon,
  CompassIcon,
  DollarSignIcon,
  FileTextIcon,
  InfoIcon,
  Settings2Icon,
  SparklesIcon,
  TrendingUpIcon,
  UsersIcon,
} from "lucide-react";
import type { AskKarmaTopicIcon } from "../types";

const ICON_MAP = {
  dollar: DollarSignIcon,
  "trending-up": TrendingUpIcon,
  settings: Settings2Icon,
  document: FileTextIcon,
  chart: BarChart3Icon,
  back: ArrowLeftIcon,
  sparkles: SparklesIcon,
  info: InfoIcon,
  users: UsersIcon,
  compass: CompassIcon,
} as const satisfies Record<AskKarmaTopicIcon, unknown>;

interface TopicIconProps {
  name: AskKarmaTopicIcon;
  className?: string;
}

export function TopicIcon({ name, className }: TopicIconProps) {
  const Icon = ICON_MAP[name] ?? SparklesIcon;
  return <Icon className={className} aria-hidden="true" />;
}
