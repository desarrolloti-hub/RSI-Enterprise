// carrusel.js - Versión flexible con imágenes grandes
(function() {
    // Inyectar el HTML del carrusel
    const carruselHTML = /*html*/ `
    <div class="flexible-carousel-wrapper">
        <div id="mainCarousel" class="carousel slide" data-bs-ride="carousel">
            <div id="mainLoading" class="d-flex justify-content-center align-items-center" style="height: 300px;">
                <div class="spinner-border text-primary" style="width: 3rem; height: 3rem;" role="status">
                    <span class="visually-hidden">Cargando imágenes...</span>
                </div>
            </div>
        </div>
        <div class="flexible-carousel-dots mt-3"></div>
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
    
    #mainCarousel {
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
    
    #mainCarousel:hover .carousel-img {
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
        #mainCarousel {
            height: 60vh;
            min-height: 400px;
        }
    }
    
    @media (max-width: 992px) {
        #mainCarousel {
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
        #mainCarousel {
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
        #mainCarousel {
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
        
        function loadCarousel() {
            const container = document.getElementById('mainCarousel');
            const loadingElement = document.getElementById('mainLoading');
            
            db.collection("carousels").doc("carrusel-principal").get()
                .then((doc) => {
                    if (doc.exists) {
                        renderCarousel(container, doc.data());
                    } else {
                        container.innerHTML = `
                            <div class="alert alert-warning text-center py-5">
                                No se encontró el carrusel en la base de datos
                            </div>
                        `;
                    }
                })
                .catch((error) => {
                    container.innerHTML = `
                        <div class="alert alert-danger text-center py-5">
                            Error al cargar el carrusel: ${error.message}
                        </div>
                    `;
                })
                .finally(() => {
                    loadingElement.style.display = 'none';
                });
        }
        
        function renderCarousel(container, carouselData) {
            // Crear elementos del carrusel
            const carouselInner = document.createElement('div');
            carouselInner.className = 'carousel-inner';
            
            // Añadir imágenes
            carouselData.images.forEach((img, index) => {
                const item = document.createElement('div');
                item.className = `carousel-item ${index === 0 ? 'active' : ''}`;
                
                const imgElement = new Image();
                imgElement.className = 'carousel-img';
                imgElement.alt = img.title || `Imagen ${index + 1}`;
                imgElement.onerror = () => {
                    imgElement.src = 'https://rsienterprise.com/vista/css/img/Logo-RSI-OFICIAL.png';
                };
                
                try {
                    imgElement.src = `data:${img.type};base64,${img.base64}`;
                } catch (error) {
                    imgElement.src = 'https://rsienterprise.com/vista/css/img/Logo-RSI-OFICIAL.png';
                }
                
                item.appendChild(imgElement);
                
                if (img.title) {
                    const caption = document.createElement('div');
                    caption.className = 'carousel-caption';
                    
                    const title = document.createElement('h5');
                    title.textContent = img.title;
                    caption.appendChild(title);
                    
                    item.appendChild(caption);
                }
                
                carouselInner.appendChild(item);
            });
            
            container.innerHTML = '';
            container.appendChild(carouselInner);
            
            // Añadir controles si hay más de una imagen
            if (carouselData.images.length > 1) {
                // Controles de navegación
                const prevButton = document.createElement('button');
                prevButton.className = 'carousel-control-prev';
                prevButton.setAttribute('data-bs-target', '#mainCarousel');
                prevButton.setAttribute('data-bs-slide', 'prev');
                prevButton.innerHTML = `
                    <span class="carousel-control-prev-icon" aria-hidden="true"></span>
                    <span class="visually-hidden">Anterior</span>
                `;
                
                const nextButton = document.createElement('button');
                nextButton.className = 'carousel-control-next';
                nextButton.setAttribute('data-bs-target', '#mainCarousel');
                nextButton.setAttribute('data-bs-slide', 'next');
                nextButton.innerHTML = `
                    <span class="carousel-control-next-icon" aria-hidden="true"></span>
                    <span class="visually-hidden">Siguiente</span>
                `;
                
                container.appendChild(prevButton);
                container.appendChild(nextButton);
                
                // Indicadores
                updateDots(carouselData.images.length);
                
                // Inicializar carrusel Bootstrap
                if (typeof bootstrap !== 'undefined') {
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
                }
            }
        }
        
        function updateDots(total) {
            const dotsContainer = document.querySelector('.flexible-carousel-dots');
            dotsContainer.innerHTML = '';
            
            for (let i = 0; i < total; i++) {
                const dot = document.createElement('div');
                dot.className = `flexible-carousel-dot ${i === 0 ? 'active' : ''}`;
                dot.addEventListener('click', () => {
                    const carousel = bootstrap.Carousel.getInstance(document.getElementById('mainCarousel'));
                    if (carousel) carousel.to(i);
                });
                dotsContainer.appendChild(dot);
            }
        }
        
        function updateActiveDot(activeIndex) {
            const dots = document.querySelectorAll('.flexible-carousel-dot');
            dots.forEach((dot, index) => {
                dot.classList.toggle('active', index === activeIndex);
            });
        }
        
        // Iniciar carga del carrusel
        loadCarousel();
    });
})();