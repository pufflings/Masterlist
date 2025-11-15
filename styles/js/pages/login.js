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
let allUsernames = [];

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
    allUsernames = Array.from(usernames).sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase())
    );

    // Set up the custom dropdown
    setTimeout(() => {
      setupCustomDropdown();
    }, 500); // Give time for the page to load

  } catch (error) {
    console.error('Error loading username suggestions:', error);
  }
}

/* ==================================================================== */
/* Custom Dropdown Handler
======================================================================= */
function setupCustomDropdown() {
  const input = document.getElementById('username-input');
  const dropdown = document.getElementById('username-dropdown');

  if (!input || !dropdown) {
    console.warn('Dropdown elements not found');
    return;
  }

  // Show dropdown on focus
  input.addEventListener('focus', () => {
    if (allUsernames.length > 0) {
      showFilteredUsernames('');
    }
  });

  // Filter on input
  input.addEventListener('input', (e) => {
    const searchTerm = e.target.value;
    showFilteredUsernames(searchTerm);
  });

  // Hide dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!input.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.style.display = 'none';
    }
  });

  // Function to show filtered usernames
  function showFilteredUsernames(searchTerm) {
    const filtered = allUsernames.filter(username =>
      username.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (filtered.length === 0) {
      dropdown.style.display = 'none';
      return;
    }

    // Limit to first 10 results for performance
    const limited = filtered.slice(0, 10);

    dropdown.innerHTML = limited
      .map(username => `
        <a href="#" class="list-group-item list-group-item-action" data-username="${username}">
          ${username}
        </a>
      `)
      .join('');

    // Add click handlers to dropdown items
    dropdown.querySelectorAll('.list-group-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const selectedUsername = e.target.dataset.username;
        input.value = selectedUsername;
        dropdown.style.display = 'none';
      });
    });

    dropdown.style.display = 'block';
  }
}
