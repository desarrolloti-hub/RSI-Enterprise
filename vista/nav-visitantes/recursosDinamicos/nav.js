// nav.js - Componente de navegación autónomo
(function() {
    // Inyectar el HTML del navbar (el mismo que antes)
    const navHTML = /*html*/ `
    <header class="nan_header">
        <nav class="nan_navbar">
            <div class="nan_logo">
                <a href="/">
                    <img src="https://rsienterprise.com/vista/css/img/Logo-RSI-OFICIAL.png" alt="RSI Enterprise Logo">
                </a>
            </div>

            <!-- Menú Hamburguesa -->
            <button class="nan_hamburger" aria-label="Abrir menú">&#9776;</button>
            <button class="nan_close" aria-label="Cerrar menú">&times;</button>
    
            <ul class="nan_menu">
                <li><a href="/"><i class="fas fa-home"></i> Inicio</a></li>
                <li><a href="/vista/nav-visitantes/productos/productos.html"><i class="fas fa-box"></i> Productos</a></li>
                <li><a href="/vista/nav-visitantes/servicios/servicios.html"><i class="fas fa-tools"></i> Servicios</a></li>
                <li><a href="/vista/nav-visitantes/nosotros/nosotros.html"><i class="fas fa-users"></i> ¿Quiénes somos?</a></li>
                <li><a href="/vista/nav-visitantes/contacto/contacto.html"><i class="fas fa-envelope"></i> Contáctanos</a></li>
                <li><a href="/vista/nav-visitantes/blogs/blogs.html"><i class="fas fa-pencil"></i> Blogs</a></li>
                <li><a href="/vista/nav-visitantes/inicio-de-sesion/inicio-de-sesion.html"><i class="fas fa-sign-in-alt"></i> Iniciar sesión</a></li>
            </ul>
        </nav>
    </header>
    `;

    // Insertar el navbar al inicio del body
    document.body.insertAdjacentHTML('afterbegin', navHTML);

    // Funcionalidad del navbar (el mismo que antes)
    document.addEventListener('DOMContentLoaded', function() {
        const hamburger = document.querySelector('.nan_hamburger');
        const closeBtn = document.querySelector('.nan_close');
        const menu = document.querySelector('.nan_menu');
        const languageSelect = document.getElementById('languageSelect');

        hamburger.addEventListener('click', function() {
            menu.classList.add('active');
            hamburger.style.display = 'none';
            closeBtn.style.display = 'block';
        });

        closeBtn.addEventListener('click', function() {
            menu.classList.remove('active');
            closeBtn.style.display = 'none';
            hamburger.style.display = 'block';
        });

        if (languageSelect) {
            languageSelect.addEventListener('change', function() {
                console.log('Idioma seleccionado:', this.value);
            });
        }

        const navLinks = document.querySelectorAll('.nan_menu a');
        navLinks.forEach(link => {
            link.addEventListener('click', function() {
                if (window.innerWidth <= 992) {
                    menu.classList.remove('active');
                    closeBtn.style.display = 'none';
                    hamburger.style.display = 'block';
                }
            });
        });

        window.addEventListener('resize', function() {
            if (window.innerWidth > 992) {
                menu.classList.remove('active');
                closeBtn.style.display = 'none';
                hamburger.style.display = 'none';
            } else {
                if (!menu.classList.contains('active')) {
                    hamburger.style.display = 'block';
                }
            }
        });

        if (window.innerWidth > 992) {
            closeBtn.style.display = 'none';
            hamburger.style.display = 'none';
        } else {
            closeBtn.style.display = 'none';
        }
    });

    // Estilos dinámicos actualizados (solo los cambios necesarios)
    const style = document.createElement('style');
    style.textContent = /* css */ `
    .nan_header {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        z-index: 1000;
        background-color: white;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        transition: all 0.3s ease;
    }

    .nan_navbar {
        display: flex;
        justify-content: center; /* Centrado del contenido */
        align-items: center;
        padding: 0.8rem 1.5rem; /* Menos alto */
        max-width: 1200px;
        margin: 0 auto;
        gap: 2rem; /* Espaciado uniforme entre logo y menú */
    }

    .nan_logo img {
        height: 90px; /* Un poco más pequeño */
        width: auto;
        transition: all 0.3s ease;
    }

    .nan_menu {
        display: flex;
        list-style: none;
        margin: 0;
        padding: 0;
        align-items: center;
    }

    .nan_menu li {
        margin-left: 1.2rem; /* Ligero ajuste para centrado visual */
    }

    .nan_menu a {
        color: #1c1948;
        text-decoration: none;
        font-weight: 500;
        display: flex;
        align-items: center;
        transition: color 0.3s;
        padding: 0.4rem 0.8rem; /* Menos alto */
        white-space: nowrap;
    }

    .nan_menu a:hover {
        color: #4e54c8;
    }

    .nan_menu a i {
        margin-right: 0.4rem;
    }

    .nan_hamburger, .nan_close {
        display: none;
        background: none;
        border: none;
        font-size: 1.6rem;
        cursor: pointer;
        color: #1c1948;
    }

    /* Estilos responsivos */
    @media (max-width: 992px) {
        .nan_navbar {
            flex-direction: column;
            padding: 0.1rem; /* Más compacto */
            gap: 0.6rem;
        }

        .nan_logo {
            margin-bottom: 0.5rem;
            text-align: center;
            width: 100%;
        }

        .nan_logo img {
            height: 90px; /* Más pequeño en móvil */
        }

        .nan_menu {
            position: fixed;
            top: 90px; /* Menos alto en barra */
            left: 0;
            width: 100%;
            background-color: white;
            flex-direction: column;
            align-items: stretch;
            padding: 0.5rem 0;
            box-shadow: 0 5px 10px rgba(0, 0, 0, 0.1);
            transform: translateY(-150%);
            transition: transform 0.3s ease;
            z-index: 999;
        }

        .nan_menu.active {
            transform: translateY(0);
        }

        .nan_menu li {
            margin: 0;
            width: 100%;
            text-align: center;
        }

        .nan_menu a {
            justify-content: center;
            padding: 0.8rem; /* Menos alto */
            width: 100%;
            box-sizing: border-box;
        }

        .nan_hamburger, .nan_close {
            position: absolute;
            top: 1rem;
            right: 1rem;
            display: block;
        }

        .nan_close {
            display: none;
        }
    }
    `;
    document.head.appendChild(style);
})();