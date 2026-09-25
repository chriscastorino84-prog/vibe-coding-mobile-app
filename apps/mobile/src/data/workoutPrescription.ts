export type ParsedWorkoutPrescription = {
  sets: number;
  weight: string;
  reps: string;
};

export function parseWorkoutPrescription(prescription: string): ParsedWorkoutPrescription {
  const parts = prescription
    .split(/[xX×]/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length >= 3 && Number.isFinite(Number(parts[0]))) {
    return {
      sets: Math.max(1, Number(parts[0])),
      weight: parts[1],
      reps: parts.slice(2).join(' x '),
    };
  }

  if (parts.length >= 2 && Number.isFinite(Number(parts[0]))) {
    return {
      sets: Math.max(1, Number(parts[0])),
      weight: '',
      reps: parts.slice(1).join(' x '),
    };
  }

  return {
    sets: 1,
    weight: '',
    reps: prescription.trim(),
  };
}
