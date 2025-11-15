/* ==================================================================== */
/* Import Utilities
======================================================================= */
import { charadex } from '../utilities.js';
import { auth } from '../auth.js';

/* ==================================================================== */
/* Load
======================================================================= */
document.addEventListener("DOMContentLoaded", () => {
  charadex.tools.loadIncludedFiles();
  charadex.tools.updateMeta();
  charadex.tools.loadPage('#charadex-body', 100);

  // If already logged in, redirect to home
  if (auth.isLoggedIn()) {
    const username = auth.getUsername();
    if (confirm(`You are already logged in as "${username}". Would you like to go to the homepage?`)) {
      window.location.href = 'index.html';
      return;
    }
  }

  // Set up login form handler
  setupLoginForm();
});

/* ==================================================================== */
/* Login Form Handler
======================================================================= */
function setupLoginForm() {
  // Wait for the form to be available
  setTimeout(() => {
    const loginForm = document.getElementById('login-form');
    const usernameInput = document.getElementById('username-input');

    if (!loginForm || !usernameInput) {
      console.warn('Login form elements not found');
      return;
    }

    // Handle form submission
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const username = usernameInput.value.trim();

      if (!username) {
        alert('Please enter a username');
        return;
      }

      // Save username
      const success = auth.setUsername(username);

      if (success) {
        // Redirect to homepage
        window.location.href = 'index.html';
      } else {
        alert('Failed to save username. Please try again.');
      }
    });

    // Optional: Load username suggestions from the data
    // This could be populated from the Google Sheets data if desired

  }, 500); // Give time for the page to load
}
