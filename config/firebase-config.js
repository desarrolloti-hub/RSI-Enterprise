// firebase-config.js - VERSIÓN CORREGIDA
// Configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBJy992gkvsT77-_fMp_O_z99wtjZiK77Y",
    authDomain: "rsienterprise.firebaseapp.com",
    databaseURL: "https://rsienterprise-default-rtdb.firebaseio.com",
    projectId: "rsienterprise",
    storageBucket: "rsienterprise.firebasestorage.app",
    messagingSenderId: "1063117165770",
    appId: "1:1063117165770:web:8555f26b25ae80bc42d033",
    measurementId: "G-38F2DBG9HE"
};

// Inicializar solo si no está ya inicializado
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    console.log('✅ Firebase v8 inicializado correctamente');
} else {
    console.log('✅ Firebase v8 ya estaba inicializado');
}

// Obtener servicios
const db = firebase.firestore();
const auth = firebase.auth();
const storage = firebase.storage();

// Exportar servicios para usar con módulos ES6
export { db, auth, storage };