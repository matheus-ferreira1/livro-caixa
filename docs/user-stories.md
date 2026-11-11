# User stories

Each story's heading shows its status and phase, as tracked in [Project status & roadmap](status.md). Each story becomes its own `feat/` branch and PR.

Shared rules:
- `partnerName` is `settings.partnerName.trim() || "Companheira"`. `partnerShare` is an integer from 0 to 100 (default 50).
- Money is shown with `Intl` in the instance currency; the default is pt-BR BRL (`R$ 1.234,56`), and US-12 adds USD (`$1,234.56`), EUR (`1.234,56 €`) and GBP (`£1,234.56`). Signed values are shown as `+ R$ x` / `− R$ x`.
- Type meta:
  - receita: "Receita", sign `+`, `#136B4A` on `#E3F1EA`
  - despesa: "Despesa", sign `−`, `#A8401A` on `#FBE9E0`
  - acerto: "Acerto", sign `+`, `#2A4FB8` on `#E5EBFA`
- Month labels use full pt-BR month names ("Outubro 2026"). Weekday abbreviations are `dom seg ter qua qui sex sáb`.
- Toasts disappear after 2.8 s.

## Phase 1 — done

### US-01 Sign in — ✅ Done (Phase 1, PR #1)
As the instance owner, I want to sign in with the account my admin created, so my data is protected.

- Split layout. On the **left** is a dark panel (`#17201C`) with faint horizontal ruled lines every 44px (`rgba(159,216,190,0.09)`), containing:
  - the logo (ledger icon in mint) and "Livro-caixa"
  - h1 "Suas finanças, no seu servidor."
  - the paragraph "Lançamentos, contas divididas e acerto do mês num app que você mesmo hospeda. Os dados ficam só na sua instância."
  - three bullets with icons:
    - "Roda em Docker, local ou em qualquer servidor"
    - "Código aberto, sem conta em serviço de terceiros"
    - "Acesso protegido por login em cada instância"
  - the footer "Livro-caixa · self-hosted"

  On the **right** is the form (max 400px) with h2 "Entrar" and the subtitle "Use a conta criada na sua instância." The two halves stack on narrow screens.
- Fields:
  - "E-mail" (placeholder "voce@exemplo.com", `autocomplete=username`)
  - "Senha" with a show/hide icon button (aria "Mostrar senha" / "Ocultar senha", `aria-pressed`)
  - the checkbox "Manter conectado neste dispositivo", checked by default
- Validation, in order:
  - an empty field gives "Informe e-mail e senha."
  - an invalid e-mail gives "Digite um e-mail válido."
  - wrong credentials give "E-mail ou senha incorretos." The message is generic and never reveals whether the e-mail exists. The password field is cleared.
- **After 5 failed attempts, logins are locked for 60 s** and the error reads "Muitas tentativas. Tente de novo em {N} s." The lockout is enforced by the server.
- Error state: an alert banner (`#FBE9E0` / `#A8401A`, circle-alert icon), and the input borders turn `#A8401A`. Typing clears the error.
- While submitting, the button reads "Entrando…" with bg `#4A544F` and is disabled.
- "Esqueceu a senha?" (blue link button, `aria-expanded`) reveals the info box "Como cada instância é hospedada por você, a senha é redefinida pelo administrador do servidor, com o comando de redefinição do container."
- Footnote with a lock icon: "Ainda sem conta? O primeiro acesso é criado pelo administrador ao configurar a instância."
- On success, the user lands on **Visão geral**.
- "Manter conectado" checked gives a persistent session cookie (30 days); unchecked gives a browser-session cookie. The cookie is httpOnly and SameSite=Lax.

### US-02 Sign out and the app shell — ✅ Done (Phase 1, PR #1)
- Dark header (`#17201C`, min-height 64px) with the logo and "Livro-caixa".
- Nav (aria "Principal"). The nav is "Visão geral", "Lançamentos", "Patrimônio", "Resumo mensal", "Configurações". The active item has bg `#2C3832`, white text and `aria-current="page"`; inactive items use `#C9D3CD`.
- User menu button: a mint avatar with initials plus a chevron (aria "Conta de {nome}", `aria-haspopup=menu`). It opens a 264px white panel with:
  - the avatar, the name and the e-mail (ellipsis)
  - "Configurações"
  - "Sair" in `#A8401A`
- Clicking outside closes the menu.
- Sign out returns to the login screen with the notice "Você saiu da sua conta." (`#E3F1EA` / `#136B4A`, check icon).
- The display name comes from the user record. Initials are the first letters of the first two words, or the first two letters when the name is one word.

### US-03 Browse the month — ✅ Done (Phase 1, PR #2)
As a user, I want to see one month of entries with totals, so I know where the month stands.

- Header:
  - the segmented control "Por mês | Todos" (aria "Modo de exibição")
  - month navigation: 44px outline buttons "Mês anterior" / "Próximo mês" around h1 `{Mês AAAA}`, 32px bold
  - on the right, the primary button "Novo lançamento" (plus icon). "Gerar recorrentes" (outline) and "Gerar acerto" (blue outline) appear here too.
- Four tiles. Each white tile has a 14px radius, a colored dot and label, a 26px mono value and a 13px muted sub-line. The tiles read only the viewed month:
  1. "Receitas" (`#136B4A`): confirmed receitas. Sub-line: "Previsto no mês: {all receitas}".
  2. "Despesas" (`#A8401A`): confirmed despesas. Sub-line: "Previsto no mês: {all despesas}".
  3. "Acerto a receber" (`#2A4FB8`): `max(0, partner − received)`. Sub-line: "Recebido de {partnerName}: {received}".
  4. "Saldo realizado" (dark tile): `confirmed receitas + received − confirmed despesas`. The value turns `#F2A27E` when negative. Sub-line: "Projetado no fim do mês: {all receitas + max(partner, received + scheduled) − all despesas}".

  Here `partner = round(sum of split despesas in the month, previstos included × share%)`, `received` is the sum of confirmed acertos, and `scheduled` is the sum of unconfirmed acertos.
- Filters:
  - type segment "Todos | Receitas | Despesas | Acertos" (aria "Filtrar por tipo")
  - status segment "Todos | Confirmados | Previstos" (aria "Filtrar por status")
  - search input with a search icon, placeholder "Buscar descrição ou observação" and a visually hidden label "Buscar lançamentos". It matches description and note, case-insensitive.
- Table (white card, horizontal scroll, min-width 1120px). Grid columns are `76px 1fr(min 220) 170px 104px 100px 136px 140px 92px`. The header row (`#F8F9F6`, 12px uppercase) reads "Data", "Descrição", "Categoria", "Tipo", "Dividido", "Status", "Valor", "Ações". Each row:
  - Data: mono `dd/mm`, with the weekday below.
  - Descrição: bold, with a recurring icon (aria "Recorrente") when recurring, and the note below in muted text.
  - Categoria: a 10px color square and the name. Acertos show "Acerto"; entries without a category show "Sem categoria" (`#9AA29D`).
  - Tipo: a pill.
  - Dividido: despesas get a toggle button "Sim"/"Não" (aria "Conta dividida: sim/não", `aria-pressed`; on: bg `#E6E9E3`, border `#C9CEC6`). Other types show "—".
  - Status: a toggle pill. Confirmed is a check icon plus "Confirmado" (green, solid border). Pending is a clock icon plus "Previsto" (amber, dashed border). Aria: "{Status}, clique para alternar".
  - Valor: right-aligned mono `{sign} R$ x` in the type color.
  - Ações: icon buttons "Editar {descrição}" (pencil) and "Excluir {descrição}" (trash, `#A8401A`).
- Clicking the trash expands an inline confirmation under the row. The row bg turns `#FBF3EF`, with the text "Excluir “{descrição}”? Esta ação não pode ser desfeita.", "Cancelar" and "Excluir" (destructive). Confirming deletes the entry and shows the toast "Lançamento excluído".
- Month mode sorts by date ascending by default. Header sort buttons exist for Data, Descrição and Valor. Each has an arrow icon when active and the aria "Ordenar por {coluna}, crescente/decrescente". A new sort column starts with this direction: date asc in month mode or desc in Todos, description asc, value desc.
- Empty state: "Nenhum lançamento encontrado", then "Ainda não há lançamentos neste mês." or "Nenhum lançamento corresponde aos filtros.", then the button "Novo lançamento".
- Footer band: "{shown} de {total} lançamentos", and mono "Entradas {receitas+acertos}" (green) and "Saídas {despesas}" (red) for the filtered rows.
- Mode, month and filters are kept in the URL.

### US-04 Browse all entries — ✅ Done (Phase 1, PR #2)
- "Todos" switches to h1 "Todos os lançamentos", sorts by date descending and hides the month navigation.
- Tiles:
  - "Receitas filtradas"
  - "Despesas filtradas"
  - "Acertos filtrados"
  - dark "Saldo dos resultados" (`receitas + acertos − despesas`)

  The first three show the period name as their sub-line. The dark tile's sub-line is "{n} lançamento(s) encontrado(s)".
- Filter card:
  - "Período" segment: "Todo período", "Este ano", "Últimos 12 meses", "Personalizado". "Personalizado" reveals the date inputs "De" and "Até".
  - "Categoria" chips: "Todas", every category (receitas first, then despesas, each sorted by name), and "Sem categoria (acertos)". Chips are pill shaped; the active one has border `#17201C` and bg `#F4F5F1`.
- Dates show the year (`dd/mm/aa`).
- When sorted by date, rows are grouped by month. Each group header (`#F4F5F1`) shows the month label, "{n} lançamento(s)", the signed net (green or red) and the small button "Abrir mês" (aria "Abrir {Mês} na visão por mês"), which switches to month mode on that month.
- Pager:
  - "Mostrando {a}–{b} de {n}", or "Nenhum resultado"
  - page size segment "25 | 50 | 100" followed by "por página"
  - prev/next arrows ("Página anterior" / "Próxima página")
  - page buttons in mono, laid out as `1 … 4 5 6 … 12`; the current page is ink with `aria-current`
- Any filter change resets the list to page 1.
- Empty hint: "Nenhum lançamento corresponde aos filtros e ao período escolhidos."

### US-05 Create and edit an entry — ✅ Done (Phase 1, PR #3)
- "Novo lançamento" opens a right-side **sheet** (480px). The title is "Novo lançamento", or "Editar lançamento" when editing; the close button has the aria "Fechar".
- Fields:
  - "Tipo": a 3-column grid of "Receita / Despesa / Acerto". The active button gets the type's bg, color and border. Changing the type resets the category to the first category of that type and clears "split" unless the new type is despesa.
  - Acerto only: the info note "Acerto é o valor recebido de {partnerName} referente às contas divididas do mês. Não entra como receita."
  - "Data" (date input) and "Valor (R$)" (mono, right-aligned, placeholder "0,00"), side by side.
  - "Descrição", placeholder "Ex.: Conta de luz".
  - "Categoria" chips filtered by type, not shown for acertos. With the link "Gerenciar categorias".
  - "Observação" (marked "Opcional"): a textarea, placeholder "Ex.: leitura de 12/09 a 11/10".
  - Options box with checkboxes:
    - "Conta dividida": despesa only. Description: "Entra no cálculo do acerto com {partnerName} ({share}% para {partnerName})."
    - "Recorrente": not for acerto. Description: "Acontece todo mês. Será sugerido ao gerar os recorrentes do mês seguinte."
    - "Confirmado". Description: "Marque quando o valor já tiver saído ou entrado. Desmarcado, fica como previsto."
- Defaults: type despesa, the first despesa category, the date today if today falls in the viewed month (otherwise day 1 of that month), and every checkbox unchecked.
- Validation, in order; the first error is shown in `#A8401A` above the footer:
  1. "Informe a data."
  2. "Informe a descrição."
  3. "Informe um valor maior que zero."
  4. "Escolha uma categoria." (not for acertos)
- Values parse pt-BR input: `1.234,56`, `180`, `R$ 10,5`.
- Saving trims the description and note. An acerto is saved with no category, no split and no recurrence. `split` is kept only for despesas.
- A recurring entry gets a `seriesId`. The `seriesId` is kept when recurrence is later switched off, so history stays linked.
- After saving, the sheet closes, the list jumps to the month of the saved date, and the toast reads "Lançamento adicionado" or "Lançamento atualizado".
- Footer (`#F8F9F6`): "Cancelar" and the primary "Adicionar lançamento", or "Salvar alterações" when editing.
- Edit (pencil) opens the same sheet prefilled. The value is shown as `0,00`.

## Phase 2 — done

### US-11 Settings (Configurações) — ✅ Done (Phase 2, PR #13)
- Eyebrow "Preferências", h1 "Configurações".
- **Categorias**
  - Intro: "Categorias organizam receitas e despesas. Acertos não usam categoria. Uma categoria em uso não pode ser excluída, só renomeada."
  - Create form:
    - "Nova categoria" (placeholder "Ex.: Pets, Academia, Gás")
    - "Tipo": Receita / Despesa
    - "Cor": 8 palette swatches, aria "Cor 1…8"
    - "Adicionar"
  - Errors: "Dê um nome para a categoria." and, for a case-insensitive duplicate within the type, "Já existe uma categoria com esse nome nesse tipo."
  - Toast on create: "Categoria “{nome}” criada"
  - Lists: one card each for "Receitas" and "Despesas", with "{n} categorias" and per-item usage ("{n} lançamentos" or "Sem lançamentos").
  - Inline edit changes the name and color; the type cannot be changed. Toast: "Categoria atualizada".
  - Deleting is blocked while the category is in use, with the title "{nome} está em uso e não pode ser excluída". Otherwise it deletes immediately, with the toast "Categoria “{nome}” excluída".
- **Divisão de contas**
  - Intro: "Define quem divide as contas marcadas como “dividido” e a parte de cada um. É a base do cálculo do acerto."
  - "Nome do(a) companheiro(a)"
  - the slider "Parte de {partnerName} nas contas divididas": 0–100, step 5
  - example box: "Exemplo: numa conta dividida de R$ 100,00, {partnerName} paga {x} e você paga {y}."
- Both the nav item and the user-menu item "Configurações" open this page. The form's "Gerenciar categorias" link also lands here.

## Phase 3 — done

### US-06 Generate the settlement (Gerar acerto) — ✅ Done (Phase 3, PR #14)
- A dialog (1000px, bg `#F4F5F1`) titled "Acerto de contas", with the sub-line "{Mês AAAA} · contas divididas com {partnerName}".
- Left column, labeled "Resumo para print":
  - a card with a dark header showing "Acerto · {Mês}", "Valor a acertar por {partnerName}" and the 34px mono balance
  - a table with the columns "Conta", "Total" and "Parte {partnerName}". Each item shows `dd/mm · categoria` and " · previsto" when pending.
  - when there are no items: "Nenhuma conta dividida neste mês."
  - totals: "Total das contas divididas", "Minha parte ({100−share}%)", "Parte de {partnerName} ({share}%)", plus "Já recebido − x" and "Já registrado como previsto − x" when they apply
  - footnote: "Divisão {a}% / {b}% · {n} contas · inclui previstas | só confirmadas"
- Calculation:
  - Items are the split despesas of the month. Pending ones count only when the checkbox "Incluir contas previstas" (default on) is checked; its hint reads "Útil para avisar o valor antes de todas as contas vencerem."
  - `partner = total × share%`
  - `balance = max(0, partner − received − scheduled)`
- "Mensagem em texto": the WhatsApp-ready text from `buildShareText`, shown in a mono `<pre>`.
- Buttons:
  - "Copiar texto": becomes "Copiado!" for 3 s. On failure: "Não foi possível copiar automaticamente. Selecione o texto acima e copie."
  - "Enviar no WhatsApp": opens `https://wa.me/?text=…`
- Blue box: "Quando {partnerName} enviar o valor" / "Registre o acerto como previsto agora e marque como confirmado quando o dinheiro cair." The button "Registrar acerto de {balance}" creates a pending acerto on the month's last day, described "Acerto das contas divididas", with the note "{partnerName} · {n} contas de {Mês}". Toast: "Acerto registrado como previsto. Confirme quando receber." When the balance is 0, the button is disabled and reads "Acerto do mês já registrado".

### US-07 Generate recurring entries (Gerar recorrentes) — ✅ Done (Phase 3, PR #15)
- Candidates: for each `seriesId`, take the latest occurrence before the month. It is a candidate when it is still `recurring`, is not an acerto, and the series has no entry in the month yet. The candidate's day is the source's day, capped at the month's last day, and its value is the source's value.
- Banner (month mode only, `#E5EBFA` / `#1F3C8F`):
  - text: "1 lançamento recorrente ainda não foi gerado para {Mês}." or "{n} lançamentos recorrentes ainda não foram gerados para {Mês}."
  - sub-line: "Eles entram como previstos, com data e valor do último mês, para você ajustar."
  - buttons: "Agora não" dismisses the banner for that month; "Revisar e gerar" opens the dialog.
- Dialog (1040px) titled "Gerar lançamentos recorrentes", with the sub-line "{Mês} · a partir da última ocorrência de cada lançamento recorrente".
  - Intro: "Os lançamentos entram como **previstos**, sem observação. …"
  - Table with a select-all checkbox and the columns "Lançamento" (with category and " · dividida"), "Tipo", "Data" (limited to the month), "Valor (R$)" and "Último lançado". Unchecked rows are shown at 50% opacity.
  - Footer: "{x} de {n} selecionados", "+ receitas", "− despesas".
  - Button: "Gerar {n} lançamento(s)", disabled when nothing is selected.
  - Errors: "Selecione ao menos um lançamento." and "Revise “{descrição}”: a data deve ser em {Mês} e o valor maior que zero."
  - Empty state: "Tudo em dia" / "Todos os lançamentos recorrentes já estão em {Mês}."
- Generated entries are pending, with an empty note and `recurring: true`, and keep their `seriesId`. Toast: "{n} lançamento(s) gerado(s) como previstos".

## Phase 4 — done

### US-08 Monthly summary (Resumo mensal) — ✅ Done (Phase 4, PR #17)
- Eyebrow "Resumo mensal". Year navigation ("Ano anterior" / "Próximo ano") around a mono h1 with the year.
- Mode segment "Realizado | Com previstos". The hint reads "Só lançamentos confirmados." or "Inclui previstos e o acerto esperado das contas divididas."
- `monthSummary`:
  - "Realizado" counts confirmed entries only; "Com previstos" counts all of them
  - in "Com previstos", `acertos = max(sum of acertos, expected partner share)`
  - `balance = receitas + acertos − despesas`
- KPI tiles:
  - "Receitas no ano", sub-line "Mais {acertos} em acertos"
  - "Despesas no ano", sub-line "Média de {x} por mês"
  - "Média de balanço mensal", sub-line "Em {n} meses com lançamentos" or "Nenhum mês com lançamentos"
  - dark "Acumulado no ano", sub-line "Melhor mês: {Mês} ({balanço})" or "Sem lançamentos no ano"
- Chart "Balanço por mês": diverging bars around zero. Positive bars are `#136B4A`, or `#86BFA5` when the month has pending entries. Negative bars are `#C2561F`, or `#E8A887` when pending. The legend reads "Sobrou", "Faltou", "Mês com previstos". The current calendar month is highlighted.
- Table:
  - columns: "Mês", "Receitas", "Despesas", "Acertos", "Balanço", "Acumulado" (running total with a small bar), "Situação"
  - Situação is "Sem lançamentos", "Em aberto" (dashed amber) or "Fechado" (green)
  - the current month gets the badge "Atual"
  - each row's chevron "Ver lançamentos de {Mês}" opens that month
  - the last row is "Total {ano}"
- Footnote: "Balanço = receitas + acertos − despesas. O acerto entra no balanço porque compensa a parte das contas divididas que você pagou, mas não conta como receita."

## Phase 5 — done

### US-09 Dashboard (Visão geral) — ✅ Done (Phase 5, PR #19)
- Same month navigation and "Realizado | Com previstos" mode as US-08. The hint reads "Só lançamentos confirmados." or "Inclui previstos e o acerto esperado."
- KPI tiles; each delta is colored good, bad or neutral and shows an arrow:
  - **"Balanço do mês"**, hint "Receitas + acertos − despesas".
    - Delta: "{R$} a mais/a menos que {Mês anterior}".
    - Otherwise "Sem lançamentos no mês" or "Sem dados de {Mês}".
  - **"Taxa de poupança"** (`balance/receitas`), hint "Parte da receita que sobrou".
    - Delta: "±X,X p.p. vs média de 12 meses", or "Sem média para comparar".
  - **"Gasto líquido"** (`despesas − acertos`), hint "Despesas menos o acerto de {partnerName}".
    - Within ±3% of the 12-month average: "Na média dos últimos 12 meses".
    - Otherwise "X% acima/abaixo da média de 12 meses". Above the average is bad.
  - **"Acumulado no ano"**, hint "Janeiro a {Mês} de {AAAA}".
    - Delta: "Média de {x} por mês".
- "Receitas e despesas · últimos 12 meses":
  - paired bars, receitas `#1A6E4E` and despesas `#E8894A`
  - "nice" y-axis ticks
  - hover tooltip with Receitas, Despesas, Acertos and Balanço; "Sem lançamentos" for an empty month
  - the button "Ver tabela" opens US-08 for that year
- "Despesas por categoria":
  - donut (top 6 plus "Outras (n)"), comparing {Mês} with the average of the previous 12 months
  - the center shows "Total de despesas" and the count; on hover, the category and its percentage
  - legend deltas: "Na média" within ±3%, otherwise "X% vs média"; "Sem histórico" when there is no history
  - empty state: "Nenhuma despesa em {Mês} com o filtro atual."
- "Em aberto no mês":
  - shows the pending entries (up to 5) with a relative due label: "Atrasado", "Hoje", "Amanhã" or "Em N dias", amber within 3 days
  - each entry has a "Confirmar" button; toast "“{descrição}” confirmado"
  - "Ver mais {n} previstos" opens Lançamentos filtered to Previstos
  - the US-07 banner appears here as well
  - empty state: "Nada pendente em {Mês}."
- "Acerto com {partnerName}":
  - badge: "Sem contas divididas", "Quitado", "Parcial" or "Pendente"
  - the pending amount in blue, followed by "a receber de {esperado} esperados"
  - progress bar, then "{recebido} recebido · {n} contas divididas ({total})"
  - "Abrir acerto" opens US-06

## Phase 6 — done

### US-10 Net worth (Patrimônio) and monthly closing (Fechamento) — ✅ Done (Phase 6, PRs #20, #21, #22)
- Assets: `{ institution, name, assetClass, pricing: 'auto'|'manual', quantity, avgPrice, price, invested, current, dayChange, updatedAt }`.
  - Classes:

    | Key | Label | Color |
    |---|---|---|
    | reserva | Reserva | `#2A78D6` |
    | tesouro | Tesouro Direto | `#EB6834` |
    | garantia | Garantias | `#1BAF7A` |
    | etf | ETFs | `#EDA100` |
    | fii | Fundos imobiliários | `#E87BA4` |
    | cripto | Cripto | `#008300` |
    | cambio | Câmbio | `#6250D6` |
    | conta | Conta e poupança | `#9AA29D` |

  - Auto assets: value is `qty × price` and cost is `qty × avgPrice`. Manual assets: value is `current` and cost is `invested`. A null cost means "result unknown".
- Snapshots: `{ month, total, contributions }`, one per closing.
- Header:
  - the mono total, with "{n} ativos em {m} instituições"
  - the toggle "Modo tranquilo" (default on; hides daily changes), with the hint "Variações diárias ocultas" or "Mostrando variações do dia"
  - the buttons "Novo ativo" and "Fazer fechamento", or a disabled "Fechamento em dia"
- The closing opens on the 25th of the open month, the month after the last snapshot.
  - Banner while open: "O fechamento de {Mês} está disponível." with the button "Fazer fechamento".
  - Otherwise: "Fechamento de {Mês} registrado. O de {Mês} abre em 25/MM e até lá não há nada para atualizar."
- KPI tiles:
  - "Desde o fechamento de {Mês}" (dark)
  - "Fechamento de {Mês}" (aportes · rendimento)
  - "Últimos 12 meses"
  - "Resultado da carteira", with the delta "{±%} de rentabilidade"
- "Evolução mês a mês": bars for the last 11 closings plus the open month, with a tooltip showing patrimônio, variação, aportes and rendimento.
- "Distribuição da carteira": a stacked bar plus a legend, grouped "Por classe" or "Por instituição".
- Assets table:
  - columns: "Ativo", "Qtd.", "Preço médio", "Cotação", "Aplicado", "Atual", "Resultado", "% carteira", "Hoje" (only outside calm mode), "Ações"
  - assets are grouped, with group subtotals
  - each asset has a tag: "Atualizada há…", "Cotação indisponível" or "Manual · dd/mm" (see the quote status decisions)
  - inline removal: "Remover “{nome}” da carteira?"; toast "“{nome}” removido da carteira"
- Asset sheet ("Novo ativo" / "Editar ativo"):
  - "Banco ou corretora", with chips for institutions already used
  - "Ativo"
  - "Classe"
  - "Como o valor é atualizado": "Cotação automática" or "Manual, no fechamento"
  - auto fields: "Quantidade", "Preço médio (R$)", "Cotação atual (R$)"
  - manual fields: "Valor aplicado (R$)", "Valor atual (R$)"
  - errors, in order:
    1. "Informe o banco ou a corretora."
    2. "Informe o nome do ativo."
    3. "Informe uma quantidade maior que zero."
    4. "Informe a cotação atual."
    5. "Preço médio inválido."
    6. "Informe o valor atual."
    7. "Valor aplicado inválido."
  - toasts: "Ativo adicionado à carteira" / "Ativo atualizado"
- Closing dialog "Fechamento de {Mês}":
  - section "1. Valores manuais", with an "Aporte / resgate" and a "Valor atual" for each manual asset
  - section "2. Cotações automáticas", read-only, with each asset's quote status
  - footer totals: "Patrimônio no fechamento", "Variação no mês", "Aportes", "Rendimento"
  - error: "Revise os valores de “{nome}” ({instituição})."
- Registering a closing:
  - updates each manual asset's `current`
  - adds the flow to `invested`; a null `invested` stays null
  - appends a snapshot
  - toast: "Fechamento de {Mês} registrado"

## Phase 7 — done

### US-12 Language and currency — ✅ Done (Phase 7)
As the instance owner, I want to choose the language and the currency, so the app reads the way I do.

- Configurações gets a section "Idioma e moeda" after "Divisão de contas". It is a card like the split section, with two labelled native `<select>`s at least 44px tall. Choices save on their own and reach the whole app at once.
- The choice is instance-wide (the `settings` row), not per user or per browser. Defaults are `pt-BR` and `BRL`, so an existing instance looks as before.
- Language changes only the UI copy: every string, month names, weekday abbreviations, relative labels, asset-class labels, aria labels, toasts, API error messages, the share text of the acerto, `<html lang>` and the word in compact chart labels ("1,2 mil" / "1.2K"). It does not change persisted enum values, routes, category names, entry descriptions, the `dd/mm` date order, the minus sign `−`, or the description stored on an acerto that was already registered.
- Currency changes only how amounts are formatted and typed. No amount is converted. Each currency fixes its number locale: BRL pt-BR (`R$ 1.234,56`), USD en-US (`$1,234.56`), EUR de-DE (`1.234,56 €`), GBP en-GB (`£1,234.56`). Percentages, quantities, the decimal mark in editable fields and the symbol in field labels ("Valor (R$)" becomes "Valor ($)") follow it. Typed amounts are read with the currency's marks: `1.234` is 1234 in BRL and EUR, and is refused in USD and GBP, where `1,234` is 1234.
- Typed quantities follow the same marks. In USD, GBP and EUR a group mark before exactly three digits is thousands (`1,000` is 1000 in USD and GBP, `1.000` is 1000 in EUR, as in a money field), and the other mark is the decimal point (`0,5` is 0.5 in USD). BRL keeps its older rule: `1.000` is 1, because quantities with many decimals are common there and thousands of units are not.
- A foreign-currency holding (class Câmbio) shows ` USD` after its quantity, except in a USD instance, where the currency it holds is not recorded and none is named.
- The sign-in page speaks the instance language, read from the public `GET /api/preferences`.
- Copy, pt-BR:
  - section title "Idioma e moeda"
  - text "Define o idioma da interface e como os valores são exibidos. Os valores não são convertidos."
  - labels "Idioma" (options "Português (Brasil)", "English") and "Moeda" (options "Real brasileiro (R$)", "Dólar americano ($)", "Euro (€)", "Libra esterlina (£)")
- Copy, en:
  - "Language and currency"
  - "Sets the interface language and how amounts are shown. Amounts are not converted."
  - labels "Language" (options "Português (Brasil)", "English") and "Currency" (options "Brazilian real (R$)", "US dollar ($)", "Euro (€)", "Pound sterling (£)")
- English names of the screens: Overview, Entries, Net worth, Monthly summary, Settings. Also Settlement, Recurring, Confirmed / Pending, Income / Expense / Settlement, Split.
