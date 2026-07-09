import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Bookmark,
  CheckCircle2,
  Clock,
  Compass,
  Eye,
  FileText,
  Filter,
  Flag,
  Landmark,
  LayoutGrid,
  type LucideIcon,
  MessageSquare,
  Plus,
  RefreshCw,
  Rocket,
  Search,
  Send,
  Users,
  X,
} from "lucide-react";

/** Design icon-name → lucide component, matching the v3 prototype's icon set. */
const ICONS: Record<string, LucideIcon> = {
  search: Search,
  compass: Compass,
  file: FileText,
  message: MessageSquare,
  rocket: Rocket,
  users: Users,
  eye: Eye,
  arrow: ArrowRight,
  plus: Plus,
  refresh: RefreshCw,
  alert: AlertTriangle,
  check: CheckCircle2,
  send: Send,
  flag: Flag,
  bank: Landmark,
  clock: Clock,
  grid: LayoutGrid,
  bell: Bell,
  filter: Filter,
  close: X,
  bookmark: Bookmark,
};

export type SoftIconName = keyof typeof ICONS;

export function SoftIcon({
  name,
  className,
  style,
}: {
  name: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const Cmp = ICONS[name] ?? Compass;
  return <Cmp className={className} style={style} aria-hidden />;
}
