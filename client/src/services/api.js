import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'https://rps-online-h2c8.onrender.com/api',
  withCredentials: true, 
  headers: {
    'Content-Type': 'application/json',
  },
});

export default apiClient;