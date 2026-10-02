import { useEffect, useState, type ReactNode } from 'react';
import { Linking } from 'react-native';
import type { Session } from '@supabase/supabase-js';

import { AuthScreen } from '../screens/AuthScreen';
import { ConsentScreen } from '../screens/ConsentScreen';
import { PasswordResetScreen } from '../screens/PasswordResetScreen';
import { PasswordUpdateScreen } from '../screens/PasswordUpdateScreen';
import { hasRequiredConsent, type ConsentRecord } from './consent';
import { restoreAuthSession } from './authSession';
import {
  sendPasswordReset,
  updatePassword,
  signInWithEmail,
  signInWithProvider,
  signUpWithEmail,
  subscribeToAuthChanges,
} from './authClient';
import { SupabaseConfigurationError } from '../services/supabase';
import { secureStorage } from '../services/secureStorage';

const CONSENT_STORAGE_KEY = 'fitness-applied.consent.v1';

export function SessionGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [consent, setConsent] = useState<ConsentRecord | null>();
  const [configured, setConfigured] = useState(true);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [resetMode, setResetMode] = useState(false);
  const [passwordUpdateMode, setPasswordUpdateMode] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [resetMessage, setResetMessage] = useState<string>();
  const [authMode, setAuthMode] = useState<'sign-in' | 'sign-up'>('sign-in');

  useEffect(() => {
    let mounted = true;
    const restore = async () => {
      try {
        const storedConsent = await secureStorage.getItem(CONSENT_STORAGE_KEY);
        if (storedConsent && mounted) {
          try { setConsent(JSON.parse(storedConsent) as ConsentRecord); } catch { setConsent(null); }
        }
        let isConfigured = true;
        const restored = await (async () => {
          try { return await restoreAuthSession(); }
          catch (restoreError) {
            if (restoreError instanceof SupabaseConfigurationError) { isConfigured = false; setConfigured(false); return null; }
            throw restoreError;
          }
        })();
        if (mounted) setSession(restored);
        if (isConfigured) {
          const subscription = subscribeToAuthChanges((_event, nextSession) => {
            if (mounted) setSession(nextSession);
          });
          return () => subscription.unsubscribe();
        }
      } catch (restoreError) {
        if (mounted) setError(restoreError instanceof Error ? restoreError.message : 'Unable to restore your session.');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    let cleanup: (() => void) | undefined;
    void restore().then((result) => { cleanup = result; });
    return () => { mounted = false; cleanup?.(); };
  }, [configured]);

  useEffect(() => {
    const handleRecoveryUrl = async (url: string | null) => {
      if (!url || !url.startsWith('fitnessapplied://reset-password')) return;
      const fragment = url.split('#')[1] ?? '';
      const params = new URLSearchParams(fragment);
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      if (!accessToken || !refreshToken) {
        setError('This recovery link is invalid or has expired. Request a new link.');
        return;
      }
      const { error: sessionError } = await (await import('../services/supabase')).getSupabaseClient().auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (sessionError) setError(sessionError.message);
      else setPasswordUpdateMode(true);
    };
    void Linking.getInitialURL().then(handleRecoveryUrl);
    const subscription = Linking.addEventListener('url', ({ url }) => { void handleRecoveryUrl(url); });
    return () => subscription.remove();
  }, []);

  const runAuth = async (operation: () => Promise<{ data: { session?: Session | null; url?: string | null }; error: { message: string } | null }>) => {
    setAuthLoading(true); setError(undefined);
    try {
      const result = await operation();
      if (result.error) throw new Error(result.error.message);
      setSession(result.data.session ?? null);
      if (!result.data.session) setError('Check your email to confirm your account, then sign in.');
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : 'Authentication failed.');
    } finally { setAuthLoading(false); }
  };

  const acceptConsent = (record: ConsentRecord) => {
    setConsent(record);
    void secureStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(record));
  };

  if (loading) return <AuthScreen configured={configured} loading onSubmit={() => undefined} onResetPassword={() => undefined} onProvider={() => undefined} onContinueDemo={() => undefined} />;
  if (passwordUpdateMode) return <PasswordUpdateScreen loading={authLoading} error={error} message={resetMessage} onSubmit={(password) => {
    setAuthLoading(true); setError(undefined); setResetMessage(undefined);
    void updatePassword(password).then(({ error: updateError }) => {
      if (updateError) setError(updateError.message);
      else { setResetMessage('Password updated. You can continue into the app.'); setPasswordUpdateMode(false); }
    }).catch((updateError) => setError(updateError instanceof Error ? updateError.message : 'Unable to update password.')).finally(() => setAuthLoading(false));
  }} />;
  if (resetMode) return <PasswordResetScreen loading={authLoading} error={error} message={resetMessage} onBack={() => { setResetMode(false); setError(undefined); }} onSubmit={(email) => {
    setAuthLoading(true); setError(undefined); setResetMessage(undefined);
    void sendPasswordReset(email).then(({ error: resetError }) => {
      if (resetError) setError(resetError.message); else setResetMessage('Recovery email sent. Check your inbox.');
    }).catch((resetError) => setError(resetError instanceof Error ? resetError.message : 'Unable to send recovery email.')).finally(() => setAuthLoading(false));
  }} />;
  if (!session && !demoMode) return <AuthScreen mode={authMode} configured={configured} loading={authLoading} error={error} onSubmit={(email, password) => void runAuth(() => authMode === 'sign-up' ? signUpWithEmail(email, password) : signInWithEmail(email, password))} onResetPassword={() => { setResetMode(true); setError(undefined); }} onProvider={(provider) => void runAuth(() => signInWithProvider(provider))} onContinueDemo={() => setDemoMode(true)} onToggleMode={() => { setAuthMode(authMode === 'sign-in' ? 'sign-up' : 'sign-in'); setError(undefined); }} />;
  if (!hasRequiredConsent(consent)) return <ConsentScreen onAccept={acceptConsent} />;
  return <>{children}</>;
}
