import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { generateProgramSchedule } from '../domain/programSchedule';
import type { Exercise, ProgramScheduleRow, ProgramSetup, ProgressionMethod } from '../domain/types';
import { searchExercises } from '../services/catalogRepository';
import { palette, radii, spacing } from '../theme/theme';

type Props = {
  onContinue: (setup: ProgramSetup, exercises: Exercise[], rows: ProgramScheduleRow[]) => void;
  onBack: () => void;
};

const progressionMethods: ProgressionMethod[] = ['%1RM', 'RPE', 'RIR', 'STD'];

export function ProgramAuthoringSetupScreen({ onContinue, onBack }: Props) {
  const [search, setSearch] = useState('');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<string[]>([]);
  const [method, setMethod] = useState<ProgressionMethod>('%1RM');
  const [progressionValue, setProgressionValue] = useState('70');
  const [weeks, setWeeks] = useState('4');
  const [days, setDays] = useState('3');
  const [sets, setSets] = useState('3');
  const [reps, setReps] = useState('8');
  const [catalogError, setCatalogError] = useState('');
  const [formError, setFormError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      setIsLoading(true);
      const result = await searchExercises(search);
      if (!active) return;
      if (result.ok) {
        setExercises(result.value);
        setCatalogError('');
      } else {
        setCatalogError(result.error.message);
      }
      setIsLoading(false);
    }, 180);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [search]);

  const selectedExercises = useMemo(
    () => exercises.filter((exercise) => selectedExerciseIds.includes(exercise.id)),
    [exercises, selectedExerciseIds],
  );

  const toggleExercise = (id: string) => {
    setSelectedExerciseIds((current) => current.includes(id)
      ? current.filter((selectedId) => selectedId !== id)
      : [...current, id]);
  };

  const buildSchedule = () => {
    const setup: ProgramSetup = {
      exerciseIds: selectedExerciseIds,
      progressionMethod: method,
      progressionValue: method === 'STD' ? (Number(progressionValue) || null) : Number(progressionValue),
      durationWeeks: Number(weeks),
      trainingDaysPerWeek: Number(days),
      sets: Number(sets),
      reps: Number(reps),
    };
    const result = generateProgramSchedule(setup, exercises);
    if (!result.ok) {
      setFormError(result.issues.map((issue) => issue.message).join('\n'));
      return;
    }
    setFormError('');
    onContinue(setup, selectedExercises, result.rows);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Pressable onPress={onBack} accessibilityRole="button"><Text style={styles.back}>‹ Back</Text></Pressable>
      <Text style={styles.kicker}>Program writer</Text>
      <Text style={styles.title}>Build a program</Text>
      <Text style={styles.subtitle}>Choose exercises and defaults. You can fine-tune each generated row next.</Text>

      <Text style={styles.label}>Search exercise catalog</Text>
      <TextInput value={search} onChangeText={setSearch} placeholder="Search movements" placeholderTextColor={palette.textMuted} style={styles.input} />
      {catalogError ? <Text accessibilityRole="alert" style={styles.error}>{catalogError}</Text> : null}
      <Text style={styles.hint}>{isLoading ? 'Loading catalog…' : `${selectedExerciseIds.length} selected`}</Text>
      <View style={styles.exerciseList}>
        {exercises.map((exercise) => {
          const selected = selectedExerciseIds.includes(exercise.id);
          return (
            <Pressable
              key={exercise.id}
              onPress={() => toggleExercise(exercise.id)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selected }}
              style={[styles.exercise, selected && styles.exerciseSelected]}
            >
              <View style={styles.exerciseText}>
                <Text style={styles.exerciseName}>{exercise.displayName}</Text>
                <Text style={styles.hint}>{[exercise.equipment.join(', '), exercise.category].filter(Boolean).join(' · ')}</Text>
              </View>
              <Text style={styles.check}>{selected ? '✓' : '+'}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.label}>Progression style</Text>
      <View style={styles.options}>
        {progressionMethods.map((value) => (
          <Pressable key={value} onPress={() => setMethod(value)} style={[styles.option, method === value && styles.optionActive]}>
            <Text style={styles.optionText}>{value}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.label}>Progression value</Text>
      <TextInput keyboardType="decimal-pad" value={progressionValue} onChangeText={setProgressionValue} style={styles.input} />

      <View style={styles.numberGrid}>
        <NumberField label="Weeks" value={weeks} onChange={setWeeks} />
        <NumberField label="Training days / week" value={days} onChange={setDays} />
        <NumberField label="Sets" value={sets} onChange={setSets} />
        <NumberField label="Reps per set" value={reps} onChange={setReps} />
      </View>
      {formError ? <Text accessibilityRole="alert" style={styles.error}>{formError}</Text> : null}
      <Pressable onPress={buildSchedule} style={styles.primaryButton}>
        <Text style={styles.primaryButtonText}>Generate program schedule</Text>
      </Pressable>
    </ScrollView>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <View style={styles.numberField}>
      <Text style={styles.label}>{label}</Text>
      <TextInput keyboardType="number-pad" value={value} onChangeText={onChange} style={styles.input} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.background },
  content: { padding: spacing.lg, paddingTop: 36, paddingBottom: 56, maxWidth: 900, width: '100%', alignSelf: 'center' },
  back: { color: palette.accent, fontSize: 16, fontWeight: '700', marginBottom: spacing.lg },
  kicker: { color: palette.accent, fontSize: 11, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' },
  title: { color: palette.text, fontSize: 30, fontWeight: '800', marginTop: 6 },
  subtitle: { color: palette.textMuted, fontSize: 14, lineHeight: 21, marginTop: 8, marginBottom: spacing.xl },
  label: { color: palette.text, fontSize: 13, fontWeight: '700', marginTop: spacing.md, marginBottom: 7 },
  input: { color: palette.text, backgroundColor: palette.panel, borderColor: palette.border, borderWidth: 1, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: 12 },
  hint: { color: palette.textMuted, fontSize: 12, marginTop: 6 },
  error: { color: '#FCA5A5', fontSize: 13, lineHeight: 19, marginTop: spacing.sm },
  exerciseList: { gap: 8, marginTop: spacing.sm },
  exercise: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md, backgroundColor: palette.panel, borderWidth: 1, borderColor: palette.border, borderRadius: radii.md },
  exerciseSelected: { borderColor: palette.accent },
  exerciseText: { flex: 1 },
  exerciseName: { color: palette.text, fontSize: 14, fontWeight: '700' },
  check: { color: palette.accent, fontSize: 22, paddingLeft: spacing.md },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: { paddingHorizontal: spacing.md, paddingVertical: 10, borderColor: palette.border, borderWidth: 1, borderRadius: 999, backgroundColor: palette.panel },
  optionActive: { borderColor: palette.accent, backgroundColor: palette.panelAlt },
  optionText: { color: palette.text, fontWeight: '700' },
  numberGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  numberField: { minWidth: 130, flexGrow: 1 },
  primaryButton: { backgroundColor: palette.accent, borderRadius: radii.md, padding: spacing.md, alignItems: 'center', marginTop: spacing.xl },
  primaryButtonText: { color: palette.background, fontWeight: '800' },
});
