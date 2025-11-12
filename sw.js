// sw.js - Versión para notificaciones en segundo plano
const CACHE_NAME = 'rsi-notifications-v3';
const APP_ICON = '';

// Instalación
self.addEventListener('install', (event) => {
    console.log('[SW] Instalado - Listo para notificaciones en segundo plano');
    self.skipWaiting();
});

// Activación
self.addEventListener('activate', (event) => {
    console.log('[SW] Activado - Tomando control de todas las pestañas');
    event.waitUntil(self.clients.claim());
});

// MANEJO DE NOTIFICACIONES PUSH EN SEGUNDO PLANO
self.addEventListener('push', (event) => {
    console.log('[SW] Push recibido en segundo plano:', event);
    
    let data = {};
    try {
        // Parsear datos de la notificación
        if (event.data) {
            data = event.data.json();
            console.log('[SW] Datos parseados:', data);
        } else {
            // Datos por defecto si no hay payload
            data = {
                notification: {
                    title: 'RSI Enterprise',
                    body: 'Nueva notificación'
                },
                data: {
                    ticketId: 'general'
                }
            };
        }
    } catch (error) {
        console.error('[SW] Error parseando datos:', error);
        data = {
            notification: {
                title: 'RSI Enterprise',
                body: 'Nueva notificación disponible'
            },
            data: {
                ticketId: 'general'
            }
        };
    }

    // Preparar opciones de la notificación
    const options = {
        body: data.notification?.body || data.body || 'Tienes una nueva notificación',
        icon: APP_ICON,
        badge: APP_ICON,
        image: data.image || APP_ICON,
        data: {
            ticketId: data.data?.ticketId || data.ticketId,
            url: data.data?.url || data.url || `https://rsienterprise.web.app/vista/nav-operadores/gestion_Tickets.html?ticketId=${data.data?.ticketId || data.ticketId}`,
            click_action: data.data?.click_action || 'FLUTTER_NOTIFICATION_CLICK'
        },
        vibrate: [200, 100, 200, 100, 200],
        actions: [
            { 
                action: 'open', 
                title: 'Abrir Ticket',
                icon: APP_ICON
            },
            { 
                action: 'dismiss', 
                title: 'Descartar'
            }
        ],
        tag: data.data?.ticketId || data.ticketId || 'general-notification',
        requireInteraction: true,
        silent: false,
        renotify: true
    };

    console.log('[SW] Mostrando notificación con opciones:', options);

    // Mostrar la notificación
    event.waitUntil(
        self.registration.showNotification(
            data.notification?.title || data.title || 'RSI Enterprise', 
            options
        )
    );
});

// MANEJO DE CLIC EN NOTIFICACIONES
self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notificación clickeada:', event.notification.data);
    
    // Cerrar la notificación
    event.notification.close();

    const ticketId = event.notification.data.ticketId;
    const urlToOpen = event.notification.data.url || 'https://rsienterprise.web.app/vista/nav-operadores/gestion_Tickets.html';

    // Manejar diferentes acciones
    if (event.action === 'dismiss') {
        console.log('[SW] Notificación descartada');
        return;
    }

    // Abrir/mostrar la aplicación
    event.waitUntil(
        self.clients.matchAll({ 
            type: 'window', 
            includeUncontrolled: true 
        }).then((clients) => {
            console.log('[SW] Clientes encontrados:', clients.length);
            
            // Buscar si ya hay una pestaña de RSI abierta
            for (const client of clients) {
                if (client.url.includes('rsienterprise')) {
                    console.log('[SW] Enfocando pestaña existente:', client.url);
                    
                    // Enviar mensaje a la pestaña existente
                    client.postMessage({
                        action: 'notificationClick',
                        ticketId: ticketId,
                        type: 'pushNotification',
                        source: 'serviceWorker'
                    });
                    
                    return client.focus();
                }
            }

            // Si no hay pestaña abierta, abrir una nueva
            console.log('[SW] Abriendo nueva pestaña:', urlToOpen);
            return self.clients.openWindow(urlToOpen);
        })
    );
});

// MANEJO DE CIERRE DE NOTIFICACIONES
self.addEventListener('notificationclose', (event) => {
    console.log('[SW] Notificación cerrada:', event.notification.tag);
});

// MANEJO DE SINCRONIZACIÓN EN SEGUNDO PLANO
self.addEventListener('sync', (event) => {
    console.log('[SW] Sincronización en segundo plano:', event.tag);
    
    if (event.tag === 'background-sync') {
        event.waitUntil(doBackgroundSync());
    }
});

async function doBackgroundSync() {
    console.log('[SW] Realizando sincronización en segundo plano');
    // Aquí puedes agregar lógica para sincronizar datos cuando la app está en segundo plano
}

// MANEJO DE MENSAJES DESDE LA APP
self.addEventListener('message', (event) => {
    console.log('[SW] Mensaje recibido desde la app:', event.data);
    
    if (event.data && event.data.action === 'showNotification') {
        const { title, body, ticketId } = event.data.notification;
        
        event.waitUntil(
            self.registration.showNotification(title, {
                body: body,
                icon: APP_ICON,
                badge: APP_ICON,
                data: { 
                    ticketId: ticketId,
                    url: `https://rsienterprise.web.app/vista/nav-operadores/gestion_Tickets.html?ticketId=${ticketId}`
                },
                vibrate: [200, 100, 200],
                tag: ticketId,
                requireInteraction: true
            })
        );
    }
    
    // Respuesta al ping de Firebase
    if (event.data && event.data.type === 'ping') {
        event.ports[0].postMessage({
            type: 'pong',
            data: 'Service Worker activo'
        });
    }
});

// MANEJAR OFFLINE - Cache de recursos críticos
self.addEventListener('fetch', (event) => {
    // Puedes agregar lógica de cache aquí si es necesario
    event.respondWith(fetch(event.request));
});