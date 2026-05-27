import axios from 'axios';

const apiURL = process.env.NEXT_PUBLIC_API_URL;

// ── Axios Instance ────────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: apiURL,
  headers: {
    'Content-Type': 'application/json',
  },
  // 15-second global request timeout — prevents infinite hangs on cold starts
  timeout: 15000,
});

// ── Request Interceptor ───────────────────────────────────────────────────────
api.interceptors.request.use((config) => {
  if (!config.baseURL) {
    throw new Error(
      'API Base URL (NEXT_PUBLIC_API_URL) is not defined. Please configure your environment variables.'
    );
  }
  return config;
});

// ── Response Interceptor (retry on 5xx) ──────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config as any;

    // Only retry once, only on 5xx server errors or network timeouts (not 4xx client errors)
    const isServerError = error.response?.status >= 500;
    const isTimeout = error.code === 'ECONNABORTED' || error.message?.includes('timeout');
    const isNetworkError = !error.response && !isTimeout; // Total network failure

    // Avoid retrying on explicit 4xx client errors or requests that already retried
    if ((isServerError || isTimeout) && !config?._retried) {
      config._retried = true;
      // Backoff: wait 1.5 seconds before retry
      await new Promise((resolve) => setTimeout(resolve, 1500));
      return api(config);
    }

    // Normalize error message for better UX
    if (isNetworkError) {
      error.isNetworkError = true;
      error.userMessage =
        'Unable to connect to the server. Please check if the backend is running and try again.';
    } else if (isTimeout) {
      error.isTimeoutError = true;
      error.userMessage =
        'The request timed out. The server may be cold-starting — please try again in a moment.';
    } else if (isServerError) {
      error.isServerError = true;
      error.userMessage =
        'The server encountered an error. Please try again.';
    }

    return Promise.reject(error);
  }
);

export default api;

