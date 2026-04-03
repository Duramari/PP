# 🐝 Dialbee Logo — Developer Guide

## Chosen Logo: Image 2 (Flying Bee — Teal Theme)

### Files in this folder:
- `dialbee-logo-chosen.png` ← **USE THIS** — Main logo
- `dialbee-logo-option1.png` — Alternative (green shield)
- `dialbee-logo-option3.png` — Alternative (transparent bg)

---

## Where to Place Logo

```
frontend/
  public/
    dialbee-logo.png     ← Copy dialbee-logo-chosen.png here
    favicon.ico          ← Convert logo to .ico (32x32)
    apple-touch-icon.png ← Convert logo (180x180)
```

## How to Use in Code

```tsx
// In Next.js pages:
<img src="/dialbee-logo.png" alt="Dialbee" height="42" />

// Or with Next/Image (recommended):
import Image from 'next/image';
<Image src="/dialbee-logo.png" alt="Dialbee" width={160} height={42} />
```

## Brand Colors (from chosen logo)

```css
--brand-primary:   #1B7A6E;  /* Deep teal */
--brand-secondary: #2A9D8F;  /* Medium teal */
--brand-accent:    #F5C400;  /* Bee yellow */
--brand-dark:      #0D4A42;  /* Dark teal */
--brand-light:     #E8F8F5;  /* Light teal bg */
```

## Tailwind Config (add to tailwind.config.js)

```js
module.exports = {
  theme: {
    extend: {
      colors: {
        brand: {
          primary:   '#1B7A6E',
          secondary: '#2A9D8F',
          accent:    '#F5C400',
          dark:      '#0D4A42',
          light:     '#E8F8F5',
        }
      }
    }
  }
}
```

## Favicon Generation

Upload `dialbee-logo-chosen.png` to:
https://realfavicongenerator.net/

Download and place in `frontend/public/`
