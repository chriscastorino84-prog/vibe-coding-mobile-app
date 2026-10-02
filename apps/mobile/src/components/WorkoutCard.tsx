import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { palette, radii, spacing } from '../theme/theme';
import type { WorkoutDay } from '../types';

type WorkoutCardProps = {
  workout: WorkoutDay;
  onPress: () => void;
};

export function WorkoutCard({ workout, onPress }: WorkoutCardProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.88}>
      <View style={styles.header}>
        <View style={styles.dayBadge}><Text style={styles.dayBadgeText}>DAY {workout.dayNumber}</Text></View>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>{workout.title}</Text>
          <Text style={styles.focus}>{workout.focus}</Text>
        </View>
        <Text style={styles.open}>Open</Text>
      </View>
      <View style={styles.tableHeader}>
        <Text style={styles.exerciseHeader}>Exercise</Text>
        <Text style={styles.cellHeader}>Load</Text>
        <Text style={styles.cellHeader}>Result</Text>
      </View>
      {workout.exercises.map((exercise) => (
        <View key={exercise.id} style={styles.exerciseGroup}>
          <View style={styles.exerciseTitleRow}>
            <Text style={styles.exerciseName}>{exercise.name}</Text>
            <View style={styles.prescriptionGroup}>
              <Text style={styles.typeBadge}>{exercise.workoutType === 'timed_sets' ? 'ISOMETRIC' : exercise.workoutType === 'amrap' ? 'REPS FOR TIME' : 'STANDARD'}</Text>
              <Text style={styles.prescription}>{formatPrescription(exercise)}</Text>
            </View>
            {exercise.instructions ? <Text style={styles.instructions}>{exercise.instructions}</Text> : null}
          </View>
          {Array.from({ length: exercise.sets }, (_, setIndex) => (
            <View key={`${exercise.id}-${setIndex}`} style={styles.exerciseRow}>
              <Text style={styles.setNumber}>Set {setIndex + 1}</Text>
              <View style={styles.cell}><Text style={styles.cellPlaceholder}>—</Text></View>
              <View style={styles.cell}><Text style={styles.cellPlaceholder}>—</Text></View>
            </View>
          ))}
        </View>
      ))}
      <View style={styles.footer}>
        <Text style={styles.rpeLabel}>Target RPE</Text>
        <Text style={styles.rpeValue}>{workout.exercises.map((exercise) => exercise.rpePrescription).filter(Boolean).join(' · ') || 'Set by program'}</Text>
      </View>
    </TouchableOpacity>
  );
}

function formatPrescription(exercise: WorkoutDay['exercises'][number]) {
  if (exercise.workoutType === 'timed_sets') {
    return `${exercise.workDurationSeconds ?? exercise.reps} sec`;
  }
  if (exercise.workoutType === 'amrap') {
    return `${exercise.reps} reps · ${formatDuration(exercise.workDurationSeconds ?? 0)}`;
  }
  return exercise.rpePrescription ?? `${exercise.sets} ${exercise.setLabel ?? 'sets'} · ${exercise.reps} reps`;
}

function formatDuration(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  card: { backgroundColor: palette.card, borderRadius: radii.xl, borderWidth: 1, borderColor: palette.border, padding: spacing.lg, marginBottom: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg },
  dayBadge: { backgroundColor: palette.accent, borderRadius: radii.sm, paddingHorizontal: spacing.sm, paddingVertical: 7, marginRight: spacing.sm },
  dayBadgeText: { color: '#07131D', fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  headerCopy: { flex: 1 },
  title: { color: palette.text, fontSize: 18, fontWeight: '800' },
  focus: { color: palette.textMuted, fontSize: 12, marginTop: 3 },
  open: { color: palette.accent, fontSize: 12, fontWeight: '800' },
  tableHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: palette.border, paddingBottom: spacing.xs, marginBottom: spacing.xs },
  exerciseHeader: { color: palette.textMuted, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, flex: 1 },
  cellHeader: { color: palette.textMuted, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, width: 58, textAlign: 'center' },
  exerciseRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: palette.border },
  exerciseGroup: { borderBottomWidth: 1, borderBottomColor: palette.border, paddingVertical: spacing.xs },
  exerciseTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.xs },
  exerciseName: { color: palette.text, fontSize: 14, fontWeight: '700' },
  prescription: { color: palette.textMuted, fontSize: 11, marginTop: 3 },
  prescriptionGroup: { alignItems: 'flex-end', maxWidth: 175 },
  typeBadge: { color: palette.accent, fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  instructions: { color: palette.textMuted, fontSize: 12, lineHeight: 18, marginTop: spacing.xs, marginBottom: spacing.xs },
  setNumber: { color: palette.textMuted, fontSize: 11, flex: 1 },
  cell: { width: 58, height: 34, borderRadius: radii.sm, backgroundColor: palette.panel, alignItems: 'center', justifyContent: 'center', marginLeft: spacing.xs },
  cellPlaceholder: { color: palette.textMuted, fontSize: 16, fontWeight: '700' },
  footer: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md },
  rpeLabel: { color: palette.accentSoft, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  rpeValue: { color: palette.textMuted, fontSize: 12, marginLeft: spacing.sm, flex: 1 },
});
