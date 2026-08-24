# Visual style transfer findings

The current AutoFood frontend still exposes a strong token-level border system: `--border` and `--input` are visible gray lines, the base layer applies `border-border` to every element, and many components use explicit `border-2`, `rounded-base`, shadows, and neon-style accent classes. The current palette centers on gold/yellow, white, black/navy, and gray, which is visually distinct from the requested flat -1-style surface.

The target direction is a restrained, flat resource workspace: page background and content surfaces should be nearly the same value, borders should be removed or made transparent except for necessary focus/selection affordances, corners should be minimally rounded, and decorative shadows/glows should remain disabled. Existing red/green/blue status colors remain semantic signals for enabled, disabled, warnings, and selection; they should not be removed as domain information.

The change must be implemented through shared CSS tokens and the unified shell first, then individual high-traffic components only where explicit `border-*`, `shadow-*`, or heavy rounded classes override the tokens. The layout must retain keyboard focus rings, touch hit areas, dark/light theme, RU/UZ language switching, and all REST/Prisma behavior.

## Reference repository findings

The selected reference implementation uses a warm editorial palette rather than AutoFood’s cold gold/white/black neobrutalist contrast: paper background `#F7F1E3`, near-white card `#FFFCF3`, dark warm ink `#251E12`, muted brown text `#71624B`, terracotta action `#C14E24`, gold secondary `#B8862B`, and a low-opacity divider `rgba(37,30,18,.14)`. It explicitly preserves saturated green/red semantic status colors while avoiding heavy borders and visual noise. The reference theme is light-first, compact, and content-led; AutoFood’s existing dark mode should remain available, but the light mode should match this surface hierarchy.

Reference source: `app/src/main/java/com/example/ui/theme/Color.kt` and `Theme.kt` in `ozodbekasilbekov2-gif/-1`.
Browser smoke finding (2026-08-25): the fresh production build visibly uses the warm paper/terracotta flat palette with reduced visual treatment. The local test admin dashboard screenshot still shows the legacy four-tab admin body, not the 16-page resource rail, and therefore the Routes locator is absent. This indicates a dashboard mode/fixture branch or visibility mapping issue to diagnose before final browser claims; the style migration itself is visible.
