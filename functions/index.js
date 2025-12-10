const functions = require("firebase-functions");
const admin = require("firebase-admin");
const webpush = require("web-push");

admin.initializeApp();

webpush.setVapidDetails(
    "mailto:soporte@rsi.com",
    "BAJbrpPYPfdMPToBY-FF_Y_yQP6h8TdAyiLOsQW02-ujvLRE5ppsGHieYkkF22uKj4muKSbDkj_FaPyP15VG_rE",
    "Qr_U-lOC4zjyuz4Z73kE4GZWdHA7MTcPSg1JRGe_p6E"
);

// 🔥 Esta función se llama desde tu frontend
exports.sendTicketNotification = functions.https.onCall(async (data, context) => {
    const { colaboradorId, titulo, ticketId } = data;

    // Obtener la suscripción guardada del colaborador
    const tokenDoc = await admin.firestore()
        .collection("pushTokens")
        .doc(colaboradorId)
        .get();

    if (!tokenDoc.exists) {
        console.log("❌ No hay token guardado para este colaborador");
        return;
    }

    const subscription = tokenDoc.data().subscription;

    const payload = {
        title: "🎫 Nuevo Ticket Asignado",
        body: titulo,
        data: { ticketId }
    };

    try {
        await webpush.sendNotification(subscription, JSON.stringify(payload));
        console.log("Notificación enviada correctamente");
    } catch (error) {
        console.error("Error enviando notificación:", error);
    }
});
