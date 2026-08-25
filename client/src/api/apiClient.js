import axios from 'axios';

const apiClient = axios.create({
  baseURL: '/api',
  timeout: 45000, // Extended 45s timeout to handle LLM generations smoothly
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request Interceptor: Attach JWT Token if present
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Uniform error extraction
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    let errorMessage = 'Network error or server unreachable.';
    if (error.code === 'ECONNABORTED') {
      errorMessage = 'Request timed out while connecting to server. Please try again.';
    } else if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    }

    const customError = {
      message: errorMessage,
      status: error.response?.status || 500,
      errorCode: error.response?.data?.errorCode || 'NETWORK_ERROR'
    };
    return Promise.reject(customError);
  }
);

export default apiClient;
