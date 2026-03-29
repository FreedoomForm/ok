import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const filePath = join(process.cwd(), 'src', 'components', 'admin', 'AdminDashboardPage.tsx');
let content = readFileSync(filePath, 'utf-8');

// 1. Update imports
if (!content.includes('CookingPot')) {
  content = content.replace("Database,\n} from 'lucide-react'", "Database,\n  Utensils,\n  CookingPot,\n} from 'lucide-react'");
}

// 2. Update loading state
const oldLoading = `  if (isLoading) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-background bg-app-paper flex items-center justify-center">
        <div className="pointer-events-none fixed inset-0 z-0 [background:var(--app-bg-grid)] opacity-45" />
        <div className="pointer-events-none fixed inset-x-0 top-0 z-0 h-[20rem] bg-gradient-to-b from-main/20 via-main/10 to-transparent" />
        <div className="relative z-10 text-center animate-fade-in">
          <div className="flex items-center justify-center gap-1.5 mb-3">
            <span className="h-2 w-2 rounded-md bg-foreground/60 animate-pulse" style={{ animationDelay: '0ms' }} />
            <span className="h-2 w-2 rounded-md bg-foreground/40 animate-pulse" style={{ animationDelay: '150ms' }} />
            <span className="h-2 w-2 rounded-md bg-foreground/20 animate-pulse" style={{ animationDelay: '300ms' }} />
          </div>
          <p className="text-xs text-muted-foreground tracking-wide">Loading...</p>
        </div>
      </div>
    )
  }`;

const newLoading = `  if (isLoading) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-gourmet-cream dark:bg-dark-bg flex items-center justify-center transition-colors duration-300">
        <div className="absolute top-10 right-10 opacity-5 dark:opacity-10 pointer-events-none">
          <CookingPot className="w-64 h-64 text-gourmet-ink dark:text-dark-text" />
        </div>
        <div className="relative z-10 text-center animate-fade-in">
          <div className="w-20 h-20 bg-gourmet-green dark:bg-dark-green rounded-full shadow-2xl flex items-center justify-center border-b-4 border-black/20 mx-auto mb-4">
            <div className="w-16 h-16 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center">
              <Utensils className="w-8 h-8 text-gourmet-ink dark:text-dark-text animate-pulse" />
            </div>
          </div>
          <p className="text-sm font-bold text-gourmet-ink dark:text-dark-text tracking-wide">Loading...</p>
        </div>
      </div>
    )
  }`;

content = content.replace(oldLoading, newLoading);

// 3. Update main wrapper and header
const oldHeaderAndWrapper = `  return (
    <div className="relative min-h-screen overflow-hidden bg-background bg-app-paper">
      <div className="pointer-events-none fixed inset-0 z-0 [background:var(--app-bg-grid)] opacity-45" />
      <div className="pointer-events-none fixed inset-x-0 top-0 z-0 h-[20rem] bg-gradient-to-b from-main/20 via-main/10 to-transparent" />
      {/* Header */}
      <header className="relative z-10 border-b-2 border-border/80 bg-background/35 backdrop-blur-md supports-[backdrop-filter]:bg-background/25">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14">
            <div className="flex items-center gap-4">
              <h1 className="text-base font-semibold tracking-tight hidden md:block">{t.admin.dashboard}</h1>
              <span className="hidden md:block text-xs text-muted-foreground">|</span>
              <span className="text-xs text-muted-foreground hidden md:block">
                {currentDate || ' '}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <IconButton
                label={
                  adminSettingsMounted
                    ? \`\${t.admin.theme}: \${
                        adminSettings.theme === 'system'
                          ? t.admin.system
                          : adminSettings.theme === 'dark'
                            ? t.admin.dark
                            : t.admin.light
                      }\`
                    : t.admin.theme
                }
                type="button"
                variant="outline"
                iconSize="md"
                onClick={() => {
                  const next =
                    adminSettings.theme === 'light' ? 'dark' : adminSettings.theme === 'dark' ? 'system' : 'light'
                  updateAdminSettings({ theme: next })
                }}
              >
                {adminSettings.theme === 'dark' ? (
                  <Moon className="h-4 w-4" />
                ) : adminSettings.theme === 'system' ? (
                  <Monitor className="h-4 w-4" />
                ) : (
                  <Sun className="h-4 w-4" />
                )}
              </IconButton>
              <LanguageSwitcher />
              <div className="hidden md:block">
                <TrialStatus compact />
              </div>
              {isMiddleAdminView && (
                <Button
                  asChild
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 md:hidden"
                  aria-label={profileUiText.database}
                  title={profileUiText.database}
                >
                  <Link href="/middle-admin/database">
                    <Database className="w-4 h-4" />
                  </Link>
                </Button>
              )}
              {isMiddleAdminView && (
                <Button
                  asChild
                  variant="ghost"
                  size="icon"
                  className="hidden md:inline-flex h-9 w-9"
                  aria-label={profileUiText.database}
                  title={profileUiText.database}
                >
                  <Link href="/middle-admin/database">
                    <Database className="w-4 h-4" />
                  </Link>
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <IconButton label="Profile" variant="ghost" iconSize="md" className="h-9 w-9">
                    <CircleUser className="h-4 w-4" />
                  </IconButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => setIsChatOpen(true)} className="gap-2">
                    <MessageSquare className="h-4 w-4" />
                    <span>{profileUiText.messages}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setIsSettingsOpen(true)} className="gap-2">
                    <Settings className="h-4 w-4" />
                    <span>{t.admin.settings}</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => void handleLogout()} className="gap-2 text-rose-600 focus:text-rose-600">
                    <LogOut className="h-4 w-4" />
                    <span>{t.common.logout}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>`;

const newHeaderAndWrapper = `  return (
    <div className="min-h-screen flex flex-col bg-gourmet-cream dark:bg-dark-bg transition-colors duration-300">
      {/* Header */}
      <header className="h-16 md:h-20 bg-dark-green flex items-center justify-between px-4 md:px-8 rounded-b-[25px] md:rounded-b-[40px] shadow-xl z-30 transition-colors duration-300 border-none">
        <div className="flex items-center gap-2 md:gap-4 cursor-pointer">
          <div className="bg-gourmet-green dark:bg-dark-surface p-2 md:p-2.5 rounded-full shadow-inner border-[3px] border-white/20 dark:border-white/10 transition-colors duration-300">
            <Utensils className="w-5 h-5 md:w-7 md:h-7 text-gourmet-ink dark:text-dark-text" />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-bold text-gourmet-ink dark:text-dark-text tracking-tight uppercase">Gourmet</h1>
            <p className="hidden md:block text-[10px] text-gourmet-ink dark:text-dark-text font-medium">{currentDate || 'Management'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          <button
            type="button"
            title={adminSettingsMounted
              ? \`\${t.admin.theme}: \${adminSettings.theme === 'system' ? t.admin.system : adminSettings.theme === 'dark' ? t.admin.dark : t.admin.light}\`
              : t.admin.theme
            }
            onClick={() => {
              const next = adminSettings.theme === 'light' ? 'dark' : adminSettings.theme === 'dark' ? 'system' : 'light'
              updateAdminSettings({ theme: next })
            }}
            className="w-10 h-10 md:w-12 md:h-12 bg-gourmet-green dark:bg-dark-surface rounded-full shadow-xl flex items-center justify-center border-b-[3px] border-black/10 transition-all duration-300 hover:scale-110 active:scale-90"
          >
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full border border-dashed border-white/10 flex items-center justify-center">
              {adminSettings.theme === 'dark' ? (
                <Moon className="h-4 w-4 md:h-5 md:w-5 text-gourmet-ink dark:text-dark-text" />
              ) : adminSettings.theme === 'system' ? (
                <Monitor className="h-4 w-4 md:h-5 md:w-5 text-gourmet-ink dark:text-dark-text" />
              ) : (
                <Sun className="h-4 w-4 md:h-5 md:w-5 text-gourmet-ink dark:text-dark-text" />
              )}
            </div>
          </button>
          
          <LanguageSwitcher />
          
          <div className="hidden md:block">
            <TrialStatus compact />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-10 h-10 md:w-12 md:h-12 bg-gourmet-green dark:bg-dark-surface rounded-full shadow-xl flex items-center justify-center border-b-[3px] border-black/10 transition-all duration-300 hover:scale-110 hover:rotate-[5deg] active:scale-90">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full border border-dashed border-white/10 flex items-center justify-center">
                  <CircleUser className="h-4 w-4 md:h-5 md:w-5 text-gourmet-ink dark:text-dark-text" />
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40 rounded-xl shadow-xl border border-black/5 dark:border-white/10 bg-gourmet-cream dark:bg-dark-surface p-1">
              <DropdownMenuItem onSelect={() => setIsChatOpen(true)} className="gap-2 rounded-lg cursor-pointer">
                <MessageSquare className="h-4 w-4 text-gourmet-ink dark:text-dark-text" />
                <span className="font-bold text-gourmet-ink dark:text-dark-text text-sm">{profileUiText.messages}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setIsSettingsOpen(true)} className="gap-2 rounded-lg cursor-pointer">
                <Settings className="h-4 w-4 text-gourmet-ink dark:text-dark-text" />
                <span className="font-bold text-gourmet-ink dark:text-dark-text text-sm">{t.admin.settings}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-black/5 dark:bg-white/10 my-1" />
              <DropdownMenuItem onSelect={() => void handleLogout()} className="gap-2 text-rose-600 focus:text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-950/30 rounded-lg cursor-pointer">
                <LogOut className="h-4 w-4" />
                <span className="font-bold text-sm">{t.common.logout}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>`;

content = content.replace(oldHeaderAndWrapper, newHeaderAndWrapper);

// 4. Update the layout wrapping
const oldMainTabs = `      <main className="relative z-10 mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 md:py-6 mobile-bottom-space">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <DesktopTabsNav
            visibleTabs={visibleTabs}
            copy={tabsCopy}
          />
          <MobileBottomTabsNav
            visibleTabs={visibleTabs}
            copy={tabsCopy}
          />`;

const newMainTabs = `      <div className="flex flex-col md:flex-row flex-1 py-3 md:py-6 px-2 md:px-4 gap-3 md:gap-5 pb-24 md:pb-6">
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

content = content.replace(oldMainTabs, newMainTabs);

// 5. Update the closing tags correctly
// Remove the existing early closing tags for the old layout if they exist around the end of TabsContent
const oldClosingTagsP1 = `\n        </Tabs>\n      </main >`;
const oldClosingTagsP2 = `\n        </Tabs>\n      </main>`;
if (content.includes(oldClosingTagsP1)) {
  content = content.replace(oldClosingTagsP1, '');
} else if (content.includes(oldClosingTagsP2)) {
  content = content.replace(oldClosingTagsP2, '');
} else {
  // If not exactly matching, use regex to remove `</Tabs>` and `</main>` that are before `<!-- bulk edit -->` or the bottom dialogs
  content = content.replace(/<\/Tabs>\s*<\/main ?>(?=\s*{\/\* Bulk edit modals)/m, '');
}

// Add our proper closing tags at the very bottom, right before `</div>\n  )\n}`
const newEnding = `            </div>{/* end content-card */}
          </main>
        </Tabs>
      </div>{/* end flex container */}
    </div>
  )
}`;
const oldEnding = `    </div>\n  )\n}`;
if (!content.includes('end content-card')) {
  // It shouldn't, unless a previous run left it. Let's do a safe replacement.
  const endMatch = content.match(/<\/Dialog>\s*<\/div>\s*\)\s*}/);
  if (endMatch) {
    content = content.replace(/<\/Dialog>\s*<\/div>\s*\)\s*}/, `</Dialog>\n${newEnding}`);
  }
}

writeFileSync(filePath, content, 'utf-8');
console.log('Layout updated.');
