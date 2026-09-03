import axios from 'axios';

/**
 * THE single axios instance for the whole admin app.
 *
 *     import api from '../../api/axiosInstance';
 *     const { data } = await api.get('/all-shops');
 *
 * Paths are relative to REACT_APP_BACKEND_URL.
 */

const BASE_URL =
    process.env.REACT_APP_BACKEND_URL || 'https://api.naideal.com/api/v1';

// Origin without the /api/v1 suffix - `/admin-login` lives there.
export const API_ORIGIN =
    process.env.REACT_APP_API_ORIGIN || BASE_URL.replace(/\/api\/v1\/?$/, '');

const api = axios.create({
    baseURL: BASE_URL,
    timeout: 30000,
    headers: { Accept: 'application/json' },
});

/** Instance for the non-versioned routes mounted at the server root. */
export const rootApi = axios.create({
    baseURL: API_ORIGIN,
    timeout: 30000,
    headers: { Accept: 'application/json' },
});

const attach = (config) => {
    // Let the browser set the multipart boundary itself. Callers that
    // hardcode 'multipart/form-data' would otherwise send it without a
    // boundary, which makes multer reject the upload.
    if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
        if (typeof config.headers.delete === 'function') {
            config.headers.delete('Content-Type');
        } else {
            delete config.headers['Content-Type'];
            delete config.headers['content-type'];
        }
    }
    return config;
};

const normaliseError = (error) => {
    error.message =
        error.response?.data?.message ||
        error.response?.data?.msg ||
        error.response?.data?.error ||
        (error.code === 'ECONNABORTED'
            ? 'The server took too long to respond. Please try again.'
            : error.message) ||
        'Something went wrong. Please try again.';
    return Promise.reject(error);
};

api.interceptors.request.use(attach, (e) => Promise.reject(e));
api.interceptors.response.use((r) => r, normaliseError);

rootApi.interceptors.request.use(attach, (e) => Promise.reject(e));
rootApi.interceptors.response.use((r) => r, normaliseError);

export default api;
