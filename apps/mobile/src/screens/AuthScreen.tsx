import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { palette, radii, spacing } from '../theme/theme';

type AuthScreenProps = {
  mode?: 'sign-in' | 'sign-up';
  configured: boolean;
  loading?: boolean;
  error?: string;
  onSubmit: (email: string, password: string) => void;
  onResetPassword: () => void;
  onProvider: (provider: 'apple' | 'google') => void;
  onContinueDemo: () => void;
  onToggleMode?: () => void;
};

export function AuthScreen({
  mode = 'sign-in',
  configured,
  loading = false,
  error,
  onSubmit,
  onResetPassword,
  onProvider,
  onContinueDemo,
  onToggleMode,
}: AuthScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const title = mode === 'sign-up' ? 'Create your account' : 'Welcome back';

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.kicker}>Fitness-Applied</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>Your private, offline-ready training space.</Text>
        {!configured && (
          <View style={styles.notice}>
            <Text style={styles.noticeTitle}>Preview mode</Text>
            <Text style={styles.noticeText}>Authentication is not configured yet. You can explore the prototype without credentials.</Text>
          </View>
        )}
        {error && <Text style={styles.error}>{error}</Text>}
        <TextInput value={email} onChangeText={setEmail} placeholder="Email" placeholderTextColor={palette.textMuted} autoCapitalize="none" keyboardType="email-address" style={styles.input} />
        <TextInput value={password} onChangeText={setPassword} placeholder="Password" placeholderTextColor={palette.textMuted} secureTextEntry style={styles.input} />
        <TouchableOpacity style={styles.primaryButton} disabled={loading || !configured} onPress={() => onSubmit(email, password)}>
          {loading ? <ActivityIndicator color={palette.background} /> : <Text style={styles.primaryText}>{mode === 'sign-up' ? 'Create account' : 'Sign in'}</Text>}
        </TouchableOpacity>
        <View style={styles.providerRow}>
          <TouchableOpacity style={styles.secondaryButton} disabled={loading || !configured} onPress={() => onProvider('apple')}><Text style={styles.secondaryText}>Apple</Text></TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} disabled={loading || !configured} onPress={() => onProvider('google')}><Text style={styles.secondaryText}>Google</Text></TouchableOpacity>
        </View>
        <TouchableOpacity onPress={onResetPassword}><Text style={styles.link}>Forgot your password?</Text></TouchableOpacity>
        {onToggleMode && <TouchableOpacity onPress={onToggleMode}><Text style={styles.link}>{mode === 'sign-up' ? 'Already have an account? Sign in' : 'New here? Create an account'}</Text></TouchableOpacity>}
        <TouchableOpacity style={styles.demoButton} onPress={onContinueDemo}><Text style={styles.demoText}>Continue in preview</Text></TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.background, justifyContent: 'center', padding: spacing.lg },
  card: { backgroundColor: palette.panel, borderRadius: radii.xl, padding: spacing.xl, borderWidth: 1, borderColor: palette.border },
  kicker: { color: palette.accent, fontSize: 11, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: spacing.sm },
  title: { color: palette.text, fontSize: 30, fontWeight: '800' },
  subtitle: { color: palette.textMuted, marginTop: spacing.sm, marginBottom: spacing.xl, lineHeight: 21 },
  notice: { backgroundColor: palette.backgroundAlt, borderRadius: radii.md, padding: spacing.md, marginBottom: spacing.md },
  noticeTitle: { color: palette.gold, fontWeight: '800', marginBottom: 4 },
  noticeText: { color: palette.textMuted, lineHeight: 19 },
  error: { color: '#FCA5A5', marginBottom: spacing.sm },
  input: { backgroundColor: palette.backgroundAlt, borderRadius: radii.md, padding: spacing.md, color: palette.text, marginBottom: spacing.sm },
  primaryButton: { backgroundColor: palette.accent, borderRadius: radii.md, padding: spacing.md, alignItems: 'center', marginTop: spacing.sm },
  primaryText: { color: palette.background, fontWeight: '800' },
  providerRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  secondaryButton: { flex: 1, borderColor: palette.border, borderWidth: 1, borderRadius: radii.md, padding: spacing.md, alignItems: 'center' },
  secondaryText: { color: palette.text, fontWeight: '700' },
  link: { color: palette.accent, textAlign: 'center', marginTop: spacing.lg },
  demoButton: { alignItems: 'center', marginTop: spacing.xl },
  demoText: { color: palette.textMuted, fontWeight: '700' },
});
