/* ==================================================================== */
/* Authentication Module
=======================================================================

  A simple client-side authentication module using localStorage.
  This is a faux authentication system for a read-only website.
  No password required - username only.

======================================================================= */

const AUTH_STORAGE_KEY = 'pufflings_username';

export const auth = {

  /**
   * Set the current logged-in username
   * @param {string} username - The username to store
   * @returns {boolean} - Success status
   */
  setUsername(username) {
    if (!username || typeof username !== 'string') {
      console.error('Invalid username provided');
      return false;
    }

    try {
      localStorage.setItem(AUTH_STORAGE_KEY, username.trim());
      return true;
    } catch (e) {
      console.error('Failed to save username:', e);
      return false;
    }
  },

  /**
   * Get the current logged-in username
   * @returns {string|null} - The username or null if not logged in
   */
  getUsername() {
    try {
      return localStorage.getItem(AUTH_STORAGE_KEY);
    } catch (e) {
      console.error('Failed to retrieve username:', e);
      return null;
    }
  },

  /**
   * Check if a user is logged in
   * @returns {boolean} - True if logged in, false otherwise
   */
  isLoggedIn() {
    return this.getUsername() !== null;
  },

  /**
   * Log out the current user
   * @returns {boolean} - Success status
   */
  logout() {
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      return true;
    } catch (e) {
      console.error('Failed to logout:', e);
      return false;
    }
  },

  /**
   * Get the profile URL for a username
   * @param {string} username - The username (optional, uses current user if not provided)
   * @returns {string|null} - The profile URL or null if no username
   */
  getProfileUrl(username = null) {
    const user = username || this.getUsername();
    if (!user) return null;
    return `inventories.html?profile=${encodeURIComponent(user)}`;
  }

};

// Make auth globally available
window.auth = auth;
