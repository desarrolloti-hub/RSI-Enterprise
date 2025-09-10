document.addEventListener("DOMContentLoaded", async function () {
    // Configuración de Firebase
    const firebaseConfig = {
        apiKey: "AIzaSyBJy992gkvsT77-_fMp_O_z99wtjZiK77Y",
        authDomain: "rsienterprise.firebaseapp.com",
        projectId: "rsienterprise",
        storageBucket: "rsienterprise.appspot.com",
        messagingSenderId: "1063117165770",
        appId: "1:1063117165770:web:8555f26b25ae80bc42d033"
    };

    // Inicializar Firebase si no está inicializado
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }

    firebase.auth().onAuthStateChanged(async (user) => {
        if (!user) {
            Swal.fire({
                title: "Acceso denegado",
                text: "Para continuar aquí, debes iniciar sesión.",
                icon: "warning",
                timer: 3000,
                showConfirmButton: false,
                allowOutsideClick: false
            });

            setTimeout(() => {
                window.location.replace("../nav-visitantes/iniciarS.html"); // replace evita volver atrás
            }, 3000);
            return;
        }

        // Obtener parámetros de la URL
        const urlParams = new URLSearchParams(window.location.search);
        const userId = urlParams.get("userId");
        const userRole = urlParams.get("rol");

        if (!userId || !userRole || user.uid !== userId) {
            Swal.fire({
                title: "Error de acceso",
                text: "No tienes permisos para acceder a esta página.",
                icon: "error",
                timer: 2000,
                showConfirmButton: false,
                allowOutsideClick: false
            });

            setTimeout(() => {
                window.location.replace("../nav-visitantes/iniciarS.html");
            }, 2000);
            return;
        }

        try {
            const userRef = firebase.firestore().collection("usuarios").doc(userId);
            const doc = await userRef.get();

            if (!doc.exists) {
                Swal.fire({
                    title: "Usuario no encontrado",
                    text: "No se encontró tu información en la base de datos.",
                    icon: "error",
                    timer: 2000,
                    showConfirmButton: false,
                    allowOutsideClick: false
                });

                setTimeout(() => {
                    window.location.replace("../nav-visitantes/iniciarS.html");
                }, 2000);
                return;
            }

            const userData = doc.data();
            if (userData.rol !== "admin") {
                Swal.fire({
                    title: "Acceso denegado",
                    text: "No tienes permisos para acceder a esta página.",
                    icon: "warning",
                    timer: 2000,
                    showConfirmButton: false,
                    allowOutsideClick: false
                });

                setTimeout(() => {
                    window.location.replace("../nav-visitantes/iniciarS.html");
                }, 2000);
            } else {
                console.log("Bienvenido Admin.");
            }

        } catch (error) {
            Swal.fire({
                title: "Error",
                text: "Ocurrió un problema al verificar el usuario.",
                icon: "error",
                timer: 2000,
                showConfirmButton: false,
                allowOutsideClick: false
            });

            setTimeout(() => {
                window.location.replace("../nav-visitantes/iniciarS.html");
            }, 2000);
        }
    });
});