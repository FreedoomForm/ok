#!/usr/bin/env python3
"""Find icon-only Buttons whose JSX tag lacks aria-label (balanced tag scan)."""
import glob

def tag_end(src, start):
    """Walk from '<Button' to the tag-closing '>' at depth 0 ({} and quotes tracked)."""
    i = start
    depth = 0
    quote = None
    while i < len(src):
        c = src[i]
        if quote:
            if c == '\\':
                i += 2
                continue
            if c == quote:
                quote = None
        elif c in '"\'`':
            quote = c
        elif c == '{':
            depth += 1
        elif c == '}':
            depth -= 1
        elif c == '>' and depth == 0:
            return i
        i += 1
    return len(src)

results = []
for path in sorted(glob.glob('src/components/**/*.tsx', recursive=True)):
    src = open(path, encoding='utf-8').read()
    pos = 0
    while True:
        idx = src.find('<Button', pos)
        if idx == -1:
            break
        end = tag_end(src, idx)
        tag = src[idx:end]
        if 'size="icon"' in tag and 'aria-label' not in tag:
            line = src[:idx].count('\n') + 1
            results.append((path, line))
        pos = idx + 7
for p, l in results:
    print(f"{p}:{l}")
print(f"TOTAL-MISSING: {len(results)}")
