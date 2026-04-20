import os
import re
import glob
import json

css_files = glob.glob('frontend/src/**/*.scss', recursive=True)

# Pattern to find background or background-color with purple tokens
bg_pattern = re.compile(r'(background(?:-color)?\s*:\s*[^;]*?(?:\$purple(?:-dark|-light)?|var\(--color-primary(?:-dark|-light)?\))[^;]*;)')

replacements = []

for file in css_files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = content
    matches = bg_pattern.finditer(content)
    
    modified = False
    for match in matches:
        old_line = match.group(1)
        # replace with var(--color-bg-page)
        new_line = re.sub(r'(\$purple(?:-dark|-light)?|var\(--color-primary(?:-dark|-light)?\))', 'var(--color-bg-page)', old_line)
        
        if new_line != old_line:
            # find selector by looking backwards
            pos = match.start()
            before = content[:pos]
            selector_match = re.search(r'([\.#a-zA-Z0-9_-][^\{]*?)\{([^\}]*)$', before)
            selector = selector_match.group(1).strip() if selector_match else 'unknown selector'
            
            replacements.append({
                'file': file,
                'selector': ' '.join(selector.split()),
                'old': old_line.strip(),
                'new': new_line.strip()
            })
            
            new_content = new_content.replace(old_line, new_line, 1)
            modified = True
            
    if modified:
        with open(file, 'w', encoding='utf-8') as f:
            f.write(new_content)

with open('replacements.json', 'w', encoding='utf-8') as f:
    json.dump(replacements, f, indent=2)

print(f"Processed {len(css_files)} files. Found {len(replacements)} replacements.")
