// --- CONSTANTES Y CONFIGURACIÓN ---
const LONG_PRESS_DELAY = 5000;
const GEOLOCATION_TIMEOUT = 15000;
const REDIRECT_DELAY = 3000;
const FALLBACK_ACCURACY = 5000;
const TETRIS_CLICKS_REQUIRED = 5;
const TETRIS_CLICK_TIME_LIMIT = 2000;

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

// Estado de la aplicación
const AppState = {
    currentUser: null,
    userData: null,
    userRole: null,
    userCoordinates: null,
    isLocationRequested: false,
    isSubmitting: false,
    longPressTimer: null,
    tetrisClickCount: 0,
    tetrisLastClickTime: 0,
    hasAttendanceToday: false,
    existingAttendanceData: null
};

// --- FUNCIONES DE UTILIDAD ---
async function showAlert(type, title, message) {
    if (typeof window.showCustomAlert === 'function') {
        switch(type) {
            case 'success':
                if (typeof window.showCustomSuccess === 'function') {
                    return await window.showCustomSuccess(title, message);
                }
                break;
            case 'error':
                if (typeof window.showCustomError === 'function') {
                    return await window.showCustomError(title, message);
                }
                break;
            case 'info':
                if (typeof window.showCustomWarning === 'function') {
                    return await window.showCustomWarning(title, message, 'Entendido');
                }
                break;
        }
        return await window.showCustomAlert({ title, text: message, icon: type });
    } else {
        return await Swal.fire({ 
            icon: type, 
            title: title, 
            html: message, 
            confirmButtonColor: '#4e54c8',
            allowOutsideClick: false
        });
    }
}

async function showLocationAlert() {
    return await Swal.fire({
        title: 'Ubicación Requerida',
        html: 'Para registrar tu asistencia, necesitamos acceder a tu ubicación actual. Esto nos ayuda a verificar tu presencia en el lugar de trabajo.',
        icon: 'info',
        showCancelButton: true,
        confirmButtonText: 'Permitir Ubicación',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#4e54c8',
        allowOutsideClick: false
    });
}

function getFormattedDateTime() {
    const now = new Date();
    return {
        timestamp: firebase.firestore.Timestamp.fromDate(now),
        dateString: now.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
        timeString: now.toLocaleTimeString('es-ES'),
        fullDateTime: now.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'})
    };
}

// --- FUNCIONES PARA VERIFICAR ASISTENCIA DEL DÍA ---
function getTodayDateKey() {
    const today = new Date();
    return `attendance_${today.getFullYear()}_${today.getMonth()}_${today.getDate()}`;
}

function hasAttendanceInLocalStorage(userId) {
    const todayKey = getTodayDateKey();
    const storedData = localStorage.getItem(`attendance_${userId}`);
    
    if (storedData) {
        const data = JSON.parse(storedData);
        return data.dateKey === todayKey && data.attendanceTaken === true;
    }
    return false;
}

function saveAttendanceToLocalStorage(userId) {
    const todayKey = getTodayDateKey();
    const data = {
        dateKey: todayKey,
        attendanceTaken: true,
        timestamp: new Date().toISOString()
    };
    localStorage.setItem(`attendance_${userId}`, JSON.stringify(data));
}

async function checkAttendanceInFirebase(userId) {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const querySnapshot = await db.collection('asistencias')
            .where('userId', '==', userId)
            .where('fecha', '>=', firebase.firestore.Timestamp.fromDate(today))
            .where('fecha', '<', firebase.firestore.Timestamp.fromDate(tomorrow))
            .limit(1)
            .get();
        
        return !querySnapshot.empty ? querySnapshot.docs[0].data() : null;
    } catch (error) {
        console.error("Error al verificar asistencia en Firebase:", error);
        return null;
    }
}

async function checkAttendanceInCollaborators(email) {
    try {
        const querySnapshot = await db.collection('colaboradores')
            .where('CORREO ELECTRÓNICO EMPRESARIAL', '==', email)
            .limit(1)
            .get();
        
        if (querySnapshot.empty) return null;
        
        const collaboratorData = querySnapshot.docs[0].data();
        if (collaboratorData.asistencia?.estado === true && collaboratorData.asistencia?.fecha) {
            const lastAttendanceDate = collaboratorData.asistencia.fecha.toDate();
            const today = new Date();
            
            if (lastAttendanceDate.getDate() === today.getDate() && 
                lastAttendanceDate.getMonth() === today.getMonth() && 
                lastAttendanceDate.getFullYear() === today.getFullYear()) {
                return collaboratorData.asistencia;
            }
        }
        return null;
    } catch (error) {
        console.error("Error al verificar asistencia en colaboradores:", error);
        return null;
    }
}

async function checkDoubleAttendance(userId, email) {
    try {
        const [firebaseAttendance, collaboratorAttendance] = await Promise.all([
            checkAttendanceInFirebase(userId),
            checkAttendanceInCollaborators(email)
        ]);
        
        if (firebaseAttendance || collaboratorAttendance) {
            return {
                exists: true,
                firebaseData: firebaseAttendance,
                collaboratorData: collaboratorAttendance,
                horaRegistro: firebaseAttendance?.fecha ? 
                    firebaseAttendance.fecha.toDate().toLocaleTimeString('es-ES') : 
                    (collaboratorAttendance?.fecha ? 
                        collaboratorAttendance.fecha.toDate().toLocaleTimeString('es-ES') : 
                        'No disponible'),
                tipo: firebaseAttendance?.tipo || collaboratorAttendance?.tipo || 'No especificado'
            };
        }
        
        return { exists: false };
    } catch (error) {
        console.error("Error verificando doble asistencia:", error);
        return { exists: false };
    }
}

// --- FUNCIONES DE DATOS, UI, GEOLOCALIZACIÓN Y ASISTENCIA ---
async function getUserRole(email) {
    try {
        const querySnapshot = await db.collection('usuarios').where('email', '==', email).limit(1).get();
        return !querySnapshot.empty ? querySnapshot.docs[0].data().rol : null;
    } catch (error) {
        window.manejarErrorGlobal?.(error);
        return null;
    }
}

async function getUserData(email) {
    try {
        let querySnapshot = await db.collection('colaboradores').where('CORREO ELECTRÓNICO EMPRESARIAL', '==', email).limit(1).get();
        
        if (querySnapshot.empty) {
            querySnapshot = await db.collection('colaboradores').where('CORREO ELECTRÓNICO EMPRESARIAL', '>=', email.toLowerCase()).where('CORREO ELECTRÓNICO EMPRESARIAL', '<=', email.toLowerCase() + '\uf8ff').limit(1).get();
        }
        
        return !querySnapshot.empty ? { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() } : null;
    } catch (error) { 
        window.manejarErrorGlobal?.(error);
        return null; 
    }
}

function displayUserInfo(user, existingAttendance = null) {
    const employeeDetails = document.querySelector('.employee-details');
    const employeeAvatar = document.getElementById('employeeAvatar');
    if (!employeeDetails) return;
    
    const area = user['ÁREA'] || 'No especificado';
    const nit = user.NIT || 'ID no disponible';
    const rfc = user.RFC || 'No disponible';
    const telefono = user['TELÉFONO MOVIL'] || 'No disponible';
    const successColor = 'var(--success-color, #4CAF50)';
    const errorColor = 'var(--error-color, #f44336)';
    
    let attendanceStatus = '';
    if (existingAttendance) {
        const fechaRegistro = existingAttendance.fecha.toDate();
        const horaRegistro = fechaRegistro.toLocaleTimeString('es-ES', {hour: '2-digit', minute:'2-digit'});
        const tipoAsistencia = existingAttendance.tipo ? getAttendanceTypeName(existingAttendance.tipo) : 'No especificado';
        
        attendanceStatus = `
            <p><strong>Asistencia hoy:</strong> 
            <span style="color: ${successColor}; font-weight: bold;">✓ YA REGISTRADA (${horaRegistro})</span></p>
            <p><strong>Tipo:</strong> ${tipoAsistencia}</p>
            <p style="color: #ff6b6b; font-weight: bold;">
            <i class="fas fa-exclamation-triangle"></i> Solo se permite una asistencia por día
            </p>
        `;
    } else {
        attendanceStatus = `
            <p><strong>Asistencia hoy:</strong> 
            <span style="color: ${errorColor}; font-weight: bold;">PENDIENTE</span></p>
            <p style="color: #4e54c8; font-style: italic;">
            <i class="fas fa-info-circle"></i> Puedes registrar asistencia una vez por día
            </p>
        `;
    }
    
    employeeDetails.innerHTML = `
        <h3>${user.NOMBRE || 'Nombre no disponible'}</h3>
        <p><strong>Área:</strong> ${area}</p>
        <p><strong>ID Empleado:</strong> ${nit}</p>
        <p><strong>RFC:</strong> ${rfc}</p>
        <p><strong>Teléfono:</strong> ${telefono}</p>
        ${attendanceStatus}`;
        
    if (user.imagen) {
        employeeAvatar.src = user.imagen;
    } else {
        const name = user.NOMBRE || '';
        const initials = name.split(' ').map(n => n[0]).join('').toUpperCase();
        employeeAvatar.src = `https://ui-avatars.com/api/?name=${initials}&background=4e54c8&color=fff&size=128`;
    }
}

function updateDateTime() {
    const currentDateElement = document.getElementById('currentDate');
    if (currentDateElement) {
        currentDateElement.textContent = getFormattedDateTime().fullDateTime;
    }
}

function setupAttendanceOptions() {
    const attendanceOptions = document.querySelectorAll('.attendance-option');
    attendanceOptions.forEach(option => {
        option.addEventListener('click', function() {
            if (AppState.hasAttendanceToday) {
                showAlert('info', 'Asistencia ya registrada', 'Ya has registrado tu asistencia para hoy. Solo se permite una vez por día.');
                return;
            }
            attendanceOptions.forEach(opt => opt.classList.remove('selected'));
            this.classList.add('selected');
        });
    });
}

// Redirección específica para colaborador
function redirectByRole(role) {
    const rolePaths = {
        'puntoVenta': '../nav-puntoVenta/inicio.html',
        'facturas': '../nav-facturas/facturas.html',
        'colaborador': '../gestion-tickets/gestion-tickets.html',
        'admincolaborador': '../gestion-tickets/gestion-tickets.html'
    };
    const redirectPath = rolePaths[role] || "../gestion-tickets/gestion-tickets.html";
    window.location.href = redirectPath;
}

function getAttendanceTypeName(type) {
    const types = { 'office': 'En oficina', 'site': 'En sitio', 'iztapaluca': 'En oficina de Iztapaluca', 'sick': 'Incapacidad' };
    return types[type] || type;
}

function getLocation() { 
    return new Promise((resolve, reject) => {
        const rechazarComoUsuario = (msg)=>{
            const error = new Error(msg);
            error.isUserError = true;
            return error;
        }

        if (!navigator.geolocation) {
            reject(rechazarComoUsuario("Geolocalización no soportada por el navegador")); return;
        }
        const timeout = setTimeout(() => {
            reject(rechazarComoUsuario("Tiempo de espera agotado al obtener ubicación"));
        }, GEOLOCATION_TIMEOUT); 
        navigator.geolocation.getCurrentPosition(
            (position) => {
                clearTimeout(timeout); 
                if (position.coords.accuracy > 1000) {
                    reject(rechazarComoUsuario("La precisión de la ubicación es demasiado baja. Intenta en un área con mejor señal.")); return;
                }
                const coordinates = { latitude: Math.round(position.coords.latitude * 1000) / 1000, longitude: Math.round(position.coords.longitude * 1000) / 1000, accuracy: position.coords.accuracy, timestamp: firebase.firestore.Timestamp.fromDate(new Date()) };
                sessionStorage.setItem('userCoordinates', JSON.stringify(coordinates));
                resolve(coordinates);
            },
            (error) => {
                clearTimeout(timeout); 
                let errorMessage = "Error desconocido";
                switch(error.code) {
                    case error.PERMISSION_DENIED: errorMessage = "Permiso de ubicación denegado. Por favor habilita los permisos."; break;
                    case error.POSITION_UNAVAILABLE: errorMessage = "La información de ubicación no está disponible."; break;
                    case error.TIMEOUT: errorMessage = "La solicitud de ubicación ha caducado. Intenta nuevamente."; break;
                }
                reject(rechazarComoUsuario(errorMessage));
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    });
}

async function getFallbackLocation() { 
    try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        return { latitude: data.latitude || 0, longitude: data.longitude || 0, accuracy: FALLBACK_ACCURACY, source: 'ip' };
    } catch (error) {
        return null;
    }
}

async function getUserLocation() {
    try {
        const storedCoords = sessionStorage.getItem('userCoordinates');
        if (storedCoords) {
            return JSON.parse(storedCoords);
        }
        return await getLocation();
    } catch (error) {
        console.warn("No se pudo obtener la ubicación precisa, usando ubicación de respaldo:", error.message);
        return await getFallbackLocation();
    }
}

async function showLocationPermissionModal() {
    try {
        const result = await showLocationAlert();
        if (result && result.isConfirmed) {
            try {
                const coords = await getLocation();
                AppState.userCoordinates = coords;
                await showAlert('success', 'Ubicación obtenida', 'Ahora puedes registrar tu asistencia.');
                return true;
            } catch (error) {
                if (error.isUserError) {
                    console.warn("Error de geolocalización controlado:", error.message);
                    await showAlert('error', 'Problema de Ubicación', error.message);
                } else {
                    window.manejarErrorGlobal?.(error);
                    await showAlert('error', 'Error Crítico', 'Ha ocurrido un error inesperado.');
                }
                return false;
            }
        } else {
            await showAlert('info', 'Ubicación requerida', 'La ubicación es necesaria para registrar tu asistencia. Puedes intentar de nuevo cuando estés listo.');
            return false;
        }
    } catch (error) {
        window.manejarErrorGlobal?.(error);
        return false;
    }
}

async function validateNoDuplicateAttendanceBeforeRegister(userId, email) {
    try {
        if (hasAttendanceInLocalStorage(userId)) {
            return {
                hasAttendance: true,
                source: 'localStorage',
                message: 'Ya registraste asistencia hoy desde este dispositivo.'
            };
        }
        
        const doubleCheck = await checkDoubleAttendance(userId, email);
        if (doubleCheck.exists) {
            return {
                hasAttendance: true,
                source: 'firebase',
                data: doubleCheck,
                message: 'Ya tienes una asistencia registrada para hoy.'
            };
        }
        
        return { hasAttendance: false };
    } catch (error) {
        console.error("Error validando asistencia duplicada:", error);
        return { hasAttendance: false };
    }
}

async function registerAttendance(attendanceType, userData) {
    try {
        const validationResult = await validateNoDuplicateAttendanceBeforeRegister(userData.id, userData['CORREO ELECTRÓNICO EMPRESARIAL']);
        
        if (validationResult.hasAttendance) {
            await showAlert('error', 'Asistencia ya registrada', 
                validationResult.message + '\n\nSolo se permite una asistencia por día.');
            
            AppState.hasAttendanceToday = true;
            setTimeout(() => {
                redirectByRole(AppState.userRole);
            }, 2000);
            
            return false;
        }

        const datetime = getFormattedDateTime();
        if (!AppState.userCoordinates) {
            AppState.userCoordinates = await getUserLocation();
        }
        
        await db.collection('colaboradores').doc(userData.id).update({
            asistencia: { estado: true, tipo: attendanceType, fecha: datetime.timestamp },
            ultimaAsistencia: datetime.timestamp
        });
        
        const attendanceData = {
            userId: userData.id, 
            email: userData['CORREO ELECTRÓNICO EMPRESARIAL'], 
            nombre: userData.NOMBRE,
            area: userData['ÁREA'], 
            tipo: attendanceType, 
            fecha: datetime.timestamp, 
            dia: datetime.dateString,
            horaRegistro: datetime.timeString, 
            activo: true, 
            ubicacion: AppState.userCoordinates,
            detalles: { 
                correoPersonal: userData['CORREO ELECTRONICO PERSONAL'], 
                correoEmpresarial: userData['CORREO ELECTRÓNICO EMPRESARIAL'], 
                rfc: userData.RFC 
            }
        };
        
        await db.collection('asistencias').add(attendanceData);
        saveAttendanceToLocalStorage(userData.id);
        
        const userRole = await getUserRole(userData['CORREO ELECTRÓNICO EMPRESARIAL']);
        const tipoAsistencia = getAttendanceTypeName(attendanceType);
        
        const mensajeExito = `
            ¡Asistencia registrada exitosamente!
            • Tipo: ${tipoAsistencia}
            • Hora: ${datetime.timeString}
            • Fecha: ${datetime.dateString}
            ¡Recuerda que solo puedes registrar asistencia una vez por día!
            Serás redirigido en 3 segundos...
        `;
        
        await showAlert('success', '✅ Asistencia registrada', mensajeExito);
        
        setTimeout(() => { 
            redirectByRole(userRole); 
        }, REDIRECT_DELAY);
        
        return true;
    } catch (error) { 
        window.manejarErrorGlobal?.(error);
        await showAlert('error', 'Error', 'No se pudo registrar la asistencia. Intenta nuevamente.');
        return false; 
    }
}

function setupSubmitButton(userData) {
    const submitBtn = document.getElementById('submitAttendance');
    const optionsGrid = document.querySelector('.options-grid');
    
    if (AppState.hasAttendanceToday) {
        submitBtn.innerHTML = '<i class="fas fa-check-double"></i> Asistencia Ya Registrada';
        submitBtn.disabled = true;
        submitBtn.style.backgroundColor = '#6c757d';
        submitBtn.style.cursor = 'not-allowed';
        
        document.querySelectorAll('.attendance-option').forEach(option => {
            option.classList.add('disabled-option');
            option.style.pointerEvents = 'none';
            option.style.opacity = '0.5';
        });
        
        setTimeout(() => {
            if (AppState.userRole) {
                redirectByRole(AppState.userRole);
            }
        }, 3000);
        
        return;
    }
    
    submitBtn.addEventListener('click', async function() {
        if (AppState.isSubmitting) return;
        
        const validationResult = await validateNoDuplicateAttendanceBeforeRegister(userData.id, userData['CORREO ELECTRÓNICO EMPRESARIAL']);
        
        if (validationResult.hasAttendance) {
            await showAlert('info', 'Asistencia ya registrada', 
                validationResult.message + '\n\nSerás redirigido automáticamente.');
            
            AppState.hasAttendanceToday = true;
            setupSubmitButton(userData);
            return;
        }
        
        const selectedOption = document.querySelector('.attendance-option.selected');
        if (!selectedOption) {
            await showAlert('error', 'Selecciona una opción', 'Debes seleccionar un tipo de asistencia antes de continuar.');
            if (optionsGrid) { 
                optionsGrid.style.animation = 'shake 0.5s'; 
                setTimeout(() => { optionsGrid.style.animation = ''; }, 500); 
            }
            return;
        }
        
        const attendanceType = selectedOption.getAttribute('data-value');
        AppState.isSubmitting = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registrando...';
        submitBtn.disabled = true;
        
        try {
            const success = await registerAttendance(attendanceType, userData);
            if (!success) {
                submitBtn.innerHTML = '<i class="fas fa-check-circle"></i> Registrar Asistencia';
                submitBtn.disabled = false;
                AppState.isSubmitting = false;
            }
        } catch (error) {
            window.manejarErrorGlobal?.(error);
            await showAlert('error', 'Error', 'Ocurrió un error inesperado. Intenta nuevamente.');
            submitBtn.innerHTML = '<i class="fas fa-check-circle"></i> Registrar Asistencia';
            submitBtn.disabled = false;
            AppState.isSubmitting = false;
        }
    });
}

// --- VALIDACIONES Y FLUJO PRINCIPAL ---
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
        
        const doubleCheck = await checkDoubleAttendance(AppState.userData.id, user.email);
        
        if (doubleCheck.exists) {
            AppState.hasAttendanceToday = true;
            AppState.existingAttendanceData = doubleCheck.firebaseData || doubleCheck.collaboratorData;
            saveAttendanceToLocalStorage(AppState.userData.id);
            displayUserInfo(AppState.userData, AppState.existingAttendanceData);
            
            const fechaRegistro = AppState.existingAttendanceData.fecha ? 
                AppState.existingAttendanceData.fecha.toDate() : new Date();
            const horaRegistro = fechaRegistro.toLocaleTimeString('es-ES', {hour: '2-digit', minute:'2-digit'});
            const tipoAsistencia = getAttendanceTypeName(doubleCheck.tipo);
            
            await showAlert('info', 'Asistencia ya registrada', 
                `Ya registraste tu asistencia hoy a las ${horaRegistro}.\n\n` +
                `Tipo: ${tipoAsistencia}\n\n` +
                `Solo se permite una asistencia por día. Serás redirigido al panel.`);
            
            setTimeout(() => {
                redirectByRole(AppState.userRole);
            }, 2000);
            
            return false;
        }
        
        if (hasAttendanceInLocalStorage(AppState.userData.id)) {
            AppState.hasAttendanceToday = true;
            displayUserInfo(AppState.userData, { fecha: { toDate: () => new Date() }, tipo: 'local' });
            
            await showAlert('info', 'Asistencia ya registrada', 
                'Ya registraste tu asistencia para hoy desde este dispositivo. Serás redirigido al panel.');
            
            setTimeout(() => {
                redirectByRole(AppState.userRole);
            }, 2000);
            
            return false;
        }
        
        displayUserInfo(AppState.userData, null);
        return true;
    } catch (error) {
        window.manejarErrorGlobal?.(error);
        await showAlert('error', 'Error', error.message);
        setTimeout(() => {
            auth.signOut().then(() => {
                window.location.href = "/vista/nav-visitantes/inicio-de-sesion.html";
            });
        }, REDIRECT_DELAY);
        return false;
    }
}

async function initializeLocationFlow() {
    const storedCoords = sessionStorage.getItem('userCoordinates');
    if (storedCoords) {
        AppState.userCoordinates = JSON.parse(storedCoords);
        AppState.isLocationRequested = true;
        return true;
    }
    
    if (AppState.hasAttendanceToday) {
        return true;
    }
    
    if (!AppState.isLocationRequested) {
        const locationConfirmed = await showLocationPermissionModal();
        AppState.isLocationRequested = true;
        return locationConfirmed;
    }
    return true;
}

function setupAuthListener() {
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            AppState.currentUser = user;
            const userValid = await handleAuthenticatedUser(user);
            
            if (!userValid) return;
            
            if (!AppState.hasAttendanceToday) {
                const locationInitialized = await initializeLocationFlow();
                if (locationInitialized && AppState.userData) {
                    setupSubmitButton(AppState.userData);
                }
            } else {
                setTimeout(() => {
                    if (AppState.userRole) {
                        redirectByRole(AppState.userRole);
                    }
                }, 1000);
            }
        } else {
            window.location.href = "/vista/nav-visitantes/inicio-de-sesion.html";
        }
    });
}

// --- EASTER EGG PARA REDIRECCIÓN ---
function handleTetrisEasterEgg() {
    const now = Date.now();
    
    if (now - AppState.tetrisLastClickTime > TETRIS_CLICK_TIME_LIMIT) {
        AppState.tetrisClickCount = 1;
        console.log("Reiniciando contador. Clicks: 1");
    } else {
        AppState.tetrisClickCount++;
        console.log(`Click rápido. Clicks: ${AppState.tetrisClickCount}`);
    }
    
    AppState.tetrisLastClickTime = now;

    if (AppState.tetrisClickCount === TETRIS_CLICKS_REQUIRED) {
        console.log("¡5 clics detectados! Redireccionando a egg.html");
        window.location.href = 'egg.html'; 
        AppState.tetrisClickCount = 0; 
    }
}

// --- INICIALIZACIÓN DE LA APLICACIÓN ---
function initApp() {
    const attendanceContainer = document.getElementById('attendanceContainer');
    const attendanceFormContent = document.getElementById('attendanceFormContent');
    const employeeAvatar = document.getElementById('employeeAvatar'); 

    if (attendanceContainer) {
        attendanceContainer.classList.add('loaded');
        attendanceContainer.classList.remove('app-hidden');
    }
    if (attendanceFormContent) {
        attendanceFormContent.classList.remove('app-hidden');
    }
    
    if (employeeAvatar) {
        employeeAvatar.addEventListener('click', handleTetrisEasterEgg);
        employeeAvatar.style.cursor = 'pointer'; 
    }

    updateDateTime();
    setInterval(updateDateTime, 1000);
    
    setupAttendanceOptions();
    setupAuthListener();
}

document.addEventListener('DOMContentLoaded', initApp);

// Estilos de animación
const style = document.createElement('style');
style.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        20%, 60% { transform: translateX(-8px); }
        40%, 80% { transform: translateX(8px); }
    }
    
    .disabled-option {
        opacity: 0.5;
        cursor: not-allowed;
        pointer-events: none !important;
    }
    
    .disabled-option:hover {
        transform: none !important;
        box-shadow: none !important;
    }
`;
document.head.appendChild(style);