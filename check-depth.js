const fs = require('fs');
const content = fs.readFileSync('src/components/admin/AdminDashboardPage.tsx', 'utf-8');
const lines = content.split('\n');

let d = 0;
let tag = 'root';
const dMap = {};

for (let i = 0; i < lines.length; i++) {
  const l = lines[i];
  const m = l.match(/<TabsContent value="([^"]+)"/);
  if (m) {
    tag = m[1];
    if (!dMap[tag]) dMap[tag] = { startLine: i+1, startDepth: d, endDepth: [] };
  }
  
  d += (l.match(/<div(\s|>)/g) || []).length;
  d -= (l.match(/<\/div>/g) || []).length;
  
  if (l.includes('</TabsContent')) {
    if (dMap[tag]) {
      dMap[tag].endDepth.push({ line: i+1, depth: d });
    }
  }
}
console.log(dMap);
console.log('Final:', d);
