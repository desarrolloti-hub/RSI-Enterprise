
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

// ============================================
// NUEVA FUNCIONALIDAD: Guardar última página
// ============================================
const DB_NAME = 'RSIEnterpriseDB';
const DB_VERSION = 1;
const STORE_NAME = 'userData';

// Función para abrir la base de datos IndexedDB
function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
    });
}

// Función para obtener la última URL guardada
async function getLastVisitedUrl() {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get('lastVisitedUrl');
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                const url = request.result || '/';
                console.log('📌 Última URL recuperada:', url);
                resolve(url);
            };
        });
    } catch (error) {
        console.error('Error al obtener última URL:', error);
        return '/';
    }
}

// Función para guardar la URL en IndexedDB
async function saveLastVisitedUrl(url) {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put(url, 'lastVisitedUrl');
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                console.log('💾 URL guardada:', url);
                resolve();
            };
        });
    } catch (error) {
        console.error('Error al guardar URL:', error);
    }
}

// Interceptar fetch para capturar las navegaciones
self.addEventListener('fetch', (event) => {
    // Solo procesar peticiones de navegación (cuando el usuario cambia de página)
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    // Si la respuesta es exitosa, guardar la URL
                    if (response.status === 200) {
                        const url = event.request.url;
                        // Guardar la URL en IndexedDB
                        event.waitUntil(saveLastVisitedUrl(url));
                    }
                    return response;
                })
                .catch(error => {
                    console.error('Error en fetch:', error);
                    throw error;
                })
        );
    }
});

// Manejar mensajes desde las páginas (para guardar URL manualmente)
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SAVE_URL') {
        const url = event.data.url;
        event.waitUntil(saveLastVisitedUrl(url));
    }
});
// ============================================
// FIN de nueva funcionalidad
// ============================================

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
self.addEventListener('notificationclick', async function(event) {
    console.log('🔔 Notificación clickeada:', event);
    
    event.notification.close();
    
    // Obtener datos de la notificación
    const data = event.notification.data;
    
    // ============================================
    // MEJORA: Obtener última URL y decidir a dónde ir
    // ============================================
    // Obtener la última URL visitada
    const lastUrl = await getLastVisitedUrl();
    
    // Definir URL según el tipo de ticket (tu lógica original)
    let url = '/'; // Valor por defecto
    
    if (data && data.ticketId) {
        if (data.tipo === 'operativo') {
            url = `/vista/nav-mesa-operativos/gestion-tickets/gestion-tickets.html`;
        } else {
            url = `/vista/nav-mesa-admin/gestion-tickets/gestion-tickets.html`;
        }
    } else {
        // Si no hay ticket, usar la última URL visitada
        url = lastUrl;
    }
    
    console.log('🔗 Navegando a:', url);
    // ============================================
    // FIN de la mejora
    // ============================================
    
    // Abrir/enfocar la ventana (tu código original intacto)
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

/*
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
            url = `/vista/nav-mesa-operativos/gestion-tickets/gestion-tickets.html`;
        } else {
            url = `/vista/nav-mesa-admin/gestion-tickets/gestion-tickets.html`;
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
*/
