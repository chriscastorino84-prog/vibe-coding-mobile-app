import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { ProgramCard } from '../components/ProgramCard';
import { ProgramStatCard } from '../components/ProgramStatCard';
import { palette, spacing } from '../theme/theme';
import type { DashboardSummary } from '../analytics';
import type { Program } from '../types';

type ProgramGarageScreenProps = {
  programs: Program[];
  summary: DashboardSummary;
  onSelectProgram: (program: Program) => void;
  onBack: () => void;
};

export function ProgramGarageScreen({ programs, summary, onSelectProgram, onBack }: ProgramGarageScreenProps) {
  const currentPrograms = programs.filter((program) => program.status === 'current');
  const closedPrograms = programs.filter((program) => program.status === 'closed');

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Text style={styles.backText}>Back home</Text>
      </TouchableOpacity>
      <Text style={styles.kicker}>Full collection</Text>
      <Text style={styles.title}>Program garage</Text>
      <Text style={styles.subtitle}>Current training stays ready. Closed programs become permanent stat cards.</Text>

      <Text style={styles.sectionTitle}>Current programs</Text>
      {currentPrograms.map((program) => (
        <ProgramCard key={program.id} program={program} onPress={() => onSelectProgram(program)} />
      ))}

      <Text style={styles.sectionTitle}>Closed programs</Text>
      {closedPrograms.length === 0 ? (
        <View style={styles.emptyCard}><Text style={styles.emptyText}>Completed programs will appear here as preserved stat cards.</Text></View>
      ) : (
        closedPrograms.map((program) => {
          const points = summary.metricPoints.filter((point) => point.sessionId && summary.sessionPoints.some((session) => session.sessionId === point.sessionId && session.programId === program.id));
          const programSessions = summary.sessionPoints.filter((point) => point.programId === program.id);
          return (
            <ProgramStatCard
              key={program.id}
              program={program}
              points={points}
              sessionCount={programSessions.length}
              onPress={() => onSelectProgram(program)}
            />
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: palette.background },
  content: { padding: spacing.lg, paddingTop: 52, paddingBottom: spacing.xxl },
  backButton: { alignSelf: 'flex-start', paddingVertical: spacing.xs, marginBottom: spacing.xl },
  backText: { color: palette.text, fontWeight: '700' },
  kicker: { color: palette.accent, fontSize: 11, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6 },
  title: { color: palette.text, fontSize: 30, fontWeight: '800' },
  subtitle: { color: palette.textMuted, fontSize: 14, lineHeight: 20, marginTop: spacing.sm, marginBottom: spacing.xl },
  sectionTitle: { color: palette.text, fontSize: 20, fontWeight: '800', marginTop: spacing.lg, marginBottom: spacing.md },
  emptyCard: { backgroundColor: palette.panel, borderWidth: 1, borderColor: palette.border, borderRadius: 20, padding: spacing.lg },
  emptyText: { color: palette.textMuted, fontSize: 14, lineHeight: 20 },
});
