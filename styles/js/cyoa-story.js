// Generic CYOA Story Engine
class CYOAStory {
    constructor() {
        // Cache important elements first (needed by getStoryConfig)
        this.dialogueStage = document.getElementById('dialogue-stage');
        this.skipButton = document.getElementById('skip-button');

        // Debug: log dialogue-stage presence and dataset
        console.log('CYOAStory:init dialogue-stage exists?', !!this.dialogueStage);
        if (!this.dialogueStage) {
            console.warn('CYOAStory:init dialogue-stage element not found');
        }

        // Get story configuration from HTML data attributes
        this.storyConfig = this.getStoryConfig();

        this.currentScene = this.storyConfig?.startScene;
        this.storyData = null;
        this.choiceHistory = [];
        this.currentDialogueIndex = 0;
        this.currentSceneDialogueIndex = 0;
        this.isRevealing = false;
        this.suppressScroll = false; // disable auto-scrolls after skipping
        this.skipActivated = false;  // prevent further click-to-reveal after skipping
        
        this.init();
    }

    getStoryConfig() {
        // Get configuration from the dialogue-stage element or fall back to defaults
        const el = this.dialogueStage;
        if (!el) {
            console.warn('CYOAStory:getStoryConfig no dialogue-stage element');
            return { storyFile: undefined, startScene: undefined, endSections: undefined };
        }
        const cfg = {
            storyFile: el.dataset.storyFile,
            startScene: el.dataset.startScene,
            endSections: el.dataset.endSections + ',end-of-prologue,quest-section'
        };
        return cfg;
    }

    async init() {
        // Load story data
        await this.loadStoryData();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Start the story
        this.displayScene(this.currentScene);
    }

    async loadStoryData() {
        try {
            // Load story data from the configured JSON file
            const response = await fetch(this.storyConfig.storyFile);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            this.storyData = await response.json();
        } catch (error) {
            console.error('Error loading story data:', error);
            // Show error message to user
            this.showErrorMessage();
        }
    }

    showErrorMessage() {
        if (this.dialogueStage) {
            this.dialogueStage.innerHTML = `
                <div class="alert alert-danger">
                    <h5>Error Loading Story</h5>
                    <p>Unable to load story data from: ${this.storyConfig.storyFile}</p>
                    <p>Please check that the file exists and is accessible.</p>
                </div>
            `;
        }
    }

    setupEventListeners() {
        // Skip button functionality
        if (this.skipButton) {
            this.skipButton.addEventListener('click', (e) => {
                // Stop this click from triggering any other listeners
                if (e) { e.preventDefault?.(); e.stopPropagation?.(); }

                // Lock further auto-reveals and page auto-scrolls
                this.skipActivated = true;
                this.suppressScroll = true;

                // Reveal quest/end sections and disable any remaining choices
                this.showQuestSection();
                if (this.dialogueStage) {
                    this.disableAllChoices(this.dialogueStage);
                }
            });
        }

        // Add click event listener for progressive reveal
        document.body.addEventListener('click', (e) => {
            // Don't trigger if clicking on buttons, links, or within the skip button area
            if (e.target.tagName === 'BUTTON' || 
                e.target.tagName === 'A' || 
                e.target.closest('button') || 
                e.target.closest('a') ||
                e.target.closest('#skip-button')) {
                return;
            }

            // Don't trigger if we're in the middle of revealing content or skip is active
            if (this.isRevealing || this.skipActivated) {
                return;
            }

            this.showNextDialogue();
        });
    }

    displayScene(sceneId) {
        const scene = this.storyData.scenes.find(s => s.scene === sceneId);
        if (!scene) {
            console.error('Scene not found:', sceneId);
            return;
        }

        // Create a scene separator if this isn't the first scene
        if (this.currentScene !== this.storyConfig.startScene) {
            const separator = document.createElement('hr');
            separator.className = 'scene-separator';
            separator.setAttribute('data-scene', sceneId);
            this.dialogueStage.appendChild(separator);
        }

        // Create all dialogue elements for this scene but hide them initially
        this.currentSceneDialogueIndex = 0;
        scene.dialogue.forEach((entry, index) => {
            const dialogueElement = this.createDialogueElement(entry);
            
            // Add scene identifier to each element
            dialogueElement.setAttribute('data-scene', sceneId);
            
            // Hide all dialogues except the first one
            if (index === 0) {
                dialogueElement.classList.add('dialogue-visible');
            } else {
                dialogueElement.classList.add('dialogue-hidden');
            }
            
            this.dialogueStage.appendChild(dialogueElement);

            // Add choices if this is the last entry and has choices
            if (index === scene.dialogue.length - 1 && entry.choices) {
                const choicesElement = this.createChoicesElement(entry.choices);
                choicesElement.setAttribute('data-scene', sceneId);
                choicesElement.classList.add('dialogue-hidden');
                this.dialogueStage.appendChild(choicesElement);
            }
            
            // Add dice choices if this is the last entry and has dice-choices
            if (index === scene.dialogue.length - 1 && entry['dice-choices']) {
                const diceChoicesElement = this.createDiceChoicesElement(entry['dice-choices']);
                diceChoicesElement.setAttribute('data-scene', sceneId);
                diceChoicesElement.classList.add('dialogue-hidden');
                this.dialogueStage.appendChild(diceChoicesElement);
            }
        });

        // Scroll to the new content
        const lastElement = this.dialogueStage.lastElementChild;
        if (lastElement && !this.suppressScroll) {
            lastElement.scrollIntoView({ behavior: 'smooth' });
        }
    }

    showNextDialogue() {
        if (this.isRevealing) return;
        
        this.isRevealing = true;
        
        const scene = this.storyData.scenes.find(s => s.scene === this.currentScene);
        if (!scene) return;

        if (this.currentSceneDialogueIndex < scene.dialogue.length - 1) {
            // Show next dialogue
            this.currentSceneDialogueIndex++;
            
            // Find the next dialogue element by looking at the current scene's elements
            const allElements = Array.from(this.dialogueStage.children);
            const currentSceneElements = allElements.filter(child => 
                child.getAttribute('data-scene') === this.currentScene
            );
            
            const dialogueElements = currentSceneElements.filter(child => 
                child.classList.contains('dialogue-container') || 
                child.classList.contains('dialogue-container-right') || 
                child.classList.contains('dialogue-simple')
            );
            
            const nextContainer = dialogueElements[this.currentSceneDialogueIndex];
            
            if (nextContainer) {
                nextContainer.classList.remove('dialogue-hidden');
                nextContainer.classList.add('dialogue-visible');
                
                // Scroll to center the new dialogue
                if (!this.suppressScroll) {
                    setTimeout(() => {
                        nextContainer.scrollIntoView({ 
                            behavior: 'smooth', 
                            block: 'center',
                            inline: 'nearest'
                        });
                        this.isRevealing = false;
                    }, 100);
                } else {
                    this.isRevealing = false;
                }
            } else {
                this.isRevealing = false;
            }
        } else if (this.currentSceneDialogueIndex === scene.dialogue.length - 1) {
            // We're at the last dialogue, show choices if they exist
            const lastEntry = scene.dialogue[scene.dialogue.length - 1];
            if (lastEntry.choices) {
                const allElements = Array.from(this.dialogueStage.children);
                const currentSceneElements = allElements.filter(child => 
                    child.getAttribute('data-scene') === this.currentScene
                );
                
                const choicesElement = currentSceneElements.find(child => 
                    child.classList.contains('choices-element') && !child.classList.contains('dice-choices-element')
                );
                
                if (choicesElement) {
                    choicesElement.classList.remove('dialogue-hidden');
                    choicesElement.classList.add('dialogue-visible');
                    
                    if (!this.suppressScroll) {
                        setTimeout(() => {
                            choicesElement.scrollIntoView({ 
                                behavior: 'smooth', 
                                block: 'center',
                                inline: 'nearest'
                            });
                            this.isRevealing = false;
                        }, 100);
                    } else {
                        this.isRevealing = false;
                    }
                }
            } else if (lastEntry['dice-choices']) {
                const allElements = Array.from(this.dialogueStage.children);
                const currentSceneElements = allElements.filter(child => 
                    child.getAttribute('data-scene') === this.currentScene
                );
                
                const diceChoicesElement = currentSceneElements.find(child => 
                    child.classList.contains('dice-choices-element')
                );
                
                if (diceChoicesElement) {
                    diceChoicesElement.classList.remove('dialogue-hidden');
                    diceChoicesElement.classList.add('dialogue-visible');
                    
                    if (!this.suppressScroll) {
                        setTimeout(() => {
                            diceChoicesElement.scrollIntoView({ 
                                behavior: 'smooth', 
                                block: 'center',
                                inline: 'nearest'
                            });
                            this.isRevealing = false;
                        }, 100);
                    } else {
                        this.isRevealing = false;
                    }
                }
            } else {
                // No choices or dice choices, check if this is a final scene
                if (scene.final === true) {
                    this.showEndSections();
                }
                this.isRevealing = false;
            }
        } else {
            this.isRevealing = false;
        }
    }

    createDialogueElement(entry) {
        const container = document.createElement('div');
        
        // Get the class from modifiers, or use dialogue-simple as default
        const dialogueClass = entry.modifiers?.class || 'dialogue-simple';
        container.className = dialogueClass;
        
        if (dialogueClass === 'dialogue-simple') {
            if (entry.text) {
                const p = document.createElement('p');
                p.innerHTML = this.processMarkdown(entry.text);
                container.appendChild(p);
            }
        } else if (dialogueClass === 'dialogue-container' || dialogueClass === 'dialogue-container-right') {
            // Create portrait if character has a name and portrait
            if (entry.name && entry.portrait) {
                const portraitDiv = document.createElement('div');
                const portrait = document.createElement('div');
                portrait.className = 'character-portrait';
                
                // Add character portrait image
                portrait.innerHTML = `<img src="${entry.portrait}" alt="${entry.name}" onerror="this.style.display='none'">`;
                
                // Apply hidden modifier if specified
                if (entry.modifiers?.hidden === true) {
                    portrait.classList.add('hidden-face');
                }
                
                portraitDiv.appendChild(portrait);
                container.appendChild(portraitDiv);
            }
            
            const speechBubble = document.createElement('div');
            speechBubble.className = dialogueClass === 'dialogue-container-right' ? 'speech-bubble-right' : 'speech-bubble';
            
            if (entry.name) {
                const characterName = document.createElement('div');
                characterName.className = 'character-name';
                characterName.textContent = entry.name;
                speechBubble.appendChild(characterName);
            }
            
            if (entry.text) {
                const text = document.createElement('p');
                text.innerHTML = this.processMarkdown(entry.text);
                speechBubble.appendChild(text);
            }
            
            container.appendChild(speechBubble);
        }
        
        return container;
    }

    createChoicesElement(choices) {
        const container = document.createElement('div');
        container.className = 'dialogue-simple choices-element';

        const choicesTitle = document.createElement('h5');
        choicesTitle.textContent = 'What would you like to do?';
        choicesTitle.style.marginBottom = '1rem';
        container.appendChild(choicesTitle);

        // Container for choice buttons
        const buttonsContainer = document.createElement('div');
        buttonsContainer.className = 'choices-buttons-container';

        choices.forEach((choice, index) => {
            const button = document.createElement('button');
            button.className = 'btn btn-outline-primary m-2 choice-button';
            button.textContent = choice.text;

            button.addEventListener('click', () => {
                // Hide all choice buttons
                buttonsContainer.style.display = 'none';

                // Show the selected choice with visual feedback
                const selectedText = document.createElement('div');
                selectedText.className = 'selected-choice-text';
                selectedText.innerHTML = `<strong>✓ ${choice.text}</strong>`;
                selectedText.style.marginBottom = '1rem';
                container.insertBefore(selectedText, retryButton);

                // Show retry button
                retryButton.style.display = 'inline-block';

                // Store the current scene before making the choice
                retryButton.setAttribute('data-scene-before-choice', this.currentScene);

                // Small delay to show the selection, then proceed
                setTimeout(() => {
                    this.makeChoice(choice.next);
                }, 500);
            });

            buttonsContainer.appendChild(button);
        });

        container.appendChild(buttonsContainer);

        // Create retry button (hidden by default)
        const retryButton = document.createElement('button');
        retryButton.className = 'btn btn-warning m-2 retry-button';
        retryButton.textContent = '↻ Retry';
        retryButton.style.display = 'none';

        retryButton.addEventListener('click', () => {
            this.retryChoice(container, buttonsContainer, retryButton);
        });

        container.appendChild(retryButton);

        return container;
    }

    createDiceChoicesElement(diceChoices) {
        const container = document.createElement('div');
        container.className = 'dialogue-simple choices-element dice-choices-element';

        const diceTitle = document.createElement('h5');
        diceTitle.textContent = `Roll a d${diceChoices['dice-max']}!`;
        diceTitle.style.marginBottom = '1rem';
        container.appendChild(diceTitle);

        // Container for dice buttons
        const diceButtonsContainer = document.createElement('div');
        diceButtonsContainer.className = 'dice-buttons-container';

        const rollButton = document.createElement('button');
        rollButton.className = 'btn btn-warning m-2 dice-roll-button';
        rollButton.textContent = '🎲 Roll the Dice!';

        rollButton.addEventListener('click', () => {
            // Disable the roll button while the roll resolves
            rollButton.disabled = true;
            rollButton.classList.add('selected');
            rollButton.textContent = 'Rolling...';

            const min = Number.isFinite(Number(diceChoices['dice-min']))
                ? Number(diceChoices['dice-min'])
                : 1;
            const max = Number.isFinite(Number(diceChoices['dice-max']))
                ? Number(diceChoices['dice-max'])
                : min;
            const rollRange = Math.max((max - min) + 1, 1);
            const roll = Math.floor(Math.random() * rollRange) + min;

            const selectedChoice = diceChoices.choices.find(choice =>
                roll >= Number(choice['dice-min']) && roll <= Number(choice['dice-max'])
            );

            if (!selectedChoice) {
                console.warn(`dice-choices missing a range for roll ${roll}`, diceChoices);
                rollButton.disabled = false;
                rollButton.classList.remove('selected');
                rollButton.className = 'btn btn-warning m-2 dice-roll-button';
                rollButton.textContent = `Roll ${roll} not mapped. Try again.`;
                return;
            }

            // Hide dice buttons
            diceButtonsContainer.style.display = 'none';

            // Show roll result
            const resultText = document.createElement('div');
            resultText.className = 'selected-choice-text';
            resultText.innerHTML = `<strong>You rolled: ${roll}</strong>`;
            resultText.style.marginBottom = '1rem';
            container.insertBefore(resultText, retryButton);

            // Show retry button
            retryButton.style.display = 'inline-block';
            retryButton.setAttribute('data-scene-before-choice', this.currentScene);

            setTimeout(() => {
                this.makeChoice(selectedChoice.next);
            }, 1500);
        });
        diceButtonsContainer.appendChild(rollButton);

        // Add a button to let the user choose the outcome manually
        const chooseButton = document.createElement('button');
        chooseButton.className = 'btn m-2 choose-outcome-button';
        chooseButton.textContent = '😢 Choose outcome';

        // Container for manual outcome options (hidden by default)
        const optionsContainer = document.createElement('div');
        optionsContainer.className = 'outcome-options';
        optionsContainer.style.display = 'none';

        // Toggle the options list when clicking the button
        chooseButton.addEventListener('click', () => {
            optionsContainer.style.display = optionsContainer.style.display === 'none' ? 'flex' : 'none';
        });

        // Build option buttons for each dice range
        diceChoices.choices.forEach(choice => {
            const label = `${choice['dice-min']}-${choice['dice-max']}` + (choice.text ? `: ${choice.text}` : '');
            const optionButton = document.createElement('button');
            optionButton.className = 'btn m-2 outcome-option-button';
            optionButton.textContent = label;

            optionButton.addEventListener('click', () => {
                // Hide dice buttons
                diceButtonsContainer.style.display = 'none';

                // Show selected outcome
                const selectedText = document.createElement('div');
                selectedText.className = 'selected-choice-text';
                selectedText.innerHTML = `<strong>✓ Selected: ${label}</strong>`;
                selectedText.style.marginBottom = '1rem';
                container.insertBefore(selectedText, retryButton);

                // Show retry button
                retryButton.style.display = 'inline-block';
                retryButton.setAttribute('data-scene-before-choice', this.currentScene);

                // Proceed to the selected next scene
                setTimeout(() => {
                    this.makeChoice(choice.next);
                }, 500);
            });

            optionsContainer.appendChild(optionButton);
        });

        diceButtonsContainer.appendChild(chooseButton);
        diceButtonsContainer.appendChild(optionsContainer);
        container.appendChild(diceButtonsContainer);

        // Create retry button (hidden by default)
        const retryButton = document.createElement('button');
        retryButton.className = 'btn btn-warning m-2 retry-button';
        retryButton.textContent = '↻ Retry';
        retryButton.style.display = 'none';

        retryButton.addEventListener('click', () => {
            this.retryChoice(container, diceButtonsContainer, retryButton);
        });

        container.appendChild(retryButton);

        return container;
    }

    disableAllChoices(container) {
        const buttons = container.querySelectorAll('button');
        buttons.forEach(button => {
            button.disabled = true;
            button.classList.add('selected');
        });
    }

    makeChoice(nextScene) {
        // Record the choice
        this.choiceHistory.push({
            from: this.currentScene,
            to: nextScene,
            timestamp: new Date()
        });

        // Update current scene
        this.currentScene = nextScene;

        // Reset dialogue index for the new scene
        this.currentSceneDialogueIndex = 0;

        // Display the new scene
        this.displayScene(nextScene);
    }

    retryChoice(choiceContainer, buttonsContainer, retryButton) {
        // Get the scene we're retrying from
        const sceneBeforeChoice = retryButton.getAttribute('data-scene-before-choice');

        // Remove all DOM elements that were added after this choice
        const allElements = Array.from(this.dialogueStage.children);
        const choiceIndex = allElements.indexOf(choiceContainer);

        // Remove all elements after the choice container
        for (let i = allElements.length - 1; i > choiceIndex; i--) {
            allElements[i].remove();
        }

        // Remove the selected choice text if it exists
        const selectedText = choiceContainer.querySelector('.selected-choice-text');
        if (selectedText) {
            selectedText.remove();
        }

        // Reset choice history - remove all choices made after this point
        // Find the last occurrence of this scene in choice history
        let lastIndexOfScene = -1;
        for (let i = this.choiceHistory.length - 1; i >= 0; i--) {
            if (this.choiceHistory[i].from === sceneBeforeChoice) {
                lastIndexOfScene = i;
                break;
            }
        }

        if (lastIndexOfScene >= 0) {
            this.choiceHistory = this.choiceHistory.slice(0, lastIndexOfScene);
        }

        // Reset to the scene before the choice
        this.currentScene = sceneBeforeChoice;

        // Show choice buttons again
        buttonsContainer.style.display = 'block';

        // Hide retry button
        retryButton.style.display = 'none';

        // Scroll to the choices
        choiceContainer.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest'
        });
    }

    processMarkdown(text) {
        if (!text) return '';
        
        // Process bold text
        text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // Process italic text
        text = text.replace(/\*(.*?)\*/g, '<i>$1</i>');
        
        // Process line breaks
        text = text.replace(/\n/g, '<br>');
        
        return text;
    }

    showQuestSection() {
        // Show all dialogues at once
        this.showAllContent();
        
        // Show configured end sections
        this.showEndSections();
        
        // Prefer to scroll to the quest section; fall back to first available end section
        const endSectionIds = (this.storyConfig.endSections || '')
            .split(',')
            .map(s => s.trim())
            .filter(Boolean);

        let target = document.getElementById('quest-section');
        if (!target) {
            for (const id of endSectionIds) {
                const el = document.getElementById(id);
                if (el) { target = el; break; }
            }
        }

        if (target) {
            // Scroll immediately, then again shortly after to override any competing scrolls
            target.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
            setTimeout(() => {
                target.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
            }, 200);
        }
    }
    
    showAllContent() {
        // Show all dialogue elements in the current scene
        const scene = this.storyData.scenes.find(s => s.scene === this.currentScene);
        if (scene) {
            const dialogueElements = this.dialogueStage.children;
            const startIndex = dialogueElements.length - scene.dialogue.length;
            
            for (let i = startIndex; i < dialogueElements.length; i++) {
                const element = dialogueElements[i];
                element.classList.remove('dialogue-hidden');
                element.classList.add('dialogue-visible');
            }
        }
        
        // Reset dialogue index to show all content
        this.currentSceneDialogueIndex = scene ? scene.dialogue.length - 1 : 0;
    }

    showEndSections() {
        // Show configured end sections
        const endSectionIds = this.storyConfig.endSections.split(',');
        endSectionIds.forEach(id => {
            const section = document.getElementById(id.trim());
            if (section) {
                section.style.display = 'block';
            }
        });
    }

    // Get choice history for debugging or saving
    getChoiceHistory() {
        return this.choiceHistory;
    }

    // Reset story to beginning
    resetStory() {
        this.currentScene = this.storyConfig.startScene;
        this.choiceHistory = [];
        this.displayScene(this.currentScene);
    }
}

// Initialize the story when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new CYOAStory();
});
