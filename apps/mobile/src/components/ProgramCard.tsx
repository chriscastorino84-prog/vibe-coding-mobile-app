import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { palette, radii, spacing } from '../theme/theme';
import type { Program } from '../types';

type ProgramCardProps = {
  program: Program;
  compact?: boolean;
  tileWidth?: number;
  onPress: () => void;
};

export function ProgramCard({ program, compact = false, tileWidth, onPress }: ProgramCardProps) {
  return (
    <TouchableOpacity
      style={[styles.card, compact && styles.squareCard, tileWidth ? { width: tileWidth } : null]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View
        style={[
          styles.accentBar,
          { backgroundColor: program.accent },
        ]}
      />
      <View style={styles.cardContent}>
        <View style={styles.cardTopline}>
          <Text style={styles.phase}>{program.phase}</Text>
          {program.accessTier && <Text style={styles.tier}>{program.accessTier === 'paid' ? 'PAID' : 'FREE'}</Text>}
        </View>
        <Text style={styles.name}>{program.name}</Text>
        <Text style={styles.tone}>{program.tone}</Text>
        <View style={styles.actionRow}>
          <Text style={styles.actionText}>{compact ? 'Open today' : 'View schedule'}</Text>
          <Text style={styles.actionArrow}>→</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radii.lg,
    overflow: 'hidden',
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  squareCard: {
    aspectRatio: 1,
    marginBottom: 0,
  },
  accentBar: {
    height: 6,
    width: '100%',
  },
  cardContent: {
    padding: spacing.lg,
  },
  phase: {
    color: palette.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  cardTopline: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tier: { color: palette.gold, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  name: {
    color: palette.text,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
  },
  tone: {
    color: palette.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.lg, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: palette.border },
  actionText: { color: palette.accentSoft, fontSize: 12, fontWeight: '800' },
  actionArrow: { color: palette.accent, fontSize: 20, fontWeight: '700' },
});
