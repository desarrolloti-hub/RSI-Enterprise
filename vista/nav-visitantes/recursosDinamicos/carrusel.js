// carrusel-principal.js - Carrusel principal configurable con Firebase Storage v9
(function() {
    // Crear ID único para este carrusel
    const safeCarouselId = 'Carrusel_Principal';
    
    // Inyectar el HTML del carrusel
    const carruselHTML = /*html*/ `
    <div class="flexible-carousel-wrapper" data-carousel="principal">
        <div id="mainCarousel_${safeCarouselId}" class="carousel slide" data-bs-ride="carousel">
            <div id="mainLoading_${safeCarouselId}" class="d-flex justify-content-center align-items-center" style="height: 300px;">
                <div class="spinner-border text-primary" style="width: 3rem; height: 3rem;" role="status">
                    <span class="visually-hidden">Cargando imágenes...</span>
                </div>
            </div>
        </div>
        <div class="flexible-carousel-dots mt-3" id="dots_${safeCarouselId}"></div>
    </div>
    `;

    // Insertar el carrusel donde se coloque el script
    const scriptTag = document.currentScript;
    scriptTag.insertAdjacentHTML('beforebegin', carruselHTML);

    // Estilos dinámicos para carrusel flexible
    const style = document.createElement('style');
    style.textContent = `
    .flexible-carousel-wrapper {
        width: 100%;
        margin: 20px 0;
        position: relative;
    }
    
    #mainCarousel_${safeCarouselId} {
        width: 100%;
        height: 65vh;
        min-height: 450px;
        max-height: 700px;
        position: relative;
        overflow: hidden;
        border-radius: 8px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.1);
    }
    
    .carousel-inner {
        width: 100%;
        height: 100%;
    }
    
    .carousel-item {
        width: 100%;
        height: 100%;
        position: relative;
        display: none;
    }
    
    .carousel-item.active {
        display: block;
    }
    
    .carousel-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: center;
        transition: transform 0.5s ease;
    }
    
    #mainCarousel_${safeCarouselId}:hover .carousel-img {
        transform: scale(1.02);
    }
    
    .carousel-caption {
        position: absolute;
        bottom: 40px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(28, 25, 72, 0.85);
        color: white;
        padding: 15px 25px;
        border-radius: 8px;
        max-width: 80%;
        text-align: center;
        backdrop-filter: blur(3px);
    }
    
    .carousel-caption h5 {
        font-size: 2rem;
        font-weight: 600;
        margin: 0 0 8px 0;
    }
    
    .carousel-caption p {
        font-size: 1.1rem;
        margin: 0;
        display: none;
    }
    
    /* Controles de navegación */
    .carousel-control-prev,
    .carousel-control-next {
        width: 50px;
        height: 50px;
        background: rgba(28, 25, 72, 0.7);
        border-radius: 50%;
        top: 50%;
        transform: translateY(-50%);
        opacity: 0.7;
        transition: all 0.3s ease;
    }
    
    .carousel-control-prev:hover,
    .carousel-control-next:hover {
        opacity: 1;
        background: rgba(28, 25, 72, 0.9);
        transform: translateY(-50%) scale(1.1);
    }
    
    .carousel-control-prev {
        left: 25px;
    }
    
    .carousel-control-next {
        right: 25px;
    }
    
    /* Indicadores */
    .flexible-carousel-dots {
        display: flex;
        justify-content: center;
        gap: 12px;
    }
    
    .flexible-carousel-dot {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: rgba(28, 25, 72, 0.3);
        cursor: pointer;
        transition: all 0.3s ease;
    }
    
    .flexible-carousel-dot.active {
        background: #1c1948;
        transform: scale(1.3);
    }
    
    /* Efecto de zoom al pasar el mouse */
    .carousel-item {
        overflow: hidden;
    }
    
    @media (max-width: 1200px) {
        #mainCarousel_${safeCarouselId} {
            height: 60vh;
            min-height: 400px;
        }
    }
    
    @media (max-width: 992px) {
        #mainCarousel_${safeCarouselId} {
            height: 55vh;
            min-height: 350px;
        }
        
        .carousel-caption {
            bottom: 30px;
            padding: 12px 20px;
        }
        
        .carousel-caption h5 {
            font-size: 1.7rem;
        }
    }
    
    @media (max-width: 768px) {
        #mainCarousel_${safeCarouselId} {
            height: 50vh;
            min-height: 300px;
            max-height: 500px;
        }
        
        .carousel-caption {
            bottom: 20px;
            padding: 10px 15px;
            max-width: 90%;
        }
        
        .carousel-caption h5 {
            font-size: 1.4rem;
        }
        
        .carousel-control-prev,
        .carousel-control-next {
            width: 40px;
            height: 40px;
        }
    }
    
    @media (max-width: 576px) {
        #mainCarousel_${safeCarouselId} {
            height: 45vh;
            min-height: 250px;
            max-height: 400px;
            border-radius: 0;
        }
        
        .carousel-caption {
            bottom: 15px;
            padding: 8px 12px;
        }
        
        .carousel-caption h5 {
            font-size: 1.2rem;
        }
        
        .flexible-carousel-wrapper {
            margin: 10px 0;
        }
    }
    `;
    document.head.appendChild(style);

    // Funcionalidad del carrusel
    document.addEventListener('DOMContentLoaded', function() {
        // Verificar que Firebase esté disponible
        if (typeof firebase === 'undefined') {
            console.error('Firebase no está cargado');
            document.getElementById(`mainLoading_${safeCarouselId}`).innerHTML = `
                <div class="alert alert-danger">
                    Error: Firebase no está disponible
                </div>
            `;
            return;
        }

        // Configuración de Firebase
        const firebaseConfig = {
            apiKey: "AIzaSyBJy992gkvsT77-_fMp_O_z99wtjZiK77Y",
            authDomain: "rsienterprise.firebaseapp.com",
            projectId: "rsienterprise",
            storageBucket: "rsienterprise.firebasestorage.app",
            messagingSenderId: "1063117165770",
            appId: "1:1063117165770:web:8555f26b25ae80bc42d033"
        };
        
        // Inicializar Firebase si no está inicializado
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        
        // Obtener referencias a los servicios
        const db = firebase.firestore();
        const storage = firebase.storage && firebase.storage();
        
        if (!storage) {
            console.error('Firebase Storage no está disponible');
            document.getElementById(`mainLoading_${safeCarouselId}`).innerHTML = `
                <div class="alert alert-danger">
                    Error: Firebase Storage no está disponible
                </div>
            `;
            return;
        }
        
        async function loadCarousel() {
            const container = document.getElementById(`mainCarousel_${safeCarouselId}`);
            const loadingElement = document.getElementById(`mainLoading_${safeCarouselId}`);
            
            try {
                console.log('Buscando carrusel principal (tipo: "principal")...');
                
                // Buscar carrusel con tipo "principal"
                const querySnapshot = await db.collection("carruseles")
                    .where("tipo", "==", "principal")
                    .limit(1)
                    .get();
                
                if (!querySnapshot.empty) {
                    const carouselDoc = querySnapshot.docs[0];
                    console.log('Carrusel principal encontrado:', carouselDoc.id);
                    const carouselData = carouselDoc.data();
                    console.log('Datos del carrusel:', carouselData);
                    await renderCarousel(container, carouselData);
                } else {
                    // No hay carrusel principal configurado
                    console.log('No hay carrusel principal configurado');
                    container.innerHTML = `
                        <div class="alert alert-info text-center py-5">
                            <i class="fas fa-info-circle"></i> No hay carrusel principal configurado
                        </div>
                    `;
                }
            } catch (error) {
                console.error("Error al cargar el carrusel:", error);
                container.innerHTML = `
                    <div class="alert alert-danger text-center py-5">
                        Error al cargar el carrusel: ${error.message}
                    </div>
                `;
            } finally {
                loadingElement.style.display = 'none';
            }
        }
        
        async function renderCarousel(container, carouselData) {
            // Verificar que haya imágenes
            if (!carouselData.imagenes || carouselData.imagenes.length === 0) {
                container.innerHTML = `
                    <div class="alert alert-info text-center py-5">
                        El carrusel principal no tiene imágenes
                    </div>
                `;
                return;
            }

            console.log(`Cargando ${carouselData.imagenes.length} imágenes...`);

            // Crear elementos del carrusel
            const carouselInner = document.createElement('div');
            carouselInner.className = 'carousel-inner';
            
            // Añadir imágenes
            for (let index = 0; index < carouselData.imagenes.length; index++) {
                const img = carouselData.imagenes[index];
                const item = document.createElement('div');
                item.className = `carousel-item ${index === 0 ? 'active' : ''}`;
                
                const imgElement = new Image();
                imgElement.className = 'carousel-img';
                imgElement.alt = img.titulo || carouselData.titulo || `Imagen ${index + 1}`;
                imgElement.loading = index === 0 ? 'eager' : 'lazy';
                
                // Usar la URL de Storage directamente
                try {
                    if (img.url) {
                        console.log(`Usando URL directa para imagen ${index + 1}:`, img.url);
                        imgElement.src = img.url;
                    } else if (img.path) {
                        console.log(`Obteniendo URL para path: ${img.path}`);
                        const storageRef = storage.ref().child(img.path);
                        imgElement.src = await storageRef.getDownloadURL();
                        console.log(`URL obtenida para imagen ${index + 1}`);
                    } else {
                        throw new Error('URL no disponible');
                    }
                    
                    // Manejar error de carga de imagen
                    imgElement.onerror = function() {
                        console.error(`Error al cargar imagen ${index + 1}`);
                        this.src = 'https://rsienterprise.com/vista/css/img/Logo-RSI-OFICIAL.png';
                    };
                    
                } catch (error) {
                    console.error('Error al cargar imagen:', error);
                    imgElement.src = 'https://rsienterprise.com/vista/css/img/Logo-RSI-OFICIAL.png';
                }
                
                item.appendChild(imgElement);
                
                // Añadir título si existe
                if (img.titulo) {
                    const caption = document.createElement('div');
                    caption.className = 'carousel-caption';
                    
                    const title = document.createElement('h5');
                    title.textContent = img.titulo;
                    caption.appendChild(title);
                    
                    item.appendChild(caption);
                }
                
                carouselInner.appendChild(item);
            }
            
            container.innerHTML = '';
            container.appendChild(carouselInner);
            
            // Añadir controles si hay más de una imagen
            if (carouselData.imagenes.length > 1) {
                // Controles de navegación
                const prevButton = document.createElement('button');
                prevButton.className = 'carousel-control-prev';
                prevButton.setAttribute('data-bs-target', `#mainCarousel_${safeCarouselId}`);
                prevButton.setAttribute('data-bs-slide', 'prev');
                prevButton.innerHTML = `
                    <span class="carousel-control-prev-icon" aria-hidden="true"></span>
                    <span class="visually-hidden">Anterior</span>
                `;
                
                const nextButton = document.createElement('button');
                nextButton.className = 'carousel-control-next';
                nextButton.setAttribute('data-bs-target', `#mainCarousel_${safeCarouselId}`);
                nextButton.setAttribute('data-bs-slide', 'next');
                nextButton.innerHTML = `
                    <span class="carousel-control-next-icon" aria-hidden="true"></span>
                    <span class="visually-hidden">Siguiente</span>
                `;
                
                container.appendChild(prevButton);
                container.appendChild(nextButton);
                
                // Indicadores
                updateDots(carouselData.imagenes.length);
                
                // Inicializar carrusel Bootstrap
                if (typeof bootstrap !== 'undefined' && bootstrap.Carousel) {
                    const carousel = new bootstrap.Carousel(container, {
                        interval: 5000,
                        wrap: true,
                        touch: true
                    });
                    
                    // Actualizar indicadores cuando cambia el slide
                    container.addEventListener('slid.bs.carousel', function() {
                        const activeIndex = [...container.querySelectorAll('.carousel-item')]
                            .findIndex(item => item.classList.contains('active'));
                        updateActiveDot(activeIndex);
                    });
                } else {
                    console.warn('Bootstrap no está disponible');
                }
            } else {
                // Si solo hay una imagen, ocultar los dots
                const dotsContainer = document.getElementById(`dots_${safeCarouselId}`);
                if (dotsContainer) {
                    dotsContainer.style.display = 'none';
                }
            }
        }
        
        function updateDots(total) {
            const dotsContainer = document.getElementById(`dots_${safeCarouselId}`);
            if (!dotsContainer) return;
            
            dotsContainer.innerHTML = '';
            dotsContainer.style.display = 'flex';
            
            for (let i = 0; i < total; i++) {
                const dot = document.createElement('div');
                dot.className = `flexible-carousel-dot ${i === 0 ? 'active' : ''}`;
                dot.addEventListener('click', () => {
                    const carouselElement = document.getElementById(`mainCarousel_${safeCarouselId}`);
                    if (carouselElement && bootstrap && bootstrap.Carousel) {
                        const carousel = bootstrap.Carousel.getInstance(carouselElement);
                        if (carousel) carousel.to(i);
                    }
                });
                dotsContainer.appendChild(dot);
            }
        }
        
        function updateActiveDot(activeIndex) {
            const dots = document.querySelectorAll(`#dots_${safeCarouselId} .flexible-carousel-dot`);
            dots.forEach((dot, index) => {
                dot.classList.toggle('active', index === activeIndex);
            });
        }
        
        // Iniciar carga del carrusel
        loadCarousel();
    });
})();