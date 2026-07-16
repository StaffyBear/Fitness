# Frever Fitness — Firebase + GitHub Pages

This app uses:

- GitHub Pages for hosting
- Firebase Authentication for email/password accounts
- Cloud Firestore for private user data

## Upload to GitHub

1. Create a new public repository called `frever-fitness`.
2. Extract this ZIP.
3. Upload `index.html`, `styles.css`, `app.js`, and `README.md` to the repository root.
4. Open the repository's **Settings → Pages**.
5. Select **Deploy from a branch**.
6. Choose `main` and `/ (root)`, then save.

## Important Firebase step: authorised domain

After GitHub Pages gives you the website address:

1. Open Firebase Console.
2. Open **Authentication**.
3. Open **Settings**.
4. Find **Authorised domains**.
5. Add your GitHub Pages hostname, for example `libbyyakas.github.io`.
6. Later, also add your custom hostname, for example `fitness.libbyyakas.com`.

Do not include `https://` or a path when adding a domain.

## Firestore rules

The current database is locked. The app needs authenticated users to access only their own data.

In the classic Firebase console, open **Firestore Database → Rules** and publish:

```text
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

If the new console does not provide an editable rules screen, switch to the classic Firebase console from the console menu/banner. The app will not be able to save anything while the existing rule remains `allow read, write: if false;`.

## Included features

- Register/login/logout
- Exercise dropdown and custom exercises
- Standard and left/right set tracking
- Reps, sets and weight
- Automatic PB list
- Workout history
- Body weight and measurements
- Stopwatch and rest countdown presets
- Sound/vibration at the end of a rest timer
- Per-user settings
- JSON backup export
