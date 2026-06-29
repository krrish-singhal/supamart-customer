// All Firebase init lives in services/firebase.js — import from there.
// This shim keeps existing screen imports working without touching every file.
export { app, auth, db } from '../services/firebase';
