/**
 * Read-time normalisation for SIH problem statements.
 *
 * The catalogue is bulk-imported from a PDF, so `title`, `theme` and `description` arrive with
 * extraction damage that is invisible in the database and very visible in the UI. Rather than
 * re-import and risk losing codes students have already ranked, every read path runs the text
 * through here first. Nothing writes back to the database.
 *
 * Four distinct defects, four distinct fixes — see each function for why it is needed. In
 * priority order:
 *
 *  1. `theme` is sometimes a whole scraped paragraph instead of a label (see `cleanPsTheme`).
 *     This is the single worst offender: the card badge applies `text-transform: uppercase`, so a
 *     3.5k-character theme renders as an unreadable uppercase wall and shoves the card's real
 *     title below the fold.
 *  2. `description` uses U+007F (DEL) as a section separator and leaks the source document's
 *     own headings ("Problem Statement", "Problem Title", "Background") into the prose
 *     (see `normalizeSections`).
 *  3. UTF-8 bytes were decoded as Windows-1252 somewhere in the import pipeline, so curly
 *     quotes and dashes render as `â€™` / `â€”` (see `repairMojibake`).
 *  4. Whitespace is ragged: hard wraps, tabs, doubled spaces (see `collapseWhitespace`).
 *
 * Deliberately absent: any case-folding or "sentence case" transform. The catalogue is full of
 * legitimate all-caps runs that are not noise — `RMSE, ETS, CSI, POD, FAR`, `JSON, XML, CSV` —
 * and a case normaliser would corrupt them while fixing nothing, because the uppercase wall in
 * issue 1 is a CSS effect on a bad `theme`, not bad casing in the data.
 */

/**
 * Windows-1252 characters for byte values 0x80-0x9F. UTF-8 continuation bytes land in this
 * range, but because the mis-decoding went through Windows-1252 (not Latin-1) they appear as
 * printable Unicode punctuation — 0x92 became `™`, not a control character. Inverting this table
 * is what lets us recover the original bytes.
 */
const CP1252_HIGH: Record<string, number> = {
  '\u20ac': 0x80, '\u201a': 0x82, '\u0192': 0x83, '\u201e': 0x84, '\u2026': 0x85,
  '\u2020': 0x86, '\u2021': 0x87, '\u02c6': 0x88, '\u2030': 0x89, '\u0160': 0x8a,
  '\u2039': 0x8b, '\u0152': 0x8c, '\u017d': 0x8e, '\u2018': 0x91, '\u2019': 0x92,
  '\u201c': 0x93, '\u201d': 0x94, '\u2022': 0x95, '\u2013': 0x96, '\u2014': 0x97,
  '\u02dc': 0x98, '\u2122': 0x99, '\u0161': 0x9a, '\u203a': 0x9b, '\u0153': 0x9c,
  '\u017e': 0x9e, '\u0178': 0x9f,
};

/** The byte a character would have had if it had come out of a Windows-1252 decode. */
function cp1252Byte(ch: string): number | null {
  const cp = ch.codePointAt(0)!;
  if (cp >= 0x00 && cp <= 0xff) return cp;
  const mapped = CP1252_HIGH[ch];
  return mapped === undefined ? null : mapped;
}

/** True for characters that can only be a UTF-8 continuation byte, i.e. bytes 0x80-0xBF. */
function isContinuationChar(ch: string): boolean {
  const b = cp1252Byte(ch);
  return b !== null && b >= 0x80 && b <= 0xbf;
}

/**
 * Characters that can only be a UTF-8 continuation byte (0x80-0xBF): the Latin-1 range that maps
 * 1:1, plus the Windows-1252 punctuation from `CP1252_HIGH`.
 */
const CONTINUATION_CLASS =
  '\\u0080-\\u00bf\\u20ac\\u201a\\u0192\\u201e\\u2026\\u2020\\u2021\\u02c6\\u2030\\u0160\\u2039' +
  '\\u0152\\u017d\\u2018\\u2019\\u201c\\u201d\\u2022\\u2013\\u2014\\u02dc\\u2122\\u0161\\u203a' +
  '\\u0153\\u017e\\u0178';

/**
 * A run that starts like a mis-decoded UTF-8 sequence: a lead byte (0xC2-0xF4, covering 2-, 3-
 * and 4-byte sequences) followed by at least one continuation character. The lead-byte range
 * deliberately overlaps legitimate accented Latin text (`é` is 0xE9), which is why the run must
 * be at least two characters long before we touch it.
 */
const MOJIBAKE_RUN = new RegExp(`[\\u00c2-\\u00f4][${CONTINUATION_CLASS}]+`, 'g');

/**
 * Re-decodes one run, or returns null when it is not a decodable UTF-8 sequence. Every character
 * in the run has already been matched as a lead-or-continuation byte, so the mapping is total.
 */
function decodeRun(run: string): string | null {
  const bytes = new Uint8Array(run.length);
  for (let i = 0; i < run.length; i++) {
    const b = cp1252Byte(run[i]);
    if (b === null) return null;
    bytes[i] = b;
  }
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

/**
 * Repairs UTF-8-that-was-decoded-as-Windows-1252 damage, e.g. `â€™` -> `’`, `â€”` -> `—`,
 * `Â°` -> `°`, `â€˜` -> `‘`.
 *
 * Runs are decoded strictly (`fatal: true`) and only accepted when they round-trip to valid
 * UTF-8, so correctly-encoded text is never altered. That matters because this catalogue also
 * contains *legitimate* `™`, `“` and `°` characters: only a run that begins with a mojibake
 * lead byte is considered, and such a run consumes its own trailing punctuation, so the genuine
 * occurrences elsewhere in the string are left alone.
 */
export function repairMojibake(text: string): string {
  if (!/[\u00c2-\u00f4]/.test(text)) return text;
  let out = text;
  // Two passes: the source data contains doubled damage in places (e.g. `Ã‚Â`), and one pass
  // only peels off the outer layer.
  for (let pass = 0; pass < 2; pass++) {
    let changed = false;
    MOJIBAKE_RUN.lastIndex = 0;
    out = out.replace(MOJIBAKE_RUN, (run) => {
      try {
        const decoded = decodeRun(run);
        if (decoded === null || decoded === run) return run;
        changed = true;
        return decoded;
      } catch {
        return run;
      }
    });
    if (!changed) break;
  }
  // `à` (U+00E0) is C3 A0 in UTF-8, and 0xA0 is a non-breaking space in Windows-1252. That
  // nbsp was flattened to an ordinary space somewhere downstream, so the strict run decoder sees
  // a lead byte with no continuation character and leaves it alone. Repair the signature
  // directly: `Ã` followed by a space and then a non-space only ever occurs this way.
  return out.replace(/\u00c3 (?=\S)/g, '\u00e0');
}

/** Section headings the source PDF used as labels, which repeat information already on the card. */
const LEAKED_SECTION_LABEL =
  /^(?:problem\s+statement(?:\s+and\s+scope\s+of\s+work(?:\s+for\s+hackathon)?)?|problem\s+title|problem\s+description|background|description|expected\s+outcomes?(?:\s+and\s+evaluation)?|objectives?)\s*[:\-–]?\s+/i;

/**
 * Turns the raw PDF structure into readable paragraphs and drops the source document's own
 * headings.
 *
 * U+007F (DEL) is the extractor's section separator — it appears before `Background`,
 * `Problem Statement`, `Expected Outcomes` and friends in 152 of the 192 descriptions. Any other
 * C0 control character is treated the same way, since none of them carry meaning here.
 *
 * The headings themselves are removed because they are pure duplication: the card already shows
 * the title, the code, the organisation and the category, so a description opening with
 * "Problem Statement Develop an AI/ML-based..." just repeats the label before the sentence. The
 * section's actual content is kept.
 */
export function normalizeSections(text: string): string {
  const withBreaks = text
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]+/g, '\n\n')
    // PDF list markers and hard-wrap residue.
    .replace(/[ \t]*\n[ \t]*/g, '\n')
    .replace(/\n{2,}/g, '\n\n');

  const paragraphs = withBreaks
    .split('\n\n')
    .map((p) => p.trim())
    .filter(Boolean)
    // Strip the leaked heading, then re-trim: removing "Problem Statement " from the front can
    // leave the paragraph starting with punctuation or a stray separator.
    .map((p) => collapseWhitespace(p.replace(LEAKED_SECTION_LABEL, '')))
    .filter(Boolean);

  return paragraphs.join('\n\n');
}

/** Collapses hard wraps, tabs and runs of spaces into single spaces. Newlines are preserved. */
export function collapseWhitespace(text: string): string {
  return text
    .replace(/[ \t\f\v]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** A `theme` longer than this is a scraped paragraph, not a label. Real themes top out at 41 chars. */
const MAX_THEME_LENGTH = 60;

/**
 * Recovers a usable theme label.
 *
 * Two rows in the SIH 2026 import (26103, 26192) have an entire organisation blurb in `theme`,
 * ending with the catalogue's own footer: "Organization MoSPI Department ... Category Software
 * Theme Smart Automation". The real label is the last segment of that footer, so prefer it.
 *
 * When there is no footer to recover from, fall back to the leading clause rather than dropping
 * the theme entirely — a truncated fragment still labels the card, whereas an empty badge does
 * not. Genuine short themes pass through untouched.
 */
export function cleanPsTheme(raw: string): string {
  const text = collapseWhitespace(repairMojibake(raw));
  if (!text) return '';
  if (text.length <= MAX_THEME_LENGTH) return text;

  const footer = text.match(/Theme\s+([^|]{2,60})\s*$/);
  if (footer) return collapseWhitespace(footer[1]);

  // No footer: keep the first clause, trimmed at a natural boundary.
  const clause = text.split(/[.;:–|]/, 1)[0].trim();
  if (clause && clause.length <= MAX_THEME_LENGTH) return clause;
  return clause ? `${clause.slice(0, MAX_THEME_LENGTH).trimEnd()}…` : text.slice(0, MAX_THEME_LENGTH).trimEnd();
}

/** Full clean-up for a problem statement title. */
export function cleanPsTitle(raw: string): string {
  return collapseWhitespace(repairMojibake(raw));
}

/** Full clean-up for a problem statement description: encoding, structure, leaked labels, spacing. */
export function cleanPsDescription(raw: string): string {
  return normalizeSections(repairMojibake(raw));
}

type PsTextFields = { title: string; theme: string; description: string };

/**
 * Normalises a problem statement row on its way out of the API. Applied to every read path so the
 * student catalogue, the mentor views and the dashboard card all show the same clean text.
 */
export function cleanPsFields<T extends PsTextFields>(ps: T): T {
  return {
    ...ps,
    title: cleanPsTitle(ps.title),
    theme: cleanPsTheme(ps.theme),
    description: cleanPsDescription(ps.description),
  };
}