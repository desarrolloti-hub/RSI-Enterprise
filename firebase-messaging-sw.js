// firebase-messaging-sw.js
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

// Manejar notificaciones en segundo plano
messaging.onBackgroundMessage(function(payload) {
    console.log('📨 Mensaje en segundo plano:', payload);
    
    const notificationTitle = payload.notification?.title || 'RSI Enterprise';
    const notificationOptions = {
        body: payload.notification?.body || 'Tienes una nueva notificación',
        icon: '/vista/css/img/logoApp.png',
        badge: '/vista/css/img/logoApp.png',
        vibrate: [200, 100, 200],
        data: payload.data || {},
        actions: [
            {
                action: 'open',
                title: 'Ver ticket'
            },
            {
                action: 'close',
                title: 'Cerrar'
            }
        ]
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

// Manejar clic en la notificación
self.addEventListener('notificationclick', function(event) {
    console.log('🔔 Notificación clickeada:', event);
    
    event.notification.close();
    
    // Obtener datos de la notificación
    const data = event.notification.data;
    
    // Definir URL según el tipo de ticket
    let url = '/';
    if (data && data.ticketId) {
        if (data.tipo === 'operativo') {
            url = `/vista/nav-mesa-admin/Tickets/detalle-ticket-operativo.html?id=${data.ticketId}`;
        } else {
            url = `/vista/nav-mesa-admin/Tickets/detalle-ticket-admin.html?id=${data.ticketId}`;
        }
    }
    
    // Abrir/enfocar la ventana
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
            for (let client of clientList) {
                if (client.url === url && 'focus' in client) {
                    return client.focus();
                }
            }
            return clients.openWindow(url);
        })
    );
});