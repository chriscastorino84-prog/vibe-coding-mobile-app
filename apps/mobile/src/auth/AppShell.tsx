import { type ReactNode } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SessionGate } from './SessionGate';

export function AppShell({ children }: { children: ReactNode }) {
  return <SessionGate><View style={{ flex: 1 }}><StatusBar style="light" />{children}</View></SessionGate>;
}
