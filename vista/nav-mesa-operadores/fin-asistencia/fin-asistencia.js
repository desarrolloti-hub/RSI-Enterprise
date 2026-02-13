// --- CONSTANTES Y CONFIGURACIÓN ---
const GEOLOCATION_TIMEOUT = 15000;
const REDIRECT_DELAY = 3000;
const FALLBACK_ACCURACY = 5000;

// HORARIOS BASE (9:00 AM entrada, 6:00 PM salida estándar)
const START_HOUR = 9;
const END_HOUR = 18; // 6:00 PM - Las horas extra empiezan DESPUÉS de esta hora

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

// Inicializar Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();
const auth = firebase.auth();

// Estado de la aplicación
const AppState = {
    currentUser: null,
    userData: null,
    userRole: null,
    userCoordinates: null,
    isLocationRequested: false,
    isSubmitting: false,
    entryInfo: null
};

// --- FUNCIONES DE UTILIDAD ---

// Obtener parámetros de fecha formateada - CON timeString24 para guardar en 24h
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
        timeString: now.toLocaleTimeString('es-ES'), // "6:30:45 PM" (solo para mostrar)
        timeString24: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`, // "18:30:45" (para GUARDAR)
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

// Formato 12 horas para mostrar en UI
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

// Mostrar alertas
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

// Buscar la hora de entrada del día - CORREGIDO
async function getEntryTimeForToday(userId) {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const startOfDayTimestamp = firebase.firestore.Timestamp.fromDate(today);
        const endOfDayTimestamp = firebase.firestore.Timestamp.fromDate(tomorrow);

        const entrySnapshot = await db.collection('asistencias')
            .where('userId', '==', userId)
            .where('horaEntradaRegistrada', '!=', null)
            .where('fecha', '>=', startOfDayTimestamp)
            .where('fecha', '<', endOfDayTimestamp)
            .orderBy('fecha', 'desc')
            .limit(1)
            .get();

        if (!entrySnapshot.empty) {
            const entryData = entrySnapshot.docs[0].data();
            return {
                date: entryData.fecha.toDate(),
                horaEntrada: entryData.horaEntradaRegistrada || `${START_HOUR}:00:00`,
                tipo: entryData.tipo || 'office',
                id: entrySnapshot.docs[0].id
            };
        }
    } catch (error) {
        console.error("Error obteniendo hora de entrada:", error);
    }
    
    // Fallback: 9:00 AM
    const fallbackEntry = new Date();
    fallbackEntry.setHours(START_HOUR, 0, 0, 0);
    return {
        date: fallbackEntry,
        horaEntrada: `${String(START_HOUR).padStart(2, '0')}:00:00`,
        tipo: 'office',
        id: null
    };
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

// Actualizar fecha y hora actual
function updateDateTime() {
    const currentDateElement = document.getElementById('currentDate');
    if (currentDateElement) {
        currentDateElement.innerHTML = getFormattedDateTime().fullDateTime;
    }
}

// Mostrar información del usuario con hora de entrada
function displayUserInfo(user, entryInfo = null) {
    const employeeDetails = document.getElementById('employeeDetails');
    const employeeAvatar = document.getElementById('employeeAvatar');
    
    if (!employeeDetails) return;

    const successColor = 'var(--primary-color, #4CAF50)';
    const errorColor = 'var(--secondary-color, #F44336)';

    let horaEntradaHTML = '';
    if (entryInfo && entryInfo.horaEntrada) {
        const horaFormateada = formatTo12Hour(entryInfo.horaEntrada);
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

// Configurar opciones de selección
function setupAttendanceOptions() {
    const attendanceOptions = document.querySelectorAll('.attendance-option');
    if (attendanceOptions.length > 0) {
        attendanceOptions[0].classList.add('selected');
    }
}

// Redirigir al index
function redirectByRole(role) {
    window.location.href = "/index.html";
}

// --- FUNCIONES DE GEOLOCALIZACIÓN ---

// Obtener ubicación precisa
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
                switch(error.code) {
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

// Obtener ubicación por IP (fallback)
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

// Mostrar modal de ubicación
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

// Obtener ubicación con fallback
async function getUserLocation() {
    try {
        return await getLocation();
    } catch (error) {
        console.warn("Usando ubicación de respaldo:", error);
        return await getFallbackLocation();
    }
}

// --- FUNCIONES DE ASISTENCIA ---

// Calcular tiempo trabajado y horas extra - CORREGIDO (Extra después de las 6 PM)
function calculateWorkTime(entryDate, exitDate) {
    // Tiempo total trabajado
    const totalWorkedMs = exitDate.getTime() - entryDate.getTime();
    let totalWorkedMins = Math.floor(totalWorkedMs / (1000 * 60));
    if (totalWorkedMins < 0) totalWorkedMins = 0;
    
    // Hora de salida estándar (6:00 PM)
    const standardEndTime = new Date(exitDate);
    standardEndTime.setHours(END_HOUR, 0, 0, 0);
    
    // Calcular horas extra (DESPUÉS DE LAS 6:00 PM)
    let extraHoursMins = 0;
    let isExtra = false;

    if (exitDate > standardEndTime) {
        const extraMs = exitDate.getTime() - standardEndTime.getTime();
        extraHoursMins = Math.floor(extraMs / (1000 * 60));
        isExtra = true;
    }

    // Formateo a HH:MM
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

// Validar si el usuario puede registrar salida
function validateUserForExit(userData) {
    if (!userData || !userData.id) {
        throw new Error("Datos de usuario incompletos.");
    }
    
    if (!userData.asistencia?.estado) {
        throw new Error("No tienes una asistencia activa hoy. Debes registrar entrada primero.");
    }
    
    return true;
}

// Registrar salida en Firebase - CORREGIDO
async function registerExit(exitType, userData) {
    validateUserForExit(userData);
    
    const datetime = getFormattedDateTime();
    const exitDate = new Date();
    
    // 1. Obtener la hora de entrada REAL
    const entryInfo = await getEntryTimeForToday(userData.id);
    const entryDate = entryInfo.date;
    
    // 2. Calcular tiempo trabajado y horas extra
    const timeCalculations = calculateWorkTime(entryDate, exitDate);
    
    // 3. Obtener ubicación
    AppState.userCoordinates = await getUserLocation();
    
    // 4. Actualizar el estado en colaboradores
    const collaboratorRef = db.collection('colaboradores').doc(userData.id);
    await collaboratorRef.update({
        'asistencia.estado': false,
        'asistencia.ultimoCierre': datetime.timestamp
    });

    // 5. Determinar el tipo de salida (salida_extra si es después de las 6 PM)
    const finalExitType = timeCalculations.isExtra ? 'salida_extra' : 'salida';
    
    // 6. CORREGIDO: Guardar horaRegistro en FORMATO 24 HORAS
    const exitData = {
        userId: userData.id,
        email: userData['CORREO ELECTRÓNICO EMPRESARIAL'] || '',
        nombre: userData.NOMBRE || '', 
        area: userData['ÁREA'] || '', 
        tipo: finalExitType, // 'salida' o 'salida_extra'
        fecha: datetime.timestamp,
        dia: datetime.dateString,
        horaRegistro: datetime.timeString24, // ✅ GUARDA "18:30:45"
        activo: false,
        ubicacion: AppState.userCoordinates,
        
        // DATOS DE TIEMPO
        horasTrabajadasTotal: timeCalculations.totalWorkedFormat,
        minutosTrabajadosTotal: timeCalculations.totalWorkedMins,
        horasExtra: timeCalculations.extraHoursFormat,
        minutosExtra: timeCalculations.extraHoursMins,
        horaEntradaRegistrada: entryInfo.horaEntrada, // "09:00:00"

        detalles: {
            correoPersonal: userData['CORREO ELECTRÓNICO PERSONAL'] || '', 
            correoEmpresarial: userData['CORREO ELECTRÓNICO EMPRESARIAL'] || '',
            rfc: userData.RFC || '',
            nss: userData.NSS || '',
            curp: userData.CURP || '',
            entryId: entryInfo.id // Referencia a la entrada
        }
    };

    await db.collection('asistencias').add(exitData);
    
    return { timeCalculations, entryInfo, exitDate };
}

// Finalizar asistencia
async function endAttendance(exitType, userData) {
    const { timeCalculations, entryInfo } = await registerExit(exitType, userData);

    const horaEntradaFormateada = formatTo12Hour(entryInfo.horaEntrada);
    const horaSalidaFormateada = formatTo12Hour(getFormattedDateTime().timeString24);

    let extraMessage = '';
    if (timeCalculations.isExtra) {
        extraMessage = `✨ <strong>Horas extra:</strong> ${timeCalculations.extraHoursFormat}`;
    }

    const successMessage = `
        ✅ ¡Salida registrada exitosamente!
        📅 Fecha: ${getFormattedDateTime().dateString}
        ⏰ Hora de entrada: ${horaEntradaFormateada}
        ⏰ Hora de salida: ${horaSalidaFormateada}
        ⏱️ Tiempo trabajado: ${timeCalculations.totalWorkedFormat}
        ${extraMessage}
        
        Serás redirigido en ${REDIRECT_DELAY / 1000} segundos...
    `;

    showAlert('success', '¡Salida Registrada!', successMessage);
    
    setTimeout(() => {
        redirectByRole(AppState.userRole);
    }, REDIRECT_DELAY);

    return true;
}

// Configurar botón de envío
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
            await endAttendance(exitType, AppState.userData);
        } catch (error) {
            console.error("Error al finalizar asistencia:", error);
            showAlert('error', 'Error', error.message || 'Hubo un problema al registrar tu salida.');
            
            AppState.isSubmitting = false;
            submitBtn.innerHTML = '<i class="fas fa-user-clock"></i> Registrar Salida';
            submitBtn.disabled = false;
        }
    });
}

// --- VALIDACIONES Y FLUJO PRINCIPAL ---

// Validar permisos de usuario
function validateUserPermissions(userRole) {
    const deniedRoles = ['user', 'admin'];
    return !deniedRoles.includes(userRole);
}

// Manejar usuario autenticado
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

        // Verificar si tiene asistencia activa
        if (!AppState.userData.asistencia?.estado) {
            showAlert('info', 'Sin asistencia activa',
                `No tienes una asistencia activa para hoy.
                Debes registrar tu entrada primero.
                Serás redirigido en ${REDIRECT_DELAY / 1000} segundos...`
            );
            setTimeout(() => {
                redirectByRole(AppState.userRole);
            }, REDIRECT_DELAY);
            return false;
        }

        // Obtener información de la entrada de hoy
        const entryInfo = await getEntryTimeForToday(AppState.userData.id);
        AppState.entryInfo = entryInfo;

        // Mostrar información del usuario con la hora de entrada
        displayUserInfo(AppState.userData, entryInfo);
        
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

// Inicializar flujo de ubicación
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

// --- INICIALIZACIÓN DE LA APLICACIÓN ---

// Configurar listeners de autenticación
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

// Inicializar aplicación
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