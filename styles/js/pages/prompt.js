// =============================================================
// Generic Dialogue Navigation System
// =============================================================

document.addEventListener('DOMContentLoaded', function() {
  // Get all dialogue containers
  const dialogueContainers = document.querySelectorAll('.dialogue-container, .dialogue-container-right, .dialogue-simple');
  let currentDialogueIndex = 0;
  
  // Get navigation elements (all optional)
  const prevButton = document.getElementById('prev-button');
  const nextButton = document.getElementById('next-button');
  const restartButton = document.getElementById('restart-button');
  const skipButton = document.getElementById('skip-button');
  const dialogueCounter = document.getElementById('dialogue-counter');
  const totalDialoguesSpan = document.getElementById('total-dialogues');
  const questSection = document.getElementById('quest-section');
  const endOfChapter = document.getElementById('end-of-prologue'); // Generic name for end-of-chapter content
  
  // Set total dialogues count
  const totalDialogues = dialogueContainers.length;
  if (totalDialoguesSpan) {
    totalDialoguesSpan.textContent = totalDialogues;
  }
  
  // Add initial hidden state to all dialogues
  dialogueContainers.forEach(container => {
    container.style.opacity = '0';
    container.style.transform = 'translateY(20px)';
    container.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    container.style.position = 'absolute';
    container.style.top = '0';
    container.style.left = '0';
    container.style.right = '0';
    container.style.pointerEvents = 'none'; // Disable pointer events when hidden
  });
  
  // Ensure the dialogue stage container has relative positioning
  const dialogueStage = document.getElementById('dialogue-stage');
  if (dialogueStage) {
    dialogueStage.style.position = 'relative';
    dialogueStage.style.minHeight = '300px'; // Increased minimum height
  }
  
  // Function to show a specific dialogue
  function showDialogue(index) {
    // Hide all dialogues first
    dialogueContainers.forEach(container => {
      container.style.opacity = '0';
      container.style.transform = 'translateY(20px)';
      container.style.position = 'absolute';
      container.style.top = '0';
      container.style.left = '0';
      container.style.right = '0';
      container.style.pointerEvents = 'none'; // Disable pointer events when hidden
    });
    
    // Show the current dialogue
    if (index >= 0 && index < dialogueContainers.length) {
      const container = dialogueContainers[index];
      container.style.opacity = '1';
      container.style.transform = 'translateY(0)';
      container.style.position = 'relative';
      container.style.pointerEvents = 'auto'; // Enable pointer events when visible
      
      // Add a subtle animation to the speech bubble
      const speechBubble = container.querySelector('.speech-bubble, .speech-bubble-right');
      if (speechBubble) {
        speechBubble.style.animation = 'dialogueReveal 0.3s ease 0.2s both';
      }
      
      // Adjust dialogue stage height based on current dialogue content
      if (dialogueStage) {
        const containerHeight = container.offsetHeight;
        const minHeight = Math.max(300, containerHeight + 100); // Increased padding
        dialogueStage.style.minHeight = minHeight + 'px';
        
        // Force a reflow to ensure proper layout
        dialogueStage.offsetHeight;
      }
    }
    
    // Update counter
    if (dialogueCounter) {
      dialogueCounter.textContent = `${index + 1} of ${totalDialogues}`;
    }
    
    // Update button states
    if (prevButton) {
      if (index <= 0) {
        prevButton.style.display = 'none';
      } else {
        prevButton.style.display = 'inline-block';
        prevButton.disabled = false;
      }
    }
    
    if (nextButton) {
      if (index >= totalDialogues - 1) {
        nextButton.style.display = 'none';
      } else {
        nextButton.style.display = 'inline-block';
        nextButton.disabled = false;
      }
    }

    // Show restart button on the last dialogue
    if (restartButton) {
      if (index === totalDialogues - 1) {
        restartButton.style.display = 'inline-block';
        restartButton.disabled = false;
      } else {
        restartButton.style.display = 'none';
        restartButton.disabled = true;
      }
    }
    
    // Show quest section if we're at the end
    if (questSection && index >= totalDialogues - 1) {
      questSection.style.display = 'block';
      questSection.style.opacity = '0';
      questSection.style.transform = 'translateY(20px)';
      
      setTimeout(() => {
        questSection.style.opacity = '1';
        questSection.style.transform = 'translateY(0)';
      }, 500);
    } else if (questSection) {
      questSection.style.display = 'none';
    }
    
    // Show end of chapter content if we're at the end
    if (endOfChapter && index >= totalDialogues - 1) {
      endOfChapter.style.display = 'block';
      endOfChapter.style.opacity = '0';
      endOfChapter.style.transform = 'translateY(20px)';
      
      setTimeout(() => {
        endOfChapter.style.opacity = '1';
        endOfChapter.style.transform = 'translateY(0)';
      }, 300);
    } else if (endOfChapter) {
      endOfChapter.style.display = 'none';
    }
  }
  
  // Function to go to next dialogue
  function nextDialogue() {
    if (currentDialogueIndex < totalDialogues - 1) {
      currentDialogueIndex++;
      showDialogue(currentDialogueIndex);
    }
  }
  
  // Function to go to previous dialogue
  function prevDialogue() {
    if (currentDialogueIndex > 0) {
      currentDialogueIndex--;
      showDialogue(currentDialogueIndex);
    }
  }
  
  // Function to skip to the end
  function skipToEnd() {
    currentDialogueIndex = totalDialogues - 1;
    showDialogue(currentDialogueIndex);
    
    // Show quest section when skip button is clicked
    if (questSection) {
      questSection.style.display = 'block';
      questSection.style.opacity = '0';
      questSection.style.transform = 'translateY(20px)';
      
      setTimeout(() => {
        questSection.style.opacity = '1';
        questSection.style.transform = 'translateY(0)';
        questSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 500);
    }
  }
  
  // Function to restart the story
  function restartStory() {
    currentDialogueIndex = 0;
    showDialogue(currentDialogueIndex);
    
    // Hide quest section when restarting
    if (questSection) {
      questSection.style.display = 'none';
    }
  }
  
  // Add event listeners for navigation buttons (only if they exist)
  if (prevButton) {
    prevButton.addEventListener('click', function(e) {
      prevDialogue();
    });
  }
  
  if (nextButton) {
    nextButton.addEventListener('click', function(e) {
      nextDialogue();
    });
  }

  if (restartButton) {
    restartButton.addEventListener('click', function(e) {
      restartStory();
    });
  }
  
  if (skipButton) {
    skipButton.addEventListener('click', function(e) {
      skipToEnd();
    });
  }
  
  // Add keyboard navigation
  document.addEventListener('keydown', function(event) {
    if (event.key === 'ArrowRight' || event.key === ' ') {
      event.preventDefault();
      nextDialogue();
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      prevDialogue();
    }
  });
  
  // Show the first dialogue initially
  showDialogue(0);
});

// Add CSS animation for speech bubble reveal
const style = document.createElement('style');
style.textContent = `
  @keyframes dialogueReveal {
    0% {
      transform: scale(0.8);
      opacity: 0;
    }
    100% {
      transform: scale(1);
      opacity: 1;
    }
  }
  
  #skip-button {
    position: relative;
    z-index: 1;
    margin-top: 1rem;
  }
  
  #dialogue-stage {
    position: relative;
    z-index: 1;
    margin-bottom: 1rem;
  }
  
  .dialogue-container, .dialogue-container-right, .dialogue-simple {
    position: absolute !important;
    z-index: 1 !important;
  }
  
  .dialogue-container[style*="position: relative"], 
  .dialogue-container-right[style*="position: relative"], 
  .dialogue-simple[style*="position: relative"] {
    z-index: 2 !important;
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
