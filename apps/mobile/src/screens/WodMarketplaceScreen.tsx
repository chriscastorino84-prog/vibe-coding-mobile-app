import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { palette, radii, spacing } from '../theme/theme';

export function WodMarketplaceScreen() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.kicker}>Fitness Applied Marketplace</Text>
      <Text style={styles.title}>WODs are coming here</Text>
      <Text style={styles.subtitle}>
        Published WOD files will be downloadable for online or offline workouts.
        No legacy exercise programs are currently installed.
      </Text>
      <View style={styles.card} accessibilityRole="text">
        <Text style={styles.cardTitle}>WOD library preparing</Text>
        <Text style={styles.cardCopy}>
          Each WOD will arrive with catalog-linked exercise instructions, timer
          behavior, and the exact metrics needed to track the workout.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.background },
  content: { padding: spacing.lg, paddingTop: 64, paddingBottom: spacing.xxl },
  kicker: { color: palette.accent, fontSize: 11, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: spacing.sm },
  title: { color: palette.text, fontSize: 30, fontWeight: '800', letterSpacing: -0.8 },
  subtitle: { color: palette.textMuted, fontSize: 16, lineHeight: 24, marginTop: spacing.md },
  card: { backgroundColor: palette.panel, borderColor: palette.border, borderRadius: radii.xl, borderWidth: 1, marginTop: spacing.xl, padding: spacing.lg },
  cardTitle: { color: palette.text, fontSize: 20, fontWeight: '800' },
  cardCopy: { color: palette.textMuted, fontSize: 14, lineHeight: 21, marginTop: spacing.sm },
});
