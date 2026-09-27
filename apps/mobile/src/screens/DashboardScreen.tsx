import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { MetricChart } from '../components/MetricChart';
import { palette, radii, spacing } from '../theme/theme';
import type { DashboardSummary } from '../analytics';
import type { Program } from '../types';

type DashboardScreenProps = {
  program: Program;
  summary: DashboardSummary;
  onBackToLocker: () => void;
};

export function DashboardScreen({ program, summary, onBackToLocker }: DashboardScreenProps) {
  const performanceSeries = Array.from(
    new Map(summary.performancePoints.map((point) => [point.metricId, point.label])).entries(),
  ).map(([metricId, label]) => ({
    metricId,
    label,
    points: summary.performancePoints.filter((point) => point.metricId === metricId),
  }));
  const anthropometricSeries = Array.from(
    new Map(summary.anthropometricPoints.map((point) => [point.metricId, point.label])).entries(),
  ).map(([metricId, label]) => ({
    metricId,
    label,
    points: summary.anthropometricPoints.filter((point) => point.metricId === metricId),
  }));

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.kicker}>Dashboard</Text>
        <Text style={styles.title}>Performance</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Training sessions</Text>
        <Text style={styles.value}>{summary.completedSessionCount}</Text>
        <Text style={styles.delta}>{summary.completedSessionCount === 1 ? 'session recorded' : 'sessions recorded'}</Text>
      </View>

      <View style={styles.cardSecondary}>
        <Text style={styles.label}>Current trophy</Text>
        <Text style={styles.badge}>
          {summary.sessionPoints.some((point) => point.programId === program.id)
            ? 'First workout complete'
            : 'Locked until first workout'}
        </Text>
      </View>

      <Text style={styles.sectionTitle}>Exercise performance</Text>
      {performanceSeries.length === 0 ? (
        <View style={styles.history}>
          <Text style={styles.empty}>Exercise points will appear after your first session.</Text>
        </View>
      ) : (
        performanceSeries.map((series) => (
          <MetricChart key={series.metricId} title={series.label} points={series.points} />
        ))
      )}

      <Text style={styles.sectionTitle}>Body measurements</Text>
      {anthropometricSeries.length === 0 ? (
        <View style={styles.history}>
          <Text style={styles.empty}>Add a measurement during a session to start tracking it.</Text>
        </View>
      ) : (
        anthropometricSeries.map((series) => (
          <MetricChart key={series.metricId} title={series.label} points={series.points} />
        ))
      )}

      <TouchableOpacity style={styles.primaryButton} onPress={onBackToLocker}>
        <Text style={styles.primaryButtonText}>Back to locker</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: palette.background,
    paddingHorizontal: spacing.lg,
    paddingTop: 52,
  },
  content: {
    paddingBottom: spacing.xxl,
  },
  header: {
    marginBottom: spacing.xl,
  },
  kicker: {
    color: palette.accent,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    fontWeight: '700',
    marginBottom: 6,
  },
  title: {
    color: palette.text,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  card: {
    borderRadius: radii.xl,
    padding: spacing.xl,
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.border,
    marginBottom: spacing.md,
  },
  cardSecondary: {
    borderRadius: radii.xl,
    padding: spacing.xl,
    backgroundColor: palette.panel,
    borderWidth: 1,
    borderColor: palette.border,
    marginBottom: spacing.xl,
  },
  label: {
    color: palette.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    fontSize: 11,
    marginBottom: 10,
  },
  value: {
    color: palette.text,
    fontSize: 36,
    fontWeight: '800',
    marginBottom: 8,
  },
  delta: {
    color: palette.accentSoft,
    fontSize: 15,
    fontWeight: '600',
  },
  badge: {
    color: palette.text,
    fontSize: 20,
    fontWeight: '700',
  },
  sectionTitle: {
    color: palette.text,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  history: {
    borderRadius: radii.xl,
    padding: spacing.xl,
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.border,
    marginBottom: spacing.xl,
  },
  empty: {
    color: palette.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  historyIndex: {
    color: palette.textMuted,
    fontSize: 14,
  },
  historyValue: {
    color: palette.text,
    fontWeight: '800',
    fontSize: 15,
  },
  primaryButton: {
    backgroundColor: palette.accent,
    borderRadius: radii.md,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#07131D',
    fontSize: 16,
    fontWeight: '800',
  },
});
