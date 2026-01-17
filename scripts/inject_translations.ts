
import fs from 'fs';
import path from 'path';

const RUSSIAN_STRINGS_FILE = path.join(process.cwd(), 'scripts', 'russian_strings.json');
const TRANSLATIONS_FILE = path.join(process.cwd(), 'src', 'lib', 'translations.ts');

interface FoundString {
    file: string;
    line: number;
    text: string;
    context: 'JSX_TEXT' | 'LITERAL' | 'ATTRIBUTE' | 'UNKNOWN';
}

// Simple transliteration for keys
const transliterate = (text: string) => {
    const map: { [key: string]: string } = {
        'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo', 'ж': 'zh',
        'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o',
        'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts',
        'ч': 'ch', 'ш': 'sh', 'щ': 'sch', 'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu',
        'я': 'ya', ' ': '_'
    };
    return text.toLowerCase().split('').map(char => map[char] || char).join('').replace(/[^a-z0-9_]/g, '').replace(/_+/g, '_').slice(0, 30);
};

// Read report
const foundStrings: FoundString[] = JSON.parse(fs.readFileSync(RUSSIAN_STRINGS_FILE, 'utf-8'));

// Filter for safety: Only .tsx and NOT in api routes
const safeStrings = foundStrings.filter(item => {
    return item.file.endsWith('.tsx') && !item.file.includes('\\api\\') && !item.file.includes('/api/');
});

console.log(`Processing ${safeStrings.length} safe strings out of ${foundStrings.length} total.`);

// Group by file for efficient processing
const stringsByFile: { [file: string]: FoundString[] } = {};
safeStrings.forEach(s => {
    if (!stringsByFile[s.file]) stringsByFile[s.file] = [];
    stringsByFile[s.file].push(s);
});

// Prepare new translations
const newTranslations: { [key: string]: string } = {};

// Process Files
for (const [filePath, items] of Object.entries(stringsByFile)) {
    let content = fs.readFileSync(filePath, 'utf-8');
    let hasLanguageHook = content.includes('useLanguage');

    // safe-guard: if we can't easily parse where to add the hook, skip adding it automatically 
    // and just replace if the hook is there, OR try to be smart.
    // simpler: If 'useLanguage' is missing, add import and hook call.

    // Sort items by line number descending to avoid offset issues
    items.sort((a, b) => b.line - a.line);

    let fileModified = false;

    for (const item of items) {
        const key = `auto_${transliterate(item.text)}`;
        newTranslations[key] = item.text;

        // Replacement logic
        // We need to match the specific line again to be sure
        const lines = content.split('\n');
        const lineContent = lines[item.line - 1]; // 0-indexed

        if (!lineContent || !lineContent.includes(item.text)) {
            console.warn(`[WARN] Skipping ${filePath}:${item.line} - Content mismatch or moved.`);
            continue;
        }

        let newLine = lineContent;
        if (item.context === 'JSX_TEXT') {
            // Replace >Text< with >{language.t('key')}<
            // Be careful to replace only the text part
            newLine = newLine.replace(item.text, `{language.t('generated.${key}')}`);
            fileModified = true;
        } else if (item.context === 'ATTRIBUTE') {
            // Replace attr="Text" with attr={language.t('key')}
            // logic: find the quote wrapping the text
            const regex = new RegExp(`(["'])${escapeRegExp(item.text)}\\1`);
            newLine = newLine.replace(regex, `{language.t('generated.${key}')}`);
            fileModified = true;
        } else if (item.context === 'LITERAL') {
            // Replace 'Text' with language.t('key')
            // This is risky in some JS contexts, but in TSX render block it's usually okay.
            // If it's inside a function: alert('Text') -> alert(language.t('key'))
            const regex = new RegExp(`(["'])${escapeRegExp(item.text)}\\1`);
            newLine = newLine.replace(regex, `language.t('generated.${key}')`);
            fileModified = true;
        }

        if (fileModified) {
            lines[item.line - 1] = newLine;
            content = lines.join('\n');
        }
    }

    if (fileModified) {
        // Add imports if needed
        if (!content.includes('import { useLanguage }')) {
            // Add import at the top
            content = `import { useLanguage } from '@/contexts/LanguageContext';\n` + content;
        }

        // Add hook if needed
        // Heuristic: Find the component definition and add usage
        // This is the "hard part" to do nicely with regex.
        // We look for `export default function Name` or `const Name =` or `function Name`
        // And insert `const { language } = useLanguage();`

        if (!content.includes('const { language } = useLanguage()') && !content.includes('const {language}=useLanguage()')) {
            const componentRegex = /(export\s+default\s+function\s+\w+\s*\(.*?\)\s*{|export\s+function\s+\w+\s*\(.*?\)\s*{|const\s+\w+\s*=\s*\(.*?\)\s*=>\s*{|function\s+\w+\s*\(.*?\)\s*{)/;
            const match = content.match(componentRegex);
            if (match) {
                const insertionIndex = match.index! + match[0].length;
                content = content.slice(0, insertionIndex) + `\n  const { language } = useLanguage();` + content.slice(insertionIndex);
            } else {
                console.warn(`[WARN] Could not find component start in ${filePath}. Manual hook addition required.`);
            }
        }

        fs.writeFileSync(filePath, content, 'utf-8');
        console.log(`Updated ${filePath}`);
    }
}

// Update translations.ts
if (Object.keys(newTranslations).length > 0) {
    let transContent = fs.readFileSync(TRANSLATIONS_FILE, 'utf-8');

    // We need to inject into 'ru', 'uz', 'en'.
    // We'll create a new sections 'generated' in each.

    // simplistic string injection
    const generatedBlock = (obj: { [key: string]: string }) => {
        return `
            generated: {
${Object.entries(obj).map(([k, v]) => `                ${k}: '${v}',`).join('\n')}
            },`;
    };

    // Inject into ru
    // Look for `ru: {` then `common: {` ... we want to append at the end of `ru` object?
    // Let's Find `ru: {` ... match matching brace? Hard.
    // Easier: Find `ru: {` and inject `generated: { ... },` right after it.

    const newKeysBlock = generatedBlock(newTranslations);

    // This is fragile regex replacement but better than nothing without AST
    transContent = transContent.replace(/ru:\s*{/, `ru: {${newKeysBlock}`);
    transContent = transContent.replace(/uz:\s*{/, `uz: {${newKeysBlock}`);
    transContent = transContent.replace(/en:\s*{/, `en: {${newKeysBlock}`);

    fs.writeFileSync(TRANSLATIONS_FILE, transContent, 'utf-8');
    console.log(`Updated translations.ts with ${Object.keys(newTranslations).length} new keys.`);
}

function escapeRegExp(string: string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
