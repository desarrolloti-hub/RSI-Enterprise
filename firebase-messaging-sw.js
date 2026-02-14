// firebase-messaging-sw.js
// Compatible con Firebase 8.10.0

importScripts('https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.0/firebase-messaging.js');

firebase.initializeApp({
    apiKey: "AIzaSyBJy992gkvsT77-_fMp_O_z99wtjZiK77Y",
    authDomain: "rsienterprise.firebaseapp.com",
    projectId: "rsienterprise",
    storageBucket: "rsienterprise.appspot.com",
    messagingSenderId: "1063117165770",
    appId: "1:1063117165770:web:8555f26b25ae80bc42d033"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
    console.log('Mensaje en segundo plano:', payload);
    
    const notificationTitle = payload.notification?.title || 'RSI Enterprise';
    const notificationOptions = {
        body: payload.notification?.body || 'Tienes una nueva notificación',
        icon: '/vista/css/img/logoApp.png',
        badge: '/vista/css/img/logoApp.png',
        vibrate: [200, 100, 200],
        data: payload.data || {}
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});