/**
 * Below 768px a table has no room for its columns, so each row stacks into a small card and its
 * header row is hidden. A cell then names itself: this shows its `data-label` above the value.
 */
export const STACKED_CELL_LABEL =
  'max-md:before:block max-md:before:font-sans max-md:before:text-xs max-md:before:font-medium max-md:before:text-muted-foreground max-md:before:content-[attr(data-label)]';

/**
 * A form field in a stacked row: a `<label>` that shows its `data-label` over the input. From 768px
 * it takes no part in the layout, and the input is a cell of the table again.
 */
export const STACKED_FIELD = `${STACKED_CELL_LABEL} flex flex-col gap-1 md:contents`;
