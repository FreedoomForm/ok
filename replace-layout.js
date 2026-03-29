const fs = require('fs');
const file = 'src/components/admin/AdminDashboardPage.tsx';
let c = fs.readFileSync(file, 'utf-8');

const s = c.indexOf('<main className="relative z-10 mx-auto max-w-7xl');
if (s === -1) {
    console.log("Could not find old main.");
    process.exit(1);
}

// Find the SECOND '/>' after '<main' to properly capture both DesktopTabsNav and MobileBottomTabsNav
const firstClosed = c.indexOf('/>', s);
const e = c.indexOf('/>', firstClosed + 2) + 2;

const target = c.substring(s, e);
console.log("Replacing:\n", target);

const replacement = `      <div className="flex flex-col md:flex-row flex-1 py-3 md:py-6 px-2 md:px-4 gap-3 md:gap-5 pb-24 md:pb-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col md:flex-row flex-1 w-full gap-3 md:gap-5">
          <DesktopTabsNav
            visibleTabs={visibleTabs}
            copy={tabsCopy}
          />
          <MobileBottomTabsNav
            visibleTabs={visibleTabs}
            copy={tabsCopy}
          />

          <main className="flex-1 min-w-0">
            <div className="content-card h-full flex flex-col gap-4 md:gap-6 relative overflow-hidden px-3 md:px-8 py-4 md:py-6 bg-gourmet-cream dark:bg-dark-surface rounded-[30px] md:rounded-[40px] shadow-2xl border-none transition-colors duration-300">
              {/* Background Watermark */}
              <div className="absolute top-8 right-8 opacity-[0.03] dark:opacity-[0.05] pointer-events-none">
                <CookingPot className="w-48 h-48 text-gourmet-ink dark:text-dark-text" />
              </div>`;
              
c = c.slice(0, s) + replacement + c.slice(e);
fs.writeFileSync(file, c);
console.log("Replaced successfully.");
