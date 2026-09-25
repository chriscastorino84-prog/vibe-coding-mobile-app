import { useMemo } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, G, Line, Polyline } from 'react-native-svg';

import { palette, radii, spacing } from '../theme/theme';
import type { MetricPoint } from '../analytics';

type MetricLineGraphProps = {
  points: MetricPoint[];
};

type MetricSeries = {
  metricId: string;
  label: string;
  unit: string;
  points: MetricPoint[];
  color: string;
};

const lineColors = [palette.accent, palette.gold, '#F97316', '#60A5FA', '#F472B6', '#A78BFA'];
const chartHeight = 220;
const chartPadding = { top: 16, right: 16, bottom: 30, left: 16 };

function dateKey(point: MetricPoint) {
  return point.completedAt.slice(0, 10);
}

function formatDate(date: string) {
  const parsed = new Date(`${date}T00:00:00`);
  return parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function MetricLineGraph({ points }: MetricLineGraphProps) {
  const { width } = useWindowDimensions();
  const chartWidth = Math.max(width - spacing.lg * 2 - spacing.lg * 2, 280);
  const innerWidth = chartWidth - chartPadding.left - chartPadding.right;
  const innerHeight = chartHeight - chartPadding.top - chartPadding.bottom;

  const { dates, series } = useMemo(() => {
    const sortedPoints = [...points].sort((left, right) => left.completedAt.localeCompare(right.completedAt));
    const dates = Array.from(new Set(sortedPoints.map(dateKey))).sort();
    const grouped = new Map<string, MetricSeries>();

    sortedPoints.forEach((point) => {
      const current = grouped.get(point.metricId);
      if (current) {
        current.points.push(point);
        return;
      }

      grouped.set(point.metricId, {
        metricId: point.metricId,
        label: point.label,
        unit: point.unit,
        points: [point],
        color: lineColors[grouped.size % lineColors.length],
      });
    });

    return { dates, series: Array.from(grouped.values()) };
  }, [points]);

  if (series.length === 0) {
    return (
      <View style={styles.emptyCard}>
        <Text style={styles.emptyTitle}>Your progress map is waiting</Text>
        <Text style={styles.emptyText}>Complete a session to plot performance and body measurements over time.</Text>
      </View>
    );
  }

  const xForDate = (date: string) => {
    const dateIndex = dates.indexOf(date);
    return chartPadding.left + (dates.length === 1 ? innerWidth / 2 : (dateIndex / (dates.length - 1)) * innerWidth);
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>Progress map</Text>
          <Text style={styles.title}>Performance + body</Text>
        </View>
        <Text style={styles.axisNote}>Each line uses its own scale</Text>
      </View>

      <Svg width={chartWidth} height={chartHeight}>
        {[0, 0.5, 1].map((step) => {
          const y = chartPadding.top + step * innerHeight;
          return <Line key={step} x1={chartPadding.left} y1={y} x2={chartWidth - chartPadding.right} y2={y} stroke={palette.border} strokeWidth="1" />;
        })}
        {series.map((metric) => {
          const values = metric.points.map((point) => point.value);
          const minimum = Math.min(...values);
          const maximum = Math.max(...values);
          const range = maximum - minimum || 1;
          const coordinates = metric.points
            .map((point) => {
              const x = xForDate(dateKey(point));
              const y = chartPadding.top + innerHeight - ((point.value - minimum) / range) * innerHeight;
              return { x, y, point };
            })
            .sort((left, right) => left.x - right.x);

          return (
            <G key={metric.metricId}>
              <Polyline
                points={coordinates.map(({ x, y }) => `${x},${y}`).join(' ')}
                fill="none"
                stroke={metric.color}
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {coordinates.map(({ x, y, point }) => (
                <Circle key={point.pointId} cx={x} cy={y} r="4" fill={metric.color} />
              ))}
            </G>
          );
        })}
      </Svg>

      <View style={styles.dateAxis}>
        {dates.map((date) => (
          <Text key={date} style={styles.dateLabel}>{formatDate(date)}</Text>
        ))}
      </View>

      <View style={styles.legend}>
        {series.map((metric) => {
          const latest = metric.points[metric.points.length - 1];
          return (
            <View key={metric.metricId} style={styles.legendItem}>
              <View style={[styles.swatch, { backgroundColor: metric.color }]} />
              <Text style={styles.legendLabel}>{metric.label}</Text>
              <Text style={styles.legendValue}>{latest.value.toLocaleString()} {metric.unit}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.card,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: palette.border,
    padding: spacing.lg,
  },
  emptyCard: {
    backgroundColor: palette.card,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: palette.border,
    padding: spacing.xl,
  },
  emptyTitle: {
    color: palette.text,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: spacing.xs,
  },
  emptyText: {
    color: palette.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: spacing.md,
  },
  eyebrow: {
    color: palette.accent,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  title: {
    color: palette.text,
    fontSize: 21,
    fontWeight: '800',
  },
  axisNote: {
    color: palette.textMuted,
    fontSize: 10,
    maxWidth: 100,
    textAlign: 'right',
  },
  dateAxis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  dateLabel: {
    color: palette.textMuted,
    fontSize: 10,
  },
  legend: {
    marginTop: spacing.lg,
    gap: spacing.xs,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  swatch: {
    width: 9,
    height: 9,
    borderRadius: 5,
    marginRight: spacing.xs,
  },
  legendLabel: {
    color: palette.text,
    fontSize: 12,
    flex: 1,
  },
  legendValue: {
    color: palette.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
});
