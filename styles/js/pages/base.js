/* ==================================================================== */
/* Import Utilities
======================================================================= */
import { charadex } from '../utilities.js';
import { auth } from '../auth.js';

/* ==================================================================== */
/* Load
======================================================================= */
document.addEventListener("DOMContentLoaded", () => {
  // Start preloading critical data immediately
  charadex.preloadCriticalData();

  charadex.tools.loadIncludedFiles();
  charadex.tools.updateMeta();
  charadex.tools.loadPage('#charadex-body', 100);

  // Set up clear cache functionality
  setupClearCacheHandler();

  // Set up authentication UI
  setupAuthUI();
});

/* ==================================================================== */
/* Clear Cache Handler
======================================================================= */
function setupClearCacheHandler() {
  // Wait for the header to be loaded
  setTimeout(() => {
    const clearCacheButton = document.getElementById('clear-cache-btn');
    if (clearCacheButton) {
      // Add event listener
      clearCacheButton.addEventListener('click', (e) => {
        e.preventDefault();
        const success = charadex.tools.clearCache();
        if (success) {
          alert('Cache cleared! Refreshing page...');
          setTimeout(() => window.location.reload(), 1000);
        } else {
          alert('Failed to clear cache. Please try again.');
        }
      });
    } else {
      console.warn('Clear cache button not found');
    }
  }, 500); // Give time for the header to load
}

/* ==================================================================== */
/* Authentication UI Handler
======================================================================= */
function setupAuthUI() {
  // Wait for the header to be loaded
  setTimeout(() => {
    const userSection = document.getElementById('user-section');
    const loginSection = document.getElementById('login-section');
    const headerUsername = document.getElementById('header-username');
    const profileLink = document.getElementById('profile-link');
    const logoutBtn = document.getElementById('logout-btn');

    if (!userSection || !loginSection) {
      console.warn('Auth UI elements not found');
      return;
    }

    // Check if user is logged in
    if (auth.isLoggedIn()) {
      const username = auth.getUsername();

      // Show user section, hide login button
      userSection.style.display = '';
      loginSection.style.display = 'none';

      // Set username in header
      if (headerUsername) {
        headerUsername.textContent = username;
      }

      // Set profile link
      if (profileLink) {
        const profileUrl = auth.getProfileUrl();
        if (profileUrl) {
          profileLink.href = profileUrl;
        }
      }

      // Set up logout handler
      if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
          e.preventDefault();
          if (confirm('Are you sure you want to logout?')) {
            auth.logout();
            window.location.reload();
          }
        });
      }
    } else {
      // Show login button, hide user section
      userSection.style.display = 'none';
      loginSection.style.display = '';
    }
  }, 500); // Give time for the header to load
}