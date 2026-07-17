# Frever Fitness v4

GitHub Pages frontend with Firebase Authentication and Firestore.

## v4 changes

- Compact two-column dashboard on phones.
- Exercises and Settings moved behind **More**.
- Manual workouts are now logged by round rather than through a separate Sets form.
- Exercise 1 and Exercise 2 each have large reps/seconds and weight controls.
- The second exercise can be removed for a single-exercise round.
- **Save round** records both exercises together and carries the current values into the next round.
- Completed rounds are shown in a compact list.
- **Finish & save workout** stores all completed rounds in Firestore and keeps Workout History/PBs compatible.

## Update GitHub

Replace `index.html`, `styles.css`, `app.js`, `README.md`, and `firestore.rules` in the existing repository, commit, and push to `main`.

No Firebase project, account, or database migration is required.
