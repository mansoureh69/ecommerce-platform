# Khosheh design system

The Khosheh presentation layer is adapted from `D:/Projects/source/khosheh-flower-shop/khosheh-flower-shop`. Its `DESIGN.md`, current header and footer, font pairing, and logo are the visual source of truth. Prototype markup, fake products, phone numbers, delivery promises, and remote sample imagery were deliberately excluded.

## Direction

The system is Botanical Editorial Luxury: a Persian floral boutique expressed through generous space, botanical photography, hairline structure, and restrained color. Visual variance is 7, motion is 4, and density is 3. Motion is limited to hover and state feedback and respects reduced-motion preferences.

## Tokens

- Botanical forest `#1F3A2B` anchors headings and navigation.
- Rose petal `#B5485F` is the singular commerce and interaction accent.
- Foliage sage `#5F7054` supports positive and availability states.
- Champagne gold `#C5A059` is reserved for heirloom detail.
- Ivory `#FDFBF7`, alabaster `#FAF7F2`, and white form the surface hierarchy.
- Carbon ink `#241E1C` and its softer variants provide readable text.

Playfair Display is used for Latin display type, Plus Jakarta Sans for Latin interface copy, and Vazirmatn for Persian and Arabic. RTL display text receives additional line height. Prices use tabular numerals. Product media uses a 4:5 aspect ratio.

Containers use 12px corners, fields use 8px corners, and touch actions use a full pill radius. Shadows are tinted with carbon ink at low opacity. The dark color scheme retains the forest and rose identity while reversing the surface hierarchy.

## Localization

English, Persian, and Arabic are separate JSON message files under the Khosheh app. Locale routing uses `/en`, `/fa`, and `/ar`. The locale root layout sets `lang` and `dir` on the HTML element. Components use logical CSS properties and collapse asymmetric layouts to one column below 768px.

The backend has no localized Catalog fields. Navigation, forms, metadata, and design-system copy are localized; product names and descriptions remain exactly as stored by the backend until a localized content contract exists.
