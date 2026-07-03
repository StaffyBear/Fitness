import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { getFirestore, collection, doc, getDocs, setDoc, addDoc, deleteDoc, serverTimestamp, query, orderBy } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

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

let currentUser = null;
let state = { exercises: [], workouts: [], body: [], settings: { unit: 'kg', weightMode: 'total', measureUnit: 'cm' } };
let setRows = [];

const $ = id => document.getElementById(id);
const today = () => new Date().toISOString().slice(0,10);
const uidPath = name => collection(db, 'users', currentUser.uid, name);
const num = v => v === '' || v == null ? null : Number(v);

function toast(msg){ $('toastText').textContent = msg; $('toastDialog').showModal(); }
function authMsg(msg){ $('authMessage').textContent = msg || ''; }

const starterExercises = [
  {name:'Chest Press', category:'Push', mode:'standard', equipment:'Machine', demo:'', notes:''},
  {name:'Lat Pulldown', category:'Pull', mode:'standard', equipment:'Machine', demo:'', notes:''},
  {name:'Seated Cable Row', category:'Pull', mode:'standard', equipment:'Cable', demo:'', notes:''},
  {name:'Single-arm Cable Row', category:'Pull', mode:'leftRight', equipment:'Cable', demo:'', notes:'Track left and right separately.'},
  {name:'Leg Press', category:'Legs', mode:'standard', equipment:'Machine', demo:'', notes:''},
  {name:'Shoulder Press', category:'Push', mode:'standard', equipment:'Machine / dumbbells', demo:'', notes:''},
  {name:'Plank', category:'Core', mode:'standard', equipment:'Bodyweight', demo:'', notes:'Use reps as seconds if useful.'},
  {name:'Wall Sit', category:'Legs', mode:'standard', equipment:'Bodyweight', demo:'', notes:'Use reps as seconds if useful.'}
];

async function ensureStarterExercises(){
  const snap = await getDocs(uidPath('exercises'));
  if (!snap.empty) return;
  await Promise.all(starterExercises.map(ex => addDoc(uidPath('exercises'), {...ex, createdAt: serverTimestamp()})));
}

async function loadAll(){
  await ensureStarterExercises();
  const [exSnap, woSnap, bodySnap, settingsSnap] = await Promise.all([
    getDocs(query(uidPath('exercises'), orderBy('name'))),
    getDocs(query(uidPath('workouts'), orderBy('date','desc'))),
    getDocs(query(uidPath('body'), orderBy('date','desc'))),
    getDocs(uidPath('settings'))
  ]);
  state.exercises = exSnap.docs.map(d => ({id:d.id, ...d.data()}));
  state.workouts = woSnap.docs.map(d => ({id:d.id, ...d.data()}));
  state.body = bodySnap.docs.map(d => ({id:d.id, ...d.data()}));
  const s = settingsSnap.docs.find(d => d.id === 'main');
  if (s) state.settings = {...state.settings, ...s.data()};
  renderAll();
}

function renderAll(){
  $('workoutDate').value ||= today(); $('bodyDate').value ||= today();
  $('unitSetting').value = state.settings.unit; $('weightModeSetting').value = state.settings.weightMode; $('measureUnitSetting').value = state.settings.measureUnit;
  renderExercises(); renderSets(); renderRecent(); renderPBs(); renderBody();
}

function renderExercises(){
  const sel = $('exerciseSelect'); const old = sel.value;
  sel.innerHTML = state.exercises.map(e => `<option value="${e.id}">${escapeHtml(e.name)}</option>`).join('');
  if (state.exercises.some(e => e.id === old)) sel.value = old;
  if (!sel.value && state.exercises[0]) sel.value = state.exercises[0].id;
  showExerciseInfo();
  $('exerciseList').innerHTML = state.exercises.map(e => `<div class="item"><div class="item-title">${escapeHtml(e.name)}</div><div class="muted">${e.category || ''} · ${modeLabel(e.mode)} · ${e.equipment || 'No equipment set'}</div>${e.notes ? `<p>${escapeHtml(e.notes)}</p>`:''}<button class="danger small" data-del-ex="${e.id}">Delete</button></div>`).join('') || '<p class="muted">No exercises yet.</p>';
  document.querySelectorAll('[data-del-ex]').forEach(btn => btn.onclick = async () => { if(confirm('Delete this exercise?')){ await deleteDoc(doc(db,'users',currentUser.uid,'exercises',btn.dataset.delEx)); await loadAll(); }});
}
function modeLabel(mode){ return mode === 'leftRight' ? 'Left/right' : mode === 'sideOptional' ? 'Single side optional' : 'Standard'; }
function getExercise(){ return state.exercises.find(e => e.id === $('exerciseSelect').value); }
function showExerciseInfo(){
  const ex = getExercise(); if(!ex){ $('exerciseInfo').textContent=''; return; }
  $('exerciseInfo').textContent = `${ex.category || ''} · ${modeLabel(ex.mode)} · ${ex.equipment || 'No equipment set'}${ex.notes ? ' · '+ex.notes : ''}`;
  if (setRows.length === 0) addSet(false);
}

function addSet(render=true){
  const ex = getExercise();
  setRows.push({ side: ex?.mode === 'leftRight' ? 'Left' : 'Both', reps:'', weight:'' });
  if(render) renderSets();
}
function renderSets(){
  const ex = getExercise();
  if(setRows.length === 0) addSet(false);
  $('setRows').innerHTML = setRows.map((r,i) => `<div class="set-row">
    <label>Side ${sideInput(ex, r, i)}</label>
    <label>Reps <input data-set="${i}" data-field="reps" inputmode="decimal" value="${escapeHtml(String(r.reps ?? ''))}"></label>
    <label>Weight (${state.settings.unit}) <input data-set="${i}" data-field="weight" inputmode="decimal" value="${escapeHtml(String(r.weight ?? ''))}"></label>
    <button class="danger small" data-remove-set="${i}" type="button">Remove</button>
  </div>`).join('');
  document.querySelectorAll('[data-set]').forEach(inp => inp.oninput = e => setRows[Number(e.target.dataset.set)][e.target.dataset.field] = e.target.value);
  document.querySelectorAll('[data-side]').forEach(btn => btn.onclick = e => { setRows[Number(e.target.dataset.index)].side = e.target.dataset.side; renderSets(); });
  document.querySelectorAll('[data-remove-set]').forEach(btn => btn.onclick = () => { setRows.splice(Number(btn.dataset.removeSet),1); renderSets(); });
}
function sideInput(ex, r, i){
  if(ex?.mode === 'leftRight' || ex?.mode === 'sideOptional'){
    const sides = ex.mode === 'leftRight' ? ['Left','Right'] : ['Both','Left','Right'];
    return `<div class="side-tabs">${sides.map(s => `<button type="button" data-index="${i}" data-side="${s}" class="${r.side===s?'active':''}">${s}</button>`).join('')}</div>`;
  }
  r.side = 'Both'; return '<span class="muted">Both</span>';
}

async function saveWorkout(){
  const ex = getExercise(); if(!ex) return toast('Add an exercise first.');
  const sets = setRows.map(r => ({side:r.side || 'Both', reps:num(r.reps), weight:num(r.weight)})).filter(s => s.reps !== null || s.weight !== null);
  if(!sets.length) return toast('Add at least one set.');
  await addDoc(uidPath('workouts'), { date:$('workoutDate').value || today(), exerciseId:ex.id, exerciseName:ex.name, exerciseMode:ex.mode || 'standard', sets, createdAt:serverTimestamp() });
  setRows = []; addSet(false); await loadAll(); toast('Workout saved.');
}
function renderRecent(){
  $('recentWorkouts').innerHTML = state.workouts.slice(0,12).map(w => `<div class="item"><div class="item-title">${escapeHtml(w.exerciseName)} · ${w.date}</div><div class="muted">${(w.sets||[]).map(s => `${s.side !== 'Both' ? s.side + ': ' : ''}${s.weight ?? '-'}${state.settings.unit} × ${s.reps ?? '-'} reps`).join(' · ')}</div></div>`).join('') || '<p class="muted">No workouts yet.</p>';
}
function renderPBs(){
  const pbs = {};
  state.workouts.forEach(w => (w.sets||[]).forEach(s => {
    if(s.weight == null && s.reps == null) return;
    const side = s.side || 'Both'; const key = `${w.exerciseName}|${side}`;
    const score = (Number(s.weight)||0)*100000 + (Number(s.reps)||0);
    if(!pbs[key] || score > pbs[key].score) pbs[key] = {exercise:w.exerciseName, side, weight:s.weight, reps:s.reps, date:w.date, score};
  }));
  const list = Object.values(pbs).sort((a,b)=>a.exercise.localeCompare(b.exercise));
  $('pbList').innerHTML = list.map(p => `<div class="item"><div class="item-title">${escapeHtml(p.exercise)}${p.side !== 'Both' ? ' · '+p.side : ''}</div><div>${p.weight ?? '-'}${state.settings.unit} × ${p.reps ?? '-'} reps</div><div class="muted">${p.date}</div></div>`).join('') || '<p class="muted">No PBs yet.</p>';
}

async function saveExercise(){
  const name = $('exName').value.trim(); if(!name) return toast('Exercise name needed.');
  await addDoc(uidPath('exercises'), { name, category:$('exCategory').value, mode:$('exMode').value, equipment:$('exEquipment').value.trim(), demo:$('exDemo').value.trim(), notes:$('exNotes').value.trim(), createdAt:serverTimestamp() });
  ['exName','exEquipment','exDemo','exNotes'].forEach(id => $(id).value=''); await loadAll(); toast('Exercise saved.');
}

async function saveWeight(){
  const weight = num($('bodyWeight').value); if(weight === null) return toast('Add a weight.');
  await addDoc(uidPath('body'), { type:'weight', date:$('bodyDate').value || today(), weight, createdAt:serverTimestamp() });
  $('bodyWeight').value=''; await loadAll(); toast('Weight saved.');
}
async function saveMeasurements(){
  const measurements = { waist:num($('mWaist').value), hips:num($('mHips').value), chest:num($('mChest').value), leftArm:num($('mLeftArm').value), rightArm:num($('mRightArm').value), leftLeg:num($('mLeftLeg').value), rightLeg:num($('mRightLeg').value) };
  if(Object.values(measurements).every(v => v === null)) return toast('Add at least one measurement.');
  await addDoc(uidPath('body'), { type:'measurements', date:$('bodyDate').value || today(), measurements, createdAt:serverTimestamp() });
  ['mWaist','mHips','mChest','mLeftArm','mRightArm','mLeftLeg','mRightLeg'].forEach(id => $(id).value=''); await loadAll(); toast('Measurements saved.');
}
function renderBody(){
  const weights = state.body.filter(b=>b.type==='weight').sort((a,b)=>b.date.localeCompare(a.date));
  const latestW = weights[0]; const prevW = weights[1];
  const change = latestW && prevW ? (latestW.weight - prevW.weight).toFixed(1) : null;
  $('bodySummary').innerHTML = `<div class="summary-box"><strong>Current weight</strong><br>${latestW ? latestW.weight + state.settings.unit : '-'}</div><div class="summary-box"><strong>Last change</strong><br>${change ? (change > 0 ? '+' : '') + change + state.settings.unit : '-'}</div><div class="summary-box"><strong>Entries</strong><br>${state.body.length}</div>`;
  $('bodyEntries').innerHTML = state.body.slice(0,15).map(b => `<div class="item"><div class="item-title">${b.date} · ${b.type === 'weight' ? 'Weight' : 'Measurements'}</div><div class="muted">${b.type==='weight' ? b.weight + state.settings.unit : Object.entries(b.measurements||{}).filter(([,v])=>v!==null).map(([k,v])=>`${label(k)} ${v}${state.settings.measureUnit}`).join(' · ')}</div></div>`).join('') || '<p class="muted">No body entries yet.</p>';
}
function label(k){ return k.replace(/([A-Z])/g,' $1').replace(/^./,c=>c.toUpperCase()); }

async function saveSettings(){
  state.settings = { unit:$('unitSetting').value, weightMode:$('weightModeSetting').value, measureUnit:$('measureUnitSetting').value };
  await setDoc(doc(db,'users',currentUser.uid,'settings','main'), state.settings, {merge:true});
  renderAll(); toast('Settings saved.');
}
function exportData(){
  const blob = new Blob([JSON.stringify(state,null,2)], {type:'application/json'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `frever-fitness-backup-${today()}.json`; a.click(); URL.revokeObjectURL(a.href);
}
function escapeHtml(str){ return str.replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }

$('loginBtn').onclick = async () => { try{ authMsg(''); await signInWithEmailAndPassword(auth, $('authEmail').value.trim(), $('authPassword').value); }catch(e){ authMsg(e.message); } };
$('registerBtn').onclick = async () => { try{ authMsg(''); await createUserWithEmailAndPassword(auth, $('authEmail').value.trim(), $('authPassword').value); }catch(e){ authMsg(e.message); } };
$('logoutBtn').onclick = () => signOut(auth);
$('exerciseSelect').onchange = () => { setRows=[]; addSet(false); showExerciseInfo(); renderSets(); };
$('addSetBtn').onclick = () => addSet(); $('saveWorkoutBtn').onclick = saveWorkout; $('saveExerciseBtn').onclick = saveExercise; $('saveWeightBtn').onclick = saveWeight; $('saveMeasurementsBtn').onclick = saveMeasurements; $('saveSettingsBtn').onclick = saveSettings; $('exportBtn').onclick = exportData;
$('demoBtn').onclick = () => { const ex=getExercise(); if(ex?.demo) window.open(ex.demo,'_blank'); else toast('No demo URL saved for this exercise yet.'); };
$('quickAddExerciseBtn').onclick = () => document.querySelector('[data-tab="library"]').click();
document.querySelectorAll('.tab').forEach(t => t.onclick = () => { document.querySelectorAll('.tab,.panel').forEach(x => x.classList.remove('active')); t.classList.add('active'); $(t.dataset.tab).classList.add('active'); });

onAuthStateChanged(auth, async user => {
  currentUser = user;
  $('authPanel').classList.toggle('hidden', !!user); $('appPanel').classList.toggle('hidden', !user); $('logoutBtn').classList.toggle('hidden', !user); $('userEmail').textContent = user ? user.email : 'Not signed in';
  if(user){ try{ await loadAll(); } catch(e){ console.error(e); toast('Firebase is connected, but Firestore blocked access. You probably still need to update Firestore Rules.'); } }
});
