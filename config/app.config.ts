export const appConfig = {
  name: "منصة المدرسة الذكية",
  version: "2.0",
  description: "منصة مدرسية ذكية متعددة المدارس والصلاحيات",
  slogan: "نظام موحد يخدم منسوبي المدارس",

  locale: "ar",
  direction: "rtl",

  defaultAcademicYear: "1447هـ",
  defaultSemester: "الفصل الدراسي الأول",

  externalLinks: {
    madrasati: "https://schools.madrasati.sa/",
    noor: "https://noor.moe.gov.sa/",
    fares: "https://sshr.moe.gov.sa/",
  },

  support: {
    email: "غير متوفر",
    xAccount: "غير متوفر",
  },
} as const;
