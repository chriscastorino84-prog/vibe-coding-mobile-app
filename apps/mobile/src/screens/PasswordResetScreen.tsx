import { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { palette, radii, spacing } from '../theme/theme';

export function PasswordResetScreen({ loading, error, message, onSubmit, onBack }: {
  loading?: boolean; error?: string; message?: string; onSubmit: (email: string) => void; onBack: () => void;
}) {
  const [email, setEmail] = useState('');
  return <View style={styles.screen}><View style={styles.card}>
    <Text style={styles.kicker}>Account recovery</Text><Text style={styles.title}>Reset your password</Text>
    <Text style={styles.subtitle}>We’ll send a recovery link if this email has an account.</Text>
    {error && <Text style={styles.error}>{error}</Text>}{message && <Text style={styles.message}>{message}</Text>}
    <TextInput value={email} onChangeText={setEmail} placeholder="Email" placeholderTextColor={palette.textMuted} autoCapitalize="none" keyboardType="email-address" style={styles.input} />
    <TouchableOpacity style={styles.button} disabled={loading} onPress={() => onSubmit(email)}><Text style={styles.buttonText}>{loading ? 'Sending…' : 'Send recovery link'}</Text></TouchableOpacity>
    <TouchableOpacity onPress={onBack}><Text style={styles.link}>Back to sign in</Text></TouchableOpacity>
  </View></View>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.background, justifyContent: 'center', padding: spacing.lg },
  card: { backgroundColor: palette.panel, borderRadius: radii.xl, padding: spacing.xl, borderWidth: 1, borderColor: palette.border },
  kicker: { color: palette.accent, fontSize: 11, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: spacing.sm },
  title: { color: palette.text, fontSize: 28, fontWeight: '800' }, subtitle: { color: palette.textMuted, lineHeight: 21, marginVertical: spacing.lg },
  input: { backgroundColor: palette.backgroundAlt, borderRadius: radii.md, padding: spacing.md, color: palette.text, marginBottom: spacing.sm },
  button: { backgroundColor: palette.accent, borderRadius: radii.md, padding: spacing.md, alignItems: 'center', marginTop: spacing.sm }, buttonText: { color: palette.background, fontWeight: '800' },
  link: { color: palette.accent, textAlign: 'center', marginTop: spacing.lg }, error: { color: '#FCA5A5', marginBottom: spacing.sm }, message: { color: palette.success, marginBottom: spacing.sm },
});
