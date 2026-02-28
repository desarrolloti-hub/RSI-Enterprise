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
// FUNCIONES DE ALERTAS PERSONALIZADAS
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
// ESTADO DE LA APLICACIÓN
// ==========================================================================
const appState = {
    currentUser: null,
    carousels: [],
    filteredCarousels: [],
    currentPage: 1,
    carouselsPerPage: 12,
    searchTerm: ''
};

// ==========================================================================
// FUNCIONES PRINCIPALES
// ==========================================================================

async function initialLoad() {
    try {
        await loadUserProfile();
        setupEventListeners();
        loadCarousels();
    } catch (error) {
        console.error("Error en la carga inicial:", error);
        showCustomError('Error', 'No se pudieron cargar los carruseles.');
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
                area: userData.ÁREA
            };
        }
    } catch (error) {
        console.error("Error al cargar perfil:", error);
    }
}

async function loadCarousels() {
    try {
        const querySnapshot = await db.collection('carruseles')
            .orderBy('fechaCreacion', 'desc')
            .get();

        appState.carousels = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        applySearchFilter();
        displayCarousels();
        
    } catch (error) {
        console.error("Error al cargar carruseles:", error);
        showCustomError('Error', 'No se pudieron cargar los carruseles.');
    }
}

function applySearchFilter() {
    const searchTerm = appState.searchTerm.toLowerCase().trim();
    
    if (!searchTerm) {
        appState.filteredCarousels = [...appState.carousels];
    } else {
        appState.filteredCarousels = appState.carousels.filter(carousel => 
            carousel.titulo.toLowerCase().includes(searchTerm) ||
            (carousel.descripcion && carousel.descripcion.toLowerCase().includes(searchTerm)) ||
            carousel.creadoPor.toLowerCase().includes(searchTerm)
        );
    }
    
    appState.currentPage = 1;
    updatePagination();
}

function displayCarousels() {
    const carouselsGrid = document.getElementById('carouselsGrid');
    
    if (!appState.filteredCarousels || appState.filteredCarousels.length === 0) {
        carouselsGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-images"></i>
                <h3>No hay carruseles para mostrar</h3>
                <p>${appState.searchTerm ? 
                    'No se encontraron carruseles que coincidan con tu búsqueda' : 
                    'No se han creado carruseles todavía'}</p>
                ${!appState.searchTerm ? '<a href="nuevo-carrusel.html" class="btn btn-primary" style="margin-top: 20px;"><i class="fas fa-plus"></i> Crear Nuevo Carrusel</a>' : ''}
            </div>
        `;
        return;
    }

    // Calcular carruseles para la página actual
    const startIndex = (appState.currentPage - 1) * appState.carouselsPerPage;
    const endIndex = startIndex + appState.carouselsPerPage;
    const carouselsToDisplay = appState.filteredCarousels.slice(startIndex, endIndex);

    const carouselsHTML = carouselsToDisplay.map(carousel => {
        // Crear preview de imágenes (hasta 3 imágenes)
        const previewImages = carousel.imagenes && carousel.imagenes.length > 0 
            ? carousel.imagenes.slice(0, 3).map(img => 
                `<div class="preview-img" style="background-image: url('${img.url}');"></div>`
              ).join('')
            : '<i class="fas fa-images"></i>';

        // Escapar el JSON de imágenes correctamente para pasarlo a la función
        const imagenesJSON = JSON.stringify(carousel.imagenes || [])
            .replace(/\\/g, '\\\\')
            .replace(/'/g, "\\'");

        return `
            <div class="carousel-card">
                <div class="carousel-preview">
                    <div class="preview-images">
                        ${previewImages}
                    </div>
                    ${carousel.imagenes && carousel.imagenes.length > 3 ? 
                        `<span class="image-count-badge">+${carousel.imagenes.length - 3}</span>` : 
                        carousel.imagenes && carousel.imagenes.length > 0 ?
                        `<span class="image-count-badge">${carousel.imagenes.length} ${carousel.imagenes.length === 1 ? 'imagen' : 'imágenes'}</span>` :
                        ''}
                </div>
                <div class="carousel-info">
                    <h3 class="carousel-title">${carousel.titulo}</h3>
                    ${carousel.descripcion ? `<p class="carousel-description">${carousel.descripcion}</p>` : ''}
                    <div class="carousel-meta">
                        <span><i class="fas fa-user"></i> ${carousel.creadoPor}</span>
                        <span><i class="fas fa-calendar"></i> ${formatDate(carousel.fechaCreacion)}</span>
                    </div>
                    <div class="carousel-actions">
                        <button class="action-btn btn-view" onclick='viewCarousel("${carousel.id}", "${carousel.titulo.replace(/"/g, '&quot;')}", ${imagenesJSON})'>
                            <i class="fas fa-eye"></i> Ver
                        </button>
                        <button class="action-btn btn-delete" onclick='deleteCarousel("${carousel.id}", "${carousel.titulo.replace(/"/g, '&quot;')}")'>
                            <i class="fas fa-trash"></i> Eliminar
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    carouselsGrid.innerHTML = carouselsHTML;
}

function updatePagination() {
    const pagination = document.getElementById('pagination');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const pageInfo = document.getElementById('pageInfo');

    const totalPages = Math.ceil(appState.filteredCarousels.length / appState.carouselsPerPage);

    if (totalPages <= 1) {
        pagination.style.display = 'none';
        return;
    }

    pagination.style.display = 'flex';
    prevBtn.disabled = appState.currentPage === 1;
    nextBtn.disabled = appState.currentPage === totalPages;
    pageInfo.textContent = `Página ${appState.currentPage} de ${totalPages}`;
}

// Hacer viewCarousel global - CORREGIDO
window.viewCarousel = function(carouselId, carouselTitle, imagenes) {
    const modal = document.getElementById('carouselModal');
    const modalTitle = document.getElementById('modalTitle');
    
    modalTitle.textContent = carouselTitle;
    
    // Asegurarse de que imagenes sea un array
    const imagenesArray = Array.isArray(imagenes) ? imagenes : [];
    
    // Crear el carrusel en el modal
    createModalCarousel(imagenesArray);
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function createModalCarousel(imagenes) {
    const modalBody = document.querySelector('.modal-body');
    
    if (!imagenes || imagenes.length === 0) {
        modalBody.innerHTML = `
            <div class="empty-state" style="background: none; color: #333; padding: 60px;">
                <i class="fas fa-images" style="color: #999;"></i>
                <h3 style="color: #333;">Este carrusel no tiene imágenes</h3>
            </div>
        `;
        return;
    }

    let currentIndex = 0;

    const carouselHTML = `
        <div class="carousel-modal-container" id="modalCarousel">
            <div class="carousel-modal-track" id="carouselTrack" style="transform: translateX(0%);">
                ${imagenes.map(img => `
                    <div class="carousel-modal-slide" style="background-image: url('${img.url}');"></div>
                `).join('')}
            </div>
            
            ${imagenes.length > 1 ? `
                <div class="carousel-modal-controls">
                    <button class="carousel-modal-control" id="prevSlide"><i class="fas fa-chevron-left"></i></button>
                    <button class="carousel-modal-control" id="nextSlide"><i class="fas fa-chevron-right"></i></button>
                </div>
                
                <div class="carousel-modal-indicators" id="slideIndicators">
                    ${imagenes.map((_, idx) => `
                        <button class="carousel-modal-indicator ${idx === 0 ? 'active' : ''}" data-index="${idx}"></button>
                    `).join('')}
                </div>
                
                <div class="carousel-modal-counter">
                    <span id="currentSlide">1</span> / ${imagenes.length}
                </div>
            ` : ''}
        </div>
    `;

    modalBody.innerHTML = carouselHTML;

    // Configurar eventos del carrusel si hay más de una imagen
    if (imagenes.length > 1) {
        const track = document.getElementById('carouselTrack');
        const prevBtn = document.getElementById('prevSlide');
        const nextBtn = document.getElementById('nextSlide');
        const indicators = document.querySelectorAll('.carousel-modal-indicator');
        const currentSlideSpan = document.getElementById('currentSlide');

        function updateCarousel(index) {
            currentIndex = index;
            track.style.transform = `translateX(-${currentIndex * 100}%)`;
            
            // Actualizar indicadores
            indicators.forEach((ind, i) => {
                ind.classList.toggle('active', i === currentIndex);
            });
            
            // Actualizar contador
            if (currentSlideSpan) {
                currentSlideSpan.textContent = currentIndex + 1;
            }
        }

        prevBtn.addEventListener('click', () => {
            currentIndex = (currentIndex - 1 + imagenes.length) % imagenes.length;
            updateCarousel(currentIndex);
        });

        nextBtn.addEventListener('click', () => {
            currentIndex = (currentIndex + 1) % imagenes.length;
            updateCarousel(currentIndex);
        });

        indicators.forEach((ind, idx) => {
            ind.addEventListener('click', () => {
                updateCarousel(idx);
            });
        });
    }
}

// Hacer deleteCarousel global
window.deleteCarousel = async function(carouselId, carouselTitle) {
    try {
        const result = await Swal.fire({
            title: '¿Eliminar carrusel?',
            html: `¿Estás seguro de que quieres eliminar el carrusel <strong>"${carouselTitle}"</strong>?<br>Esta acción no se puede deshacer.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#e74c3c',
            cancelButtonColor: '#6C43E0'
        });

        if (result.isConfirmed) {
            // Obtener información del carrusel antes de eliminar
            const carouselDoc = await db.collection('carruseles').doc(carouselId).get();
            const carouselData = carouselDoc.data();

            // Eliminar todas las imágenes de Storage
            if (carouselData.imagenes && carouselData.imagenes.length > 0) {
                const deletePromises = carouselData.imagenes.map(async (img) => {
                    if (img.path) {
                        try {
                            const fileRef = storage.ref().child(img.path);
                            await fileRef.delete();
                        } catch (error) {
                            console.error('Error al eliminar imagen:', error);
                        }
                    }
                });
                
                await Promise.all(deletePromises);
            }

            // Eliminar documento de Firestore
            await db.collection('carruseles').doc(carouselId).delete();

            Swal.fire({
                title: '¡Eliminado!',
                text: 'El carrusel ha sido eliminado correctamente.',
                icon: 'success',
                confirmButtonColor: '#6C43E0'
            });

            // Recargar carruseles
            loadCarousels();
        }
    } catch (error) {
        console.error('Error al eliminar carrusel:', error);
        showCustomError('Error', 'No se pudo eliminar el carrusel.');
    }
}

function closeModal() {
    const modal = document.getElementById('carouselModal');
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

function formatDate(timestamp) {
    if (!timestamp) return 'Fecha no disponible';
    try {
        if (timestamp.toDate) {
            return timestamp.toDate().toLocaleDateString('es-MX');
        }
        return new Date(timestamp).toLocaleDateString('es-MX');
    } catch (error) {
        return 'Fecha inválida';
    }
}

function setupEventListeners() {
    // Búsqueda
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            appState.searchTerm = this.value;
            applySearchFilter();
            displayCarousels();
        });
    }

    // Modal
    const modalClose = document.getElementById('modalClose');
    const modal = document.getElementById('carouselModal');
    
    if (modalClose) {
        modalClose.addEventListener('click', closeModal);
    }
    
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeModal();
            }
        });
    }

    // Paginación
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    
    if (prevBtn) {
        prevBtn.addEventListener('click', function() {
            if (appState.currentPage > 1) {
                appState.currentPage--;
                displayCarousels();
                updatePagination();
            }
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', function() {
            const totalPages = Math.ceil(appState.filteredCarousels.length / appState.carouselsPerPage);
            if (appState.currentPage < totalPages) {
                appState.currentPage++;
                displayCarousels();
                updatePagination();
            }
        });
    }

    // Cerrar modal con ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeModal();
        }
    });
}

// ==========================================================================
// INICIALIZACIÓN
// ==========================================================================
document.addEventListener('DOMContentLoaded', function() {
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