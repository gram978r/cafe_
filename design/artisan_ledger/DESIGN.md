---
name: Artisan Ledger
colors:
  surface: '#fff8f4'
  surface-dim: '#e4d8ce'
  surface-bright: '#fff8f4'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#fef1e8'
  surface-container: '#f9ece2'
  surface-container-high: '#f3e6dc'
  surface-container-highest: '#ede0d7'
  on-surface: '#201a15'
  on-surface-variant: '#4e4541'
  inverse-surface: '#362f29'
  inverse-on-surface: '#fceee5'
  outline: '#807571'
  outline-variant: '#d2c4bf'
  surface-tint: '#6a5b56'
  primary: '#180e0b'
  on-primary: '#ffffff'
  primary-container: '#2e231f'
  on-primary-container: '#9a8983'
  inverse-primary: '#d5c3bc'
  secondary: '#3b6750'
  on-secondary: '#ffffff'
  secondary-container: '#bdeed0'
  on-secondary-container: '#416d56'
  tertiary: '#220800'
  on-tertiary: '#ffffff'
  tertiary-container: '#431800'
  on-tertiary-container: '#c47a52'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#f2ded8'
  primary-fixed-dim: '#d5c3bc'
  on-primary-fixed: '#231915'
  on-primary-fixed-variant: '#51443f'
  secondary-fixed: '#bdeed0'
  secondary-fixed-dim: '#a2d1b5'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#234f3a'
  tertiary-fixed: '#ffdbcb'
  tertiary-fixed-dim: '#ffb691'
  on-tertiary-fixed: '#341100'
  on-tertiary-fixed-variant: '#713714'
  background: '#fff8f4'
  on-background: '#201a15'
  surface-variant: '#ede0d7'
typography:
  headline-xl:
    fontFamily: Epilogue
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Epilogue
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Epilogue
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.015em
  headline-lg-mobile:
    fontFamily: Epilogue
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 30px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Epilogue
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  title-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 26px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
  metric-display:
    fontFamily: JetBrains Mono
    fontSize: 30px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.03em
  metric-display-mobile:
    fontFamily: JetBrains Mono
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.02em
  label-code:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-caps:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.06em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.25rem
  gutter-mobile: 0.75rem
  margin: 2rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.25rem
  space-2xl: 3.5rem
---

## Brand & Style

This design system is tailored for daily cafe closings, stock reconciliation, and operational analytics. It serves cafe owners, baristas, and floor managers operating under fast-paced, high-fatigue conditions—specifically during late-night closing shifts or rapid morning handovers.

### Design Persona & Narrative
- **Personality:** Grounded, orderly, artisanal yet analytical. It combines the tactile warmth of a thoughtfully designed cafe counter with the rigor of a modern fintech tool.
- **Visual Style:** Warm Minimalist SaaS. The system steers clear of sterile corporate blue and stark gray spreadsheets, using warm organic tones, confident typographic contrast, and restrained elevation to soothe digital eye fatigue.
- **Emotional Response:** Confidence, calm control, clarity, and relief at closing time. Entering numbers, confirming batches, and auditing margins should feel like closing a physical, well-bound leather ledger.

## Colors

The palette grounds high-density financial metrics in warm, comforting earth tones inspired by specialty coffee craft:

- **Primary (`#2E231F` - Deep Espresso):** Anchors high-priority actions, key navigation elements, and primary typography. Replaces stark `#000000` to prevent visual harshness against light surfaces.
- **Secondary (`#2E5A44` - Forest Sage):** Represents stability, positive cashflow, reconciled registers, and validated closing stages.
- **Tertiary (`#C87D55` - Roasted Terracotta):** Used for dynamic alerts, pending reviews, variance discrepancies, and highlighted analytical cards.
- **Neutral (`#8C827A` - Steamed Bark):** Supports secondary metrics, data column headers, metadata, and structural divider lines.

### Functional & Surface Palette
- **Canvas Base:** `#FBF9F5` (Warm Cream) provides a glare-free background suitable for evening shifts.
- **Surface Card / Container:** `#FFFFFF` (Pure Crisp White) for focal cards, and `#F4EFEB` (Warm Oatmeal) for segmented tables, inset data strips, and inactive tabs.
- **Feedback & Status:**
  - **Success / Reconciled:** `#2E5A44` (Background tint: `#EBF2ED`)
  - **Warning / Pending Close:** `#C87D55` (Background tint: `#FAF0EB`)
  - **Critical / Cash Discrepancy:** `#A83836` (Background tint: `#FAEDED`)
  - **Info / Prep Note:** `#4A6572` (Background tint: `#EEF3F5`)

## Typography

Typography balances character, extreme scan-ability, and calculation precision:

- **Headlines (Epilogue):** An expressive, structured geometric sans that lends an editorial, crafted feeling to daily summary pages, store switcher headers, and primary revenue analytics.
- **Body & Controls (Plus Jakarta Sans):** Warm, humanist, and highly legible across dense POS checklists, modal dialogues, and shift handover notes.
- **Data & Currency (JetBrains Mono):** Dedicated to monetary values, quantity tallies, batch times, and discrepancy calculations. Fixed-width character spacing prevents layout shifts when counts increment and ensures vertical decimal alignment across ledger columns.

## Layout & Spacing

The layout is built on an adaptive responsive grid configured for dual-environment use: desktop back-office analysis and tablet/mobile POS counter interaction.

### Form Factors & Breakpoints
- **Desktop / Wide Dashboard (1280px+):** 12-column grid, fluid within a maximum 1440px container, with `gutter: 1.25rem` and `margin: 2rem`. Left pinned navigation (260px) with split ledger view (data input table on the left 7 columns, live balance calculation cards on the right 5 columns).
- **Tablet / Counter POS (768px - 1279px):** 8-column layout. Sidebar collapses to an icon bar. Quick-entry forms switch to wide stacked cards with touch-optimized input heights (minimum 48px target zone).
- **Mobile Handheld (< 768px):** 4-column single stream layout. Margins reduce to `margin-mobile: 1rem`. Bottom sheets replace centered modals for closing checklists, inventory audits, and drawer balance confirmations.

### Spacing Rules
- Use `space-xs` and `space-sm` for intra-component relationships (e.g., metric label to number, badge icon to label).
- Use `space-md` for standard card interiors, list item gaps, and form field stacks.
- Use `space-lg` to separate distinct analytical clusters (e.g., Daily Revenue vs. Waste & Margin Losses).

## Elevation & Depth

This system avoids floating or glossy effects, adopting a grounded, architectural depth model using layered surfaces, tactile micro-borders, and soft warm ambient shadows.

### Layering Philosophy
- **Level 0 (Canvas):** `#FBF9F5` (Warm Cream). Base canvas for all underlying app pages.
- **Level 1 (Card & Module Layer):** `#FFFFFF` (Pure White) bordered with a subtle stroke `rgba(46, 35, 31, 0.08)`. Shadow: `0 1px 3px rgba(46, 35, 31, 0.04), 0 4px 12px rgba(46, 35, 31, 0.02)`.
- **Level 2 (Active Dropdowns & Interactive Popovers):** Elevated with shadow `0 8px 24px rgba(46, 35, 31, 0.08)` and crisp border `rgba(46, 35, 31, 0.12)`.
- **Level 3 (Modal Dialogs & Drawer Summaries):** Shadow `0 16px 40px rgba(46, 35, 31, 0.14)` over a backdrop tint of `rgba(46, 35, 31, 0.45)` with `backdrop-filter: blur(4px)`.

### Border Integrity
Every container relies on structural definition: low-contrast borders prevent the light creams and whites from bleeding together under bright ambient cafe lighting or sunlit counters.

## Shapes

The roundedness level is set to `2` (Rounded).

- **Standard Base Radii (`0.5rem` / 8px):** Applied to form fields, data chips, table row hover containers, and secondary action buttons.
- **Large Radii (`rounded-lg` - `1rem` / 16px):** Applied to analytical dashboard cards, metric tiles, daily summary cards, and quick-filter panels.
- **XL Radii (`rounded-xl` - `1.5rem` / 24px):** Reserved for drawer sheets, full closing report preview containers, and main prompt modals.
- **Pill Radii (`9999px`):** Used exclusively for status badges (Reconciled, Unsettled, Variance Alert) and circular quantity steppers.

## Components

### Buttons
- **Primary:** Background `#2E231F` (Deep Espresso) with `#FFFFFF` text. Height 44px (48px on mobile/tablet). States: hover `#1E1714`, active `#140F0D`, disabled `#D8D2CD` with `#8C827A` text.
- **Secondary / Success Action:** Background `#2E5A44` (Forest Sage) with `#FFFFFF` text. Used for final actions like "Confirm & Close Shift" or "Export Daily Settlement".
- **Outline / Secondary:** Transparent background, 1px solid border `#D8D2CD`, text `#2E231F`. Hover background `#F4EFEB`.
- **Ghost:** Transparent background with `#2E231F` text; hover background `#F4EFEB`.

### Input Fields & Cash Counters
- Base container height: 44px (desktop), 48px (touch interfaces). Background `#FFFFFF`, border 1px solid `#DDD6CE`.
- Focus state: Border 1.5px solid `#2E231F` with a soft outer ring `box-shadow: 0 0 0 3px rgba(46, 35, 31, 0.1)`.
- Financial inputs feature right-aligned tabular numerals (`JetBrains Mono`) with an integrated left-aligned currency sign (`₩` or `$`) rendered in `#8C827A`.

### Status Badges & Indicators
- Compact, pill-shaped tags (`border-radius: 9999px`) with padding `2px 10px`, using `label-caps` font.
- **Reconciled / Closed:** Background `#EBF2ED`, text `#2E5A44`, 1px solid `#CFDFD4`. Includes a solid 6px dot indicator.
- **Variance / Discrepancy:** Background `#FAEDED`, text `#A83836`, 1px solid `#F2C8C7`.
- **Pending Close / In-Progress:** Background `#FAF0EB`, text `#C87D55`, 1px solid `#F5D8C7`.

### Data Grids & Closing Ledgers
- Headers rendered in uppercase `label-caps` with `#8C827A` color over `#F4EFEB` background.
- Row heights minimum 48px with 1px bottom border `#F0EAE1`. Hover state triggers background `#FAF7F2`.
- Numeric columns automatically align right using `JetBrains Mono` for rapid cross-line scanning.
- Totals row pinned to table footer with `#F4EFEB` background and double-line top border.

### Analytical Cards
- Metrics cards feature an upper row displaying metric title and contextual status badge, followed by the large `metric-display` value.
- Bottom shelf highlights comparative delta (e.g., `+12.4% vs last Thursday`) with directional micro-arrows in `#2E5A44` (favorable) or `#A83836` (unfavorable).

### Closing Wizard & Modals
- Modal dialogs limit content width to 540px, centered with a clean progress stepper at the top (1. Cash Count -> 2. Inventory Deduction -> 3. Expense Log -> 4. Final Sign-off).
- Bottom actions feature a sticky bar with secondary "Save Draft" on the left and primary "Next / Settle" on the right.