// authNavLinks.js
document.addEventListener("DOMContentLoaded", async function () {
    // 🔹 Configuración de Firebase
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

    const auth = firebase.auth();
    const db = firebase.firestore();

    // 🔹 Verificar autenticación y permisos
    auth.onAuthStateChanged(async (user) => {
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
                window.location.replace("../nav-visitantes/iniciarS.html");
            }, 3000);
            return;
        }

        try {
            const userRef = db.collection("usuarios").doc(user.uid);
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
            actualizarEnlaces(userData.rol, user.uid);

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

    // 🔹 Función para actualizar enlaces con parámetros del usuario
    function actualizarEnlaces(rol, userId) {
        const perfilLink = document.getElementById("perfilLink");
        const cerrarSesionLink = document.getElementById("cerrarSesionLink");

        // Actualizar enlace de perfil
        if (perfilLink) {
            perfilLink.href = `perfil.html?rol=${rol}&id=${userId}`;
            console.log(`Enlace de perfil actualizado: ${perfilLink.href}`);
        }

        // Agregar evento para cerrar sesión
        if (cerrarSesionLink) {
            cerrarSesionLink.addEventListener("click", async () => {
                await auth.signOut();
                Swal.fire({
                    title: "Sesión cerrada",
                    text: "Has cerrado sesión correctamente.",
                    icon: "success",
                    timer: 2000,
                    showConfirmButton: false,
                    allowOutsideClick: false
                });

                setTimeout(() => {
                    window.location.replace("../nav-visitantes/iniciarS.html");
                }, 2000);
            });
        }
    }
});