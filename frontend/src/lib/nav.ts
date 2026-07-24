import {
  LayoutDashboard,
  BookOpen,
  TrendingUp,
  Gamepad2,
  Hand,
  SettingsIcon,
  Play,
  Users,
  LineChart,
  ClipboardList,
  Settings
} from "lucide-react";

export interface NavItem {
  icon: any;
  label: string;
  path: string;
  active?: boolean;
  onClick?: () => void;
}

export function getTeacherNavItems(currentPath: string): NavItem[] {
  return [
    { icon: LayoutDashboard, label: "Overview", path: "/teacher", active: currentPath === "/teacher" },
    { icon: BookOpen, label: "Subjects & Content", path: "/teacher", active: currentPath === "/teacher/content" },
    { icon: Users, label: "Roster", path: "/teacher", active: currentPath.startsWith("/teacher/student") },
    { icon: LineChart, label: "Insights", path: "/teacher/insights", active: currentPath === "/teacher/insights" },
    { icon: Settings, label: "Classroom Settings", path: "/teacher", active: currentPath === "/teacher/settings" },
    { icon: SettingsIcon, label: "My Settings", path: "/settings", active: currentPath === "/settings" },
  ];
}

export function getStudentNavItems(isDeafUser: boolean, currentPath: string): NavItem[] {
  const dashboardPath = isDeafUser ? "/dashboard/visual" : "/dashboard";
  
  return [
    { icon: LayoutDashboard, label: "Dashboard", path: dashboardPath, active: currentPath === dashboardPath },
    ...(!isDeafUser ? [{ icon: Play, label: "Adaptive Quiz", path: "/consent", active: currentPath === "/consent" }] : []),
    ...(isDeafUser ? [
      { icon: Hand, label: "Sign Language", path: "/dashboard/visual/sign-language", active: currentPath.includes("sign-language") },
      { icon: ClipboardList, label: "Sign Quiz", path: "/dashboard/visual/sign-quiz", active: currentPath.includes("sign-quiz") }
    ] : []),
    { icon: BookOpen, label: "My Classroom", path: "/classroom", active: currentPath === "/classroom" },
    { icon: TrendingUp, label: "My Progress", path: "/progress", active: currentPath === "/progress" },
    ...(!isDeafUser ? [{ icon: Gamepad2, label: "AR Game", path: "/ar-game", active: currentPath === "/ar-game" }] : []),
    ...(isDeafUser ? [{ icon: Hand, label: "Sign Practice", path: "/practice/signs", active: currentPath.includes("practice/signs") }] : []),
    { icon: SettingsIcon, label: "Settings", path: "/settings", active: currentPath === "/settings" },
  ];
}
