import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import { getFirestore, collection, doc, getDoc, getDocs, setDoc, addDoc, deleteDoc, updateDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';

const firebaseConfig={apiKey:'AIzaSyCH0nil4gFC03XmPFKJoxYvl3m5EcUeiTY',authDomain:'frever-fitness.firebaseapp.com',projectId:'frever-fitness',storageBucket:'frever-fitness.firebasestorage.app',messagingSenderId:'901554663270',appId:'1:901554663270:web:1f6d412d850f539a4aa2a7'};
const app=initializeApp(firebaseConfig); export const auth=getAuth(app); export const db=getFirestore(app);
export {onAuthStateChanged,createUserWithEmailAndPassword,signInWithEmailAndPassword,signOut,collection,doc,getDoc,getDocs,setDoc,addDoc,deleteDoc,updateDoc,serverTimestamp};
