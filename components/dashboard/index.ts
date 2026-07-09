export { default as CommandCenter } from "./CommandCenter";
export { default as CommandMetric } from "./CommandMetric";
export { default as MiniMetric } from "./MiniMetric";

export { default as ChartBar } from "./ChartBar";
export { default as AttendanceTrend } from "./AttendanceTrend";
export { default as ActionCard } from "./ActionCard";
export { default as PortalLink } from "./PortalLink";
export { default as ExternalSystemCard } from "./ExternalSystemCard";

export { default as ExecutiveHero } from "./executive/ExecutiveHero";
export { default as ExecutiveStats } from "./executive/ExecutiveStats";
export { default as ExecutiveCharts } from "./executive/ExecutiveCharts";
export { default as ExecutiveHealth } from "./executive/ExecutiveHealth";

export { default as SmartInsights } from "./insights/SmartInsights";
export { default as ActivityFeed } from "./insights/ActivityFeed";
export { default as PendingTasks } from "./insights/PendingTasks";
export { default as UpcomingEvents } from "./insights/UpcomingEvents";

export { default as QuickLauncher } from "./quick-actions/QuickLauncher";
export { default as PortalGrid } from "./portals/PortalGrid";
export { default as PortalCard } from "./portals/PortalCard";

export { default as ExternalSystems } from "./systems/ExternalSystems";

export { default as AttendanceChart } from "./charts/AttendanceChart";
export { default as GradeChart } from "./charts/GradeChart";
export { default as BehaviorChart } from "./charts/BehaviorChart";

export type { QuickAction } from "./ActionCard";
export type { AttendanceTrendItem } from "./AttendanceTrend";
export type { PortalCard as PortalCardType } from "./PortalLink";
export type { ExternalSystem } from "./ExternalSystemCard";

export type {
  SmartInsightItem,
  SmartInsightTone,
} from "./insights/SmartInsights";

export type {
  ActivityFeedItem,
  ActivityTone,
} from "./insights/ActivityFeed";

export type { PendingTask } from "./insights/PendingTasks";
export type { UpcomingEvent } from "./insights/UpcomingEvents";
export type { AttendanceChartItem } from "./charts/AttendanceChart";