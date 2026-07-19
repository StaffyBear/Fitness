# Frever Fitness v8.2 — Simplified Routines

This update keeps all existing Firebase data and focuses on the routine/workout flow.

## Changes
- Routine editor now stores only routine name, optional day, rounds and exercise order.
- Removed routine reps, weight, rest, date and notes fields.
- Starting a routine loads the first exercise round into the normal workout screen.
- **Next round** automatically loads the next group of exercises from the routine.
- Workout reps and weight now prefill from the most recently completed set for that exercise.
- The selected exercise shows its previous result beneath the selector.
- Saved routine workouts retain the routine name in history.

Upload the contents of this folder to the root of the Fitness2 test repository. Keep the existing CNAME file.

## v8.3 round-history fix

- New workouts save explicit round structure.
- Workout History displays Round 1, Round 2, etc.
- Exercises within each round use a responsive two-column grid and wrap for any number of exercises.
- Copy to Routine preserves the same round groupings.
- Legacy workouts that were accidentally stored as one exercise per round are shown in consecutive pairs as a compatibility repair.
- Includes null checks that prevent the login page from crashing when page-specific fields are absent.
