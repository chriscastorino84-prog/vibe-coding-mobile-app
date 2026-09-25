import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ProgramCard } from '../components/ProgramCard';
import { seedPrograms } from '../data/seedPrograms';
import { palette, radii, spacing } from '../theme/theme';
import type { Program } from '../types';

type ProgramLockerScreenProps = {
  onSelectProgram: (program: Program) => void;
};

export function ProgramLockerScreen({ onSelectProgram }: ProgramLockerScreenProps) {
  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.kicker}>Program Locker</Text>
        <Text style={styles.title}>Your next session</Text>
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {seedPrograms.map((program) => (
          <ProgramCard
            key={program.id}
            program={program}
            onPress={() => onSelectProgram(program)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.background,
    paddingHorizontal: spacing.lg,
    paddingTop: 48,
  },
  header: {
    marginBottom: spacing.xl,
  },
  kicker: {
    color: palette.accent,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  title: {
    color: palette.text,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  list: {
    paddingBottom: spacing.xxl,
  },
});
