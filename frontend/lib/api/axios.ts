import axios from 'axios';

const apiURL = process.env.NEXT_PUBLIC_API_URL;

if (typeof window !== 'undefined') {
  console.log('Final Computed API URL during runtime:', apiURL);
}

const api = axios.create({
  baseURL: apiURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  if (!config.baseURL) {
    throw new Error('API Base URL (NEXT_PUBLIC_API_URL) is not defined. Please configure your environment variables.');
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
