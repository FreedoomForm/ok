
import fs from 'fs';
import path from 'path';

const TRANSLATIONS_FILE = path.join(process.cwd(), 'src', 'lib', 'translations.ts');

const content = fs.readFileSync(TRANSLATIONS_FILE, 'utf-8');
const lines = content.split('\n');
const newLines: string[] = [];

for (const line of lines) {
    // Check if line is a generated key
    if (line.trim().startsWith('auto_')) {
        // 1. Remove keys that look like they captured logic
        // Value starts with '{' or has logic syntax like ' ? '
        if (line.includes(": '{")) {
            console.log(`Removing logic capture: ${line.trim()}`);
            continue;
        }
        if (line.includes(" ? ") && line.includes(":")) {
            console.log(`Removing ternary logic: ${line.trim()}`);
            continue;
        }

        // 2. Fix nested quotes
        // Logic: if value (inside outer quotes) contains the same quote type unescaped.
        const match = line.match(/^\s*(auto_[a-z0-9_]+):\s*(['"`])(.*)\2,\s*$/);
        if (match) {
            const key = match[1];
            const quote = match[2];
            let value = match[3];

            // If value contains unescaped quote of same type
            // checking unescaped: quote symbol not preceded by \
            const unescapedRegex = new RegExp(`(?<!\\\\)${quote}`, 'g');
            if (unescapedRegex.test(value)) {
                // Escape them!
                console.log(`Fixing quotes in: ${key}`);
                const fixedValue = value.replace(unescapedRegex, `\\${quote}`);
                newLines.push(`                ${key}: ${quote}${fixedValue}${quote},`);
                continue;
            }
        }
    }
    newLines.push(line);
}

fs.writeFileSync(TRANSLATIONS_FILE, newLines.join('\n'), 'utf-8');
console.log('Cleaned translations.ts');
