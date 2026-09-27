import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Image, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { palette, radii, spacing } from '../theme/theme';

type ProgressPhotoPromptScreenProps = {
  weekNumber: number;
  onContinue: (photoUri?: string) => void;
};

export function ProgressPhotoPromptScreen({ weekNumber, onContinue }: ProgressPhotoPromptScreenProps) {
  const [photoUri, setPhotoUri] = useState<string>();

  const choosePhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    if (Platform.OS !== 'web') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        return;
      }
    }

    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.85 });
    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  return (
    <View style={styles.screen}>
      <Text style={styles.kicker}>Progress checkpoint</Text>
      <Text style={styles.title}>Before Week {weekNumber}</Text>
      <Text style={styles.description}>A progress photo gives you a visual reference point for this stage of your program.</Text>
      <TouchableOpacity style={styles.photoSlot} onPress={photoUri ? undefined : takePhoto}>
        {photoUri ? <Image source={{ uri: photoUri }} style={styles.photo} /> : <Text style={styles.photoText}>Choose how to add your photo</Text>}
      </TouchableOpacity>
      {!photoUri && (
        <View style={styles.photoActions}>
          <TouchableOpacity style={styles.secondaryButton} onPress={takePhoto}>
            <Text style={styles.secondaryText}>Take photo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={choosePhoto}>
            <Text style={styles.secondaryText}>Choose from library</Text>
          </TouchableOpacity>
        </View>
      )}
      {photoUri && (
        <TouchableOpacity style={styles.primaryButton} onPress={() => onContinue(photoUri)}>
          <Text style={styles.primaryText}>Save photo and start workout</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity style={styles.skipButton} onPress={() => onContinue()}>
        <Text style={styles.skipText}>Skip photo and start workout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.background, padding: spacing.xl, paddingTop: 96, alignItems: 'center' },
  kicker: { color: palette.gold, fontSize: 11, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' },
  title: { color: palette.text, fontSize: 30, fontWeight: '800', textAlign: 'center', marginTop: spacing.sm },
  description: { color: palette.textMuted, fontSize: 15, lineHeight: 22, textAlign: 'center', marginTop: spacing.md, maxWidth: 340 },
  photoSlot: { width: '100%', height: 230, borderRadius: radii.lg, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.panel, alignItems: 'center', justifyContent: 'center', marginTop: spacing.xl, overflow: 'hidden' },
  photo: { width: '100%', height: '100%' },
  photoText: { color: palette.textMuted, fontWeight: '700' },
  photoActions: { flexDirection: 'row', gap: spacing.sm, width: '100%', marginTop: spacing.md },
  secondaryButton: { flex: 1, borderRadius: radii.md, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.panel, paddingVertical: 13, alignItems: 'center' },
  secondaryText: { color: palette.text, fontSize: 13, fontWeight: '800' },
  primaryButton: { width: '100%', backgroundColor: palette.accent, borderRadius: radii.md, paddingVertical: 16, alignItems: 'center', marginTop: spacing.lg },
  primaryText: { color: '#07131D', fontSize: 16, fontWeight: '800' },
  skipButton: { paddingVertical: spacing.md, marginTop: spacing.xs },
  skipText: { color: palette.textMuted, fontSize: 14, fontWeight: '700' },
});