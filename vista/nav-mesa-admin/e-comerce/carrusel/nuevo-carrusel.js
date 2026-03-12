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
    selectedFiles: [],
    existingImages: [],
    imagesToDelete: [],
    uploadingFiles: [],
    isUploading: false,
    editingId: null
};

// ==========================================================================
// FUNCIONES DE ALERTAS
// ==========================================================================

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
// FUNCIÓN PARA VERIFICAR Y ACTUALIZAR TIPOS ÚNICOS
// ==========================================================================

async function checkAndUpdateTipo(tipo, currentCarouselId = null) {
    // Si es "ninguno", no hay restricciones
    if (tipo === 'ninguno') return true;

    try {
        // Buscar carrusel con el mismo tipo
        const querySnapshot = await db.collection('carruseles')
            .where('tipo', '==', tipo)
            .get();

        // Filtrar para excluir el carrusel actual si estamos editando
        const existingCarousels = querySnapshot.docs.filter(doc => 
            doc.id !== currentCarouselId
        );

        if (existingCarousels.length > 0) {
            const existingCarousel = existingCarousels[0].data();
            const tipoTexto = tipo === 'principal' ? 'PRINCIPAL' : 'DE SOLUCIONES';
            
            // Preguntar al usuario si quiere reemplazar
            const confirm = await showCustomConfirm(
                `¿Reemplazar carrusel ${tipoTexto}?`,
                `Ya existe un carrusel <strong>"${existingCarousel.titulo}"</strong> como ${tipoTexto}.<br><br>` +
                `Si continúas, ese carrusel pasará a ser "No visible" y este ocupará su lugar.`,
                'Sí, reemplazar',
                'Cancelar'
            );

            if (confirm) {
                // Actualizar el carrusel existente a "ninguno"
                await existingCarousels[0].ref.update({
                    tipo: 'ninguno'
                });
                return true;
            } else {
                return false;
            }
        }

        return true;
    } catch (error) {
        console.error('Error al verificar tipo:', error);
        showCustomError('Error', 'No se pudo verificar la disponibilidad del tipo seleccionado');
        return false;
    }
}

// ==========================================================================
// FUNCIONES PRINCIPALES
// ==========================================================================

async function initialLoad() {
    try {
        await loadUserProfile();
        await checkEditingMode();
        setupEventListeners();
        updateSubmitButton();
    } catch (error) {
        console.error("Error en la carga inicial:", error);
        showCustomError('Error', 'No se pudieron cargar los datos iniciales.');
    }
}

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

async function checkEditingMode() {
    const urlParams = new URLSearchParams(window.location.search);
    const carouselId = urlParams.get('id');
    
    if (carouselId) {
        appState.editingId = carouselId;
        await loadCarouselData(carouselId);
    }
}

async function loadCarouselData(carouselId) {
    try {
        const doc = await db.collection('carruseles').doc(carouselId).get();
        if (!doc.exists) {
            showCustomError('Error', 'El carrusel que intentas editar no existe.');
            setTimeout(() => {
                window.location.href = 'carrusel.html';
            }, 2000);
            return;
        }
        
        const data = doc.data();
        
        // Llenar campos del formulario
        document.getElementById('carruselTitulo').value = data.titulo || '';
        document.getElementById('carruselDescripcion').value = data.descripcion || '';
        
        // Seleccionar el tipo (¡NUEVO!)
        if (data.tipo) {
            const tipoRadio = document.querySelector(`input[name="tipo"][value="${data.tipo}"]`);
            if (tipoRadio) tipoRadio.checked = true;
        } else {
            // Por defecto, seleccionar "ninguno" si no tiene tipo
            const tipoRadio = document.querySelector('input[name="tipo"][value="ninguno"]');
            if (tipoRadio) tipoRadio.checked = true;
        }
        
        // Guardar las imágenes existentes
        appState.existingImages = (data.imagenes || []).map(img => ({
            url: img.url,
            path: img.path,
            nombre: img.nombre,
            id: `existing-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        }));
        
        // Mostrar las imágenes existentes
        renderExistingImages();
        
    } catch (error) {
        console.error('Error al cargar datos del carrusel:', error);
        showCustomError('Error', 'No se pudo cargar la información del carrusel.');
    }
}

function renderExistingImages() {
    const gallery = document.getElementById('imagesGallery');
    
    appState.existingImages.forEach(img => {
        const previewId = img.id;
        const previewHTML = `
            <div class="gallery-item" id="${previewId}">
                <img src="${img.url}" alt="${img.nombre || 'Imagen'}" style="width:100%; height:100%; object-fit:cover;">
                <button type="button" class="gallery-item-remove" onclick="removeExistingImage('${previewId}')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        gallery.insertAdjacentHTML('beforeend', previewHTML);
    });
    
    updateImagesCounter();
}

// ==========================================================================
// MANEJO DE ARCHIVOS
// ==========================================================================

function setupEventListeners() {
    const fileInput = document.getElementById('fileInput');
    const fileUploadContainer = document.getElementById('fileUploadContainer');
    const form = document.getElementById('carruselForm');

    fileUploadContainer.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', handleFileSelect);

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

    form.addEventListener('submit', handleFormSubmit);
}

function handleFileSelect(e) {
    if (e.target.files.length) {
        handleFiles(e.target.files);
    }
}

function handleFiles(files) {
    const filesArray = Array.from(files);
    
    const validFiles = filesArray.filter(file => {
        if (!file.type.startsWith('image/')) {
            showCustomError('Error', `"${file.name}" no es una imagen válida.`);
            return false;
        }
        if (file.size > 5 * 1024 * 1024) {
            showCustomError('Error', `"${file.name}" es demasiado grande. Máximo 5MB.`);
            return false;
        }
        return true;
    });

    validFiles.forEach(file => {
        appState.selectedFiles.push(file);
        createImagePreview(file);
    });

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
                <button type="button" class="gallery-item-remove" onclick="removeNewImage('${previewId}')">
                    <i class="fas fa-times"></i>
                </button>
            `;
        }
    };
    
    reader.readAsDataURL(file);
}

window.removeNewImage = function(previewId) {
    const previewElement = document.getElementById(previewId);
    if (!previewElement) return;
    
    const gallery = document.getElementById('imagesGallery');
    const allChildren = Array.from(gallery.children);
    const newImageElements = allChildren.filter(child => child.id.startsWith('preview-'));
    const index = newImageElements.findIndex(el => el.id === previewId);
    
    if (index !== -1 && index < appState.selectedFiles.length) {
        appState.selectedFiles.splice(index, 1);
    }
    
    previewElement.remove();
    updateSubmitButton();
    updateImagesCounter();
};

window.removeExistingImage = function(imageId) {
    const imageElement = document.getElementById(imageId);
    if (!imageElement) return;
    
    const image = appState.existingImages.find(img => img.id === imageId);
    if (image) {
        if (image.path) {
            appState.imagesToDelete.push(image.path);
        }
        appState.existingImages = appState.existingImages.filter(img => img.id !== imageId);
    }
    
    imageElement.remove();
    updateSubmitButton();
    updateImagesCounter();
};

function updateImagesCounter() {
    const counter = document.getElementById('imagesCounter');
    const totalImages = appState.existingImages.length + appState.selectedFiles.length;
    counter.textContent = `${totalImages} ${totalImages === 1 ? 'imagen' : 'imágenes'}`;
}

function updateSubmitButton() {
    const submitBtn = document.getElementById('submitBtn');
    const titulo = document.getElementById('carruselTitulo').value.trim();
    const tipoSelected = document.querySelector('input[name="tipo"]:checked');
    const hasImages = (appState.existingImages.length + appState.selectedFiles.length) > 0;
    
    const isFormValid = titulo && tipoSelected && hasImages && !appState.isUploading;
    submitBtn.disabled = !isFormValid;
}

// ==========================================================================
// MANEJO DEL FORMULARIO (GUARDAR)
// ==========================================================================

async function handleFormSubmit(e) {
    e.preventDefault();
    
    const titulo = document.getElementById('carruselTitulo').value.trim();
    const descripcion = document.getElementById('carruselDescripcion').value.trim();
    
    // Validar tipo seleccionado (¡NUEVO!)
    const tipoElement = document.querySelector('input[name="tipo"]:checked');
    if (!tipoElement) {
        showCustomError('Error', 'Debes seleccionar dónde mostrar el carrusel.');
        return;
    }
    const tipo = tipoElement.value;
    
    if (!titulo || (appState.existingImages.length + appState.selectedFiles.length) === 0) {
        showCustomError('Error', 'Por favor, completa todos los campos obligatorios.');
        return;
    }

    if (appState.isUploading) {
        showCustomError('Error', 'Ya hay una subida en progreso.');
        return;
    }

    try {
        appState.isUploading = true;
        
        const submitBtn = document.getElementById('submitBtn');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

        // VERIFICAR TIPO ÚNICO (¡NUEVO!)
        const canProceed = await checkAndUpdateTipo(tipo, appState.editingId);
        if (!canProceed) {
            appState.isUploading = false;
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-save"></i> Guardar Carrusel';
            return;
        }

        // Eliminar de Storage las imágenes marcadas
        if (appState.imagesToDelete.length > 0) {
            const deletePromises = appState.imagesToDelete.map(async (path) => {
                try {
                    const fileRef = storage.ref().child(path);
                    await fileRef.delete();
                } catch (error) {
                    console.error('Error al eliminar imagen:', error);
                }
            });
            await Promise.all(deletePromises);
        }

        // Subir nuevas imágenes
        const newImagesUploaded = [];
        if (appState.selectedFiles.length > 0) {
            const uploadPromises = appState.selectedFiles.map(async (file, index) => {
                const fileName = `${Date.now()}_${index}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
                const fileRef = storage.ref().child(`carruseles/${fileName}`);
                
                const snapshot = await fileRef.put(file);
                const downloadURL = await snapshot.ref.getDownloadURL();
                
                return {
                    url: downloadURL,
                    path: snapshot.ref.fullPath,
                    nombre: file.name
                };
            });

            const uploaded = await Promise.all(uploadPromises);
            newImagesUploaded.push(...uploaded);
        }

        // Construir lista final de imágenes
        const imagenesFinales = [
            ...appState.existingImages.map(img => ({
                url: img.url,
                path: img.path,
                nombre: img.nombre
            })),
            ...newImagesUploaded
        ];

        // Guardar en Firestore (¡CON TIPO!)
        const carouselData = {
            titulo: titulo,
            descripcion: descripcion || '',
            tipo: tipo, // ¡NUEVO!
            imagenes: imagenesFinales,
            ultimaModificacion: firebase.firestore.FieldValue.serverTimestamp()
        };

        if (appState.editingId) {
            await db.collection('carruseles').doc(appState.editingId).update(carouselData);
            await showCustomSuccess('¡Carrusel actualizado!', 'Los cambios se han guardado correctamente.');
        } else {
            carouselData.creadoPor = appState.currentUser ? appState.currentUser.nombre : 'Usuario desconocido';
            carouselData.creadoPorId = appState.currentUser ? appState.currentUser.id : 'unknown';
            carouselData.fechaCreacion = firebase.firestore.FieldValue.serverTimestamp();
            
            await db.collection('carruseles').add(carouselData);
            await showCustomSuccess('¡Carrusel guardado!', 'El carrusel se ha guardado correctamente.');
        }
        
        window.location.href = 'carrusel.html';
        
    } catch (error) {
        console.error('Error al guardar:', error);
        showCustomError('Error', 'No se pudo guardar el carrusel.');
    } finally {
        appState.isUploading = false;
        const submitBtn = document.getElementById('submitBtn');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-save"></i> Guardar Carrusel';
    }
}

function resetForm() {
    document.getElementById('carruselForm').reset();
    appState.selectedFiles = [];
    appState.existingImages = [];
    appState.imagesToDelete = [];
    document.getElementById('imagesGallery').innerHTML = '';
    updateImagesCounter();
    updateSubmitButton();
}

window.cancelForm = function() {
    if (appState.isUploading) {
        showCustomError('Error', 'No se puede cancelar mientras se suben imágenes.');
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