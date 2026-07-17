# Frever Fitness v3

A GitHub Pages web app using Firebase Authentication and Firestore.

## Updating the existing app

1. Extract this ZIP.
2. Copy `index.html`, `styles.css`, `app.js`, `firestore.rules` and this README into the root of the existing Fitness GitHub repository.
3. Replace the older files.
4. Commit and push to `main`.
5. GitHub Pages will redeploy automatically.

Existing Firebase users, exercises, routines, workouts and body entries remain in the same project.

## v3 changes

- Wishlist-style dashboard tile layout.
- Workout date condensed beside the page title.
- Removed the exercise information box and quick-add button from the workout screen.
- Larger gym-style reps and weight controls.
- Weight is available for every non-timed exercise.
- Dedicated workout-history page and workout detail view.
- Condensed body dashboard with separate add-entry forms.
- Weekly meal planner with breakfast, lunch, dinner and snacks.
- Existing routines, supersets, PBs, timer, exercise library and settings retained.

## Firestore rules

The app expects all user data beneath `users/{uid}/...`.

```text
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```
