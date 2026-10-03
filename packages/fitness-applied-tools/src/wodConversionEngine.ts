/*
  WOD conversion engine.

  Turns the prose of a CrossFit workout into columns a program can run:
  the format (for time, AMRAP, EMOM…), what the score is, the clock the
  runtime needs, and one structured line per movement with its count, its
  measure (reps, metres, calories, seconds) and the load that applies to it.

  Movement recognition runs against a lexicon (scripts/wod-compiler/
  movements.json): canonical CrossFit movements with aliases and the exercise
  catalog id each one maps to. Without a lexicon the engine still finds the
  format and the counts; the movement names are then the raw text.

  Nothing here invents a number. When the prose does not say, the field is
  left out and a warning says why, so the review step can see it.
*/

export type WodWorkoutType = 'standard' | 'amrap' | 'for_time' | 'emom' | 'timed_sets';
export type WodTrackingInput = 'weight' | 'reps' | 'seconds' | 'rounds' | 'distance';

/** Legacy columnar shape; parseWod() keeps returning it. */
export type WodColumnarRecord = {
  prescription: string;
  workoutType: WodWorkoutType;
  timeCapSeconds?: number;
  rounds?: number;
  sets?: number;
  reps?: number;
  intervalSeconds?: number;
  workDurationSeconds?: number;
  restSeconds?: number;
  trackingInputs: WodTrackingInput[];
  movements: string[];
  warnings: string[];
};

export type WodFormat = 'for_time' | 'amrap' | 'emom' | 'tabata' | 'interval' | 'strength' | 'max_load' | 'skill' | 'unknown';
export type WodScore = 'time' | 'rounds_reps' | 'reps' | 'load' | 'distance' | 'none';
export type WodMeasure = 'reps' | 'distance' | 'calories' | 'seconds' | 'load';
export type WodTimerMode = 'none' | 'countdown' | 'stopwatch' | 'interval';

export type WodLexiconMovement = {
  id: string;
  name: string;
  pattern: string;
  equipment: string[];
  measure: WodMeasure;
  aliases: string[];
  catalog: string | null;
  note?: string;
};

export type WodLexicon = { movements: WodLexiconMovement[] };

export type WodQuantity = {
  value: number;
  /** A second figure for the other division, "15/20-cal row" → 15 and 20. */
  alt?: number;
  measure: WodMeasure;
  /** The unit as written, normalised: m, km, mile, ft, yd, cal, s, min. */
  unit?: 'm' | 'km' | 'mile' | 'ft' | 'yd' | 'cal' | 's' | 'min';
};

export type WodLoad = { men?: string; women?: string };

export type WodLine = {
  order: number;
  kind: 'movement' | 'rest' | 'note';
  /** Lexicon id when the movement was recognised. */
  movementId?: string;
  /** Lexicon name, or the raw text when unrecognised. */
  name: string;
  raw: string;
  quantity?: WodQuantity;
  /** "5-5-5-5-5 reps" on a strength line. */
  repScheme?: number[];
  modifiers: string[];
  load?: WodLoad;
  recognised: boolean;
};

export type WodParsed = {
  prescription: string;
  name?: string;
  format: WodFormat;
  score: WodScore;
  timeCapSeconds?: number;
  rounds?: number;
  repScheme?: number[];
  sets?: number;
  intervalSeconds?: number;
  intervalCount?: number;
  workSeconds?: number;
  restSeconds?: number;
  timer: { mode: WodTimerMode; durationSeconds?: number; intervalSeconds?: number; workSeconds?: number; restSeconds?: number; rounds?: number };
  trackingInputs: WodTrackingInput[];
  lines: WodLine[];
  loads: WodLoad;
  warnings: string[];
  confidence: 'high' | 'medium' | 'low';
};

/* ---------- helpers ---------- */

const num = (s: string): number => Number(s.replace(/,/g, ''));

function extractNumber(pattern: RegExp, text: string): number | undefined {
  const match = text.match(pattern);
  return match?.[1] ? num(match[1]) : undefined;
}

/** Lowercase, hyphens and odd punctuation to spaces, one space between words. */
export function normaliseText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[-–—/]/g, ' ')
    .replace(/[^a-z0-9 .,:;()&%]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const MODIFIER_WORDS = ['strict', 'kipping', 'butterfly', 'alternating', 'synchro', 'synchronized', 'weighted', 'unbroken', 'max', 'single arm', 'one arm', 'left arm', 'right arm', 'each arm', 'each leg', 'each side', 'alternating arms', 'legless', 'deficit', 'chest to wall', 'wall facing', 'bodyweight', 'body weight', 'strict l'];

type AliasEntry = { movement: WodLexiconMovement; regex: RegExp; length: number };

/** Build the alias matchers once per lexicon. Longer aliases win, so "chest to bar pull up" beats "pull up". */
function compileLexicon(lexicon: WodLexicon): AliasEntry[] {
  const entries: AliasEntry[] = [];
  for (const movement of lexicon.movements) {
    for (const alias of movement.aliases) {
      const words = normaliseText(alias).split(' ');
      const body = words
        .map((w) => (/^(?:to|of|the|a|an|on|in|and|with|for)$/.test(w) ? w : `${w}(?:e?s)?`))
        .join('\\s+');
      entries.push({ movement, regex: new RegExp(`\\b${body}\\b`, 'i'), length: words.join(' ').length });
    }
  }
  return entries.sort((a, b) => b.length - a.length);
}

const lexiconCache = new WeakMap<WodLexicon, AliasEntry[]>();
function matchers(lexicon: WodLexicon): AliasEntry[] {
  let entries = lexiconCache.get(lexicon);
  if (!entries) {
    entries = compileLexicon(lexicon);
    lexiconCache.set(lexicon, entries);
  }
  return entries;
}

type Hit = { movement: WodLexiconMovement; index: number; length: number };

/** The longest alias that occurs in the text, with where it starts. */
function recogniseMovement(text: string, lexicon?: WodLexicon): Hit | undefined {
  if (!lexicon) return undefined;
  const normalised = normaliseText(text);
  let best: Hit | undefined;
  for (const entry of matchers(lexicon)) {
    const m = normalised.match(entry.regex);
    if (m && m.index !== undefined && (!best || m[0].length > best.length)) {
      best = { movement: entry.movement, index: m.index, length: m[0].length };
    }
  }
  return best;
}

/** The alias that occurs first in the text; the longest one when several start together. */
function earliestMovement(text: string, lexicon?: WodLexicon): Hit | undefined {
  if (!lexicon) return undefined;
  const normalised = normaliseText(text);
  let best: Hit | undefined;
  for (const entry of matchers(lexicon)) {
    const m = normalised.match(entry.regex);
    if (!m || m.index === undefined) continue;
    if (!best || m.index < best.index || (m.index === best.index && m[0].length > best.length)) {
      best = { movement: entry.movement, index: m.index, length: m[0].length };
    }
  }
  return best;
}

/* ---------- quantities ---------- */

const UNIT = String.raw`(?:m|meters?|metres?|km|kilometers?|miles?|mi|ft\.?|feet|foot|yards?|yd|cal\.?|calories?|seconds?|sec\.?|s|minutes?|min\.?)`;
const QTY = String.raw`(\d[\d,]*(?:\.\d+)?)(?:\s*/\s*(\d[\d,]*(?:\.\d+)?))?`;
// "400-meter run", "15/20-calorie row", "1,000 meters", "50-ft. walking lunge", "30 seconds"
const QTY_WITH_UNIT = new RegExp(String.raw`^${QTY}\s*-?\s*(${UNIT})\b\.?`, 'i');
const QTY_PLAIN = new RegExp(String.raw`^${QTY}\s+`, 'i');
// "Run 1 mile", "Row 1,000 meters", "Swim 100 meters", "Bike 5 km", "Lunge 100 meters"
const VERB_FIRST = new RegExp(String.raw`^(run|row|swim|bike|ski|ruck|lunge|sprint|walk|crawl|handstand walk)\s+${QTY}\s*-?\s*(${UNIT})\b\.?`, 'i');

function unitOf(raw: string | undefined): WodQuantity['unit'] | undefined {
  if (!raw) return undefined;
  const u = raw.toLowerCase().replace(/\./g, '');
  if (/^(m|meters?|metres?)$/.test(u)) return 'm';
  if (/^(km|kilometers?)$/.test(u)) return 'km';
  if (/^(miles?|mi)$/.test(u)) return 'mile';
  if (/^(ft|feet|foot)$/.test(u)) return 'ft';
  if (/^(yards?|yd)$/.test(u)) return 'yd';
  if (/^(cal|calories?)$/.test(u)) return 'cal';
  if (/^(seconds?|sec|s)$/.test(u)) return 's';
  if (/^(minutes?|min)$/.test(u)) return 'min';
  return undefined;
}

function measureOf(unit: WodQuantity['unit'] | undefined, fallback: WodMeasure): WodMeasure {
  if (!unit) return fallback;
  if (unit === 'cal') return 'calories';
  if (unit === 's' || unit === 'min') return 'seconds';
  return 'distance';
}

/* ---------- segmentation ---------- */

const FORMAT_PHRASES: RegExp[] = [
  /\b\d+\s*rounds?\s*(?:for time|for max|of)\b[^:]*:?/i,
  /\bfor time\b:?/i,
  /\bfor total reps\b:?/i,
  /\bfor max (?:load|reps|distance|calories)\b:?/i,
  /\b(?:complete )?as many (?:rounds|reps)[^:]*:/i,
  /\bamrap\b[^:]*:?/i,
  /\bmax rounds in \d+ minutes? of:?/i,
  /\bin \d+ minutes?,? complete as many (?:rounds|reps)[^:]*:/i,
  /\bevery (?:minute on the minute|\d+ (?:minutes?|min|seconds?|sec))[^:]*:/i,
  /\bemom\b[^:]*:?/i,
  /\bon a \d+-minute clock[^:]*:/i,
  /\bwith an? \d+-minute (?:running )?clock[^:]*:/i,
  /\bcomplete 1 complex every \d+ minutes?[^:]*:/i,
  /\b\d+(?:-\d+)+ reps? for time( of)?:?/i,
  /\b\d+(?:-\d+)+ reps? of:?/i,
];

/** Split the body into candidate lines: at each count, each verb-first distance, each "Rest", "Then", and sentence boundaries. */
function splitBody(body: string): string[] {
  const breakers = [
    String.raw`(?<![\d,/.(])(?<!\b(?:run|row|swim|bike|ski|ruck|lunge|walk|crawl|rest|minute|minutes|at|weight|sub|every|each)\s)(?!\d[\d,.]*(?:\s*/\s*\d[\d,.]*)?\s*-?\s*(?:lb|lbs|kg|pounds?)\b)(?=\b\d[\d,]*(?:\.\d+)?(?:\s*/\s*\d[\d,]*)?\s*-?\s*(?:${UNIT}\b|\s+[a-z]))`,
    String.raw`(?=\b(?:run|row|swim|bike|ski|ruck|lunge|walk)\s+\d[\d,]*(?:\.\d+)?(?:\s*/\s*\d[\d,]*)?\s*-?\s*(?:m|meters?|metres?|km|kilometers?|miles?|mi|ft\.?|feet|yards?|yd|cal\.?|calories?)\b)`,
    String.raw`(?=\brest\b)`,
    String.raw`(?=\bthen\b)`,
    String.raw`(?=\btabata\b)`,
    String.raw`(?=\bmax[- ]reps?\b)`,
    String.raw`(?=\bmax (?:distance|calories|load)\b)`,
    String.raw`(?<=[.;])\s+`,
  ];
  const re = new RegExp(breakers.join('|'), 'gi');
  const WORD_NUMBERS: Record<string, string> = { one: '1', two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7', eight: '8', nine: '9', ten: '10' };
  const prepared = body
    .replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten)\s+(rounds?|sets?|reps?|minutes?)\b/gi, (_m, w: string, n: string) => `${WORD_NUMBERS[w.toLowerCase()]} ${n}`)
    .replace(/\bminutes?\s+\d+(?:\s*-\s*\d+)?\s*:/gi, ' ; ')
    .replace(/\bat\s+\d{1,2}:\d{2}\s*:/gi, ' ; ');
  // Protect rep schemes ("5-5-5 reps") so their digits do not start new lines.
  const protectedBody = prepared.replace(/\b(\d+(?:-\d+)+)(?:\s*(reps?)\b)?/gi, (_m, scheme: string, reps: string | undefined) => `SCHEME_${scheme.replace(/-/g, 'x')}_${reps ?? 'reps'}`);
  return protectedBody
    .split(re)
    .map((s) => s.replace(/SCHEME_([\dx]+)_(reps?)/g, (_m, scheme: string, reps: string) => `${scheme.replace(/x/g, '-')} ${reps}`))
    .map((s) => s.replace(/^[\s,;:.]+|[\s,;:.]+$/g, ''))
    .filter((s) => s.length > 0);
}

/** A line with no count may hold several movements run together ("Cleans Ring dips"). Split on recognised aliases. */
function splitByLexicon(text: string, lexicon?: WodLexicon): string[] {
  if (!lexicon) return [text];
  const out: string[] = [];
  let rest = text;
  let guard = 0;
  while (rest.trim() && guard++ < 12) {
    const hit = earliestMovement(rest, lexicon);
    if (!hit) {
      out.push(rest.trim());
      break;
    }
    // Everything up to the end of this alias is one line (prefix words are modifiers of it).
    const normalised = normaliseText(rest);
    const end = hit.index + hit.length;
    // Map the normalised end back onto the raw string by counting words.
    const wordsBefore = normalised.slice(0, end).trim().split(' ').length;
    const rawWords = rest.trim().split(/\s+/);
    let piece = rawWords.slice(0, wordsBefore).join(' ');
    let remainder = rawWords.slice(wordsBefore).join(' ');
    const scheme = remainder.match(/^\s*(\d+(?:-\d+)+\s*reps?\b)/i);
    if (scheme) {
      piece = `${piece} ${scheme[1]}`;
      remainder = remainder.slice(scheme[0].length);
    }
    // A trailing qualifier that belongs to this movement: ", alternating" / ", left arm" / "(15 feet)".
    const qual = remainder.match(/^(?:,\s*)?((?:alternating|each arm|left arm|right arm|unbroken|synchro(?:nized)?|to \d+ ft\.?|\(\s*[^)]*\)|\d+-ft\.? rope)\b[^A-Z]*)/);
    if (qual && !recogniseMovement(qual[1], lexicon)) {
      out.push(`${piece} ${qual[1]}`.trim());
      rest = remainder.slice(qual[0].length);
    } else if (remainder.trim() && !earliestMovement(remainder, lexicon) && remainder.trim().split(/\s+/).length <= 4) {
      // A short tail with no movement in it belongs to this line ("as needed", "each arm").
      out.push(`${piece} ${remainder.trim()}`);
      rest = '';
    } else {
      out.push(piece);
      rest = remainder;
    }
  }
  return out.filter(Boolean);
}

/* ---------- loads ---------- */

const LOAD_ITEM = /(\d[\d,.]*\s*-?\s*(?:lb|lbs|kg|pound|in|inch|inches|ft|foot|feet)\.?)\s*([a-z][a-z .-]*)?/gi;

/** "50-lb dumbbell, 24-inch box" → [{ text: '50-lb dumbbell', equipment: 'dumbbell' }, { text: '24-inch box', equipment: 'box' }] */
function parseSetting(setting: string): Array<{ text: string; equipment: string }> {
  const items: Array<{ text: string; equipment: string }> = [];
  const cleaned = setting.replace(/\band\b/gi, ',');
  for (const part of cleaned.split(/,|;/)) {
    const p = part.trim();
    if (!p) continue;
    const m = p.match(/(\d[\d,.]*)\s*-?\s*(lb|lbs|kg|in|inch|inches|ft|foot|feet)\.?\s*(.*)$/i);
    if (!m) {
      items.push({ text: p, equipment: 'general' });
      continue;
    }
    const tail = (m[3] ?? '').toLowerCase();
    const unit = m[2].toLowerCase();
    let equipment = 'barbell';
    if (/dumbbell|\bdbs?\b/.test(tail)) equipment = 'dumbbell';
    else if (/kettlebell|\bkbs?\b/.test(tail)) equipment = 'kettlebell';
    else if (/ball/.test(tail)) equipment = 'medicine ball';
    else if (/box/.test(tail)) equipment = 'box';
    else if (/vest|armor|ruck/.test(tail)) equipment = 'vest';
    else if (/sandbag/.test(tail)) equipment = 'sandbag';
    else if (/rope/.test(tail)) equipment = 'rope';
    else if (/^(in|inch|inches)$/.test(unit)) equipment = 'box';
    else if (/^kg$/.test(unit) && !tail) equipment = 'kg';
    items.push({ text: p, equipment });
  }
  return items;
}

function loadFor(movement: WodLexiconMovement | undefined, rawLine: string, menItems: ReturnType<typeof parseSetting>, womenItems: ReturnType<typeof parseSetting>): WodLoad | undefined {
  const pick = (items: ReturnType<typeof parseSetting>): string | undefined => {
    if (!items.length) return undefined;
    const equipment = movement?.equipment ?? [];
    const line = rawLine.toLowerCase();
    const wants = (e: string) => equipment.includes(e) || line.includes(e.split(' ')[0]);
    for (const e of ['dumbbell', 'kettlebell', 'medicine ball', 'box', 'sandbag', 'rope']) {
      if (wants(e)) {
        const hit = items.find((i) => i.equipment === e);
        if (hit) return hit.text;
      }
    }
    if (equipment.includes('barbell') || /\b(?:barbell|bar)\b/.test(line)) {
      const hit = items.find((i) => i.equipment === 'barbell' || i.equipment === 'kg');
      if (hit) return hit.text;
    }
    if (equipment.includes('kettlebell')) {
      const hit = items.find((i) => i.equipment === 'kg');
      if (hit) return hit.text;
    }
    if (movement?.pattern === 'gymnastics' || movement?.pattern === 'monostructural') {
      const vest = items.find((i) => i.equipment === 'vest');
      return vest?.text;
    }
    return undefined;
  };
  const men = pick(menItems);
  const women = pick(womenItems);
  if (!men && !women) return undefined;
  return { ...(men ? { men } : {}), ...(women ? { women } : {}) };
}

/* ---------- the parser ---------- */

export type ParseWodOptions = { lexicon?: WodLexicon; menSetting?: string; womenSetting?: string };

export function parseWodDetailed(prescription: string, options: ParseWodOptions = {}): WodParsed {
  const WORDS: Record<string, string> = { one: '1', two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7', eight: '8', nine: '9', ten: '10' };
  const text = prescription.trim().replace(/\s+/g, ' ')
    .replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten)\s+(rounds?|sets?|reps?|minutes?|miles?)\b/gi, (_m, w: string, n: string) => `${WORDS[w.toLowerCase()]} ${n}`);
  if (!text) throw new Error('WOD prescription must not be empty.');
  const { lexicon } = options;
  const warnings: string[] = [];
  const lower = text.toLowerCase();

  /* --- name: short proper-noun lead-in before the first format phrase --- */
  let name: string | undefined;
  let headerStart = -1;
  let headerEnd = -1;
  for (const re of FORMAT_PHRASES) {
    const m = text.match(re);
    if (m && m.index !== undefined && (headerStart < 0 || m.index < headerStart)) {
      headerStart = m.index;
      headerEnd = m.index + m[0].length;
    }
  }
  if (headerStart > 0) {
    const lead = text.slice(0, headerStart).trim().replace(/[,:]+$/, '');
    const words = lead.split(/\s+/);
    const looksLikeName = words.length <= 7 && /^[A-Z]/.test(lead) && !/\d+\s*(?:rounds?|reps?|minutes?)/i.test(lead)
      && !recogniseMovement(lead, lexicon) && !/^(?:complete|then|rest|with|on|in|every|max|for)\b/i.test(lead);
    if (looksLikeName) name = lead;
  }

  /* --- format --- */
  const amrap = /\b(?:amrap|as many (?:rounds|reps|calories))\b|\bmax rounds in\b|\bmax reps in\b|\bas (?:much|many) as possible in\b/i.test(lower);
  const emom = /\bemom\b|\bevery minute\b|\bevery (?:\d+(?:\.\d+)?|other) (?:minutes?|min|seconds?|sec)\b/i.test(lower);
  const onClock = /\b(?:on a|with an?) \d+-minute (?:running )?clock\b|\bin \d+ minutes?, complete\b|\bfor reps\b:?/i.test(lower);
  const tabata = /\btabata\b/i.test(lower);
  const forTime = /\bfor time\b/i.test(lower);
  const forTotalReps = /\bfor total reps\b/i.test(lower);
  const forMaxLoad = /\bfor max load\b|\bfor load\b|\bheavy\b/i.test(lower);
  const forMaxDistance = /\bfor max distance\b/i.test(lower);
  const forMaxReps = /\bfor max reps\b/i.test(lower);
  const practice = /^(?:practice|skill work|work on|spend \d+ minutes)\b/i.test(lower) || /\bpractice\b/i.test(lower) && !forTime && !amrap && !emom;
  const complexEvery = lower.match(/every (\d+(?:\.\d+)?) (minutes?|min|seconds?|sec)(?: for (?:a total of )?(\d+) (?:sets|rounds))?/i);
  const strengthScheme = text.match(/\b(\d+(?:-\d+){1,}) reps?\b(?! for time)/i);
  const repSchemeForTime = text.match(/\b(\d+(?:-\d+){1,}) reps? for time\b/i) ?? text.match(/\b(\d+(?:-\d+){1,}) reps? of\b/i) ?? text.match(/\b(\d+(?:-\d+){1,})\s*:/i);
  const rounds = extractNumber(/\b(\d+)\s*rounds?\b/i, text);
  const roundsOfIntervals = extractNumber(/\b(\d+)\s*(?:sets|rounds|intervals|cycles)\b/i, text);
  const timeCap = extractNumber(/\b(?:in|cap(?:ped)? at|time cap:?|with an?)\s+(\d+(?:\.\d+)?)[\s-]*(?:minutes?|min)\b/i, text)
    ?? extractNumber(/\bamrap\s*(\d+(?:\.\d+)?)\b/i, text)
    ?? extractNumber(/\b(\d+)-minute (?:running )?clock\b/i, text)
    ?? extractNumber(/\bon a (\d+)-minute clock\b/i, text)
    ?? extractNumber(/\bfor (\d+)\s*(?:minutes?|min)\b(?! of rest)/i, text);
  const explicitCapSeconds = extractNumber(/\b(?:in|cap(?:ped)? at)\s+(\d+)\s*(?:seconds?|sec)\b/i, text);

  let format: WodFormat = 'unknown';
  if (tabata) format = 'tabata';
  else if (amrap) format = 'amrap';
  else if (emom && !/^(?:[a-z ,]*\b)?for time\b/i.test(lower)) format = forMaxLoad || /\bcomplex\b/.test(lower) ? 'max_load' : 'emom';
  else if (forTime || repSchemeForTime) format = 'for_time';
  else if (forTotalReps || forMaxReps || forMaxDistance || onClock) format = 'interval';
  else if (strengthScheme && !rounds) format = 'strength';
  else if (forMaxLoad) format = 'max_load';
  else if (practice) format = 'skill';
  else if (rounds) format = 'for_time';
  else if (/\b(\d+)\s*x\s*(\d+)\b/i.test(lower) || /\b\d+ sets?\b/i.test(lower)) format = 'strength';

  /* --- score & clock --- */
  let score: WodScore = 'none';
  let timer: WodParsed['timer'] = { mode: 'none' };
  const capSeconds = timeCap !== undefined ? Math.round(timeCap * 60) : explicitCapSeconds;
  const intervalSeconds = complexEvery ? Math.round(num(complexEvery[1]) * (/^min/i.test(complexEvery[2]) ? 60 : 1)) : emom ? 60 : undefined;
  const emomMinutes = extractNumber(/\b(?:every minute(?: on the minute)?|emom)\s+for\s+(\d+)\s*(?:minutes?|min)\b/i, text);
  const intervalCount = complexEvery?.[3] ? num(complexEvery[3])
    : emomMinutes !== undefined && intervalSeconds ? Math.floor((emomMinutes * 60) / intervalSeconds)
      : roundsOfIntervals;

  switch (format) {
    case 'for_time':
      score = 'time';
      timer = { mode: 'stopwatch', ...(capSeconds ? { durationSeconds: capSeconds } : {}) };
      break;
    case 'amrap':
      score = 'rounds_reps';
      timer = capSeconds ? { mode: 'countdown', durationSeconds: capSeconds } : { mode: 'countdown' };
      if (!capSeconds) warnings.push('AMRAP without a time cap in the text.');
      break;
    case 'emom':
      score = forMaxLoad ? 'load' : 'reps';
      timer = { mode: 'interval', intervalSeconds: intervalSeconds ?? 60, ...(intervalCount ? { rounds: intervalCount } : {}), ...(capSeconds ? { durationSeconds: capSeconds } : {}) };
      break;
    case 'max_load':
      score = 'load';
      timer = intervalSeconds ? { mode: 'interval', intervalSeconds, ...(intervalCount ? { rounds: intervalCount } : {}) } : { mode: 'none' };
      break;
    case 'tabata':
      score = 'reps';
      timer = { mode: 'interval', workSeconds: 20, restSeconds: 10, intervalSeconds: 30, rounds: 8 };
      break;
    case 'interval':
      score = forMaxDistance ? 'distance' : 'reps';
      timer = capSeconds ? { mode: 'countdown', durationSeconds: capSeconds } : { mode: 'stopwatch' };
      break;
    case 'strength':
      score = 'load';
      timer = { mode: 'none' };
      break;
    case 'skill':
      score = 'none';
      timer = capSeconds ? { mode: 'countdown', durationSeconds: capSeconds } : { mode: 'stopwatch' };
      break;
    default:
      score = 'none';
      timer = { mode: 'stopwatch' };
      warnings.push('Format not recognised; the prescription is kept as written for review.');
  }

  const repScheme = (repSchemeForTime?.[1] ?? (format === 'strength' ? strengthScheme?.[1] : undefined))?.split('-').map(num);
  const compact = text.match(/\b(\d+)\s*x\s*(\d+)\b/i);
  const sets = format === 'strength' ? (repScheme?.length ?? (compact ? num(compact[1]) : extractNumber(/\b(\d+)\s*sets?\b/i, text))) : undefined;

  /* --- loads --- */
  const menItems = parseSetting(options.menSetting ?? '');
  const womenItems = parseSetting(options.womenSetting ?? '');

  /* --- lines --- */
  const lead = headerStart > 0 && !name ? text.slice(0, headerStart) : '';
  const body = headerEnd > 0 ? `${lead} ${text.slice(headerEnd)}` : text;
  const lines: WodLine[] = [];
  let order = 0;

  if (format === 'skill') {
    const minutes = extractNumber(/\b(?:for|spend)\s+(\d+)\s*(?:minutes?|min)\b/i, text);
    const hit = recogniseMovement(text.replace(/\bpractice\b/i, ''), lexicon);
    lines.push({
      order: ++order,
      kind: 'movement',
      movementId: hit?.movement.id ?? 'skills-practice',
      name: text.replace(/[.:]+$/, ''),
      raw: text,
      ...(minutes ? { quantity: { value: minutes * 60, measure: 'seconds', unit: 'min' } } : {}),
      modifiers: [],
      recognised: true,
    });
    if (minutes && !timer.durationSeconds) timer = { mode: 'countdown', durationSeconds: minutes * 60 };
  }

  const rawLines = format === 'skill' ? [] : splitBody(body).flatMap((segment) => {
    const hasCount = QTY_WITH_UNIT.test(segment) || QTY_PLAIN.test(segment) || VERB_FIRST.test(segment) || /^(?:rest|then|tabata|max)/i.test(segment);
    return hasCount ? [segment] : splitByLexicon(segment, lexicon);
  });

  const queue = [...rawLines];
  while (queue.length) {
    const raw = queue.shift() as string;
    const s = raw.trim().replace(/^[*•-]\s*/, '');
    if (!s) continue;
    const low = s.toLowerCase();

    // Rest
    if (/^rest\b/.test(low)) {
      const restMatch = low.match(/^rest\s+(?:for\s+)?(?:(\d+):(\d{2})|(\d+(?:\.\d+)?)\s*(minutes?|min|seconds?|sec))\b\.?\s*(.*)$/);
      const secs = restMatch ? (restMatch[1] ? num(restMatch[1]) * 60 + num(restMatch[2]) : Math.round(num(restMatch[3]) * (/^min/.test(restMatch[4]) ? 60 : 1))) : undefined;
      const qualifier = restMatch?.[5]?.trim();
      lines.push({ order: ++order, kind: 'rest', name: 'Rest', raw: s, modifiers: qualifier ? [qualifier] : [], recognised: true, ...(secs ? { quantity: { value: secs, measure: 'seconds', unit: 's' } } : {}) });
      continue;
    }
    // Structure markers: "then", "5 rounds of", "then, 3 rounds of"
    const structure = low.match(/^(?:then,?\s*)?(\d+)\s*(?:\d+-minute\s+)?rounds?(?:,?\s*each[^,]*,?)?\s*(?:of|for time|for max \w+)?\b:?$/) ?? low.match(/^then\b[:,]?$/) ?? low.match(/^rounds?(?:,?\s*each[^,]*,?)?\s*of\b:?$/);
    if (structure) {
      lines.push({ order: ++order, kind: 'note', name: s.replace(/[:,]+$/, ''), raw: s, modifiers: [], recognised: true });
      continue;
    }
    // Then / notes / instructions that are not movements
    if (/^(?:then|partition|if you|wear|time cap|note|score|post|compare|for the|place|perform|the \w+ (?:is|are)|each (?:round|set)|between|after|before|at the)/.test(low) && !recogniseMovement(s, lexicon)) {
      lines.push({ order: ++order, kind: 'note', name: s, raw: s, modifiers: [], recognised: false });
      continue;
    }

    // Quantity
    let quantity: WodQuantity | undefined;
    let remainder = s;
    let m = s.match(VERB_FIRST);
    const clock = s.match(/^(\d{1,2}):(\d{2})\s+(?:of\s+)?/);
    if (clock) {
      quantity = { value: num(clock[1]) * 60 + num(clock[2]), measure: 'seconds', unit: 's' };
      remainder = s.slice(clock[0].length);
    } else if (m) {
      const unit = unitOf(m[4]);
      quantity = { value: num(m[2]), ...(m[3] ? { alt: num(m[3]) } : {}), measure: measureOf(unit, 'distance'), ...(unit ? { unit } : {}) };
      remainder = `${m[1]} ${s.slice(m[0].length)}`.trim();
    } else if ((m = s.match(QTY_WITH_UNIT))) {
      const unit = unitOf(m[3]);
      quantity = { value: num(m[1]), ...(m[2] ? { alt: num(m[2]) } : {}), measure: measureOf(unit, 'reps'), ...(unit ? { unit } : {}) };
      remainder = s.slice(m[0].length);
    } else if ((m = s.match(QTY_PLAIN))) {
      quantity = { value: num(m[1]), ...(m[2] ? { alt: num(m[2]) } : {}), measure: 'reps' };
      remainder = s.slice(m[0].length);
    } else if (/^tabata\b/i.test(s)) {
      remainder = s.replace(/^tabata\s*/i, '');
    } else if (/^max[- ]reps?\b/i.test(s)) {
      remainder = s.replace(/^max[- ]reps?\s*(?:of\s*)?/i, '');
    }
    remainder = remainder.replace(/^(?:of\s+|reps?\s+of\s+|reps?\s+)/i, '').trim();

    // Inline load: "thrusters, 95 lb" / "(135/95 lb)" / "20 kg"
    let inlineLoad: WodLoad | undefined;
    const loadMatch = remainder.match(/[,(]?\s*(\d[\d,.]*)(?:\s*\/\s*(\d[\d,.]*))?\s*-?\s*(lb|lbs|kg|pounds?)\b\.?\)?/i);
    if (loadMatch) {
      const unit = loadMatch[3].toLowerCase().startsWith('lb') || loadMatch[3].toLowerCase().startsWith('pound') ? 'lb' : 'kg';
      inlineLoad = { men: `${loadMatch[1]} ${unit}`, ...(loadMatch[2] ? { women: `${loadMatch[2]} ${unit}` } : {}) };
      remainder = remainder.replace(loadMatch[0], ' ').replace(/\s+/g, ' ').trim();
    }
    // Parenthetical qualifiers that are not distances: "(touch and go)", "(weight 1)"
    const parenthetical = remainder.match(/\(([^)]*)\)/);
    const parenModifier = parenthetical && !/\d\s*-?\s*(?:ft|feet|m|meters?|in|inch)/i.test(parenthetical[1]) ? parenthetical[1].trim() : undefined;
    if (parenModifier) remainder = remainder.replace(parenthetical![0], ' ').replace(/\s+/g, ' ').trim();

    // Strength line rep scheme: "Overhead squat 5-5-5 reps"
    const scheme = remainder.match(/\b(\d+(?:-\d+)+)\s*reps?\b/i);
    const lineScheme = scheme ? scheme[1].split('-').map(num) : undefined;
    if (scheme) remainder = remainder.replace(scheme[0], '').trim();
    if (!quantity && !lineScheme && format === 'strength' && compact) {
      remainder = remainder.replace(/\b\d+\s*x\s*\d+\b/i, '').trim();
    }

    // A counted line that runs into the next movement: keep the first, queue the rest.
    if (lexicon) {
      const pieces = splitByLexicon(remainder, lexicon);
      if (pieces.length > 1 && earliestMovement(pieces[0], lexicon)) {
        remainder = pieces[0];
        queue.unshift(...pieces.slice(1));
      }
    }

    const hit = recogniseMovement(remainder, lexicon);
    const previousMovement = [...lines].reverse().find((l) => l.kind === 'movement');
    // "until you complete the row", "partition as needed": an instruction that names a movement, not a line of work.
    if (hit && !quantity && !lineScheme && (/\b(?:until|as needed|of your choice|you complete|if you|instead of|in place of|between|after each|before each|at the start|at the top|each minute|every minute)\b|^(?:partition|wear|use|perform|complete|then|score|post|note)\b/i.test(remainder))) {
      lines.push({ order: ++order, kind: 'note', name: remainder, raw: s, modifiers: [], recognised: true });
      continue;
    }
    // A counted fragment with no movement, right after one: "15-ft. rope", "to a 6-inch target"
    if (!hit && quantity && lexicon && previousMovement && normaliseText(remainder).split(' ').length <= 3) {
      previousMovement.modifiers.push(s.replace(/^[,\s]+|[,\s]+$/g, ''));
      continue;
    }
    if (!hit && !quantity && !lineScheme && lexicon) {
      const fragment = normaliseText(remainder).replace(/[^a-z0-9 ]/g, '').trim();
      const previous = previousMovement;
      const maxFor = fragment.match(/^(?:for )?max (distance|reps|calories|load|rounds)$/);
      if (maxFor && previous) {
        previous.modifiers.push(`max ${maxFor[1]}`);
        continue;
      }
      if (!fragment || /^(?:for|then|of|and|or|with|to|the|a|an|per|each|reps?|rounds?|x|etc|is|in|complete|lb|kg)$/.test(fragment)) continue;
      if (/^(?:between (?:rounds|sets|efforts)|after each (?:round|set)|in the remaining time|on a|clock|complete|time cap|cap|for calories|calories|for reps|for time|for max|as many|pace|accumulate|repeat|unbroken|if completed|then)/.test(fragment)) {
        const target = [...lines].reverse().find((l) => l.kind === 'movement' || l.kind === 'rest');
        if (target) { target.modifiers.push(fragment); continue; }
      }
      lines.push({ order: ++order, kind: 'note', name: remainder, raw: s, modifiers: [], recognised: false });
      continue;
    }
    const modifiers = MODIFIER_WORDS.filter((w) => new RegExp(`\\b${w}\\b`, 'i').test(normaliseText(remainder)) && !(hit && normaliseText(hit.movement.name).includes(w)));
    const movement = hit?.movement;
    const measure: WodMeasure = quantity?.measure ?? movement?.measure ?? 'reps';
    const qty = quantity ? { ...quantity, measure: quantity.unit ? quantity.measure : movement?.measure === 'seconds' && !quantity.unit ? 'reps' : measure } : undefined;
    const load = inlineLoad ?? loadFor(movement, remainder, menItems, womenItems);
    if (parenModifier) modifiers.push(parenModifier);
    const displayName = movement ? movement.name : remainder.replace(/\s+/g, ' ').trim();
    if (!displayName) continue;
    lines.push({
      order: ++order,
      kind: 'movement',
      ...(movement ? { movementId: movement.id } : {}),
      name: displayName,
      raw: s,
      ...(qty ? { quantity: qty } : {}),
      ...(lineScheme ? { repScheme: lineScheme } : {}),
      modifiers,
      ...(load ? { load } : {}),
      recognised: !!movement,
    });
  }

  const movementLines = lines.filter((l) => l.kind === 'movement');
  if (format === 'unknown' && movementLines.length && movementLines.some((l) => l.quantity || l.repScheme)) {
    format = movementLines.every((l) => l.repScheme) ? 'strength' : 'for_time';
    score = format === 'strength' ? 'load' : 'time';
    timer = format === 'strength' ? { mode: 'none' } : { mode: 'stopwatch' };
    warnings.splice(warnings.indexOf('Format not recognised; the prescription is kept as written for review.'), 1);
    warnings.push(`No format phrase in the text; treated as ${format === 'strength' ? 'strength work' : 'for time'}.`);
  }
  const unrecognised = lines.filter((l) => !l.recognised && (l.kind === 'movement' || /^[a-z]/i.test(l.name) && l.name.split(' ').length <= 5));
  if (!movementLines.length) warnings.push('No movements found in the text.');
  if (unrecognised.length) warnings.push(`Unrecognised movement text: ${unrecognised.map((l) => `"${l.name}"`).join(', ')}.`);
  if ((menItems.length || womenItems.length) && !movementLines.some((l) => l.load)) warnings.push('A load was given but could not be tied to a movement.');

  /* --- tracking inputs for the runtime --- */
  const trackingInputs: WodTrackingInput[] = [];
  const needs = (i: WodTrackingInput) => { if (!trackingInputs.includes(i)) trackingInputs.push(i); };
  if (score === 'time') needs('seconds');
  if (score === 'rounds_reps') { needs('rounds'); needs('reps'); }
  if (score === 'reps') needs('reps');
  if (score === 'load') { needs('weight'); needs('reps'); }
  if (score === 'distance') needs('distance');
  if (movementLines.some((l) => l.load)) needs('weight');
  if (movementLines.some((l) => l.quantity?.measure === 'distance' || l.quantity?.measure === 'calories')) needs('distance');
  if (!trackingInputs.length) needs('reps');

  const multiPart = lines.some((l) => l.kind === 'note' && /^then\b/i.test(l.name));
  if (multiPart) warnings.push('Multi-part workout ("then"): the clock runs it as one block; the parts are listed in order.');
  const confidence: WodParsed['confidence'] = format === 'unknown' || !movementLines.length ? 'low' : unrecognised.length || multiPart ? 'medium' : 'high';

  return {
    prescription: text,
    ...(name ? { name } : {}),
    format,
    score,
    ...(capSeconds ? { timeCapSeconds: capSeconds } : {}),
    ...(rounds !== undefined && format !== 'strength' ? { rounds } : {}),
    ...(repScheme ? { repScheme } : {}),
    ...(sets !== undefined ? { sets } : {}),
    ...(intervalSeconds !== undefined ? { intervalSeconds } : {}),
    ...(intervalCount !== undefined && (format === 'emom' || format === 'max_load' || format === 'interval') ? { intervalCount } : {}),
    ...(tabata ? { workSeconds: 20, restSeconds: 10 } : {}),
    timer,
    trackingInputs,
    lines,
    loads: { ...(options.menSetting ? { men: options.menSetting } : {}), ...(options.womenSetting ? { women: options.womenSetting } : {}) },
    warnings,
    confidence,
  };
}

/* ---------- legacy columnar API, kept for the export script and its tests ---------- */

export function parseWod(prescription: string, options: ParseWodOptions = {}): WodColumnarRecord {
  const p = parseWodDetailed(prescription, options);
  const normalized = p.prescription;
  const legacyType: WodWorkoutType = p.format === 'amrap' ? 'amrap'
    : p.format === 'for_time' ? 'for_time'
      : p.format === 'emom' || p.format === 'max_load' ? 'emom'
        : p.format === 'tabata' || p.format === 'interval' ? 'timed_sets'
          : 'standard';
  const compact = normalized.match(/\b(\d+)\s*x\s*(\d+)\b/i);
  const sets = p.sets ?? (compact ? num(compact[1]) : undefined) ?? (p.format === 'tabata' ? 8 : undefined) ?? p.intervalCount;
  const reps = compact ? num(compact[2]) : extractNumber(/\b(\d+)\s*(?:reps?|repetitions?)\b/i, normalized);
  const legacyInputs: WodTrackingInput[] = legacyType === 'amrap' ? ['reps', 'rounds']
    : legacyType === 'timed_sets' || legacyType === 'emom' ? ['seconds', 'reps']
      : ['weight', 'reps'];
  if (legacyType === 'for_time') legacyInputs.push('seconds');
  const warnings = [...p.warnings];
  if (legacyType === 'standard' && p.rounds === undefined && sets === undefined && reps === undefined) {
    warnings.push('No explicit rounds, sets, or reps were identified; preserve the prescription for review.');
  }
  return {
    prescription: normalized,
    workoutType: legacyType,
    ...(p.timeCapSeconds === undefined ? {} : { timeCapSeconds: p.timeCapSeconds }),
    ...(p.rounds === undefined ? {} : { rounds: p.rounds }),
    ...(sets === undefined ? {} : { sets }),
    ...(reps === undefined ? {} : { reps }),
    ...(p.intervalSeconds === undefined ? {} : { intervalSeconds: p.intervalSeconds }),
    ...(p.workSeconds === undefined ? {} : { workDurationSeconds: p.workSeconds }),
    ...(p.restSeconds === undefined ? {} : { restSeconds: p.restSeconds }),
    trackingInputs: legacyInputs,
    movements: p.lines.filter((l) => l.kind === 'movement').map((l) => l.raw),
    warnings,
  };
}
