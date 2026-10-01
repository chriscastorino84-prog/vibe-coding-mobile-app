import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CONSENT_VERSION, type ConsentRecord } from '../auth/consent';
import { palette, radii, spacing } from '../theme/theme';

export function ConsentScreen({ onAccept }: { onAccept: (record: ConsentRecord) => void }) {
  const [wellness, setWellness] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  return <View style={styles.screen}><View style={styles.card}><Text style={styles.kicker}>A quick note</Text><Text style={styles.title}>Train with clarity</Text>
    <Text style={styles.body}>This app provides general wellness and fitness information, not medical advice or diagnosis. Your workout, body, and photo data stays private to your account.</Text>
    <TouchableOpacity style={styles.row} onPress={() => setWellness(!wellness)}><Text style={styles.check}>{wellness ? '✓' : '○'}</Text><Text style={styles.label}>I understand this is general wellness content.</Text></TouchableOpacity>
    <TouchableOpacity style={styles.row} onPress={() => setPrivacy(!privacy)}><Text style={styles.check}>{privacy ? '✓' : '○'}</Text><Text style={styles.label}>I agree to the privacy terms for using this app.</Text></TouchableOpacity>
    <TouchableOpacity disabled={!wellness || !privacy} style={[styles.button, (!wellness || !privacy) && styles.disabled]} onPress={() => onAccept({ version: CONSENT_VERSION, acceptedAt: new Date().toISOString(), wellnessAcknowledged: wellness, privacyAcknowledged: privacy })}><Text style={styles.buttonText}>Continue</Text></TouchableOpacity>
  </View></View>;
}
const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: palette.background, justifyContent: 'center', padding: spacing.lg }, card: { backgroundColor: palette.panel, borderRadius: radii.xl, padding: spacing.xl, borderWidth: 1, borderColor: palette.border }, kicker: { color: palette.accent, fontSize: 11, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' }, title: { color: palette.text, fontSize: 30, fontWeight: '800', marginTop: spacing.sm }, body: { color: palette.textMuted, lineHeight: 21, marginVertical: spacing.lg }, row: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }, check: { color: palette.accent, fontSize: 25, width: 34 }, label: { color: palette.text, flex: 1, lineHeight: 20 }, button: { backgroundColor: palette.accent, borderRadius: radii.md, padding: spacing.md, alignItems: 'center', marginTop: spacing.md }, disabled: { opacity: 0.4 }, buttonText: { color: palette.background, fontWeight: '800' } });
