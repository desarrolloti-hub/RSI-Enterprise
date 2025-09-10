document.addEventListener("DOMContentLoaded", function () {
    // Menú de hamburguesa
    const nanHamburger = document.querySelector('.nan_hamburger');
    const nanClose = document.querySelector('.nan_close');
    const nanMenu = document.querySelector('.nan_menu');

    // Abrir menú
    nanHamburger.addEventListener('click', (event) => {
        event.stopPropagation();
        nanMenu.classList.add('nan_active');
        nanHamburger.style.display = 'none';
        nanClose.style.display = 'block';
        nanHamburger.setAttribute('aria-expanded', 'true');
    });

    // Cerrar menú
    nanClose.addEventListener('click', (event) => {
        event.stopPropagation();
        nanMenu.classList.remove('nan_active');
        nanClose.style.display = 'none';
        nanHamburger.style.display = 'block';
        nanHamburger.setAttribute('aria-expanded', 'false');
    });

    // Cerrar menú al hacer clic fuera de él, pero sin afectar otros clics en la página
    document.addEventListener('click', (event) => {
        if (!nanMenu.contains(event.target) && 
            !nanHamburger.contains(event.target) && 
            !nanClose.contains(event.target) &&
            nanMenu.classList.contains('nan_active')) { // Solo cierra si está activo
            nanMenu.classList.remove('nan_active');
            nanClose.style.display = 'none';
            nanHamburger.style.display = 'block';
            nanHamburger.setAttribute('aria-expanded', 'false');
        }
    });

    // Evitar que clics dentro del menú lo cierren
    nanMenu.addEventListener('click', (event) => {
        event.stopPropagation();
    });

    // Conversión de moneda (Ejemplo)
    document.getElementById("currencySelect").addEventListener("change", function () {
        alert(this.value === "usd" ? "1 USD = 20 MXN" : "1 MXN = 0.05 USD");
    });

    // Cambio de idioma (Ejemplo)
    document.getElementById("languageSelect").addEventListener("change", function () {
        alert(this.value === "es" ? "Idioma seleccionado: Español" : "Idioma seleccionado: Inglés");
    });
});
