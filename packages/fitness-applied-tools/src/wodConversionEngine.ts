export type WodWorkoutType = 'standard' | 'amrap' | 'for_time' | 'emom' | 'timed_sets';
export type WodTrackingInput = 'weight' | 'reps' | 'seconds' | 'rounds' | 'distance';

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

function extractNumber(pattern: RegExp, text: string): number | undefined {
  const match = text.match(pattern);
  return match?.[1] ? Number(match[1]) : undefined;
}

function extractMovements(text: string): string[] {
  return text
    .split(/\n|;|\.(?=\s+[A-Z])/)
    .map((part) => part.replace(/^\s*(?:\d+[\s.)-]*|[-*])\s*/, '').trim())
    .filter((part) => part.length > 2 && !/^(?:amrap|for time|every|tabata|rest)\b/i.test(part))
    .slice(0, 20);
}

export function parseWod(prescription: string): WodColumnarRecord {
  const normalized = prescription.trim().replace(/\s+/g, ' ');
  if (!normalized) throw new Error('WOD prescription must not be empty.');

  const warnings: string[] = [];
  const amrap = /\b(?:amrap|as many rounds|as many reps)\b/i.test(normalized);
  const emom = /\b(?:emom|every minute on the minute)\b/i.test(normalized);
  const tabata = /\btabata\b/i.test(normalized);
  const forTime = /\bfor time\b/i.test(normalized);
  const timeCapMinutes = extractNumber(/\b(?:amrap|for|cap(?:ped)? at)\s+(\d+(?:\.\d+)?)\s*(?:minutes?|min)\b/i, normalized);
  const timeCapSeconds = timeCapMinutes === undefined ? undefined : timeCapMinutes * 60;
  const explicitSeconds = extractNumber(/\b(?:for|every|cap(?:ped)? at)\s+(\d+)\s*(?:seconds?|sec)\b/i, normalized);
  const resolvedTimeCapSeconds = timeCapSeconds ?? explicitSeconds;
  const intervalMinutes = extractNumber(/\b(?:every|each)\s+(\d+)\s*(?:minutes?|min)\b/i, normalized);
  const rounds = extractNumber(/\b(\d+)\s*(?:rounds?|rds?)\b/i, normalized);
  const compactSetsAndReps = normalized.match(/\b(\d+)\s*x\s*(\d+)\b/i);
  const sets = compactSetsAndReps?.[1] !== undefined
    ? Number(compactSetsAndReps[1])
    : extractNumber(/\b(\d+)\s*sets?\b/i, normalized) ?? extractNumber(/\bx\s*(\d+)\b/i, normalized);
  const reps = compactSetsAndReps?.[2] !== undefined
    ? Number(compactSetsAndReps[2])
    : extractNumber(/\b(\d+)\s*(?:reps?|repetitions?)\b/i, normalized);
  const workDurationSeconds = tabata ? 20 : extractNumber(/\bwork\s*(?:for)?\s*(\d+)\s*(?:seconds?|sec)\b/i, normalized);
  const restSeconds = tabata ? 10 : extractNumber(/\brest\s*(?:for)?\s*(\d+)\s*(?:seconds?|sec)\b/i, normalized);

  let workoutType: WodWorkoutType = 'standard';
  if (amrap) workoutType = 'amrap';
  else if (emom) workoutType = 'emom';
  else if (tabata || /\b(?:timed sets?|intervals?|clock)\b/i.test(normalized)) workoutType = 'timed_sets';
  else if (forTime) workoutType = 'for_time';

  if (workoutType === 'standard' && rounds === undefined && sets === undefined && reps === undefined) {
    warnings.push('No explicit rounds, sets, or reps were identified; preserve the prescription for review.');
  }
  if ((amrap || emom || forTime) && resolvedTimeCapSeconds === undefined) {
    warnings.push('Workout type was identified but no time cap was found.');
  }

  const trackingInputs: WodTrackingInput[] = workoutType === 'amrap'
    ? ['reps', 'rounds']
    : workoutType === 'timed_sets' || workoutType === 'emom'
      ? ['seconds', 'reps']
      : ['weight', 'reps'];
  if (workoutType === 'for_time') trackingInputs.push('seconds');

  return {
    prescription: normalized,
    workoutType,
    ...(resolvedTimeCapSeconds === undefined ? {} : { timeCapSeconds: resolvedTimeCapSeconds }),
    ...(rounds === undefined ? {} : { rounds }),
    ...(sets === undefined ? {} : { sets }),
    ...(reps === undefined ? {} : { reps }),
    ...(intervalMinutes === undefined ? {} : { intervalSeconds: intervalMinutes * 60 }),
    ...(workDurationSeconds === undefined ? {} : { workDurationSeconds }),
    ...(restSeconds === undefined ? {} : { restSeconds }),
    trackingInputs,
    movements: extractMovements(normalized),
    warnings,
  };
}
