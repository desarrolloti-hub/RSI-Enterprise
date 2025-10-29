const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Inicializar Admin SDK
admin.initializeApp();

// Cloud Function para procesar notificaciones
exports.processNotifications = functions.firestore
    .document('notificationsQueue/{docId}')
    .onCreate(async (snapshot, context) => {
        const notification = snapshot.data();
        const docId = context.params.docId;
        
        console.log(`🔔 Procesando notificación: ${docId}`, notification);

        try {
            // Validar datos requeridos
            if (!notification.tokens || notification.tokens.length === 0) {
                console.log('❌ No hay tokens para enviar');
                await snapshot.ref.delete();
                return;
            }

            if (!notification.title || !notification.body) {
                console.log('❌ Faltan título o cuerpo de la notificación');
                await snapshot.ref.update({ 
                    status: 'failed', 
                    error: 'Faltan título o cuerpo',
                    processedAt: admin.firestore.FieldValue.serverTimestamp()
                });
                return;
            }

            // Construir mensaje FCM
            const message = {
                notification: {
                    title: notification.title,
                    body: notification.body
                },
                data: {
                    ticketId: notification.data?.ticketId || 'unknown',
                    type: notification.data?.type || 'general',
                    url: notification.data?.url || 'https://rsienterprise.web.app',
                    click_action: 'FLUTTER_NOTIFICATION_CLICK'
                },
                webpush: {
                    headers: {
                        Urgency: 'high'
                    },
                    notification: {
                        icon: 'https://rsienterprise.web.app/vista/css/img/logocon%20fondo.png',
                        badge: 'https://rsienterprise.web.app/vista/css/img/logocon%20fondo.png',
                        image: 'https://rsienterprise.web.app/vista/css/img/logocon%20fondo.png',
                        vibrate: [200, 100, 200],
                        requireInteraction: true,
                        actions: [
                            {
                                action: 'open',
                                title: '📋 Abrir Ticket'
                            },
                            {
                                action: 'dismiss',
                                title: '❌ Cerrar'
                            }
                        ]
                    }
                },
                apns: {
                    payload: {
                        aps: {
                            sound: 'default',
                            badge: 1
                        }
                    }
                },
                android: {
                    notification: {
                        sound: 'default',
                        channelId: 'high_importance_channel'
                    }
                },
                tokens: notification.tokens
            };

            console.log(`📤 Enviando a ${message.tokens.length} dispositivos`);

            // Enviar notificación
            const response = await admin.messaging().sendEachForMulticast(message);
            
            console.log(`✅ Notificación enviada: ${response.successCount} éxitos`);
            console.log(`❌ Fallos: ${response.failureCount}`);

            // Registrar resultados
            if (response.failureCount > 0) {
                response.responses.forEach((resp, idx) => {
                    if (!resp.success) {
                        console.error(`❌ Error en token ${idx}:`, resp.error);
                    }
                });
            }

            // Eliminar de la cola después de enviar
            await snapshot.ref.delete();
            
            console.log(`✅ Notificación ${docId} procesada exitosamente`);
            
            return {
                success: response.successCount,
                failure: response.failureCount,
                docId: docId
            };
            
        } catch (error) {
            console.error('❌ Error crítico enviando notificación:', error);
            
            // Marcar como fallido pero mantener en cola para reintento
            await snapshot.ref.update({ 
                status: 'failed', 
                error: error.message,
                processedAt: admin.firestore.FieldValue.serverTimestamp(),
                retryCount: admin.firestore.FieldValue.increment(1)
            });
            
            throw error; // Para que Firebase reintente
        }
    });

// Función HTTP alternativa para testing
exports.sendTestNotification = functions.https.onRequest(async (req, res) => {
    // Permitir CORS
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST');
    
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }

    try {
        const { tokens, title, body, ticketId } = req.body;
        
        if (!tokens || !title) {
            res.status(400).json({ error: 'Faltan tokens o título' });
            return;
        }

        const message = {
            notification: {
                title: title,
                body: body || 'Notificación de prueba'
            },
            data: {
                ticketId: ticketId || 'test-ticket',
                type: 'test',
                url: 'https://rsienterprise.web.app'
            },
            tokens: Array.isArray(tokens) ? tokens : [tokens]
        };

        const response = await admin.messaging().sendEachForMulticast(message);
        
        res.json({
            success: true,
            sent: response.successCount,
            failed: response.failureCount,
            responses: response.responses
        });
        
    } catch (error) {
        console.error('Error en test:', error);
        res.status(500).json({ error: error.message });
    }
});

// Función para limpiar notificaciones antiguas
exports.cleanOldNotifications = functions.pubsub.schedule('every 24 hours').onRun(async (context) => {
    const now = admin.firestore.Timestamp.now();
    const oneDayAgo = new Date(now.toDate().getTime() - (24 * 60 * 60 * 1000));
    
    const oldNotifications = await admin.firestore()
        .collection('notificationsQueue')
        .where('timestamp', '<', oneDayAgo)
        .get();
    
    const batch = admin.firestore().batch();
    oldNotifications.docs.forEach(doc => {
        batch.delete(doc.ref);
    });
    
    await batch.commit();
    console.log(`🧹 Limpiadas ${oldNotifications.size} notificaciones antiguas`);
});