// head-loader.js - Cargador autónomo de recursos del head
(function() {
    // 1. Configuración inicial crítica
    document.documentElement.lang = 'es';
    const head = document.head;
    
    // 2. Función mejorada para inyectar recursos
    function injectResource(resource) {
        return new Promise((resolve) => {
            let element;
            
            if (resource.type === 'meta') {
                element = document.createElement('meta');
                for (const [attr, value] of Object.entries(resource.attrs)) {
                    element.setAttribute(attr, value);
                }
                head.appendChild(element);
                resolve();
            } 
            else if (resource.type === 'css') {
                element = document.createElement('link');
                element.rel = 'stylesheet';
                element.href = resource.url;
                element.onload = resolve;
                element.onerror = resolve; // Continuar aunque falle
                head.appendChild(element);
            } 
            else if (resource.type === 'script') {
                element = document.createElement('script');
                element.src = resource.url;
                element.async = false; // Para mantener orden
                element.onload = resolve;
                element.onerror = resolve; // Continuar aunque falle
                head.appendChild(element);
            }
            else if (resource.type === 'title') {
                document.title = resource.text;
                resolve();
            }
            else if (resource.type === 'link') {
                element = document.createElement('link');
                for (const [attr, value] of Object.entries(resource.attrs)) {
                    element.setAttribute(attr, value);
                }
                head.appendChild(element);
                resolve();
            }
        });
    }

    // 3. Lista de recursos optimizada
    const resources = [
        // Metadatos básicos (críticos primero)
        { type: 'meta', attrs: { charset: 'UTF-8' } },
        { type: 'meta', attrs: { name: 'viewport', content: 'width=device-width, initial-scale=1.0' } },
        
        // Favicon (carga temprana)
        { type: 'link', attrs: { rel: 'icon', type: 'image/png', href: 'https://rsienterprise.com/vista/css/img/Logo-RSI-OFICIAL.png' } },
        
        // SEO
        { type: 'meta', attrs: { name: 'description', content: 'RSI Enterprise - Expertos en seguridad electrónica en México. Soluciones integrales con tecnología de vanguardia.' } },
        { type: 'meta', attrs: { name: 'keywords', content: 'cámaras de seguridad, alarmas, controles de acceso, sistemas contra incendio' } },
        { type: 'meta', attrs: { name: 'author', content: 'RSI Enterprise' } },
        
        // OpenGraph / Facebook
        { type: 'meta', attrs: { property: 'og:type', content: 'website' } },
        { type: 'meta', attrs: { property: 'og:url', content: 'https://rsienterprise.com/' } },
        { type: 'meta', attrs: { property: 'og:title', content: 'RSI Enterprise | Seguridad Electrónica Profesional' } },
        { type: 'meta', attrs: { property: 'og:description', content: 'Protección inteligente para hogares y negocios con tecnología de punta' } },
        
        // Twitter Cards
        { type: 'meta', attrs: { property: 'twitter:card', content: 'summary_large_image' } },
        { type: 'meta', attrs: { property: 'twitter:url', content: 'https://rsienterprise.com/' } },
        { type: 'meta', attrs: { property: 'twitter:title', content: 'RSI Enterprise | Seguridad Electrónica Profesional' } },
        
        // CSS (render-blocking)
        { type: 'css', url: 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css' },
        { type: 'css', url: 'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=Montserrat:wght@400;500;700&display=swap' },
        { type: 'css', url: 'https://unpkg.com/swiper/swiper-bundle.min.css' },
        { type: 'css', url: 'https://unpkg.com/aos@2.3.1/dist/aos.css' },
        { type: 'css', url: 'https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.min.css' },
        { type: 'css', url: 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css' },
        
        // Título de la página
        { type: 'title', text: 'RSI Enterprise - Soluciones Integrales de Seguridad' },
        
        // JavaScript (no render-blocking)
        { type: 'script', url: 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js' },
        { type: 'script', url: 'https://www.gstatic.com/firebasejs/9.6.0/firebase-app-compat.js' },
        { type: 'script', url: 'https://www.gstatic.com/firebasejs/9.6.0/firebase-firestore-compat.js' }
    ];

    // 4. Función de carga principal mejorada
    async function loadHeadResources() {
        // Inyectar recursos críticos primero
        await injectResource(resources[0]); // charset
        await injectResource(resources[1]); // viewport
        
        // Cargar el resto en paralelo para mejor performance
        const remainingResources = resources.slice(2);
        const promises = remainingResources.map(resource => injectResource(resource));
        
        await Promise.all(promises);
        
        console.log('Todos los recursos del head se cargaron correctamente');
    }

    // 5. Iniciar carga inmediatamente
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        loadHeadResources();
    } else {
        document.addEventListener('DOMContentLoaded', loadHeadResources);
    }
})();