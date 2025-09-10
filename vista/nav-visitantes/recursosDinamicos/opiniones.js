// opiniones.js - Componente de opiniones autónomo
(function() {
    // Verificar dependencias
    if (typeof firebase === 'undefined') {
        console.error('Firebase no está cargado. Asegúrate de incluir Firebase antes de este script.');
        return;
    }
    
    if (typeof Swal === 'undefined') {
        console.error('SweetAlert2 no está cargado. Asegúrate de incluir SweetAlert2 antes de este script.');
        return;
    }

    // Inyectar el HTML de la sección de opiniones
    const opinionesHTML = /*html*/ `
    <section class="opiniones-section">
        <h2 class="section-title">Opiniones</h2>
        <div class="rating-average">Calificación promedio: <span id="averageRating">0.0</span> ★</div>
        
        <div class="opiniones-container">
            <div class="opiniones-carousel" id="opinionesCarousel">
                <div class="loading">
                    <i class="fas fa-spinner fa-spin"></i><br>
                    Cargando opiniones...
                </div>
            </div>
            <button class="carousel-control prev"><i class="fas fa-chevron-left"></i></button>
            <button class="carousel-control next"><i class="fas fa-chevron-right"></i></button>
        </div>
        
        <div class="carousel-indicators" id="carouselIndicators"></div>
        
        <div style="text-align: center; margin-top: 20px;">
            <button id="comOpenForm" class="comBoton">Escribir Opinión</button>
        </div>
    </section>
    `;

    // Insertar la sección de opiniones en el DOM
    document.body.insertAdjacentHTML('beforeend', opinionesHTML);

    // Variables globales
    let opiniones = [];
    let currentIndex = 1; // Empieza en 1 por los clones
    let cardWidth = 0;
    let autoScrollInterval;
    let totalRating = 0;
    let ratingCount = 0;
    const palabrasProhibidas = [
        'puta', 'pinche', 'cabron', 'chingada', 'pendejo', 'naco', 
        'güey', 'puto', 'culero', 'joto', 'pendejada', 'verga',
        'madre', 'vrg', 'chinga', 'wey', 'mierda', 'chingón', 'chinga',
        'marico', 'chúpala', 'paja', 'gafo', 'mamagüevo', 'pichurria',
        'arrecho', 'chamo', 'coño', 'malandro', 'pendejada', 'verga',
        'culillo', 'baboso', 'teta', 'pata',
        'hijueputa', 'gonorrea', 'malparido', 'sapo', 'crica', 'chimba',
        'pirobo', 'lámpara', 'guiso', 'mamera', 'güevón', 'maricada',
        'ñero', 'basuco', 'paraco', 'traga',
        'idiota', 'estúpido', 'imbécil', 'carajo', 'joder', 'culiao',
        'chingar', 'cojones', 'polla', 'concha', 'tetas', 'follar',
        'capullo', 'panocha', 'zorra', 'prostituta', 'cabron', 'put@',
        'put0', 'pvt4', 'm4r1c0n', 'hdp', 'vergas', 'pendej@'
    ].map(word => word.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'));

    // Inicializar Firebase
    const firebaseConfig = {
        apiKey: "AIzaSyBJy992gkvsT77-_fMp_O_z99wtjZiK77Y",
        authDomain: "rsienterprise.firebaseapp.com",
        projectId: "rsienterprise",
        storageBucket: "rsienterprise.appspot.com",
        messagingSenderId: "1063117165770",
        appId: "1:1063117165770:web:8555f26b25ae80bc42d033"
    };
    
    // Inicializar solo si no está ya inicializado
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    const db = firebase.firestore();

    // Función para crear una tarjeta de opinión
    function crearTarjeta(container, opinion, index) {
        const card = document.createElement('div');
        card.className = 'opinion-card';
        card.setAttribute('data-index', index);
        
        const starsHTML = Array(5).fill('')
            .map((_, i) => 
                `<i class="fas ${i < opinion.calificacion ? 'fa-star' : 'fa-star-o'}"></i>`
            ).join('');
        
        card.innerHTML = `
            <div class="opinion-stars">
                ${starsHTML}
            </div>
            <div class="opinion-content">
                <div class="opinion-text">"${opinion.comentario}"</div>
                <button class="read-more" data-id="${opinion.id}">
                    Ver más <i class="fas fa-chevron-right"></i>
                </button>
            </div>
            <div class="opinion-author">
                <i class="fas fa-user-circle"></i>
                <div class="author-info">
                    <div class="author-name">${opinion.nombre}</div>
                    <div class="opinion-date">${opinion.fecha}</div>
                </div>
            </div>
        `;
        
        container.appendChild(card);
        
        // Configurar evento para el botón "Ver más"
        card.querySelector('.read-more')?.addEventListener('click', (e) => {
            e.preventDefault();
            const opinionId = e.currentTarget.getAttribute('data-id');
            const opinion = opiniones.find(o => o.id === opinionId);
            if (opinion) {
                mostrarOpinionCompleta(opinion);
            }
        });
    }

    // Función para cargar opiniones desde Firebase
    async function cargarOpiniones() {
        try {
            const querySnapshot = await db.collection("comentarios")
                .orderBy('fecha', 'desc')
                .get();
            
            opiniones = [];
            totalRating = 0;
            ratingCount = 0;
            
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                
                if (data.calificacion && data.calificacion >= 3) {
                    let fechaFormateada = '';
                    if (data.fecha && data.fecha.toDate) {
                        fechaFormateada = data.fecha.toDate().toLocaleDateString('es-ES', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        });
                    } else if (data.fecha && data.fecha.seconds) {
                        fechaFormateada = new Date(data.fecha.seconds * 1000).toLocaleDateString('es-ES', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        });
                    }
                    
                    opiniones.push({
                        nombre: data.nombre || 'Anónimo',
                        comentario: data.comentario || '',
                        calificacion: data.calificacion || 0,
                        fecha: fechaFormateada,
                        id: doc.id
                    });
                    
                    totalRating += data.calificacion || 0;
                    ratingCount++;
                }
            });
            
            if (ratingCount > 0) {
                const promedio = (totalRating / ratingCount).toFixed(1);
                document.getElementById('averageRating').textContent = promedio;
            }
            
            if (opiniones.length > 0) {
                renderizarOpiniones();
                iniciarCarrusel();
            } else {
                document.getElementById('opinionesCarousel').innerHTML = 
                    '<div class="no-opinions">No hay opiniones disponibles</div>';
            }
        } catch (error) {
            console.error("Error cargando opiniones:", error);
            document.getElementById('opinionesCarousel').innerHTML = 
                '<div class="error">Error al cargar las opiniones</div>';
        }
    }

    // Función para renderizar opiniones en el carrusel con efecto infinito
    function renderizarOpiniones() {
        const carousel = document.getElementById('opinionesCarousel');
        carousel.innerHTML = '';
        
        // Agregar clones del final al principio para efecto infinito
        if (opiniones.length > 2) {
            crearTarjeta(carousel, opiniones[opiniones.length - 2], opiniones.length - 2);
            crearTarjeta(carousel, opiniones[opiniones.length - 1], opiniones.length - 1);
        }
        
        // Agregar tarjetas originales
        opiniones.forEach((opinion, index) => {
            crearTarjeta(carousel, opinion, index);
        });
        
        // Agregar clones del principio al final para efecto infinito
        if (opiniones.length > 0) {
            crearTarjeta(carousel, opiniones[0], 0);
            if (opiniones.length > 1) {
                crearTarjeta(carousel, opiniones[1], 1);
            }
        }
        
        // Calcular ancho de tarjeta después de renderizar
        if (carousel.children.length > 0) {
            cardWidth = carousel.children[0].offsetWidth + 20; // + gap
            carousel.style.transform = `translateX(${-cardWidth}px)`;
        }
        
        // Crear indicadores
        const indicatorsContainer = document.getElementById('carouselIndicators');
        indicatorsContainer.innerHTML = '';
        opiniones.forEach((_, index) => {
            const indicator = document.createElement('span');
            indicator.className = `indicator ${index === 0 ? 'active' : ''}`;
            indicator.setAttribute('data-index', index);
            indicator.addEventListener('click', () => {
                currentIndex = index + 1; // +1 por el clone inicial
                updateCarousel();
                resetAutoScroll();
            });
            indicatorsContainer.appendChild(indicator);
        });
    }

    // Función para mostrar opinión completa con SweetAlert2
    function mostrarOpinionCompleta(opinion) {
        const starsHTML = Array(5).fill('')
            .map((_, i) => 
                `<i class="fas ${i < opinion.calificacion ? 'fa-star' : 'fa-star-o'}" 
                  style="color: ${i < opinion.calificacion ? '#FFD700' : '#ddd'}; margin: 0 2px;"></i>`
            ).join('');
        
        Swal.fire({
            title: `Opinión de ${opinion.nombre}`,
            html: `
                <div style="text-align: center; margin-bottom: 15px;">
                    ${starsHTML}
                </div>
                <div style="font-style: italic; margin-bottom: 20px; text-align: left;">
                    "${opinion.comentario}"
                </div>
                <div style="text-align: right; font-size: 0.9em; color: #777;">
                    ${opinion.fecha}
                </div>
            `,
            confirmButtonColor: '#4e54c8',
            showCloseButton: true,
            width: '600px'
        });
    }

    // Función para mostrar formulario de opinión con SweetAlert2
    function mostrarFormularioOpinion() {
        let selectedRating = 0;
        
        Swal.fire({
            title: 'Escribe tu opinión',
            html: `
                <div class="swal2-form-container">
                    <input id="swal-name" class="swal2-input" placeholder="Nombre completo" required>
                    <textarea id="swal-comment" class="swal2-textarea" placeholder="Escribe tu comentario" required></textarea>
                    <div class="rating-container" style="margin: 15px 0; text-align: center;">
                        ${Array(5).fill().map((_, i) => 
                            `<span class="rating-star" data-rating="${i+1}" 
                              style="font-size: 2rem; cursor: pointer; margin: 0 5px;">★</span>`
                        ).join('')}
                    </div>
                </div>
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Enviar opinión',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#4e54c8',
            preConfirm: () => {
                const name = document.getElementById('swal-name').value.trim();
                const comment = document.getElementById('swal-comment').value.trim();
                
                if (!name || !comment) {
                    Swal.showValidationMessage('Por favor completa todos los campos');
                    return false;
                }
                
                if (selectedRating === 0) {
                    Swal.showValidationMessage('Por favor selecciona una calificación');
                    return false;
                }
                
                if (contieneLenguajeOfensivo(name) || contieneLenguajeOfensivo(comment)) {
                    Swal.showValidationMessage('Tu comentario contiene lenguaje inapropiado');
                    return false;
                }
                
                return { name, comment, rating: selectedRating };
            },
            willOpen: () => {
                // Configurar eventos para las estrellas de rating
                document.querySelectorAll('.rating-star').forEach(star => {
                    star.addEventListener('click', function() {
                        const rating = parseInt(this.getAttribute('data-rating'));
                        selectedRating = rating;
                        
                        // Actualizar visualización de estrellas
                        document.querySelectorAll('.rating-star').forEach((s, i) => {
                            s.style.color = i < rating ? '#FFD700' : '#ddd';
                        });
                    });
                });
            }
        }).then((result) => {
            if (result.isConfirmed) {
                enviarOpinion(result.value);
            }
        });
    }

    // Función para enviar opinión a Firebase
    async function enviarOpinion({ name, comment, rating }) {
        try {
            await db.collection("comentarios").add({
                nombre: name,
                comentario: comment,
                calificacion: rating,
                fecha: firebase.firestore.FieldValue.serverTimestamp(),
                aprobado: false
            });
            
            Swal.fire({
                icon: 'success',
                title: '¡Gracias por tu opinión!',
                text: 'Tu comentario ha sido enviado para revisión',
                confirmButtonColor: '#4e54c8'
            });
            
            // Recargar opiniones después de un breve retraso
            setTimeout(cargarOpiniones, 2000);
        } catch (error) {
            console.error("Error al enviar opinión:", error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Hubo un problema al enviar tu opinión. Por favor intenta de nuevo.',
                confirmButtonColor: '#4e54c8'
            });
        }
    }

    // Función para detectar lenguaje ofensivo
    function contieneLenguajeOfensivo(texto) {
        const regex = new RegExp(`\\b(${palabrasProhibidas.join('|')})\\b`, 'i');
        return regex.test(texto);
    }

    // Funciones del carrusel
    function iniciarCarrusel() {
        const carousel = document.getElementById('opinionesCarousel');
        const prevBtn = document.querySelector('.carousel-control.prev');
        const nextBtn = document.querySelector('.carousel-control.next');
        
        prevBtn.addEventListener('click', () => {
            currentIndex--;
            updateCarousel();
            resetAutoScroll();
        });
        
        nextBtn.addEventListener('click', () => {
            currentIndex++;
            updateCarousel();
            resetAutoScroll();
        });
        
        // Touch events para móviles
        let touchStartX = 0;
        let touchEndX = 0;
        
        carousel.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, {passive: true});
        
        carousel.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            handleSwipe();
        }, {passive: true});
        
        function handleSwipe() {
            if (touchEndX < touchStartX - 50) {
                // Swipe izquierda
                currentIndex++;
                updateCarousel();
                resetAutoScroll();
            } else if (touchEndX > touchStartX + 50) {
                // Swipe derecha
                currentIndex--;
                updateCarousel();
                resetAutoScroll();
            }
        }
        
        setupAutoScroll();
        window.addEventListener('resize', () => {
            if (carousel.children.length > 0) {
                cardWidth = carousel.children[0].offsetWidth + 20;
                updateCarousel();
            }
        });
    }

    function updateCarousel() {
        const carousel = document.getElementById('opinionesCarousel');
        const totalCards = carousel.children.length;
        
        // Manejar transición infinita
        if (currentIndex <= 0) {
            // Si llegamos al principio (clones), saltar al final (clones reales)
            currentIndex = opiniones.length;
            carousel.style.transition = 'none';
            carousel.style.transform = `translateX(${-currentIndex * cardWidth}px)`;
            setTimeout(() => {
                carousel.style.transition = 'transform 0.5s ease';
            }, 10);
        } else if (currentIndex >= totalCards - 1) {
            // Si llegamos al final (clones), saltar al principio (clones reales)
            currentIndex = 1;
            carousel.style.transition = 'none';
            carousel.style.transform = `translateX(${-currentIndex * cardWidth}px)`;
            setTimeout(() => {
                carousel.style.transition = 'transform 0.5s ease';
            }, 10);
        } else {
            carousel.style.transform = `translateX(${-currentIndex * cardWidth}px)`;
        }
        
        // Actualizar indicadores
        let displayIndex = currentIndex - 1;
        if (displayIndex < 0) displayIndex = opiniones.length - 1;
        if (displayIndex >= opiniones.length) displayIndex = 0;
        
        document.querySelectorAll('.indicator').forEach(ind => {
            ind.classList.remove('active');
        });
        const activeIndicator = document.querySelector(`.indicator[data-index="${displayIndex}"]`);
        if (activeIndicator) {
            activeIndicator.classList.add('active');
        }
    }

    function setupAutoScroll() {
        autoScrollInterval = setInterval(() => {
            currentIndex++;
            updateCarousel();
        }, 5000);
    }

    function resetAutoScroll() {
        clearInterval(autoScrollInterval);
        setupAutoScroll();
    }

    // Estilos CSS para la sección de opiniones
    const style = document.createElement('style');
    style.textContent = `
    .opiniones-section {
        padding: 80px 0;
        background-color: #f8f9fa;
        text-align: center;
    }
    
    .rating-average {
        font-size: 1.2rem;
        margin-bottom: 30px;
        color: #1c1948;
        font-weight: 600;
    }
    
    .opiniones-container {
        position: relative;
        max-width: 1200px;
        margin: 0 auto;
        padding: 0 50px;
        overflow: hidden;
    }
    
    .opiniones-carousel {
        display: flex;
        gap: 20px;
        transition: transform 0.5s ease;
    }
    
    .opinion-card {
        flex: 0 0 300px;
        background: white;
        border-radius: 12px;
        padding: 20px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        transition: all 0.3s ease;
        border: 1px solid #e0e0e0;
        height: 300px;
        display: flex;
        flex-direction: column;
    }
    
    .opinion-stars {
        color: #ffc107;
        font-size: 1rem;
        margin-bottom: 15px;
    }
    
    .opinion-content {
        flex-grow: 1;
        margin-bottom: 15px;
        position: relative;
        overflow: hidden;
    }
    
    .opinion-text {
        font-style: italic;
        color: #777;
        line-height: 1.6;
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    
    .read-more {
        background: none;
        border: none;
        color: #4e54c8;
        font-weight: 500;
        padding: 5px 0;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-top: 10px;
    }
    
    .read-more i {
        margin-left: 5px;
        transition: transform 0.3s ease;
    }
    
    .opinion-author {
        display: flex;
        align-items: center;
        margin-top: auto;
    }
    
    .opinion-author i {
        font-size: 1.5rem;
        color: #777;
        margin-right: 10px;
    }
    
    .author-info {
        text-align: left;
    }
    
    .author-name {
        font-weight: 600;
        color: #1c1948;
    }
    
    .opinion-date {
        font-size: 0.8rem;
        color: #777;
    }
    
    .carousel-indicators {
        display: flex;
        justify-content: center;
        gap: 10px;
        margin-top: 20px;
    }
    
    .indicator {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background-color: #e0e0e0;
        cursor: pointer;
        transition: all 0.3s ease;
    }
    
    .indicator.active {
        background-color: #4e54c8;
        transform: scale(1.2);
    }
    
    .carousel-control {
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        background: white;
        border: none;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        z-index: 10;
        transition: all 0.3s ease;
    }
    
    .carousel-control:hover {
        background: #4e54c8;
        color: white;
    }
    
    .carousel-control.prev {
        left: 0;
    }
    
    .carousel-control.next {
        right: 0;
    }
    
    .comBoton {
        background-color: #1c1948;
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 6px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 1px;
        cursor: pointer;
        transition: all 0.3s ease;
    }
    
    .comBoton:hover {
        background-color: #4e54c8;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(28, 25, 72, 0.2);
    }
    
    /* Responsive */
    @media (max-width: 768px) {
        .opiniones-container {
            padding: 0 30px;
        }
        
        .opinion-card {
            flex: 0 0 260px;
            height: 280px;
            padding: 15px;
        }
    }
    
    @media (max-width: 480px) {
        .opiniones-container {
            padding: 0 15px;
        }
        
        .opinion-card {
            flex: 0 0 220px;
            height: 260px;
        }
        
        .carousel-control {
            width: 30px;
            height: 30px;
            font-size: 0.8rem;
        }
    }
    `;
    document.head.appendChild(style);

    // Inicializar el componente
    document.addEventListener('DOMContentLoaded', function() {
        // Cargar opiniones iniciales
        cargarOpiniones();
        
        // Configurar evento para el botón de escribir opinión
        document.getElementById('comOpenForm')?.addEventListener('click', mostrarFormularioOpinion);
    });
})();