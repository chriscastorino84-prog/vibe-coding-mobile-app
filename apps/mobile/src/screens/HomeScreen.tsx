import { ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';

import { MetricLineGraph } from '../components/MetricLineGraph';
import { ProgramCard } from '../components/ProgramCard';
import { TrophyGarage } from '../components/TrophyGarage';
import { palette, radii, spacing } from '../theme/theme';
import type { DashboardSummary } from '../analytics';
import type { Program, Trophy } from '../types';

type HomeScreenProps = {
  programs: Program[];
  summary: DashboardSummary;
  trophies: Trophy[];
  onSelectProgram: (program: Program) => void;
  onViewAllPrograms: () => void;
  onSelectTrophy: (trophy: Trophy) => void;
  onViewAllTrophies: () => void;
};

export function HomeScreen({ programs, summary, trophies, onSelectProgram, onViewAllPrograms, onSelectTrophy, onViewAllTrophies }: HomeScreenProps) {
  const { width } = useWindowDimensions();
  const tileWidth = ((width - spacing.lg * 2 - spacing.lg) / 2) * 0.3;
  const featuredTypes: Program['type'][] = ['warm-up', 'cool-down', 'resistance', 'cardio'];
  const featuredPrograms = featuredTypes
    .map((type) => programs.find((program) => program.status === 'current' && program.type === type))
    .filter((program): program is Program => Boolean(program));
  const recentTrophies = [...trophies]
    .sort((left, right) => right.unlockedAt.localeCompare(left.unlockedAt))
    .slice(0, 3);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.kicker}>Home base</Text>
        <Text style={styles.title}>Your training arc</Text>
        <Text style={styles.subtitle}>Performance above. Programs below.</Text>
      </View>

      <View style={styles.analyticsSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Progress dashboard</Text>
          <Text style={styles.sectionMeta}>{summary.completedSessionCount} session{summary.completedSessionCount === 1 ? '' : 's'}</Text>
        </View>
        <MetricLineGraph points={summary.metricPoints} />
      </View>

      <View style={styles.divider} />

      <View style={styles.garageSection}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.kicker}>Program garage</Text>
            <Text style={styles.sectionTitle}>Your programs</Text>
          </View>
          <TouchableOpacity onPress={onViewAllPrograms}>
            <Text style={styles.sectionMeta}>View all</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.garageGrid}>
          {featuredPrograms.map((program) => (
            <ProgramCard
              key={program.id}
              program={program}
              compact
              tileWidth={tileWidth}
              onPress={() => onSelectProgram(program)}
            />
          ))}
        </View>
      </View>
      <TrophyGarage
        trophies={recentTrophies}
        totalCount={trophies.length}
        onSelectTrophy={onSelectTrophy}
        onViewAll={onViewAllTrophies}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: palette.background,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: 48,
    paddingBottom: spacing.xxl,
  },
  header: {
    marginBottom: spacing.xl,
  },
  kicker: {
    color: palette.accent,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  title: {
    color: palette.text,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  subtitle: {
    color: palette.textMuted,
    fontSize: 14,
    marginTop: 8,
  },
  analyticsSection: {
    backgroundColor: palette.panel,
    borderRadius: radii.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: palette.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    color: palette.text,
    fontSize: 20,
    fontWeight: '800',
  },
  sectionMeta: {
    color: palette.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: palette.border,
    marginVertical: spacing.xl,
  },
  garageSection: {
    paddingBottom: spacing.md,
  },
  garageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    columnGap: spacing.lg,
    rowGap: spacing.md,
  },
});
