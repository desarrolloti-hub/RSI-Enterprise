const vapidPublicKey = "BAJbrpPYPfdMPToBY-FF_Y_yQP6h8TdAyiLOsQW02-ujvLRE5ppsGHieYkkF22uKj4muKSbDkj_FaPyP15VG_rE";

export async function subscribeUser(uid) {
    if (!("serviceWorker" in navigator)) {
        console.warn("Service Worker no soportado");
        return;
    }

    const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    console.log("SW registrado:", registration);

    const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidPublicKey
    });

    // Guardar la suscripción en Firestore
    await firebase.firestore()
        .collection("pushTokens")
        .doc(uid)
        .set({
            subscription: JSON.parse(JSON.stringify(subscription)),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

    console.log("Subscripción guardada para:", uid);
}
