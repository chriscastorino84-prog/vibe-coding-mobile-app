import { useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';

import { ProgramDetailScreen } from './src/screens/ProgramDetailScreen';
import { WodMarketplaceScreen } from './src/screens/WodMarketplaceScreen';
import { ToolsWireframeScreen } from './src/screens/ToolsWireframeScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { ProgramGarageScreen } from './src/screens/ProgramGarageScreen';
import { ProgressPhotoPromptScreen } from './src/screens/ProgressPhotoPromptScreen';
import { TrophyDashboardScreen } from './src/screens/TrophyDashboardScreen';
import { TrophyDetailScreen } from './src/screens/TrophyDetailScreen';
import { TrophyPhotoPromptScreen } from './src/screens/TrophyPhotoPromptScreen';
import { WorkoutScreen } from './src/screens/WorkoutScreen';
import { seedPrograms } from './src/data/seedPrograms';
import { buildDashboardSummary } from './src/analytics';
import { buildEarnedTrophies } from './src/trophies';
import type { Program, ProgressPhotoCheckpoint, Trophy, WorkoutDay, WorkoutSession } from './src/types';
import { getPrivateRecord, initializeLocalDatabase, setPrivateRecord } from './src/local/database';
import { AppShell } from './src/auth/AppShell';

const SESSIONS_STORAGE_KEY = 'workout.completed-sessions.v1';
const TROPHIES_STORAGE_KEY = 'workout.trophies.v1';
const PROGRESS_PHOTOS_STORAGE_KEY = 'workout.progress-photo-checkpoints.v1';
const PROGRESS_PHOTO_WEEKS = new Set([1, 3, 6]);

function PrototypeApp() {
  const [screen, setScreen] = useState<'home' | 'detail' | 'workout' | 'dashboard' | 'program-garage' | 'trophy-garage' | 'trophy-detail' | 'photo-prompt' | 'progress-photo-prompt' | 'wod-marketplace'>('home');
  const [selectedProgram, setSelectedProgram] = useState<Program>(seedPrograms[1]);
  const [selectedWorkoutDay, setSelectedWorkoutDay] = useState<WorkoutDay>();
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [trophyRecords, setTrophyRecords] = useState<Trophy[]>([]);
  const [selectedTrophy, setSelectedTrophy] = useState<Trophy>();
  const [pendingTrophies, setPendingTrophies] = useState<Trophy[]>([]);
  const [progressPhotoCheckpoints, setProgressPhotoCheckpoints] = useState<ProgressPhotoCheckpoint[]>([]);
  const [pendingWorkoutDay, setPendingWorkoutDay] = useState<WorkoutDay>();
  const [pendingProgressPhotoWeek, setPendingProgressPhotoWeek] = useState<number>();
  const [isHydrated, setIsHydrated] = useState(false);
  const [databaseError, setDatabaseError] = useState<string>();

  useEffect(() => {
    const loadSessions = async () => {
      try {
        await initializeLocalDatabase();
        const loadPrivateRecord = async <T,>(key: string, legacyKey: string) => {
          const stored = await getPrivateRecord<T[]>(key);
          if (stored) return stored;
          const legacy = await AsyncStorage.getItem(legacyKey);
          if (!legacy) return null;
          const parsed: unknown = JSON.parse(legacy);
          if (!Array.isArray(parsed)) return null;
          await setPrivateRecord(key, parsed);
          await AsyncStorage.removeItem(legacyKey);
          return parsed as T[];
        };
        const storedSessions = await loadPrivateRecord<WorkoutSession>('private.sessions.v1', SESSIONS_STORAGE_KEY);
        const storedTrophies = await loadPrivateRecord<Trophy>('private.trophies.v1', TROPHIES_STORAGE_KEY);
        const storedProgressPhotos = await loadPrivateRecord<ProgressPhotoCheckpoint>('private.progress-photos.v1', PROGRESS_PHOTOS_STORAGE_KEY);
        if (storedSessions) setSessions(storedSessions);
        if (storedTrophies) setTrophyRecords(storedTrophies);
        if (storedProgressPhotos) setProgressPhotoCheckpoints(storedProgressPhotos);
      } catch (error) {
        setDatabaseError(error instanceof Error ? error.message : 'Unable to initialize local storage');
      } finally {
        setIsHydrated(true);
      }
    };

    void loadSessions();
  }, []);

  useEffect(() => {
    if (isHydrated) {
      void setPrivateRecord('private.sessions.v1', sessions).catch((error) => setDatabaseError(error instanceof Error ? error.message : 'Unable to save workout history.'));
    }
  }, [isHydrated, sessions]);

  useEffect(() => {
    if (isHydrated) {
      void setPrivateRecord('private.trophies.v1', trophyRecords).catch((error) => setDatabaseError(error instanceof Error ? error.message : 'Unable to save trophy history.'));
    }
  }, [isHydrated, trophyRecords]);

  useEffect(() => {
    if (isHydrated) {
      void setPrivateRecord('private.progress-photos.v1', progressPhotoCheckpoints).catch((error) => setDatabaseError(error instanceof Error ? error.message : 'Unable to save progress photos.'));
    }
  }, [isHydrated, progressPhotoCheckpoints]);

  const activeProgram = useMemo(() => {
    return seedPrograms.find((program) => program.id === selectedProgram.id) ?? seedPrograms[1];
  }, [selectedProgram]);
  const dashboardSummary = useMemo(() => buildDashboardSummary(sessions), [sessions]);
  const earnedTrophies = useMemo(() => {
    const savedPhotos = new Map(trophyRecords.map((trophy) => [trophy.id, trophy.photoUri]));
    return buildEarnedTrophies(sessions).map((trophy) => ({
      ...trophy,
      photoUri: savedPhotos.get(trophy.id),
    }));
  }, [sessions, trophyRecords]);
  const completedWorkoutDayIds = new Set(
    sessions.flatMap((session) =>
      session.programId === activeProgram.id && session.workoutDayId ? [session.workoutDayId] : [],
    ),
  );
  const nextWorkoutDay = activeProgram.workoutWeeks
    ?.flatMap((week) => week.workoutDays)
    .find((workoutDay) => !completedWorkoutDayIds.has(workoutDay.id));

  if (!isHydrated) {
    return <View style={{ flex: 1 }} />;
  }

  if (databaseError) {
    return <View style={{ flex: 1 }} accessibilityLabel={`Storage initialization failed: ${databaseError}`} />;
  }

  const handleSelectProgram = (program: Program) => {
    setSelectedProgram(program);
    setScreen('detail');
  };

  const handleSelectTrophy = (trophy: Trophy) => {
    setSelectedTrophy(trophy);
    setScreen('trophy-detail');
  };

  const handleStartWorkout = (workoutDay?: WorkoutDay) => {
    const workoutWeek = activeProgram.workoutWeeks?.find((week) =>
      week.workoutDays.some((day) => day.id === workoutDay?.id),
    );
    const weekNumber = workoutWeek?.weekNumber;
    const checkpointId = weekNumber === undefined ? undefined : `${activeProgram.id}-week-${weekNumber}`;
    const shouldPrompt = weekNumber !== undefined
      && PROGRESS_PHOTO_WEEKS.has(weekNumber)
      && !progressPhotoCheckpoints.some((checkpoint) => checkpoint.id === checkpointId);

    setSelectedWorkoutDay(workoutDay);
    if (shouldPrompt && weekNumber !== undefined) {
      setPendingWorkoutDay(workoutDay);
      setPendingProgressPhotoWeek(weekNumber);
      setScreen('progress-photo-prompt');
      return;
    }

    setScreen('workout');
  };

  const handleCompleteProgressPhotoCheckpoint = (photoUri?: string) => {
    const workoutDay = pendingWorkoutDay;
    const weekNumber = pendingProgressPhotoWeek;
    if (!workoutDay || weekNumber === undefined) {
      setScreen('home');
      return;
    }

    const checkpointId = `${activeProgram.id}-week-${weekNumber}`;
    setProgressPhotoCheckpoints((current) => [
      ...current.filter((checkpoint) => checkpoint.id !== checkpointId),
      {
        id: checkpointId,
        programId: activeProgram.id,
        weekNumber,
        recordedAt: new Date().toISOString(),
        photoUri,
      },
    ]);
    setPendingWorkoutDay(undefined);
    setPendingProgressPhotoWeek(undefined);
    setSelectedWorkoutDay(workoutDay);
    setScreen('workout');
  };

  const handleSaveTrophyPhoto = (photoUri?: string) => {
    const [currentTrophy, ...remainingTrophies] = pendingTrophies;
    if (!currentTrophy) {
      setScreen('home');
      return;
    }

    if (photoUri) {
      setTrophyRecords((current) => [
        ...current.filter((trophy) => trophy.id !== currentTrophy.id),
        { ...currentTrophy, photoUri },
      ]);
    }
    setPendingTrophies(remainingTrophies);
    if (remainingTrophies.length > 0) {
      setSelectedTrophy(remainingTrophies[0]);
    } else {
      setScreen('home');
    }
  };

  if (screen === 'home') {
    return (
      <View style={{ flex: 1 }}>
        <StatusBar style="light" />
        <ToolsWireframeScreen
          onOpenWorkout={() => handleStartWorkout(nextWorkoutDay)}
          onOpenPrograms={() => setScreen('program-garage')}
          onOpenDashboard={() => setScreen('dashboard')}
          onOpenTrophies={() => setScreen('trophy-garage')}
          onOpenWods={() => setScreen('wod-marketplace')}
        />
      </View>
    );
  }

  if (screen === 'dashboard') {
    return (
      <View style={{ flex: 1 }}>
        <StatusBar style="light" />
        <DashboardScreen program={activeProgram} summary={dashboardSummary} onBackToLocker={() => setScreen('home')} />
      </View>
    );
  }

  if (screen === 'wod-marketplace') {
    return (
      <View style={{ flex: 1 }}>
        <StatusBar style="light" />
        <WodMarketplaceScreen />
      </View>
    );
  }

  if (screen === 'detail') {
    return (
      <View style={{ flex: 1 }}>
        <StatusBar style="light" />
        <ProgramDetailScreen
          program={activeProgram}
          workoutDay={nextWorkoutDay}
          onStart={handleStartWorkout}
          onBack={() => setScreen('home')}
        />
      </View>
    );
  }

  if (screen === 'program-garage') {
    return (
      <View style={{ flex: 1 }}>
        <StatusBar style="light" />
        <ProgramGarageScreen programs={seedPrograms} summary={dashboardSummary} onSelectProgram={handleSelectProgram} onBack={() => setScreen('home')} />
      </View>
    );
  }

  if (screen === 'trophy-garage') {
    return (
      <View style={{ flex: 1 }}>
        <StatusBar style="light" />
        <TrophyDashboardScreen trophies={earnedTrophies} onSelectTrophy={handleSelectTrophy} onBack={() => setScreen('home')} />
      </View>
    );
  }

  if (screen === 'trophy-detail' && selectedTrophy) {
    return (
      <View style={{ flex: 1 }}>
        <StatusBar style="light" />
        <TrophyDetailScreen trophy={selectedTrophy} onBack={() => setScreen('trophy-garage')} />
      </View>
    );
  }

  if (screen === 'progress-photo-prompt' && pendingProgressPhotoWeek !== undefined) {
    return (
      <View style={{ flex: 1 }}>
        <StatusBar style="light" />
        <ProgressPhotoPromptScreen weekNumber={pendingProgressPhotoWeek} onContinue={handleCompleteProgressPhotoCheckpoint} />
      </View>
    );
  }

  if (screen === 'photo-prompt' && selectedTrophy) {
    return (
      <View style={{ flex: 1 }}>
        <StatusBar style="light" />
        <TrophyPhotoPromptScreen trophy={selectedTrophy} onSave={handleSaveTrophyPhoto} />
      </View>
    );
  }

  if (screen === 'workout') {
    return (
      <View style={{ flex: 1 }}>
        <StatusBar style="light" />
        <WorkoutScreen
          program={activeProgram}
          workoutDay={selectedWorkoutDay}
          onBack={() => setScreen('detail')}
          onComplete={async (session) => {
            const updatedSessions = [...sessions, session];
            await setPrivateRecord('private.sessions.v1', updatedSessions);
            const previousTrophyIds = new Set(earnedTrophies.map((trophy) => trophy.id));
            const newTrophies = buildEarnedTrophies(updatedSessions).filter((trophy) => !previousTrophyIds.has(trophy.id));
            setSessions(updatedSessions);
            if (newTrophies.length > 0) {
              setPendingTrophies(newTrophies);
              setSelectedTrophy(newTrophies[0]);
              setScreen('photo-prompt');
            } else {
              setScreen('home');
            }
          }}
        />
      </View>
    );
  }

  return null;
}

export default function App() {
  return <AppShell><PrototypeApp /></AppShell>;
}
