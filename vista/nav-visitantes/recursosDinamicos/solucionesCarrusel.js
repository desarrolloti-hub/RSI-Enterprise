// Carrusel_de_Soluciones.js - Carrusel autónomo para mostrar imágenes de soluciones
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
    }
    
    .section-title {
        text-align: center;

        font-size: 2.5rem;
        font-weight: 700;
        margin-bottom: 1rem;
        text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
    }
    
    .section-subtitle {
        text-align: center;
        font-size: 1.2rem;
        margin-bottom: 3rem;
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
        background: rgba(255,255,255,0.1);
        backdrop-filter: blur(10px);
        border-radius: 10px;
    }
    
    .soluciones-loading .spinner-border {
        color: white !important;
    }
    
    .soluciones-error {
        color: #ff6b6b;
        display: none;
    }
    
    #solucionesCarousel {
        display: none;
        width: 100%;
        padding: 20px 0;
    }
    
    .swiper-slide {
        background: white;
        border-radius: 15px;
        overflow: hidden;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        width: 350px;
        height: 450px;
    }
    
    .swiper-slide:hover {
        transform: translateY(-15px) scale(1.02);
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
    }
    
    .swiper-slide img {
        width: 100%;
        height: 250px;
        object-fit: cover;
        display: block;
        transition: transform 0.5s ease;
    }
    
    .swiper-slide:hover img {
        transform: scale(1.1);
    }
    
    .swiper-slide-content {
        text-align: center;
        background: white;
        position: relative;
    }
    
    .swiper-slide h3 {
        color: #333;
        margin-bottom: 12px;
        font-size: 1.4rem;
        font-weight: 600;
        position: relative;
        padding-bottom: 10px;
    }
    
    .swiper-slide h3::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 50%;
        transform: translateX(-50%);
        width: 50px;
        height: 3px;
        background: linear-gradient(90deg, #667eea, #764ba2);
        border-radius: 2px;
    }
    
    .swiper-slide p {
        color: #666;
        font-size: 1rem;
        line-height: 1.6;
        margin: 0;
    }
    
    .swiper-button-prev,
    .swiper-button-next {
        background: white;
        width: 50px;
        height: 50px;
        border-radius: 50%;
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
        color: #667eea;
        transition: all 0.3s ease;
    }
    
    .swiper-button-prev:hover,
    .swiper-button-next:hover {
        background: linear-gradient(135deg, #667eea, #764ba2);
        color: white;
        transform: scale(1.1);
    }
    
    .swiper-button-prev::after,
    .swiper-button-next::after {
        font-size: 1.4rem;
        font-weight: bold;
    }
    
    .swiper-pagination-bullet {
        background: rgba(255,255,255,0.5);
        opacity: 1;
        width: 12px;
        height: 12px;
        transition: all 0.3s ease;
    }
    
    .swiper-pagination-bullet-active {
        background: white;
        transform: scale(1.3);
    }
    
    @media (max-width: 768px) {
        .soluciones-carrusel-section {
            padding: 60px 0;
        }
        
        .section-title {
            font-size: 2rem;
        }
        
        .section-subtitle {
            font-size: 1rem;
        }
        
        .swiper-slide {
            width: 300px;
            height: 400px;
        }
        
        .swiper-slide img {
            height: 200px;
        }
        
        .swiper-slide h3 {
            font-size: 1.2rem;
        }
        
        .swiper-slide p {
            font-size: 0.9rem;
        }
    }
    
    @media (max-width: 576px) {
        .soluciones-carrusel-section {
            padding: 40px 0;
        }
        
        .section-title {
            font-size: 1.8rem;
        }
        
        .swiper-slide {
            width: 280px;
            height: 380px;
        }
        
        .swiper-button-prev,
        .swiper-button-next {
            width: 40px;
            height: 40px;
        }
        
        .swiper-button-prev::after,
        .swiper-button-next::after {
            font-size: 1.2rem;
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
        const storage = firebase.storage();
        
        async function loadSolucionesCarousel() {
            const loadingElement = document.getElementById('solucionesLoading');
            const errorElement = document.getElementById('solucionesError');
            const container = document.getElementById('solucionesCarousel');
            const wrapper = document.getElementById('solucionesWrapper');
            
            try {
                console.log('Buscando Carrusel_de_Soluciones...');
                
                // Buscar por ID específico
                let carouselDoc = await db.collection("carruseles").doc("Carrusel_de_Soluciones").get();
                
                // Si no existe por ID, buscar por título
                if (!carouselDoc.exists) {
                    console.log('Buscando por título...');
                    const querySnapshot = await db.collection("carruseles")
                        .where("titulo", "==", "Carrusel_de_Soluciones")
                        .get();
                    
                    if (!querySnapshot.empty) {
                        carouselDoc = querySnapshot.docs[0];
                        console.log('Carrusel encontrado por título');
                    } else {
                        throw new Error("No se encontró el carrusel 'Carrusel_de_Soluciones'");
                    }
                } else {
                    console.log('Carrusel encontrado por ID');
                }
                
                const carouselData = carouselDoc.data();
                
                if (carouselData.imagenes && carouselData.imagenes.length > 0) {
                    wrapper.innerHTML = '';
                    
                    // Crear slides para cada imagen
                    for (const imgData of carouselData.imagenes) {
                        const slide = document.createElement('div');
                        slide.className = 'swiper-slide';
                        
                        const img = document.createElement('img');
                        
                        // Manejar diferentes formatos de imagen
                        try {
                            if (imgData.url) {
                                img.src = imgData.url;
                            } else if (imgData.path) {
                                // Obtener URL de Storage
                                const storageRef = storage.ref().child(imgData.path);
                                img.src = await storageRef.getDownloadURL();
                            } else if (imgData.base64) {
                                img.src = `data:${imgData.type || 'image/jpeg'};base64,${imgData.base64}`;
                            } else {
                                throw new Error('Formato de imagen no soportado');
                            }
                        } catch (error) {
                            console.error('Error al cargar imagen:', error);
                            img.src = 'https://rsienterprise.com/vista/css/img/Logo-RSI-OFICIAL.png';
                        }
                        
                        img.alt = imgData.titulo || "Imagen de solución";
                        img.loading = 'lazy';
                        
                        const content = document.createElement('div');
                        content.className = 'swiper-slide-content';
                        
                        if (imgData.titulo) {
                            const title = document.createElement('h3');
                            title.textContent = imgData.titulo;
                            content.appendChild(title);
                        }
                        
                        if (imgData.descripcion) {
                            const desc = document.createElement('p');
                            desc.textContent = imgData.descripcion;
                            content.appendChild(desc);
                        }
                        
                        slide.appendChild(img);
                        slide.appendChild(content);
                        wrapper.appendChild(slide);
                    }
                    
                    // Inicializar Swiper después de un pequeño delay
                    setTimeout(() => initSwiper(container), 100);
                    
                } else {
                    showError(errorElement, "El carrusel no contiene imágenes");
                }
            } catch (error) {
                console.error("Error al cargar el carrusel:", error);
                showError(errorElement, "Error al cargar el carrusel: " + error.message);
            } finally {
                loadingElement.style.display = 'none';
            }
        }
        
        function initSwiper(container) {
            if (typeof Swiper === 'undefined') {
                console.error('Swiper no está disponible');
                return;
            }
            
            container.style.display = 'block';
            
            new Swiper(container, {
                effect: 'coverflow',
                grabCursor: true,
                centeredSlides: true,
                slidesPerView: 'auto',
                autoplay: {
                    delay: 3000,
                    disableOnInteraction: false,
                    pauseOnMouseEnter: true,
                },
                loop: true,
                speed: 800,
                pagination: {
                    el: '.swiper-pagination',
                    clickable: true,
                    dynamicBullets: true,
                },
                navigation: {
                    nextEl: '.swiper-button-next',
                    prevEl: '.swiper-button-prev',
                },
                coverflowEffect: {
                    rotate: 20,
                    stretch: 0,
                    depth: 200,
                    modifier: 1,
                    slideShadows: true,
                },
                breakpoints: {
                    640: {
                        slidesPerView: 2,
                        spaceBetween: 20,
                    },
                    768: {
                        slidesPerView: 3,
                        spaceBetween: 30,
                    },
                    1024: {
                        slidesPerView: 3,
                        spaceBetween: 40,
                    },
                },
                on: {
                    init: function() {
                        console.log('Swiper inicializado correctamente');
                    },
                }
            });
        }
        
        function showError(element, message) {
            element.textContent = message;
            element.style.display = 'flex';
        }
        
        // Cargar Swiper JS si no está cargado
        if (typeof Swiper === 'undefined') {
            console.log('Cargando Swiper...');
            
            // Cargar CSS de Swiper
            const swiperStyle = document.createElement('link');
            swiperStyle.rel = 'stylesheet';
            swiperStyle.href = 'https://cdn.jsdelivr.net/npm/swiper@8/swiper-bundle.min.css';
            document.head.appendChild(swiperStyle);
            
            // Cargar JS de Swiper
            const swiperScript = document.createElement('script');
            swiperScript.src = 'https://cdn.jsdelivr.net/npm/swiper@8/swiper-bundle.min.js';
            swiperScript.onload = function() {
                console.log('Swiper cargado correctamente');
                loadSolucionesCarousel();
            };
            swiperScript.onerror = function() {
                console.error('Error al cargar Swiper');
                document.getElementById('solucionesError').textContent = 'Error al cargar el carrusel';
                document.getElementById('solucionesError').style.display = 'flex';
                document.getElementById('solucionesLoading').style.display = 'none';
            };
            document.head.appendChild(swiperScript);
        } else {
            loadSolucionesCarousel();
        }
    });
})();