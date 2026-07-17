import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCH0nil4gFC03XmPFKJoxYvl3m5EcUeiTY",
  authDomain: "frever-fitness.firebaseapp.com",
  projectId: "frever-fitness",
  storageBucket: "frever-fitness.firebasestorage.app",
  messagingSenderId: "901554663270",
  appId: "1:901554663270:web:1f6d412d850f539a4aa2a7"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const $ = (id) => document.getElementById(id);
const today = () => new Date().toISOString().slice(0, 10);
const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const escapeHtml = (value = "") => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

let currentUser = null;
let exercises = [];
let workouts = [];
let routines = [];
let bodyEntries = [];
let mealPlans = [];
let mealWeekStart = startOfWeek(new Date());
let settings = { unit: "kg", weightMode: "total", measureUnit: "cm", defaultRest: 60, autoRest: false };
let manualSets = [];
let manualRounds = [];
let manualRoundNumber = 1;
let manualGroupExercises = [];
let editingWorkoutId = null;
let bodyChartMode = "weight";
let editingRoutineId = null;
let routineDraftBlocks = [];
let activeRoutineSession = null;
let confirmResolver = null;

const starterExercises = [
  { id: "leg-press", name: "Leg Press", category: "Legs", mode: "standard", inputType: "repsWeight", equipment: "Machine", defaultReps: 10, defaultWeight: 0, weightStep: 5, restSeconds: 60 },
  { id: "underhand-lat-pulldown", name: "Underhand Lat Pulldown", category: "Pull", mode: "standard", inputType: "repsWeight", equipment: "Cable machine", defaultReps: 10, defaultWeight: 0, weightStep: 2.5, restSeconds: 60 },
  { id: "romanian-deadlift", name: "Romanian Deadlift", category: "Legs", mode: "standard", inputType: "repsWeight", equipment: "Barbell or dumbbells", defaultReps: 10, defaultWeight: 0, weightStep: 2.5, restSeconds: 60 },
  { id: "face-pull", name: "Face Pull", category: "Pull", mode: "standard", inputType: "repsWeight", equipment: "Cable", defaultReps: 12, defaultWeight: 0, weightStep: 2.5, restSeconds: 45 },
  { id: "single-leg-rdl", name: "Single-leg Romanian Deadlift", category: "Legs", mode: "leftRight", inputType: "repsWeight", equipment: "Dumbbell", defaultReps: 10, defaultWeight: 0, weightStep: 1, restSeconds: 45 },
  { id: "goblet-squat", name: "Goblet Squat", category: "Legs", mode: "standard", inputType: "repsWeight", equipment: "Dumbbell", defaultReps: 10, defaultWeight: 0, weightStep: 2, restSeconds: 60 },
  { id: "dead-hang", name: "Dead Hang", category: "Pull", mode: "standard", inputType: "time", equipment: "Pull-up bar", defaultReps: 30, defaultWeight: 0, weightStep: 1, restSeconds: 60 },
  { id: "wall-sit", name: "Wall Sit", category: "Legs", mode: "standard", inputType: "time", equipment: "Bodyweight", defaultReps: 40, defaultWeight: 0, weightStep: 1, restSeconds: 60 },
  { id: "chest-press", name: "Chest Press", category: "Push", mode: "standard", inputType: "repsWeight", equipment: "Machine", defaultReps: 10, defaultWeight: 0, weightStep: 2.5, restSeconds: 60 },
  { id: "tricep-pushdown", name: "Tricep Pushdown", category: "Push", mode: "standard", inputType: "repsWeight", equipment: "Cable", defaultReps: 10, defaultWeight: 0, weightStep: 2.5, restSeconds: 45 },
  { id: "shoulder-press", name: "Shoulder Press", category: "Push", mode: "standard", inputType: "repsWeight", equipment: "Machine or dumbbells", defaultReps: 10, defaultWeight: 0, weightStep: 1, restSeconds: 60 },
  { id: "tricep-overhead-extension", name: "Tricep Overhead Extension", category: "Push", mode: "standard", inputType: "repsWeight", equipment: "Cable or dumbbell", defaultReps: 10, defaultWeight: 0, weightStep: 1, restSeconds: 45 },
  { id: "chest-fly", name: "Chest Fly", category: "Push", mode: "standard", inputType: "repsWeight", equipment: "Machine or cable", defaultReps: 10, defaultWeight: 0, weightStep: 1, restSeconds: 45 },
  { id: "lateral-raise", name: "Lateral Raise", category: "Push", mode: "standard", inputType: "repsWeight", equipment: "Dumbbells", defaultReps: 12, defaultWeight: 0, weightStep: 0.5, restSeconds: 45 },
  { id: "plank", name: "Plank", category: "Core", mode: "standard", inputType: "time", equipment: "Bodyweight", defaultReps: 40, defaultWeight: 0, weightStep: 1, restSeconds: 60 },
  { id: "lateral-pulldown", name: "Lat Pulldown", category: "Pull", mode: "standard", inputType: "repsWeight", equipment: "Cable machine", defaultReps: 10, defaultWeight: 0, weightStep: 2.5, restSeconds: 60 },
  { id: "hammer-curl", name: "Hammer Curl", category: "Pull", mode: "standard", inputType: "repsWeight", equipment: "Dumbbells", defaultReps: 10, defaultWeight: 0, weightStep: 1, restSeconds: 45 },
  { id: "seated-cable-row", name: "Seated Cable Row", category: "Pull", mode: "standard", inputType: "repsWeight", equipment: "Cable machine", defaultReps: 10, defaultWeight: 0, weightStep: 2.5, restSeconds: 60 },
  { id: "straight-arm-pushdown", name: "Straight Arm Pushdown", category: "Pull", mode: "standard", inputType: "repsWeight", equipment: "Cable", defaultReps: 10, defaultWeight: 0, weightStep: 2.5, restSeconds: 45 },
  { id: "pullover", name: "Pullover", category: "Pull", mode: "standard", inputType: "repsWeight", equipment: "Dumbbell", defaultReps: 10, defaultWeight: 0, weightStep: 1, restSeconds: 45 },
  { id: "dead-bug", name: "Dead Bug", category: "Core", mode: "standard", inputType: "repsOnly", equipment: "Bodyweight", defaultReps: 10, defaultWeight: 0, weightStep: 1, restSeconds: 45 }
];

function userCollection(name) {
  return collection(db, "users", currentUser.uid, name);
}
function userDoc(name, id) {
  return doc(db, "users", currentUser.uid, name, id);
}
function selectedExercise() {
  return exercises.find((exercise) => exercise.id === $("exerciseSelect").value) || exercises[0] || null;
}
function exerciseById(id) {
  return exercises.find((exercise) => exercise.id === id) || null;
}
function exerciseInputType(exercise) {
  if (!exercise) return "repsWeight";
  if (exercise.inputType) return exercise.inputType;
  // Older exercise documents did not always store inputType. Treat them as weighted by default.
  const name = String(exercise.name || "").toLowerCase();
  if (["dead hang", "wall sit", "plank"].some((term) => name.includes(term))) return "time";
  if (["dead bug", "deadbug"].some((term) => name.includes(term))) return "repsOnly";
  return "repsWeight";
}
function formatDate(date) {
  if (!date) return "Unknown date";
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
function startOfWeek(date) { const d = new Date(date); const day = (d.getDay()+6)%7; d.setHours(12,0,0,0); d.setDate(d.getDate()-day); return d; }
function isoDate(date){ return date.toISOString().slice(0,10); }
function addDays(date, amount){ const d=new Date(date); d.setDate(d.getDate()+amount); return d; }
function pageTitle(name){ return ({dashboard:"Dashboard",workout:"Workout",routines:"Routines",history:"Workout history",pbs:"Personal bests",body:"Body tracking",food:"Meal planner",timer:"Timer",library:"Exercises",settings:"Settings"})[name] || "Frever Fitness"; }

function showToast(message) {
  $("toastText").textContent = message;
  if (!$("toastDialog").open) $("toastDialog").showModal();
}
function askConfirm(title, text) {
  $("confirmTitle").textContent = title;
  $("confirmText").textContent = text;
  $("confirmDialog").showModal();
  return new Promise((resolve) => { confirmResolver = resolve; });
}
function switchTab(tabName) {
  document.querySelectorAll(".panel").forEach((element) => element.classList.remove("active"));
  $(tabName)?.classList.add("active");
  if ($("activePageTitle")) $("activePageTitle").textContent = pageTitle(tabName);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function seedExercisesIfNeeded() {
  const snapshot = await getDocs(userCollection("exercises"));
  if (!snapshot.empty) return;
  await Promise.all(starterExercises.map((exercise) => setDoc(userDoc("exercises", exercise.id), {
    ...exercise,
    builtIn: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  })));
}

async function loadCollection(name) {
  const snapshot = await getDocs(userCollection(name));
  return snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }));
}

async function loadAll() {
  await seedExercisesIfNeeded();
  [exercises, workouts, routines, bodyEntries, mealPlans] = await Promise.all([
    loadCollection("exercises"),
    loadCollection("workouts"),
    loadCollection("routines"),
    loadCollection("bodyEntries"),
    loadCollection("mealPlans")
  ]);
  const settingsSnapshot = await getDoc(doc(db, "users", currentUser.uid, "profile", "settings"));
  if (settingsSnapshot.exists()) settings = { ...settings, ...settingsSnapshot.data() };
  exercises.sort((a, b) => a.name.localeCompare(b.name));
  workouts.sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")) || number(b.createdAt?.seconds) - number(a.createdAt?.seconds));
  routines.sort((a, b) => a.name.localeCompare(b.name));
  bodyEntries.sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  renderEverything();
}

function renderEverything() {
  renderExerciseSelects();
  renderExerciseLibrary();
  renderRecentWorkouts();
  renderPBs();
  renderBody();
  renderRoutines();
  renderHistory();
  renderMealPlanner();
  applySettingsToUI();
  resetManualEntry(true);
}

function blankGroupExercise(exerciseId = null) {
  const exercise = exerciseById(exerciseId) || exercises[0] || null;
  return {
    uid: crypto.randomUUID(),
    exerciseId: exercise?.id || "",
    reps: number(exercise?.defaultReps, 10),
    weight: number(exercise?.defaultWeight, 0),
    side: exercise?.mode === "standard" ? "both" : "both",
    targetSets: 3,
    completedSets: []
  };
}

function renderExerciseSelects() {
  const optionHtml = exercises.map((exercise) => `<option value="${escapeHtml(exercise.id)}">${escapeHtml(exercise.name)}</option>`).join("");
  document.querySelectorAll("select[data-exercise-select], #exerciseSelect").forEach((element) => {
    const current = element.value;
    element.innerHTML = optionHtml;
    if (exercises.some((exercise) => exercise.id === current)) element.value = current;
  });
  if (!manualGroupExercises.length && exercises.length) {
    manualGroupExercises = [blankGroupExercise(exercises[0]?.id), blankGroupExercise(exercises[1]?.id || exercises[0]?.id)];
  }
  renderManualRound();
}

function selectedExercise() {
  return exercises.find((exercise) => exercise.id === $("exerciseSelect")?.value) || exercises[0] || null;
}
function updateExerciseInfo() {}
function renderSideButtons() {}
function renderCompletedSets() { renderCompletedRounds(); }
function completeManualSet() { saveCurrentPass(); }
function savePairRound() { saveCurrentPass(); }
function saveManualWorkout() { return savePairWorkout(); }

function sideOptions(exercise, selected) {
  if (!exercise || exercise.mode === "standard") return "";
  return `<div class="segmented compact-side" role="group" aria-label="Side">
    ${["both","left","right"].map(side => `<button class="${selected === side ? "active" : ""}" data-group-side="${side}" type="button">${side[0].toUpperCase()+side.slice(1)}</button>`).join("")}
  </div>`;
}

function groupExerciseCard(item, index) {
  const exercise = exerciseById(item.exerciseId) || exercises[0];
  if (!exercise) return "";
  const inputType = exerciseInputType(exercise);
  const completed = item.completedSets || [];
  return `<article class="exercise-round-card flexible-exercise-card" data-group-uid="${item.uid}">
    <div class="row between gap">
      <label class="grow">Exercise ${index + 1}<select data-group-field="exerciseId">${exercises.map(ex => `<option value="${escapeHtml(ex.id)}" ${ex.id === item.exerciseId ? "selected" : ""}>${escapeHtml(ex.name)}</option>`).join("")}</select></label>
      ${manualGroupExercises.length > 1 ? `<button class="ghost small" data-remove-group-exercise type="button">Remove</button>` : ""}
    </div>
    ${sideOptions(exercise, item.side)}
    <div class="compact-control-grid">
      <div class="mini-stepper"><span>${inputType === "time" ? "SECONDS" : "REPS"}</span><div><button data-group-adjust="reps" data-delta="-1" type="button">▼</button><input data-group-field="reps" inputmode="numeric" value="${number(item.reps,10)}"/><button data-group-adjust="reps" data-delta="1" type="button">▲</button></div></div>
      <div class="mini-stepper ${inputType !== "repsWeight" ? "hidden" : ""}"><span>WEIGHT (${escapeHtml(settings.unit)})</span><div><button data-group-adjust="weight" data-delta="-1" type="button">▼</button><input data-group-field="weight" inputmode="decimal" value="${number(item.weight)}"/><button data-group-adjust="weight" data-delta="1" type="button">▲</button></div></div>
    </div>
    <div class="set-target-row"><span>${completed.length} of ${item.targetSets} sets saved</span><div class="row gap"><button class="secondary small" data-save-single-set type="button">✓ Save set</button><button class="ghost small" data-add-target-set type="button">+ Set</button></div></div>
    <div class="inline-set-list">${completed.map((set, setIndex) => `<button class="saved-set-chip" data-edit-inline-set="${setIndex}" type="button">Set ${setIndex+1}: ${set.inputType === "time" ? `${set.reps}s` : set.inputType === "repsOnly" ? `${set.reps} reps` : `${set.reps} × ${set.weight}${settings.unit}`}${set.side !== "both" ? ` · ${set.side}` : ""} ✎</button>`).join("")}</div>
  </article>`;
}

function renderManualRound() {
  if (!$("roundExerciseList")) return;
  $("roundHeading").textContent = `Round ${manualRoundNumber}`;
  $("roundExerciseList").innerHTML = manualGroupExercises.map(groupExerciseCard).join("");
  renderCompletedRounds();
}

function syncManualGroupFromDOM() {
  document.querySelectorAll("[data-group-uid]").forEach(card => {
    const item = manualGroupExercises.find(entry => entry.uid === card.dataset.groupUid);
    if (!item) return;
    card.querySelectorAll("[data-group-field]").forEach(input => {
      const field = input.dataset.groupField;
      item[field] = field === "exerciseId" ? input.value : number(input.value);
    });
  });
}

function currentSetFor(item) {
  const exercise = exerciseById(item.exerciseId);
  if (!exercise) return null;
  return {
    exerciseId: exercise.id,
    exerciseName: exercise.name,
    inputType: exerciseInputType(exercise),
    reps: number(item.reps),
    weight: exerciseInputType(exercise) === "repsWeight" ? number(item.weight) : 0,
    side: exercise.mode === "standard" ? "both" : (item.side || "both"),
    notes: $("roundNotes")?.value.trim() || "",
    completedAt: new Date().toISOString()
  };
}

function calculatePBForSet(exerciseId, set) {
  const previous = workouts.flatMap(workout => workout.exercises || []).filter(entry => entry.exerciseId === exerciseId).flatMap(entry => entry.sets || []).filter(entry => (entry.side || "both") === (set.side || "both"));
  const current = manualRounds.flatMap(round => round.entries || []).filter(entry => entry.exerciseId === exerciseId && (entry.side || "both") === (set.side || "both"));
  const all = [...previous, ...current];
  if (!all.length) return true;
  if (set.inputType === "time" || set.inputType === "repsOnly") return set.reps > Math.max(...all.map(entry => number(entry.reps)));
  const bestWeight = Math.max(...all.map(entry => number(entry.weight)));
  const bestRepsAtWeight = Math.max(0, ...all.filter(entry => number(entry.weight) === set.weight).map(entry => number(entry.reps)));
  return set.weight > bestWeight || (set.weight === bestWeight && set.reps > bestRepsAtWeight);
}

function saveOneSet(uid) {
  syncManualGroupFromDOM();
  const item = manualGroupExercises.find(entry => entry.uid === uid);
  if (!item) return;
  const set = currentSetFor(item);
  if (!set || set.reps <= 0) return showToast("Enter at least one rep or second.");
  set.isPB = calculatePBForSet(set.exerciseId, set);
  item.completedSets.push(set);
  manualRounds.push({ roundNumber: manualRoundNumber, passNumber: item.completedSets.length, entries: [set] });
  if (item.completedSets.length >= item.targetSets) item.targetSets = item.completedSets.length;
  renderManualRound();
  if (settings.autoRest) startAutomaticRest(exerciseById(item.exerciseId)?.restSeconds || settings.defaultRest);
}

function saveCurrentPass() {
  syncManualGroupFromDOM();
  const entries = [];
  manualGroupExercises.forEach(item => {
    if (item.completedSets.length >= item.targetSets) return;
    const set = currentSetFor(item);
    if (!set || set.reps <= 0) return;
    set.isPB = calculatePBForSet(set.exerciseId, set);
    item.completedSets.push(set);
    entries.push(set);
  });
  if (!entries.length) return showToast("All planned sets are already saved. Add another set or start the next round.");
  manualRounds.push({ roundNumber: manualRoundNumber, passNumber: Math.max(...manualGroupExercises.map(item => item.completedSets.length)), entries });
  renderManualRound();
  if (settings.autoRest) startAutomaticRest(Math.max(...entries.map(entry => exerciseById(entry.exerciseId)?.restSeconds || settings.defaultRest)));
}

function addManualExercise() {
  syncManualGroupFromDOM();
  manualGroupExercises.push(blankGroupExercise(exercises.find(ex => !manualGroupExercises.some(item => item.exerciseId === ex.id))?.id || exercises[0]?.id));
  renderManualRound();
}

function startNextRound() {
  const unfinished = manualGroupExercises.some(item => item.completedSets.length < item.targetSets);
  if (unfinished && !confirm("Some planned sets are not saved. Start the next round anyway?")) return;
  manualRoundNumber += 1;
  manualGroupExercises = [blankGroupExercise(manualGroupExercises[0]?.exerciseId), blankGroupExercise(manualGroupExercises[1]?.exerciseId || exercises[1]?.id || exercises[0]?.id)];
  renderManualRound();
}

function resetManualEntry(keepExercise = false) {
  const ids = keepExercise ? manualGroupExercises.slice(0,2).map(item => item.exerciseId) : [];
  manualSets = [];
  manualRounds = [];
  manualRoundNumber = 1;
  manualGroupExercises = [blankGroupExercise(ids[0] || exercises[0]?.id), blankGroupExercise(ids[1] || exercises[1]?.id || exercises[0]?.id)];
  if ($("roundNotes")) $("roundNotes").value = "";
  $("roundNotesWrap")?.classList.add("hidden");
  renderManualRound();
}

function renderCompletedRounds() {
  const count = manualRounds.reduce((total, round) => total + (round.entries?.length || 0), 0);
  if ($("completedSetCount")) $("completedSetCount").textContent = String(count);
  if (!manualRounds.length) {
    $("completedRounds").innerHTML = `<p class="muted">No sets completed yet.</p>`;
    return;
  }
  const grouped = new Map();
  manualRounds.forEach((round, sourceIndex) => {
    const key = round.roundNumber || 1;
    if (!grouped.has(key)) grouped.set(key, []);
    (round.entries || []).forEach(entry => grouped.get(key).push({ ...entry, sourceIndex }));
  });
  $("completedRounds").innerHTML = [...grouped.entries()].map(([roundNo, entries]) => `<div class="complete-round"><div class="row between"><div class="round-label">Round ${roundNo}</div><button class="secondary small" data-edit-round="${roundNo}" type="button">Edit round</button></div>${entries.map((entry,index) => {
    const value = entry.inputType === "time" ? `${entry.reps} sec` : entry.inputType === "repsOnly" ? `${entry.reps} reps` : `${entry.reps} reps @ ${entry.weight} ${settings.unit}`;
    return `<div class="complete-line"><span>${escapeHtml(entry.exerciseName)}${entry.side !== "both" ? ` · ${escapeHtml(entry.side)}` : ""}</span><strong>${escapeHtml(value)}${entry.isPB ? " · PB" : ""}</strong></div>`;
  }).join("")}</div>`).join("");
}

function editCompletedRound(roundNo) {
  const entries = manualRounds.filter(round => Number(round.roundNumber) === Number(roundNo)).flatMap(round => round.entries || []);
  if (!entries.length) return;
  manualGroupExercises = entries.reduce((list, entry) => {
    let item = list.find(row => row.exerciseId === entry.exerciseId && row.side === entry.side);
    if (!item) { item = blankGroupExercise(entry.exerciseId); item.side = entry.side || "both"; item.completedSets = []; item.targetSets = 0; list.push(item); }
    item.completedSets.push({ ...entry }); item.targetSets += 1; item.reps = entry.reps; item.weight = entry.weight;
    return list;
  }, []);
  manualRounds = manualRounds.filter(round => Number(round.roundNumber) !== Number(roundNo));
  manualRoundNumber = Number(roundNo);
  renderManualRound();
  showToast(`Round ${roundNo} reopened for editing.`);
}

async function savePairWorkout() {
  if (!manualRounds.length) return showToast("Save at least one set first.");
  const grouped = new Map();
  manualRounds.forEach(round => (round.entries || []).forEach(entry => {
    const key = `${entry.exerciseId}|${entry.side || "both"}`;
    if (!grouped.has(key)) grouped.set(key, { exerciseId: entry.exerciseId, exerciseName: entry.exerciseName, sets: [] });
    grouped.get(key).sets.push({ setNumber: grouped.get(key).sets.length + 1, reps: entry.reps, weight: entry.weight, inputType: entry.inputType, side: entry.side, notes: entry.notes, completedAt: entry.completedAt, isPB: entry.isPB, roundNumber: round.roundNumber });
  }));
  const workout = { date: $("workoutDate").value || today(), source: "manual", routineId: null, routineName: null, notes: $("roundNotes")?.value.trim() || "", exercises: [...grouped.values()], createdAt: serverTimestamp() };
  const ref = await addDoc(userCollection("workouts"), workout);
  workouts.unshift({ id: ref.id, ...workout, createdAt: { seconds: Math.floor(Date.now()/1000) } });
  resetManualEntry(true);
  renderPBs(); renderHistory(); renderExerciseLibrary(); renderBodyChart();
  showToast("Workout saved.");
}

function renderRecentWorkouts() {
  const container = $("recentWorkouts");
  if (!container) return;
  if (!workouts.length) {
    container.innerHTML = `<p class="muted">No workouts saved yet.</p>`;
    return;
  }
  container.innerHTML = workouts.slice(0, 12).map((workout) => {
    const names = (workout.exercises || []).map((entry) => entry.exerciseName || exerciseById(entry.exerciseId)?.name || "Exercise");
    const sets = (workout.exercises || []).reduce((total, entry) => total + (entry.sets?.length || 0), 0);
    return `<div class="item"><div class="item-title">${escapeHtml(workout.routineName || names.join(" · ") || "Workout")}</div><div class="item-meta">${formatDate(workout.date)} · ${sets} completed set${sets === 1 ? "" : "s"}</div><div class="item-actions"><button class="danger small" data-delete-workout="${escapeHtml(workout.id)}" type="button">Delete</button></div></div>`;
  }).join("");
}

function allCompletedSets() {
  return workouts.flatMap((workout) => (workout.exercises || []).flatMap((entry) => (entry.sets || []).map((set) => ({ ...set, exerciseId: entry.exerciseId, exerciseName: entry.exerciseName, date: workout.date }))));
}

function renderPBs() {
  const sets = allCompletedSets();
  if (!sets.length) { $("pbList").innerHTML = `<p class="muted">Save a workout to calculate PBs.</p>`; return; }
  const groups = new Map();
  for (const set of sets) {
    const key = `${set.exerciseId}|${set.side || "both"}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(set);
  }
  const cards = [];
  for (const [key, entries] of groups) {
    const [exerciseId, side] = key.split("|");
    const exercise = exerciseById(exerciseId);
    let best;
    if (exerciseInputType(exercise) === "time" || exerciseInputType(exercise) === "repsOnly") best = [...entries].sort((a,b)=>number(b.reps)-number(a.reps))[0];
    else best = [...entries].sort((a,b)=>number(b.weight)-number(a.weight)||number(b.reps)-number(a.reps))[0];
    const value = exerciseInputType(exercise) === "time" ? `${best.reps} sec` : exerciseInputType(exercise) === "repsOnly" ? `${best.reps} reps` : `${best.weight} ${settings.unit} × ${best.reps}`;
    cards.push(`<button class="item history-item" data-pb-exercise="${escapeHtml(exerciseId)}" data-pb-side="${escapeHtml(side)}" type="button"><div class="item-title">${escapeHtml(exercise?.name || best.exerciseName || "Exercise")}${side !== "both" ? ` — ${escapeHtml(side)}` : ""}</div><div class="item-meta"><span class="pb-badge">PB</span> ${escapeHtml(value)} · ${formatDate(best.date)}<br><span class="link-hint">Tap for progress graph</span></div></button>`);
  }
  $("pbList").innerHTML = cards.join("");
}

function drawLineChart(canvas, points, labelFormatter = value => String(value)) {
  const ctx = canvas.getContext("2d");
  const ratio = window.devicePixelRatio || 1;
  const width = canvas.clientWidth || 700, height = 280;
  canvas.width = width * ratio; canvas.height = height * ratio; ctx.scale(ratio, ratio);
  ctx.clearRect(0,0,width,height);
  if (!points.length) return false;
  const pad = {l:48,r:18,t:22,b:42};
  const values = points.map(p=>number(p.value));
  let min = Math.min(...values), max = Math.max(...values); if (min===max){min-=1;max+=1;}
  const x = i => pad.l + (points.length===1 ? (width-pad.l-pad.r)/2 : i*(width-pad.l-pad.r)/(points.length-1));
  const y = v => pad.t + (max-v)*(height-pad.t-pad.b)/(max-min);
  ctx.strokeStyle = "#d9d0df"; ctx.lineWidth=1;
  for(let i=0;i<4;i++){const yy=pad.t+i*(height-pad.t-pad.b)/3;ctx.beginPath();ctx.moveTo(pad.l,yy);ctx.lineTo(width-pad.r,yy);ctx.stroke();}
  ctx.fillStyle="#655d69"; ctx.font="12px system-ui"; ctx.textAlign="right";
  ctx.fillText(labelFormatter(max),pad.l-8,pad.t+4); ctx.fillText(labelFormatter(min),pad.l-8,height-pad.b+4);
  ctx.strokeStyle="#7b5a91"; ctx.lineWidth=3; ctx.beginPath(); points.forEach((p,i)=>{const xx=x(i),yy=y(p.value); i?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy)}); ctx.stroke();
  ctx.fillStyle="#7b5a91"; points.forEach((p,i)=>{ctx.beginPath();ctx.arc(x(i),y(p.value),4,0,Math.PI*2);ctx.fill();});
  ctx.fillStyle="#655d69";ctx.textAlign="center";const labels=points.length>5?[0,Math.floor((points.length-1)/2),points.length-1]:points.map((_,i)=>i);labels.forEach(i=>ctx.fillText(new Date(`${points[i].date}T12:00:00`).toLocaleDateString("en-GB",{day:"2-digit",month:"short"}),x(i),height-15));
  return true;
}

function openPBChart(exerciseId, side="both") {
  const exercise=exerciseById(exerciseId); const sets=allCompletedSets().filter(s=>s.exerciseId===exerciseId&&(s.side||"both")===side).sort((a,b)=>String(a.date).localeCompare(String(b.date)));
  $("pbChartTitle").textContent=`${exercise?.name||"Exercise"}${side!=="both"?` — ${side}`:""}`;
  const byDate=new Map(); sets.forEach(set=>{const val=exerciseInputType(exercise)==="repsWeight"?number(set.weight):number(set.reps);byDate.set(set.date,Math.max(val,byDate.get(set.date)??-Infinity));});
  const points=[...byDate].map(([date,value])=>({date,value}));
  drawLineChart($("pbChart"),points,v=>exerciseInputType(exercise)==="repsWeight"?`${v}${settings.unit}`:`${v}${exerciseInputType(exercise)==="time"?"s":""}`);
  $("pbChartList").innerHTML=[...sets].reverse().slice(0,20).map(set=>`<div class="item"><div class="item-title">${formatDate(set.date)}</div><div class="item-meta">${set.inputType==="time"?`${set.reps} sec`:set.inputType==="repsOnly"?`${set.reps} reps`:`${set.weight} ${settings.unit} × ${set.reps}`}</div></div>`).join("");
  $("pbChartDialog").showModal();
}

function renderExerciseLibrary() {
  const queryText = $("exerciseSearch")?.value.trim().toLowerCase() || "";
  const filtered = exercises.filter((exercise) => `${exercise.name} ${exercise.category} ${exercise.equipment}`.toLowerCase().includes(queryText));
  if (!filtered.length) {
    $("exerciseList").innerHTML = `<p class="muted">No matching exercises.</p>`;
    return;
  }
  $("exerciseList").innerHTML = filtered.map((exercise) => {
    const last = lastCompletedForExercise(exercise.id);
    return `<div class="item"><div class="item-title">${escapeHtml(exercise.name)}</div><div class="item-meta">${escapeHtml(exercise.category || "Other")} · ${escapeHtml(exercise.equipment || "No equipment")}<br>Last completed: ${last ? formatDate(last) : "Never"}</div><div class="item-actions"><button class="secondary small" data-edit-exercise="${escapeHtml(exercise.id)}" type="button">Edit</button><button class="danger small" data-delete-exercise="${escapeHtml(exercise.id)}" type="button">Delete</button></div></div>`;
  }).join("");
}

function lastCompletedForExercise(exerciseId) {
  return workouts.find((workout) => (workout.exercises || []).some((entry) => entry.exerciseId === exerciseId))?.date || null;
}

function clearExerciseForm() {
  $("editingExerciseId").value = "";
  $("exerciseFormTitle").textContent = "Add exercise";
  $("exName").value = "";
  $("exCategory").value = "Push";
  $("exMode").value = "standard";
  $("exInputType").value = "repsWeight";
  $("exEquipment").value = "";
  $("exDefaultReps").value = "10";
  $("exDefaultWeight").value = "0";
  $("exWeightStep").value = "2.5";
  $("exRestSeconds").value = String(settings.defaultRest);
  $("exDemo").value = "";
  $("exNotes").value = "";
  $("cancelExerciseEditBtn").classList.add("hidden");
}

function editExercise(id) {
  const exercise = exerciseById(id);
  if (!exercise) return;
  $("editingExerciseId").value = exercise.id;
  $("exerciseFormTitle").textContent = `Edit ${exercise.name}`;
  $("exName").value = exercise.name || "";
  $("exCategory").value = exercise.category || "Push";
  $("exMode").value = exercise.mode || "standard";
  $("exInputType").value = exercise.inputType || "repsWeight";
  $("exEquipment").value = exercise.equipment || "";
  $("exDefaultReps").value = exercise.defaultReps ?? 10;
  $("exDefaultWeight").value = exercise.defaultWeight ?? 0;
  $("exWeightStep").value = exercise.weightStep ?? 2.5;
  $("exRestSeconds").value = exercise.restSeconds ?? settings.defaultRest;
  $("exDemo").value = exercise.demo || "";
  $("exNotes").value = exercise.notes || "";
  $("cancelExerciseEditBtn").classList.remove("hidden");
  switchTab("library");
  $("exerciseFormTitle").scrollIntoView({ behavior: "smooth", block: "start" });
}

async function saveExercise() {
  const name = $("exName").value.trim();
  if (!name) return showToast("Enter an exercise name.");
  const editingId = $("editingExerciseId").value;
  const id = editingId || `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${Date.now().toString().slice(-5)}`;
  const exercise = {
    name,
    category: $("exCategory").value,
    mode: $("exMode").value,
    inputType: $("exInputType").value,
    equipment: $("exEquipment").value.trim(),
    defaultReps: number($("exDefaultReps").value, 10),
    defaultWeight: number($("exDefaultWeight").value),
    weightStep: number($("exWeightStep").value, 2.5),
    restSeconds: number($("exRestSeconds").value, settings.defaultRest),
    demo: $("exDemo").value.trim(),
    notes: $("exNotes").value.trim(),
    builtIn: editingId ? exerciseById(editingId)?.builtIn || false : false,
    updatedAt: serverTimestamp()
  };
  await setDoc(userDoc("exercises", id), exercise, { merge: true });
  const existingIndex = exercises.findIndex((entry) => entry.id === id);
  if (existingIndex >= 0) exercises[existingIndex] = { id, ...exercises[existingIndex], ...exercise };
  else exercises.push({ id, ...exercise });
  exercises.sort((a, b) => a.name.localeCompare(b.name));
  clearExerciseForm();
  renderExerciseSelects();
  renderExerciseLibrary();
  renderRoutines();
  showToast(editingId ? "Exercise updated." : "Exercise added.");
}

function blankRoutineBlock() {
  return {
    id: crypto.randomUUID(),
    name: `Group ${routineDraftBlocks.length + 1}`,
    rounds: 3,
    restAfterRound: settings.defaultRest,
    exercises: [{ exerciseId: exercises[0]?.id || "", defaultReps: exercises[0]?.defaultReps || 10, defaultWeight: exercises[0]?.defaultWeight || 0 }]
  };
}

function openRoutineEditor(routine = null) {
  editingRoutineId = routine?.id || null;
  $("routineEditorTitle").textContent = routine ? `Edit ${routine.name}` : "New routine";
  $("routineName").value = routine?.name || "";
  $("routineDay").value = routine?.day || "";
  $("routineStartDate").value = routine?.startDate || today();
  $("routineEndDate").value = routine?.endDate || "";
  $("routineNotes").value = routine?.notes || "";
  routineDraftBlocks = routine?.blocks ? structuredClone(routine.blocks).map((block) => ({ ...block, id: block.id || crypto.randomUUID() })) : [blankRoutineBlock()];
  $("routineEditor").classList.remove("hidden");
  renderRoutineBlocks();
  $("routineEditor").scrollIntoView({ behavior: "smooth", block: "start" });
}

function closeRoutineEditor() {
  $("routineEditor").classList.add("hidden");
  editingRoutineId = null;
  routineDraftBlocks = [];
}

function renderRoutineBlocks() {
  if (!routineDraftBlocks.length) routineDraftBlocks.push(blankRoutineBlock());
  $("routineBlocks").innerHTML = routineDraftBlocks.map((block, blockIndex) => `
    <div class="block-card" data-block-index="${blockIndex}">
      <div class="block-head">
        <strong>Group ${blockIndex + 1}</strong>
        <button class="danger small" data-remove-block="${blockIndex}" type="button">Remove group</button>
      </div>
      <div class="grid two">
        <label>Group name<input data-block-field="name" value="${escapeHtml(block.name || `Group ${blockIndex + 1}`)}" /></label>
        <label>Rounds<input data-block-field="rounds" inputmode="numeric" value="${number(block.rounds, 3)}" /></label>
        <label>Rest after each round (seconds)<input data-block-field="restAfterRound" inputmode="numeric" value="${number(block.restAfterRound, settings.defaultRest)}" /></label>
      </div>
      <div class="block-exercises">
        ${(block.exercises || []).map((entry, exerciseIndex) => routineExerciseRow(blockIndex, exerciseIndex, entry)).join("")}
      </div>
      <button class="secondary small top-gap" data-add-block-exercise="${blockIndex}" type="button">+ Add exercise to group</button>
    </div>`).join("");
}

function routineExerciseRow(blockIndex, exerciseIndex, entry) {
  return `<div class="block-exercise-row" data-block-exercise="${blockIndex}:${exerciseIndex}">
    <label class="exercise-pick">Exercise<select data-routine-exercise-field="exerciseId">${exercises.map((exercise) => `<option value="${escapeHtml(exercise.id)}" ${exercise.id === entry.exerciseId ? "selected" : ""}>${escapeHtml(exercise.name)}</option>`).join("")}</select></label>
    <label>Reps / sec<input data-routine-exercise-field="defaultReps" inputmode="numeric" value="${number(entry.defaultReps, 10)}" /></label>
    <label>Weight<input data-routine-exercise-field="defaultWeight" inputmode="decimal" value="${number(entry.defaultWeight)}" /></label>
    <button class="danger small remove-block-exercise" data-remove-block-exercise="${blockIndex}:${exerciseIndex}" type="button">Remove</button>
  </div>`;
}

function syncRoutineDraftFromDOM() {
  document.querySelectorAll("[data-block-index]").forEach((blockElement) => {
    const blockIndex = number(blockElement.dataset.blockIndex);
    const block = routineDraftBlocks[blockIndex];
    if (!block) return;
    blockElement.querySelectorAll("[data-block-field]").forEach((input) => {
      const field = input.dataset.blockField;
      block[field] = field === "name" ? input.value : number(input.value);
    });
    blockElement.querySelectorAll("[data-block-exercise]").forEach((row) => {
      const [, exerciseIndexText] = row.dataset.blockExercise.split(":");
      const exerciseIndex = number(exerciseIndexText);
      const entry = block.exercises[exerciseIndex];
      row.querySelectorAll("[data-routine-exercise-field]").forEach((input) => {
        const field = input.dataset.routineExerciseField;
        entry[field] = field === "exerciseId" ? input.value : number(input.value);
      });
    });
  });
}

async function saveRoutine() {
  syncRoutineDraftFromDOM();
  const name = $("routineName").value.trim();
  if (!name) return showToast("Enter a routine name.");
  if (!routineDraftBlocks.length || routineDraftBlocks.some((block) => !block.exercises?.length)) return showToast("Each group needs at least one exercise.");
  const payload = {
    name,
    day: $("routineDay").value.trim(),
    startDate: $("routineStartDate").value || today(),
    endDate: $("routineEndDate").value || "",
    notes: $("routineNotes").value.trim(),
    blocks: routineDraftBlocks.map((block, index) => ({
      id: block.id || crypto.randomUUID(),
      order: index,
      name: block.name || `Group ${index + 1}`,
      rounds: Math.max(1, number(block.rounds, 3)),
      restAfterRound: Math.max(0, number(block.restAfterRound, settings.defaultRest)),
      exercises: block.exercises.map((entry) => ({ exerciseId: entry.exerciseId, defaultReps: number(entry.defaultReps, 10), defaultWeight: number(entry.defaultWeight) }))
    })),
    updatedAt: serverTimestamp()
  };
  let id = editingRoutineId;
  if (id) await setDoc(userDoc("routines", id), payload, { merge: true });
  else {
    const ref = await addDoc(userCollection("routines"), { ...payload, createdAt: serverTimestamp() });
    id = ref.id;
  }
  const index = routines.findIndex((routine) => routine.id === id);
  if (index >= 0) routines[index] = { id, ...routines[index], ...payload };
  else routines.push({ id, ...payload });
  routines.sort((a, b) => a.name.localeCompare(b.name));
  closeRoutineEditor();
  renderRoutines();
  showToast("Routine saved.");
}

function renderRoutines() {
  if (!routines.length) {
    $("routineList").innerHTML = `<p class="muted">No routines yet. Create one to organise exercises into supersets or groups.</p>`;
    return;
  }
  $("routineList").innerHTML = routines.map((routine) => {
    const groupText = (routine.blocks || []).map((block) => `${block.name || "Group"}: ${(block.exercises || []).map((entry) => exerciseById(entry.exerciseId)?.name || "Missing exercise").join(" + ")} × ${block.rounds || 1} rounds`).join("<br>");
    return `<div class="item routine-card"><div class="item-title">${escapeHtml(routine.name)}</div><div class="item-meta">${escapeHtml(routine.day || "No day set")} · ${routine.startDate ? `from ${formatDate(routine.startDate)}` : ""}${routine.endDate ? ` to ${formatDate(routine.endDate)}` : ""}<br>${groupText}</div><div class="item-actions"><button class="primary small" data-start-routine="${escapeHtml(routine.id)}" type="button">Start routine</button><button class="secondary small" data-edit-routine="${escapeHtml(routine.id)}" type="button">Edit</button><button class="danger small" data-delete-routine="${escapeHtml(routine.id)}" type="button">Delete</button></div></div>`;
  }).join("");
}

function buildRoutineSequence(routine) {
  const sequence = [];
  (routine.blocks || []).forEach((block, blockIndex) => {
    for (let round = 1; round <= Math.max(1, number(block.rounds, 1)); round += 1) {
      (block.exercises || []).forEach((entry, exerciseIndex) => {
        sequence.push({
          blockIndex,
          blockName: block.name || `Group ${blockIndex + 1}`,
          round,
          totalRounds: block.rounds,
          exerciseIndex,
          exerciseId: entry.exerciseId,
          defaultReps: entry.defaultReps,
          defaultWeight: entry.defaultWeight,
          restAfterRound: block.restAfterRound,
          isLastInRound: exerciseIndex === block.exercises.length - 1
        });
      });
    }
  });
  return sequence;
}

function startRoutine(id) {
  const routine = routines.find((entry) => entry.id === id);
  if (!routine) return;
  activeRoutineSession = {
    routineId: routine.id,
    routineName: routine.name,
    date: today(),
    sequence: buildRoutineSequence(routine),
    currentIndex: 0,
    completed: [],
    skipped: []
  };
  $("routineSessionCard").classList.remove("hidden");
  $("manualWorkoutCard")?.classList.add("hidden");
  $("manualSetCard")?.classList.add("hidden");
  renderRoutineSession();
  switchTab("workout");
}

function currentRoutineStep() {
  return activeRoutineSession?.sequence[activeRoutineSession.currentIndex] || null;
}

function renderRoutineSession() {
  if (!activeRoutineSession) return;
  const step = currentRoutineStep();
  if (!step) return finishRoutineSessionPrompt();
  const exercise = exerciseById(step.exerciseId);
  if (!exercise) return;
  const progress = activeRoutineSession.sequence.length ? (activeRoutineSession.currentIndex / activeRoutineSession.sequence.length) * 100 : 0;
  $("routineSessionCard").innerHTML = `
    <div class="row between gap"><div><h2>${escapeHtml(activeRoutineSession.routineName)}</h2><p class="muted compact">${escapeHtml(step.blockName)} · Round ${step.round} of ${step.totalRounds}</p></div><button id="endRoutineEarlyBtn" class="danger small" type="button">End early</button></div>
    <div class="session-progress"><div style="width:${progress}%"></div></div>
    <h2 class="session-title">${escapeHtml(exercise.name)}</h2>
    <p class="session-meta">Exercise ${activeRoutineSession.currentIndex + 1} of ${activeRoutineSession.sequence.length}</p>
    <label>Swap for today only<select id="routineSwapExercise">${exercises.map((entry) => `<option value="${escapeHtml(entry.id)}" ${entry.id === exercise.id ? "selected" : ""}>${escapeHtml(entry.name)}</option>`).join("")}</select></label>
    <div id="routineSideWrap" class="segmented ${exercise.mode === "standard" ? "hidden" : ""}"><button data-routine-side="left" class="active" type="button">Left</button><button data-routine-side="right" type="button">Right</button><button data-routine-side="both" type="button">Both</button></div>
    <div class="stepper-block"><div class="stepper-label">${exercise.inputType === "time" ? "Seconds" : "Reps"}</div><div class="stepper"><button data-routine-adjust="reps" data-delta="-1" type="button">−</button><input id="routineRepsValue" inputmode="numeric" value="${number(step.defaultReps, exercise.defaultReps || 10)}" /><button data-routine-adjust="reps" data-delta="1" type="button">+</button></div></div>
    <div class="stepper-block ${exerciseInputType(exercise) !== "repsWeight" ? "hidden" : ""}"><div class="stepper-label">Weight (${escapeHtml(settings.unit)})</div><div class="stepper"><button data-routine-adjust="weight" data-delta="-1" type="button">−</button><input id="routineWeightValue" inputmode="decimal" value="${number(step.defaultWeight, exercise.defaultWeight || 0)}" /><button data-routine-adjust="weight" data-delta="1" type="button">+</button></div></div>
    <label>Notes<textarea id="routineSetNotes" rows="2" placeholder="Optional note for this set"></textarea></label>
    <div class="session-actions"><button id="completeRoutineSetBtn" class="primary" type="button">Complete set</button><button id="skipRoutineStepBtn" class="secondary" type="button">Skip today</button></div>
    <div class="top-gap"><strong>Completed: ${activeRoutineSession.completed.length}</strong> · <span class="muted">Skipped: ${activeRoutineSession.skipped.length}</span></div>`;
  activeRoutineSession.currentSide = exercise.mode === "standard" ? "both" : "left";
}

function adjustRoutineValue(kind, delta) {
  const step = currentRoutineStep();
  const exercise = exerciseById($("routineSwapExercise")?.value || step?.exerciseId);
  if (!exercise) return;
  const input = kind === "reps" ? $("routineRepsValue") : $("routineWeightValue");
  const amount = kind === "reps" ? 1 : number(exercise.weightStep, 2.5);
  input.value = kind === "reps" ? Math.max(0, Math.round(number(input.value) + (delta * amount))) : Math.max(0, Number((number(input.value) + (delta * amount)).toFixed(2)));
}

function completeRoutineStep() {
  const step = currentRoutineStep();
  if (!step) return;
  const chosenExerciseId = $("routineSwapExercise").value;
  const exercise = exerciseById(chosenExerciseId);
  const reps = number($("routineRepsValue").value);
  if (reps <= 0) return showToast(exercise?.inputType === "time" ? "Enter the number of seconds." : "Enter at least one rep.");
  const completedSet = {
    originalExerciseId: step.exerciseId,
    exerciseId: chosenExerciseId,
    exerciseName: exercise?.name || "Exercise",
    blockName: step.blockName,
    round: step.round,
    side: exercise?.mode === "standard" ? "both" : (activeRoutineSession.currentSide || "left"),
    reps,
    weight: exercise?.inputType === "repsWeight" ? number($("routineWeightValue").value) : 0,
    inputType: exercise?.inputType || "repsWeight",
    notes: $("routineSetNotes").value.trim(),
    completedAt: new Date().toISOString()
  };
  completedSet.isPB = calculatePBForSet(chosenExerciseId, completedSet);
  activeRoutineSession.completed.push(completedSet);
  activeRoutineSession.currentIndex += 1;
  if (step.isLastInRound && step.restAfterRound > 0) startAutomaticRest(step.restAfterRound);
  else if (exercise?.restSeconds > 0) startAutomaticRest(exercise.restSeconds);
  renderRoutineSession();
}

function skipRoutineStep() {
  const step = currentRoutineStep();
  if (!step) return;
  activeRoutineSession.skipped.push({ ...step, skippedAt: new Date().toISOString() });
  activeRoutineSession.currentIndex += 1;
  renderRoutineSession();
}

async function finishRoutineSessionPrompt() {
  if (!activeRoutineSession) return;
  const save = await askConfirm("Routine complete", `You completed ${activeRoutineSession.completed.length} sets. Save this workout?`);
  if (save) await saveRoutineWorkout();
  else closeRoutineSession();
}

async function saveRoutineWorkout() {
  if (!activeRoutineSession?.completed.length) {
    closeRoutineSession();
    return showToast("No completed sets to save.");
  }
  const grouped = new Map();
  for (const set of activeRoutineSession.completed) {
    if (!grouped.has(set.exerciseId)) grouped.set(set.exerciseId, { exerciseId: set.exerciseId, exerciseName: set.exerciseName, sets: [] });
    grouped.get(set.exerciseId).sets.push(set);
  }
  const payload = {
    date: activeRoutineSession.date,
    source: "routine",
    routineId: activeRoutineSession.routineId,
    routineName: activeRoutineSession.routineName,
    exercises: [...grouped.values()],
    skipped: activeRoutineSession.skipped,
    createdAt: serverTimestamp()
  };
  const ref = await addDoc(userCollection("workouts"), payload);
  workouts.unshift({ id: ref.id, ...payload, createdAt: { seconds: Math.floor(Date.now() / 1000) } });
  closeRoutineSession();
  renderRecentWorkouts();
  renderPBs();
  renderExerciseLibrary();
  showToast("Routine workout saved.");
}

function closeRoutineSession() {
  activeRoutineSession = null;
  $("routineSessionCard").classList.add("hidden");
  $("routineSessionCard").innerHTML = "";
  $("manualWorkoutCard")?.classList.remove("hidden");
  $("manualSetCard")?.classList.remove("hidden");
}

function startAutomaticRest(seconds) {
  setTimerMode("countdown");
  countdownMs = Math.max(0, number(seconds, settings.defaultRest)) * 1000;
  switchTab("timer");
  renderTimer();
  startPauseTimer();
}

async function saveBody(type) {
  const date = type === "weight" ? ($("bodyDate").value || today()) : ($("measureDate").value || today());
  let payload;
  if (type === "weight") {
    const weight = number($("bodyWeight").value, NaN);
    if (!Number.isFinite(weight) || weight <= 0) return showToast("Enter a valid weight.");
    payload = { date, type, weight, unit: settings.unit, createdAt: serverTimestamp() };
  } else {
    payload = {
      date,
      type,
      unit: settings.measureUnit,
      measurements: {
        waist: number($("mWaist").value), hips: number($("mHips").value), chest: number($("mChest").value),
        leftArm: number($("mLeftArm").value), rightArm: number($("mRightArm").value),
        leftLeg: number($("mLeftLeg").value), rightLeg: number($("mRightLeg").value)
      },
      createdAt: serverTimestamp()
    };
  }
  const ref = await addDoc(userCollection("bodyEntries"), payload);
  bodyEntries.unshift({ id: ref.id, ...payload });
  renderBody();
  showToast(type === "weight" ? "Weight saved." : "Measurements saved.");
}

function renderBody() {
  const weights=bodyEntries.filter(e=>e.type==="weight").sort((a,b)=>String(b.date).localeCompare(String(a.date)));
  const latestWeight=weights[0], previousWeight=weights[1];
  const latestMeasurements=bodyEntries.filter(e=>e.type==="measurements").sort((a,b)=>String(b.date).localeCompare(String(a.date)))[0];
  $("bodySummary").innerHTML=`<div class="summary">Current weight<strong>${latestWeight?`${latestWeight.weight} ${latestWeight.unit||settings.unit}`:"—"}</strong></div><div class="summary">Last change<strong>${latestWeight&&previousWeight?`${(latestWeight.weight-previousWeight.weight).toFixed(1)} ${latestWeight.unit||settings.unit}`:"—"}</strong></div><div class="summary">Latest measurements<strong>${latestMeasurements?formatDate(latestMeasurements.date):"—"}</strong></div>`;
  renderBodyChart(); renderBodyHistory();
}
function renderBodyChart(){
  if(!$("bodyChart"))return;
  let points=[]; let formatter=v=>String(v);
  if(bodyChartMode==="weight"){
    points=bodyEntries.filter(e=>e.type==="weight").sort((a,b)=>String(a.date).localeCompare(String(b.date))).map(e=>({date:e.date,value:e.weight})); formatter=v=>`${v}${settings.unit}`;
  } else {
    const key=$("measurementChartSelect")?.value||"waist"; points=bodyEntries.filter(e=>e.type==="measurements"&&number(e.measurements?.[key])>0).sort((a,b)=>String(a.date).localeCompare(String(b.date))).map(e=>({date:e.date,value:e.measurements[key]})); formatter=v=>`${v}${settings.measureUnit}`;
  }
  const ok=drawLineChart($("bodyChart"),points,formatter); $("bodyChartEmpty").textContent=ok?"":"Add at least one entry to see a graph.";
}
function measurementLabel(key){return ({waist:"Waist",hips:"Hips",chest:"Chest",leftArm:"Left arm",rightArm:"Right arm",leftLeg:"Left thigh",rightLeg:"Right thigh"})[key]||key;}
function renderBodyHistory(){
  if(!$("bodyHistoryList"))return;
  $("bodyHistoryList").innerHTML=bodyEntries.length?bodyEntries.map(entry=>{const detail=entry.type==="weight"?`${entry.weight} ${entry.unit||settings.unit}`:Object.entries(entry.measurements||{}).filter(([,v])=>number(v)>0).map(([k,v])=>`${measurementLabel(k)}: ${v}${entry.unit||settings.measureUnit}`).join(" · ");return `<div class="item"><div class="item-title">${entry.type==="weight"?"Weight":"Measurements"}</div><div class="item-meta">${formatDate(entry.date)} · ${escapeHtml(detail)}</div><div class="item-actions"><button class="danger small" data-delete-body="${escapeHtml(entry.id)}" type="button">Delete</button></div></div>`}).join(""):`<p class="muted">No body entries yet.</p>`;
}

function applySettingsToUI() {
  $("unitSetting").value = settings.unit;
  $("weightModeSetting").value = settings.weightMode;
  $("measureUnitSetting").value = settings.measureUnit;
  $("autoRestSetting").checked = Boolean(settings.autoRest);
  $("defaultRestSetting").value = String(settings.defaultRest);
  $("weightUnitLabel").textContent = settings.unit;
  $("weightUnitText").textContent = settings.unit;
}

async function saveSettings() {
  settings = {
    unit: $("unitSetting").value,
    weightMode: $("weightModeSetting").value,
    measureUnit: $("measureUnitSetting").value,
    autoRest: $("autoRestSetting").checked,
    defaultRest: number($("defaultRestSetting").value, 60)
  };
  await setDoc(doc(db, "users", currentUser.uid, "profile", "settings"), settings, { merge: true });
  applySettingsToUI();
  renderPBs();
  showToast("Settings saved.");
}

function exportBackup() {
  const backup = { exportedAt: new Date().toISOString(), exercises, routines, workouts, bodyEntries, mealPlans, settings };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `frever-fitness-backup-${today()}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

// Timer

function renderHistory() {
  if(!$("historyList"))return;
  if(!workouts.length){$("historyList").innerHTML=`<p class="muted">No workouts saved yet.</p>`;return;}
  $("historyList").innerHTML=workouts.map(workout=>{const names=(workout.exercises||[]).map(e=>e.exerciseName||exerciseById(e.exerciseId)?.name||"Exercise");const sets=(workout.exercises||[]).reduce((n,e)=>n+(e.sets?.length||0),0);return `<div class="item"><button class="history-main" data-view-workout="${escapeHtml(workout.id)}" type="button"><div class="item-title">${escapeHtml(workout.routineName||names.join(" · ")||"Workout")}</div><div class="item-meta">${formatDate(workout.date)} · ${sets} completed set${sets===1?"":"s"}</div></button><div class="item-actions"><button class="secondary small" data-edit-workout="${escapeHtml(workout.id)}" type="button">Edit</button><button class="secondary small" data-copy-workout="${escapeHtml(workout.id)}" type="button">Copy to routine</button><button class="danger small" data-delete-workout="${escapeHtml(workout.id)}" type="button">Delete</button></div></div>`}).join("");
}
function workoutDetailHtml(workout){return (workout.exercises||[]).map(entry=>`<div class="item"><div class="item-title">${escapeHtml(entry.exerciseName||exerciseById(entry.exerciseId)?.name||"Exercise")}</div>${(entry.sets||[]).map((set,i)=>`<div class="item-meta">Set ${i+1}: ${set.inputType==="time"?`${set.reps} sec`:set.inputType==="repsOnly"?`${set.reps} reps`:`${set.reps} reps @ ${set.weight||0} ${settings.unit}`}${set.side&&set.side!=="both"?` · ${escapeHtml(set.side)}`:""}${set.notes?` · ${escapeHtml(set.notes)}`:""}</div>`).join("")}</div>`).join("");}
function openWorkoutHistory(id){const workout=workouts.find(w=>w.id===id);if(!workout)return;$("historyDialogTitle").textContent=workout.routineName||`Workout — ${formatDate(workout.date)}`;$("historyDialogBody").innerHTML=workoutDetailHtml(workout);$("historyDialog").showModal();}
function openWorkoutEdit(id){const workout=workouts.find(w=>w.id===id);if(!workout)return;editingWorkoutId=id;$("workoutEditBody").innerHTML=`<label>Date<input id="editWorkoutDate" type="date" value="${escapeHtml(workout.date||today())}"/></label><label>Workout name<input id="editWorkoutName" value="${escapeHtml(workout.routineName||"")}" placeholder="Optional name"/></label>${(workout.exercises||[]).map((entry,ei)=>`<div class="edit-exercise-block"><h4>${escapeHtml(entry.exerciseName||"Exercise")}</h4>${(entry.sets||[]).map((set,si)=>`<div class="edit-set-row" data-edit-set="${ei}:${si}"><label>Reps/sec<input data-edit-field="reps" inputmode="decimal" value="${number(set.reps)}"/></label><label>Weight<input data-edit-field="weight" inputmode="decimal" value="${number(set.weight)}"/></label><label>Side<select data-edit-field="side"><option value="both" ${(set.side||"both")==="both"?"selected":""}>Both</option><option value="left" ${set.side==="left"?"selected":""}>Left</option><option value="right" ${set.side==="right"?"selected":""}>Right</option></select></label></div>`).join("")}</div>`).join("")}`;$("workoutEditDialog").showModal();}
async function saveWorkoutEdit(){const workout=workouts.find(w=>w.id===editingWorkoutId);if(!workout)return;const updated=structuredClone(workout);updated.date=$("editWorkoutDate").value||today();updated.routineName=$("editWorkoutName").value.trim()||null;document.querySelectorAll("[data-edit-set]").forEach(row=>{const [ei,si]=row.dataset.editSet.split(":").map(number);row.querySelectorAll("[data-edit-field]").forEach(input=>{const field=input.dataset.editField;updated.exercises[ei].sets[si][field]=field==="side"?input.value:number(input.value);});});const payload={date:updated.date,routineName:updated.routineName,exercises:updated.exercises,updatedAt:serverTimestamp()};await setDoc(userDoc("workouts",updated.id),payload,{merge:true});const idx=workouts.findIndex(w=>w.id===updated.id);workouts[idx]={...workouts[idx],...payload};$("workoutEditDialog").close();renderHistory();renderPBs();showToast("Workout updated.");}
async function deleteWorkoutById(id){if(!await askConfirm("Delete workout","This permanently removes the workout and may change your PBs."))return;await deleteDoc(userDoc("workouts",id));workouts=workouts.filter(w=>w.id!==id);renderHistory();renderPBs();renderExerciseLibrary();}
async function copyWorkoutToRoutine(id){const workout=workouts.find(w=>w.id===id);if(!workout)return;const blocks=(workout.exercises||[]).map((entry,index)=>({id:crypto.randomUUID(),name:`Group ${index+1}`,rounds:Math.max(1,entry.sets?.length||1),restAfterRound:settings.defaultRest,exercises:[{exerciseId:entry.exerciseId,defaultReps:number(entry.sets?.[0]?.reps,10),defaultWeight:number(entry.sets?.[0]?.weight)}]}));const payload={name:`Copy of ${workout.routineName||formatDate(workout.date)}`,day:"",startDate:today(),endDate:"",notes:"Created from workout history",blocks,createdAt:serverTimestamp(),updatedAt:serverTimestamp()};const ref=await addDoc(userCollection("routines"),payload);routines.push({id:ref.id,...payload});routines.sort((a,b)=>a.name.localeCompare(b.name));renderRoutines();showToast("Workout copied to Routines.");}

function mealPlanForWeek(){ return mealPlans.find(p=>p.id===isoDate(mealWeekStart)) || {id:isoDate(mealWeekStart),days:{}}; }
function renderMealPlanner(){
  if(!$("mealPlannerGrid"))return;
  const plan=mealPlanForWeek();
  $("mealWeekLabel").textContent=`${formatDate(isoDate(mealWeekStart))} – ${formatDate(isoDate(addDays(mealWeekStart,6)))}`;
  const names=["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
  $("mealPlannerGrid").innerHTML=names.map((name,i)=>{const key=isoDate(addDays(mealWeekStart,i)); const day=plan.days?.[key]||{}; return `<div class="meal-day"><h3>${name}</h3><small>${formatDate(key)}</small>${["Breakfast","Lunch","Dinner","Snacks"].map(slot=>`<label>${slot}<textarea data-meal-date="${key}" data-meal-slot="${slot.toLowerCase()}" placeholder="Plan ${slot.toLowerCase()}">${escapeHtml(day[slot.toLowerCase()]||"")}</textarea></label>`).join("")}</div>`}).join("");
}
async function saveMealWeek(){
  const days={}; document.querySelectorAll("[data-meal-date]").forEach(el=>{const date=el.dataset.mealDate; days[date] ||= {}; days[date][el.dataset.mealSlot]=el.value.trim();});
  const id=isoDate(mealWeekStart); const payload={weekStart:id,days,updatedAt:serverTimestamp()}; await setDoc(userDoc("mealPlans",id),payload,{merge:true});
  const idx=mealPlans.findIndex(p=>p.id===id); if(idx>=0) mealPlans[idx]={id,...mealPlans[idx],...payload}; else mealPlans.push({id,...payload}); showToast("Meal plan saved.");
}

let timerMode = "stopwatch";
let timerHandle = null;
let running = false;
let startedAt = 0;
let elapsedMs = 0;
let countdownMs = 60000;

function timerValue() {
  if (!running) return timerMode === "stopwatch" ? elapsedMs : countdownMs;
  const delta = Date.now() - startedAt;
  return timerMode === "stopwatch" ? elapsedMs + delta : Math.max(0, countdownMs - delta);
}
function renderTimer() {
  const value = timerValue();
  const totalSeconds = Math.floor(value / 1000);
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  const tenths = Math.floor((value % 1000) / 100);
  $("timerDisplay").textContent = `${minutes}:${seconds}.${tenths}`;
  $("timerStartBtn").textContent = running ? "Pause" : "Start";
  if (running && timerMode === "countdown" && value <= 0) finishTimer();
}
function startPauseTimer() {
  if (running) {
    const delta = Date.now() - startedAt;
    if (timerMode === "stopwatch") elapsedMs += delta;
    else countdownMs = Math.max(0, countdownMs - delta);
    running = false;
    clearInterval(timerHandle);
    $("timerStatus").textContent = "Paused";
  } else {
    if (timerMode === "countdown" && countdownMs <= 0) countdownMs = settings.defaultRest * 1000;
    startedAt = Date.now();
    running = true;
    timerHandle = setInterval(renderTimer, 100);
    $("timerStatus").textContent = timerMode === "stopwatch" ? "Stopwatch running" : "Rest timer running";
  }
  renderTimer();
}
function resetTimer() {
  running = false;
  clearInterval(timerHandle);
  elapsedMs = 0;
  countdownMs = settings.defaultRest * 1000;
  $("timerStatus").textContent = "Ready";
  renderTimer();
}
function finishTimer() {
  running = false;
  clearInterval(timerHandle);
  countdownMs = 0;
  renderTimer();
  $("timerStatus").textContent = "Rest complete";
  if (navigator.vibrate) navigator.vibrate([250, 120, 250]);
  try {
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.frequency.value = 880;
    gain.gain.value = 0.08;
    oscillator.start();
    oscillator.stop(context.currentTime + 0.35);
  } catch { /* Audio may be blocked by browser settings. */ }
}
function setTimerMode(mode) {
  running = false;
  clearInterval(timerHandle);
  timerMode = mode;
  elapsedMs = 0;
  countdownMs = settings.defaultRest * 1000;
  document.querySelectorAll("[data-timer-mode]").forEach((button) => button.classList.toggle("active", button.dataset.timerMode === mode));
  $("timerPresetWrap").classList.toggle("hidden", mode !== "countdown");
  $("timerStatus").textContent = "Ready";
  renderTimer();
}

function friendlyAuthError(error) {
  const code = error.code || "";
  if (code.includes("invalid-credential")) return "Email or password is incorrect.";
  if (code.includes("email-already-in-use")) return "An account already exists with that email.";
  if (code.includes("weak-password")) return "Use a password with at least 6 characters.";
  if (code.includes("invalid-email")) return "Enter a valid email address.";
  return error.message || "Something went wrong.";
}

// Static events
$("loginBtn").onclick = async () => { try { await signInWithEmailAndPassword(auth, $("authEmail").value.trim(), $("authPassword").value); } catch (error) { $("authMessage").textContent = friendlyAuthError(error); } };
$("registerBtn").onclick = async () => { try { await createUserWithEmailAndPassword(auth, $("authEmail").value.trim(), $("authPassword").value); } catch (error) { $("authMessage").textContent = friendlyAuthError(error); } };
$("logoutBtn").onclick = () => signOut(auth);
$("toastCloseBtn").onclick = () => $("toastDialog").close();
$("confirmCancelBtn").onclick = () => { $("confirmDialog").close(); confirmResolver?.(false); confirmResolver = null; };
$("confirmOkBtn").onclick = () => { $("confirmDialog").close(); confirmResolver?.(true); confirmResolver = null; };

document.querySelectorAll("[data-tab]").forEach((tab) => tab.onclick = () => switchTab(tab.dataset.tab));
$("moreTileBtn").onclick = () => $("moreTiles").classList.toggle("hidden");
$("quickAddExerciseBtn").onclick = () => { switchTab("library"); clearExerciseForm(); };
$("demoBtn").onclick = () => { const exercise = selectedExercise(); if (exercise?.demo) window.open(exercise.demo, "_blank", "noopener"); };
$("addRoundExerciseBtn").onclick = addManualExercise;
$("savePassBtn").onclick = saveCurrentPass;
$("addRoundBtn").onclick = startNextRound;
$("finishPairWorkoutBtn").onclick = savePairWorkout;
$("clearPairWorkoutBtn").onclick = () => resetManualEntry(true);
$("toggleRoundNotesBtn").onclick = () => $("roundNotesWrap").classList.toggle("hidden");
$("saveWeightBtn").onclick = () => saveBody("weight");
$("saveMeasurementsBtn").onclick = () => saveBody("measurements");
$("saveExerciseBtn").onclick = saveExercise;
$("cancelExerciseEditBtn").onclick = clearExerciseForm;
$("exerciseSearch").oninput = renderExerciseLibrary;
$("newRoutineBtn").onclick = () => openRoutineEditor();
$("closeRoutineEditorBtn").onclick = closeRoutineEditor;
$("addRoutineBlockBtn").onclick = () => { syncRoutineDraftFromDOM(); routineDraftBlocks.push(blankRoutineBlock()); renderRoutineBlocks(); };
$("saveRoutineBtn").onclick = saveRoutine;
$("saveSettingsBtn").onclick = saveSettings;
$("exportBtn").onclick = exportBackup;
$("timerStartBtn").onclick = startPauseTimer;
$("timerResetBtn").onclick = resetTimer;
document.querySelectorAll("[data-timer-mode]").forEach((button) => button.onclick = () => setTimerMode(button.dataset.timerMode));
document.querySelectorAll("[data-seconds]").forEach((button) => button.onclick = () => { running = false; clearInterval(timerHandle); countdownMs = number(button.dataset.seconds) * 1000; renderTimer(); $("timerStatus").textContent = `${button.dataset.seconds} second rest selected`; });

// Delegated events
$("roundExerciseList").onclick = (event) => {
  const card = event.target.closest("[data-group-uid]"); if (!card) return;
  const item = manualGroupExercises.find(entry => entry.uid === card.dataset.groupUid); if (!item) return;
  const adjust = event.target.closest("[data-group-adjust]");
  if (adjust) { syncManualGroupFromDOM(); const exercise=exerciseById(item.exerciseId); const field=adjust.dataset.groupAdjust; const step=field==="reps"?1:number(exercise?.weightStep,2.5); item[field]=Math.max(0,number(item[field])+number(adjust.dataset.delta)*step); return renderManualRound(); }
  const side = event.target.closest("[data-group-side]"); if (side) { item.side=side.dataset.groupSide; return renderManualRound(); }
  if (event.target.closest("[data-save-single-set]")) return saveOneSet(item.uid);
  if (event.target.closest("[data-add-target-set]")) { syncManualGroupFromDOM(); item.targetSets += 1; return renderManualRound(); }
  if (event.target.closest("[data-remove-group-exercise]")) { syncManualGroupFromDOM(); manualGroupExercises=manualGroupExercises.filter(entry=>entry.uid!==item.uid); return renderManualRound(); }
  const edit = event.target.closest("[data-edit-inline-set]"); if (edit) { const idx=number(edit.dataset.editInlineSet); const set=item.completedSets[idx]; if(!set)return; item.reps=set.reps; item.weight=set.weight; item.side=set.side||"both"; item.completedSets.splice(idx,1); const pos=manualRounds.findIndex(round=>(round.entries||[]).some(entry=>entry.completedAt===set.completedAt)); if(pos>=0)manualRounds.splice(pos,1); return renderManualRound(); }
};
$("roundExerciseList").onchange = (event) => {
  const card=event.target.closest("[data-group-uid]"); if(!card)return; const item=manualGroupExercises.find(entry=>entry.uid===card.dataset.groupUid); if(!item)return;
  if(event.target.dataset.groupField==="exerciseId"){item.exerciseId=event.target.value; const ex=exerciseById(item.exerciseId); item.reps=ex?.defaultReps||10; item.weight=ex?.defaultWeight||0; item.side="both"; renderManualRound();}
};
$("completedRounds").onclick = (event) => { const button=event.target.closest("[data-edit-round]"); if(button) editCompletedRound(number(button.dataset.editRound)); };

$("recentWorkouts")?.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-delete-workout]");
  if (!button) return;
  if (!await askConfirm("Delete workout", "This will permanently remove the workout and may change your PBs.")) return;
  await deleteDoc(userDoc("workouts", button.dataset.deleteWorkout));
  workouts = workouts.filter((workout) => workout.id !== button.dataset.deleteWorkout);
  renderRecentWorkouts(); renderPBs(); renderExerciseLibrary(); renderHistory();
});

$("bodyHistoryList").onclick = async (event) => {
  const button = event.target.closest("[data-delete-body]");
  if (!button) return;
  await deleteDoc(userDoc("bodyEntries", button.dataset.deleteBody));
  bodyEntries = bodyEntries.filter((entry) => entry.id !== button.dataset.deleteBody);
  renderBody();
};

$("exerciseList").onclick = async (event) => {
  const editButton = event.target.closest("[data-edit-exercise]");
  if (editButton) return editExercise(editButton.dataset.editExercise);
  const deleteButton = event.target.closest("[data-delete-exercise]");
  if (!deleteButton) return;
  const used = routines.some((routine) => (routine.blocks || []).some((block) => (block.exercises || []).some((entry) => entry.exerciseId === deleteButton.dataset.deleteExercise)));
  const warning = used ? "This exercise is used in a routine. Deleting it will leave a missing exercise in that routine." : "Delete this exercise from your library?";
  if (!await askConfirm("Delete exercise", warning)) return;
  await deleteDoc(userDoc("exercises", deleteButton.dataset.deleteExercise));
  exercises = exercises.filter((exercise) => exercise.id !== deleteButton.dataset.deleteExercise);
  renderExerciseSelects(); renderExerciseLibrary(); renderRoutines();
};

$("routineList").onclick = async (event) => {
  const startButton = event.target.closest("[data-start-routine]");
  if (startButton) return startRoutine(startButton.dataset.startRoutine);
  const editButton = event.target.closest("[data-edit-routine]");
  if (editButton) return openRoutineEditor(routines.find((routine) => routine.id === editButton.dataset.editRoutine));
  const deleteButton = event.target.closest("[data-delete-routine]");
  if (!deleteButton) return;
  if (!await askConfirm("Delete routine", "Previous completed workouts will remain, but the routine template will be removed.")) return;
  await deleteDoc(userDoc("routines", deleteButton.dataset.deleteRoutine));
  routines = routines.filter((routine) => routine.id !== deleteButton.dataset.deleteRoutine);
  renderRoutines();
};

$("routineBlocks").onclick = (event) => {
  syncRoutineDraftFromDOM();
  const removeBlock = event.target.closest("[data-remove-block]");
  if (removeBlock) {
    routineDraftBlocks.splice(number(removeBlock.dataset.removeBlock), 1);
    renderRoutineBlocks();
    return;
  }
  const addExercise = event.target.closest("[data-add-block-exercise]");
  if (addExercise) {
    const block = routineDraftBlocks[number(addExercise.dataset.addBlockExercise)];
    const exercise = exercises[0];
    block.exercises.push({ exerciseId: exercise?.id || "", defaultReps: exercise?.defaultReps || 10, defaultWeight: exercise?.defaultWeight || 0 });
    renderRoutineBlocks();
    return;
  }
  const removeExercise = event.target.closest("[data-remove-block-exercise]");
  if (removeExercise) {
    const [blockIndex, exerciseIndex] = removeExercise.dataset.removeBlockExercise.split(":").map(number);
    routineDraftBlocks[blockIndex].exercises.splice(exerciseIndex, 1);
    renderRoutineBlocks();
  }
};

$("routineSessionCard").onclick = async (event) => {
  const adjustButton = event.target.closest("[data-routine-adjust]");
  if (adjustButton) return adjustRoutineValue(adjustButton.dataset.routineAdjust, number(adjustButton.dataset.delta));
  const sideButton = event.target.closest("[data-routine-side]");
  if (sideButton) {
    activeRoutineSession.currentSide = sideButton.dataset.routineSide;
    document.querySelectorAll("[data-routine-side]").forEach((button) => button.classList.toggle("active", button === sideButton));
    return;
  }
  if (event.target.closest("#completeRoutineSetBtn")) return completeRoutineStep();
  if (event.target.closest("#skipRoutineStepBtn")) return skipRoutineStep();
  if (event.target.closest("#endRoutineEarlyBtn")) {
    if (await askConfirm("End routine early", "Save the completed sets so far?")) await saveRoutineWorkout();
    else closeRoutineSession();
  }
};

$("routineSessionCard").onchange = (event) => {
  if (event.target.id !== "routineSwapExercise") return;
  const exercise = exerciseById(event.target.value);
  if (!exercise) return;
  $("routineRepsValue").value = exercise.defaultReps || 10;
  if ($("routineWeightValue")) $("routineWeightValue").value = exercise.defaultWeight || 0;
  const weightBlock = $("routineWeightValue")?.closest(".stepper-block");
  weightBlock?.classList.toggle("hidden", exerciseInputType(exercise) !== "repsWeight");
  $("routineSideWrap")?.classList.toggle("hidden", exercise.mode === "standard");
  activeRoutineSession.currentSide = exercise.mode === "standard" ? "both" : "left";
};

$("workoutDate").value = today();
$("historyList")?.addEventListener("click", async (event) => {
  const view=event.target.closest("[data-view-workout]"); if(view)return openWorkoutHistory(view.dataset.viewWorkout);
  const edit=event.target.closest("[data-edit-workout]"); if(edit)return openWorkoutEdit(edit.dataset.editWorkout);
  const copy=event.target.closest("[data-copy-workout]"); if(copy)return copyWorkoutToRoutine(copy.dataset.copyWorkout);
  const del=event.target.closest("[data-delete-workout]"); if(del)return deleteWorkoutById(del.dataset.deleteWorkout);
});
$("historyDialogClose")?.addEventListener("click",()=>$("historyDialog").close());
$("workoutEditClose")?.addEventListener("click",()=>$("workoutEditDialog").close());
$("saveWorkoutEditBtn")?.addEventListener("click",saveWorkoutEdit);
$("pbList")?.addEventListener("click",event=>{const button=event.target.closest("[data-pb-exercise]");if(button)openPBChart(button.dataset.pbExercise,button.dataset.pbSide);});
$("pbChartClose")?.addEventListener("click",()=>$("pbChartDialog").close());
$("bodyHistoryBtn")?.addEventListener("click",()=>{renderBodyHistory();$("bodyHistoryDialog").showModal();});
$("bodyHistoryClose")?.addEventListener("click",()=>$("bodyHistoryDialog").close());
document.querySelectorAll("[data-body-chart]").forEach(button=>button.addEventListener("click",()=>{bodyChartMode=button.dataset.bodyChart;document.querySelectorAll("[data-body-chart]").forEach(b=>b.classList.toggle("active",b===button));$("measurementChartChoice").classList.toggle("hidden",bodyChartMode!=="measurement");renderBodyChart();}));
$("measurementChartSelect")?.addEventListener("change",renderBodyChart);
$("showWeightFormBtn")?.addEventListener("click",()=>{ $("weightFormCard").classList.remove("hidden"); $("measureFormCard").classList.add("hidden"); });
$("showMeasureFormBtn")?.addEventListener("click",()=>{ $("measureFormCard").classList.remove("hidden"); $("weightFormCard").classList.add("hidden"); });
document.querySelectorAll("[data-close-body-form]").forEach(b=>b.addEventListener("click",()=>b.closest(".card").classList.add("hidden")));
$("prevMealWeekBtn")?.addEventListener("click",()=>{mealWeekStart=addDays(mealWeekStart,-7);renderMealPlanner();});
$("nextMealWeekBtn")?.addEventListener("click",()=>{mealWeekStart=addDays(mealWeekStart,7);renderMealPlanner();});
$("saveMealWeekBtn")?.addEventListener("click",saveMealWeek);

$("bodyDate").value = today();
$("measureDate").value = today();
$("routineStartDate").value = today();
renderTimer();

onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  $("authMessage").textContent = "";
  $("authPanel").classList.toggle("hidden", Boolean(user));
  $("appPanel").classList.toggle("hidden", !user);
  $("logoutBtn").classList.toggle("hidden", !user);
  $("userEmail").textContent = user ? user.email : "Not signed in";
  if (!user) return;
  try {
    await loadAll();
  } catch (error) {
    console.error(error);
    showToast("Firebase is connected, but Firestore blocked access. Add the supplied firestore.rules to your Firebase project.");
  }
});
