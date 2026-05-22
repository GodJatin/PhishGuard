export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
  },
  SCAN: {
    RULE_BASED: '/scan/rule-based',
    ML: '/scan/ml',
    STATUS: (id: string) => `/scan/${id}/status`,
  },
  HISTORY: {
    GET_ALL: '/history',
  }
};
