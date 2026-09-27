import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { TrophyArtwork } from '../components/TrophyArtwork';
import { palette, radii, spacing } from '../theme/theme';
import type { Trophy } from '../types';

type TrophyDetailScreenProps = {
  trophy: Trophy;
  onBack: () => void;
};

export function TrophyDetailScreen({ trophy, onBack }: TrophyDetailScreenProps) {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <TouchableOpacity style={styles.backButton} onPress={onBack}><Text style={styles.backText}>Back to trophies</Text></TouchableOpacity>
      <View style={styles.hero}>
        <TrophyArtwork trophy={trophy} size={96} />
        <Text style={styles.name}>{trophy.name}</Text>
        <Text style={styles.description}>{trophy.description}</Text>
        <Text style={styles.date}>Earned {new Date(trophy.unlockedAt).toLocaleDateString()}</Text>
      </View>
      <Text style={styles.sectionTitle}>Attainment dashboard</Text>
      <View style={styles.statsCard}>
        <Text style={styles.label}>Exercise tonnage</Text>
        {trophy.statsSnapshot.exercises.length === 0 ? (
          <Text style={styles.photoText}>No exercise tonnage recorded for this session.</Text>
        ) : (
          trophy.statsSnapshot.exercises.map((exercise) => (
            <View key={exercise.name} style={styles.row}><Text style={styles.rowLabel}>{exercise.name}</Text><Text style={styles.rowValue}>{exercise.tonnage.toLocaleString()}</Text></View>
          ))
        )}
      </View>
      <View style={styles.statsCard}>
        <Text style={styles.label}>Progress photo</Text>
        <View style={styles.photoSlot}><Text style={styles.photoText}>{trophy.photoUri ? 'Photo saved for this attainment' : 'No photo saved'}</Text></View>
      </View>
      {trophy.statsSnapshot.measurements.length > 0 && (
        <View style={styles.statsCard}>
          <Text style={styles.label}>Measurements at attainment</Text>
          {trophy.statsSnapshot.measurements.map((measurement) => (
            <View key={measurement.id} style={styles.row}><Text style={styles.rowLabel}>{measurement.label}</Text><Text style={styles.rowValue}>{measurement.value} {measurement.unit}</Text></View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: palette.background },
  content: { padding: spacing.lg, paddingTop: 52, paddingBottom: spacing.xxl },
  backButton: { alignSelf: 'flex-start', paddingVertical: spacing.xs, marginBottom: spacing.xl },
  backText: { color: palette.text, fontWeight: '700' },
  hero: { alignItems: 'center', paddingVertical: spacing.xl, marginBottom: spacing.lg },
  icon: { width: 72, height: 72, borderRadius: 36, backgroundColor: palette.gold, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  iconText: { color: '#271A05', fontSize: 20, fontWeight: '900' },
  name: { color: palette.text, fontSize: 28, fontWeight: '800', textAlign: 'center' },
  description: { color: palette.textMuted, fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: spacing.sm },
  date: { color: palette.gold, fontSize: 12, fontWeight: '700', marginTop: spacing.md },
  sectionTitle: { color: palette.text, fontSize: 20, fontWeight: '800', marginBottom: spacing.md },
  statsCard: { backgroundColor: palette.card, borderRadius: radii.lg, borderWidth: 1, borderColor: palette.border, padding: spacing.lg, marginBottom: spacing.md },
  label: { color: palette.textMuted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.1, marginBottom: spacing.sm },
  value: { color: palette.text, fontSize: 32, fontWeight: '800', marginBottom: spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: palette.border },
  rowLabel: { color: palette.textMuted, fontSize: 14 },
  rowValue: { color: palette.text, fontWeight: '800', fontSize: 14 },
  photoSlot: { height: 130, borderRadius: radii.md, backgroundColor: palette.panel, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: palette.border },
  photoText: { color: palette.textMuted, fontSize: 13 },
});
