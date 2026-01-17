
import fs from 'fs';
import path from 'path';

const menuDataPath = path.join(process.cwd(), 'src/lib/menuData.ts');
const parsedDataPath = path.join(process.cwd(), 'src/lib/menuData.parsed.ts');

const menuData = fs.readFileSync(menuDataPath, 'utf-8');
const parsedData = fs.readFileSync(parsedDataPath, 'utf-8');

// Replace the entire variable definition using regex
// Matches: export const MENUS: DailyMenu[] = (anything non-greedy) ;
const regex = /export const MENUS: DailyMenu\[] = [\s\S]*?;/;

if (!regex.test(menuData)) {
    console.error('Could not find MENUS definition matching regex');
    console.log('File content preview:', menuData.substring(0, 500)); // Debug
    process.exit(1);
}

const newContent = menuData.replace(regex, parsedData.trim());

fs.writeFileSync(menuDataPath, newContent, 'utf-8');
console.log('Successfully updated MENUS in menuData.ts');
