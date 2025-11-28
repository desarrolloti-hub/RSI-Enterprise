// js/config/firebase-init.js
(function() {
    'use strict';

    // 1. Tus credenciales (Extraídas de tu código original)
    const firebaseConfig = {
        apiKey: "AIzaSyBJy992gkvsT77-_fMp_O_z99wtjZiK77Y",
        authDomain: "rsienterprise.firebaseapp.com",
        projectId: "rsienterprise",
        storageBucket: "rsienterprise.appspot.com",
        messagingSenderId: "1063117165770",
        appId: "1:1063117165770:web:8555f26b25ae80bc42d033"
    };

    // 2. Comprobación de seguridad
    if (typeof firebase === 'undefined') {
        console.error('❌ Error Crítico: Los scripts del SDK de Firebase no se han cargado en el HTML antes de inicializar.');
        return;
    }

    // 3. Inicializar solo si no existe ya una instancia
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
        console.log('🔥 Firebase inicializado correctamente (Configuración Centralizada).');
        
        // Opcional: Habilitar persistencia si lo necesitas en el futuro
        // firebase.firestore().enablePersistence().catch(err => console.log(err));
    } else {
        console.log('ℹ️ Firebase ya estaba inicializado, saltando configuración.');
    }

})();