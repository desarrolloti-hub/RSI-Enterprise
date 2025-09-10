// ofertas-carrusel.js - Componente autónomo para el carrusel de ofertas
(function() {
    // Crear elemento <link> para los estilos
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
    document.head.appendChild(link);

    // Inyectar el HTML del carrusel
    const carruselHTML = /*html*/ `
    <section class="rsi-ofertas-section">
        <div class="rsi-ofertas-container">
            <div class="rsi-section-header">
                <h2 class="rsi-section-title">Ofertas Especiales</h2>
                <p class="rsi-section-subtitle">Productos con descuentos exclusivos</p>
            </div>
            
            <div class="rsi-carousel-container">
                <button class="rsi-carousel-nav prev">
                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M15 18l-6-6 6-6"/>
                    </svg>
                </button>
                
                <div id="rsi-discounted-products" class="rsi-carousel">
                    <!-- Productos se insertarán aquí dinámicamente -->
                    <div class="rsi-loading">
                        <div class="rsi-spinner"></div>
                        <p>Cargando ofertas...</p>
                    </div>
                </div>
                
                <button class="rsi-carousel-nav next">
                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M9 18l6-6-6-6"/>
                    </svg>
                </button>
            </div>
        </div>
    </section>
    `;

    // Insertar el carrusel en el DOM
    document.body.insertAdjacentHTML('beforeend', carruselHTML);

    // Estilos dinámicos para el carrusel
    const style = document.createElement('style');
    style.textContent =/* css*/ `
    .rsi-ofertas-section {
        padding: 60px 0;
        background-color: #fff;
    }
    
    .rsi-ofertas-container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 0 20px;
    }
    
    .rsi-section-header {
        text-align: left;
        margin-bottom: 40px;
    }
    
    .rsi-section-title {
        font-size: 2rem;
        margin-bottom: 15px;
        font-family: var(--heading-font);
        text-align: left;
        font-weight: 600;
    }
    
    .rsi-section-subtitle {
        font-size: 1.1rem;
        max-width: 700px;
        margin: 0 ;
        text-align: left;
    }
    
    .rsi-carousel-container {
        position: relative;
        margin-top: 30px;
    }
    
    .rsi-carousel {
        display: flex;
        gap: 20px;
        overflow-x: auto;
        scroll-snap-type: x mandatory;
        padding: 20px 10px;
        scrollbar-width: none;
        -ms-overflow-style: none;
    }
    
    .rsi-carousel::-webkit-scrollbar {
        display: none;
    }
    
    .rsi-product-card {
        scroll-snap-align: start;
        flex: 0 0 300px;
        background: #fff;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.08);
        transition: all 0.3s ease;
        border: 1px solid #f0f0f0;
        height: 400px; /* Altura ajustada */
        position: relative;
        display: flex;
        flex-direction: column;
    }
    
    .rsi-product-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.12);
    }
    
    .rsi-product-image-container {
        position: relative;
        width: 100%;
        height: 220px; /* Imagen más grande */
        overflow: hidden;
        background: #f9f9f9;
    }
    
    .rsi-product-image {
        width: 100%;
        height: 100%;
        object-fit: contain;
        transition: transform 0.3s ease;
        padding: 10px;
    }
    
    .rsi-product-card {
        text-decoration: none !important;
        color: inherit !important;
    }
    
    .rsi-product-card:hover {
        text-decoration: none !important;
    }
    
    .rsi-product-card:visited {
        color: inherit !important;
    }
    
    .rsi-product-card:focus {
        outline: none !important;
        text-decoration: none !important;
    }
    
    .rsi-product-card * {
        text-decoration: none !important;
    }
    .rsi-product-card:hover .rsi-product-image {
        transform: scale(1.05);
    }
    
    .rsi-discount-badge {
        position: absolute;
        top: 10px;
        right: 10px;
        background: linear-gradient(135deg, #ff4444, #ff6b6b);
        color: white;
        padding: 5px 10px;
        border-radius: 20px;
        font-size: 0.9rem;
        font-weight: bold;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
        z-index: 1;
    }
    
    .rsi-product-info {
        padding: 15px;
        flex-grow: 1;
        display: flex;
        flex-direction: column;
    }
    
    .rsi-product-name {
        font-size: 1rem;
        font-weight: 600;
        margin-bottom: 12px;
        color: #333;
        display: -webkit-box;
        -webkit-line-clamp: 4; /* Más líneas para el nombre */
        -webkit-box-orient: vertical;
        overflow: hidden;
        text-overflow: ellipsis;
        min-height: 5em; /* Más espacio para el nombre */
        line-height: 1.3;
    }
    
    .rsi-price-container {
        margin-top: auto;
    }
    
    .rsi-current-price {
        font-size: 1.2rem;
        font-weight: 700;
        color: #1c1948;
    }
    
    .rsi-original-price {
        font-size: 0.9rem;
        text-decoration: line-through;
        color: #999;
        margin-left: 8px;
    }
    
    .rsi-view-details-btn {
        display: block;
        width: 100%;
        padding: 10px;
        background-color: #1c1948;
        color: white;
        border: none;
        border-radius: 6px;
        font-weight: 600;
        text-align: center;
        margin-top: 15px;
        cursor: pointer;
        transition: all 0.3s ease;
    }
    
    .rsi-view-details-btn:hover {
        background-color: #2a2670;
        transform: translateY(-2px);
    }
    
    .rsi-carousel-nav {
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        background: white;
        border: none;
        width: 45px;
        height: 45px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        z-index: 10;
        transition: all 0.3s ease;
    }
    
    .rsi-carousel-nav:hover {
        background: #1c1948;
        color: white;
    }
    
    .rsi-carousel-nav.prev {
        left: -20px;
    }
    
    .rsi-carousel-nav.next {
        right: -20px;
    }
    
    .rsi-loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        width: 100%;
        padding: 40px 0;
    }
    
    .rsi-spinner {
        width: 40px;
        height: 40px;
        border: 4px solid rgba(28, 25, 72, 0.1);
        border-radius: 50%;
        border-top-color: #1c1948;
        animation: spin 1s ease-in-out infinite;
        margin-bottom: 15px;
    }
    
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
    
    .rsi-error {
        text-align: left;
        padding: 20px;
        color: #ff4444;
    }
    
    .rsi-error i {
        font-size: 2rem;
        margin-bottom: 10px;
    }
    
    /* Responsive styles */
    @media (max-width: 992px) {
        .rsi-product-card {
            flex: 0 0 280px;
            height: 380px;
        }
        
        .rsi-product-image-container {
            height: 200px;
        }
    }
    
    @media (max-width: 768px) {
        .rsi-section-title {
            font-size: 1.8rem;
        }
        
        .rsi-product-card {
            flex: 0 0 260px;
            height: 360px;
        }
        
        .rsi-carousel-nav {
            width: 40px;
            height: 40px;
        }
        
        .rsi-carousel-nav.prev {
            left: -15px;
        }
        
        .rsi-carousel-nav.next {
            right: -15px;
        }
    }
    
    @media (max-width: 576px) {
        .rsi-ofertas-section {
            padding: 40px 0;
        }
        
        .rsi-section-title {
            font-size: 1.6rem;
        }
        
        .rsi-product-card {
            flex: 0 0 240px;
            height: 340px;
        }
        
        .rsi-product-image-container {
            height: 180px;
        }
        
        .rsi-product-info {
            padding: 12px;
        }
    }
    `;
    document.head.appendChild(style);

    // Inicializar Firebase
    const firebaseConfig = {
        apiKey: "AIzaSyBJy992gkvsT77-_fMp_O_z99wtjZiK77Y",
        authDomain: "rsienterprise.firebaseapp.com",
        projectId: "rsienterprise",
        storageBucket: "rsienterprise.appspot.com",
        messagingSenderId: "1063117165770",
        appId: "1:1063117165770:web:8555f26b25ae80bc42d033"
    };
    
    // Verificar si Firebase ya está inicializado
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    const db = firebase.firestore();

    // Variables del carrusel
    let isHovering = false;
    let autoScrollInterval;
    const defaultImage = 'https://rsienterprise.com/vista/css/img/Logo-RSI-OFICIAL.png';

    // Funcionalidad del carrusel
    document.addEventListener('DOMContentLoaded', function() {
        // Cargar productos con descuento
        fetchDiscountedProducts();
    });

    // Obtener productos con descuento de Firebase
    async function fetchDiscountedProducts() {
        const productsContainer = document.getElementById('rsi-discounted-products');
        
        try {
            const q = db.collection('indexproductos').where('descuento', '>', 0);
            const querySnapshot = await q.get();
            
            if (querySnapshot.empty) {
                showError("No hay productos con descuento disponibles");
                return;
            }
            
            const discountedProducts = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            renderDiscountedProducts(discountedProducts);
            setupCarouselNavigation();
            setupAutoScroll();
        } catch (error) {
            console.error('Error al cargar productos:', error);
            showError("Error al cargar los productos. Por favor, intenta de nuevo más tarde.");
        }
    }

    // Mostrar productos en el carrusel
    function renderDiscountedProducts(products) {
        const productsContainer = document.getElementById('rsi-discounted-products');
        productsContainer.innerHTML = '';
        
        products.forEach(product => {
            const productCard = createProductCard(product);
            productsContainer.appendChild(productCard);
        });
    }

    // Crear tarjeta de producto (sin descripción)
    function createProductCard(product) {
        const productImage = product.imagenes && product.imagenes.length > 0 
            ? product.imagenes[0] 
            : defaultImage;
        
        const hasDiscount = product.descuento && product.descuento > 0;
        const currentPrice = hasDiscount 
            ? product.precio * (1 - product.descuento / 100)
            : product.precio || 0;
        
        const card = document.createElement('a');
        card.className = 'rsi-product-card';
        card.href = `../detalleProducto/detalleProducto.html?id=${product.id}`;
        
        card.innerHTML = `
            <div class="rsi-product-image-container">
                <img 
                    src="${productImage}" 
                    alt="${product.nombre || 'Producto'}" 
                    class="rsi-product-image"
                    onerror="this.src='${defaultImage}'"
                />
                
                ${hasDiscount ? `
                    <div class="rsi-discount-badge">
                        ${product.descuento}% OFF
                    </div>
                ` : ''}
            </div>
            
            <div class="rsi-product-info">
                <h3 class="rsi-product-name">${product.nombre || 'Producto sin nombre'}</h3>
                
                <div class="rsi-price-container">
                    <span class="rsi-current-price">
                        $${currentPrice.toLocaleString('es-MX', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                    </span>
                    
                    ${hasDiscount ? `
                        <span class="rsi-original-price">
                            $${product.precio.toLocaleString('es-MX', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                        </span>
                    ` : ''}
                </div>
                
                <button class="rsi-view-details-btn">
                    Ver detalles
                </button>
            </div>
        `;
        
        return card;
    }

    // Mostrar mensaje de error
    function showError(message) {
        const productsContainer = document.getElementById('rsi-discounted-products');
        productsContainer.innerHTML = `
            <div class="rsi-error">
                <i class="fas fa-exclamation-triangle"></i>
                <p>${message}</p>
            </div>
        `;
    }

    // Configurar navegación del carrusel
    function setupCarouselNavigation() {
        const carousel = document.querySelector('.rsi-carousel');
        const prevBtn = document.querySelector('.rsi-carousel-nav.prev');
        const nextBtn = document.querySelector('.rsi-carousel-nav.next');
        
        if (carousel && prevBtn && nextBtn) {
            prevBtn.addEventListener('click', () => {
                carousel.scrollBy({
                    left: -300,
                    behavior: 'smooth'
                });
                resetAutoScroll();
            });
            
            nextBtn.addEventListener('click', () => {
                carousel.scrollBy({
                    left: 300,
                    behavior: 'smooth'
                });
                resetAutoScroll();
            });
            
            carousel.addEventListener('mouseenter', () => {
                isHovering = true;
            });
            
            carousel.addEventListener('mouseleave', () => {
                isHovering = false;
            });
        }
    }

    // Configurar auto-scroll
    function setupAutoScroll() {
        const carousel = document.querySelector('.rsi-carousel');
        const scrollAmount = 300;
        const scrollDelay = 4000;
        
        autoScrollInterval = setInterval(() => {
            if (!isHovering && carousel) {
                const maxScroll = carousel.scrollWidth - carousel.clientWidth;
                
                if (carousel.scrollLeft + carousel.clientWidth >= carousel.scrollWidth - 10) {
                    carousel.scrollTo({
                        left: 0,
                        behavior: 'smooth'
                    });
                } else {
                    carousel.scrollBy({
                        left: scrollAmount,
                        behavior: 'smooth'
                    });
                }
            }
        }, scrollDelay);
    }

    // Reiniciar auto-scroll
    function resetAutoScroll() {
        clearInterval(autoScrollInterval);
        setupAutoScroll();
    }
})();