import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { WorkoutCard } from '../components/WorkoutCard';
import { palette, radii, spacing } from '../theme/theme';
import type { Program, WorkoutDay } from '../types';

type ProgramDetailScreenProps = {
  program: Program;
  workoutDay?: WorkoutDay;
  onStart: (workoutDay?: WorkoutDay) => void;
  onBack: () => void;
};

export function ProgramDetailScreen({ program, workoutDay, onStart, onBack }: ProgramDetailScreenProps) {
  const workoutWeekNumber = program.workoutWeeks?.find((week) =>
    week.workoutDays.some((day) => day.id === workoutDay?.id),
  )?.weekNumber;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>

        <View style={styles.hero}>
          <Text style={styles.phase}>{program.phase}</Text>
          <Text style={styles.title}>{program.name}</Text>
          <Text style={styles.description}>{program.description}</Text>
          <View style={styles.metaRow}>
            <View style={styles.metaPill}><Text style={styles.metaLabel}>Focus</Text><Text style={styles.metaValue}>{program.tone}</Text></View>
            <View style={styles.metaPill}><Text style={styles.metaLabel}>Format</Text><Text style={styles.metaValue}>{program.sections?.length ?? 0} blocks</Text></View>
          </View>
        </View>

        <View style={styles.navigationRow}>
          <Text style={styles.navigationText}>Previous</Text>
          <Text style={styles.navigationCount}>Program brief</Text>
          <Text style={styles.navigationText}>Next</Text>
        </View>

        {program.sections?.map((section, sectionIndex) => (
          <View key={section.id} style={[styles.section, section.id === 'cardio-primer' && styles.cardioSection]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionNumber, section.id === 'cardio-primer' && styles.cardioNumber]}><Text style={styles.sectionNumberText}>{String(sectionIndex + 1).padStart(2, '0')}</Text></View>
              <View style={styles.sectionHeadingCopy}>
                {section.id === 'cardio-primer' && <Text style={styles.startHere}>Start here</Text>}
                <Text style={styles.sectionTitle}>{section.title}</Text>
                {section.rounds && <Text style={styles.rounds}>{section.rounds}</Text>}
              </View>
            </View>
            {section.summary && <Text style={styles.sectionSummary}>{section.summary}</Text>}
            {section.exercises.map((exercise) => (
              <View key={exercise.id} style={styles.exercise}>
                <View style={styles.exerciseHeader}>
                  <Text style={styles.exerciseName}>{exercise.name}</Text>
                  <Text style={styles.prescription}>{exercise.prescription}</Text>
                </View>
                {exercise.workoutType && (
                  <View style={styles.modeRow}>
                    <Text style={styles.modeBadge}>
                      {exercise.workoutType === 'timed_sets' ? 'ISOMETRIC · LOG SECONDS' : exercise.workoutType === 'amrap' ? 'REPS FOR TIME · LOG REPS' : 'STANDARD · LOG REPS'}
                    </Text>
                    {exercise.workoutType === 'timed_sets' && exercise.workDurationSeconds ? (
                      <Text style={styles.modeHint}>Target {exercise.workDurationSeconds} seconds per set</Text>
                    ) : null}
                    {exercise.workoutType === 'amrap' && exercise.workDurationSeconds ? (
                      <Text style={styles.modeHint}>Complete as many reps as possible in {Math.floor(exercise.workDurationSeconds / 60)}:{String(exercise.workDurationSeconds % 60).padStart(2, '0')}</Text>
                    ) : null}
                  </View>
                )}
                {exercise.focus && (
                  <View style={styles.focusRow}>
                    <Text style={styles.focusLabel}>Focus</Text>
                    <Text style={styles.focusText}>{exercise.focus}</Text>
                  </View>
                )}
                {exercise.description && <Text style={styles.exerciseDescription}>{exercise.description}</Text>}
              </View>
            ))}
          </View>
        ))}

        {!program.sections?.length && !program.workoutWeeks?.length && (
          <View style={styles.emptyContent}>
            <Text style={styles.emptyTitle}>Program content loading</Text>
            <Text style={styles.emptyText}>This program is ready to start while its detailed blocks are being prepared.</Text>
          </View>
        )}

        {workoutDay && (
          <View style={styles.workoutPlan}>
            <Text style={styles.workoutPlanKicker}>Week {workoutWeekNumber}</Text>
            <Text style={styles.workoutPlanTitle}>Conditioning Ramp-Up</Text>
            <Text style={styles.workoutPlanHint}>Next workout · Day {workoutDay.dayNumber}. Complete this session to move to the next day.</Text>
            <WorkoutCard workout={workoutDay} onPress={() => onStart(workoutDay)} />
          </View>
        )}

        {program.workoutWeeks && !workoutDay && (
          <View style={styles.emptyContent}>
            <Text style={styles.emptyTitle}>Program complete</Text>
            <Text style={styles.emptyText}>All scheduled workouts have been completed and saved.</Text>
          </View>
        )}
      </ScrollView>
      <View style={styles.footer}>
        {(!program.workoutWeeks?.length || workoutDay) && (
          <TouchableOpacity style={styles.startButton} onPress={() => onStart(workoutDay)}>
            <Text style={styles.startText}>{workoutDay ? `Start Day ${workoutDay.dayNumber}` : 'Start program'}</Text>
            <Text style={styles.startArrow}>→</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.background },
  content: { paddingHorizontal: spacing.lg, paddingTop: 48, paddingBottom: 112 },
  backButton: { alignSelf: 'flex-start', paddingVertical: spacing.xs, marginBottom: spacing.xl },
  backText: { color: palette.text, fontSize: 15, fontWeight: '700' },
  hero: { borderBottomWidth: 1, borderBottomColor: palette.border, paddingBottom: spacing.xl },
  phase: { color: palette.accent, fontSize: 12, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: spacing.sm },
  title: { color: palette.text, fontSize: 34, fontWeight: '800', letterSpacing: -1, marginBottom: spacing.md },
  description: { color: palette.textMuted, fontSize: 15, lineHeight: 22, maxWidth: 520 },
  metaRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  metaPill: { backgroundColor: palette.panel, borderWidth: 1, borderColor: palette.border, borderRadius: radii.md, padding: spacing.sm, flex: 1 },
  metaLabel: { color: palette.textMuted, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 },
  metaValue: { color: palette.text, fontSize: 13, fontWeight: '700', marginTop: 4 },
  navigationRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.lg },
  navigationText: { color: palette.accent, fontSize: 13, fontWeight: '800' },
  navigationCount: { color: palette.textMuted, fontSize: 12 },
  section: { marginBottom: spacing.xl },
  cardioSection: { backgroundColor: palette.panel, borderWidth: 1, borderColor: palette.border, borderRadius: radii.lg, padding: spacing.lg },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  sectionNumber: { width: 34, height: 34, borderRadius: 17, backgroundColor: palette.accent, alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm },
  cardioNumber: { backgroundColor: palette.gold },
  sectionNumberText: { color: '#07131D', fontSize: 11, fontWeight: '900' },
  sectionHeadingCopy: { flex: 1 },
  startHere: { color: palette.gold, fontSize: 10, fontWeight: '900', letterSpacing: 1.1, textTransform: 'uppercase', marginBottom: 3 },
  sectionTitle: { color: palette.text, fontSize: 21, fontWeight: '800' },
  rounds: { color: palette.gold, fontSize: 12, fontWeight: '700', marginTop: 3 },
  sectionSummary: { color: palette.textMuted, fontSize: 14, lineHeight: 20, marginBottom: spacing.sm },
  exercise: { borderTopWidth: 1, borderTopColor: palette.border, paddingVertical: spacing.md },
  exerciseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm },
  exerciseName: { color: palette.text, fontSize: 16, fontWeight: '800', flex: 1 },
  prescription: { color: palette.accentSoft, fontSize: 12, fontWeight: '800', textAlign: 'right', maxWidth: 150 },
  modeRow: { marginTop: spacing.sm, padding: spacing.sm, backgroundColor: palette.panel, borderRadius: radii.sm },
  modeBadge: { color: palette.accent, fontSize: 10, fontWeight: '900', letterSpacing: 0.7 },
  modeHint: { color: palette.textMuted, fontSize: 12, marginTop: 3 },
  focusRow: { flexDirection: 'row', marginTop: spacing.sm, gap: spacing.sm },
  focusLabel: { color: palette.accent, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  focusText: { color: palette.text, fontSize: 13, lineHeight: 19, flex: 1 },
  exerciseDescription: { color: palette.textMuted, fontSize: 13, lineHeight: 19, marginTop: spacing.sm },
  emptyContent: { backgroundColor: palette.panel, borderRadius: radii.lg, borderWidth: 1, borderColor: palette.border, padding: spacing.lg },
  emptyTitle: { color: palette.text, fontSize: 17, fontWeight: '800', marginBottom: spacing.xs },
  emptyText: { color: palette.textMuted, fontSize: 14, lineHeight: 20 },
  workoutPlan: { marginTop: spacing.lg },
  workoutPlanKicker: { color: palette.accent, fontSize: 11, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 5 },
  workoutPlanTitle: { color: palette.text, fontSize: 24, fontWeight: '800' },
  workoutPlanHint: { color: palette.textMuted, fontSize: 14, lineHeight: 20, marginTop: spacing.xs, marginBottom: spacing.md },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: spacing.lg, backgroundColor: 'rgba(7, 11, 20, 0.96)', borderTopWidth: 1, borderTopColor: palette.border },
  startButton: { backgroundColor: palette.accent, borderRadius: radii.md, paddingVertical: 16, paddingHorizontal: spacing.lg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  startText: { color: '#07131D', fontSize: 16, fontWeight: '800' },
  startArrow: { color: '#07131D', fontSize: 22, fontWeight: '800' },
});
