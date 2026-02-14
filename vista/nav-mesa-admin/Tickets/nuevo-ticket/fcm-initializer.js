// fcm-initializer.js
// Este archivo debe cargarse DESPUÉS de Firebase pero ANTES de tu nuevo-ticket.js

// Variable global para el token
let fcmToken = null;

// Función para registrar el Service Worker
async function registerServiceWorker() {
    try {
        console.log('🔧 Registrando Service Worker...');
        
        if ('serviceWorker' in navigator) {
            const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
            console.log('✅ Service Worker registrado:', registration);
            return registration;
        } else {
            console.warn('❌ Service Workers no soportados');
            return null;
        }
    } catch (error) {
        console.error('❌ Error registrando Service Worker:', error);
        return null;
    }
}

// Función para solicitar permiso y obtener token
async function initializeFCM() {
    try {
        console.log('🔧 Inicializando FCM...');
        
        // 1. Registrar Service Worker
        await registerServiceWorker();
        
        // 2. Esperar a que Firebase esté listo
        if (typeof firebase === 'undefined') {
            console.error('❌ Firebase no está cargado');
            return false;
        }
        
        // 3. Solicitar permiso de notificaciones
        const permission = await Notification.requestPermission();
        console.log('📱 Permiso de notificaciones:', permission);
        
        if (permission !== 'granted') {
            console.warn('❌ Permiso denegado');
            return false;
        }
        
        // 4. Obtener token FCM
        const messaging = firebase.messaging();
        
        // IMPORTANTE: Debes obtener tu VAPID key de Firebase Console
        // Project Settings > Cloud Messaging > Web Push certificates
        const vapidKey = 'BN1Y5vuRqbNdqQOFkpo2QQlAirqwej101NKdLwdP-bOtXS-EpsycPpNfPqZKnCK8EQ7ai1IvqMAZRA9pCvLIXA4';
        
        const token = await messaging.getToken({ vapidKey });
        console.log('✅ Token FCM obtenido:', token);
        
        // 5. Guardar token globalmente
        fcmToken = token;
        
        // 6. Guardar token en Firestore si hay usuario autenticado
        if (firebase.auth().currentUser) {
            await firebase.firestore().collection('usuarios')
                .doc(firebase.auth().currentUser.uid)
                .set({
                    email: firebase.auth().currentUser.email,
                    fcmToken: token,
                    notificacionesHabilitadas: true,
                    ultimaActualizacion: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
            console.log('✅ Token guardado en Firestore');
        }
        
        // 7. Escuchar mensajes en primer plano
        messaging.onMessage((payload) => {
            console.log('📨 Mensaje recibido en primer plano:', payload);
            
            // Mostrar notificación personalizada
            if (payload.notification) {
                const notificationTitle = payload.notification.title;
                const notificationOptions = {
                    body: payload.notification.body,
                    icon: '/vista/css/img/logoApp.png',
                    badge: '/vista/css/img/logoApp.png',
                    vibrate: [200, 100, 200],
                    data: payload.data || {}
                };
                
                // Mostrar notificación
                if (Notification.permission === 'granted') {
                    new Notification(notificationTitle, notificationOptions);
                }
                
                // También mostrar con SweetAlert si prefieres
                Swal.fire({
                    title: notificationTitle,
                    text: payload.notification.body,
                    icon: 'info',
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 5000
                });
            }
        });
        
        return true;
        
    } catch (error) {
        console.error('❌ Error en initializeFCM:', error);
        return false;
    }
}

// Auto-inicializar cuando la página cargue
document.addEventListener('DOMContentLoaded', () => {
    // Esperar a que Firebase Auth esté listo
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            console.log('👤 Usuario autenticado, inicializando FCM...');
            setTimeout(async () => {
                await initializeFCM();
            }, 2000); // Pequeño retraso para asegurar que todo esté listo
        }
    });
});