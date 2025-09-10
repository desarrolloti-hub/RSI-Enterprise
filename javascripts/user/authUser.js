// auth-check.js - Archivo externo para verificación de autenticación y roles

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

const auth = firebase.auth();
const db = firebase.firestore();

// Función para verificar autenticación y rol
function checkAuthAndRole(requiredRole) {
    return new Promise((resolve, reject) => {
        // Bandera para controlar el cierre de sesión
        let isLoggingOut = false;

        // Evitar que el usuario retroceda con las flechas del navegador
        window.history.pushState(null, document.title, window.location.href);
        window.addEventListener('popstate', function (event) {
            window.history.pushState(null, document.title, window.location.href);
        });

        auth.onAuthStateChanged(async (user) => {
            if (isLoggingOut) {
                // Si el usuario está cerrando sesión, no hacer nada
                return;
            }

            if (!user) {
                // Si el usuario no está autenticado, rechazar la promesa
                reject("No autenticado");
                return;
            }

            try {
                // Obtener datos del usuario desde Firestore usando el UID del usuario autenticado
                const userRef = db.collection("usuarios").doc(user.uid);
                const doc = await userRef.get();

                if (!doc.exists) {
                    reject("Usuario no encontrado en la base de datos");
                    return;
                }

                const userData = doc.data();
                if (userData.rol !== requiredRole) {
                    reject("Rol incorrecto");
                } else {
                    // Resolver la promesa con los datos del usuario
                    resolve({
                        uid: user.uid,
                        ...userData
                    });
                }
            } catch (error) {
                console.error("Error al verificar usuario:", error);
                reject("Error al verificar usuario");
            }
        });
    });
}

// Función mejorada para manejar el cierre de sesión
function setupLogout(buttonId) {
    const logoutButton = document.getElementById(buttonId);
    
    if (!logoutButton) {
        console.error("Botón de cierre de sesión no encontrado");
        return;
    }

    logoutButton.addEventListener("click", async function (event) {
        event.preventDefault();
        
        // Mostrar confirmación antes de cerrar sesión
        const { isConfirmed } = await Swal.fire({
            title: '¿Cerrar sesión?',
            text: "¿Estás seguro de que deseas salir de tu cuenta?",
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sí, cerrar sesión',
            cancelButtonText: 'Cancelar'
        });

        if (!isConfirmed) return;

        try {
            // Bandera para evitar múltiples clics
            if (logoutButton.disabled) return;
            logoutButton.disabled = true;
            
            // Mostrar loader
            Swal.fire({
                title: 'Cerrando sesión...',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            // Cerrar sesión en Firebase
            await auth.signOut();
            
            // Limpiar datos locales si es necesario
            localStorage.removeItem('userSession');
            sessionStorage.removeItem('tempData');
            
            // Mostrar mensaje de éxito
            Swal.fire({
                title: "¡Sesión cerrada!",
                text: "Has salido de tu cuenta correctamente.",
                icon: "success",
                timer: 2000,
                showConfirmButton: false,
                allowOutsideClick: false
            });

            // Redirigir después de 2 segundos
            setTimeout(() => {
                window.location.href = "../nav-visitantes/inicio-de-sesion.html";
            }, 2000);

        } catch (error) {
            console.error("Error al cerrar sesión:", error);
            
            // Habilitar botón nuevamente
            logoutButton.disabled = false;
            
            Swal.fire({
                title: "Error",
                text: "Ocurrió un problema al cerrar sesión. Por favor intenta nuevamente.",
                icon: "error",
                confirmButtonText: "Entendido"
            });
        }
    });
}

// Función para mostrar mensaje de error y redirigir
function handleAuthError(error) {
    let message = "";
    let redirectUrl = "../nav-visitantes/inicio-de-sesion.html";
    
    switch(error) {
        case "No autenticado":
            message = "Para continuar aquí, debes iniciar sesión.";
            break;
        case "Usuario no encontrado en la base de datos":
            message = "No se encontró tu información en la base de datos.";
            break;
        case "Rol incorrecto":
            message = "No tienes permisos para acceder a esta página.";
            redirectUrl = "../"; // Redirigir a página principal si no tiene permisos
            break;
        default:
            message = "Ocurrió un problema al verificar el usuario.";
    }

    Swal.fire({
        title: "Acceso denegado",
        text: message,
        icon: "warning",
        timer: 3000,
        showConfirmButton: false,
        allowOutsideClick: false
    });

    setTimeout(() => {
        window.location.href = redirectUrl;
    }, 3000);
}

// Función para inicializar la verificación de autenticación
function initAuthCheck(requiredRole) {
    document.addEventListener("DOMContentLoaded", async function () {
        try {
            const userData = await checkAuthAndRole(requiredRole);
            
            // Mostrar el nombre del usuario si existe el elemento
            const userNameElement = document.getElementById("user-name");
            if (userNameElement) {
                userNameElement.textContent = userData.nombreCompleto || userData.email || "Usuario";
            }
            
            // Configurar el botón de cerrar sesión si existe
            setupLogout("cerrarSesion");
            
        } catch (error) {
            handleAuthError(error);
        }
    });
}

// Exportar funciones para uso en otros archivos si es necesario
export {
    checkAuthAndRole,
    setupLogout,
    handleAuthError,
    initAuthCheck
};