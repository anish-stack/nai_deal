import axios from 'axios';

/**
 * THE single axios instance for the whole client app.
 *
 * Nothing else should call `axios.get(...)` directly with a hardcoded host.
 * Import this instead:
 *
 *     import api from '../api/axiosInstance';
 *     const { data } = await api.get('/admin-packages');
 *
 * Paths are relative to VITE_REACT_APP_BACKEND_URL, so switching between
 * localhost and production is a one-line .env change.
 */

const BASE_URL =
    import.meta.env.VITE_REACT_APP_BACKEND_URL || 'http://localhost:7485/api/v1';

// Origin without the /api/v1 suffix, for the few non-versioned routes.
export const API_ORIGIN =
    import.meta.env.VITE_REACT_APP_API_ORIGIN ||
    BASE_URL.replace(/\/api\/v1\/?$/, '');

const api = axios.create({
    baseURL: BASE_URL,
    timeout: 30000,
    headers: { Accept: 'application/json' },
});

/**
 * Attach whichever token the current area of the app uses.
 * Shop pages store `ShopToken`, partner pages store `B2bToken`.
 * A request can override this by setting its own Authorization header.
 */
api.interceptors.request.use(
    (config) => {
        const token =
            localStorage.getItem('ShopToken') || localStorage.getItem('B2bToken');

        if (token && !config.headers?.Authorization) {
            config.headers = config.headers || {};
            config.headers.Authorization = `Bearer ${token}`;
        }

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
    },
    (error) => Promise.reject(error)
);

/**
 * Normalise errors so callers can always read `error.message`,
 * and clear a dead session on 401 instead of looping on a stale token.
 */
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error.response?.status;

        if (status === 401) {
            const path = error.config?.url || '';
            // Don't nuke the session on the login call itself - a wrong
            // password would otherwise look like an expired session.
            const isAuthCall = /login|register|verify|forget/i.test(path);
            if (!isAuthCall) {
                localStorage.removeItem('ShopToken');
                localStorage.removeItem('ShopUser');
                localStorage.removeItem('B2bToken');
            }
        }

        error.message =
            error.response?.data?.message ||
            error.response?.data?.msg ||
            error.response?.data?.error ||
            (error.code === 'ECONNABORTED'
                ? 'The server took too long to respond. Please try again.'
                : error.message) ||
            'Something went wrong. Please try again.';

        return Promise.reject(error);
    }
);

/** Auth header helper for the rare call that needs an explicit token. */
export const authHeader = (token) => ({
    headers: { Authorization: `Bearer ${token}` },
});

export default api;
