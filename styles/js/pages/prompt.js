// =============================================================
// Click-to-Reveal Dialogue System - Persistent Display
// =============================================================

document.addEventListener('DOMContentLoaded', function() {
  // Get all dialogue containers
  const dialogueContainers = document.querySelectorAll('.dialogue-container, .dialogue-container-right, .dialogue-simple');
  let currentDialogueIndex = 0;
  let endSectionsRevealed = false; // Flag to track if end sections have been revealed
  
  // Get elements
  const skipButton = document.getElementById('skip-button');
  const questSections = document.querySelectorAll('#quest-section'); // Get all elements with ID "quest-section"
  const endOfChapter = document.getElementById('end-of-prologue');
  
  // Hide all dialogues except the first one
  dialogueContainers.forEach((container, index) => {
    if (index === 0) {
      // Show first dialogue
      container.style.opacity = '1';
      container.style.transform = 'translateY(0)';
      container.style.position = 'relative';
      container.style.pointerEvents = 'auto';
      container.style.marginBottom = '1rem';
    } else {
      // Hide all other dialogues
      container.style.opacity = '0';
      container.style.transform = 'translateY(20px)';
      container.style.position = 'absolute';
      container.style.top = '0';
      container.style.left = '0';
      container.style.right = '0';
      container.style.pointerEvents = 'none';
      container.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    }
  });
  
  // Ensure the dialogue stage container has proper positioning
  const dialogueStage = document.getElementById('dialogue-stage');
  if (dialogueStage) {
    dialogueStage.style.position = 'relative';
    dialogueStage.style.minHeight = '300px';
  }
  
  // Function to show next dialogue
  function showNextDialogue() {
    if (currentDialogueIndex < dialogueContainers.length - 1) {
      // Show next dialogue (keep previous ones visible)
      currentDialogueIndex++;
      const nextContainer = dialogueContainers[currentDialogueIndex];
      nextContainer.style.opacity = '1';
      nextContainer.style.transform = 'translateY(0)';
      nextContainer.style.position = 'relative';
      nextContainer.style.pointerEvents = 'auto';
      nextContainer.style.marginBottom = '1rem';
      
      // Adjust dialogue stage height to accommodate all visible dialogues
      if (dialogueStage) {
        let totalHeight = 0;
        for (let i = 0; i <= currentDialogueIndex; i++) {
          const container = dialogueContainers[i];
          if (container.style.position === 'relative') {
            totalHeight += container.offsetHeight;
          }
        }
        const minHeight = Math.max(300, totalHeight + 100);
        dialogueStage.style.minHeight = minHeight + 'px';
      }
      
      // Scroll to center the new dialogue
      setTimeout(() => {
        nextContainer.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center',
          inline: 'nearest'
        });
      }, 100);
    } else if (currentDialogueIndex === dialogueContainers.length - 1) {
      // We're at the last dialogue, show end sections
      showEndSections();
      endSectionsRevealed = true; // Mark that end sections have been revealed
    }
  }
  
  // Function to show end sections progressively
  function showEndSections() {
    // Show all quest sections at once
    questSections.forEach(section => {
      section.style.display = 'block';
      section.style.opacity = '0';
      section.style.transform = 'translateY(20px)';
      
      setTimeout(() => {
        section.style.opacity = '1';
        section.style.transform = 'translateY(0)';
      }, 500);
    });
    
    // Show end of chapter content
    if (endOfChapter) {
      endOfChapter.style.display = 'block';
      endOfChapter.style.opacity = '0';
      endOfChapter.style.transform = 'translateY(20px)';
      
      setTimeout(() => {
        endOfChapter.style.opacity = '1';
        endOfChapter.style.transform = 'translateY(0)';
      }, 300);
    }
    
    // Adjust dialogue stage height
    if (dialogueStage) {
      dialogueStage.style.minHeight = 'auto';
    }
  }
  
  // Function to skip to the end and show quest section
  function skipToEnd() {
    // Show all dialogues
    dialogueContainers.forEach(container => {
      container.style.opacity = '1';
      container.style.transform = 'translateY(0)';
      container.style.position = 'relative';
      container.style.pointerEvents = 'auto';
      container.style.marginBottom = '1rem';
    });
    
    // Show all quest sections when skip button is clicked
    questSections.forEach(section => {
      section.style.display = 'block';
      section.style.opacity = '1';
      section.style.transform = 'translateY(0)';
    });
    
    // Show end of chapter content
    if (endOfChapter) {
      endOfChapter.style.display = 'block';
      endOfChapter.style.opacity = '1';
      endOfChapter.style.transform = 'translateY(0)';
    }
    
    // Scroll to first quest section
    if (questSections.length > 0) {
      setTimeout(() => {
        questSections[0].scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 500);
    }
    
    // Adjust dialogue stage height
    if (dialogueStage) {
      dialogueStage.style.minHeight = 'auto';
    }
  }
  
  // Add click event listener to the body
  document.body.addEventListener('click', function(e) {
    // Don't trigger if clicking on buttons, links, or within the skip button area
    if (e.target.tagName === 'BUTTON' || 
        e.target.tagName === 'A' || 
        e.target.closest('button') || 
        e.target.closest('a') ||
        e.target.closest('#skip-button')) {
      return;
    }
    
    // Don't trigger if end sections have already been revealed
    if (endSectionsRevealed) {
      return;
    }
    
    showNextDialogue();
  });
  
  // Skip button functionality
  if (skipButton) {
    skipButton.addEventListener('click', function() {
      // Show all dialogues at once
      dialogueContainers.forEach(container => {
        container.style.opacity = '1';
        container.style.transform = 'translateY(0)';
        container.style.position = 'relative';
        container.style.pointerEvents = 'auto';
        container.style.marginBottom = '1rem';
      });
      
      // Show all quest sections when skip button is clicked
      questSections.forEach(section => {
        section.style.display = 'block';
        section.style.opacity = '1';
        section.style.transform = 'translateY(0)';
      });
      
      // Show end of chapter content
      if (endOfChapter) {
        endOfChapter.style.display = 'block';
        endOfChapter.style.opacity = '1';
        endOfChapter.style.transform = 'translateY(0)';
      }
      
      // Set flag to disable further clicks
      endSectionsRevealed = true;
      
      // Scroll to first quest section
      if (questSections.length > 0) {
        setTimeout(() => {
          questSections[0].scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 500);
      }
    });
  }
  
  // Hide quest sections and end of chapter content initially
  questSections.forEach(section => {
    section.style.display = 'none';
  });
  
  if (endOfChapter) {
    endOfChapter.style.display = 'none';
  }
  
  // =============================================================
  // Scroll to Top Button Functionality
  // =============================================================
  
  const scrollToTopButton = document.getElementById('scroll-to-top');
  
  // Show/hide button based on scroll position
  window.addEventListener('scroll', function() {
    if (window.pageYOffset > 300) { // Show button after scrolling 300px
      scrollToTopButton.style.opacity = '1';
    } else {
      scrollToTopButton.style.opacity = '0';
    }
  });
  
  // Scroll to top when button is clicked
  scrollToTopButton.addEventListener('click', function() {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  });
});

// Add CSS for smooth transitions and proper layout
const style = document.createElement('style');
style.textContent = `
  #skip-button {
    position: relative;
    z-index: 1;
    margin-top: 1rem;
  }
  
  #dialogue-stage {
    position: relative;
    z-index: 1;
    margin-bottom: 1rem;
    cursor: pointer;
  }
  
  #dialogue-stage:hover {
    cursor: pointer;
  }
  
  .dialogue-container, .dialogue-container-right, .dialogue-simple {
    position: relative !important;
    z-index: 1 !important;
    margin-bottom: 1rem !important;
    transition: opacity 0.5s ease, transform 0.5s ease !important;
  }
  
  .speech-bubble, .speech-bubble-right {
    position: relative !important;
    z-index: 1 !important;
  }
  
  .speech-bubble a, .speech-bubble-right a {
    position: relative !important;
    z-index: 2 !important;
    pointer-events: auto !important;
    color: #007bff !important;
    text-decoration: underline !important;
  }
  
  .speech-bubble a:hover, .speech-bubble-right a:hover {
    color: #0056b3 !important;
  }
`;
document.head.appendChild(style);
