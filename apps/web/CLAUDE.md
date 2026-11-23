## Design system

Fonts: **Schibsted Grotesk** (400/500/600/700) for UI and **IBM Plex Mono** (400/500/600) for all numbers and money. Both are self-hosted through `@fontsource`, never from a CDN. Base text is 15px with line-height 1.45.

Light is the design. Dark is ours: the ink band keeps its color and the page and cards rise above it, and primary actions turn mint. Every color is a token in `src/index.css` (`:root` for light, `.dark` for the overrides); a test fails if a component uses `bg-ink`, `text-white`, `text-background`, a hex color or `rgba(`, and another checks the contrast of the token pairs in both themes.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--background` | `#F4F5F1` | `#1B241F` | Page background |
| `--card` / `--popover` | `#FFFFFF` | `#222C27` | Cards, sheets, menus |
| `--foreground` / ink (`text-ink`) | `#17201C` | `#E4EAE6` | Text |
| `--primary` / `--primary-foreground` | `#17201C` / `#FFFFFF` | `#9FD8BE` / `#17201C` | Primary buttons, checked boxes, current page, "Atual" pill |
| `--surface-strong` / `--on-strong` | `#17201C` / `#F4F5F1` | same | Header, phone nav, dark tiles, tooltips, acerto header, avatar, login panel. Never `bg-ink`. |
| `--surface-strong-border` | transparent | `#2C3832` | The line under the header in dark |
| mint | `#9FD8BE` | same | Logo, avatar, accents on dark |
| header-active | `#2C3832` | same | Active nav item, open user menu |
| on-dark muted | `#C9D3CD` | same | Secondary text on dark |
| `--muted-foreground` | `#5B6560` | `#A3ADA8` | Secondary text |
| icon | `#4A544F` | `#B4BDB8` | Icon buttons, inactive segment text |
| `--border` | `#DFE2DC` | `#33403A` | Cards, outline buttons |
| divider | `#ECEEE9` | `#2A3530` | Row dividers |
| `--input` | `#C9CEC6` | `#5A6862` | Input borders, secondary outline buttons |
| table header (`--muted`) | `#F8F9F6` | `#1F2924` | Table header and footer bands |
| segment track | `#E6E9E3` | `#2A3530` | Background of segmented controls |
| receita | `#136B4A` on `#E3F1EA` (border `#B9DCCB`) | `#7DD3A8` on `#18382B` (border `#2C5C47`) | Income, success, "Confirmado" |
| despesa / destructive | `#A8401A` on `#FBE9E0`, deleting row `#FBF3EF` | `#F2A27E` on `#3B231A`, row `#2E221D` | Expense, errors, delete |
| acerto / link | `#2A4FB8` on `#E5EBFA`, info text `#1F3C8F` | `#9DB4F5` on `#1F2A4A`, info `#B8C8F7` | Settlement, links, info |
| `--on-accent` | `#FFFFFF` | `#17201C` | Text on filled settlement, expense and destructive buttons |
| previsto | `#8A5A00` on `#FBF1DC`, dashed `#D9B865` | `#E8C26A` on `#33290F`, dashed `#8A6E2E` | Pending status |
| `--ring` | `#2A4FB8` | `#8FA9F2` | Focus ring |
| negative-on-dark | `#F2A27E` | same | Negative balance on dark tiles |
| disabled text | `#B5BBB6` | `#5E6A64` | Disabled pager arrows |
| neutral swatch | `#9AA29D` | `#7F8983` | "Sem categoria", chart zero line |
| chart bars | `#86BFA5` surplus with previstos, `#C2561F` deficit, `#E8A887` deficit with previstos, `#2F6E57` Acumulado | `#3D7A60`, `#E07A45`, `#8A4A2C`, `#5FBF94` | Resumo mensal |
| dashboard chart | `#1A6E4E` Receitas, `#E8894A` Despesas, `#8CC3A8` open month, `#F1F2EE` hovered month and donut track | `#4FB386`, `#E8894A`, `#3F7A62`, `#2A3530` | Visão geral. `#5FBF94` swatch and `#3A4640` divider on the dark tooltip are the same in both. |
| current row | `#F7F8F4` | `#25302A` | Current month in the Resumo table |
| `--overlay` | `rgba(23, 32, 28, 0.45)` | `rgba(5, 8, 6, 0.65)` | Modal and sheet backdrop (`bg-overlay`) |
| shadows | `shadow-segment`, `shadow-popover`, `shadow-sheet`, `shadow-tooltip`, `shadow-dialog` | black instead of ink | Never an arbitrary `shadow-[…rgba…]` |

The theme is chosen per device in Configurações › Aparência (`src/shared/theme`), applied before the app loads by `public/theme-init.js`, and set as `.dark` on `<html>`.

Category palette (CVD-safe order): `#2A78D6 #EB6834 #1BAF7A #EDA100 #E87BA4 #008300 #6250D6 #E34948`. It is user data and the same in both themes; a swatch always sits next to its category's name.

Radii: 8px for small controls and row buttons, 10px for buttons and inputs, 12px for banners and segment tracks, 14px for cards, 18px for modals, 999px for pills and chips. Page container: `max-width: 1280px`, padding `32px 24px 64px`, section gap 24px.

**shadcn mapping**

| Design element | Component |
|---|---|
| Buttons (primary ink, outline, ghost, destructive, link-blue outline) | `Button` |
| Segmented controls ("Por mês / Todos", type and status filters, period, page size) | `ToggleGroup` styled as a segmented track |
| Tiles, list container | `Card` |
| Novo/Editar lançamento | `Sheet`, side right, 480px |
| Acerto, Recorrentes, Fechamento | `Dialog` |
| Toasts | `Sonner`, bottom center, ink background |
| User menu | `DropdownMenu` |
| Inputs | `Input`, `Textarea`, `Checkbox`, `Label` |
| Category chips | `Toggle`, pill shaped, with a color square |

**Accessibility, as drawn in the design:** touch targets of at least 44px; `aria-pressed` on toggle buttons; `aria-current="page"` on the active nav item and page number; `aria-label` on every icon-only button (in pt-BR, for example "Mês anterior" and "Editar {descrição}"); `role="alert"` for errors and `role="status"` for notices; text contrast of at least 4.5:1; a real `<button>`, `<a>` or `<input>` for every control.

