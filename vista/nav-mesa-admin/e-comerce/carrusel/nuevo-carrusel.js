// ==========================================================================
// CONFIGURACIÓN DE FIREBASE
// ==========================================================================
const firebaseConfig = {
    apiKey: "AIzaSyBJy992gkvsT77-_fMp_O_z99wtjZiK77Y",
    authDomain: "rsienterprise.firebaseapp.com",
    projectId: "rsienterprise",
    storageBucket: "rsienterprise.firebasestorage.app",
    messagingSenderId: "1063117165770",
    appId: "1:1063117165770:web:8555f26b25ae80bc42d033"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// ==========================================================================
// ESTADO DE LA APLICACIÓN
// ==========================================================================
const appState = {
    currentUser: null,
    userData: null,
    selectedFiles: [], // Array para múltiples archivos
    uploadingFiles: [], // Archivos en proceso de subida
    isUploading: false
};

// ==========================================================================
// FUNCIONES DE ALERTAS PERSONALIZADAS (para evitar errores de dependencias)
// ==========================================================================

/**
 * Muestra un mensaje de éxito personalizado
 */
function showCustomSuccess(title, message) {
    return Swal.fire({
        title: title,
        text: message,
        icon: 'success',
        confirmButtonColor: '#6C43E0',
        background: 'rgba(255,255,255,0.95)',
        backdrop: 'rgba(108,67,224,0.2)',
        timer: 2000,
        timerProgressBar: true,
        showConfirmButton: true
    });
}

/**
 * Muestra un mensaje de confirmación personalizado
 */
function showCustomConfirm(title, message, confirmText, cancelText) {
    return Swal.fire({
        title: title,
        html: message,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: confirmText || 'Sí, confirmar',
        cancelButtonText: cancelText || 'Cancelar',
        confirmButtonColor: '#6C43E0',
        cancelButtonColor: '#e74c3c',
        background: 'rgba(255,255,255,0.95)'
    });
}

/**
 * Muestra un mensaje de error personalizado
 */
function showCustomError(title, message) {
    return Swal.fire({
        title: title,
        text: message,
        icon: 'error',
        confirmButtonColor: '#6C43E0',
        background: 'rgba(255,255,255,0.95)'
    });
}

// ==========================================================================
// FUNCIONES PRINCIPALES
// ==========================================================================

/**
 * Carga inicial de la aplicación
 */
async function initialLoad() {
    try {
        await loadUserProfile();
        setupEventListeners();
    } catch (error) {
        console.error("Error en la carga inicial:", error);
        showCustomError('Error', 'No se pudieron cargar los datos iniciales.');
    }
}

/**
 * Carga el perfil del usuario actual
 */
async function loadUserProfile() {
    const user = auth.currentUser;
    if (!user) {
        window.location.href = '../nav-visitantes/inicio-de-sesion.html';
        return;
    }
    
    try {
        const querySnapshot = await db.collection("colaboradores")
            .where("CORREO ELECTRÓNICO EMPRESARIAL", "==", user.email)
            .get();
        
        if (!querySnapshot.empty) {
            const doc = querySnapshot.docs[0];
            const userData = doc.data();
            appState.currentUser = {
                id: doc.id,
                nombre: userData.NOMBRE,
                area: userData.ÁREA,
                imagen: userData.imagen || '../css/img/Logo-RSI-OFICIAL.png'
            };
            appState.userData = userData;
            sessionStorage.setItem('currentUser', JSON.stringify(appState.currentUser));
        }
    } catch (error) {
        console.error("Error al cargar perfil:", error);
    }
}

// ==========================================================================
// MANEJO DE ARCHIVOS
// ==========================================================================

function setupEventListeners() {
    const fileInput = document.getElementById('fileInput');
    const fileUploadContainer = document.getElementById('fileUploadContainer');
    const form = document.getElementById('carruselForm');

    // Click en el contenedor para abrir el selector de archivos
    fileUploadContainer.addEventListener('click', () => {
        fileInput.click();
    });

    // Cambio en el input de archivo
    fileInput.addEventListener('change', handleFileSelect);

    // Drag and drop
    fileUploadContainer.addEventListener('dragover', (e) => {
        e.preventDefault();
        fileUploadContainer.classList.add('dragover');
    });

    fileUploadContainer.addEventListener('dragleave', () => {
        fileUploadContainer.classList.remove('dragover');
    });

    fileUploadContainer.addEventListener('drop', (e) => {
        e.preventDefault();
        fileUploadContainer.classList.remove('dragover');
        
        if (e.dataTransfer.files.length) {
            handleFiles(e.dataTransfer.files);
        }
    });

    // Envío del formulario
    form.addEventListener('submit', handleFormSubmit);
}

function handleFileSelect(e) {
    if (e.target.files.length) {
        handleFiles(e.target.files);
    }
}

function handleFiles(files) {
    const filesArray = Array.from(files);
    
    // Validar cada archivo
    const validFiles = filesArray.filter(file => {
        // Validar que sea una imagen
        if (!file.type.startsWith('image/')) {
            showCustomError('Error', `"${file.name}" no es una imagen válida. Solo se permiten archivos de imagen.`);
            return false;
        }

        // Validar tamaño (5MB máximo por imagen)
        if (file.size > 5 * 1024 * 1024) {
            showCustomError('Error', `"${file.name}" es demasiado grande. El tamaño máximo permitido es 5MB.`);
            return false;
        }

        return true;
    });

    // Agregar archivos válidos al estado
    validFiles.forEach(file => {
        appState.selectedFiles.push(file);
        // Crear preview
        createImagePreview(file);
    });

    // Limpiar el input para permitir seleccionar los mismos archivos nuevamente
    document.getElementById('fileInput').value = '';
    
    updateSubmitButton();
    updateImagesCounter();
}

function createImagePreview(file) {
    const gallery = document.getElementById('imagesGallery');
    const reader = new FileReader();
    
    const previewId = `preview-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const previewHTML = `
        <div class="gallery-item" id="${previewId}">
            <div class="gallery-item-loading">
                <i class="fas fa-spinner fa-spin"></i>
            </div>
        </div>
    `;
    
    gallery.insertAdjacentHTML('beforeend', previewHTML);
    
    reader.onload = (e) => {
        const previewElement = document.getElementById(previewId);
        if (previewElement) {
            previewElement.innerHTML = `
                <img src="${e.target.result}" alt="${file.name}">
                <button type="button" class="gallery-item-remove" onclick="removeImage('${previewId}')">
                    <i class="fas fa-times"></i>
                </button>
            `;
        }
    };
    
    reader.readAsDataURL(file);
}

// Hacer removeImage global para que funcione desde el onclick
window.removeImage = function(previewId) {
    const previewElement = document.getElementById(previewId);
    if (!previewElement) return;
    
    // Encontrar el índice del archivo correspondiente
    const gallery = document.getElementById('imagesGallery');
    const index = Array.from(gallery.children).indexOf(previewElement);
    
    if (index !== -1 && index < appState.selectedFiles.length) {
        // Eliminar el archivo del array
        appState.selectedFiles.splice(index, 1);
    }
    
    // Eliminar el elemento del DOM
    previewElement.remove();
    
    updateSubmitButton();
    updateImagesCounter();
}

function updateImagesCounter() {
    const counter = document.getElementById('imagesCounter');
    const count = appState.selectedFiles.length;
    
    counter.textContent = `${count} ${count === 1 ? 'imagen seleccionada' : 'imágenes seleccionadas'}`;
}

function updateSubmitButton() {
    const submitBtn = document.getElementById('submitBtn');
    const form = document.getElementById('carruselForm');
    
    // Verificar que todos los campos estén completos
    const isFormValid = form.checkValidity() && appState.selectedFiles.length > 0 && !appState.isUploading;
    submitBtn.disabled = !isFormValid;
}

// ==========================================================================
// MANEJO DEL FORMULARIO
// ==========================================================================

async function handleFormSubmit(e) {
    e.preventDefault();
    
    const titulo = document.getElementById('carruselTitulo').value.trim();
    const descripcion = document.getElementById('carruselDescripcion').value.trim();
    
    if (!titulo || appState.selectedFiles.length === 0) {
        showCustomError('Error', 'Por favor, completa todos los campos obligatorios.');
        return;
    }

    if (appState.isUploading) {
        showCustomError('Error', 'Ya hay una subida en progreso. Por favor espera.');
        return;
    }

    try {
        appState.isUploading = true;
        
        // Mostrar indicador de carga
        const submitBtn = document.getElementById('submitBtn');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Subiendo imágenes...';

        // Subir todas las imágenes a Firebase Storage
        const uploadPromises = appState.selectedFiles.map(async (file, index) => {
            const fileName = `${Date.now()}_${index}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
            const fileRef = storage.ref().child(`carruseles/${fileName}`);
            
            const snapshot = await fileRef.put(file);
            const downloadURL = await snapshot.ref.getDownloadURL();
            
            return {
                url: downloadURL,
                path: snapshot.ref.fullPath,
                nombre: file.name,
                orden: index
            };
        });

        const imagenesSubidas = await Promise.all(uploadPromises);

        // Ordenar las imágenes por el índice original
        imagenesSubidas.sort((a, b) => a.orden - b.orden);

        // Guardar información en Firestore
        await db.collection('carruseles').add({
            titulo: titulo,
            descripcion: descripcion || '',
            imagenes: imagenesSubidas.map(img => ({
                url: img.url,
                path: img.path,
                nombre: img.nombre
            })),
            creadoPor: appState.currentUser ? appState.currentUser.nombre : 'Usuario desconocido',
            creadoPorId: appState.currentUser ? appState.currentUser.id : 'unknown',
            fechaCreacion: firebase.firestore.FieldValue.serverTimestamp(),
            fechaCreacionLocal: new Date().toLocaleString('es-MX')
        });

        // Mostrar mensaje de éxito
        await showCustomSuccess('¡Carrusel guardado!', 'El carrusel se ha guardado correctamente.');
        
        // Redirigir a la lista de carruseles
        window.location.href = 'carrusel.html';
        
    } catch (error) {
        console.error('Error al guardar el carrusel:', error);
        showCustomError('Error', 'No se pudo guardar el carrusel. Por favor, intenta nuevamente.');
    } finally {
        appState.isUploading = false;
        // Restaurar botón
        const submitBtn = document.getElementById('submitBtn');
        submitBtn.disabled = appState.selectedFiles.length === 0;
        submitBtn.innerHTML = '<i class="fas fa-save"></i> Guardar Carrusel';
    }
}

function resetForm() {
    document.getElementById('carruselForm').reset();
    appState.selectedFiles = [];
    document.getElementById('imagesGallery').innerHTML = '';
    updateImagesCounter();
    updateSubmitButton();
}

// Hacer cancelForm global para que funcione desde el onclick
window.cancelForm = function() {
    if (appState.isUploading) {
        showCustomError('Error', 'No se puede cancelar mientras se están subiendo imágenes.');
        return;
    }

    showCustomConfirm(
        '¿Cancelar operación?', 
        'Los datos no guardados se perderán.', 
        'Sí, cancelar', 
        'Continuar editando'
    ).then((result) => {
        if (result.isConfirmed) {
            resetForm();
            window.location.href = 'carrusel.html';
        }
    });
}

// ==========================================================================
// INICIALIZACIÓN
// ==========================================================================
document.addEventListener('DOMContentLoaded', function() {
    // Actualizar botón de envío cuando cambien los campos
    document.getElementById('carruselForm').addEventListener('input', updateSubmitButton);
    
    auth.onAuthStateChanged(user => {
        if (user) {
            console.log('Usuario autenticado:', user.email);
            initialLoad();
        } else {
            console.log('No hay usuario autenticado, redirigiendo...');
            window.location.href = '../nav-visitantes/inicio-de-sesion.html';
        }
    });
});