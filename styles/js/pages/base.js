/* ==================================================================== */
/* Import Utilities
======================================================================= */
import { charadex } from '../utilities.js';

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
});

/* ==================================================================== */
/* Clear Cache Handler
======================================================================= */
function setupClearCacheHandler() {
  // Wait for the header to be loaded
  setTimeout(() => {
    const clearCacheButton = document.getElementById('clear-cache-btn');
    if (clearCacheButton) {
      console.log('Clear cache button found, setting up event listener...');
      // Add event listener
      clearCacheButton.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('Clear cache button clicked!');
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