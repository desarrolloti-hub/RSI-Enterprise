// Configuración Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBJy992gkvsT77-_fMp_O_z99wtjZiK77Y",
    authDomain: "rsienterprise.firebaseapp.com",
    projectId: "rsienterprise",
    storageBucket: "rsienterprise.appspot.com",
    messagingSenderId: "1063117165770",
    appId: "1:1063117165770:web:8555f26b25ae80bc42d033"
};

// Inicializar Firebase
let db;
try {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    db = firebase.firestore();
    console.log('✅ Firebase Firestore inicializado');
} catch (error) {
    console.error('❌ Error inicializando Firebase:', error);
    db = null;
}

// Variables globales
let currentImages = [];
let editingId = null;
let carouselsRef = null;
let carouselInstance = null;

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    if (!db) {
        showAlert('error', 'Error de conexión', 'Firebase no está disponible.');
        return;
    }

    carouselsRef = db.collection("carousels");
    
    // Configurar event listeners
    setupEventListeners();
    
    // Cargar carruseles existentes
    loadCarousels();
}

function getDomElements() {
    return {
        formContainer: document.getElementById('formContainer'),
        carouselForm: document.getElementById('carouselForm'),
        imageUpload: document.getElementById('imageUpload'),
        imagePreviewContainer: document.getElementById('imagePreviewContainer'),
        addMoreBtn: document.getElementById('addMoreBtn'),
        carouselItems: document.getElementById('carouselItems'),
        carouselsList: document.getElementById('carouselsList'),
        toggleBtn: document.getElementById('toggleBtn'),
        cancelBtn: document.getElementById('cancelBtn'),
        saveBtn: document.getElementById('saveBtn'),
        previewCarousel: document.getElementById('previewCarousel')
    };
}

function setupEventListeners() {
    const elements = getDomElements();
    
    if (elements.toggleBtn) {
        elements.toggleBtn.addEventListener('click', () => {
            elements.formContainer.style.display = 
                elements.formContainer.style.display === 'none' ? 'block' : 'none';
            resetForm();
        });
    }

    if (elements.cancelBtn) {
        elements.cancelBtn.addEventListener('click', resetForm);
    }

    if (elements.addMoreBtn) {
        elements.addMoreBtn.addEventListener('click', () => {
            if (elements.imageUpload) elements.imageUpload.click();
        });
    }

    if (elements.imageUpload) {
        elements.imageUpload.addEventListener('change', (e) => handleImageUpload(e));
    }

    if (elements.carouselForm) {
        elements.carouselForm.addEventListener('submit', (e) => saveCarousel(e));
    }
}

function resetForm() {
    const elements = getDomElements();
    if (elements.carouselForm) elements.carouselForm.reset();
    editingId = null;
    currentImages = [];
    updatePreview();
    updateImagePreviews();
}

async function handleImageUpload(e) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const elements = getDomElements();
    const totalImages = currentImages.length + files.length;
    
    if (totalImages > 5) {
        showAlert('error', 'Error', 'Máximo 5 imágenes permitidas');
        e.target.value = '';
        return;
    }

    for (const file of Array.from(files)) {
        if (!file.type.match('image.*')) {
            showAlert('error', 'Error', `"${file.name}" no es una imagen válida`);
            continue;
        }

        try {
            const result = await processImageFile(file);
            currentImages.push(result);
        } catch (error) {
            console.error("Error procesando imagen:", error);
            showAlert('error', 'Error', `Error procesando "${file.name}"`);
        }
    }
    
    updatePreview();
    updateImagePreviews();
    e.target.value = '';
}

async function processImageFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                let result = e.target.result;
                
                if (file.size > 500000) {
                    result = await compressImage(result, file.type, 0.6);
                }
                
                resolve({
                    file: file,
                    preview: result,
                    base64: result.split(',')[1],
                    type: file.type,
                    name: file.name,
                    size: file.size
                });
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

async function compressImage(dataUrl, imageType, quality = 0.7) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            let width = img.width;
            let height = img.height;
            const maxSize = 1200;
            
            if (width > maxSize || height > maxSize) {
                if (width > height) {
                    height = Math.round((height * maxSize) / width);
                    width = maxSize;
                } else {
                    width = Math.round((width * maxSize) / height);
                    height = maxSize;
                }
            }
            
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            canvas.toBlob(
                (blob) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                },
                imageType === 'image/png' ? 'image/png' : 'image/jpeg',
                quality
            );
        };
        img.onerror = reject;
        img.src = dataUrl;
    });
}

function updateImagePreviews() {
    const elements = getDomElements();
    if (!elements.imagePreviewContainer) return;
    
    elements.imagePreviewContainer.innerHTML = '';
    
    currentImages.forEach((img, index) => {
        const preview = document.createElement('div');
        preview.className = 'image-preview';
        preview.innerHTML = `
            <img src="${img.preview}" alt="${img.name}">
            <button class="delete-img" data-index="${index}" title="Eliminar">
                <i class="bi bi-x"></i>
            </button>
        `;
        elements.imagePreviewContainer.appendChild(preview);
    });

    if (currentImages.length < 5) {
        elements.imagePreviewContainer.appendChild(elements.addMoreBtn);
    }

    elements.imagePreviewContainer.querySelectorAll('.delete-img').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const index = parseInt(btn.getAttribute('data-index'));
            deleteImage(index);
        });
    });
}

function deleteImage(index) {
    currentImages.splice(index, 1);
    updatePreview();
    updateImagePreviews();
}

function updatePreview() {
    const elements = getDomElements();
    if (!elements.carouselItems) return;
    
    // Destruir instancia anterior
    if (carouselInstance) {
        carouselInstance.dispose();
        carouselInstance = null;
    }
    
    // Limpiar contenedor
    elements.carouselItems.innerHTML = '';
    
    if (currentImages.length === 0) {
        elements.carouselItems.innerHTML = `
            <div class="carousel-item active">
                <div class="placeholder-image">
                    <i class="bi bi-image" style="font-size: 3rem;"></i>
                    <p>Agrega imágenes para previsualizar</p>
                </div>
            </div>
        `;
        return;
    }
    
    // Crear items del carrusel - SIN LA CLASE 'active' en todos
    currentImages.forEach((img, index) => {
        const item = document.createElement('div');
        // Solo el primer elemento tiene clase 'active'
        item.className = index === 0 ? 'carousel-item active' : 'carousel-item';
        item.innerHTML = `<img src="${img.preview}" class="d-block w-100" alt="Imagen ${index + 1}">`;
        elements.carouselItems.appendChild(item);
    });
    
    // IMPORTANTE: Inicializar el carrusel SIN data-bs-ride
    // y con un intervalo más largo para evitar el wrap inmediato
    if (elements.previewCarousel && currentImages.length > 1) {
        // Quitar cualquier atributo data-bs-ride que pueda interferir
        elements.previewCarousel.removeAttribute('data-bs-ride');
        
        // Crear nueva instancia CON wrap false inicialmente
        carouselInstance = new bootstrap.Carousel(elements.previewCarousel, {
            interval: 5000,  // 5 segundos - más tiempo para ver la transición
            wrap: false,     // IMPORTANTE: No hacer wrap automático
            keyboard: false,
            pause: 'hover'
        });
        
        // Después de 100ms, cambiar a wrap true para ciclo continuo
        setTimeout(() => {
            if (carouselInstance) {
                carouselInstance._config.wrap = true;
            }
        }, 100);
        
        console.log('Carrusel inicializado:', currentImages.length, 'imágenes, intervalo:', 5000);
    }
}

async function saveCarousel(e) {
    e.preventDefault();
    
    const name = document.getElementById('carouselName')?.value.trim();
    if (!name) {
        showAlert('error', 'Error', 'El nombre es requerido');
        return;
    }
    
    const id = name.toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
    
    if (!id) {
        showAlert('error', 'Error', 'Nombre inválido');
        return;
    }
    
    if (!editingId && currentImages.length === 0) {
        showAlert('error', 'Error', 'Agrega al menos una imagen');
        return;
    }
    
    if (!carouselsRef) {
        showAlert('error', 'Error', 'No hay conexión con la base de datos');
        return;
    }
    
    const elements = getDomElements();
    const originalBtnText = elements.saveBtn?.innerHTML;
    
    if (elements.saveBtn) {
        elements.saveBtn.disabled = true;
        elements.saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Guardando...';
    }
    
    try {
        const imagesData = currentImages.map(img => ({
            base64: img.base64,
            type: img.type,
            name: img.name
        }));
        
        const carouselData = {
            name: name,
            images: imagesData,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        if (editingId) {
            await carouselsRef.doc(editingId).update(carouselData);
            showAlert('success', 'Éxito', 'Carrusel actualizado');
        } else {
            const existingDoc = await carouselsRef.doc(id).get();
            if (existingDoc.exists) {
                throw new Error('Ya existe un carrusel con este nombre');
            }
            
            carouselData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            await carouselsRef.doc(id).set(carouselData);
            showAlert('success', 'Éxito', 'Carrusel creado');
        }
        
        resetForm();
        await loadCarousels();
        if (elements.formContainer) {
            elements.formContainer.style.display = 'none';
        }
        
    } catch (error) {
        console.error("Error guardando carrusel:", error);
        showAlert('error', 'Error', error.message);
    } finally {
        if (elements.saveBtn) {
            elements.saveBtn.disabled = false;
            elements.saveBtn.innerHTML = originalBtnText;
        }
    }
}

async function loadCarousels() {
    const elements = getDomElements();
    if (!elements.carouselsList || !carouselsRef) return;
    
    try {
        elements.carouselsList.innerHTML = '<div class="text-center"><div class="spinner-border text-warning"></div><p class="mt-2">Cargando...</p></div>';
        
        const querySnapshot = await carouselsRef.orderBy('updatedAt', 'desc').limit(50).get();
        
        elements.carouselsList.innerHTML = '';
        
        if (querySnapshot.empty) {
            elements.carouselsList.innerHTML = '<p class="text-center text-muted">No hay carruseles guardados</p>';
            return;
        }
        
        querySnapshot.forEach(doc => {
            const carousel = doc.data();
            if (!carousel.images || carousel.images.length === 0) return;
            
            const firstImage = carousel.images[0];
            const imageUrl = firstImage ? `data:${firstImage.type};base64,${firstImage.base64}` : '';
            
            const col = document.createElement('div');
            col.className = 'col-md-6 col-lg-4 mb-3';
            col.innerHTML = `
                <div class="card card-carousel h-100">
                    ${imageUrl ? 
                        `<img src="${imageUrl}" class="card-img-top" alt="${carousel.name}">` : 
                        '<div class="card-img-placeholder"><i class="bi bi-image text-muted"></i></div>'}
                    <div class="card-body">
                        <h5 class="card-title">${carousel.name || 'Sin nombre'}</h5>
                        <p class="card-text text-muted">
                            <i class="bi bi-images"></i> ${carousel.images.length} imágenes
                        </p>
                    </div>
                    <div class="card-footer bg-transparent border-top">
                        <div class="d-flex justify-content-between">
                            <button class="btn btn-sm btn-primary edit-btn" data-id="${doc.id}">
                                <i class="bi bi-pencil"></i> Editar
                            </button>
                            <button class="btn btn-sm btn-danger delete-btn" data-id="${doc.id}">
                                <i class="bi bi-trash"></i> Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            `;
            elements.carouselsList.appendChild(col);
        });
        
        elements.carouselsList.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-id');
                await editCarousel(id);
            });
        });
        
        elements.carouselsList.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-id');
                await deleteCarousel(id);
            });
        });
        
    } catch (error) {
        console.error("Error cargando carruseles:", error);
        elements.carouselsList.innerHTML = '<div class="alert alert-danger">Error al cargar carruseles</div>';
    }
}

async function editCarousel(id) {
    if (!carouselsRef) return;
    
    try {
        const doc = await carouselsRef.doc(id).get();
        if (!doc.exists) return;
        
        const carousel = doc.data();
        editingId = id;
        
        document.getElementById('editId').value = id;
        document.getElementById('carouselName').value = carousel.name || '';
        
        currentImages = (carousel.images || []).map(img => ({
            preview: `data:${img.type};base64,${img.base64}`,
            base64: img.base64,
            type: img.type,
            name: img.name || 'Imagen',
            file: null
        }));
        
        updatePreview();
        updateImagePreviews();
        
        const elements = getDomElements();
        if (elements.formContainer) {
            elements.formContainer.style.display = 'block';
            elements.formContainer.scrollIntoView({ behavior: 'smooth' });
        }
        
    } catch (error) {
        console.error("Error editando carrusel:", error);
        showAlert('error', 'Error', 'No se pudo cargar el carrusel');
    }
}

async function deleteCarousel(id) {
    if (!carouselsRef) return;
    
    const result = await Swal.fire({
        title: '¿Eliminar este carrusel?',
        text: "Esta acción no se puede deshacer",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    });
    
    if (result.isConfirmed) {
        try {
            await carouselsRef.doc(id).delete();
            showAlert('success', 'Eliminado', 'Carrusel eliminado');
            await loadCarousels();
        } catch (error) {
            console.error("Error eliminando carrusel:", error);
            showAlert('error', 'Error', 'No se pudo eliminar');
        }
    }
}

function showAlert(icon, title, text) {
    if (typeof window.showCustomAlert === 'function') {
        return window.showCustomAlert({ icon, title, text });
    } else if (typeof Swal !== 'undefined') {
        return Swal.fire({ icon, title, text });
    } else {
        alert(`${title}: ${text}`);
        return Promise.resolve({ isConfirmed: true });
    }
}