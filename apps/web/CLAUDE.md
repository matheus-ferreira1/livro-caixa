## Design system

Fonts: **Schibsted Grotesk** (400/500/600/700) for UI and **IBM Plex Mono** (400/500/600) for all numbers and money. Both are self-hosted through `@fontsource`, never from a CDN. Base text is 15px with line-height 1.45.

| Token | Hex | Use |
|---|---|---|
| `--background` | `#F4F5F1` | Page background |
| `--foreground` / `--primary` / ink | `#17201C` | Text, primary buttons, header, dark tiles |
| mint | `#9FD8BE` | Logo, avatar, accents on dark |
| header-active | `#2C3832` | Active nav item, open user menu |
| on-dark muted | `#C9D3CD` | Secondary text on dark |
| `--muted-foreground` | `#5B6560` | Secondary text |
| icon | `#4A544F` | Icon buttons, inactive segment text |
| `--border` | `#DFE2DC` | Cards, outline buttons |
| divider | `#ECEEE9` | Row dividers |
| `--input` | `#C9CEC6` | Input borders, secondary outline buttons |
| table header | `#F8F9F6` | Table header and footer bands |
| segment track | `#E6E9E3` | Background of segmented controls |
| receita | `#136B4A` on `#E3F1EA` | Income, success, "Confirmado" (border `#B9DCCB`) |
| despesa / destructive | `#A8401A` on `#FBE9E0` | Expense, errors, delete. Deleting-row bg `#FBF3EF`. |
| acerto / link | `#2A4FB8` on `#E5EBFA` | Settlement, links, info. Info text `#1F3C8F`. |
| previsto | `#8A5A00` on `#FBF1DC`, dashed border `#D9B865` | Pending status |
| negative-on-dark | `#F2A27E` | Negative balance on dark tiles |
| disabled text | `#B5BBB6` | Disabled pager arrows |
| neutral swatch | `#9AA29D` | "Sem categoria", chart zero line |
| chart bars | `#86BFA5` surplus with previstos, `#C2561F` deficit, `#E8A887` deficit with previstos, `#2F6E57` Acumulado | Resumo mensal |
| dashboard chart | `#1A6E4E` Receitas, `#E8894A` Despesas, `#5FBF94` Receitas swatch on the dark tooltip, `#3A4640` tooltip divider, `#F1F2EE` hovered month, donut track and neutral badge | Visão geral |
| current row | `#F7F8F4` | Current month in the Resumo table |
| overlay | `rgba(23, 32, 28, 0.45)` | Modal and sheet backdrop |

Category palette (CVD-safe order): `#2A78D6 #EB6834 #1BAF7A #EDA100 #E87BA4 #008300 #6250D6 #E34948`.

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

