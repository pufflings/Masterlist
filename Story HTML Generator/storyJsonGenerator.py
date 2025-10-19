import re
import sys
import json
from pathlib import Path


class StoryJSONGenerator:
    def __init__(self, input_file):
        self.input_file = input_file
        self.file_name = ""
        self.story_type = "simple"
        self.characters = {}
        self.start_sections = set()
        self.end_sections = set()
        # Scenes are preserved in order of appearance
        self.scenes_order = []  # list of scene ids in order
        self.scenes = {}        # scene_id -> {"scene": id, "dialogue": [...], optional "final": True}

    # ---------------------- Parsing ----------------------
    def parse(self):
        # Read with BOM-safe encoding and normalize newlines
        with open(self.input_file, 'r', encoding='utf-8-sig') as f:
            raw = f.read()
        raw = raw.replace('\r\n', '\n').replace('\r', '\n')
        lines = raw.split('\n')

        section = None
        current_scene = None
        scene_buffers = {}  # scene_id -> list[str] (lines belonging to that scene)

        for line in lines:
            s = line.strip()

            # Top-level keys
            if s.startswith('File name:'):
                self.file_name = s[len('File name:'):].strip()
                section = None
                continue
            if s.startswith('Type:'):
                parsed_type = s[len('Type:'):].strip().lower()
                self.story_type = parsed_type if parsed_type in ('simple', 'dice') else 'simple'
                section = None
                continue
            # Stop parsing content once Quest section starts
            if s == 'Quest:':
                break

            # Sections
            if s == 'Characters:':
                section = 'characters'
                continue

            # Dialogue headers
            # Expected for dice: Dialogue | sceneName | start/end (third flag optional)
            if s.lower().startswith('dialogue') and '|' in s:
                # Close any current dialogue accumulation implicitly by switching scenes
                parts = [p.strip() for p in s.split('|')]
                if parts and parts[0].lower().rstrip(':') == 'dialogue':
                    # scene name in second column
                    scene_name = parts[1].rstrip(':') if len(parts) > 1 else ''
                    phase = parts[2].lower().rstrip(':') if len(parts) > 2 else ''
                    if scene_name:
                        current_scene = scene_name
                        if current_scene not in scene_buffers:
                            scene_buffers[current_scene] = []
                        if current_scene not in self.scenes:
                            self.scenes[current_scene] = {"scene": current_scene, "dialogue": []}
                            self.scenes_order.append(current_scene)
                        if phase == 'start':
                            self.start_sections.add(current_scene)
                        elif phase == 'end':
                            self.end_sections.add(current_scene)
                    section = 'dialogue'
                    continue

            # Accumulate by section
            if section == 'characters':
                self._parse_character_line(line)
            elif section == 'dialogue' and current_scene:
                scene_buffers[current_scene].append(line)

        # Post-process dialogue buffers per scene
        for scene_id in self.scenes_order:
            text = '\n'.join(scene_buffers.get(scene_id, []))
            entries = self._parse_scene_dialogue(text)
            self.scenes[scene_id]["dialogue"] = entries
            if scene_id in self.end_sections:
                self.scenes[scene_id]["final"] = True

    def _parse_character_line(self, line):
        if not line.strip():
            return
        parts = [p.strip() for p in line.split('|')]
        if len(parts) >= 3:
            name = parts[0]
            full_body = parts[1] if parts[1] != '-' else None
            portrait = parts[2] if parts[2] != '-' else None
            profile = parts[3] if len(parts) >= 4 and parts[3] and parts[3] != '-' else None
            description = parts[4] if len(parts) >= 5 and parts[4] and parts[4] != '-' else None
            self.characters[name] = {
                'full_body': full_body,
                'portrait': portrait,
                'profile': profile,
                'description': description
            }

    def _parse_scene_dialogue(self, text):
        # Split into blocks that begin with a '[' header line
        lines = text.split('\n')
        blocks = []  # list[list[str]]
        current = []
        for line in lines:
            if line.strip().startswith('['):
                if current:
                    blocks.append(current)
                current = [line]
            else:
                if current:
                    current.append(line)
        if current:
            blocks.append(current)

        results = []
        for blk in blocks:
            header_line = blk[0]
            trailing_block = '\n'.join(blk[1:]).strip()
            m = re.match(r'\[([^\]]+)\](.*)$', header_line)
            if not m:
                continue
            header_content = m.group(1).strip()
            inline_after = m.group(2).strip()

            # Combine inline content with following lines
            content = inline_after
            if trailing_block:
                content = (content + '\n' + trailing_block).strip()

            # Handle choices specially: attach to previous entry
            if header_content.lower().startswith('choices'):
                parts = [p.strip() for p in header_content.split('|')]
                if len(parts) >= 2 and parts[1].lower() == 'dice':
                    # [choices | dice | min | max]
                    dice_min = _to_int_safe(parts[2]) if len(parts) > 2 else 1
                    dice_max = _to_int_safe(parts[3]) if len(parts) > 3 else 20
                    choices = []
                    for ln in content.split('\n'):
                        if not ln.strip() or '|' not in ln:
                            continue
                        left, nxt = ln.split('|', 1)
                        rng = left.strip()
                        nxt = nxt.strip()
                        m2 = re.match(r'^(\d+)\s*-\s*(\d+)$', rng)
                        if not m2:
                            continue
                        cmin = int(m2.group(1))
                        cmax = int(m2.group(2))
                        choices.append({"dice-min": cmin, "dice-max": cmax, "next": nxt})

                    if results:
                        results[-1]["dice-choices"] = {
                            "dice-min": dice_min,
                            "dice-max": dice_max,
                            "choices": choices
                        }
                    else:
                        # Create a placeholder to carry dice-choices when no previous entry
                        results.append({
                            "modifiers": {"class": "dialogue-simple"},
                            "dice-choices": {
                                "dice-min": dice_min,
                                "dice-max": dice_max,
                                "choices": choices
                            }
                        })
                else:
                    # Simple choices list under the last entry
                    choices = []
                    for ln in content.split('\n'):
                        if not ln.strip() or '|' not in ln:
                            continue
                        left, nxt = ln.split('|', 1)
                        text = left.strip()
                        nxt = nxt.strip()
                        choices.append({"text": text, "next": nxt})

                    if results:
                        results[-1]["choices"] = choices
                    else:
                        # Create placeholder entry with choices
                        results.append({
                            "modifiers": {"class": "dialogue-simple"},
                            "choices": choices
                        })
                continue

            # Narration
            if header_content.lower() == 'narration':
                results.append({
                    "modifiers": {"class": "dialogue-simple"},
                    "text": content
                })
                continue

            # Image
            if header_content.lower() == 'image':
                url = content.strip()
                results.append({
                    "modifiers": {"class": "dialogue-simple"},
                    "text": f'<img src="{url}">'
                })
                continue

            # Character line: [name | display | modifiers]
            cols = [p.strip() for p in header_content.split('|')]
            if len(cols) == 1:
                char_name = cols[0]
                display_name = char_name
                mods_raw = ''
            elif len(cols) == 2:
                char_name = cols[0]
                display_name = cols[1] if cols[1] else char_name
                mods_raw = ''
            else:
                char_name = cols[0]
                display_name = cols[1] if cols[1] else char_name
                mods_raw = cols[2]

            modifiers = [mm.strip().lower() for mm in mods_raw.split(',') if mm.strip()]
            is_right = any('right' in m for m in modifiers)
            is_hidden = any('hidden' in m for m in modifiers)

            dialogue_class = 'dialogue-container-right' if is_right else 'dialogue-container'

            portrait_url = ''
            if char_name in self.characters:
                portrait_url = self.characters[char_name].get('portrait') or ''

            entry = {
                "name": display_name,
                "portrait": portrait_url,
                "modifiers": {"class": dialogue_class}
            }
            if is_hidden:
                entry["modifiers"]["hidden"] = True
            if content:
                entry["text"] = content

            results.append(entry)

        return results

    # ---------------------- Output ----------------------
    def to_json(self):
        # Only process dice stories
        if self.story_type != 'dice':
            raise ValueError("Aborted: Only Type: dice is supported for JSON output.")

        scenes_list = [self.scenes[sid] for sid in self.scenes_order]
        return json.dumps({"scenes": scenes_list}, ensure_ascii=False, indent=2)


def _to_int_safe(val, default=None):
    try:
        return int(str(val).strip())
    except Exception:
        return default


def main():
    if len(sys.argv) != 2:
        print("Usage: python storyJsonGenerator.py <input_file.txt>")
        sys.exit(1)

    input_file = sys.argv[1]
    gen = StoryJSONGenerator(input_file)
    gen.parse()

    # Enforce dice-only as requested
    if gen.story_type != 'dice':
        print("Aborted: Type is not 'dice'.")
        sys.exit(0)

    # Determine output path: ./CYOA/<File name>.json relative to this script
    out_name = (gen.file_name or Path(input_file).stem) + '.json'
    base_dir = Path(__file__).resolve().parent
    out_path = base_dir / 'CYOA' / out_name
    out_path.parent.mkdir(parents=True, exist_ok=True)

    # If exists, ask to overwrite
    if out_path.exists():
        try:
            resp = input(f"File '{out_path}' exists. Overwrite? [y/N]: ").strip().lower()
        except EOFError:
            resp = ''
        if resp not in ('y', 'yes'):
            print("Aborted: existing file not overwritten.")
            sys.exit(0)

    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(gen.to_json())

    print(f"JSON generated successfully: {out_path}")


if __name__ == '__main__':
    main()
