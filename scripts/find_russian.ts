
import fs from 'fs';
import path from 'path';

const SRC_DIR = path.join(process.cwd(), 'src');
const OUTPUT_FILE = path.join(process.cwd(), 'scripts', 'russian_strings.json');

// Regex to detect Cyrillic characters
const CYRILLIC_REGEX = /[а-яА-ЯёЁ]+/;

interface FoundString {
    file: string;
    line: number;
    text: string;
    context: 'JSX_TEXT' | 'LITERAL' | 'ATTRIBUTE' | 'UNKNOWN';
    proposedKey?: string;
}

const foundStrings: FoundString[] = [];

function scanDirectory(dir: string) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            scanDirectory(fullPath);
        } else if (stat.isFile() && (file.endsWith('.tsx') || file.endsWith('.ts'))) {
            if (fullPath.includes('src\\lib\\translations.ts') || fullPath.includes('src/lib/translations.ts')) continue;
            scanFile(fullPath);
        }
    }
}

function scanFile(filePath: string) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    let inMultiLineComment = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();

        // Simple comment handling (perfect parsing is hard without AST, but this covers 99%)
        if (inMultiLineComment) {
            if (line.includes('*/')) inMultiLineComment = false;
            continue;
        }
        if (line.includes('/*')) {
            inMultiLineComment = true;
            continue;
        }
        if (trimmedLine.startsWith('//')) continue;

        if (!CYRILLIC_REGEX.test(line)) continue;

        // Naive context detection based on common patterns
        let context: 'JSX_TEXT' | 'LITERAL' | 'ATTRIBUTE' | 'UNKNOWN' = 'UNKNOWN';
        let match = line.match(CYRILLIC_REGEX);

        if (!match) continue; // Should not happen given check above

        // Attempt to extract the full string literal or text content
        // This is heuristic-based to extract "Some Text" or 'Some Text' or >Some Text<

        const stringLiterals = line.match(/(["'`])((?:(?=(\\?))\3.)*?)\1/g);
        const jsxText = line.match(/>([^<]+)</g);

        let extracted = false;

        // Check String Literals
        if (stringLiterals) {
            for (const literal of stringLiterals) {
                // Remove quotes
                const content = literal.slice(1, -1);
                if (CYRILLIC_REGEX.test(content)) {
                    // Check if it's an attribute
                    const isAttribute = new RegExp(`=[\\s]*${escapeRegExp(literal)}`).test(line);

                    foundStrings.push({
                        file: filePath,
                        line: i + 1,
                        text: content,
                        context: isAttribute ? 'ATTRIBUTE' : 'LITERAL'
                    });
                    extracted = true;
                }
            }
        }

        // Check JSX Text
        // Case: <div>Текст</div>
        // Case: >Текст<
        const jsxContentMatches = line.match(/>([^<]+)</);
        if (jsxContentMatches) {
            const content = jsxContentMatches[1];
            if (CYRILLIC_REGEX.test(content)) {
                foundStrings.push({
                    file: filePath,
                    line: i + 1,
                    text: content.trim(),
                    context: 'JSX_TEXT'
                });
                extracted = true;
            }
        }

        // If regex didn't extract neatly but line has Cyrillic, might be bare text or complex
        if (!extracted) {
            // Fallback: take the whole Cyrillic chunk we can find? 
            // Or just log the line content for manual review?
            // Let's log the raw match for now if valid extraction failed
            const rawMatch = line.match(/[а-яА-ЯёЁ\s]+/); // crude
            if (rawMatch) {
                foundStrings.push({
                    file: filePath,
                    line: i + 1,
                    text: rawMatch[0].trim(),
                    context: 'UNKNOWN'
                });
            }
        }

    }
}

function escapeRegExp(string: string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

// ensure scripts dir exists
if (!fs.existsSync(path.join(process.cwd(), 'scripts'))) {
    fs.mkdirSync(path.join(process.cwd(), 'scripts'));
}

scanDirectory(SRC_DIR);

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(foundStrings, null, 2), 'utf-8');
console.log(`Found ${foundStrings.length} Russian strings. Report saved to ${OUTPUT_FILE}`);

