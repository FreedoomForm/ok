# Landing page UI check

Date: 2026-08-22

The production staging homepage `/` rendered successfully after removing the scroll listener, fixed decorative background layers, animated watermark, card elevation and hover translation effects. Header, language switcher, admin login link, hero CTA, trust items, operational cards, portal section, role section, pricing section and footer remained visible.

The browser CTA `Войти` navigated to `/login` successfully. No route or hydration failure was observed. The change preserved existing copy, localized content, CTA destination and responsive structure while reducing runtime listeners and decorative effects.
