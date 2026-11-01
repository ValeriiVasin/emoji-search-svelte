// Unicode data: https://www.unicode.org/license.txt
// emojilib keywords: MIT, https://github.com/muan/emojilib
import { readFile, writeFile } from 'node:fs/promises';
import emojiLibrary from 'emojilib' with { type: 'json' };

const source = 'https://www.unicode.org/Public/18.0.0/emoji/emoji-test.txt';
const response = process.argv[2] ? null : await fetch(source);
if (response && !response.ok)
  throw new Error(`Unicode download failed: ${response.status}`);
const text = process.argv[2]
  ? await readFile(process.argv[2], 'utf8')
  : await response.text();
if (!text.includes('# Version: 18.0'))
  throw new Error('Expected Unicode Emoji 18.0');
const aliases = new Map(
  Object.entries(emojiLibrary).map(([char, words]) => [
    char.replaceAll('\uFE0F', ''),
    words,
  ]),
);
const groups = [];
const catalog = [];
const newest = [];
let group;
for (const line of text.split('\n')) {
  if (line.startsWith('# group: ')) {
    group = line.slice(9);
    if (group !== 'Component') groups.push(group);
  }
  const match = line.match(
    /^([\dA-F ]+)\s*; fully-qualified\s*# \S+ E([\d.]+) (.+)$/,
  );
  if (!match || group === 'Component') continue;
  const char = String.fromCodePoint(
    ...match[1]
      .trim()
      .split(/\s+/)
      .map((code) => parseInt(code, 16)),
  );
  const name = match[3];
  const keywords = [
    ...new Set([name, ...(aliases.get(char.replaceAll('\uFE0F', '')) ?? [])]),
  ]
    .join(' ')
    .replaceAll('_', ' ')
    .toLowerCase();
  const destination = Number(match[2]) >= 18 ? newest : catalog;
  destination.push([char, name, groups.indexOf(group), keywords]);
}
// Keep familiar native glyphs on the first page; new additions stay searchable.
catalog.push(...newest);
if (
  catalog.length < 3900 ||
  new Set(catalog.map(([char]) => char)).size !== catalog.length
)
  throw new Error('Invalid catalog');
await writeFile(
  new URL('../src/lib/data/catalog.json', import.meta.url),
  JSON.stringify(catalog) + '\n',
);
await writeFile(
  new URL('../src/lib/data/initial.json', import.meta.url),
  JSON.stringify({
    version: '18.0',
    source,
    total: catalog.length,
    groups,
    emojis: catalog
      .slice(0, 384)
      .map(([char, name, group]) => [char, name, group]),
  }) + '\n',
);
console.log(
  `Generated ${catalog.length} Unicode 18.0 emoji with emojilib keywords`,
);
