import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { palette, radii, spacing } from '../theme/theme';

type ToolStatus = 'Live' | 'Service ready' | 'Coming soon';

type ToolCardProps = {
  eyebrow: string;
  title: string;
  description: string;
  status: ToolStatus;
  actionLabel?: string;
  onPress?: () => void;
};

function ToolCard({ eyebrow, title, description, status, actionLabel, onPress }: ToolCardProps) {
  const card = (
    <View style={styles.toolCard}>
      <View style={styles.toolHeader}>
        <Text style={styles.toolEyebrow}>{eyebrow}</Text>
        <Text style={[styles.status, status === 'Live' ? styles.statusLive : status === 'Service ready' ? styles.statusReady : styles.statusSoon]}>
          {status}
        </Text>
      </View>
      <Text style={styles.toolTitle}>{title}</Text>
      <Text style={styles.toolDescription}>{description}</Text>
      {actionLabel && <Text style={styles.actionLabel}>{actionLabel}  →</Text>}
    </View>
  );

  return onPress ? (
    <TouchableOpacity accessibilityRole="button" onPress={onPress} activeOpacity={0.82}>
      {card}
    </TouchableOpacity>
  ) : (
    card
  );
}

type ToolsWireframeScreenProps = {
  onOpenWorkout: () => void;
  onOpenPrograms: () => void;
  onOpenDashboard: () => void;
  onOpenTrophies: () => void;
  onOpenWods: () => void;
};

export function ToolsWireframeScreen({
  onOpenWorkout,
  onOpenPrograms,
  onOpenDashboard,
  onOpenTrophies,
  onOpenWods,
}: ToolsWireframeScreenProps) {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.kicker}>Fitness Applied</Text>
        <Text style={styles.title}>Tools map</Text>
        <Text style={styles.subtitle}>A wireframe of the tools currently present in the mobile app.</Text>
      </View>

      <View style={styles.legend} accessibilityLabel="Tool status legend">
        <Text style={styles.legendTitle}>CURRENT BUILD</Text>
        <Text style={styles.legendCopy}>Tap a live surface to preview it. Service-ready and coming-soon items are shown honestly.</Text>
        <View style={styles.legendRow}>
          <Text style={[styles.status, styles.statusLive]}>Live</Text>
          <Text style={[styles.status, styles.statusReady]}>Service ready</Text>
          <Text style={[styles.status, styles.statusSoon]}>Coming soon</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Workout loop</Text>
      <View style={styles.flow} accessibilityLabel="Workout flow wireframe">
        <View style={styles.flowNode}><Text style={styles.flowIndex}>01</Text><Text style={styles.flowTitle}>Choose</Text><Text style={styles.flowCopy}>Program + day</Text></View>
        <Text style={styles.flowArrow}>→</Text>
        <View style={styles.flowNode}><Text style={styles.flowIndex}>02</Text><Text style={styles.flowTitle}>Train</Text><Text style={styles.flowCopy}>Sets + rest</Text></View>
        <Text style={styles.flowArrow}>→</Text>
        <View style={styles.flowNode}><Text style={styles.flowIndex}>03</Text><Text style={styles.flowTitle}>Review</Text><Text style={styles.flowCopy}>Recap + data</Text></View>
      </View>

      <Text style={styles.sectionTitle}>Tool surfaces</Text>
      <ToolCard
        eyebrow="01 / TRAIN"
        title="Active workout"
        description="Set-by-set capture for weight, reps, effort, rest, notes, completion, and private recap."
        status="Live"
        actionLabel="Open workout"
        onPress={onOpenWorkout}
      />
      <ToolCard
        eyebrow="02 / PLAN"
        title="Program locker"
        description="Browse current programs and open the next scheduled workout."
        status="Live"
        actionLabel="Browse programs"
        onPress={onOpenPrograms}
      />
      <ToolCard
        eyebrow="03 / MEASURE"
        title="Performance dashboard"
        description="Session count, exercise performance, and body-measurement trends."
        status="Live"
        actionLabel="View dashboard"
        onPress={onOpenDashboard}
      />
      <ToolCard
        eyebrow="04 / RECOGNIZE"
        title="Trophy garage"
        description="Earned milestones with optional private trophy photos."
        status="Live"
        actionLabel="View trophies"
        onPress={onOpenTrophies}
      />
      <ToolCard
        eyebrow="05 / CALCULATE"
        title="Training calculators"
        description="BMR, BMI, HR zones, Lander one-rep max, and effort-based estimates are implemented as typed services."
        status="Service ready"
      />
      <ToolCard
        eyebrow="06 / LIBRARY"
        title="WOD marketplace"
        description="The catalog destination exists; downloadable published WOD files are not installed yet."
        status="Coming soon"
        actionLabel="View placeholder"
        onPress={onOpenWods}
      />

      <View style={styles.note}>
        <Text style={styles.noteTitle}>Wireframe boundary</Text>
        <Text style={styles.noteCopy}>Photos, exports, ads, and cloud catalog behavior remain explicit in their existing flows; this map does not represent them as complete when they are not.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.background },
  content: { padding: spacing.lg, paddingTop: 52, paddingBottom: spacing.xxl },
  header: { marginBottom: spacing.xl },
  kicker: { color: palette.accent, fontSize: 11, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6 },
  title: { color: palette.text, fontSize: 32, fontWeight: '800', letterSpacing: -0.8 },
  subtitle: { color: palette.textMuted, fontSize: 15, lineHeight: 22, marginTop: spacing.sm },
  legend: { backgroundColor: palette.panel, borderColor: palette.border, borderWidth: 1, borderRadius: radii.lg, padding: spacing.lg, marginBottom: spacing.xl },
  legendTitle: { color: palette.gold, fontSize: 11, fontWeight: '800', letterSpacing: 1.1 },
  legendCopy: { color: palette.textMuted, fontSize: 13, lineHeight: 19, marginTop: spacing.xs },
  legendRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  status: { borderRadius: radii.sm, fontSize: 10, fontWeight: '800', letterSpacing: 0.4, overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 5, textTransform: 'uppercase' },
  statusLive: { backgroundColor: 'rgba(52, 211, 153, 0.14)', color: palette.success },
  statusReady: { backgroundColor: 'rgba(79, 209, 197, 0.14)', color: palette.accent },
  statusSoon: { backgroundColor: 'rgba(247, 200, 115, 0.14)', color: palette.gold },
  sectionTitle: { color: palette.text, fontSize: 20, fontWeight: '800', marginBottom: spacing.md, marginTop: spacing.sm },
  flow: { alignItems: 'center', backgroundColor: palette.panel, borderColor: palette.border, borderRadius: radii.lg, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', padding: spacing.sm, marginBottom: spacing.xl },
  flowNode: { alignItems: 'center', backgroundColor: palette.card, borderColor: palette.border, borderRadius: radii.md, borderWidth: 1, flex: 1, minHeight: 86, justifyContent: 'center', paddingHorizontal: 4 },
  flowIndex: { color: palette.accent, fontSize: 10, fontWeight: '800' },
  flowTitle: { color: palette.text, fontSize: 14, fontWeight: '800', marginTop: 4 },
  flowCopy: { color: palette.textMuted, fontSize: 10, marginTop: 3, textAlign: 'center' },
  flowArrow: { color: palette.textMuted, fontSize: 18, paddingHorizontal: 4 },
  toolCard: { backgroundColor: palette.card, borderColor: palette.border, borderRadius: radii.lg, borderWidth: 1, marginBottom: spacing.md, padding: spacing.lg },
  toolHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  toolEyebrow: { color: palette.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  toolTitle: { color: palette.text, fontSize: 20, fontWeight: '800' },
  toolDescription: { color: palette.textMuted, fontSize: 14, lineHeight: 20, marginTop: 6 },
  actionLabel: { color: palette.accent, fontSize: 13, fontWeight: '800', marginTop: spacing.md },
  note: { borderColor: palette.border, borderLeftColor: palette.accent, borderRadius: radii.md, borderWidth: 1, padding: spacing.lg, marginTop: spacing.md },
  noteTitle: { color: palette.text, fontSize: 14, fontWeight: '800' },
  noteCopy: { color: palette.textMuted, fontSize: 12, lineHeight: 18, marginTop: 5 },
});
