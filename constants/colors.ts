export const colors = {
  primary: "#15445a",
  secondary: "#0da9a6",
  green: "#07a869",
  gold: "#c1b489",
  background: "#f8fafc",
  gray: "#e5e7eb",
  danger: "#dc2626",
  warning: "#d97706",
  info: "#2563eb",
  slate: "#0f172a",
} as const;

export type AppColor = keyof typeof colors;