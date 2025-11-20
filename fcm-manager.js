// fcm-manager.js - VERSIÓN COMPATIBLE (Firebase v8)
// Usamos Firebase v8 que es compatible con scripts tradicionales

class FCMManager {
    constructor() {
        this.messaging = null;
        this.currentToken = null;
        this.isInitialized = false;
    }

    async initialize() {
        try {
            console.log('🚀 Inicializando FCM...');
            
            // Verificar compatibilidad
            if (!this.isFCMSupported()) {
                console.warn('❌ FCM no es compatible en este navegador');
                return false;
            }

            // Registrar Service Worker primero
            await this.registerServiceWorker();
            
            // Solicitar permiso para notificaciones
            console.log('📢 Solicitando permisos...');
            const permission = await Notification.requestPermission();
            
            if (permission === 'granted') {
                console.log('✅ Permiso de notificación concedido');
                
                // Inicializar FCM (Firebase ya está inicializado globalmente)
                this.messaging = firebase.messaging();
                
                const token = await this.getFCMToken();
                
                if (token) {
                    this.setupMessageHandler();
                    this.isInitialized = true;
                    console.log('🎉 FCM inicializado correctamente');
                    return true;
                }
            } else {
                console.warn('❌ Permiso de notificación denegado:', permission);
                return false;
            }
        } catch (error) {
            console.error('💥 Error inicializando FCM:', error);
            return false;
        }
    }

    isFCMSupported() {
        return 'serviceWorker' in navigator && 
               'PushManager' in window && 
               'Notification' in window &&
               firebase.messaging.isSupported();
    }

    async registerServiceWorker() {
        if (!('serviceWorker' in navigator)) {
            throw new Error('Service Worker no soportado');
        }

        try {
            // Registrar el Service Worker
            const registration = await navigator.serviceWorker.register('/sw.js', {
                scope: '/',
                updateViaCache: 'none'
            });
            
            console.log('✅ Service Worker registrado:', registration.scope);
            
            // Esperar a que esté activo
            if (registration.installing) {
                await new Promise(resolve => {
                    registration.installing.addEventListener('statechange', (e) => {
                        if (e.target.state === 'activated') {
                            console.log('✅ Service Worker activado');
                            resolve();
                        }
                    });
                });
            }
            
            return registration;
        } catch (error) {
            console.error('❌ Error registrando Service Worker:', error);
            throw error;
        }
    }

    async getFCMToken() {
        try {
            console.log('🔑 Obteniendo token FCM...');
            
            // VAPID KEY - REEMPLAZA CON TU KEY PÚBLICA
            const vapidKey = 'BBAJbrpPYPfdMPToBY-FF_Y_yQP6h8TdAyiLOsQW02-ujvLRE5ppsGHieYkkF22uKj4muKSbDkj_FaPyP15VG_rE'; // ← REEMPLAZA ESTO
            
            this.currentToken = await this.messaging.getToken({ 
                vapidKey: vapidKey
            });

            if (this.currentToken) {
                console.log('✅ Token FCM obtenido:', this.currentToken);
                await this.saveTokenToStorage(this.currentToken);
                return this.currentToken;
            } else {
                console.log('❌ No se pudo obtener el token FCM');
                return null;
            }
        } catch (error) {
            console.error('💥 Error obteniendo token FCM:', error);
            
            // Para testing, continuar sin token
            console.log('⚠️ Continuando sin token FCM para testing');
            return 'no-token-available';
        }
    }

    async saveTokenToStorage(token) {
        try {
            localStorage.setItem('fcmToken', token);
            localStorage.setItem('fcmTokenTimestamp', new Date().toISOString());
            console.log('💾 Token guardado en localStorage');
        } catch (error) {
            console.error('Error guardando token:', error);
        }
    }

    setupMessageHandler() {
        // Manejar mensajes cuando la app está en primer plano
        this.messaging.onMessage((payload) => {
            console.log('📨 Mensaje FCM en primer plano:', payload);
            this.showLocalNotification(payload);
        });
    }

    showLocalNotification(payload) {
        const title = payload.notification?.title || 'RSI Enterprise';
        const body = payload.notification?.body || 'Tienes una nueva notificación';
        
        const options = {
            body: body,
            icon: '/vista/css/img/logoApp-192.png',
            badge: '/vista/css/img/logoApp-192.png',
            data: payload.data || {},
            requireInteraction: true,
            vibrate: [200, 100, 200]
        };

        // Usar Service Worker si está disponible
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
                type: 'SHOW_NOTIFICATION',
                notification: { title, ...options }
            });
        } else {
            // Fallback
            new Notification(title, options);
        }
    }

    // Método para probar notificaciones
    async testNotification() {
        console.log('🧪 Probando notificación...');
        
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
                type: 'TEST_NOTIFICATION'
            });
            console.log('✅ Notificación de prueba enviada al Service Worker');
        } else {
            // Fallback directo
            this.showLocalNotification({
                notification: {
                    title: '🧪 Test RSI Enterprise',
                    body: '¡Notificación de prueba exitosa! ✅'
                }
            });
        }
    }

    async deleteToken() {
        try {
            if (this.messaging && this.currentToken) {
                await this.messaging.deleteToken();
                this.currentToken = null;
                localStorage.removeItem('fcmToken');
                localStorage.removeItem('fcmTokenTimestamp');
                console.log('🗑️ Token FCM eliminado');
            }
        } catch (error) {
            console.error('Error eliminando token FCM:', error);
        }
    }

    getToken() {
        return this.currentToken || localStorage.getItem('fcmToken');
    }
}

// Crear instancia global para acceso fácil
const fcmManager = new FCMManager();