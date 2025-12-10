self.addEventListener("push", event => {
    if (!event.data) return;

    const data = event.data.json();

    const options = {
        body: data.body,
        icon: "/vista/css/img/logoApp-192.png",
        badge: "/vista/css/img/logoApp-192.png",
        data: data.data || {}
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});
