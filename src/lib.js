import lib from 'emojilib';

console.log(lib);

function prepare(lib) {
  const emojis = [];

  for (let [char, keywords] of Object.entries(lib)) {
    emojis.push({
      char,
      keywords: keywords.join('/'),
    });
  }

  return emojis;
}

export const emojis = prepare(lib);

function findVisible(emojis, text) {
  const set = new Set();

  for (const emoji of emojis) {
    if (emoji.keywords.includes(text)) {
      set.add(emoji.char);
    }
  }

  return set;
}

const ALL_SET = new Set(emojis.map((emoji) => emoji.char));
export const createFilteredSet = (text) => {
  const trimmed = text.trim();

  if (!trimmed) {
    return ALL_SET;
  }

  return findVisible(emojis, text);
};
