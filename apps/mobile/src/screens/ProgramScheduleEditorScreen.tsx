import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import type { Exercise, ProgramScheduleRow, ProgramSetup } from '../domain/types';
import { publishProgramVersion, saveProgramDraft } from '../services/programAuthoringRepository';
import { palette, radii, spacing } from '../theme/theme';

type Props = {
  setup: ProgramSetup;
  exercises: Exercise[];
  rows: ProgramScheduleRow[];
  onRowsChange: (rows: ProgramScheduleRow[]) => void;
  onBack: () => void;
  onPublished: () => void;
};

export function ProgramScheduleEditorScreen({ setup, exercises, rows, onRowsChange, onBack, onPublished }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [productKey, setProductKey] = useState('');
  const [savedVersion, setSavedVersion] = useState<{ programId: string; versionId: string; versionNumber: number }>();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const updateRow = (id: string, patch: Partial<ProgramScheduleRow>) => {
    onRowsChange(rows.map((row) => row.id === id ? { ...row, ...patch } : row));
  };

  const save = async () => {
    setBusy(true);
    setError('');
    setMessage('');
    const result = await saveProgramDraft({ name, description, productKey, setup, rows });
    setBusy(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setSavedVersion(result.value);
    setMessage('Draft saved. Review the full schedule, then publish when ready.');
  };

  const publish = async () => {
    if (!savedVersion) {
      setError('Save the draft before publishing.');
      return;
    }
    setBusy(true);
    setError('');
    const result = await publishProgramVersion(savedVersion.versionId);
    setBusy(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setMessage('Program published. Existing user enrollments stay on their original version.');
    onPublished();
  };

  const weeks = [...new Set(rows.map((row) => row.weekNumber))];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Pressable onPress={onBack}><Text style={styles.back}>‹ Back to setup</Text></Pressable>
      <Text style={styles.kicker}>Program writer · schedule review</Text>
      <Text style={styles.title}>Fine-tune each row</Text>
      <Text style={styles.subtitle}>{setup.durationWeeks} weeks · {setup.trainingDaysPerWeek} training days/week · each week and day can be edited before publication.</Text>

      <Text style={styles.label}>Program name</Text>
      <TextInput value={name} onChangeText={setName} placeholder="Name this program" placeholderTextColor={palette.textMuted} style={styles.input} />
      <Text style={styles.label}>Description</Text>
      <TextInput value={description} onChangeText={setDescription} placeholder="What users can expect" placeholderTextColor={palette.textMuted} style={[styles.input, styles.description]} multiline />
      <Text style={styles.label}>Existing product key (optional)</Text>
      <TextInput value={productKey} onChangeText={setProductKey} placeholder="Product catalog identifier" placeholderTextColor={palette.textMuted} style={styles.input} />

      {weeks.map((week) => (
        <View key={week}>
          <Text style={styles.weekHeader}>Week {week}{week === 1 && setup.progressionMethod !== 'STD' ? ' · discovery' : ''}</Text>
          {rows.filter((row) => row.weekNumber === week)
            .reduce<Array<{ day: number; items: ProgramScheduleRow[] }>>((days, row) => {
              let day = days.find((item) => item.day === row.dayNumber);
              if (!day) {
                day = { day: row.dayNumber, items: [] };
                days.push(day);
              }
              day.items.push(row);
              return days;
            }, [])
            .map(({ day, items }) => (
              <View key={`${week}-${day}`} style={styles.dayPanel}>
                <Text style={styles.dayHeader}>Day {day}</Text>
                {items.map((row) => (
                  <View key={row.id} style={styles.row}>
                    <Text style={styles.exerciseName}>{exercises.find((exercise) => exercise.id === row.exerciseId)?.displayName ?? row.exerciseId}</Text>
                    <View style={styles.rowFields}>
                      <NumberInput label="Sets" value={row.sets} onChange={(value) => updateRow(row.id, { sets: value })} />
                      <NumberInput label="Reps" value={row.reps} onChange={(value) => updateRow(row.id, { reps: value })} />
                      <NumberInput label={row.progressionMethod} value={row.progressionValue ?? ''} onChange={(value) => updateRow(row.id, { progressionValue: value || null })} />
                    </View>
                    <Text style={styles.hint}>
                      {row.weekNumber === 1 && row.progressionMethod !== 'STD'
                        ? 'Discovery week · users enter their own load'
                        : `${row.progressionMethod} prescription`}
                    </Text>
                  </View>
                ))}
              </View>
            ))}
        </View>
      ))}

      {message ? <Text style={styles.success}>{message}</Text> : null}
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      <View style={styles.actions}>
        <Pressable disabled={busy || !name.trim()} onPress={() => void save()} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>{busy ? 'Saving…' : 'Save draft'}</Text>
        </Pressable>
        <Pressable disabled={busy || !savedVersion} onPress={() => void publish()} style={[styles.primaryButton, (!savedVersion || busy) && styles.disabled]}>
          <Text style={styles.primaryButtonText}>{busy ? 'Working…' : 'Publish program'}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function NumberInput({ label, value, onChange }: { label: string; value: number | string; onChange: (value: number) => void }) {
  return (
    <View style={styles.numberInput}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        keyboardType="number-pad"
        value={String(value)}
        onChangeText={(text) => onChange(Number(text))}
        style={styles.smallInput}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.background },
  content: { padding: spacing.lg, paddingTop: 36, paddingBottom: 56, maxWidth: 1100, width: '100%', alignSelf: 'center' },
  back: { color: palette.accent, fontSize: 16, fontWeight: '700', marginBottom: spacing.lg },
  kicker: { color: palette.accent, fontSize: 11, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' },
  title: { color: palette.text, fontSize: 30, fontWeight: '800', marginTop: 6 },
  subtitle: { color: palette.textMuted, fontSize: 14, lineHeight: 21, marginTop: 8, marginBottom: spacing.md },
  label: { color: palette.text, fontSize: 13, fontWeight: '700', marginTop: spacing.sm, marginBottom: 7 },
  input: { color: palette.text, backgroundColor: palette.panel, borderColor: palette.border, borderWidth: 1, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: 12 },
  description: { minHeight: 76, textAlignVertical: 'top' },
  weekHeader: { color: palette.accent, fontSize: 19, fontWeight: '800', marginTop: spacing.xl, marginBottom: spacing.sm },
  dayPanel: { backgroundColor: palette.panel, borderRadius: radii.lg, borderColor: palette.border, borderWidth: 1, padding: spacing.md, marginBottom: spacing.md },
  dayHeader: { color: palette.text, fontSize: 16, fontWeight: '800', marginBottom: spacing.sm },
  row: { paddingVertical: spacing.sm, borderTopColor: palette.border, borderTopWidth: 1 },
  exerciseName: { color: palette.text, fontSize: 14, fontWeight: '700' },
  rowFields: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs },
  numberInput: { width: 90 },
  fieldLabel: { color: palette.textMuted, fontSize: 11, fontWeight: '700', marginBottom: 4 },
  smallInput: { color: palette.text, backgroundColor: palette.backgroundAlt, borderColor: palette.border, borderWidth: 1, borderRadius: radii.sm, paddingHorizontal: spacing.sm, paddingVertical: 8 },
  hint: { color: palette.textMuted, fontSize: 11, marginTop: 5 },
  success: { color: palette.success, marginTop: spacing.md },
  error: { color: '#FCA5A5', marginTop: spacing.md, lineHeight: 20 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.lg },
  secondaryButton: { borderColor: palette.accent, borderWidth: 1, borderRadius: radii.md, padding: spacing.md },
  secondaryButtonText: { color: palette.accent, fontWeight: '800' },
  primaryButton: { backgroundColor: palette.accent, borderRadius: radii.md, padding: spacing.md },
  primaryButtonText: { color: palette.background, fontWeight: '800' },
  disabled: { opacity: 0.45 },
});
