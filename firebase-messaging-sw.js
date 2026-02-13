// firebase-messaging-sw.js
// Versión simplificada y robusta

// Importar Firebase de forma correcta
importScripts('https://www.gstatic.com/firebasejs/9.6.10/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.6.10/firebase-messaging-compat.js');

// Configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBJy992gkvsT77-_fMp_O_z99wtjZiK77Y",
    authDomain: "rsienterprise.firebaseapp.com",
    projectId: "rsienterprise",
    storageBucket: "rsienterprise.appspot.com",
    messagingSenderId: "1063117165770",
    appId: "1:1063117165770:web:8555f26b25ae80bc42d033"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Obtener instancia de messaging
const messaging = firebase.messaging();

// Eventos del Service Worker
self.addEventListener('install', (event) => {
    console.log('[SW] Instalado');
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log('[SW] Activado');
    event.waitUntil(clients.claim());
});

// Manejar mensajes en segundo plano
messaging.onBackgroundMessage((payload) => {
    console.log('[SW] Mensaje:', payload);
    
    const notificationTitle = payload.notification?.title || 'RSI Enterprise';
    const notificationOptions = {
        body: payload.notification?.body || 'Nueva notificación',
        icon: '/vista/css/img/logoApp.png',
        badge: '/vista/css/img/logoApp.png',
        data: payload.data || {},
        actions: [{ action: 'open', title: 'Ver' }]
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Manejar clics
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const urlToOpen = '/';
    event.waitUntil(clients.openWindow(urlToOpen));
});