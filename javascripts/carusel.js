/* inicio carrucel */
function initCarousel() {
    let currentSlide = 0;

    function showSlide(index) {
        const slides = document.querySelectorAll('.carousel-item');
        const totalSlides = slides.length;

        slides.forEach(slide => slide.classList.remove('active'));
        currentSlide = (index + totalSlides) % totalSlides;
        slides[currentSlide].classList.add('active');

        const inner = document.querySelector('.carousel-inner');
        inner.style.transform = `translateX(-${currentSlide * 100}%)`;
    }

    function nextSlide() {
        showSlide(currentSlide + 1);
    }

    function prevSlide() {
        showSlide(currentSlide - 1);
    }

    // Inicializar el carrusel
    showSlide(currentSlide);

    // Cambiar slide automáticamente cada 5 segundos
    setInterval(nextSlide, 5000);

    // Opcional: Retorna las funciones de navegación si necesitas usarlas fuera de la función initCarousel
    return { nextSlide, prevSlide };
}

// Llamar a la función para iniciar el carrusel
const carouselControls = initCarousel();
/* Fin carrucel */

/*-----------------------Inicio ver contraseña en formularios----------------------------------*/
/*-----------------------Fin ver contraseña en formularios----------------------------------*/