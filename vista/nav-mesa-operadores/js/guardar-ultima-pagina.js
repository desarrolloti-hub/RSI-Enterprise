// guardar-ultima-pagina.js
// Componente para guardar la última página visitada en el Service Worker
// Versión 1.0.0

(function() {
    'use strict';
    
    // Configuración
    const CONFIG = {
        DELAY_NAVIGATION: 500, // ms de espera después de hacer clic en un enlace
        DEBUG: true // Mostrar logs en consola
    };

    // Función para logging
    function log(message, data) {
        if (CONFIG.DEBUG) {
            if (data) {
                console.log(`📍 [GuardarPágina] ${message}`, data);
            } else {
                console.log(`📍 [GuardarPágina] ${message}`);
            }
        }
    }

    // Función para guardar la URL actual
    function saveCurrentUrl() {
        // Verificar si el Service Worker está soportado y activo
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            try {
                navigator.serviceWorker.controller.postMessage({
                    type: 'SAVE_URL',
                    url: window.location.href,
                    timestamp: new Date().toISOString(),
                    title: document.title
                });
                log('Página guardada:', {
                    url: window.location.href,
                    title: document.title
                });
            } catch (error) {
                console.error('[GuardarPágina] Error al guardar:', error);
            }
        } else {
            log('Service Worker no disponible o no controla esta página');
            
            // Opcional: Intentar registrar el Service Worker si no está activo
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.ready.then(function(registration) {
                    if (registration.active) {
                        // Reintentar guardar cuando el SW esté listo
                        setTimeout(saveCurrentUrl, 1000);
                    }
                });
            }
        }
    }

    // Inicializar el componente
    function init() {
        log('Inicializando componente...');
        
        // Guardar cuando la página carga
        if (document.readyState === 'complete') {
            saveCurrentUrl();
        } else {
            window.addEventListener('load', saveCurrentUrl);
        }
        
        // Guardar cuando el usuario navega con el historial (para SPAs)
        window.addEventListener('popstate', saveCurrentUrl);
        
        // Guardar cuando se usa pushState/replaceState (para SPAs modernos)
        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;
        
        history.pushState = function() {
            originalPushState.apply(this, arguments);
            saveCurrentUrl();
        };
        
        history.replaceState = function() {
            originalReplaceState.apply(this, arguments);
            saveCurrentUrl();
        };
        
        // Para enlaces internos tradicionales
        document.addEventListener('click', function(e) {
            const link = e.target.closest('a');
            if (link && link.href && link.href.startsWith(window.location.origin)) {
                // Evitar guardar si es un enlace con target _blank
                if (link.target === '_blank') {
                    return;
                }
                
                // Pequeño retraso para asegurar que la navegación ocurrió
                setTimeout(saveCurrentUrl, CONFIG.DELAY_NAVIGATION);
                log('Clic en enlace interno:', link.href);
            }
        });
        
        // También guardar cuando el usuario cambia de pestaña/vuelve (opcional)
        document.addEventListener('visibilitychange', function() {
            if (document.visibilityState === 'visible') {
                // Pequeño retraso para asegurar que todo está cargado
                setTimeout(saveCurrentUrl, 100);
                log('Página visible nuevamente');
            }
        });
        
        log('Componente inicializado correctamente');
    }

    // Ejecutar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();