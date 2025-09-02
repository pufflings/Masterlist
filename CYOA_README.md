# CYOA (Choose Your Own Adventure) Story System

This system allows you to create interactive, branching stories for your Pufflings website. Instead of hardcoded HTML, the story content is generated dynamically from JSON data.

## Files

- `cyoa-chapter.html` - The main HTML file that displays the CYOA story
- `styles/js/cyoa-story.js` - The JavaScript engine that handles story logic and rendering
- `Story HTML Generator/CYOA/cyoa-story-data.json` - The JSON file containing all story content and choices

## How It Works

1. **Story Data**: All story content is stored in `Story HTML Generator/CYOA/cyoa-story-data.json`
2. **Dynamic Rendering**: The JavaScript engine reads the JSON and generates HTML on-the-fly
3. **Click-to-Reveal**: Uses your existing `prompt.js` system for progressive dialogue revelation
4. **Progressive Display**: New scenes are added below previous ones, creating a continuous story flow
5. **Choice Management**: When choices appear, selecting one disables all others and shows visual feedback
6. **Choice Tracking**: The system keeps track of all player choices and can navigate between scenes
7. **Responsive Design**: Uses your existing CSS classes and styling system

## Story Structure

Each story consists of multiple **scenes**, and each scene contains **dialogue entries**:

```json
{
  "scenes": [
    {
      "scene": "scene1",
      "dialogue": [
        {
          "name": "Character Name",
          "class": "dialogue-container",
          "text": "Character dialogue here"
        },
        {
          "class": "dialogue-simple",
          "text": "Narration or description",
          "choices": [
            {
              "text": "Choice text",
              "next": "scene2"
            }
          ]
        }
      ]
    }
  ]
}
```

## Dialogue Types

### 1. Character Dialogue (`dialogue-container` or `dialogue-container-right`)
- **name**: Character's name (will display portrait if available)
- **class**: `dialogue-container` (left side) or `dialogue-container-right` (right side)
- **text**: The character's dialogue

### 2. Narration (`dialogue-simple`)
- **class**: `dialogue-simple`
- **text**: Descriptive text or narration
- **choices**: Optional array of player choices

## Choices

Choices appear at the end of scenes and allow players to navigate the story:

```json
"choices": [
  {
    "text": "What the player sees",
    "next": "scene_to_go_to"
  }
]
```

- **text**: The text displayed on the choice button
- **next**: The scene ID to navigate to when this choice is selected

## Character Portraits

The system automatically displays character portraits for:
- **Poki**: Uses the existing Poki portrait
- **Momo**: Uses the existing Momo portrait  
- **You**: Uses the player character portrait
- **Other characters**: Will show "???" as the name

## Adding New Content

### To add a new scene:

1. Add a new scene object to the `scenes` array in `cyoa-story-data.json`
2. Give it a unique `scene` ID
3. Add dialogue entries
4. Link to it from existing choices using the `next` property

### To modify existing content:

1. Edit the text in `cyoa-story-data.json`
2. The changes will appear immediately when you refresh the page
3. No need to touch the HTML or JavaScript files

### To add new characters:

1. Add character portrait images to your assets
2. Update the `createDialogueElement` function in `cyoa-story.js` to handle the new character
3. Use the character name in your story data

## Features

- **Click-to-Reveal Dialogue**: Players click to reveal each dialogue entry one at a time, creating an interactive reading experience
- **Progressive Story Display**: New scenes are added below previous ones, creating a continuous story flow
- **Choice Management**: Choices are disabled after selection to prevent multiple selections
- **Choice History**: Tracks all player decisions
- **Skip Button**: Allows players to jump to the quest section and reveal end content
- **Markdown Support**: Supports **bold** and *italic* text
- **Responsive Design**: Works on all device sizes
- **Smooth Transitions**: Automatic scrolling and scene transitions
- **Scene Separators**: Visual dividers between different story sections
- **Visual Feedback**: Hover effects and selection indicators enhance user experience

## Example Story Flow

```
Scene 1 (Introduction) → Choice A → Scene 2A
                ↓
            Choice B → Scene 2B
                ↓
            Choice C → Scene 2C
```

## Troubleshooting

- **Story not loading**: Check that `cyoa-story-data.json` is accessible
- **Choices not working**: Verify that scene IDs in `next` properties match actual scene IDs
- **Portraits not showing**: Check image URLs and ensure they're accessible
- **Console errors**: Open browser dev tools to see detailed error messages

## Customization

You can easily customize:
- **Story content**: Edit the JSON file
- **Visual style**: Modify the CSS classes
- **Character portraits**: Update the image URLs in the JavaScript
- **Choice styling**: Modify the button styles in `createChoicesElement`

## Future Enhancements

Potential additions to consider:
- **Save/Load system**: Remember player progress
- **Multiple endings**: Track choices to determine story outcomes
- **Audio support**: Add sound effects or music
- **Animation**: Add transitions between scenes
- **Branching complexity**: Support for conditional choices based on previous decisions
