# Frever Fitness v2

A static GitHub Pages app using Firebase Authentication and Cloud Firestore.

## What is new in v2

- Exercises are stored in Firestore under each user account.
- Large plus/minus controls for reps, seconds and weight.
- Complete one set at a time and automatically start a rest timer.
- Personal best detection.
- Routine templates.
- Routine groups can contain one exercise, a superset, or three or more exercises.
- Each group can repeat for a chosen number of rounds.
- During a routine you can swap or skip an exercise for that workout only.
- Editing the routine changes future sessions without altering workout history.
- Starter Monday, Tuesday and Thursday exercises are seeded into Firestore on first login.

## GitHub Pages installation

1. Extract the ZIP.
2. Copy all files into the root of your existing Fitness GitHub repository.
3. Commit the changes and push them to the `main` branch.
4. GitHub Pages will redeploy automatically.

The repository root should contain:

```text
index.html
styles.css
app.js
firestore.rules
README.md
```

## Firestore security rules

This app stores everything below:

```text
users/{firebase-user-id}/...
```

In Firebase, open **Firestore → Rules** and deploy the contents of `firestore.rules`:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null
        && request.auth.uid == userId;
    }
  }
}
```

These rules require login and prevent one user from reading another user’s records.

## Firestore structure

Firestore is NoSQL, so it uses collections/documents rather than SQL tables:

```text
users
  userId
    exercises
      exerciseId
    routines
      routineId
    workouts
      workoutId
    bodyEntries
      bodyEntryId
    profile
      settings
```

The starter exercises are written into the `exercises` collection the first time a new user logs in. After that, the app reads the exercise dropdown from Firestore.

## Routine behaviour

A group with Leg Press and Underhand Lat Pulldown set to 3 rounds runs as:

```text
Leg Press — round 1
Underhand Lat Pulldown — round 1
Leg Press — round 2
Underhand Lat Pulldown — round 2
Leg Press — round 3
Underhand Lat Pulldown — round 3
```

During a workout:

- **Swap for today only** changes the exercise only in the active session.
- **Skip today** moves to the next exercise without modifying the routine.
- Editing a routine affects future workouts only.
