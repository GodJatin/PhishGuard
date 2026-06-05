export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
  },
  SCAN: {
    RULE_BASED: '/scan/rule-based',
    ML: '/scan/ml',
    COMPARISON: '/scan/comparison',
    STATUS: (id: string) => `/scan/${id}/status`,
  },
  HISTORY: {
    GET_ALL: '/history',
  },
  ANALYTICS: {
    OVERVIEW: '/analytics/overview',
    TRENDS: '/analytics/trends',
    KEYWORDS: '/analytics/keywords',
    RECENT_THREATS: '/analytics/recent-threats',
  },
  REPORTS: {
    EXPORT_PDF: (id: string) => `/reports/export/pdf/${id}`,
    EXPORT_JSON: (id: string) => `/reports/export/json/${id}`,
    EXPORT_TXT: (id: string) => `/reports/export/txt/${id}`,
    GUEST_PDF: '/reports/export/pdf',
    GUEST_JSON: '/reports/export/json',
    GUEST_TXT: '/reports/export/txt',
  },
  QR: {
    DECODE: '/qr/decode',
  }
};

