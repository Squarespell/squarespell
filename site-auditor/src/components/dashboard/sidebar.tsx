import type { AuditReport } from '@/lib/audit/types';
import {
  Sidebar as SidebarRoot,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import {
  LayoutDashboardIcon,
  ListChecksIcon,
  TrendingUpIcon,
  GaugeIcon,
  UsersIcon,
  HistoryIcon,
  HelpCircleIcon,
  MailIcon,
  ShieldCheckIcon,
} from 'lucide-react';
import { formatDuration } from './dashboard-helpers';

export type DashboardSection = 'overview' | 'findings' | 'growth' | 'performance' | 'competitors' | 'history' | 'questions' | 'help';

const BASE_ITEMS: Array<{ key: DashboardSection; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboardIcon },
  { key: 'findings', label: 'Findings', icon: ListChecksIcon },
  { key: 'growth', label: 'Growth & Opportunities', icon: TrendingUpIcon },
  { key: 'performance', label: 'Performance', icon: GaugeIcon },
  { key: 'competitors', label: 'Competitors', icon: UsersIcon },
  { key: 'history', label: 'History', icon: HistoryIcon },
  { key: 'questions', label: 'Questions', icon: HelpCircleIcon },
  { key: 'help', label: 'Get Help', icon: MailIcon },
];

export function DashboardSidebar({
  report,
  active,
  onSelect,
}: {
  report: AuditReport;
  active: DashboardSection;
  onSelect: (s: DashboardSection) => void;
}) {
  const oppReport = report.goalAwareOpportunities ?? report.opportunities;
  const counts: Partial<Record<DashboardSection, number>> = {
    findings: report.findings.length,
    growth: oppReport?.all.length ?? 0,
    questions: report.faq?.opportunities.length ?? 0,
  };

  return (
    <SidebarRoot collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <ShieldCheckIcon className="size-5 shrink-0 text-primary" />
          <div className="flex flex-col leading-tight group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-semibold">{report.siteName || report.host}</span>
            <span className="text-xs text-muted-foreground">{report.host}</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Report</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {BASE_ITEMS.map((item) => (
                <SidebarMenuItem key={item.key}>
                  <SidebarMenuButton isActive={active === item.key} onClick={() => onSelect(item.key)}>
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                  {counts[item.key] !== undefined && <SidebarMenuBadge>{counts[item.key]}</SidebarMenuBadge>}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="flex flex-col gap-0.5 px-2 py-1.5 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
          <span>{report.coverage.pagesCrawled} pages crawled</span>
          <span>{report.coverage.checksApplicable} checks applied</span>
          <span>{formatDuration(report.coverage.durationMs)}</span>
        </div>
      </SidebarFooter>
    </SidebarRoot>
  );
}
