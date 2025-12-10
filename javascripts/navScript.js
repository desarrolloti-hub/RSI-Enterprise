// nav.js - Componente de navegación autónomo para usuario
(function() {
    // Inyectar el HTML del navbar actualizado
    const navHTML = /*html*/ `
    <header class="nan_header">
        <nav class="nan_navbar">
            <div class="nan_logo">
                <a href="dashUser.html">
                    <img src="https://rsienterprise.web.app/vista/css/img/Logo-RSI-OFICIAL.png" alt="RSI Enterprise Logo">
                </a>
            </div>

            <!-- Menú Hamburguesa -->
            <button class="nan_hamburger" aria-label="Abrir menú" aria-expanded="false">&#9776;</button>
            <button class="nan_close" aria-label="Cerrar menú" style="display: none;">&times;</button>
    
            <ul class="nan_menu">
                <li><a href="productos-usuario.html"><i class="fas fa-box"></i> Productos</a></li>
                <li><a href="historial-de-compras.html"><i class="fas fa-history"></i> Historial de compras</a></li>
                <li><a href="lista-de-deseos.html"><i class="fas fa-heart"></i> Lista de deseos</a></li>
                <li><a href="soporte.html"><i class="fas fa-headset"></i> Soporte</a></li>
                <li><a href="perfil.html"><i class="fas fa-user"></i> Mi perfil</a></li>
                <li><a href="#" id="cerrarSesion"><i class="fas fa-sign-out-alt"></i> Cerrar sesión</a></li>
                <li class="nan_language">
                    <select id="languageSelect" class="language-select">
                        <option value="es" data-flag="../css/img/flag-mexico.png">🇲🇽 Español</option>
                        <option value="en" data-flag="../css/img/flag-usa.png">🇺🇸 English</option>
                    </select>
                </li>
            </ul>
        </nav>
    </header>
    `;

    // Insertar el navbar al inicio del body
    document.body.insertAdjacentHTML('afterbegin', navHTML);

    // Funcionalidad del navbar
    document.addEventListener('DOMContentLoaded', function() {
        const hamburger = document.querySelector('.nan_hamburger');
        const closeBtn = document.querySelector('.nan_close');
        const menu = document.querySelector('.nan_menu');
        const languageSelect = document.getElementById('languageSelect');
        const cerrarSesionBtn = document.getElementById('cerrarSesion');

        // Funcionalidad del menú hamburguesa
        hamburger.addEventListener('click', function() {
            menu.classList.add('active');
            hamburger.style.display = 'none';
            closeBtn.style.display = 'block';
            hamburger.setAttribute('aria-expanded', 'true');
        });

        closeBtn.addEventListener('click', function() {
            menu.classList.remove('active');
            closeBtn.style.display = 'none';
            hamburger.style.display = 'block';
            hamburger.setAttribute('aria-expanded', 'false');
        });

        // Funcionalidad del selector de idioma
        if (languageSelect) {
            languageSelect.addEventListener('change', function() {
                const selectedLang = this.value;
                console.log('Idioma seleccionado:', selectedLang);
                
                // Aquí puedes agregar lógica para cambiar el idioma
                // Por ejemplo, redirigir a versiones en diferentes idiomas
                // o usar un sistema de internacionalización
            });
        }

        // Funcionalidad del cierre de sesión con SweetAlert2
        if (cerrarSesionBtn) {
            cerrarSesionBtn.addEventListener('click', function(e) {
                e.preventDefault();
                
                Swal.fire({
                    title: '¿Cerrar sesión?',
                    text: "¿Estás seguro de que quieres cerrar tu sesión?",
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonColor: '#4e54c8',
                    cancelButtonColor: '#d33',
                    confirmButtonText: 'Sí, cerrar sesión',
                    cancelButtonText: 'Cancelar',
                    reverseButtons: true,
                    customClass: {
                        popup: 'sesion-modal'
                    }
                }).then((result) => {
                    if (result.isConfirmed) {
                        // Aquí va la lógica real de cierre de sesión
                        console.log('Cerrando sesión...');
                        
                        // Mostrar mensaje de confirmación
                        Swal.fire({
                            title: '¡Sesión cerrada!',
                            text: 'Tu sesión ha sido cerrada exitosamente.',
                            icon: 'success',
                            confirmButtonColor: '#4e54c8',
                            timer: 2000,
                            showConfirmButton: false
                        }).then(() => {
                            // Redirigir al inicio de sesión
                            window.location.href = '/vista/nav-visitantes/inicio-de-sesion/inicio-de-sesion.html';
                        });
                        
                        // Si usas Firebase o otro sistema de autenticación:
                        // firebase.auth().signOut().then(() => { ... });
                    }
                });
            });
        }

        // Cerrar menú al hacer clic en un enlace (en móviles)
        const navLinks = document.querySelectorAll('.nan_menu a:not(#cerrarSesion)');
        navLinks.forEach(link => {
            link.addEventListener('click', function() {
                if (window.innerWidth <= 992) {
                    menu.classList.remove('active');
                    closeBtn.style.display = 'none';
                    hamburger.style.display = 'block';
                    hamburger.setAttribute('aria-expanded', 'false');
                }
            });
        });

        // Manejo de redimensionamiento de ventana
        window.addEventListener('resize', function() {
            if (window.innerWidth > 992) {
                menu.classList.remove('active');
                closeBtn.style.display = 'none';
                hamburger.style.display = 'none';
                hamburger.setAttribute('aria-expanded', 'false');
            } else {
                if (!menu.classList.contains('active')) {
                    hamburger.style.display = 'block';
                }
            }
        });

        // Configuración inicial basada en el tamaño de pantalla
        if (window.innerWidth > 992) {
            closeBtn.style.display = 'none';
            hamburger.style.display = 'none';
        } else {
            closeBtn.style.display = 'none';
        }
    });

    // Estilos dinámicos actualizados
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
        justify-content: center;
        align-items: center;
        padding: 0.8rem 1.5rem;
        max-width: 1200px;
        margin: 0 auto;
        gap: 2rem;
    }

    .nan_logo img {
        height: 90px;
        width: auto;
        transition: all 0.3s ease;
    }

    .nan_menu {
        display: flex;
        list-style: none;
        margin: 0;
        padding: 0;
        align-items: center;
        gap: 1rem;
    }

    .nan_menu li {
        margin: 0;
    }

    .nan_menu a {
        color: #1c1948;
        text-decoration: none;
        font-weight: 500;
        display: flex;
        align-items: center;
        transition: all 0.3s;
        padding: 0.4rem 0.8rem;
        white-space: nowrap;
        border-radius: 4px;
    }

    .nan_menu a:hover {
        color: #4e54c8;
        background-color: #f5f5f5;
    }

    .nan_menu a i {
        margin-right: 0.4rem;
    }

    /* Estilos para el selector de idioma */
    .nan_language {
        margin-left: 0.5rem;
    }

    .language-select {
        padding: 0.5rem 1rem;
        border: 2px solid #e0e0e0;
        border-radius: 8px;
        background-color: white;
        color: #1c1948;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.3s;
        appearance: none;
        background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%231c1948' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
        background-repeat: no-repeat;
        background-position: right 0.7rem center;
        background-size: 1rem;
        padding-right: 2.5rem;
    }

    .language-select:hover {
        border-color: #4e54c8;
    }

    .language-select:focus {
        outline: none;
        border-color: #4e54c8;
        box-shadow: 0 0 0 3px rgba(78, 84, 200, 0.2);
    }

    .nan_hamburger, .nan_close {
        display: none;
        background: none;
        border: none;
        font-size: 1.6rem;
        cursor: pointer;
        color: #1c1948;
        z-index: 1001;
    }

    /* Estilos para el modal de cierre de sesión */
    .sesion-modal {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
    }

    /* Estilos responsivos */
    @media (max-width: 992px) {
        .nan_navbar {
            flex-direction: column;
            padding: 0.1rem;
            gap: 0.6rem;
            position: relative;
        }

        .nan_logo {
            margin-bottom: 0.5rem;
            text-align: center;
            width: 100%;
        }

        .nan_logo img {
            height: 80px;
        }

        .nan_menu {
            position: fixed;
            top: 80px;
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
            gap: 0;
        }

        .nan_menu.active {
            transform: translateY(0);
        }

        .nan_menu li {
            width: 100%;
            text-align: center;
        }

        .nan_menu a {
            justify-content: center;
            padding: 1rem;
            width: 100%;
            box-sizing: border-box;
        }

        .nan_menu a:hover {
            background-color: #f0f0f0;
        }

        .nan_language {
            margin: 0;
            padding: 1rem;
            border-top: 1px solid #eee;
        }

        .language-select {
            width: 90%;
            margin: 0 auto;
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

    @media (max-width: 768px) {
        .nan_logo img {
            height: 70px;
        }
        
        .nan_menu {
            top: 70px;
        }
    }
    `;
    document.head.appendChild(style);
})();