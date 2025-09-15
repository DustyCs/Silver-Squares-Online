import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'https://silver-squares-online.onrender.com',
  withCredentials: true, 
  headers: {
    'Content-Type': 'application/json',
  },
});

export default apiClient;