import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  cleanPsDescription,
  cleanPsFields,
  cleanPsTheme,
  cleanPsTitle,
  collapseWhitespace,
  normalizeSections,
  repairMojibake,
} from './ps-text';

/**
 * The mojibake in this catalogue is "UTF-8 bytes decoded as Windows-1252", so every fixture is
 * derived from the byte sequence that was *meant* to be there. That keeps this file pure ASCII
 * (no invisible, un-pasteable characters) and tests the real property — that the damaged form is
 * recoverable — rather than hard-coding one particular rendering of it.
 */

/** The intended text: these bytes really are UTF-8. */
const utf8 = (...bytes: number[]) => new TextDecoder('utf-8').decode(new Uint8Array(bytes));

/**
 * Bytes -> the characters a Windows-1252 decode leaves behind, for the slots this file needs.
 * Note 0x94 is a right double quote and 0x97 is an em dash in Windows-1252, which is why a
 * damaged em dash (UTF-8 E2 80 94) *looks* like `â€”` and a damaged right single quote
 * (UTF-8 E2 80 99) looks like `â€™`.
 */
const WIN1252: Record<number, number> = {
  0x80: 0x20ac, 0x91: 0x2018, 0x92: 0x2019, 0x93: 0x201c, 0x94: 0x201d,
  0x95: 0x2022, 0x96: 0x2013, 0x97: 0x2014, 0x98: 0x02dc, 0x99: 0x2122,
};
/** The damaged text produced when those same bytes go through a Windows-1252 decode instead. */
const damaged = (...bytes: number[]) => String.fromCharCode(...bytes.map((b) => WIN1252[b] ?? b));

const EM_DASH = [0xe2, 0x80, 0x94]; // U+2014
const EN_DASH = [0xe2, 0x80, 0x93]; // U+2013
const RIGHT_SINGLE_QUOTE = [0xe2, 0x80, 0x99]; // U+2019
const LEFT_SINGLE_QUOTE = [0xe2, 0x80, 0x98]; // U+2018
const LEFT_DOUBLE_QUOTE = [0xe2, 0x80, 0x9c]; // U+201C
const DEGREE = [0xc2, 0xb0]; // U+00B0
const A_GRAVE = [0xc3, 0xa0]; // U+00E0
const E_ACUTE = [0xc3, 0xa9]; // U+00E9
const TRADE_MARK = [0xe2, 0x84, 0xa2]; // U+2122
const ELLIPSIS = [0xe2, 0x80, 0xa6]; // U+2026

/** U+007F (DEL) is the PDF extractor's section separator; U+0001 stands in for other controls. */
const DEL = String.fromCharCode(0x7f);
const SOH = String.fromCharCode(0x01);

describe('repairMojibake', () => {
  it('recovers an em dash', () => {
    assert.equal(repairMojibake(damaged(...EM_DASH)), utf8(...EM_DASH));
  });

  it('recovers an en dash', () => {
    assert.equal(repairMojibake(damaged(...EN_DASH)), utf8(...EN_DASH));
  });

  it('recovers a right single quote', () => {
    assert.equal(repairMojibake(damaged(...RIGHT_SINGLE_QUOTE)), utf8(...RIGHT_SINGLE_QUOTE));
  });

  it('recovers a left single quote', () => {
    assert.equal(repairMojibake(damaged(...LEFT_SINGLE_QUOTE)), utf8(...LEFT_SINGLE_QUOTE));
  });

  it('recovers a left double quote', () => {
    assert.equal(repairMojibake(damaged(...LEFT_DOUBLE_QUOTE)), utf8(...LEFT_DOUBLE_QUOTE));
  });

  it('recovers the degree sign', () => {
    assert.equal(repairMojibake(damaged(...DEGREE)), utf8(...DEGREE));
  });

  it('recovers a full 4-byte sequence', () => {
    assert.equal(repairMojibake(damaged(...TRADE_MARK)), utf8(...TRADE_MARK));
  });

  it('recovers vis-a-vis, whose non-breaking space was flattened to a plain one', () => {
    // A-grave (C3 A0) damaged becomes a-circumflex + U+00A0. Downstream, U+00A0 became an
    // ordinary space, so the strict run decoder cannot see the pair — repairMojibake handles
    // this signature separately.
    const flattened = damaged(...A_GRAVE).replace(/ /, ' ');
    assert.equal(repairMojibake(`fields vis-${flattened}-vis`), `fields vis-${utf8(...A_GRAVE)}-vis`);
  });

  it('leaves correctly encoded punctuation alone', () => {
    const clean = [
      `a ${utf8(...TRADE_MARK)} brand`,
      `${utf8(...LEFT_DOUBLE_QUOTE)}already curly${utf8(...RIGHT_SINGLE_QUOTE)}`,
      `25${utf8(...DEGREE)} of tolerance`,
      `it${utf8(...RIGHT_SINGLE_QUOTE)}s fine`,
      'plain ascii text',
      'Smart Cities’ Edge',
    ];
    for (const good of clean) assert.equal(repairMojibake(good), good);
  });

  it('leaves ordinary accented Latin text alone', () => {
    // U+00E9 sits inside the lead-byte range, but a single accented letter is not a UTF-8 run.
    const e = utf8(...E_ACUTE);
    assert.equal(repairMojibake(`resume and r${e}ole`), `resume and r${e}ole`);
    assert.equal(
      repairMojibake(`SensorTech${utf8(...TRADE_MARK)} and ${e}clair`),
      `SensorTech${utf8(...TRADE_MARK)} and ${e}clair`,
    );
  });

  it('repairs several damaged sequences in one string', () => {
    const input =
      `A${damaged(...RIGHT_SINGLE_QUOTE)}s ${damaged(...LEFT_DOUBLE_QUOTE)}plan` +
      `${damaged(...EM_DASH)}x at 5${damaged(...DEGREE)} and vis-` +
      `${damaged(...A_GRAVE).replace(/ /, ' ')}-vis fields`;
    const expected =
      `A${utf8(...RIGHT_SINGLE_QUOTE)}s ${utf8(...LEFT_DOUBLE_QUOTE)}plan${utf8(...EM_DASH)}` +
      `x at 5${utf8(...DEGREE)} and vis-${utf8(...A_GRAVE)}-vis fields`;
    assert.equal(repairMojibake(input), expected);
  });
});

describe('collapseWhitespace', () => {
  it('collapses runs of spaces, tabs and hard wraps', () => {
    assert.equal(collapseWhitespace('a  \t b   c'), 'a b c');
    assert.equal(collapseWhitespace('  padded  '), 'padded');
  });

  it('preserves paragraph breaks', () => {
    assert.equal(collapseWhitespace('one\n\n\n\ntwo'), 'one\n\ntwo');
  });
});

describe('normalizeSections', () => {
  it('turns the DEL section separator into a paragraph break', () => {
    assert.equal(normalizeSections(`Risks shown:${DEL} Risk severity`), 'Risks shown:\n\nRisk severity');
  });

  it('treats other control characters as separators', () => {
    assert.equal(normalizeSections(`Intro${SOH}Body`), 'Intro\n\nBody');
  });

  it('drops the leaked "Problem Statement" heading but keeps its content', () => {
    assert.equal(
      cleanPsDescription(`${DEL} Problem Statement Develop an AI/ML anomaly detection system.`),
      'Develop an AI/ML anomaly detection system.',
    );
  });

  it('drops the leaked "Problem Title" heading', () => {
    assert.equal(
      cleanPsDescription(`${DEL} Problem Title Design and Development of a Precision Guidance Kit.`),
      'Design and Development of a Precision Guidance Kit.',
    );
  });

  it('drops "Background" and "Objectives"', () => {
    assert.equal(normalizeSections(`${DEL} Background: Rural connectivity`), 'Rural connectivity');
    assert.equal(normalizeSections(`${DEL} Objectives To build a portal`), 'To build a portal');
  });

  it('drops a heading that runs into its own body text', () => {
    assert.equal(
      normalizeSections(`${DEL} Expected Outcomes and Evaluation An indicative solution is expected.`),
      'An indicative solution is expected.',
    );
  });

  it('strips the full "Problem Statement and Scope of Work for Hackathon" heading', () => {
    assert.equal(
      normalizeSections(`${DEL} Problem Statement and Scope of Work for Hackathon Under the broader theme.`),
      'Under the broader theme.',
    );
  });

  it('only strips the heading at the start of a section, never mid-sentence', () => {
    const input = 'The team reviewed the Problem Statement before submitting.';
    assert.equal(normalizeSections(input), input);
  });

  it('removes empty sections left behind by stripping', () => {
    assert.equal(normalizeSections(`${DEL} Background`), 'Background');
    assert.equal(normalizeSections(DEL), '');
  });

  it('preserves section order across multiple sections', () => {
    assert.equal(
      normalizeSections(`${DEL} Background${DEL} Problem Statement develop it`),
      'Background\n\ndevelop it',
    );
  });
});

describe('cleanPsTheme', () => {
  it('leaves a normal theme untouched', () => {
    assert.equal(cleanPsTheme('Agriculture, FoodTech & Rural Development'), 'Agriculture, FoodTech & Rural Development');
  });

  it('recovers the real theme from a scraped organisation blurb', () => {
    const blurb =
      "of 'AI for Infrastructure Monitoring', the proposed use-case seeks to develop an AI-powered " +
      'system. Organization MoSPI Department Data Informatics Category Software Theme Smart Automation';
    assert.equal(cleanPsTheme(blurb), 'Smart Automation');
  });

  it('falls back to the leading clause when there is no footer to recover', () => {
    assert.equal(
      cleanPsTheme('Artificial Intelligence for agriculture. And then a lot more text follows here.'),
      'Artificial Intelligence for agriculture',
    );
  });

  it('truncates with an ellipsis when even the first clause is too long', () => {
    const out = cleanPsTheme('x'.repeat(200));
    assert.ok(out.length <= 61, `expected a truncated theme, got ${out.length} chars`);
    assert.ok(out.endsWith(utf8(...ELLIPSIS)));
  });

  it('repairs encoding damage in the theme', () => {
    assert.equal(
      cleanPsTheme(`Smart Cities${damaged(...RIGHT_SINGLE_QUOTE)} Edge`),
      `Smart Cities${utf8(...RIGHT_SINGLE_QUOTE)} Edge`,
    );
  });

  it('handles an empty theme', () => {
    assert.equal(cleanPsTheme('   '), '');
  });
});

describe('cleanPsTitle', () => {
  it('repairs encoding and collapses whitespace', () => {
    assert.equal(
      cleanPsTitle(`  Use case   on web-based monitoring${damaged(...EM_DASH)}PAIMANA  `),
      `Use case on web-based monitoring${utf8(...EM_DASH)}PAIMANA`,
    );
  });
});

describe('cleanPsFields', () => {
  it('cleans each field while preserving the rest of the row', () => {
    const out = cleanPsFields({
      id: 'abc',
      code: '26103',
      title: 'Monitoring platform',
      theme: 'Smart Automation',
      description: `${DEL} Problem Statement Develop it.`,
    });
    assert.equal(out.id, 'abc');
    assert.equal(out.code, '26103');
    assert.equal(out.description, 'Develop it.');
  });

  it('does not mutate the input row', () => {
    const input = { id: 'a', code: '1', title: 'T', theme: 'X', description: `${DEL} Background Body` };
    cleanPsFields(input);
    assert.equal(input.description, `${DEL} Background Body`);
  });
});