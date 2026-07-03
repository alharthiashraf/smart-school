import {
  Home,
  GraduationCap,
  Users,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  ShieldCheck,
  BarChart3,
  BrainCircuit,
  FileText,
  Building2,
  Layers3,
  Settings,
} from "lucide-react";

import type { PermissionKey } from "@/constants/permissions";

export type NavigationItem = {
  title: string;
  href: string;
  icon: any;
  permission?: PermissionKey;
};

export const navigation: NavigationItem[] = [
  {
    title: "الرئيسية",
    href: "/dashboard",
    icon: Home,
  },

  {
    title: "المدارس",
    href: "/schools",
    icon: Building2,
  },

  {
    title: "المراحل",
    href: "/stages",
    icon: Layers3,
  },

  {
    title: "الطلاب",
    href: "/students",
    icon: GraduationCap,
  },

  {
    title: "المعلمون",
    href: "/teachers",
    icon: Users,
  },

  {
    title: "المواد",
    href: "/subjects",
    icon: BookOpen,
  },

  {
    title: "الحضور",
    href: "/attendance",
    icon: CalendarDays,
  },

  {
    title: "الدرجات",
    href: "/grades",
    icon: ClipboardCheck,
  },

  {
    title: "مدقق الشواهد",
    href: "/quality/evidence-auditor",
    icon: ShieldCheck,
  },

  {
    title: "التحليلات",
    href: "/analytics",
    icon: BarChart3,
  },

  {
    title: "الذكاء الاصطناعي",
    href: "/ai",
    icon: BrainCircuit,
  },

  {
    title: "التقارير",
    href: "/reports",
    icon: FileText,
  },

  {
    title: "الإعدادات",
    href: "/settings",
    icon: Settings,
  },
];