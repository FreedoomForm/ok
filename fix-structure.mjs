import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const filePath = join(process.cwd(), 'src', 'components', 'admin', 'AdminDashboardPage.tsx');
let content = readFileSync(filePath, 'utf-8');

// Fix 1: Restore the deleted client status code around line 3457
// The edit accidentally removed lines between ')}\n' closing and '</TableCell>'
// We need to add back the deleted EntityStatusBadge section
const deletedCodeMarker = `                                )}\n                              </div>\n                            </TableCell>\n                            <TableCell className="py-1.5">\n                              <EntityStatusBadge\n                                isActive={client.isActive}\n                                activeLabel={t.admin.table.active}\n                                inactiveLabel={t.admin.table.paused}\n                                inactiveTone="danger"\n                                showDot\n                                onClick={() => handleToggleClientStatus(client.id, client.isActive)}\n                              />\n                            </TableCell>`;

// Find where the deletion happened - look for the pattern where ')}\r\n' is followed directly by '</TableCell>'
// without the div/EntityStatusBadge in between
const brokenPattern = ')}\r\n                            </TableCell>';
const fixedPattern = ')}\r\n                              </div>\r\n                            </TableCell>\r\n                            <TableCell className="py-1.5">\r\n                              <EntityStatusBadge\r\n                                isActive={client.isActive}\r\n                                activeLabel={t.admin.table.active}\r\n                                inactiveLabel={t.admin.table.paused}\r\n                                inactiveTone="danger"\r\n                                showDot\r\n                                onClick={() => handleToggleClientStatus(client.id, client.isActive)}\r\n                              />\r\n                            </TableCell>';

if (content.includes(brokenPattern)) {
  // Only replace the first occurrence since it's the one that was broken
  content = content.replace(brokenPattern, fixedPattern);
  console.log('Fix 1: Restored deleted EntityStatusBadge code');
} else {
  console.log('Fix 1: Pattern not found, skipping');
}

// Fix 2: Remove the old </Tabs> and </main> closing tags
// Look for the pattern after </TabsContent> for finance tab, then </Tabs> </main>
const oldClosingPattern = '</TabsContent>\r\n\r\n\r\n        </Tabs>\r\n      </main >';
const newClosingPattern = '</TabsContent>';
if (content.includes(oldClosingPattern)) {
  content = content.replace(oldClosingPattern, newClosingPattern);
  console.log('Fix 2: Removed old </Tabs> and </main> closing tags');
} else {
  // Try without double empty lines
  const alt1 = '</TabsContent>\r\n\r\n        </Tabs>\r\n      </main >';
  const alt2 = '</TabsContent>\r\n        </Tabs>\r\n      </main >';
  if (content.includes(alt1)) {
    content = content.replace(alt1, newClosingPattern);
    console.log('Fix 2 (alt1): Removed old closing tags');
  } else if (content.includes(alt2)) {
    content = content.replace(alt2, newClosingPattern);
    console.log('Fix 2 (alt2): Removed old closing tags');
  } else {
    console.log('Fix 2: Could not find old closing pattern');
    // Search for just </Tabs> near end of TabsContent
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim() === '</Tabs>' && i > 3700) {
        console.log(`  Found </Tabs> at line ${i+1}: ${lines[i].trim()}`);
      }
      if (lines[i].includes('</main') && i > 3700) {
        console.log(`  Found </main> at line ${i+1}: ${lines[i].trim()}`);
      }
    }
  }
}

// Fix 3: Fix the end of file - ensure proper closing tags
// The structure should end with:
// </Dialog>  (last dialog)
// followed by closing tags for: content-card div, main, Tabs, flex div, root div
const endPattern = '      </Dialog>\r\n\r\n          </div>{/* end content-card */}\r\n        </main>\r\n        </Tabs>\r\n      </div>{/* end flex container */}\r\n    </div>\r\n  )\r\n}';

if (content.includes(endPattern)) {
  console.log('Fix 3: End pattern already correct');
} else {
  console.log('Fix 3: End pattern not found, checking...');
  const lines = content.split('\n');
  console.log('Last 15 lines:');
  for (let i = Math.max(0, lines.length - 15); i < lines.length; i++) {
    console.log(`  ${i+1}: ${lines[i]}`);
  }
}

writeFileSync(filePath, content, 'utf-8');
console.log('Done!');
