document.addEventListener("DOMContentLoaded", function () {
    const hamburger = document.querySelector(".nan_hamburger");
    const closeBtn = document.querySelector(".nan_close");
    const menu = document.querySelector(".nan_menu");

    // Abrir menú
    hamburger.addEventListener("click", () => {
        menu.classList.add("nan_active");
        closeBtn.style.display = "block"; // Mostrar la "X"
        hamburger.style.display = "none"; // Ocultar hamburguesa
    });

    // Cerrar menú
    closeBtn.addEventListener("click", () => {
        menu.classList.remove("nan_active");
        closeBtn.style.display = "none"; // Ocultar la "X"
        hamburger.style.display = "block"; // Mostrar hamburguesa
    });

    // Cambiar la bandera cuando se selecciona otro idioma
    const languageSelect = document.getElementById("languageSelect");
    languageSelect.addEventListener("change", function () {
        let selectedOption = this.options[this.selectedIndex];
        let flag = selectedOption.getAttribute("data-flag");
        this.style.backgroundImage = "url('" + flag + "')";
    });
});
