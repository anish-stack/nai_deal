import React from 'react';
import { Navigate } from 'react-router-dom';
import CryptoJS from 'crypto-js';

const SESSION_SECRET = process.env.REACT_APP_SESSION_SECRET || 'naideal-admin-session';

// Sessions expire after 12 hours instead of lasting until the tab closes.
const MAX_SESSION_AGE_MS = 12 * 60 * 60 * 1000;

const ProtectedRoute = ({ children }) => {
  const encryptedData = sessionStorage.getItem('loginData');

  let isLoggedIn = false;

  if (encryptedData) {
    try {
      const decrypted = CryptoJS.AES
        .decrypt(encryptedData, SESSION_SECRET)
        .toString(CryptoJS.enc.Utf8);

      // A wrong key decrypts to an empty string rather than throwing,
      // so check for that explicitly before parsing.
      if (decrypted) {
        const loginData = JSON.parse(decrypted);
        const fresh = !loginData.at || Date.now() - loginData.at < MAX_SESSION_AGE_MS;
        isLoggedIn = Boolean(loginData.login) && fresh;

        if (!fresh) {
          sessionStorage.removeItem('loginData');
          sessionStorage.removeItem('adminToken');
        }
      }
    } catch (error) {
      console.error('Session could not be read, signing out.');
      sessionStorage.removeItem('loginData');
    }
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
