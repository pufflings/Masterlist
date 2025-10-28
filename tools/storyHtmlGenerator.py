
import re
import sys
from pathlib import Path



def log(message: str) -> None:
    print(f"[storyHtmlGenerator] {message}")

class StoryHTMLGenerator:
    def __init__(self, input_file):
        self.input_file = input_file
        self.file_name = ""
        self.chapter_title = ""
        self.scene = ""
        self.story_type = 'simple'
        # Track dice dialogue section names
        self.dice_start_sections = set()
        self.dice_end_sections = set()
        self.characters = {}
        self.dialogue = []
        self.quest_data = {}
        self.trivia_text = ''

    def parse_input_file(self):
        # Strip BOM if present
        with open(self.input_file, 'r', encoding='utf-8-sig') as f:
            raw = f.read()

        # Normalize newlines
        raw = raw.replace('\r\n', '\n').replace('\r', '\n')
        lines = raw.split('\n')

        first_content_line = next((ln.strip() for ln in lines if ln.strip()), '')
        if not first_content_line.lower().startswith('file name'):
            raise ValueError(
                f"Invalid format in {self.input_file!r}: expected to start with 'File name', found {first_content_line!r}."
            )

        section = None
        char_lines = []
        dialogue_lines = []
        quest_lines = []
        trivia_lines = []

        for line in lines:
            s = line.strip()

            # Top-level keys
            if s.startswith('File name:'):
                raw_name = s[len('File name:'):].strip()
                # Ensure the output name ends with .html
                self.file_name = self._ensure_html_extension(raw_name)
                section = None
                continue
            if s.startswith('Chapter title:'):
                self.chapter_title = s[len('Chapter title:'):].strip()
                section = None
                continue
            if s.startswith('Scene:'):
                self.scene = s[len('Scene:'):].strip()
                section = None
                continue
            if s.startswith('Type:'):
                parsed_type = s[len('Type:'):].strip().lower()
                if parsed_type in ('simple', 'dice'):
                    self.story_type = parsed_type
                else:
                    self.story_type = 'simple'
                section = None
                continue

            # Section headers
            if s == 'Characters:':
                section = 'characters'; continue
            if s == 'Dialogue:':
                section = 'dialogue'; continue
            # Dice-style dialogue section header: Dialogue | sectionName | start/end (last part optional)
            if s.lower().startswith('dialogue') and '|' in s:
                parts = [p.strip() for p in s.split('|')]
                if parts and parts[0].lower().rstrip(':') == 'dialogue':
                    section_name = parts[1].rstrip(':') if len(parts) > 1 else ''
                    phase = parts[2].lower().rstrip(':') if len(parts) > 2 else ''
                    if section_name:
                        if phase == 'start':
                            self.dice_start_sections.add(section_name)
                        elif phase == 'end':
                            self.dice_end_sections.add(section_name)
                    section = 'dialogue'; continue
            if s == 'Quest:':
                section = 'quest'; continue
            if s == 'Trivia:':
                section = 'trivia'; continue

            # Accumulate by section
            if section == 'characters':
                char_lines.append(line)
            elif section == 'dialogue':
                dialogue_lines.append(line)
            elif section == 'quest':
                quest_lines.append(line)
            elif section == 'trivia':
                trivia_lines.append(line)
        # Parse accumulated content
        self._parse_characters(char_lines)
        self._parse_dialogue('\n'.join(dialogue_lines))
        self._parse_quest(quest_lines)
        self._parse_trivia(trivia_lines)

    def _ensure_html_extension(self, name):
        name = (name or '').strip()
        if not name:
            return name
        p = Path(name)
        try:
            if p.suffix.lower() != '.html':
                p = p.with_suffix('.html')
            return str(p)
        except Exception:
            # Fallback if Path.with_suffix fails for unusual names
            return name if name.lower().endswith('.html') else name + '.html'

    def _parse_characters(self, lines):
        for line in lines:
            if not line.strip():
                continue
            parts = [p.strip() for p in line.split('|')]
            if len(parts) >= 3:
                name = parts[0]
                full_body = parts[1] if parts[1] and parts[1] != '-' else None
                portrait = parts[2] if parts[2] and parts[2] != '-' else None
                profile = parts[3] if len(parts) >= 4 and parts[3] and parts[3] != '-' else None
                description = parts[4] if len(parts) >= 5 and parts[4] and parts[4] != '-' else None
                include_in_showcase = bool(full_body)

                self.characters[name] = {
                    'full_body': full_body,
                    'portrait': portrait,
                    'profile': profile,
                    'description': description,
                    'include_in_showcase': include_in_showcase
                }

    def _parse_dialogue(self, text):
        # Split into entries that begin with a '[' header line
        lines = text.split('\n')
        current_entry = []
        for line in lines:
            if line.strip().startswith('['):
                if current_entry:
                    self.dialogue.append('\n'.join(current_entry))
                current_entry = [line]
            else:
                if current_entry:
                    current_entry.append(line)
        if current_entry:
            self.dialogue.append('\n'.join(current_entry))

    def _parse_trivia(self, lines):
        # Keep raw. Markdown is applied during render.
        self.trivia_text = '\n'.join(lines).strip()

    def _parse_quest(self, lines):
        if not lines:
            return
        non_empty = [ln for ln in lines if ln.strip()]
        if not non_empty:
            return
        self.quest_data['title'] = non_empty[0].strip()
        idx0 = lines.index(non_empty[0])
        body_lines = lines[idx0 + 1:]
        self.quest_data['body'] = '\n'.join(body_lines).strip()

    def _process_markdown(self, text):
        # Strong before italic, avoid overlaps
        text = re.sub(r'(?<!\*)\*\*(.+?)\*\*(?!\*)', r'<strong>\1</strong>', text)
        text = re.sub(r'(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)', r'<i>\1</i>', text)
        return text

    def _generate_dialogue_html(self, entry):
        parts = entry.split('\n', 1)
        header_line = parts[0]
        trailing_block = parts[1] if len(parts) > 1 else ''

        m = re.match(r'\[([^\]]+)\](.*)$', header_line)
        if not m:
            return ''

        header_content = m.group(1).strip()
        inline_after = m.group(2).strip()

        # Combine inline content after header with any following lines
        content = inline_after
        if trailing_block.strip():
            content = (content + '\n' + trailing_block).strip()

        # narration
        if header_content.lower() == 'narration':
            return f'''<div class="dialogue-simple">
    <p>{self._process_markdown(content)}</p>
</div>'''

        # image
        if header_content.lower() == 'image':
            url = content.strip()
            return f'''<div class="dialogue-simple">
    <img src="{url}">
</div>'''

        if header_content.lower() == 'scene break':
            return '<hr class="dialogue-scene-break">'

        # parse speaker header: [name | display name | modifiers]
        cols = [p.strip() for p in header_content.split('|')]
        if len(cols) == 1:
            char_name = cols[0]; display_name = char_name; modifiers = []
        elif len(cols) == 2:
            char_name = cols[0]; display_name = char_name; modifiers = [cols[1]]
        else:
            char_name = cols[0]
            display_name = cols[1] if cols[1] else char_name
            modifiers = [mm.strip().lower() for mm in cols[2].split(',') if mm.strip()]

        is_right = any('right' in m for m in modifiers)
        is_hidden = any('hidden' in m for m in modifiers)

        portrait_url = ''
        if char_name in self.characters:
            portrait_url = self.characters[char_name]['portrait'] or ''

        if is_right:
            return f'''<div class="dialogue-container-right">
    <div>
      <div class="character-portrait{' hidden-face' if is_hidden else ''}">
        <img src="{portrait_url}" alt="{char_name}" onerror="this.style.display='none'">
      </div>
    </div>
    <div class="speech-bubble-right">
      <div class="character-name">{display_name}</div>
      <p>{self._process_markdown(content)}</p>
    </div>
</div>'''
        else:
            return f'''<div class="dialogue-container">
    <div>
      <div class="character-portrait{' hidden-face' if is_hidden else ''}">
        <img src="{portrait_url}" alt="{char_name}" onerror="this.style.display='none'">
      </div>
    </div>
    <div class="speech-bubble">
      <div class="character-name">{display_name}</div>
      <p>{self._process_markdown(content)}</p>
    </div>
</div>'''

    def generate_html(self):
        self.parse_input_file()

        # Dialogue HTML
        dialogue_html = ''
        if self.story_type == 'simple':
            for entry in self.dialogue:
                html = self._generate_dialogue_html(entry)
                if html:
                    dialogue_html += html + '\n\n'
        else:
            # For 'dice' type, keep dialogue-stage empty for now
            dialogue_html = ''

        # Extra scripts (e.g., for dice/CYOA behavior)
        extra_scripts = ''
        if self.story_type == 'dice':
            extra_scripts = '\n  <script src="../styles/js/cyoa-story.js"></script>'

        # Extra styles (only for dice/CYOA pages)
        extra_head_links = ''
        if self.story_type == 'dice':
            extra_head_links = '\n  <link rel="stylesheet" type="text/css" href="../styles/css/cyoa-story.css">'

        # Prepare dialogue container attributes/inner content
        dialogue_data_attrs = ''
        dialogue_inner = dialogue_html
        if self.story_type == 'dice':
            story_json_name = Path(self.input_file).stem + '.json'
            story_json_path = f"prompts/CYOA/{story_json_name}"
            start_names = ', '.join(sorted(self.dice_start_sections))
            end_names = ', '.join(sorted(self.dice_end_sections))
            dialogue_data_attrs = f'data-story-file="{story_json_path}" data-start-scene="{start_names}" data-end-sections="{end_names}"'
            dialogue_inner = '            <!-- Dynamic content will be generated here -->\n'

        # Characters showcase: only those with full-body, link image and name if profile present
        character_showcase = ""
        for name, data in self.characters.items():
            if not data.get('include_in_showcase', True):
                continue
            fb = data.get('full_body')
            if not fb:
                continue
            profile = (data.get('profile') or '').strip()
            desc_raw = (data.get('description') or '').strip()
            desc_html = self._process_markdown(desc_raw) if desc_raw else ''
            has_desc = bool(desc_html)

            # image + name, link if profile present
            img_block = f'<img src="{fb}" alt="{name}" onerror="this.style.display=\'none\'">'
            if profile:
                name_block = f'<a href="{profile}">{name}</a>'
            else:
                name_block = name

            # overlay only when description exists
            illus_classes = "character-illustration"
            data_attr = ""
            overlay_block = ""
            if has_desc:
                illus_classes += " clickable-character"
                key = name.lower().replace(" ", "-")
                data_attr = f' data-character="{key}"'
                overlay_block = f'''
              <div class="character-overlay" style="display: none;">
                <div class="overlay-content">
                  <p>{desc_html}</p>
                </div>
              </div>'''

            character_showcase += f'''          <div class="character-card">
            <div class="{illus_classes}"{data_attr}>
              {img_block}{overlay_block}
            </div>
            <div class="character-label">{name_block}</div>
          </div>
          
'''
        # Generate trivia section if trivia exists
        trivia_html = ""
        if self.trivia_text:
            trivia_body = self._process_markdown(self.trivia_text)
            trivia_html = '''      <div id="trivia-section" style="opacity: 1; transform: translateY(0); transition: opacity 0.5s ease, transform 0.5s ease;">
        <div class="card p-md-5 p-4 mb-4">
          <h4>🧠 Trivia</h4>
          <hr>
          <div class="text-justify my-4">
            %s
          </div>
        </div>
      </div>''' % (trivia_body)

        # Quest
        quest_html = ''
        if self.quest_data:
            quest_title = self.quest_data.get('title', 'Quest')
            quest_body = self._process_markdown(self.quest_data.get('body', 'Complete the quest objectives.'))

            lower = quest_body.lower()
            extra_button = '' if ('accept quest' in lower or '<button' in lower) else '''
            <div class="text-center mt-4">
                <a href="#"><button class="btn btn-outline-secondary btn-sm">Accept quest!</button></a>
            </div>'''

            quest_html = f'''      <!-- quest info here -->
      <div id="quest-section" style="opacity: 1; transform: translateY(0); transition: opacity 0.5s ease, transform 0.5s ease;">
        <div class="card p-md-5 p-4 mb-4">
          <h4>🎯 {quest_title}</h4>
          <hr>
          <div class="text-justify my-4">
            {quest_body}{extra_button}
          </div>
        </div>
      </div>'''
        else:
            quest_html = '''      <!-- quest info here -->
      <div id="quest-section" style="opacity: 1; transform: translateY(0); transition: opacity 0.5s ease, transform 0.5s ease;">
        <div class="card p-md-5 p-4 mb-4">
          <h4>🎯 Quest: [Placeholder Quest]</h4>
          <hr>
          <div class="text-justify my-4">
            <p><strong>Objective:</strong> Complete the quest objectives.</p>
            <p><strong>Details:</strong> Quest details will be added here.</p>
            <br>
            <p><strong>Rewards (first time only):</strong></p>
            <ul>
              <li>10 <img src="../assets/coin.png" alt="coin" style="height: 1em; width: 1em; vertical-align: middle; margin-left: 0.25em;"></li>
            </ul>
            <div class="text-center mt-4">
                <a href="#"><button class="btn btn-outline-secondary btn-sm">Accept quest!</button></a>
            </div>
          </div>
        </div>
      </div>'''

        html_template = f'''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="shortcut icon" type="image/png" href="../assets/favicon.png" />
  <title>Pufflings - {self.chapter_title}</title>
  <meta name="title" content="Pufflings - {self.chapter_title}" />
  <meta name="type" content="website" />
  <meta name="url" content="https://pufflings.github.io/Masterlist/" />
  <meta name="image" content="../assets/meta.png" />
  <meta name="description" content="Welcome to the Puffling ARPG! Pufflings are a mysterious, fluffy creature, believed to be descendants of legendary dragons.">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@4.5.3/dist/css/bootstrap.min.css" crossorigin="anonymous">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-select@1.13.14/dist/css/bootstrap-select.min.css">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css">
  <link rel="stylesheet" type="text/css" href="../styles/css/charadex.css">
  {extra_head_links}
  <link href="https://fonts.googleapis.com/css?family=Montserrat:400|Comfortaa:500" rel="stylesheet">
</head>
<body id="charadex-body">
  <div class="load-html" id="header" data-source="../includes/header.html"></div>
  <div class="container" id="main-container">
    <div id="charadex-gallery">
      <!-- Top Card Container -->
      <div class="card p-md-5 p-4 mb-4">
        <!-- Title -->
        <h3 class="mb-0"><a href="{self.file_name}">{self.chapter_title}</a></h3>
        <h6><i>Scene — {self.scene}</i></h6>
        <hr>
        <div class="text-justify my-4">
          <!-- Skip Story Button -->
          <div class="text-center mb-3" style="position: relative; z-index: 1;">
            <button id="skip-button" class="btn btn-outline-secondary btn-sm">⭐️ Skip to Quest</button>
          </div>

          <!-- Dialogue Container -->
          <div id="dialogue-stage" {dialogue_data_attrs} style="position: relative;">
{dialogue_inner}
          </div> <!-- End of dialogue-stage -->
      
      <!-- End of Chapter Character Box -->
      <div id="end-of-prologue" class="card p-md-5 p-4 mb-4 mt-4">
        <h4 class="text-center mb-3"><i>End of {self.chapter_title}</i></h4>
        <hr class="dashed-line">
        <h5 class="text-center mb-4">Characters in this Chapter</h5>
        <div class="character-showcase-container">
{character_showcase}        </div>
        
        <hr class="dashed-line mt-4">
      </div>
{trivia_html}
{quest_html}
      
        </div>
        <hr>
      </div>
      <!-- Content List -->
      <div class="row no-gutters charadex-shop-list softload m-n2"></div>
    </div>
  </div>
  <div class="load-html" id="footer" data-source="../includes/footer.html"></div>
  
  <!-- Floating Scroll to Top Button -->
   <button id="scroll-to-top" class="btn btn-primary" title="Scroll to top">
    ↑
  </button>
  
  <script src="https://code.jquery.com/jquery-3.6.0.js" crossorigin="anonymous"></script>
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@4.5.3/dist/js/bootstrap.bundle.min.js" crossorigin="anonymous"></script>
  <script src="https://cdn.jsdelivr.net/npm/bootstrap-select@1.13.14/dist/js/bootstrap-select.min.js"></script>
  <script src="../styles/js/pages/base.js" type="module"></script>
  {extra_scripts}
  <script src="../styles/js/pages/prompt.js"></script>

</body>
</html>'''
        return html_template

def main():
    if len(sys.argv) != 2:
        print("Usage: python generate_html.py <input_file.txt>")
        sys.exit(1)

    input_arg = sys.argv[1]
    input_path = Path(input_arg).resolve()
    log(f"Starting processing for {input_path}")

    generator = StoryHTMLGenerator(str(input_path))
    try:
        html = generator.generate_html()
    except ValueError as exc:
        log(f"Aborted while processing {input_path}: {exc}")
        print(exc)
        sys.exit(1)
    except Exception as exc:
        log(f"Unexpected error while processing {input_path}: {exc}")
        raise

    output_file = generator.file_name if generator.file_name else "output.html"

    out_path = Path(output_file)
    if not out_path.is_absolute():
        base_dir = Path(__file__).resolve().parent
        out_path = base_dir / out_path

    if out_path.exists():
        try:
            resp = input(f"File '{out_path}' exists. Overwrite? [y/N]: ").strip().lower()
        except EOFError:
            resp = ''
        if resp not in ('y', 'yes'):
            log(f"Skipped writing output for {input_path}: user declined overwrite of {out_path}")
            print("Aborted: existing file not overwritten.")
            sys.exit(0)

    out_path.parent.mkdir(parents=True, exist_ok=True)

    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(html)

    print(f"HTML generated successfully: {out_path}")
    log(f"Completed processing for {input_path} -> {out_path}")

if __name__ == "__main__":
    main()
