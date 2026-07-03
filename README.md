# Frever Fitness

Firebase version of the fitness tracker.

## What is included

- Firebase Auth login/register
- Firestore saving per user
- Exercise library
- Standard, left/right and single-side exercise tracking
- Workout logging
- PB calculation
- Body weight and measurements
- Settings
- JSON backup export
- Food tracking placeholder for later

## Firebase setup needed

Authentication must have Email/Password enabled.

Firestore rules should be:

```js
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

The app is plain HTML/CSS/JS and can be hosted with GitHub Pages.
