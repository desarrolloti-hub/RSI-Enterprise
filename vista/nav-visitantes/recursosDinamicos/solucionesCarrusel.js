// solucionesCarrusel.js - Carrusel autónomo para "Nuestras Soluciones"
(function() {
    // Inyectar el HTML del carrusel
    const carruselHTML = /*html*/ `
    <section class="soluciones-carrusel-section">
        <div class="container">
            <h2 class="section-title">Nuestras Soluciones</h2>
            <p class="section-subtitle">Tecnología adaptada a tus necesidades</p>
            
            <div class="soluciones-carrusel-container">
                <div class="soluciones-loading" id="solucionesLoading">
                    <div class="spinner-border text-primary" role="status"></div>
                </div>
                <div class="soluciones-error" id="solucionesError"></div>
                <div id="solucionesCarousel" class="swiper">
                    <div class="swiper-wrapper" id="solucionesWrapper"></div>
                    <div class="swiper-pagination"></div>
                    <div class="swiper-button-prev"></div>
                    <div class="swiper-button-next"></div>
                </div>
            </div>
        </div>
    </section>
    `;

    // Insertar el carrusel donde se coloque el script
    const scriptTag = document.currentScript;
    scriptTag.insertAdjacentHTML('beforebegin', carruselHTML);

    // Estilos dinámicos para el carrusel
    const style = document.createElement('style');
    style.textContent =/* css */ `
    .soluciones-carrusel-section {
        padding: 80px 0;
        background-color: var(--light-bg);
    }
    
    .soluciones-carrusel-container {
        position: relative;
        margin-top: 40px;
    }
    
    .soluciones-loading,
    .soluciones-error {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 300px;
        background-color: #f8f9fa;
    }
    
    .soluciones-error {
        color: var(--danger-color);
        display: none;
    }
    
    #solucionesCarousel {
        display: none;
        width: 100%;
        padding: 20px 0;
    }
    
    .swiper-slide {
        background: var(--white);
        border-radius: 10px;
        overflow: hidden;
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.05);
        transition: all 0.3s ease;
        width: 300px;
    }
    
    .swiper-slide:hover {
        transform: translateY(-10px);
        box-shadow: 0 15px 30px rgba(0, 0, 0, 0.1);
    }
    
    .swiper-slide img {
        width: 100%;
        height: 200px;
        object-fit: cover;
        display: block;
    }
    
    .swiper-slide-content {
        padding: 20px;
        text-align: center;
    }
    
    .swiper-slide h3 {
        color: var(--primary-color);
        margin-bottom: 10px;
        font-size: 1.2rem;
    }
    
    .swiper-slide p {
        color: var(--light-text);
        font-size: 0.9rem;
    }
    
    .swiper-button-prev,
    .swiper-button-next {
        background-color: var(--white);
        width: 40px;
        height: 40px;
        border-radius: 50%;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        color: var(--primary-color);
        transition: all 0.3s ease;
    }
    
    .swiper-button-prev:hover,
    .swiper-button-next:hover {
        background-color: var(--primary-color);
        color: var(--white);
    }
    
    .swiper-button-prev::after,
    .swiper-button-next::after {
        font-size: 1.2rem;
    }
    
    .swiper-pagination-bullet {
        background: var(--border-color);
        opacity: 1;
    }
    
    .swiper-pagination-bullet-active {
        background: var(--primary-color);
    }
    
    @media (max-width: 768px) {
        .soluciones-carrusel-section {
            padding: 60px 0;
        }
        
        .swiper-slide {
            width: 250px;
        }
    }
    
    @media (max-width: 576px) {
        .soluciones-carrusel-section {
            padding: 40px 0;
        }
        
        .swiper-slide {
            width: 220px;
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
        
        // Inicializar Firebase solo si no está ya inicializado
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        
        const db = firebase.firestore();
        
        function loadSolucionesCarousel() {
            const loadingElement = document.getElementById('solucionesLoading');
            const errorElement = document.getElementById('solucionesError');
            const container = document.getElementById('solucionesCarousel');
            const wrapper = document.getElementById('solucionesWrapper');
            
            db.collection("carousels").doc("carrusel2").get()
                .then((doc) => {
                    if (doc.exists) {
                        const carouselData = doc.data();
                        
                        if (carouselData.images && carouselData.images.length > 0) {
                            wrapper.innerHTML = '';
                            
                            // Crear slides para cada imagen
                            carouselData.images.forEach((imgData) => {
                                const slide = document.createElement('div');
                                slide.className = 'swiper-slide';
                                
                                const img = document.createElement('img');
                                img.src = `data:${imgData.type};base64,${imgData.base64}`;
                                img.alt = imgData.title || "Imagen de solución";
                                img.onerror = () => {
                                    img.src = 'https://rsienterprise.com/vista/css/img/Logo-RSI-OFICIAL.png';
                                };
                                
                                const content = document.createElement('div');
                                content.className = 'swiper-slide-content';
                                
                                if (imgData.title) {
                                    const title = document.createElement('h3');
                                    title.textContent = imgData.title;
                                    content.appendChild(title);
                                }
                                
                                if (imgData.description) {
                                    const desc = document.createElement('p');
                                    desc.textContent = imgData.description;
                                    content.appendChild(desc);
                                }
                                
                                slide.appendChild(img);
                                slide.appendChild(content);
                                wrapper.appendChild(slide);
                                
                                // Efecto hover
                                slide.onmouseenter = () => slide.style.transform = 'scale(1.05)';
                                slide.onmouseleave = () => slide.style.transform = 'scale(1)';
                            });
                            
                            // Inicializar Swiper
                            initSwiper(container);
                        } else {
                            showError(errorElement, "El carrusel no contiene imágenes");
                        }
                    } else {
                        showError(errorElement, "No se encontró el carrusel");
                    }
                })
                .catch((error) => {
                    showError(errorElement, "Error al cargar el carrusel: " + error.message);
                })
                .finally(() => {
                    loadingElement.style.display = 'none';
                });
        }
        
        function initSwiper(container) {
            container.style.display = 'block';
            
            new Swiper(container, {
                effect: 'coverflow',
                grabCursor: true,
                centeredSlides: true,
                slidesPerView: 'auto',
                autoplay: {
                    delay: 3000,
                    disableOnInteraction: false,
                },
                loop: true,
                pagination: {
                    el: '.swiper-pagination',
                    clickable: true,
                },
                navigation: {
                    nextEl: '.swiper-button-next',
                    prevEl: '.swiper-button-prev',
                },
                coverflowEffect: {
                    rotate: 0,
                    stretch: 0,
                    depth: 100,
                    modifier: 2.5,
                    slideShadows: false,
                },
                breakpoints: {
                    640: { slidesPerView: 2, spaceBetween: 20 },
                    768: { slidesPerView: 3, spaceBetween: 30 },
                    1024: { slidesPerView: 3, spaceBetween: 40 },
                }
            });
        }
        
        function showError(element, message) {
            element.textContent = message;
            element.style.display = 'flex';
        }
        
        // Cargar Swiper JS si no está cargado
        if (typeof Swiper === 'undefined') {
            const swiperScript = document.createElement('script');
            swiperScript.src = 'https://unpkg.com/swiper/swiper-bundle.min.js';
            swiperScript.onload = loadSolucionesCarousel;
            document.head.appendChild(swiperScript);
            
            const swiperStyle = document.createElement('link');
            swiperStyle.rel = 'stylesheet';
            swiperStyle.href = 'https://unpkg.com/swiper/swiper-bundle.min.css';
            document.head.appendChild(swiperStyle);
        } else {
            loadSolucionesCarousel();
        }
    });
})();