import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  // Logic to attach token will be added here later
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Error handling logic
    return Promise.reject(error);
  }
);

export default api;
