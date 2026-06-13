// Configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBJy992gkvsT77-_fMp_O_z99wtjZiK77Y",
    authDomain: "rsienterprise.firebaseapp.com",
    projectId: "rsienterprise",
    storageBucket: "rsienterprise.appspot.com",
    messagingSenderId: "1063117165770",
    appId: "1:1063117165770:web:8555f26b25ae80bc42d033"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();
const auth = firebase.auth();

// Documento global para la apariencia (logo)
const globalConfigRef = db.collection('global_config').doc('appearance');

// Estado
const personalizationState = {
    currentUser: null,
    userData: null,
    preferences: {
        background: 'dark',
        theme: 'purple'
    },
    globalBackgroundImage: null,          // URL base64 de la imagen global
    unsubscribeGlobal: null               // Para cancelar el listener
};

// Opciones (igual que antes)
const backgroundOptions = [
    { id: 'light', name: 'Claro', color: '#f5f5f5', textColor: '#333', cardBg: '#ffffff' },
    { id: 'dark', name: 'Oscuro', color: '#1a1a1a', textColor: '#f5f5f5', cardBg: '#2d2d2d' },
    { id: 'gray', name: 'Gris', color: '#808080', textColor: '#ffffff', cardBg: '#a0a0a0' }
];

const themeOptions = [
    { id: 'purple', name: 'Púrpura', primary: '#6C43E0', secondary: '#5a35c7', accent: '#8B5FEB' },
    { id: 'blue', name: 'Azul', primary: '#2196F3', secondary: '#1976D2', accent: '#42A5F5' },
    { id: 'green', name: 'Verde', primary: '#4CAF50', secondary: '#388E3C', accent: '#66BB6A' },
    { id: 'orange', name: 'Naranja', primary: '#FF9800', secondary: '#F57C00', accent: '#FFB74D' },
    { id: 'red', name: 'Rojo', primary: '#F44336', secondary: '#D32F2F', accent: '#EF5350' },
    { id: 'teal', name: 'Verde Azulado', primary: '#009688', secondary: '#00796B', accent: '#26A69A' }
];

// --- Helper: convertir archivo a Base64 ---
function fileToBase64(file) {
    if (file && file.type !== 'image/png') {
        Swal.fire({
            title: 'Formato Inválido',
            text: 'Solo se permiten archivos PNG.',
            icon: 'warning',
            confirmButtonColor: themeOptions.find(t => t.id === personalizationState.preferences.theme).primary
        });
        return Promise.reject(new Error("Formato no permitido"));
    }
    return new Promise((resolve, reject) => {
        if (!file) return resolve(null);
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
    });
}

// --- Actualizar la imagen global en Firestore ---
async function updateGlobalBackgroundImage(base64Image) {
    if (!personalizationState.currentUser) {
        showMessage('Debes iniciar sesión para cambiar el logo global', 'error');
        return;
    }
    try {
        await globalConfigRef.set({
            backgroundImage: base64Image,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
            updatedBy: personalizationState.currentUser.email
        }, { merge: true });
        showSelectionFeedback('Logo', 'Logo global actualizado para todos los usuarios');
    } catch (error) {
        console.error("Error al guardar imagen global:", error);
        showMessage('Error al guardar el logo global', 'error');
    }
}

// --- Restaurar logo RSI por defecto ---
async function resetGlobalBackgroundImage() {
    if (!personalizationState.currentUser) {
        showMessage('Debes iniciar sesión para restaurar el logo', 'error');
        return;
    }
    try {
        await globalConfigRef.set({
            backgroundImage: null,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
            updatedBy: personalizationState.currentUser.email
        }, { merge: true });
        showSelectionFeedback('Logo', 'Logo RSI restaurado para todos');
    } catch (error) {
        console.error("Error al restaurar logo:", error);
        showMessage('Error al restaurar el logo', 'error');
    }
}

// --- Aplicar fondo (color personal + imagen global) ---
function applyBackground() {
    const selectedBackground = backgroundOptions.find(bg => bg.id === personalizationState.preferences.background);
    const body = document.body;
    const bgImage = personalizationState.globalBackgroundImage;

    // Colores
    document.documentElement.style.setProperty('--background-color', selectedBackground.color);
    document.documentElement.style.setProperty('--text-color', selectedBackground.textColor);
    document.documentElement.style.setProperty('--card-bg', selectedBackground.cardBg);
    document.documentElement.style.setProperty('--card-shadow', personalizationState.preferences.background === 'dark' ? '0 4px 12px rgba(0,0,0,0.3)' : '0 4px 12px rgba(0,0,0,0.1)');

    // Imagen de fondo (global o por defecto)
    if (bgImage) {
        body.style.backgroundImage = `url('${bgImage}')`;
        body.style.backgroundSize = 'contain';
    } else {
        body.style.backgroundImage = 'var(--default-bg-image)'; // definido en CSS
        body.style.backgroundSize = '50vmax';
    }
    body.style.backgroundRepeat = 'no-repeat';
    body.style.backgroundPosition = 'center center';
}

// --- Aplicar tema (colores de botones) ---
function applyTheme() {
    const selectedTheme = themeOptions.find(theme => theme.id === personalizationState.preferences.theme);
    document.documentElement.style.setProperty('--primary-color', selectedTheme.primary);
    document.documentElement.style.setProperty('--secondary-color', selectedTheme.secondary);
    document.documentElement.style.setProperty('--accent-color', selectedTheme.accent);
}

// --- Actualizar vista previa ---
function updatePreview() {
    const theme = themeOptions.find(t => t.id === personalizationState.preferences.theme);
    document.getElementById('preview-primary').style.backgroundColor = theme.primary;
    document.getElementById('preview-secondary').style.backgroundColor = theme.secondary;
    document.getElementById('preview-accent').style.backgroundColor = theme.accent;
}

// --- Cargar preferencias personales (color/tema) desde localStorage y Firestore ---
async function loadPersonalPreferences() {
    // LocalStorage
    const local = localStorage.getItem('personalizationPreferences');
    if (local) {
        try {
            const prefs = JSON.parse(local);
            if (prefs.background) personalizationState.preferences.background = prefs.background;
            if (prefs.theme) personalizationState.preferences.theme = prefs.theme;
        } catch(e) {}
    }

    // Firestore si está autenticado
    if (personalizationState.currentUser && personalizationState.userData) {
        try {
            const doc = await db.collection('personalizacion').doc(personalizationState.userData.id).get();
            if (doc.exists && doc.data().preferences) {
                const prefs = doc.data().preferences;
                if (prefs.background) personalizationState.preferences.background = prefs.background;
                if (prefs.theme) personalizationState.preferences.theme = prefs.theme;
            }
        } catch(e) { console.error(e); }
    }

    // Sincronizar UI
    document.querySelectorAll('.color-option').forEach(el => el.classList.remove('selected'));
    const bgOpt = document.querySelector(`#background-options .color-option[data-id="${personalizationState.preferences.background}"]`);
    if (bgOpt) bgOpt.classList.add('selected');
    const themeOpt = document.querySelector(`#theme-options .color-option[data-id="${personalizationState.preferences.theme}"]`);
    if (themeOpt) themeOpt.classList.add('selected');

    applyBackground();
    applyTheme();
    updatePreview();
}

// --- Guardar preferencias personales (solo color/tema) ---
async function savePreferences() {
    const selectedTheme = themeOptions.find(t => t.id === personalizationState.preferences.theme);
    const selectedBg = backgroundOptions.find(b => b.id === personalizationState.preferences.background);

    const result = await Swal.fire({
        title: 'Guardar preferencias personales',
        html: `<p>Fondo: ${selectedBg.name}</p><p>Tema: ${selectedTheme.name}</p><p>Logo: Global (compartido)</p>`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: selectedTheme.primary,
        confirmButtonText: 'Guardar'
    });
    if (!result.isConfirmed) return;

    const prefsToSave = { background: personalizationState.preferences.background, theme: personalizationState.preferences.theme };
    localStorage.setItem('personalizationPreferences', JSON.stringify(prefsToSave));

    if (personalizationState.currentUser && personalizationState.userData) {
        await db.collection('personalizacion').doc(personalizationState.userData.id).set({
            colaboradorId: personalizationState.userData.id,
            colaboradorNombre: personalizationState.userData.nombre,
            colaboradorEmail: personalizationState.userData.correoEmpresarial,
            preferences: prefsToSave,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        });
    }
    Swal.fire({ title: 'Guardado', icon: 'success', timer: 1500, showConfirmButton: false });
}

// --- Restablecer TODO (preferencias personales + logo global) ---
async function resetEverything() {
    const result = await Swal.fire({
        title: 'Restablecer todo',
        text: 'Se borrarán tus colores personales (volverán a oscuro/púrpura) y el logo global volverá al de RSI. ¿Continuar?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, restablecer'
    });
    if (!result.isConfirmed) return;

    // Restaurar logo global
    await resetGlobalBackgroundImage();

    // Restablecer preferencias personales a valores por defecto
    personalizationState.preferences = { background: 'dark', theme: 'purple' };
    const defaultPrefs = { background: 'dark', theme: 'purple' };
    localStorage.setItem('personalizationPreferences', JSON.stringify(defaultPrefs));
    if (personalizationState.currentUser && personalizationState.userData) {
        await db.collection('personalizacion').doc(personalizationState.userData.id).set({
            colaboradorId: personalizationState.userData.id,
            colaboradorNombre: personalizationState.userData.nombre,
            colaboradorEmail: personalizationState.userData.correoEmpresarial,
            preferences: defaultPrefs,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        });
    }

    // Actualizar UI
    document.querySelectorAll('.color-option').forEach(el => el.classList.remove('selected'));
    document.querySelector('#background-options .color-option[data-id="dark"]')?.classList.add('selected');
    document.querySelector('#theme-options .color-option[data-id="purple"]')?.classList.add('selected');
    applyBackground();
    applyTheme();
    updatePreview();

    Swal.fire({ title: 'Restablecido', icon: 'success', timer: 1500, showConfirmButton: false });
}

// --- Listener en tiempo real para la imagen global ---
function listenGlobalBackgroundImage() {
    if (personalizationState.unsubscribeGlobal) {
        personalizationState.unsubscribeGlobal();
    }
    personalizationState.unsubscribeGlobal = globalConfigRef.onSnapshot((doc) => {
        if (doc.exists && doc.data().backgroundImage) {
            personalizationState.globalBackgroundImage = doc.data().backgroundImage;
        } else {
            personalizationState.globalBackgroundImage = null;
        }
        applyBackground();  // Se actualiza al instante en todas las pestañas

        // Actualizar la miniatura en la interfaz de subida
        const previewImg = document.getElementById('background-preview');
        const uploadText = document.getElementById('upload-text');
        const removeBtn = document.getElementById('remove-bg-btn');
        if (previewImg) {
            if (personalizationState.globalBackgroundImage) {
                previewImg.src = personalizationState.globalBackgroundImage;
                previewImg.style.display = 'block';
                uploadText.textContent = 'Logo global activo';
                removeBtn.style.display = 'block';
            } else {
                previewImg.style.display = 'none';
                uploadText.textContent = 'Haz clic o arrastra para cambiar el logo';
                removeBtn.style.display = 'none';
            }
        }
    }, (error) => {
        console.error("Error en el listener de imagen global:", error);
    });
}

// --- Cargar perfil de usuario (para asociar preferencias) ---
async function loadUserProfile() {
    const user = auth.currentUser;
    if (!user) return;
    try {
        const q = await db.collection("colaboradores")
            .where("CORREO ELECTRÓNICO EMPRESARIAL", "==", user.email)
            .get();
        if (!q.empty) {
            const doc = q.docs[0];
            personalizationState.userData = {
                id: doc.id,
                nombre: doc.data().NOMBRE || 'Usuario',
                correoEmpresarial: doc.data()["CORREO ELECTRÓNICO EMPRESARIAL"]
            };
        } else {
            personalizationState.userData = { id: user.uid, nombre: user.email, correoEmpresarial: user.email };
        }
    } catch(e) { console.error(e); }
}

// --- Inicializar la interfaz y eventos ---
function initUI() {
    // Llenar grids
    const bgContainer = document.getElementById('background-options');
    bgContainer.innerHTML = '';
    backgroundOptions.forEach(opt => {
        const div = document.createElement('div');
        div.className = 'color-option';
        div.dataset.id = opt.id;
        div.innerHTML = `<div class="color-preview" style="background-color: ${opt.color};"></div><div class="color-name">${opt.name}</div><div class="checkmark"><i class="fas fa-check"></i></div>`;
        bgContainer.appendChild(div);
    });

    const themeContainer = document.getElementById('theme-options');
    themeContainer.innerHTML = '';
    themeOptions.forEach(opt => {
        const div = document.createElement('div');
        div.className = 'color-option';
        div.dataset.id = opt.id;
        div.innerHTML = `<div class="color-preview" style="background: linear-gradient(135deg, ${opt.primary} 0%, ${opt.accent} 100%);"></div><div class="color-name">${opt.name}</div><div class="checkmark"><i class="fas fa-check"></i></div>`;
        themeContainer.appendChild(div);
    });

    // Eventos de selección
    document.getElementById('background-options').addEventListener('click', (e) => {
        const opt = e.target.closest('.color-option');
        if (opt) {
            document.querySelectorAll('#background-options .color-option').forEach(el => el.classList.remove('selected'));
            opt.classList.add('selected');
            personalizationState.preferences.background = opt.dataset.id;
            applyBackground();
            updatePreview();
        }
    });
    document.getElementById('theme-options').addEventListener('click', (e) => {
        const opt = e.target.closest('.color-option');
        if (opt) {
            document.querySelectorAll('#theme-options .color-option').forEach(el => el.classList.remove('selected'));
            opt.classList.add('selected');
            personalizationState.preferences.theme = opt.dataset.id;
            applyTheme();
            updatePreview();
        }
    });

    // Subida de imagen
    const fileInput = document.getElementById('background-file');
    const uploadBox = document.getElementById('upload-box');
    uploadBox.addEventListener('click', (e) => {
        if (!e.target.closest('#remove-bg-btn')) fileInput.click();
    });
    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            try {
                const base64 = await fileToBase64(file);
                await updateGlobalBackgroundImage(base64);
            } catch(err) { /* error ya mostrado */ }
            fileInput.value = '';
        }
    });
    document.getElementById('remove-bg-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        resetGlobalBackgroundImage();
    });

    document.getElementById('save-btn').addEventListener('click', savePreferences);
    document.getElementById('reset-btn').addEventListener('click', resetEverything);
}

// --- Inicio ---
document.addEventListener('DOMContentLoaded', () => {
    initUI();

    // Escuchar autenticación
    auth.onAuthStateChanged(async (user) => {
        personalizationState.currentUser = user;
        if (user) {
            await loadUserProfile();
        } else {
            personalizationState.userData = null;
        }
        // Cargar preferencias personales (colores)
        await loadPersonalPreferences();
        // Iniciar listener global en tiempo real (para el logo)
        listenGlobalBackgroundImage();
    });
});

// Funciones auxiliares de mensajes
function showMessage(text, type) {
    const msgDiv = document.getElementById('message');
    if (msgDiv) {
        msgDiv.textContent = text;
        msgDiv.className = `message ${type}`;
        msgDiv.style.display = 'block';
        setTimeout(() => msgDiv.style.display = 'none', 5000);
    }
}
function showSelectionFeedback(type, value) {
    const theme = themeOptions.find(t => t.id === personalizationState.preferences.theme);
    const bg = backgroundOptions.find(b => b.id === personalizationState.preferences.background);
    Swal.fire({
        title: type,
        text: value,
        icon: 'success',
        timer: 1500,
        showConfirmButton: false,
        background: bg.cardBg,
        color: bg.textColor,
        iconColor: theme.primary
    });
}
function updateNavigationMenu() {
    if (typeof updateMenuStyles === 'function') updateMenuStyles(personalizationState.preferences);
}