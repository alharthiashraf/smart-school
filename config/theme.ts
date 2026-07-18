export const theme = {
  colors: {
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
  },

  gradients: {
    main: "from-[#15445a] via-[#0da9a6] to-[#07a869]",
    dark: "from-slate-950 via-[#15445a] to-slate-800",
    soft: "from-slate-50 via-white to-emerald-50",
  },

  radius: {
    sm: "rounded-xl",
    md: "rounded-2xl",
    lg: "rounded-3xl",
  },

  shadow: {
    card: "shadow-sm",
    elevated: "shadow-xl",
  },
} as const;

export type ThemeColor = keyof typeof theme.colors;
