// --- CONSTANTES Y CONFIGURACIÓN ---
const GEOLOCATION_TIMEOUT = 15000;
const REDIRECT_DELAY = 3000;
const FALLBACK_ACCURACY = 5000;

// HORARIOS BASE
const START_HOUR = 9;
const END_HOUR = 18;

// Configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBJy992gkvsT77-_fMp_O_z99wtjZiK77Y",
    authDomain: "rsienterprise.firebaseapp.com",
    databaseURL: "https://rsienterprise-default-rtdb.firebaseio.com",
    projectId: "rsienterprise",
    storageBucket: "rsienterprise.appspot.com",
    messagingSenderId: "1063117165770",
    appId: "1:1063117165770:web:8555f26b25ae80bc42d033",
    measurementId: "G-38F2DBG9HE"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();
const auth = firebase.auth();

const AppState = {
    currentUser: null,
    userData: null,
    userRole: null,
    userCoordinates: null,
    isLocationRequested: false,
    isSubmitting: false,
    entryDocument: null
};

// --- FUNCIONES DE UTILIDAD ---

function getFormattedDateTime() {
    const now = new Date();
    return {
        timestamp: firebase.firestore.Timestamp.fromDate(now),
        dateString: now.toLocaleDateString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }),
        timeString: now.toLocaleTimeString('es-ES'),
        timeString24: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`,
        fullDateTime: now.toLocaleDateString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        })
    };
}

function formatTo12Hour(timeString) {
    if (!timeString) return 'Hora no disponible';
    let hours, minutes;
    if (typeof timeString === 'string') {
        const parts = timeString.split(':');
        hours = parseInt(parts[0], 10);
        minutes = parts[1] ? parseInt(parts[1], 10) : 0;
    } else {
        return 'Hora no disponible';
    }
    if (isNaN(hours)) return 'Hora no disponible';
    const ampm = hours >= 12 ? 'PM' : 'AM';
    let hours12 = hours % 12;
    hours12 = hours12 === 0 ? 12 : hours12;
    const minutesStr = minutes < 10 ? '0' + minutes : minutes;
    return `${hours12}:${minutesStr} ${ampm}`;
}

function showAlert(type, title, message) {
    if (typeof window.showCustomAlert === 'function') {
        switch(type) {
            case 'success':
                window.showCustomSuccess(title, message);
                break;
            case 'error':
                window.showCustomError(title, message);
                break;
            case 'info':
                window.showCustomWarning(title, message, 'Entendido');
                break;
            default:
                window.showCustomAlert({ title, text: message, icon: type });
        }
    } else {
        Swal.fire({
            icon: type,
            title: title,
            html: message,
            confirmButtonColor: '#6C43E0'
        });
    }
}

// --- FUNCIONES DE DATOS ---

// 📌 VERSIÓN SIN ÍNDICES - Primero por userId, luego filtramos por fecha
async function getEntryDocumentForToday(userId) {
    try {
        console.log("Buscando documento para userId:", userId);
        
        // 🔴 PRIMERO: Obtener TODOS los documentos del usuario (sin filtro de fecha)
        // Esto usa SOLO el índice de userId que ya existe
        const snapshot = await db.collection('asistencias')
            .where('userId', '==', userId)
            .get();

        console.log("Total documentos del usuario:", snapshot.size);

        if (snapshot.empty) {
            console.log("No hay documentos para este usuario");
            return null;
        }

        // 🔴 SEGUNDO: Filtramos por fecha HOY en JavaScript
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const todayTimestamp = firebase.firestore.Timestamp.fromDate(today);
        const tomorrowTimestamp = firebase.firestore.Timestamp.fromDate(tomorrow);

        // Buscar documentos de HOY que tengan entrada activa
        let entryDoc = null;
        
        snapshot.forEach(doc => {
            const data = doc.data();
            const fechaDoc = data.fecha;
            
            // Verificar si la fecha está entre hoy y mañana
            if (fechaDoc && fechaDoc.toDate) {
                const fecha = fechaDoc.toDate();
                if (fecha >= today && fecha < tomorrow) {
                    console.log("Documento de hoy:", doc.id, 
                        "horaEntradaRegistrada:", data.horaEntradaRegistrada, 
                        "horaSalidaRegistrada:", data.horaSalidaRegistrada);
                    
                    // Si tiene horaEntradaRegistrada y NO tiene horaSalidaRegistrada
                    if (data.horaEntradaRegistrada && !data.horaSalidaRegistrada) {
                        entryDoc = {
                            id: doc.id,
                            data: data
                        };
                    }
                }
            }
        });

        if (entryDoc) {
            console.log("✅ Documento de entrada encontrado:", entryDoc.id);
        } else {
            console.log("❌ No se encontró documento de entrada activo para hoy");
        }

        return entryDoc;
    } catch (error) {
        console.error("Error buscando documento de entrada:", error);
        return null;
    }
}

// Obtener rol del usuario
async function getUserRole(email) {
    try {
        const querySnapshot = await db.collection('usuarios')
            .where('email', '==', email)
            .limit(1)
            .get();
        return querySnapshot.empty ? null : querySnapshot.docs[0].data().rol;
    } catch (error) {
        console.error("Error al obtener rol:", error);
        return null;
    }
}

// Obtener datos del usuario
async function getUserData(email) {
    try {
        const querySnapshot = await db.collection('colaboradores')
            .where('CORREO ELECTRÓNICO EMPRESARIAL', '==', email)
            .limit(1)
            .get();

        if (!querySnapshot.empty) {
            const doc = querySnapshot.docs[0];
            const data = doc.data();

            return {
                id: doc.id,
                ...data,
                asistencia: {
                    estado: data.asistencia?.estado === true
                }
            };
        }
        return null;
    } catch (error) {
        console.error("Error al obtener datos del usuario:", error);
        return null;
    }
}

// --- FUNCIONES DE UI ---

function updateDateTime() {
    const currentDateElement = document.getElementById('currentDate');
    if (currentDateElement) {
        currentDateElement.innerHTML = getFormattedDateTime().fullDateTime;
    }
}

function displayUserInfo(user, entryDoc = null) {
    const employeeDetails = document.getElementById('employeeDetails');
    const employeeAvatar = document.getElementById('employeeAvatar');

    if (!employeeDetails) return;

    const successColor = 'var(--primary-color, #4CAF50)';
    const errorColor = 'var(--secondary-color, #F44336)';

    let horaEntradaHTML = '';
    if (entryDoc && entryDoc.data?.horaEntradaRegistrada) {
        const horaFormateada = formatTo12Hour(entryDoc.data.horaEntradaRegistrada);
        horaEntradaHTML = `<p><strong>Hora de entrada:</strong> <span style="color: ${successColor};">${horaFormateada}</span></p>`;
    }

    employeeDetails.innerHTML = `
        <h3>${user.NOMBRE || 'Nombre no disponible'}</h3>
        <p><strong>Área:</strong> ${user['ÁREA'] || 'No especificado'}</p>
        <p><strong>ID Empleado:</strong> ${user.NIT || 'ID no disponible'}</p>
        ${horaEntradaHTML}
        <p><strong>Asistencia:</strong> ${user.asistencia?.estado ?
            `<span style="color: ${successColor};">Activa desde hoy</span>` :
            `<span style="color: ${errorColor};">No iniciada hoy</span>`}</p>
    `;

    if (user.imagen) {
        employeeAvatar.src = user.imagen;
    } else {
        const name = user.NOMBRE || '';
        const initials = name.split(' ').map(n => n[0]).join('').toUpperCase();
        employeeAvatar.src = `https://ui-avatars.com/api/?name=${initials}&background=c84e4e&color=fff&size=128`;
    }
}

function setupAttendanceOptions() {
    const attendanceOptions = document.querySelectorAll('.attendance-option');
    if (attendanceOptions.length > 0) {
        attendanceOptions[0].classList.add('selected');
    }
}

function redirectByRole(role) {
    window.location.href = "/index.html";
}

// --- FUNCIONES DE GEOLOCALIZACIÓN ---

function getLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error("Geolocalización no soportada por el navegador."));
            return;
        }

        const timeout = setTimeout(() => {
            reject(new Error("Tiempo de espera agotado al obtener ubicación."));
        }, GEOLOCATION_TIMEOUT);

        navigator.geolocation.getCurrentPosition(
            (position) => {
                clearTimeout(timeout);
                resolve({
                    latitude: Math.round(position.coords.latitude * 1000) / 1000,
                    longitude: Math.round(position.coords.longitude * 1000) / 1000,
                    accuracy: position.coords.accuracy,
                    source: 'gps'
                });
            },
            (error) => {
                clearTimeout(timeout);
                let errorMessage = "Error desconocido";
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = "Permiso de ubicación denegado.";
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = "Ubicación no disponible.";
                        break;
                    case error.TIMEOUT:
                        errorMessage = "Tiempo de espera agotado.";
                        break;
                }
                reject(new Error(errorMessage));
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    });
}

async function getFallbackLocation() {
    try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        return {
            latitude: data.latitude || 0,
            longitude: data.longitude || 0,
            accuracy: FALLBACK_ACCURACY,
            source: 'ip'
        };
    } catch (error) {
        return {
            latitude: 0,
            longitude: 0,
            accuracy: 10000,
            source: 'fallback'
        };
    }
}

async function showLocationModal() {
    const result = await Swal.fire({
        title: 'Ubicación Requerida',
        html: `Para registrar tu salida, necesitamos acceder a tu ubicación actual.`,
        icon: 'info',
        showCancelButton: false,
        confirmButtonText: '<i class="fas fa-location-arrow"></i> Permitir Ubicación',
        allowOutsideClick: false,
        showLoaderOnConfirm: true,
        preConfirm: async () => {
            try {
                return await getLocation();
            } catch (error) {
                Swal.showValidationMessage(error.message);
                return false;
            }
        }
    });

    if (result.isConfirmed && result.value) {
        AppState.userCoordinates = result.value;
        AppState.isLocationRequested = true;
        return true;
    }
    return false;
}

async function getUserLocation() {
    try {
        return await getLocation();
    } catch (error) {
        console.warn("Usando ubicación de respaldo:", error);
        return await getFallbackLocation();
    }
}

// --- FUNCIONES DE ASISTENCIA ---

function calculateWorkTime(entryDate, exitDate) {
    const totalWorkedMs = exitDate.getTime() - entryDate.getTime();
    let totalWorkedMins = Math.floor(totalWorkedMs / (1000 * 60));
    if (totalWorkedMins < 0) totalWorkedMins = 0;

    const standardEndTime = new Date(exitDate);
    standardEndTime.setHours(END_HOUR, 0, 0, 0);

    let extraHoursMins = 0;
    let isExtra = false;

    if (exitDate > standardEndTime) {
        const extraMs = exitDate.getTime() - standardEndTime.getTime();
        extraHoursMins = Math.floor(extraMs / (1000 * 60));
        isExtra = true;
    }

    const formatMinutes = (minutes) => {
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m`;
    };

    return {
        totalWorkedMins,
        totalWorkedFormat: formatMinutes(totalWorkedMins),
        extraHoursMins,
        extraHoursFormat: formatMinutes(extraHoursMins),
        isExtra
    };
}

function validateUserForExit(userData) {
    if (!userData || !userData.id) {
        throw new Error("Datos de usuario incompletos.");
    }
    if (!userData.asistencia?.estado) {
        throw new Error("No tienes una asistencia activa hoy.");
    }
    return true;
}

// Registrar salida - SOBREESCRIBE EL MISMO DOCUMENTO
async function registerExit(exitType, userData, entryDoc) {
    validateUserForExit(userData);

    const datetime = getFormattedDateTime();
    const exitDate = new Date();

    const horaEntrada = entryDoc.data.horaEntradaRegistrada || `${START_HOUR}:00:00`;
    
    const [hours, minutes, seconds] = horaEntrada.split(':').map(Number);
    const entryDate = new Date(exitDate);
    entryDate.setHours(hours, minutes, seconds || 0, 0);

    const timeCalculations = calculateWorkTime(entryDate, exitDate);
    AppState.userCoordinates = await getUserLocation();

    await db.collection('colaboradores').doc(userData.id).update({
        'asistencia.estado': false,
        'asistencia.ultimoCierre': datetime.timestamp
    });

    const finalExitType = timeCalculations.isExtra ? 'salida_extra' : 'salida';

    const entryDocRef = db.collection('asistencias').doc(entryDoc.id);
    
    const updatedData = {
        userId: entryDoc.data.userId,
        email: entryDoc.data.email,
        nombre: entryDoc.data.nombre,
        area: entryDoc.data.area,
        fecha: datetime.timestamp,
        dia: datetime.dateString,
        horaEntradaRegistrada: entryDoc.data.horaEntradaRegistrada,
        activo: false,
        ubicacion: AppState.userCoordinates,
        detalles: entryDoc.data.detalles || {},
        tipo: finalExitType,
        horaSalidaRegistrada: datetime.timeString24,
        horasTrabajadasTotal: timeCalculations.totalWorkedFormat,
        minutosTrabajadosTotal: timeCalculations.totalWorkedMins,
        horasExtra: timeCalculations.extraHoursFormat,
        minutosExtra: timeCalculations.extraHoursMins
    };

    console.log("📝 SOBREESCRIBIENDO documento:", entryDoc.id);
    await entryDocRef.set(updatedData);

    return { timeCalculations, horaEntrada };
}

async function endAttendance(exitType, userData, entryDoc) {
    const { timeCalculations, horaEntrada } = await registerExit(exitType, userData, entryDoc);

    const horaEntradaFormateada = formatTo12Hour(horaEntrada);
    const horaSalidaFormateada = formatTo12Hour(getFormattedDateTime().timeString24);

    const successMessage = `
        ✅ ¡Salida registrada exitosamente!
        📅 Fecha: ${getFormattedDateTime().dateString}
        ⏰ Hora de entrada: ${horaEntradaFormateada}
        ⏰ Hora de salida: ${horaSalidaFormateada}
        ⏱️ Tiempo trabajado: ${timeCalculations.totalWorkedFormat}
        ${timeCalculations.isExtra ? `✨ Horas extra: ${timeCalculations.extraHoursFormat}` : ''}
        
        Serás redirigido en ${REDIRECT_DELAY / 1000} segundos...
    `;

    showAlert('success', '¡Salida Registrada!', successMessage);

    setTimeout(() => {
        redirectByRole(AppState.userRole);
    }, REDIRECT_DELAY);

    return true;
}

function setupSubmitButton() {
    const submitBtn = document.getElementById('submitAttendance');

    submitBtn.addEventListener('click', async function() {
        if (AppState.isSubmitting) return;

        const selectedOption = document.querySelector('.attendance-option.selected');
        const exitType = selectedOption ? selectedOption.getAttribute('data-value') : 'normal_exit';

        AppState.isSubmitting = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registrando Salida...';
        submitBtn.disabled = true;

        try {
            await endAttendance(exitType, AppState.userData, AppState.entryDocument);
        } catch (error) {
            console.error("Error al finalizar asistencia:", error);
            showAlert('error', 'Error', error.message || 'Hubo un problema al registrar tu salida.');

            AppState.isSubmitting = false;
            submitBtn.innerHTML = '<i class="fas fa-user-clock"></i> Registrar Salida';
            submitBtn.disabled = false;
        }
    });
}

// --- FLUJO PRINCIPAL ---

function validateUserPermissions(userRole) {
    const deniedRoles = ['user', 'admin'];
    return !deniedRoles.includes(userRole);
}

async function handleAuthenticatedUser(user) {
    try {
        AppState.userData = await getUserData(user.email);
        if (!AppState.userData) {
            throw new Error('No se encontraron datos para este usuario');
        }

        AppState.userRole = await getUserRole(user.email);
        if (!validateUserPermissions(AppState.userRole)) {
            throw new Error('No tienes permisos para acceder a esta función');
        }

        if (!AppState.userData.asistencia?.estado) {
            showAlert('info', 'Asistencia activa',
                `tienes una asistencia activa para hoy.\nSerás redirigido en ${REDIRECT_DELAY / 1000} segundos...`
            );
            setTimeout(() => {
                redirectByRole(AppState.userRole);
            }, REDIRECT_DELAY);
            return false;
        }

        const entryDocument = await getEntryDocumentForToday(AppState.userData.id);
        
        if (!entryDocument) {
            showAlert('error', 'Error',
                `No se encontró el registro de entrada para hoy.\nDebes registrar entrada primero.`
            );
            setTimeout(() => {
                redirectByRole(AppState.userRole);
            }, REDIRECT_DELAY);
            return false;
        }

        AppState.entryDocument = entryDocument;
        displayUserInfo(AppState.userData, entryDocument);

        return true;
    } catch (error) {
        console.error("Error manejando usuario autenticado:", error);
        showAlert('error', 'Error', error.message);

        setTimeout(() => {
            auth.signOut().then(() => {
                window.location.href = "/vista/nav-visitantes/inicio-de-sesion.html";
            });
        }, REDIRECT_DELAY);

        return false;
    }
}

async function initializeLocationFlow() {
    if (AppState.userData.asistencia?.estado && !AppState.isLocationRequested) {
        const locationConfirmed = await showLocationModal();
        if (!locationConfirmed) {
            showAlert('error', 'Ubicación Requerida', 'La salida requiere acceso a tu ubicación.');
            return false;
        }
    }
    return true;
}

function setupAuthListener() {
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            AppState.currentUser = user;

            const userValid = await handleAuthenticatedUser(user);
            if (!userValid) return;

            const locationInitialized = await initializeLocationFlow();
            if (locationInitialized) {
                setupSubmitButton();
            }
        } else {
            window.location.href = "/vista/nav-visitantes/inicio-de-sesion.html";
        }
    });
}

function initApp() {
    updateDateTime();
    setInterval(updateDateTime, 1000);

    setupAttendanceOptions();
    setupAuthListener();

    setTimeout(() => {
        const attendanceContainer = document.getElementById('attendanceContainer');
        if (attendanceContainer) {
            attendanceContainer.classList.add('loaded');
        }
    }, 100);
}

document.addEventListener('DOMContentLoaded', initApp);