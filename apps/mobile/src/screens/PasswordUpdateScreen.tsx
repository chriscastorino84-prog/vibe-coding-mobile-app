import { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { palette, radii, spacing } from '../theme/theme';

export function PasswordUpdateScreen({ loading, error, message, onSubmit }: {
  loading?: boolean;
  error?: string;
  message?: string;
  onSubmit: (password: string) => void;
}) {
  const [password, setPassword] = useState('');
  return <View style={styles.screen}><View style={styles.card}>
    <Text style={styles.kicker}>Account recovery</Text>
    <Text style={styles.title}>Set a new password</Text>
    <Text style={styles.subtitle}>Choose a new password for your Fitness Applied account.</Text>
    {error && <Text style={styles.error}>{error}</Text>}
    {message && <Text style={styles.message}>{message}</Text>}
    <TextInput value={password} onChangeText={setPassword} placeholder="New password" placeholderTextColor={palette.textMuted} secureTextEntry autoCapitalize="none" style={styles.input} />
    <TouchableOpacity style={styles.button} disabled={loading} onPress={() => onSubmit(password)}>
      <Text style={styles.buttonText}>{loading ? 'Saving…' : 'Save new password'}</Text>
    </TouchableOpacity>
  </View></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.background, justifyContent: 'center', padding: spacing.lg },
  card: { backgroundColor: palette.panel, borderRadius: radii.xl, padding: spacing.xl, borderWidth: 1, borderColor: palette.border },
  kicker: { color: palette.accent, fontSize: 11, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: spacing.sm },
  title: { color: palette.text, fontSize: 28, fontWeight: '800' },
  subtitle: { color: palette.textMuted, lineHeight: 21, marginVertical: spacing.lg },
  input: { backgroundColor: palette.backgroundAlt, borderRadius: radii.md, padding: spacing.md, color: palette.text, marginBottom: spacing.sm },
  button: { backgroundColor: palette.accent, borderRadius: radii.md, padding: spacing.md, alignItems: 'center', marginTop: spacing.sm },
  buttonText: { color: palette.background, fontWeight: '800' },
  error: { color: '#FCA5A5', marginBottom: spacing.sm },
  message: { color: palette.success, marginBottom: spacing.sm },
});
