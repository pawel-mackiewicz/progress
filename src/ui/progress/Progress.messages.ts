export const PROGRESS_MESSAGES = {
  pl: {
    home: {
      eyebrow: 'DZISIEJSZA MISJA',
      title: 'Gotowy do gry?',
      completeTitle: 'Dzień zaliczony!',
      completeBody: 'Wszystkie cele rozbite. Jutro robimy to ponownie.',
      streak: 'seria {count} dni',
      streakZero: 'Zacznij serię dzisiaj',
      shieldZero: '0 tarcz',
      shieldOne: '1 tarcza',
      shieldTwo: '2 tarcze',
      emptyTitle: 'Brak aktywnych misji',
      emptyBody: 'Dodaj pierwsze ćwiczenie i rozpocznij dzisiejszą serię.',
      addExercise: 'Dodaj ćwiczenie',
      exerciseList: 'Dzisiejsze ćwiczenia',
      exerciseComplete: 'Wykonane',
      exerciseIncomplete: 'Do wykonania',
      expandExercise: 'Rozwiń {name}. Status: {status}',
      collapseExercise: 'Zwiń {name}. Status: {status}',
      loadError:
        'Nie udało się odczytać danych. Odśwież aplikację i spróbuj ponownie.',
      actionError: 'Nie udało się zapisać zmiany. Spróbuj ponownie.',
      undoMessage: 'Dodano +{count} do {name}',
      undo: 'Cofnij',
      archivedTitle: 'Archiwum ({count})',
      restore: 'Przywróć',
      restoreLabel: 'Przywróć ćwiczenie {name}'
    },
    card: {
      completed: 'CEL ZALICZONY',
      remaining: 'Zostało {count}',
      yesterday: 'Wczoraj: {count}',
      previousMax: 'Poprzedni maks.: {count}',
      progress: 'Postęp dla {name}: {current} z {goal}',
      addReps:
        'Dodaj {count} powtórzenie do {name} | Dodaj {count} powtórzeń do {name}',
      edit: 'Edytuj {name}'
    },
    calendar: {
      eyebrow: 'ZAPIS SERII',
      title: 'Kalendarz zwycięstw',
      previous: 'Poprzedni miesiąc',
      next: 'Następny miesiąc',
      completed: 'wszystkie cele wykonane',
      protected: 'seria ochroniona tarczą',
      today: 'dzisiaj'
    },
    celebration: {
      kicker: 'PERFECT DAY',
      title: 'Misja wykonana!',
      body: 'Wszystkie paski pełne. Seria trwa.'
    },
    form: {
      newEyebrow: 'NOWA MISJA',
      editEyebrow: 'USTAWIENIA MISJI',
      newTitle: 'Dodaj ćwiczenie',
      editTitle: 'Edytuj ćwiczenie',
      name: 'Nazwa ćwiczenia',
      namePlaceholder: 'np. Pompki',
      goal: 'Dzienny cel powtórzeń',
      goalPlaceholder: 'np. 100',
      save: 'Zapisz ćwiczenie',
      saving: 'Zapisywanie…',
      archive: 'Archiwizuj ćwiczenie',
      archiveConfirm: 'Zarchiwizować „{name}”? Historia pozostanie bezpieczna.',
      nameRequired: 'Wpisz nazwę ćwiczenia.',
      goalInvalid: 'Cel musi być dodatnią liczbą całkowitą.',
      duplicate: 'Aktywne ćwiczenie o tej nazwie już istnieje.',
      notFound: 'Nie znaleziono tego ćwiczenia.',
      saveError: 'Nie udało się zapisać ćwiczenia. Spróbuj ponownie.'
    }
  },
  en: {
    home: {
      eyebrow: "TODAY'S QUEST",
      title: 'Ready, player one?',
      completeTitle: 'Day cleared!',
      completeBody: 'Every goal crushed. Come back tomorrow and run it again.',
      streak: '{count} day streak',
      streakZero: 'Start your streak today',
      shieldZero: '0 shields',
      shieldOne: '1 shield',
      shieldTwo: '2 shields',
      emptyTitle: 'No active quests',
      emptyBody: 'Add your first exercise and start powering up today.',
      addExercise: 'Add exercise',
      exerciseList: "Today's exercises",
      exerciseComplete: 'Completed',
      exerciseIncomplete: 'Not completed',
      expandExercise: 'Expand {name}. Status: {status}',
      collapseExercise: 'Collapse {name}. Status: {status}',
      loadError:
        'Your data could not be loaded. Refresh the app and try again.',
      actionError: 'That change could not be saved. Try again.',
      undoMessage: 'Added +{count} to {name}',
      undo: 'Undo',
      archivedTitle: 'Archived ({count})',
      restore: 'Restore',
      restoreLabel: 'Restore {name}'
    },
    card: {
      completed: 'GOAL CLEARED',
      remaining: '{count} to go',
      yesterday: 'Yesterday: {count}',
      previousMax: 'Previous max: {count}',
      progress: 'Progress for {name}: {current} of {goal}',
      addReps: 'Add {count} rep to {name} | Add {count} reps to {name}',
      edit: 'Edit {name}'
    },
    calendar: {
      eyebrow: 'STREAK LOG',
      title: 'Victory calendar',
      previous: 'Previous month',
      next: 'Next month',
      completed: 'all goals completed',
      protected: 'streak protected by a shield',
      today: 'today'
    },
    celebration: {
      kicker: 'PERFECT DAY',
      title: 'Quest complete!',
      body: 'Every bar is full. Keep the streak alive.'
    },
    form: {
      newEyebrow: 'NEW QUEST',
      editEyebrow: 'QUEST SETTINGS',
      newTitle: 'Add an exercise',
      editTitle: 'Edit exercise',
      name: 'Exercise name',
      namePlaceholder: 'e.g. Push-ups',
      goal: 'Daily reps goal',
      goalPlaceholder: 'e.g. 100',
      save: 'Save exercise',
      saving: 'Saving…',
      archive: 'Archive exercise',
      archiveConfirm: 'Archive “{name}”? Its history will stay safe.',
      nameRequired: 'Enter an exercise name.',
      goalInvalid: 'The goal must be a positive whole number.',
      duplicate: 'An active exercise with this name already exists.',
      notFound: 'This exercise could not be found.',
      saveError: 'The exercise could not be saved. Try again.'
    }
  }
} as const
