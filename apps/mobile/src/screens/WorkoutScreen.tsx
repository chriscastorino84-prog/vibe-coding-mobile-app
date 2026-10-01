import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { palette, radii, spacing } from '../theme/theme';
import { calculateTonnage } from '../analytics';
import { exerciseDefinitions, measurementDefinitions } from '../data/metricDefinitions';
import type { MeasurementObservation, Program, RpeQuality, WorkoutDay, WorkoutExercise, WorkoutSession } from '../types';

type WorkoutScreenProps = {
  program: Program;
  workoutDay?: WorkoutDay;
  onComplete: (session: WorkoutSession) => void;
  onBack: () => void;
};

type EditableExercise = {
  id: string;
  name: string;
  sets: Array<{ weight: string; reps: string }>;
  workoutType?: 'standard' | 'amrap' | 'timed_sets';
  restSeconds?: number;
  workDurationSeconds?: number;
  intervalSeconds?: number;
};

export function WorkoutScreen({ program, workoutDay, onComplete, onBack }: WorkoutScreenProps) {
  const [started, setStarted] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [activeExerciseIndex, setActiveExerciseIndex] = useState(0);
  const [completedSets, setCompletedSets] = useState<Record<string, number>>({});
  const [roundCounts, setRoundCounts] = useState<Record<string, number>>({});
  const [restRemaining, setRestRemaining] = useState<number | null>(null);
  const [masterElapsed, setMasterElapsed] = useState(0);
  const [setElapsed, setSetElapsed] = useState(0);
  const [showFinishPrompt, setShowFinishPrompt] = useState(false);
  const lastTapAt = useRef(0);
  const workoutStartedAt = useRef<number | null>(null);
  const [exerciseValues, setExerciseValues] = useState<EditableExercise[]>(() => {
    if (workoutDay) {
      return workoutDay.exercises.map((exercise) => ({
        id: exercise.id,
        name: exercise.name,
        sets: Array.from({ length: exercise.sets }, () => ({ weight: '', reps: exercise.reps })),
        workoutType: exercise.workoutType,
        restSeconds: exercise.restSeconds,
        workDurationSeconds: exercise.workDurationSeconds,
        intervalSeconds: exercise.intervalSeconds,
      }));
    }

    return exerciseDefinitions.map((exercise, index) => ({
      ...exercise,
      sets: [{ weight: String((index + 1) * 5), reps: String(5 + index) }],
      workoutType: 'standard' as const,
    }));
  });
  const [measurementValues, setMeasurementValues] = useState<Record<string, string>>({});
  const [rpeQuality, setRpeQuality] = useState<RpeQuality>(3);
  const [notes, setNotes] = useState('');
  const activeExercise = workoutDay?.exercises[activeExerciseIndex];

  useEffect(() => {
    if (!started || restRemaining !== null) return undefined;
    const interval = setInterval(() => {
      setMasterElapsed(workoutStartedAt.current ? Math.floor((Date.now() - workoutStartedAt.current) / 1000) : 0);
      setSetElapsed((value) => value + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [started, restRemaining]);

  useEffect(() => {
    if (restRemaining === null) return undefined;
    if (restRemaining <= 0) {
      setRestRemaining(null);
      setSetElapsed(0);
      return undefined;
    }
    const timer = setTimeout(() => setRestRemaining((value) => value === null ? null : value - 1), 1000);
    return () => clearTimeout(timer);
  }, [restRemaining]);

  useEffect(() => {
    if (!started || countdown <= 0) return undefined;
    const timer = setTimeout(() => setCountdown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [started, countdown]);

  useEffect(() => {
    if (!activeExercise || activeExercise.workoutType !== 'amrap' || !activeExercise.workDurationSeconds) return;
    if (setElapsed < activeExercise.workDurationSeconds) return;
    if (activeExerciseIndex + 1 >= (workoutDay?.exercises.length ?? 0)) {
      setShowFinishPrompt(true);
    } else {
      setActiveExerciseIndex((current) => current + 1);
      setSetElapsed(0);
    }
  }, [activeExercise, activeExerciseIndex, setElapsed, workoutDay?.exercises.length]);

  const beginWorkout = () => {
    workoutStartedAt.current = Date.now();
    setStarted(true);
    setCountdown(3);
  };

  const formatDuration = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

  const finishSet = () => {
    if (!activeExercise || restRemaining !== null || countdown > 0) return;
    if (activeExercise.workoutType === 'timed_sets' && activeExercise.workDurationSeconds && setElapsed < activeExercise.workDurationSeconds) return;
    const now = Date.now();
    const currentRounds = roundCounts[activeExercise.id] ?? 0;
    const duplicateWindow = activeExercise.workoutType === 'amrap'
      ? Math.max(0.75, 0.75 * Math.max(1, currentRounds))
      : 0.25;
    if (now - lastTapAt.current < duplicateWindow * 1000) return;
    lastTapAt.current = now;

    if (activeExercise.workoutType === 'amrap') {
      setRoundCounts((current) => ({ ...current, [activeExercise.id]: currentRounds + 1 }));
      setSetElapsed(0);
      return;
    }

    const setCount = completedSets[activeExercise.id] ?? 0;
    const nextSet = setCount + 1;
    setCompletedSets((current) => ({ ...current, [activeExercise.id]: nextSet }));
    setSetElapsed(0);
    const finalSet = nextSet >= activeExercise.sets;
    if (finalSet) {
      if (activeExerciseIndex + 1 >= (workoutDay?.exercises.length ?? 0)) {
        setShowFinishPrompt(true);
      } else {
        setActiveExerciseIndex((current) => current + 1);
      }
      return;
    }
    const restSeconds = activeExercise.workoutType === 'timed_sets'
      ? (activeExercise.intervalSeconds ?? activeExercise.restSeconds ?? 0)
      : (activeExercise.restSeconds ?? 0);
    if (restSeconds > 0) {
      setRestRemaining(restSeconds);
    }
  };

  const exercises = useMemo<WorkoutExercise[]>(
    () =>
      exerciseValues.map((exercise) => {
        const sets = exercise.sets.map((set, index) => ({
          id: `${exercise.id}-set-${index + 1}`,
          weight: Number(set.weight || 0),
            reps: Number.isFinite(Number(set.reps)) ? Number(set.reps) : 0,
        }));

        return {
          id: exercise.id,
          name: exercise.name,
          sets,
          tonnage: calculateTonnage(sets),
        };
      }),
    [exerciseValues],
  );
  const handleComplete = () => {
    const sessionId = `${program.id}-${Date.now()}`;
    const completedAt = new Date().toISOString();
    const measurements: MeasurementObservation[] = measurementDefinitions.flatMap((definition) => {
      const rawValue = measurementValues[definition.id]?.trim();
      if (!rawValue) {
        return [];
      }

      return [{
        id: `${sessionId}-${definition.id}`,
        metricId: definition.id,
        label: definition.label,
        category: definition.category,
        unit: definition.unit,
        value: Number(rawValue) || 0,
        recordedAt: completedAt,
        sessionId,
      }];
    });

    onComplete({
      id: sessionId,
      programId: program.id,
      workoutDayId: workoutDay?.id,
      completedAt,
      exercises,
      measurements,
      rpeQuality,
      notes: notes.trim() || undefined,
    });
  };

  const updateSet = (exerciseId: string, setIndex: number, field: 'weight' | 'reps', value: string) => {
    setExerciseValues((current) => current.map((exercise) => {
      if (exercise.id !== exerciseId) {
        return exercise;
      }

      return {
        ...exercise,
        sets: exercise.sets.map((set, index) => index === setIndex ? { ...set, [field]: value } : set),
      };
    }));
  };

  if (!started) {
    return (
      <View style={styles.startScreen}>
        <Text style={styles.phase}>{program.phase}</Text>
        <Text style={styles.title}>{workoutDay?.title ?? program.name}</Text>
        <Text style={styles.startCopy}>Tap start when you are ready. The workout timer begins with a three-second countdown.</Text>
        {program.adPolicy === 'free_programs_only' && <AdPlacement label="Free program · workout banner" />}
        <TouchableOpacity style={styles.startWorkoutButton} onPress={beginWorkout}>
          <Text style={styles.completeText}>Tap to start</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onBack}><Text style={styles.backText}>Back</Text></TouchableOpacity>
      </View>
    );
  }

  if (restRemaining !== null) {
    return (
      <View style={styles.restScreen}>
        <Text style={styles.kicker}>Rest interval</Text>
        <Text style={styles.restTime}>{formatDuration(restRemaining)}</Text>
        <Text style={styles.restCopy}>The next set will appear when the rest interval ends.</Text>
        {program.adPolicy === 'free_programs_only' && <AdPlacement label="Free program · rest screen" />}
        <TouchableOpacity onPress={() => setRestRemaining(null)}><Text style={styles.skipText}>Skip rest</Text></TouchableOpacity>
      </View>
    );
  }

  if (countdown > 0) {
    return (
      <TouchableOpacity style={styles.countdownScreen} onPress={() => setCountdown(0)} activeOpacity={0.9}>
        <Text style={styles.kicker}>Get ready</Text>
        <Text style={styles.countdownText}>{countdown}</Text>
        <Text style={styles.restCopy}>Tap to begin now</Text>
      </TouchableOpacity>
    );
  }

  if (showFinishPrompt) {
    return (
      <View style={styles.finishPrompt}>
        <Text style={styles.kicker}>Workout complete</Text>
        <Text style={styles.title}>End this workout?</Text>
        <Text style={styles.restCopy}>Your last set is recorded. Finish now to save the session and its metrics.</Text>
        <TouchableOpacity style={styles.startWorkoutButton} onPress={handleComplete}>
          <Text style={styles.completeText}>End and save workout</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowFinishPrompt(false)}>
          <Text style={styles.backText}>Return to workout</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.header}>
        <Text style={styles.phase}>{program.phase}</Text>
        <Text style={styles.title}>{workoutDay?.title ?? program.name}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.timerBar}>
          <Text style={styles.timerLabel}>Total {formatDuration(masterElapsed)}</Text>
          <Text style={styles.timerLabel}>Set {formatDuration(setElapsed)}</Text>
        </View>
        {workoutDay?.dayNumber === 1 && (
          <View style={styles.programBrief}>
            <Text style={styles.briefLabel}>Program brief</Text>
            <Text style={styles.briefTitle}>{program.name}</Text>
            <Text style={styles.briefText}>{program.description}</Text>
            <Text style={styles.briefFocus}>{program.tone}</Text>
          </View>
        )}
        {exerciseValues.map((exercise, index) => (
          <View key={exercise.id} style={styles.exerciseCard}>
            <Text style={styles.exerciseTitle}>{index + 1}. {exercise.name}</Text>
            <View style={styles.tableHeader}>
              <Text style={styles.setHeader}>Set</Text>
              <Text style={styles.cellHeader}>Weight</Text>
              <Text style={styles.cellHeader}>Reps</Text>
            </View>
            {exercise.sets.map((set, setIndex) => (
              <View key={`${exercise.id}-${setIndex}`} style={styles.setRow}>
                <Text style={styles.setLabel}>{setIndex + 1}</Text>
                <TextInput
                  style={styles.input}
                  value={set.weight}
                  keyboardType="numeric"
                  onChangeText={(text) => updateSet(exercise.id, setIndex, 'weight', text)}
                  placeholder="0"
                  placeholderTextColor={palette.textMuted}
                />
                <TextInput
                  style={styles.input}
                  value={set.reps}
                  keyboardType="numeric"
                  onChangeText={(text) => updateSet(exercise.id, setIndex, 'reps', text)}
                  placeholder="0"
                  placeholderTextColor={palette.textMuted}
                />
              </View>
            ))}
            {activeExercise && workoutDay && (
              <TouchableOpacity style={styles.tapTracker} onPress={finishSet} accessibilityLabel={`Complete ${activeExercise.name} set`}>
                <Text style={styles.tapTrackerTitle}>
                  {activeExercise.workoutType === 'amrap'
                    ? `Tap for round ${(roundCounts[activeExercise.id] ?? 0) + 1}`
                    : activeExercise.workoutType === 'timed_sets'
                      ? `Tap when set ${completedSets[activeExercise.id] ?? 0 + 1} ends`
                      : `Tap when set ${(completedSets[activeExercise.id] ?? 0) + 1} ends`}
                </Text>
                <Text style={styles.tapTrackerHint}>
                  {activeExercise.workoutType === 'amrap'
                    ? `${activeExercise.workDurationSeconds ?? 0}s work · ${roundCounts[activeExercise.id] ?? 0} rounds`
                    : activeExercise.workoutType === 'timed_sets'
                      ? `${activeExercise.workDurationSeconds ?? 0}s work · ${activeExercise.intervalSeconds ?? 0}s interval`
                      : 'Tap records the completed set and starts programmed rest.'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ))}

        <Text style={styles.sectionTitle}>Body measurements</Text>
        <Text style={styles.sectionHint}>Optional today. Each value becomes a dated graph point.</Text>
        {measurementDefinitions.map((measurement) => (
          <View key={measurement.id} style={styles.measurementRow}>
            <View>
              <Text style={styles.measurementLabel}>{measurement.label}</Text>
              <Text style={styles.measurementUnit}>{measurement.unit}</Text>
            </View>
            <TextInput
              style={styles.input}
              value={measurementValues[measurement.id] ?? ''}
              keyboardType="decimal-pad"
              onChangeText={(text) => setMeasurementValues((current) => ({ ...current, [measurement.id]: text }))}
              placeholder="-"
              placeholderTextColor={palette.textMuted}
            />
          </View>
        ))}

        <Text style={styles.sectionTitle}>Workout quality</Text>
        <Text style={styles.sectionHint}>How closely did today match the prescribed RPE capability?</Text>
        <View style={styles.rpeRow}>
          {([1, 2, 3, 4, 5] as RpeQuality[]).map((quality) => (
            <TouchableOpacity
              key={quality}
              style={[styles.rpeOption, rpeQuality === quality && styles.rpeOptionSelected]}
              onPress={() => setRpeQuality(quality)}
            >
              <Text style={[styles.rpeValue, rpeQuality === quality && styles.rpeValueSelected]}>{quality}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.rpeScaleLabels}>
          <Text style={styles.scaleLabel}>Lowest match</Text>
          <Text style={styles.scaleLabel}>Highest match</Text>
        </View>

        <Text style={styles.sectionTitle}>Workout notes</Text>
        <TextInput
          style={styles.notesInput}
          value={notes}
          onChangeText={setNotes}
          placeholder="Anything important about today?"
          placeholderTextColor={palette.textMuted}
          multiline
          textAlignVertical="top"
        />

        <TouchableOpacity style={styles.completeButton} onPress={handleComplete}>
          <Text style={styles.completeText}>Finish session</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function AdPlacement({ label }: { label: string }) {
  return <View style={styles.adPlacement} accessibilityLabel={label}><Text style={styles.adText}>Advertisement</Text></View>;
}

const styles = StyleSheet.create({
  kicker: { color: palette.accent, fontSize: 11, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' },
  startScreen: { flex: 1, backgroundColor: palette.background, padding: spacing.xl, justifyContent: 'center', alignItems: 'center', gap: spacing.lg },
  startCopy: { color: palette.textMuted, fontSize: 15, lineHeight: 22, textAlign: 'center', maxWidth: 340 },
  startWorkoutButton: { backgroundColor: palette.accent, borderRadius: radii.lg, paddingHorizontal: spacing.xl, paddingVertical: spacing.lg, minWidth: 220, alignItems: 'center' },
  countdownScreen: { flex: 1, backgroundColor: palette.background, justifyContent: 'center', alignItems: 'center' },
  countdownText: { color: palette.text, fontSize: 112, fontWeight: '900' },
  restScreen: { flex: 1, backgroundColor: palette.background, justifyContent: 'center', alignItems: 'center', padding: spacing.xl, gap: spacing.lg },
  finishPrompt: { flex: 1, backgroundColor: palette.background, justifyContent: 'center', alignItems: 'center', padding: spacing.xl, gap: spacing.lg },
  restTime: { color: palette.accent, fontSize: 88, fontWeight: '900', letterSpacing: -4 },
  restCopy: { color: palette.textMuted, fontSize: 15, textAlign: 'center' },
  skipText: { color: palette.accentSoft, fontSize: 15, fontWeight: '800' },
  timerBar: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: palette.panel, borderRadius: radii.md, padding: spacing.md, marginBottom: spacing.md },
  timerLabel: { color: palette.accentSoft, fontWeight: '800' },
  tapTracker: { backgroundColor: palette.accent, borderRadius: radii.lg, padding: spacing.lg, marginVertical: spacing.lg },
  tapTrackerTitle: { color: '#07131D', fontSize: 20, fontWeight: '900', textAlign: 'center' },
  tapTrackerHint: { color: '#07131D', fontSize: 13, textAlign: 'center', marginTop: spacing.xs },
  adPlacement: { width: '100%', minHeight: 52, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.panel, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  adText: { color: palette.textMuted, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' },
  screen: {
    flex: 1,
    backgroundColor: palette.background,
    paddingHorizontal: spacing.lg,
    paddingTop: 52,
  },
  headerRow: {
    marginBottom: spacing.md,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: palette.panel,
    borderWidth: 1,
    borderColor: palette.border,
  },
  backText: {
    color: palette.text,
    fontWeight: '600',
  },
  header: {
    marginBottom: spacing.lg,
  },
  phase: {
    color: palette.accent,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  title: {
    color: palette.text,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  content: {
    paddingBottom: spacing.xxl,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
  },
  exerciseCard: {
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  exerciseTitle: {
    color: palette.text,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: spacing.md,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
    paddingBottom: spacing.xs,
    marginBottom: spacing.xs,
  },
  setHeader: {
    color: palette.textMuted,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
    flex: 1,
  },
  cellHeader: {
    color: palette.textMuted,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
    width: 84,
    textAlign: 'center',
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  setLabel: {
    color: palette.textMuted,
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  programBrief: {
    backgroundColor: palette.panel,
    borderWidth: 1,
    borderColor: palette.accent,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  briefLabel: {
    color: palette.accent,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  briefTitle: {
    color: palette.text,
    fontSize: 19,
    fontWeight: '800',
  },
  briefText: {
    color: palette.textMuted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: spacing.xs,
  },
  briefFocus: {
    color: palette.accentSoft,
    fontSize: 12,
    fontWeight: '700',
    marginTop: spacing.sm,
  },
  label: {
    color: palette.text,
    fontSize: 16,
    fontWeight: '600',
  },
  input: {
    width: 72,
    height: 44,
    borderRadius: 12,
    backgroundColor: palette.panel,
    color: palette.text,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    borderWidth: 1,
    borderColor: palette.border,
  },
  fieldGroup: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  sectionTitle: {
    color: palette.text,
    fontSize: 18,
    fontWeight: '800',
    marginTop: spacing.lg,
    marginBottom: 4,
  },
  sectionHint: {
    color: palette.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  measurementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  measurementLabel: {
    color: palette.text,
    fontSize: 15,
    fontWeight: '600',
  },
  measurementUnit: {
    color: palette.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  rpeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  rpeOption: {
    flex: 1,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.border,
  },
  rpeOptionSelected: {
    backgroundColor: palette.accent,
    borderColor: palette.accent,
  },
  rpeValue: {
    color: palette.textMuted,
    fontSize: 18,
    fontWeight: '800',
  },
  rpeValueSelected: {
    color: '#07131D',
  },
  rpeScaleLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  scaleLabel: {
    color: palette.textMuted,
    fontSize: 11,
  },
  notesInput: {
    minHeight: 112,
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radii.md,
    padding: spacing.md,
    color: palette.text,
    fontSize: 15,
    lineHeight: 21,
    marginBottom: spacing.xl,
  },
  summaryBox: {
    backgroundColor: palette.panel,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.border,
    padding: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  summaryLabel: {
    color: palette.textMuted,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  summaryValue: {
    color: palette.text,
    fontSize: 32,
    fontWeight: '800',
  },
  completeButton: {
    backgroundColor: palette.accent,
    borderRadius: radii.md,
    paddingVertical: 16,
    alignItems: 'center',
  },
  completeText: {
    color: '#07131D',
    fontSize: 16,
    fontWeight: '800',
  },
});
