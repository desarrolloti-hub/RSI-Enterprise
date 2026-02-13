const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

exports.enviarNotificacion = functions.https.onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST");
  res.set("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).send("");
  }

  try {
    const { token, titulo, mensaje } = req.body;

    const response = await admin.messaging().send({
      token: token,
      notification: {
        title: titulo,
        body: mensaje
      }
    });

    res.json({ success: true, response });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});