import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { MetricLineGraph } from './MetricLineGraph';
import { palette, radii, spacing } from '../theme/theme';
import type { MetricPoint } from '../analytics';
import type { Program } from '../types';

type ProgramStatCardProps = {
  program: Program;
  points: MetricPoint[];
  sessionCount: number;
  onPress: () => void;
};

export function ProgramStatCard({ program, points, sessionCount, onPress }: ProgramStatCardProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.88}>
      <View style={[styles.accentBar, { backgroundColor: program.accent }]} />
      <View style={styles.content}>
        <Text style={styles.phase}>{program.phase}</Text>
        <Text style={styles.name}>{program.name}</Text>
        <View style={styles.photoRow}>
          <View style={styles.photoSlot}>
            <Text style={styles.photoLabel}>Start</Text>
            <Text style={styles.photoValue}>{program.startingPhotoUri ? 'Photo saved' : 'Add photo'}</Text>
          </View>
          <View style={styles.photoSlot}>
            <Text style={styles.photoLabel}>Finish</Text>
            <Text style={styles.photoValue}>{program.endingPhotoUri ? 'Photo saved' : 'Add photo'}</Text>
          </View>
        </View>
        <View style={styles.statsRow}>
          <View>
            <Text style={styles.statLabel}>Sessions</Text>
            <Text style={styles.statValue}>{sessionCount}</Text>
          </View>
        </View>
        <MetricLineGraph points={points} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.card,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: palette.border,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  accentBar: {
    height: 6,
  },
  content: {
    padding: spacing.lg,
  },
  phase: {
    color: palette.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  name: {
    color: palette.text,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: spacing.md,
  },
  photoRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  photoSlot: {
    flex: 1,
    minHeight: 68,
    justifyContent: 'flex-end',
    padding: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.panel,
  },
  photoLabel: {
    color: palette.textMuted,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  photoValue: {
    color: palette.text,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 5,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.xxl,
    marginBottom: spacing.md,
  },
  statLabel: {
    color: palette.textMuted,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statValue: {
    color: palette.text,
    fontSize: 18,
    fontWeight: '800',
    marginTop: 3,
  },
});
