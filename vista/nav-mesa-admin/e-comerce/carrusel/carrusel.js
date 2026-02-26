// Configuración de Firebase
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

// Inicializar Storage
const storage = firebase.storage();
const storageRef = storage.ref();
const carouselsRef = storageRef.child('carousels');

// Elementos del DOM
const formContainer = document.getElementById('formContainer');
const toggleBtn = document.getElementById('toggleBtn');
const cancelBtn = document.getElementById('cancelBtn');
const refreshBtn = document.getElementById('refreshBtn');
const carouselForm = document.getElementById('carouselForm');
const editId = document.getElementById('editId');
const editFolderName = document.getElementById('editFolderName');
const carouselName = document.getElementById('carouselName');
const carouselDescription = document.getElementById('carouselDescription');
const imageUpload = document.getElementById('imageUpload');
const addMoreBtn = document.getElementById('addMoreBtn');
const imagePreviewContainer = document.getElementById('imagePreviewContainer');
const imageCounter = document.getElementById('imageCounter');
const previewCounter = document.getElementById('previewCounter');
const totalCarousels = document.getElementById('totalCarousels');
const savedCount = document.getElementById('savedCount');
const carouselsList = document.getElementById('carouselsList');
const carouselItems = document.getElementById('carouselItems');
const carouselIndicators = document.getElementById('carouselIndicators');
const formTitle = document.getElementById('formTitle');
const autoProgressBar = document.getElementById('autoProgressBar');

// Estado global
let currentImages = [];
let allFolders = [];
let carouselInstance = null;
let draggingItem = null;

// Inicializar partículas
particlesJS('particles-js', {
    particles: {
        number: { value: 80, density: { enable: true, value_area: 800 } },
        color: { value: '#ffffff' },
        shape: { type: 'circle' },
        opacity: { value: 0.5, random: false },
        size: { value: 3, random: true },
        line_linked: { enable: true, distance: 150, color: '#ffffff', opacity: 0.4, width: 1 },
        move: { enable: true, speed: 6, direction: 'none', random: false, straight: false, out_mode: 'out' }
    },
    interactivity: {
        detect_on: 'canvas',
        events: { onhover: { enable: true, mode: 'repulse' }, onclick: { enable: true, mode: 'push' } },
        modes: { repulse: { distance: 100, duration: 0.4 }, push: { particles_nb: 4 } }
    }
});

// Toggle formulario
toggleBtn.addEventListener('click', () => {
    formContainer.style.display = formContainer.style.display === 'none' ? 'block' : 'none';
    if (formContainer.style.display === 'block') {
        formTitle.textContent = 'Nuevo Carrusel';
        editId.value = '';
        editFolderName.value = '';
        carouselName.value = '';
        carouselDescription.value = '';
        currentImages = [];
        updateImagePreview();
    }
});

cancelBtn.addEventListener('click', () => {
    formContainer.style.display = 'none';
    editId.value = '';
    editFolderName.value = '';
    carouselName.value = '';
    carouselDescription.value = '';
    currentImages = [];
    updateImagePreview();
});

// Add more button
addMoreBtn.addEventListener('click', () => {
    imageUpload.click();
});

// Selección de imágenes
imageUpload.addEventListener('change', async function(e) {
    if (this.files && this.files.length > 0) {
        const files = Array.from(this.files);
        
        for (let file of files) {
            if (!file.type.startsWith('image/')) {
                Swal.fire('Error', `${file.name} no es una imagen válida`, 'error');
                continue;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                currentImages.push({
                    file: file,
                    url: e.target.result,
                    name: file.name,
                    isNew: true
                });
                updateImagePreview();
            };
            reader.readAsDataURL(file);
        }
        
        imageUpload.value = '';
    }
});

// Función para actualizar vista previa de imágenes
function updateImagePreview() {
    // Actualizar contador
    imageCounter.textContent = `${currentImages.length} imágenes`;
    previewCounter.textContent = `${currentImages.length} imágenes`;

    // Crear HTML de imágenes
    const imagesHtml = currentImages.map((img, index) => `
        <div class="image-item" draggable="true" 
             data-index="${index}"
             ondragstart="dragStart(event)"
             ondragover="dragOver(event)"
             ondrop="drop(event)"
             ondragend="dragEnd(event)">
            <img src="${img.url}" alt="${img.name}">
            <span class="drag-handle">⋮⋮</span>
            <div class="image-actions">
                <button type="button" class="image-btn" onclick="moveImage(${index}, 'up')">
                    <i class="bi bi-arrow-up"></i>
                </button>
                <button type="button" class="image-btn" onclick="moveImage(${index}, 'down')">
                    <i class="bi bi-arrow-down"></i>
                </button>
                <button type="button" class="image-btn delete" onclick="removeImage(${index})">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        </div>
    `).join('');

    // Actualizar preview container
    imagePreviewContainer.innerHTML = imagesHtml + `
        <div class="add-more-card" onclick="document.getElementById('imageUpload').click()">
            <div class="add-more-content">
                <i class="bi bi-cloud-arrow-up add-more-icon"></i>
                <span>Agregar más</span>
            </div>
        </div>
    `;

    // Actualizar vista previa del carrusel
    updateCarouselPreview();
}

// Función para actualizar vista previa del carrusel
function updateCarouselPreview() {
    if (currentImages.length === 0) {
        carouselItems.innerHTML = `
            <div class="carousel-item active">
                <div class="placeholder-image">
                    <div class="placeholder-content">
                        <i class="bi bi-image"></i>
                        <h5>Sin imágenes</h5>
                        <p>Agrega imágenes para ver la vista previa</p>
                    </div>
                </div>
            </div>
        `;
        carouselIndicators.innerHTML = '';
        return;
    }

    // Crear items del carrusel
    const itemsHtml = currentImages.map((img, index) => `
        <div class="carousel-item ${index === 0 ? 'active' : ''}">
            <img src="${img.url}" class="d-block w-100" style="height: 400px; object-fit: cover;" alt="${img.name}">
        </div>
    `).join('');

    // Crear indicadores
    const indicatorsHtml = currentImages.map((_, index) => `
        <button type="button" data-bs-target="#previewCarousel" 
                data-bs-slide-to="${index}" ${index === 0 ? 'class="active"' : ''}
                aria-label="Slide ${index + 1}"></button>
    `).join('');

    carouselItems.innerHTML = itemsHtml;
    carouselIndicators.innerHTML = indicatorsHtml;

    // Reiniciar carrusel
    if (carouselInstance) {
        carouselInstance.dispose();
    }
    carouselInstance = new bootstrap.Carousel(document.getElementById('previewCarousel'), {
        interval: 3000,
        ride: 'carousel'
    });
}

// Funciones para mover imágenes
window.moveImage = function(index, direction) {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (newIndex < 0 || newIndex >= currentImages.length) return;

    // Intercambiar
    [currentImages[index], currentImages[newIndex]] = [currentImages[newIndex], currentImages[index]];
    updateImagePreview();
};

window.removeImage = function(index) {
    currentImages.splice(index, 1);
    updateImagePreview();
};

// Drag & Drop
window.dragStart = function(event) {
    draggingItem = event.target.closest('.image-item');
    event.dataTransfer.setData('text/plain', draggingItem.dataset.index);
    draggingItem.classList.add('dragging');
};

window.dragOver = function(event) {
    event.preventDefault();
    const dropTarget = event.target.closest('.image-item');
    if (dropTarget && dropTarget !== draggingItem) {
        const bounding = dropTarget.getBoundingClientRect();
        const offset = bounding.y + bounding.height / 2;
        if (event.clientY - offset > 0) {
            dropTarget.style.borderBottom = '2px solid #6C43E0';
            dropTarget.style.borderTop = 'none';
        } else {
            dropTarget.style.borderTop = '2px solid #6C43E0';
            dropTarget.style.borderBottom = 'none';
        }
    }
};

window.drop = function(event) {
    event.preventDefault();
    const dropTarget = event.target.closest('.image-item');
    if (!dropTarget || !draggingItem) return;

    dropTarget.style.borderTop = 'none';
    dropTarget.style.borderBottom = 'none';

    const dragIndex = parseInt(event.dataTransfer.getData('text/plain'));
    const dropIndex = parseInt(dropTarget.dataset.index);

    if (dragIndex !== dropIndex) {
        const [movedItem] = currentImages.splice(dragIndex, 1);
        currentImages.splice(dropIndex, 0, movedItem);
        updateImagePreview();
    }

    draggingItem.classList.remove('dragging');
    draggingItem = null;
};

window.dragEnd = function(event) {
    if (draggingItem) {
        draggingItem.classList.remove('dragging');
        draggingItem = null;
    }
    document.querySelectorAll('.image-item').forEach(item => {
        item.style.borderTop = 'none';
        item.style.borderBottom = 'none';
    });
};

// Guardar carrusel
carouselForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = carouselName.value.trim();
    if (!name) {
        Swal.fire('Error', 'Ingresa un nombre para el carrusel', 'error');
        return;
    }

    const sanitizedName = name.replace(/[^a-zA-Z0-9-_]/g, '_');
    if (sanitizedName !== name) {
        Swal.fire('Error', 'El nombre solo puede contener letras, números, guiones y guiones bajos', 'error');
        return;
    }

    if (currentImages.length === 0) {
        Swal.fire('Error', 'Agrega al menos una imagen', 'error');
        return;
    }

    // Mostrar progreso
    Swal.fire({
        title: 'Subiendo imágenes...',
        html: 'Por favor espera',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });

    try {
        // Si es edición y hay nombre diferente, necesitamos manejar el cambio de carpeta
        const oldFolderName = editFolderName.value;
        const newFolderName = sanitizedName;
        
        // Subir imágenes nuevas
        const uploadPromises = currentImages.map(async (img, index) => {
            if (img.isNew && img.file) {
                const timestamp = Date.now() + index;
                const fileName = `${timestamp}_${img.file.name}`;
                const filePath = `carousels/${newFolderName}/${fileName}`;
                const fileRef = storageRef.child(filePath);
                await fileRef.put(img.file);
                return {
                    ...img,
                    storagePath: filePath,
                    uploaded: true
                };
            }
            return img;
        });

        const updatedImages = await Promise.all(uploadPromises);
        
        // Si estamos editando y cambió el nombre, eliminar carpeta anterior
        if (oldFolderName && oldFolderName !== newFolderName) {
            try {
                const oldFolderRef = carouselsRef.child(oldFolderName);
                const oldResult = await oldFolderRef.listAll();
                await Promise.all(oldResult.items.map(item => item.delete()));
            } catch (error) {
                console.log('Carpeta anterior no existe o ya fue eliminada');
            }
        }

        Swal.fire({
            icon: 'success',
            title: '¡Éxito!',
            text: 'Carrusel guardado correctamente',
            timer: 2000
        });

        // Limpiar y recargar
        formContainer.style.display = 'none';
        editId.value = '';
        editFolderName.value = '';
        carouselName.value = '';
        carouselDescription.value = '';
        currentImages = [];
        updateImagePreview();
        
        await loadAllFolders();

    } catch (error) {
        console.error('Error:', error);
        Swal.fire('Error', 'Error al guardar: ' + error.message, 'error');
    }
});

// Cargar todas las carpetas
async function loadAllFolders() {
    carouselsList.innerHTML = `
        <div class="col-12">
            <div class="loading">
                <div class="loading-spinner"></div>
                <p>Cargando carruseles...</p>
            </div>
        </div>
    `;

    try {
        const result = await carouselsRef.listAll();
        
        totalCarousels.textContent = result.prefixes.length;
        savedCount.textContent = result.prefixes.length;

        if (result.prefixes.length === 0) {
            carouselsList.innerHTML = `
                <div class="col-12">
                    <div class="text-center py-5">
                        <i class="bi bi-folder" style="font-size: 4em; color: #ccc;"></i>
                        <h5 class="mt-3">No hay carruseles</h5>
                        <p class="text-muted">Crea un nuevo carrusel usando el botón "Nuevo Carrusel"</p>
                    </div>
                </div>
            `;
            return;
        }

        // Obtener información de cada carpeta
        const foldersInfo = await Promise.all(
            result.prefixes.map(async (folder) => {
                const folderRef = carouselsRef.child(folder.name);
                const folderResult = await folderRef.listAll();
                
                // Obtener primera imagen para preview
                let previewUrl = '';
                if (folderResult.items.length > 0) {
                    previewUrl = await folderResult.items[0].getDownloadURL();
                }

                return {
                    name: folder.name,
                    imageCount: folderResult.items.length,
                    previewUrl: previewUrl,
                    fullPath: folder.fullPath
                };
            })
        );

        displayFolders(foldersInfo);

    } catch (error) {
        console.error('Error:', error);
        carouselsList.innerHTML = `
            <div class="col-12">
                <div class="alert alert-danger">
                    Error al cargar carruseles: ${error.message}
                </div>
            </div>
        `;
    }
}

// Mostrar carpetas
function displayFolders(folders) {
    carouselsList.innerHTML = folders.map(folder => `
        <div class="col-md-6 col-lg-4">
            <div class="carousel-card">
                <div class="card-preview">
                    ${folder.previewUrl ? 
                        `<img src="${folder.previewUrl}" alt="${folder.name}">` : 
                        `<i class="bi bi-folder"></i>`
                    }
                </div>
                <div class="card-body">
                    <h5 class="card-title">${folder.name}</h5>
                    <div class="card-stats">
                        <span><i class="bi bi-images"></i> ${folder.imageCount} imágenes</span>
                    </div>
                    <div class="card-actions">
                        <button class="btn-sm btn-outline-primary flex-grow-1" onclick="editFolder('${folder.name}')">
                            <i class="bi bi-pencil"></i> Editar
                        </button>
                        <button class="btn-sm btn-outline-danger" onclick="deleteFolder('${folder.name}')">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// Editar carpeta
window.editFolder = async function(folderName) {
    try {
        Swal.fire({
            title: 'Cargando...',
            text: 'Cargando imágenes de la carpeta',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        const folderRef = carouselsRef.child(folderName);
        const result = await folderRef.listAll();
        
        // Cargar todas las imágenes
        const images = await Promise.all(
            result.items.map(async (item) => {
                const url = await item.getDownloadURL();
                return {
                    name: item.name,
                    url: url,
                    fullPath: item.fullPath,
                    isNew: false
                };
            })
        );

        // Ordenar por fecha (del nombre del archivo)
        images.sort((a, b) => {
            const timeA = parseInt(a.name.split('_')[0]) || 0;
            const timeB = parseInt(b.name.split('_')[0]) || 0;
            return timeB - timeA;
        });

        currentImages = images;
        carouselName.value = folderName;
        editFolderName.value = folderName;
        formTitle.textContent = 'Editar Carrusel';
        
        updateImagePreview();
        
        Swal.close();
        formContainer.style.display = 'block';

    } catch (error) {
        console.error('Error:', error);
        Swal.fire('Error', 'Error al cargar la carpeta: ' + error.message, 'error');
    }
};

// Eliminar carpeta
window.deleteFolder = async function(folderName) {
    const result = await Swal.fire({
        title: '¿Eliminar carpeta?',
        text: `Se eliminará la carpeta "${folderName}" y todas sus imágenes`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
        try {
            const folderRef = carouselsRef.child(folderName);
            const folderResult = await folderRef.listAll();
            
            // Eliminar todas las imágenes
            await Promise.all(folderResult.items.map(item => item.delete()));
            
            Swal.fire('Eliminado', 'Carpeta eliminada correctamente', 'success');
            await loadAllFolders();

        } catch (error) {
            console.error('Error:', error);
            Swal.fire('Error', 'Error al eliminar: ' + error.message, 'error');
        }
    }
};

// Refresh
refreshBtn.addEventListener('click', () => {
    autoProgressBar.style.width = '100%';
    setTimeout(() => {
        autoProgressBar.style.width = '0%';
    }, 1000);
    loadAllFolders();
});

// Inicializar
loadAllFolders();

// Barra de progreso automática
let progress = 0;
setInterval(() => {
    progress = (progress + 1) % 100;
    autoProgressBar.style.width = progress + '%';
}, 100);

// Hacer funciones globales para los eventos onclick
window.moveImage = moveImage;
window.removeImage = removeImage;
window.dragStart = dragStart;
window.dragOver = dragOver;
window.drop = drop;
window.dragEnd = dragEnd;
window.editFolder = editFolder;
window.deleteFolder = deleteFolder;