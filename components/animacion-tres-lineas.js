/**
 * ANIMACIÓN TRES LÍNEAS - Archivo independiente
 * 
 * INCLUIR EN HTML:
 *   <script src="animacion-tres-lineas.js"></script>
 * 
 * USO:
 *   iniciarAnimacion();  // Animación automática al cargar
 *   iniciarAnimacion({ color: '#1c1948', imagen: 'url.jpg' });  // Con opciones
 *   repetirAnimacion();   // Para repetir la animación
 */

(function() {
    // Configuración global
    let configuracion = {
        color: '#1c1948',
        imagen: 'https://rsienterprise.com/vista/css/img/logoApp.png',
        duracion: 600,
        zIndex: 400
    };
    
    let animacionActiva = false;
    let overlayActual = null;
    
    // ======================================================
    // INYECTAR ESTILOS (automático)
    // ======================================================
    function inyectarEstilos() {
        if (document.getElementById('estilos-tres-lineas')) return;
        
        const estilos = document.createElement('style');
        estilos.id = 'estilos-tres-lineas';
        estilos.textContent = `
            .tres-lineas-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 1000;
                display: flex;
                pointer-events: none;
                overflow: visible;
            }
            .tres-lineas-line {
                height: 100%;
                background-color: #1c1948;
                transition: transform 1.2s cubic-bezier(0.77, 0, 0.18, 1);
                flex-shrink: 0;
            }
            .tres-lineas-left { width: 33.333%; transform: translateX(0); }
            .tres-lineas-center { width: 33.333%; transform: translateX(0); display: flex; align-items: center; justify-content: center; flex-direction: column; }
            .tres-lineas-right { width: 33.333%; transform: translateX(0); }
            .tres-lineas-imagen {
                width: 140px; height: 140px; border-radius: 50%; object-fit: cover;
                border: 3px solid rgba(167, 139, 250, 0.7);
                box-shadow: 0 0 40px rgba(139, 92, 246, 0.5);
                animation: tres-lineas-pulso 2s ease-in-out infinite;
            }
            @keyframes tres-lineas-pulso {
                0%,100% { box-shadow: 0 0 20px rgba(139,92,246,0.4); transform: scale(1); }
                50% { box-shadow: 0 0 45px rgba(139,92,246,0.7); transform: scale(1.02); }
            }
            .tres-lineas-etiqueta {
                margin-top: 1rem; color: rgba(255,255,255,0.7); font-weight: 500;
                letter-spacing: 4px; font-size: 0.75rem; text-transform: uppercase;
                background: rgba(0,0,0,0.25); padding: 0.3rem 1.2rem; border-radius: 30px;
                backdrop-filter: blur(4px);
                font-family: monospace;
            }
            .tres-lineas-slide-right .tres-lineas-left { transform: translateX(calc(100vw + 33.333%)); }
            .tres-lineas-slide-right .tres-lineas-center { transform: translateX(calc(100vw + 33.333%)); }
            .tres-lineas-slide-right .tres-lineas-right { transform: translateX(calc(100vw + 33.333%)); }
            .tres-lineas-animate-in .tres-lineas-left { animation: tres-lineas-entradaIzq 0.5s ease-out forwards; }
            .tres-lineas-animate-in .tres-lineas-center { animation: tres-lineas-entradaCentro 0.5s ease-out forwards; }
            .tres-lineas-animate-in .tres-lineas-right { animation: tres-lineas-entradaDer 0.5s ease-out forwards; }
            @keyframes tres-lineas-entradaIzq { from { opacity: 0; transform: translateX(-40px); } to { opacity: 1; transform: translateX(0); } }
            @keyframes tres-lineas-entradaDer { from { opacity: 0; transform: translateX(40px); } to { opacity: 1; transform: translateX(0); } }
            @keyframes tres-lineas-entradaCentro { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
            .tres-lineas-hidden { visibility: hidden; display: none; }
            @media (max-width: 600px) { 
                .tres-lineas-imagen { width: 100px; height: 100px; } 
                .tres-lineas-etiqueta { font-size: 0.6rem; letter-spacing: 2px; }
            }
        `;
        document.head.appendChild(estilos);
    }
    
    // ======================================================
    // CREAR OVERLAY
    // ======================================================
    function crearOverlay() {
        const overlayExistente = document.querySelector('.tres-lineas-overlay');
        if (overlayExistente) overlayExistente.remove();
        
        const overlay = document.createElement('div');
        overlay.className = 'tres-lineas-overlay';
        overlay.innerHTML = `
            <div class="tres-lineas-line tres-lineas-left"></div>
            <div class="tres-lineas-line tres-lineas-center">
                <img class="tres-lineas-imagen" src="${configuracion.imagen}" alt="Centro" onerror="this.src='https://picsum.photos/id/20/200/200'">
                <div class="tres-lineas-etiqueta">RSI Enterprise</div>
            </div>
            <div class="tres-lineas-line tres-lineas-right"></div>
        `;
        document.body.appendChild(overlay);
        
        // Aplicar color personalizado
        const lines = overlay.querySelectorAll('.tres-lineas-line');
        lines.forEach(line => {
            line.style.backgroundColor = configuracion.color;
        });
        
        // Aplicar duración personalizada
        const styleSheet = document.createElement('style');
        styleSheet.textContent = `
            .tres-lineas-line {
                transition-duration: ${configuracion.duracion}ms !important;
            }
            .tres-lineas-slide-right .tres-lineas-left,
            .tres-lineas-slide-right .tres-lineas-center,
            .tres-lineas-slide-right .tres-lineas-right {
                transition-duration: ${configuracion.duracion}ms !important;
            }
        `;
        document.head.appendChild(styleSheet);
        
        return overlay;
    }
    
    // ======================================================
    // INICIAR ANIMACIÓN
    // ======================================================
    function iniciarAnimacion(opciones = {}) {
        // Actualizar configuración
        if (opciones.color) configuracion.color = opciones.color;
        if (opciones.imagen) configuracion.imagen = opciones.imagen;
        if (opciones.duracion) configuracion.duracion = opciones.duracion;
        
        if (animacionActiva) return;
        animacionActiva = true;
        
        inyectarEstilos();
        const overlay = crearOverlay();
        overlayActual = overlay;
        
        // Resetear
        overlay.classList.remove('tres-lineas-hidden', 'tres-lineas-slide-right', 'tres-lineas-animate-in');
        
        const leftLine = overlay.querySelector('.tres-lineas-left');
        const centerLine = overlay.querySelector('.tres-lineas-center');
        const rightLine = overlay.querySelector('.tres-lineas-right');
        
        if (leftLine) leftLine.style.transform = '';
        if (centerLine) centerLine.style.transform = '';
        if (rightLine) rightLine.style.transform = '';
        
        void overlay.offsetHeight;
        
        // FASE 1: Aparecen las líneas
        overlay.classList.add('tres-lineas-animate-in');
        
        setTimeout(() => {
            overlay.classList.remove('tres-lineas-animate-in');
            
            setTimeout(() => {
                // FASE 2: Desplazamiento COMPLETO a la derecha
                overlay.classList.add('tres-lineas-slide-right');
                
                setTimeout(() => {
                    overlay.classList.add('tres-lineas-hidden');
                    animacionActiva = false;
                    
                    // Disparar evento personalizado
                    window.dispatchEvent(new CustomEvent('animacion-completada'));
                }, configuracion.duracion);
                
            }, 800);
            
        }, 600);
    }
    
    // ======================================================
    // REPETIR ANIMACIÓN
    // ======================================================
    function repetirAnimacion(opciones = {}) {
        // Actualizar configuración si se pasan opciones
        if (opciones.color) configuracion.color = opciones.color;
        if (opciones.imagen) configuracion.imagen = opciones.imagen;
        if (opciones.duracion) configuracion.duracion = opciones.duracion;
        
        // Eliminar overlay existente
        const overlayExistente = document.querySelector('.tres-lineas-overlay');
        if (overlayExistente) overlayExistente.remove();
        
        animacionActiva = false;
        
        setTimeout(() => {
            iniciarAnimacion(opciones);
        }, 50);
    }
    
    // ======================================================
    // EXPORTAR AL ÁMBITO GLOBAL
    // ======================================================
    window.iniciarAnimacion = iniciarAnimacion;
    window.repetirAnimacion = repetirAnimacion;
    
    // Auto-ejecutar al cargar la página
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => iniciarAnimacion(), 100);
        });
    } else {
        setTimeout(() => iniciarAnimacion(), 100);
    }
    
})();