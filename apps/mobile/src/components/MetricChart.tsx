import { StyleSheet, Text, View } from 'react-native';

import { palette, radii, spacing } from '../theme/theme';
import type { MetricPoint } from '../analytics';

type MetricChartProps = {
  title: string;
  points: MetricPoint[];
};

export function MetricChart({ title, points }: MetricChartProps) {
  const maximum = Math.max(...points.map((point) => point.value), 1);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.unit}>{points[0]?.unit}</Text>
      </View>
      <View style={styles.chart}>
        {points.map((point, index) => (
          <View key={point.pointId} style={styles.pointColumn}>
            <View style={styles.barTrack}>
              <View style={[styles.bar, { height: `${Math.max((point.value / maximum) * 100, point.value === 0 ? 3 : 8)}%` }]} />
            </View>
            <Text style={styles.value}>{point.value.toLocaleString()}</Text>
            <Text style={styles.caption}>#{index + 1}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: palette.card,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: palette.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  title: {
    color: palette.text,
    fontSize: 16,
    fontWeight: '800',
  },
  unit: {
    color: palette.textMuted,
    fontSize: 12,
  },
  chart: {
    height: 124,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  pointColumn: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  barTrack: {
    width: '100%',
    height: 78,
    justifyContent: 'flex-end',
    backgroundColor: palette.panel,
    borderRadius: radii.sm,
    overflow: 'hidden',
  },
  bar: {
    width: '100%',
    backgroundColor: palette.accent,
    borderRadius: radii.sm,
  },
  value: {
    color: palette.text,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 6,
  },
  caption: {
    color: palette.textMuted,
    fontSize: 10,
    marginTop: 2,
  },
});
