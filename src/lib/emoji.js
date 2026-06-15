import emojiLibrary from 'emojilib';

function prepareEmojiIndex(source) {
  return Object.entries(source).map(([char, keywords]) => ({
    char,
    keywords: keywords.join('/')
  }));
}

export const emojis = prepareEmojiIndex(emojiLibrary);

const ALL_SET = new Set(emojis.map((emoji) => emoji.char));

export function normalizeQuery(value) {
  return value.replace(/\s+/g, '_').trim();
}

export function createFilteredSet(text) {
  const normalized = normalizeQuery(text);

  if (!normalized) {
    return ALL_SET;
  }

  const visible = new Set();

  for (const emoji of emojis) {
    if (emoji.keywords.includes(normalized)) {
      visible.add(emoji.char);
    }
  }

  return visible;
}
