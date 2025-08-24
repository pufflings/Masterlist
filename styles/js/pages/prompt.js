// =============================================================
// Dialogue Click-to-Reveal Functionality
// =============================================================

document.addEventListener('DOMContentLoaded', function() {
  // Get all dialogue containers
  const dialogueContainers = document.querySelectorAll('.dialogue-container, .dialogue-container-right, .dialogue-simple');
  let currentDialogueIndex = 0;
  
  // Get the click to continue element
  const clickToContinue = Array.from(document.querySelectorAll('i')).find(el => 
    el.textContent.includes('Click to continue') || 
    el.textContent.includes('click to continue')
  );
  
  // Get the skip button and quest section
  const skipButton = document.getElementById('skip-button');
  const questSection = document.getElementById('quest-section');
  
  // Add initial hidden state to all dialogues
  dialogueContainers.forEach(container => {
    container.style.opacity = '0';
    container.style.transform = 'translateY(20px)';
    container.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
  });
  
  // Function to reveal the next dialogue
  function revealNextDialogue() {
    if (currentDialogueIndex < dialogueContainers.length) {
      const container = dialogueContainers[currentDialogueIndex];
      
      // Reveal the dialogue
      container.style.opacity = '1';
      container.style.transform = 'translateY(0)';
      
      // Add a subtle animation to the speech bubble
      const speechBubble = container.querySelector('.speech-bubble, .speech-bubble-right');
      if (speechBubble) {
        speechBubble.style.animation = 'dialogueReveal 0.3s ease 0.2s both';
      }
      
      currentDialogueIndex++;
      
      // If this was the last dialogue, show the quest section on the next click
      if (currentDialogueIndex >= dialogueContainers.length) {
        // Set up a one-time click handler for the quest reveal
        const questClickHandler = function() {
          // Show the quest section
          if (questSection) {
            questSection.style.display = 'block';
            questSection.style.animation = 'dialogueReveal 0.5s ease both';
          }
          
          // Scroll to quest section
          setTimeout(() => {
            if (questSection) {
              questSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }, 100);
          
          // Remove this click handler so it only happens once
          document.removeEventListener('click', questClickHandler);
        };
        
        // Add the quest reveal click handler
        document.addEventListener('click', questClickHandler);
      }
    }
  }
  
  // Function to skip all dialogue and show quest
  function skipToQuest() {
    // Hide the click to continue text
    if (clickToContinue) {
      clickToContinue.style.display = 'none';
    }
    
    // Hide the skip button
    if (skipButton) {
      skipButton.style.display = 'none';
    }
    
    // Reveal all dialogues instantly
    dialogueContainers.forEach(container => {
      container.style.opacity = '1';
      container.style.transform = 'translateY(0)';
      container.style.transition = 'none';
    });
    
    // Show the quest section
    if (questSection) {
      questSection.style.display = 'block';
      questSection.style.animation = 'dialogueReveal 0.5s ease both';
    }
    
    // Scroll to quest section
    setTimeout(() => {
      if (questSection) {
        questSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  }
  
  // Add click event listener to the document
  document.addEventListener('click', function(event) {
    // Hide the click to continue text on first click
    if (clickToContinue && clickToContinue.style.display !== 'none') {
      clickToContinue.style.display = 'none';
    }
    
    revealNextDialogue();
  });
  
  // Add event listener for skip button
  if (skipButton) {
    skipButton.addEventListener('click', skipToQuest);
  }
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
`;
document.head.appendChild(style);
