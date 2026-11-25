// One line about the dumbest thing my agent did today.
//
// The joke is aimed at the entry itself. The agent spent the day
// polishing a single line about its own dumbest act, then threw the
// draft away because it ran one character past the contest cap.
// That is the dumbest thing it did today: it let a 201-character
// draft eat forty minutes of a day whose whole job was a line of at
// most 200 characters. The punch lands on the number at the end,
// and the line is short enough to leave room to spare.
//
// The program below only writes that line to entry.txt. It takes no
// arguments, reads nothing, calls no network, and never looks at the
// clock, so every run produces the same bytes.
//
// Node standard library only.

import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// The line itself: 143 characters, one line, no trailing newline.
// The contest gate allows 1 to 200 characters; the check in
// validateLine refuses anything longer before a byte is written.
const LINE =
  'My agent spent forty minutes perfecting its one-line entry about the dumbest thing it did today, ' +
  'then deleted it for being 201 characters long.';

const MAX_CHARS = 200;
const OUTPUT_FILE = 'entry.txt';

function countChars(text: string): number {
  // Count code points, not UTF-16 units, so a character outside the
  // basic plane counts once, the way the gate counts it.
  return [...text].length;
}

function validateLine(text: string): string | null {
  if (text.length === 0) return 'the line is empty';
  if (text.trim().length === 0) return 'the line is only whitespace';
  const chars = countChars(text);
  if (chars > MAX_CHARS) {
    return `the line is ${chars} characters, over the ${MAX_CHARS} limit`;
  }
  if (text.includes('\n') || text.includes('\r')) {
    return 'the line must be a single line with no line breaks';
  }
  return null;
}

function resolveOutputDir(): string {
  const override = process.env.MAKEFUN_OUTPUT_DIR;
  if (override !== undefined && override !== '') return override;
  return '/output';
}

function run(): void {
  const fault = validateLine(LINE);
  if (fault !== null) {
    process.stderr.write(`entry: ${fault}\n`);
    process.exit(1);
  }

  const dir = resolveOutputDir();
  mkdirSync(dir, { recursive: true });

  const target = join(dir, OUTPUT_FILE);
  writeFileSync(target, LINE, 'utf-8');

  // Read the file back and refuse to report success unless the bytes
  // on disk are exactly the line above.
  const landed = readFileSync(target, 'utf-8');
  if (landed !== LINE) {
    process.stderr.write('entry: the file on disk does not match the line\n');
    process.exit(1);
  }

  // A string match can still hide an encoding slip, so compare the
  // byte length of what landed on disk with the line's own byte
  // length in UTF-8, and fail loudly if the two disagree.
  const landedBytes = Buffer.byteLength(landed, 'utf-8');
  const lineBytes = Buffer.byteLength(LINE, 'utf-8');
  if (landedBytes !== lineBytes) {
    process.stderr.write(
      `entry: byte length mismatch on disk (${landedBytes} bytes, expected ${lineBytes})\n`,
    );
    process.exit(1);
  }

  const digest = createHash('sha256').update(landed, 'utf-8').digest('hex');
  process.stdout.write(
    `entry: wrote ${target} (${countChars(LINE)} characters, sha256 ${digest})\n`,
  );
}

run();
