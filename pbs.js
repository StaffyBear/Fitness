import {auth,onAuthStateChanged,signInWithEmailAndPassword,createUserWithEmailAndPassword} from './firebase.js';
const email=document.getElementById('email'),password=document.getElementById('password'),status=document.getElementById('loginStatus');
function show(message){status.textContent=message;status.classList.remove('hidden');}
onAuthStateChanged(auth,user=>{if(user)location.href='/home/';});
document.getElementById('loginBtn').onclick=async()=>{try{show('Signing in…');await signInWithEmailAndPassword(auth,email.value.trim(),password.value);location.href='/home/';}catch(e){show(e.message.replace('Firebase: ',''));}};
document.getElementById('registerBtn').onclick=async()=>{try{show('Creating account…');await createUserWithEmailAndPassword(auth,email.value.trim(),password.value);location.href='/home/';}catch(e){show(e.message.replace('Firebase: ',''));}};
