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
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();
const auth = firebase.auth();
let messaging = null;

// Inicializar messaging si es posible
try {
    messaging = firebase.messaging();
    console.log("✅ Firebase Messaging inicializado");
} catch (e) {
    console.log("⚠️ Firebase Messaging no soportado:", e);
}

// Estado de la aplicación
const AppState = {
    currentUser: null,
    userData: null,
    fcmToken: null,
    isSubscribing: false
};

// Función para redirigir según el rol
function redirectToGestionTickets() {
    console.log("🔄 Redirigiendo a gestión de tickets...");
    window.location.href = '../gestion-tickets/gestion-tickets.html';
}

// Función para guardar estado de notificaciones en Firestore
async function saveNotificationState(habilitadas, token = null) {
    if (!AppState.currentUser) return false;
    
    try {
        console.log(`📋 Guardando estado de notificaciones: ${habilitadas ? 'HABILITADAS' : 'DESHABILITADAS'}`);
        
        const userRef = db.collection('usuarios').doc(AppState.currentUser.uid);
        const updateData = {
            notificacionesHabilitadas: habilitadas,
            ultimaActualizacionEstado: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Si hay token, lo guardamos también
        if (token) {
            updateData.fcmToken = token;
            updateData.fechaSuscripcion = firebase.firestore.FieldValue.serverTimestamp();
        } else {
            // Si no hay token (permiso denegado), aseguramos que no quede un token anterior
            updateData.fcmToken = firebase.firestore.FieldValue.delete();
        }
        
        await userRef.set(updateData, { merge: true });
        
        console.log(`✅ Estado de notificaciones guardado correctamente: ${habilitadas ? 'HABILITADAS' : 'DESHABILITADAS'}`);
        return true;
    } catch (error) {
        console.error('❌ Error al guardar estado de notificaciones:', error);
        return false;
    }
}

// Función para manejar errores y redirigir
function handleCompletion(success = true, permissionDenied = false) {
    if (success) {
        console.log("✅ Proceso completado exitosamente, redirigiendo...");
    } else if (permissionDenied) {
        console.log("⚠️ Permiso denegado - notificaciones deshabilitadas, redirigiendo...");
    } else {
        console.log("⚠️ Proceso finalizado con error, redirigiendo...");
    }
    setTimeout(redirectToGestionTickets, 1500);
}

// Función para preguntar al usuario si quiere activar notificaciones
async function askForNotificationPermission() {
    const result = await Swal.fire({
        title: '¿Quieres activar las notificaciones?',
        html: `
            <div style="text-align: left;">
                <p style="margin-bottom: 15px;">Las notificaciones te permitirán:</p>
                <ul style="list-style: none; padding: 0;">
                    <li style="margin-bottom: 10px;">
                        <i class="fas fa-bell" style="color: #667eea; margin-right: 10px;"></i>
                        Recibir alertas de nuevos tickets
                    </li>
                    <li style="margin-bottom: 10px;">
                        <i class="fas fa-clock" style="color: #667eea; margin-right: 10px;"></i>
                        Actualizaciones en tiempo real
                    </li>
                    <li style="margin-bottom: 10px;">
                        <i class="fas fa-exclamation-triangle" style="color: #667eea; margin-right: 10px;"></i>
                        Notificaciones importantes del sistema
                    </li>
                </ul>
                <p style="margin-top: 15px; font-size: 14px; color: #666;">
                    <i class="fas fa-info-circle" style="color: #667eea;"></i>
                    Puedes cambiar esta configuración en cualquier momento.
                </p>
            </div>
        `,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sí, activar notificaciones',
        cancelButtonText: 'No, gracias',
        confirmButtonColor: '#667eea',
        cancelButtonColor: '#6c757d',
        reverseButtons: true,
        allowOutsideClick: false
    });

    return result.isConfirmed;
}

// Función principal de suscripción
async function subscribeToNotifications() {
    if (AppState.isSubscribing) return;
    
    AppState.isSubscribing = true;
    console.log("🚀 Iniciando proceso de suscripción a notificaciones...");
    
    try {
        // PASO 1: Verificar soporte
        console.log("📋 PASO 1: Verificando soporte del navegador...");
        
        if (!('serviceWorker' in navigator)) {
            throw new Error('Service Worker no soportado');
        }
        if (!('Notification' in window)) {
            throw new Error('Notificaciones no soportadas');
        }
        if (!messaging) {
            throw new Error('Messaging no inicializado');
        }
        
        console.log("✅ PASO 1: Soporte verificado correctamente");
        
        // PASO 2: Registrar Service Worker
        console.log("📋 PASO 2: Registrando Service Worker...");
        
        let registration;
        try {
            registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
            console.log("✅ PASO 2: Service Worker registrado:", registration.scope);
        } catch (regError) {
            console.log("⚠️ Error registrando SW, intentando obtener ready:", regError);
            registration = await navigator.serviceWorker.ready;
            console.log("✅ PASO 2: Service Worker ready:", registration.scope);
        }
        
        // PASO 3: Solicitar permiso
        console.log("📋 PASO 3: Solicitando permiso de notificaciones...");
        
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            console.log("❌ PASO 3: Permiso de notificaciones denegado por el usuario");
            
            // Guardar estado como deshabilitado
            await saveNotificationState(false);
            
            handleCompletion(false, true);
            return;
        }
        
        console.log("✅ PASO 3: Permiso concedido");
        
        // PASO 4: Obtener token
        console.log("📋 PASO 4: Obteniendo token FCM...");
        
        let token = null;
        let tokenAttempts = 0;
        
        while (!token && tokenAttempts < 5) {
            tokenAttempts++;
            try {
                token = await messaging.getToken({
                    vapidKey: "BN1Y5vuRqbNdqQOFkpo2QQlAirqwej101NKdLwdP-bOtXS-EpsycPpNfPqZKnCK8EQ7ai1IvqMAZRA9pCvLIXA4",
                    serviceWorkerRegistration: registration
                });
                
                if (token) {
                    console.log(`✅ PASO 4: Token obtenido (intento ${tokenAttempts}):`, token);
                    break;
                }
            } catch (tokenError) {
                console.log(`⏳ Intento ${tokenAttempts} falló:`, tokenError);
                if (tokenAttempts < 5) {
                    console.log(`⏳ Reintentando (${tokenAttempts}/5)...`);
                    await new Promise(r => setTimeout(r, 1000));
                }
            }
        }
        
        if (!token) {
            throw new Error('No se pudo obtener el token FCM');
        }
        
        AppState.fcmToken = token;
        
        // PASO 5: Guardar en Firestore
        console.log("📋 PASO 5: Guardando token en servidor...");
        
        let saved = false;
        for (let i = 1; i <= 5; i++) {
            try {
                // Usar la función unificada para guardar estado
                await saveNotificationState(true, token);
                saved = true;
                break;
            } catch (writeError) {
                console.error(`❌ Error intento ${i}:`, writeError);
                if (i < 5) {
                    console.log(`⏳ Reintentando guardar (${i}/5)...`);
                    await new Promise(r => setTimeout(r, 1000));
                }
            }
        }
        
        if (!saved) {
            throw new Error('No se pudo guardar el token en el servidor');
        }
        
        console.log("🎉 ¡PROCESO COMPLETADO! Todas las notificaciones configuradas correctamente");
        console.log("📱 Token FCM:", token);
        
        handleCompletion(true);
        
    } catch (error) {
        console.error("❌ Error crítico en el proceso:", error);
        
        // En caso de error, también guardamos estado deshabilitado
        try {
            await saveNotificationState(false);
        } catch (saveError) {
            console.error("❌ No se pudo guardar el estado de error:", saveError);
        }
        
        handleCompletion(false);
    } finally {
        AppState.isSubscribing = false;
    }
}

// Función para obtener datos del usuario
async function fetchUserData(uid) {
    try {
        const userDoc = await db.collection('usuarios').doc(uid).get();
        if (userDoc.exists) {
            AppState.userData = userDoc.data();
            console.log("👤 Usuario cargado:", AppState.userData);
        }
    } catch (error) {
        console.error('Error al obtener datos del usuario:', error);
    }
}

// Función principal que maneja el flujo
async function handleNotificationFlow() {
    if (!AppState.currentUser) return;

    try {
        console.log("🔍 Verificando configuración actual de notificaciones...");
        const userDoc = await db.collection('usuarios').doc(AppState.currentUser.uid).get();
        
        let tieneNotificacionesActivas = false;
        
        if (userDoc.exists) {
            const userData = userDoc.data();
            // Verificar si tiene token Y notificaciones habilitadas explícitamente
            tieneNotificacionesActivas = userData.fcmToken && userData.notificacionesHabilitadas === true;
            
            if (tieneNotificacionesActivas) {
                console.log("✅ Usuario tiene notificaciones activas con token válido");
                AppState.fcmToken = userData.fcmToken;
            } else if (userData.notificacionesHabilitadas === false) {
                console.log("ℹ️ Usuario tiene notificaciones deshabilitadas previamente");
            } else {
                console.log("ℹ️ Usuario no tiene configuración de notificaciones");
            }
        }
        
        // Preguntar siempre (a menos que ya tenga notificaciones activas)
        if (!tieneNotificacionesActivas) {
            console.log("💬 Preguntando al usuario si quiere activar notificaciones...");
            const quiereActivar = await askForNotificationPermission();
            
            if (quiereActivar) {
                console.log("✅ Usuario aceptó, iniciando proceso de suscripción...");
                await subscribeToNotifications();
            } else {
                console.log("❌ Usuario rechazó, guardando estado deshabilitado...");
                await saveNotificationState(false);
                handleCompletion(false, true);
            }
        } else {
            // Ya tiene notificaciones activas, redirigir directamente
            console.log("✅ Usuario ya tiene notificaciones activas, redirigiendo...");
            handleCompletion(true);
        }
        
    } catch (error) {
        console.error('Error en el flujo de notificaciones:', error);
        handleCompletion(false);
    }
}

// Configurar listeners de autenticación
auth.onAuthStateChanged(async (user) => {
    if (user) {
        console.log("👤 Usuario autenticado:", user.email);
        AppState.currentUser = user;
        await fetchUserData(user.uid);
        
        // Iniciar el flujo de notificaciones
        setTimeout(() => {
            handleNotificationFlow();
        }, 1000);
    } else {
        // No hay usuario, redirigir al login
        console.log("❌ No hay usuario autenticado, redirigiendo a login...");
        window.location.href = 'inicio-de-sesion.html';
    }
});

// Verificar soporte al cargar
document.addEventListener('DOMContentLoaded', () => {
    console.log("📱 Página de permisos cargada");
    if (!('Notification' in window)) {
        console.error("❌ Navegador no soporta notificaciones");
        
        Swal.fire({
            icon: 'error',
            title: 'Navegador no compatible',
            text: 'Tu navegador no soporta notificaciones push. Serás redirigido.',
            confirmButtonColor: '#667eea',
            allowOutsideClick: false
        }).then(() => {
            // Si hay usuario, guardamos estado deshabilitado
            if (AppState.currentUser) {
                saveNotificationState(false).then(() => {
                    redirectToGestionTickets();
                });
            } else {
                redirectToGestionTickets();
            }
        });
    }
});