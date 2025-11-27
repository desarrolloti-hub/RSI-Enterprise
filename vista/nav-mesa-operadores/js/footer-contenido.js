// footer-contenido.js - Footer fijo en la parte inferior (compatible con personalización)
(function() {
    'use strict';
    
    function createMainContentFooter() {
        // Verificar si ya existe un footer para evitar duplicados
        if (document.getElementById('mainContentFooter')) {
            return;
        }

        const mainFooter = document.createElement('footer');
        mainFooter.id = 'mainContentFooter';
        
        // Estilos base para footer fijo en la parte inferior
        // Los colores se aplicarán via CSS personalizado
        mainFooter.style.cssText = `
            /* POSICIÓN FIJA EN LA PARTE INFERIOR */
            position: fixed !important;
            bottom: 0 !important;
            left: 0 !important;
            right: 0 !important;
            width: 100% !important;
            
            /* ESTILOS BASE - COLORES SE APLICARÁN VIA CSS PERSONALIZADO */
            padding: 12px 20px !important;
            text-align: center !important;
            background: var(--primary-color, rgba(108, 67, 224, 0.95)) !important;
            border-top: 1px solid var(--secondary-color, rgba(108, 67, 224, 0.3)) !important;
            box-sizing: border-box !important;
            margin: 0 !important;
            z-index: 999 !important;
            
            /* EFECTO VISUAL MEJORADO */
            backdrop-filter: blur(10px) !important;
            -webkit-backdrop-filter: blur(10px) !important;
            box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1) !important;
            
            /* TRANSICIÓN PARA CAMBIOS DE COLOR */
            transition: background-color 0.3s ease, border-color 0.3s ease !important;
        `;

        mainFooter.innerHTML = `
            <div style="
                display: flex !important; 
                align-items: center !important; 
                justify-content: center !important; 
                gap: 12px !important; 
                flex-wrap: wrap !important;
                margin: 0 auto !important;
                max-width: 1200px !important;
            ">
                <img src="/vista/css/img/logoApp.png" alt="RSI Enterprise Mexico" 
                     style="
                         width: 20px !important; 
                         height: 20px !important; 
                         object-fit: contain !important; 
                         opacity: 0.9 !important; 
                         display: block !important;
                        
                     ">
                <p style="
                    margin: 0 !important; 
                    font-size: 0.8rem !important; 
                    color: white !important; 
                    line-height: 1.4 !important;
                    font-weight: 500 !important;
                ">
                    Mesa de ayuda desarrollada por RSI Enterprise Mexico
                </p>
            </div>
        `;

        // Insertar el footer al final del body
        document.body.appendChild(mainFooter);
        
        // Agregar padding al body para que el contenido no quede detrás del footer
        const originalBodyPaddingBottom = document.body.style.paddingBottom;
        document.body.style.paddingBottom = '70px';
        
        console.log('✅ Footer fijo creado en la parte inferior de la pantalla');
        
        // Aplicar estilos CSS personalizados para el footer
        applyFooterCustomStyles();
        
        // Limpiar el padding cuando se quite el footer (por si acaso)
        window.addEventListener('beforeunload', function() {
            document.body.style.paddingBottom = originalBodyPaddingBottom;
        });
    }
    
    // Aplicar estilos CSS personalizados para el footer
    function applyFooterCustomStyles() {
        const styleId = 'footer-custom-styles';
        let styleElement = document.getElementById(styleId);
        
        if (!styleElement) {
            styleElement = document.createElement('style');
            styleElement.id = styleId;
            document.head.appendChild(styleElement);
        }
        
        // CSS personalizado para el footer que se integra con el sistema de personalización
        styleElement.textContent = `
            /* ESTILOS PERSONALIZADOS PARA FOOTER - COMPATIBLE CON PERSONALIZACIÓN */
            
            #mainContentFooter {
                background: var(--primary-color) !important;
                border-top-color: var(--secondary-color) !important;
                opacity: 0.95;
            }
            
            #mainContentFooter:hover {
                opacity: 1;
            }
            
            /* Asegurar que el texto sea legible en todos los temas */
            #mainContentFooter p {
                color: white !important;
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
            }
            
            /* Ajustes específicos para modo oscuro */
            body[style*="background-color: #1a1a1a"] #mainContentFooter,
            body[style*="background-color: #2a2a2a"] #mainContentFooter {
                box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.3) !important;
            }
            
            /* Ajustes específicos para modo gris */
            body[style*="background-color: #808080"] #mainContentFooter,
            body[style*="background-color: #909090"] #mainContentFooter {
                box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.2) !important;
            }
            
            /* Responsive */
            @media (max-width: 768px) {
                #mainContentFooter {
                    padding: 10px 15px !important;
                }
                
                #mainContentFooter p {
                    font-size: 0.75rem !important;
                }
            }
            
            @media (max-width: 480px) {
                #mainContentFooter {
                    padding: 8px 10px !important;
                }
                
                #mainContentFooter div {
                    gap: 8px !important;
                }
            }
        `;
    }
    
    // Función para actualizar estilos del footer cuando cambien las preferencias
    function updateFooterStyles() {
        applyFooterCustomStyles();
    }
    
    // Escuchar eventos de actualización de personalización
    document.addEventListener('personalizationUpdated', updateFooterStyles);
    
    // También exponer función global para actualización manual
    window.actualizarFooterPersonalizado = updateFooterStyles;
    
    // Inicializar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createMainContentFooter);
    } else {
        createMainContentFooter();
    }
    
    console.log('✅ Footer cargado y compatible con sistema de personalización');
    
})();