/* ==================================================================== */
/* Import Utilities
======================================================================= */
import { charadex } from '../utilities.js';
import { auth } from '../auth.js';

/* ==================================================================== */
/* Load
======================================================================= */
document.addEventListener("DOMContentLoaded", async () => {
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

  // Load username suggestions
  await loadUsernameSuggestions();

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

  }, 500); // Give time for the page to load
}

/* ==================================================================== */
/* Load Username Suggestions
======================================================================= */
async function loadUsernameSuggestions() {
  try {
    // Fetch inventory data which contains usernames
    const inventoryData = await charadex.importSheet(charadex.sheet.pages.inventory);

    if (!inventoryData || !Array.isArray(inventoryData)) {
      console.warn('Could not load username suggestions');
      return;
    }

    // Extract unique usernames
    const usernames = new Set();
    inventoryData.forEach(item => {
      if (item.username && typeof item.username === 'string') {
        usernames.add(item.username.trim());
      }
    });

    // Sort usernames alphabetically
    const sortedUsernames = Array.from(usernames).sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase())
    );

    // Populate the datalist
    setTimeout(() => {
      const datalist = document.getElementById('username-suggestions');
      if (datalist && sortedUsernames.length > 0) {
        datalist.innerHTML = sortedUsernames
          .map(username => `<option value="${username}">`)
          .join('');
      }
    }, 500); // Give time for the page to load

  } catch (error) {
    console.error('Error loading username suggestions:', error);
  }
}
