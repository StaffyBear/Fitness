# Frever Fitness v4.1

A GitHub Pages web app using Firebase Authentication and Firestore.

## Updating

1. Extract this ZIP.
2. Replace the existing `index.html`, `styles.css`, `app.js`, `firestore.rules` and `README.md` files in the root of the Fitness GitHub repository.
3. Commit and push to `main`.
4. GitHub Pages will redeploy automatically.

Existing Firebase accounts and saved data remain unchanged.

## v4.1 changes

- Automatic rest timer is now optional and defaults to off.
- Added an on/off setting for automatic rest after saving a round.
- Fixed missing weight controls for older Firestore exercise records that did not include an `inputType` field.
- Removed **Start a routine** from the Workout page. Routines are started from the Routines page.
- Added a separate date field when adding measurements, allowing past measurement data to be entered.

## Firestore rules

No rule changes are required from v4.
