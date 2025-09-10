// sw.js - Versión mejorada
const CACHE_NAME = 'rsi-notifications-v1';
const APP_ICON = 'https://rsienterprise.web.app/vista/css/img/logocon%20fondo.png';

self.addEventListener('install', (event) => {
    console.log('[SW] Instalado');
    event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
    console.log('[SW] Activado');
    event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
    if (event.data && event.data.action === 'showNotification') {
        const { title, body, ticketId } = event.data.notification;
        event.waitUntil(
            self.registration.showNotification(title, {
                body: body,
                icon: APP_ICON,
                badge: APP_ICON,
                data: { ticketId: ticketId },
                vibrate: [200, 100, 200],
                actions: [
                    { 
                        action: 'view', 
                        title: 'Ver Ticket',
                        icon: APP_ICON
                    }
                ]
            })
        );
    }
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const ticketId = event.notification.data.ticketId;

    const handleNotificationClick = async () => {
        const clients = await self.clients.matchAll({
            type: 'window',
            includeUncontrolled: true
        });

        // Buscar pestaña existente
        for (const client of clients) {
            if (client.url.includes('gestion-de-Tickets') && 'focus' in client) {
                client.postMessage({
                    action: 'notificationClick',
                    ticketId: ticketId
                });
                return client.focus();
            }
        }

        // Abrir nueva pestaña si no se encontró
        return self.clients.openWindow(`https://rsienterprise.com/vista/nav-operadores/gestion_Tickets.html`);
    };

    event.waitUntil(handleNotificationClick());
});