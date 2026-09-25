import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { TrophyArtwork } from './TrophyArtwork';
import { palette, radii, spacing } from '../theme/theme';
import type { Trophy } from '../types';

type TrophyGarageProps = {
  trophies: Trophy[];
  totalCount?: number;
  onSelectTrophy: (trophy: Trophy) => void;
  onViewAll: () => void;
};

export function TrophyGarage({ trophies, totalCount = trophies.length, onSelectTrophy, onViewAll }: TrophyGarageProps) {
  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>Trophy garage</Text>
          <Text style={styles.title}>Earned milestones</Text>
        </View>
        <Text style={styles.count}>{totalCount} earned</Text>
      </View>
      {trophies.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Your first trophy is ahead</Text>
          <Text style={styles.emptyText}>Trophies unlock from training, measurements, consistency, and exploration.</Text>
        </View>
      ) : (
        <View style={styles.grid}>
          {trophies.map((trophy) => (
            <TouchableOpacity key={trophy.id} style={styles.trophyCard} onPress={() => onSelectTrophy(trophy)} activeOpacity={0.85}>
              <TrophyArtwork trophy={trophy} size={64} />
              <Text style={styles.name}>{trophy.name}</Text>
              <Text style={styles.description}>{trophy.description}</Text>
              <Text style={styles.date}>{new Date(trophy.unlockedAt).toLocaleDateString()}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      {totalCount > trophies.length && (
        <TouchableOpacity style={styles.viewAll} onPress={onViewAll}>
          <Text style={styles.viewAllText}>View all trophies</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: spacing.md,
  },
  kicker: {
    color: palette.gold,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  title: {
    color: palette.text,
    fontSize: 20,
    fontWeight: '800',
  },
  count: {
    color: palette.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: palette.panel,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.border,
    padding: spacing.lg,
  },
  emptyTitle: {
    color: palette.text,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: spacing.xs,
  },
  emptyText: {
    color: palette.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  trophyCard: {
    width: '48%',
    minHeight: 150,
    backgroundColor: palette.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.border,
    padding: spacing.md,
  },
  icon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.gold,
    marginBottom: spacing.sm,
  },
  iconText: {
    color: '#271A05',
    fontSize: 11,
    fontWeight: '900',
  },
  name: {
    color: palette.text,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 5,
  },
  description: {
    color: palette.textMuted,
    fontSize: 12,
    lineHeight: 17,
    flex: 1,
  },
  date: {
    color: palette.gold,
    fontSize: 10,
    fontWeight: '700',
    marginTop: spacing.sm,
  },
  viewAll: {
    alignSelf: 'flex-start',
    marginTop: spacing.md,
    paddingVertical: spacing.xs,
  },
  viewAllText: {
    color: palette.gold,
    fontSize: 13,
    fontWeight: '800',
  },
});
