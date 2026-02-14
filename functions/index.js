const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

exports.enviarNotificacion = functions.https.onRequest(async (req, res) => {
  // Configurar CORS
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");

  // Manejar preflight OPTIONS
  if (req.method === "OPTIONS") {
    return res.status(204).send("");
  }

  // Solo permitir POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    const { tokens, titulo, mensaje, data } = req.body;

    // Validar datos de entrada
    if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
      return res.status(400).json({ 
        error: "Se requiere un array 'tokens' con al menos un token" 
      });
    }

    if (!titulo || !mensaje) {
      return res.status(400).json({ 
        error: "Se requieren 'titulo' y 'mensaje'" 
      });
    }

    console.log(`📨 Enviando notificaciones a ${tokens.length} dispositivos`);
    console.log(`📝 Título: ${titulo}, Mensaje: ${mensaje}`);

    // Preparar mensajes para cada token
    const messages = tokens.map(token => ({
      token: token,
      notification: {
        title: titulo,
        body: mensaje,
      },
      data: data || {}, // Datos adicionales
      android: {
        priority: "high",
        notification: {
          sound: "default",
          clickAction: "FLUTTER_NOTIFICATION_CLICK"
        }
      },
      apns: {
        payload: {
          aps: {
            sound: "default"
          }
        }
      }
    }));

    // Enviar notificaciones en lote
    const responses = await Promise.allSettled(
      messages.map(msg => admin.messaging().send(msg))
    );

    // Contar éxitos y fallos
    const successCount = responses.filter(r => r.status === "fulfilled").length;
    const failureCount = responses.filter(r => r.status === "rejected").length;
    
    // Registrar detalles de fallos
    responses.forEach((response, index) => {
      if (response.status === "rejected") {
        console.error(`❌ Error en token ${index + 1}:`, response.reason);
      }
    });

    console.log(`✅ Éxitos: ${successCount}, Fallos: ${failureCount}`);

    // Responder con resumen
    res.json({ 
      success: true, 
      successCount,
      failureCount,
      total: tokens.length
    });

  } catch (error) {
    console.error("❌ Error en Cloud Function:", error);
    res.status(500).json({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});