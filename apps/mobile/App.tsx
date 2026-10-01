import { useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';

import { ProgramDetailScreen } from './src/screens/ProgramDetailScreen';
import { HomeScreen } from './src/screens/HomeScreen';
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
import { initializeLocalDatabase } from './src/local/database';
import { AppShell } from './src/auth/AppShell';

const SESSIONS_STORAGE_KEY = 'workout.completed-sessions.v1';
const TROPHIES_STORAGE_KEY = 'workout.trophies.v1';
const PROGRESS_PHOTOS_STORAGE_KEY = 'workout.progress-photo-checkpoints.v1';
const PROGRESS_PHOTO_WEEKS = new Set([1, 3, 6]);

function PrototypeApp() {
  const [screen, setScreen] = useState<'home' | 'detail' | 'workout' | 'program-garage' | 'trophy-garage' | 'trophy-detail' | 'photo-prompt' | 'progress-photo-prompt'>('home');
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
        const storedSessions = await AsyncStorage.getItem(SESSIONS_STORAGE_KEY);
        const storedTrophies = await AsyncStorage.getItem(TROPHIES_STORAGE_KEY);
        const storedProgressPhotos = await AsyncStorage.getItem(PROGRESS_PHOTOS_STORAGE_KEY);
        if (storedSessions) {
          const parsedSessions: unknown = JSON.parse(storedSessions);
          if (Array.isArray(parsedSessions)) {
            setSessions(parsedSessions as WorkoutSession[]);
          }

        }
        if (storedTrophies) {
          const parsedTrophies: unknown = JSON.parse(storedTrophies);
          if (Array.isArray(parsedTrophies)) {
            setTrophyRecords(parsedTrophies as Trophy[]);
          }
        }
        if (storedProgressPhotos) {
          const parsedCheckpoints: unknown = JSON.parse(storedProgressPhotos);
          if (Array.isArray(parsedCheckpoints)) {
            setProgressPhotoCheckpoints(parsedCheckpoints as ProgressPhotoCheckpoint[]);
          }
        }
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
      void AsyncStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
    }
  }, [isHydrated, sessions]);

  useEffect(() => {
    if (isHydrated) {
      void AsyncStorage.setItem(TROPHIES_STORAGE_KEY, JSON.stringify(trophyRecords));
    }
  }, [isHydrated, trophyRecords]);

  useEffect(() => {
    if (isHydrated) {
      void AsyncStorage.setItem(PROGRESS_PHOTOS_STORAGE_KEY, JSON.stringify(progressPhotoCheckpoints));
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
        <HomeScreen
          programs={seedPrograms}
          summary={dashboardSummary}
          trophies={earnedTrophies}
          onSelectProgram={handleSelectProgram}
          onViewAllPrograms={() => setScreen('program-garage')}
          onSelectTrophy={handleSelectTrophy}
          onViewAllTrophies={() => setScreen('trophy-garage')}
        />
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
            await AsyncStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(updatedSessions));
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
