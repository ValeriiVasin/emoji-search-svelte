export const PAGE_SIZE = 72;

export function normalizeQuery(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, ' ')
    .slice(0, 100);
}

export function filterEmojis(catalog, query, group) {
  const words = normalizeQuery(query).split(' ').filter(Boolean);
  return catalog.filter(
    (emoji) =>
      (group < 0 || emoji[2] === group) &&
      words.every((word) => emoji[3].includes(word)),
  );
}
