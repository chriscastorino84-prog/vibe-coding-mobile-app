import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { TrophyGarage } from '../components/TrophyGarage';
import { palette, spacing } from '../theme/theme';
import type { Trophy } from '../types';

type TrophyDashboardScreenProps = {
  trophies: Trophy[];
  onSelectTrophy: (trophy: Trophy) => void;
  onBack: () => void;
};

export function TrophyDashboardScreen({ trophies, onSelectTrophy, onBack }: TrophyDashboardScreenProps) {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <TouchableOpacity style={styles.backButton} onPress={onBack}><Text style={styles.backText}>Back home</Text></TouchableOpacity>
      <View style={styles.header}>
        <Text style={styles.kicker}>Full collection</Text>
        <Text style={styles.title}>Trophy garage</Text>
        <Text style={styles.subtitle}>Every milestone, with the training data captured when you earned it.</Text>
      </View>
      <TrophyGarage trophies={trophies} onSelectTrophy={onSelectTrophy} onViewAll={() => undefined} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: palette.background },
  content: { padding: spacing.lg, paddingTop: 52, paddingBottom: spacing.xxl },
  backButton: { alignSelf: 'flex-start', paddingVertical: spacing.xs, marginBottom: spacing.xl },
  backText: { color: palette.text, fontWeight: '700' },
  header: { marginBottom: spacing.md },
  kicker: { color: palette.gold, fontSize: 11, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6 },
  title: { color: palette.text, fontSize: 30, fontWeight: '800' },
  subtitle: { color: palette.textMuted, fontSize: 14, lineHeight: 20, marginTop: spacing.sm },
});
