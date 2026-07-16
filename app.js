import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged, createUserWithEmailAndPassword,
  signInWithEmailAndPassword, signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import {
  getFirestore, collection, doc, addDoc, setDoc, deleteDoc,
  getDocs, query, orderBy, serverTimestamp, writeBatch
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCH0nil4gFC03XmPFKJoxYvl3m5EcUeiTY",
  authDomain: "frever-fitness.firebaseapp.com",
  projectId: "frever-fitness",
  storageBucket: "frever-fitness.firebasestorage.app",
  messagingSenderId: "901554663270",
  appId: "1:901554663270:web:1f6d412d850f539a4aa2a7"
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);
const $ = (id) => document.getElementById(id);
const today = () => new Date().toISOString().slice(0, 10);

let currentUser = null;
let exercises = [];
let workouts = [];
let bodyEntries = [];
let settings = { unit: "kg", weightMode: "total", measureUnit: "cm" };
let setCount = 0;

const starterExercises = [
  ["Leg Press", "Legs", "standard", "Machine"],
  ["Chest Press", "Push", "standard", "Machine"],
  ["Shoulder Press", "Push", "standard", "Machine"],
  ["Lat Pulldown", "Pull", "standard", "Machine"],
  ["Cable Row", "Pull", "standard", "Cable"],
  ["Romanian Deadlift", "Legs", "standard", "Barbell or dumbbells"],
  ["Lateral Raise", "Push", "standard", "Dumbbells"],
  ["Single-arm Cable Row", "Pull", "leftRight", "Cable"],
  ["Tricep Pushdown", "Push", "standard", "Cable"],
  ["Face Pull", "Pull", "standard", "Cable"],
  ["Dead Hang", "Pull", "standard", "Bodyweight"],
  ["Plank", "Core", "standard", "Bodyweight"],
  ["Wall Sit", "Legs", "standard", "Bodyweight"]
];

function userPath(name) { return collection(db, "users", currentUser.uid, name); }
function showToast(text) { $("toastText").textContent = text; $("toastDialog").showModal(); }
function fmtDate(value) { if (!value) return ""; return new Date(value + "T12:00:00").toLocaleDateString("en-GB"); }
function numberOrNull(v) { const n = Number(v); return Number.isFinite(n) && v !== "" ? n : null; }
function escapeHtml(v = "") { return String(v).replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c])); }

async function seedExercisesIfNeeded() {
  const snap = await getDocs(userPath("exercises"));
  if (!snap.empty) return;
  const batch = writeBatch(db);
  starterExercises.forEach(([name, category, mode, equipment]) => {
    const ref = doc(userPath("exercises"));
    batch.set(ref, { name, category, mode, equipment, demo: "", notes: "", createdAt: serverTimestamp() });
  });
  await batch.commit();
}

async function loadAll() {
  await seedExercisesIfNeeded();
  const [exSnap, woSnap, bodySnap, settingsSnap] = await Promise.all([
    getDocs(query(userPath("exercises"), orderBy("name"))),
    getDocs(query(userPath("workouts"), orderBy("date", "desc"))),
    getDocs(query(userPath("body"), orderBy("date", "desc"))),
    getDocs(userPath("settings"))
  ]);
  exercises = exSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  workouts = woSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  bodyEntries = bodySnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const settingsDoc = settingsSnap.docs.find(d => d.id === "preferences");
  if (settingsDoc) settings = { ...settings, ...settingsDoc.data() };
  renderEverything();
}

function renderEverything() {
  renderExerciseSelect(); renderExerciseLibrary(); renderRecentWorkouts(); renderPBs(); renderBody(); renderSettings();
}

function renderExerciseSelect() {
  const previous = $("exerciseSelect").value;
  $("exerciseSelect").innerHTML = exercises.map(e => `<option value="${e.id}">${escapeHtml(e.name)}</option>`).join("");
  if (exercises.some(e => e.id === previous)) $("exerciseSelect").value = previous;
  updateExerciseInfo();
}

function selectedExercise() { return exercises.find(e => e.id === $("exerciseSelect").value); }
function updateExerciseInfo() {
  const ex = selectedExercise();
  if (!ex) return;
  const modeText = ex.mode === "leftRight" ? "Left and right tracked separately" : ex.mode === "sideOptional" ? "Choose a side when needed" : "Both sides tracked together";
  $("exerciseInfo").innerHTML = `<strong>${escapeHtml(ex.category || "")}</strong> · ${escapeHtml(ex.equipment || "No equipment set")}<br>${modeText}${ex.notes ? `<br>${escapeHtml(ex.notes)}` : ""}`;
  $("demoBtn").disabled = !ex.demo;
  resetSets();
}

function resetSets() { setCount = 0; $("setRows").innerHTML = ""; addSet(); addSet(); addSet(); }
function addSet(prefill = {}) {
  const ex = selectedExercise(); if (!ex) return;
  setCount += 1;
  const row = document.createElement("div");
  row.className = `set-row ${ex.mode !== "standard" ? "side" : ""}`;
  row.innerHTML = `
    <div class="set-number">Set ${setCount}</div>
    ${ex.mode !== "standard" ? `<label class="side-select">Side<select class="set-side"><option value="left">Left</option><option value="right">Right</option><option value="both">Both</option></select></label>` : ""}
    <label>Reps<input class="set-reps" inputmode="numeric" type="number" min="0" value="${prefill.reps ?? ""}" placeholder="10"></label>
    <label>Weight (${settings.unit})<input class="set-weight" inputmode="decimal" type="number" min="0" step="0.1" value="${prefill.weight ?? ""}" placeholder="0"></label>
    <button class="danger small remove-set" type="button">Remove</button>`;
  row.querySelector(".remove-set").onclick = () => { row.remove(); renumberSets(); };
  $("setRows").appendChild(row);
}
function renumberSets() { [...$("setRows").children].forEach((r, i) => r.querySelector(".set-number").textContent = `Set ${i + 1}`); setCount = $("setRows").children.length; }

async function saveWorkout() {
  const ex = selectedExercise(); if (!ex) return;
  const sets = [...$("setRows").children].map((row, i) => ({
    set: i + 1,
    side: row.querySelector(".set-side")?.value || "both",
    reps: numberOrNull(row.querySelector(".set-reps").value),
    weight: numberOrNull(row.querySelector(".set-weight").value)
  })).filter(s => s.reps !== null || s.weight !== null);
  if (!sets.length) return showToast("Add reps or weight to at least one set.");
  await addDoc(userPath("workouts"), {
    date: $("workoutDate").value || today(), exerciseId: ex.id, exerciseName: ex.name,
    category: ex.category || "", mode: ex.mode, unit: settings.unit, sets, createdAt: serverTimestamp()
  });
  showToast("Workout saved.");
  await loadAll(); resetSets();
}

function renderRecentWorkouts() {
  const target = $("recentWorkouts");
  if (!workouts.length) { target.innerHTML = `<p class="muted">No workouts saved yet.</p>`; return; }
  target.innerHTML = workouts.slice(0, 12).map(w => {
    const sets = (w.sets || []).map(s => `${s.side && s.side !== "both" ? s.side[0].toUpperCase() + ": " : ""}${s.weight ?? "—"}${w.unit || settings.unit} × ${s.reps ?? "—"}`).join(" · ");
    return `<div class="item"><div class="item-title">${escapeHtml(w.exerciseName)}</div><div class="item-meta">${fmtDate(w.date)}<br>${escapeHtml(sets)}</div><div class="item-actions"><button class="danger small" data-delete-workout="${w.id}">Delete</button></div></div>`;
  }).join("");
  target.querySelectorAll("[data-delete-workout]").forEach(b => b.onclick = async () => { if (confirm("Delete this workout?")) { await deleteDoc(doc(db,"users",currentUser.uid,"workouts",b.dataset.deleteWorkout)); await loadAll(); } });
}

function renderPBs() {
  const best = new Map();
  workouts.forEach(w => (w.sets || []).forEach(s => {
    const side = s.side && s.side !== "both" ? ` — ${s.side}` : "";
    const key = `${w.exerciseName}${side}`;
    const candidate = { name: w.exerciseName, side, weight: s.weight ?? 0, reps: s.reps ?? 0, date: w.date, unit: w.unit || settings.unit };
    const current = best.get(key);
    if (!current || candidate.weight > current.weight || (candidate.weight === current.weight && candidate.reps > current.reps)) best.set(key, candidate);
  }));
  const values = [...best.values()].sort((a,b) => a.name.localeCompare(b.name));
  $("pbList").innerHTML = values.length ? values.map(p => `<div class="item"><span class="pb-badge">PB</span><div class="item-title">${escapeHtml(p.name)}${escapeHtml(p.side)}</div><div class="item-meta"><strong>${p.weight}${p.unit} × ${p.reps} reps</strong><br>${fmtDate(p.date)}</div></div>`).join("") : `<p class="muted">PBs will appear after you save workouts.</p>`;
}

async function saveBody(type) {
  const entry = { date: $("bodyDate").value || today(), type, createdAt: serverTimestamp() };
  if (type === "weight") {
    entry.weight = numberOrNull($("bodyWeight").value); entry.unit = settings.unit;
    if (entry.weight === null) return showToast("Enter a weight first.");
  } else {
    entry.measureUnit = settings.measureUnit;
    entry.measurements = {
      waist:numberOrNull($("mWaist").value), hips:numberOrNull($("mHips").value), chest:numberOrNull($("mChest").value),
      leftArm:numberOrNull($("mLeftArm").value), rightArm:numberOrNull($("mRightArm").value), leftLeg:numberOrNull($("mLeftLeg").value), rightLeg:numberOrNull($("mRightLeg").value)
    };
    if (Object.values(entry.measurements).every(v => v === null)) return showToast("Enter at least one measurement.");
  }
  await addDoc(userPath("body"), entry); showToast(type === "weight" ? "Weight saved." : "Measurements saved."); await loadAll();
}

function renderBody() {
  const weights = bodyEntries.filter(e => e.type === "weight");
  const latest = weights[0], oldest = weights[weights.length - 1];
  const change = latest && oldest ? latest.weight - oldest.weight : null;
  $("bodySummary").innerHTML = `
    <div class="summary"><span>Current weight</span><strong>${latest ? `${latest.weight}${latest.unit || settings.unit}` : "—"}</strong></div>
    <div class="summary"><span>Total change</span><strong>${change !== null ? `${change > 0 ? "+" : ""}${change.toFixed(1)}${latest.unit || settings.unit}` : "—"}</strong></div>
    <div class="summary"><span>Entries</span><strong>${bodyEntries.length}</strong></div>`;
  $("bodyEntries").innerHTML = bodyEntries.length ? bodyEntries.slice(0,15).map(e => {
    const details = e.type === "weight" ? `${e.weight}${e.unit || settings.unit}` : Object.entries(e.measurements || {}).filter(([,v]) => v !== null).map(([k,v]) => `${k.replace(/([A-Z])/g," $1")}: ${v}${e.measureUnit || settings.measureUnit}`).join(" · ");
    return `<div class="item"><div class="item-title">${e.type === "weight" ? "Weight" : "Measurements"}</div><div class="item-meta">${fmtDate(e.date)}<br>${escapeHtml(details)}</div><div class="item-actions"><button class="danger small" data-delete-body="${e.id}">Delete</button></div></div>`;
  }).join("") : `<p class="muted">No body entries saved yet.</p>`;
  $("bodyEntries").querySelectorAll("[data-delete-body]").forEach(b => b.onclick = async () => { if (confirm("Delete this entry?")) { await deleteDoc(doc(db,"users",currentUser.uid,"body",b.dataset.deleteBody)); await loadAll(); } });
}

async function saveExercise() {
  const name = $("exName").value.trim(); if (!name) return showToast("Enter an exercise name.");
  await addDoc(userPath("exercises"), { name, category:$("exCategory").value, mode:$("exMode").value, equipment:$("exEquipment").value.trim(), demo:$("exDemo").value.trim(), notes:$("exNotes").value.trim(), createdAt:serverTimestamp() });
  ["exName","exEquipment","exDemo","exNotes"].forEach(id => $(id).value = ""); showToast("Exercise added."); await loadAll();
}
function renderExerciseLibrary() {
  $("exerciseList").innerHTML = exercises.map(e => `<div class="item"><div class="item-title">${escapeHtml(e.name)}</div><div class="item-meta">${escapeHtml(e.category || "")} · ${escapeHtml(e.equipment || "No equipment")}<br>${e.mode === "leftRight" ? "Left/right tracking" : e.mode === "sideOptional" ? "Optional side tracking" : "Standard tracking"}</div><div class="item-actions">${e.demo ? `<button class="secondary small" data-demo="${escapeHtml(e.demo)}">Demo</button>` : ""}<button class="danger small" data-delete-ex="${e.id}">Delete</button></div></div>`).join("");
  $("exerciseList").querySelectorAll("[data-demo]").forEach(b => b.onclick = () => window.open(b.dataset.demo,"_blank","noopener"));
  $("exerciseList").querySelectorAll("[data-delete-ex]").forEach(b => b.onclick = async () => { if (confirm("Delete this exercise? Existing workout history will remain.")) { await deleteDoc(doc(db,"users",currentUser.uid,"exercises",b.dataset.deleteEx)); await loadAll(); } });
}

function renderSettings() { $("unitSetting").value = settings.unit; $("weightModeSetting").value = settings.weightMode; $("measureUnitSetting").value = settings.measureUnit; }
async function saveSettings() {
  settings = { unit:$("unitSetting").value, weightMode:$("weightModeSetting").value, measureUnit:$("measureUnitSetting").value };
  await setDoc(doc(db,"users",currentUser.uid,"settings","preferences"), settings); showToast("Settings saved."); renderEverything(); resetSets();
}

function exportBackup() {
  const blob = new Blob([JSON.stringify({ exportedAt:new Date().toISOString(), exercises, workouts, bodyEntries, settings }, null, 2)], {type:"application/json"});
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `frever-fitness-backup-${today()}.json`; a.click(); URL.revokeObjectURL(a.href);
}

// Timer
let timerMode = "stopwatch", running = false, elapsedMs = 0, countdownMs = 60000, startedAt = 0, timerHandle = null;
function formatMs(ms) { ms = Math.max(0, ms); const total = Math.floor(ms/1000), m = Math.floor(total/60), s = total%60, tenths = Math.floor((ms%1000)/100); return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}.${tenths}`; }
function timerValue() { if (!running) return timerMode === "stopwatch" ? elapsedMs : countdownMs; const delta = Date.now() - startedAt; return timerMode === "stopwatch" ? elapsedMs + delta : countdownMs - delta; }
function renderTimer() {
  const value = timerValue(); $("timerDisplay").textContent = formatMs(value); $("timerStartBtn").textContent = running ? "Pause" : "Start";
  if (running && timerMode === "countdown" && value <= 0) finishTimer();
}
function startPauseTimer() {
  if (running) { const delta = Date.now()-startedAt; if (timerMode === "stopwatch") elapsedMs += delta; else countdownMs = Math.max(0,countdownMs-delta); running=false; clearInterval(timerHandle); $("timerStatus").textContent="Paused"; }
  else { if (timerMode === "countdown" && countdownMs <= 0) countdownMs=60000; startedAt=Date.now(); running=true; timerHandle=setInterval(renderTimer,100); $("timerStatus").textContent=timerMode === "stopwatch" ? "Stopwatch running" : "Rest timer running"; }
  renderTimer();
}
function resetTimer() { running=false; clearInterval(timerHandle); elapsedMs=0; if (timerMode === "countdown" && countdownMs <= 0) countdownMs=60000; $("timerStatus").textContent="Ready"; renderTimer(); }
function finishTimer() { running=false; clearInterval(timerHandle); countdownMs=0; renderTimer(); $("timerStatus").textContent="Rest complete"; if (navigator.vibrate) navigator.vibrate([250,120,250]); try { const ctx=new AudioContext(); const o=ctx.createOscillator(), g=ctx.createGain(); o.connect(g); g.connect(ctx.destination); o.frequency.value=880; g.gain.value=.08; o.start(); o.stop(ctx.currentTime+.35); } catch {} }
function setTimerMode(mode) { running=false; clearInterval(timerHandle); timerMode=mode; elapsedMs=0; countdownMs=60000; document.querySelectorAll("[data-timer-mode]").forEach(b=>b.classList.toggle("active",b.dataset.timerMode===mode)); $("timerPresetWrap").classList.toggle("hidden",mode!=="countdown"); $("timerStatus").textContent="Ready"; renderTimer(); }

// Events
$("loginBtn").onclick = async () => { try { await signInWithEmailAndPassword(auth,$("authEmail").value.trim(),$("authPassword").value); } catch(e) { $("authMessage").textContent = friendlyAuthError(e); } };
$("registerBtn").onclick = async () => { try { await createUserWithEmailAndPassword(auth,$("authEmail").value.trim(),$("authPassword").value); } catch(e) { $("authMessage").textContent = friendlyAuthError(e); } };
$("logoutBtn").onclick = () => signOut(auth);
function friendlyAuthError(e) { const code=e.code||""; if(code.includes("invalid-credential")) return "Email or password is incorrect."; if(code.includes("email-already-in-use")) return "An account already exists with that email."; if(code.includes("weak-password")) return "Use a password with at least 6 characters."; if(code.includes("invalid-email")) return "Enter a valid email address."; return e.message || "Something went wrong."; }

document.querySelectorAll(".tab").forEach(t => t.onclick = () => { document.querySelectorAll(".tab,.panel").forEach(x=>x.classList.remove("active")); t.classList.add("active"); $(t.dataset.tab).classList.add("active"); });
$("exerciseSelect").onchange = updateExerciseInfo; $("addSetBtn").onclick = () => addSet(); $("saveWorkoutBtn").onclick = saveWorkout;
$("demoBtn").onclick = () => { const ex=selectedExercise(); if(ex?.demo) window.open(ex.demo,"_blank","noopener"); };
$("quickAddExerciseBtn").onclick = () => document.querySelector('[data-tab="library"]').click();
$("saveWeightBtn").onclick = () => saveBody("weight"); $("saveMeasurementsBtn").onclick = () => saveBody("measurements");
$("saveExerciseBtn").onclick = saveExercise; $("saveSettingsBtn").onclick = saveSettings; $("exportBtn").onclick = exportBackup;
$("timerStartBtn").onclick=startPauseTimer; $("timerResetBtn").onclick=resetTimer;
document.querySelectorAll("[data-timer-mode]").forEach(b=>b.onclick=()=>setTimerMode(b.dataset.timerMode));
document.querySelectorAll("[data-seconds]").forEach(b=>b.onclick=()=>{ running=false; clearInterval(timerHandle); countdownMs=Number(b.dataset.seconds)*1000; renderTimer(); $("timerStatus").textContent=`${b.dataset.seconds} second rest selected`; });

$("workoutDate").value = today(); $("bodyDate").value = today(); renderTimer();
onAuthStateChanged(auth, async user => {
  currentUser = user; $("authMessage").textContent="";
  $("authPanel").classList.toggle("hidden",!!user); $("appPanel").classList.toggle("hidden",!user); $("logoutBtn").classList.toggle("hidden",!user);
  $("userEmail").textContent = user ? user.email : "Not signed in";
  if (user) { try { await loadAll(); } catch(e) { console.error(e); showToast("Firebase could not load your data. Check your Firestore rules and authorised domain."); } }
});
