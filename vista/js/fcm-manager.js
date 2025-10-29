// fcm-manager.js - Versión corregida
class FCMManager {
    constructor() {
        this.messaging = null;
        this.isSupported = this.checkSupport();
        this.init();
    }

    checkSupport() {
        return 'serviceWorker' in navigator && 
               'PushManager' in window && 
               'Notification' in window &&
               firebase && firebase.messaging;
    }

    async init() {
        if (!this.isSupported) {
            console.warn('FCM no soportado en este navegador');
            return;
        }

        try {
            // Verificar que Firebase esté disponible
            if (typeof firebase === 'undefined') {
                console.error('Firebase no está disponible');
                return;
            }

            // Inicializar Firebase Messaging
            this.messaging = firebase.messaging();
            
            // Configurar la VAPID key
            this.messaging.usePublicVapidKey('Qr_U-lOC4zjyuz4Z73kE4GZWdHA7MTcPSg1JRGe_p6E');

            // Solicitar permiso y obtener token
            await this.requestPermission();
            const token = await this.getFCMToken();
            
            if (token) {
                await this.saveTokenToFirestore(token);
                this.setupMessageHandling();
            }
            
        } catch (error) {
            console.error('Error inicializando FCM:', error);
        }
    }

    async requestPermission() {
        try {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                console.log('Permiso de notificación concedido');
                return true;
            } else {
                console.log('Permiso de notificación denegado');
                return false;
            }
        } catch (error) {
            console.error('Error solicitando permiso:', error);
            return false;
        }
    }

    async getFCMToken() {
        try {
            // Obtener el service worker registration
            const registration = await navigator.serviceWorker.ready;
            
            // Obtener token con el service worker correcto
            const token = await this.messaging.getToken({
                serviceWorkerRegistration: registration,
                vapidKey: 'BIBuWp5JN1cX4p5qkQzQYt0g4CsOQ63win5_VXYoApeZbma2Nqye8aBxnuoSCAjY'
            });
            
            if (token) {
                console.log('FCM Token obtenido:', token);
                return token;
            } else {
                console.log('No se pudo obtener el token FCM');
                return null;
            }
            
        } catch (error) {
            console.error('Error obteniendo token FCM:', error);
            return null;
        }
    }

    async saveTokenToFirestore(token) {
        try {
            const user = firebase.auth().currentUser;
            if (!user) {
                console.log('No hay usuario autenticado');
                return;
            }

            const userDoc = await firebase.firestore().collection('usuarios').doc(user.uid).get();
            if (userDoc.exists) {
                await firebase.firestore().collection('usuarios').doc(user.uid).update({
                    fcmToken: token,
                    tokenActualizado: firebase.firestore.FieldValue.serverTimestamp()
                });
                console.log('Token FCM guardado en Firestore');
            } else {
                console.log('Usuario no encontrado en Firestore');
            }
        } catch (error) {
            console.error('Error guardando token FCM:', error);
        }
    }

    setupMessageHandling() {
        // Manejar mensajes en primer plano
        this.messaging.onMessage((payload) => {
            console.log('Mensaje recibido en primer plano:', payload);
            
            this.showLocalNotification(
                payload.notification?.title || 'RSI Enterprise',
                payload.notification?.body || 'Nueva notificación',
                payload.data?.ticketId
            );
        });

        // Manejar tokens refrescados
        this.messaging.onTokenRefresh(async () => {
            console.log('Token FCM refrescado');
            const token = await this.getFCMToken();
            if (token) {
                await this.saveTokenToFirestore(token);
            }
        });
    }

    showLocalNotification(title, body, ticketId) {
        if ('Notification' in window && Notification.permission === 'granted') {
            const options = {
                body: body,
                icon: 'https://rsienterprise.web.app/vista/css/img/logocon%20fondo.png',
                badge: 'https://rsienterprise.web.app/vista/css/img/logocon%20fondo.png',
                data: { ticketId: ticketId },
                vibrate: [200, 100, 200],
                actions: [
                    { 
                        action: 'view', 
                        title: 'Ver Ticket'
                    }
                ]
            };

            const notification = new Notification(title, options);

            notification.onclick = () => {
                window.focus();
                notification.close();
                if (ticketId) {
                    window.location.href = `/vista/nav-operadores/gestion_Tickets.html?ticketId=${ticketId}`;
                }
            };
        }
    }

    // Método para eliminar token (logout)
    async deleteToken() {
        try {
            await this.messaging.deleteToken();
            console.log('Token FCM eliminado');
        } catch (error) {
            console.error('Error eliminando token FCM:', error);
        }
    }
}

// Inicializar FCM Manager cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    // Esperar a que Firebase esté listo
    const initFCM = () => {
        if (firebase && firebase.messaging) {
            window.fcmManager = new FCMManager();
        } else {
            setTimeout(initFCM, 100);
        }
    };
    initFCM();
});