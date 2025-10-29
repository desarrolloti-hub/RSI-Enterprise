
// personalizacion-colores.js - Función autónoma para cargar colores personalizados
(function() {
    'use strict';

    // Configuración de Firebase (debe estar disponible globalmente)
    const firebaseConfig = {
        apiKey: "AIzaSyBJy992gkvsT77-_fMp_O_z99wtjZiK77Y",
        authDomain: "rsienterprise.firebaseapp.com",
        projectId: "rsienterprise",
        storageBucket: "rsienterprise.appspot.com",
        messagingSenderId: "1063117165770",
        appId: "1:1063117165770:web:8555f26b25ae80bc42d033"
    };

    // Inicializar Firebase si no está inicializado
    if (typeof firebase === 'undefined') {
        console.error('Firebase no está cargado');
        return;
    }
    
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    
    const auth = firebase.auth();
    const db = firebase.firestore();
    
    // Opciones de personalización (deben coincidir con las de personalizacion.html)
    const backgroundOptions = [
        { id: 'light', name: 'Claro', color: '#f5f5f5', textColor: '#333', cardBg: '#ffffff' },
        { id: 'dark', name: 'Oscuro', color: '#1a1a1a', textColor: '#f5f5f5', cardBg: '#2d2d2d' },
        { id: 'gray', name: 'Gris', color: '#808080', textColor: '#ffffff', cardBg: '#a0a0a0' }
    ];
    
    const themeOptions = [
        { id: 'purple', name: 'Púrpura', primary: '#6C43E0', secondary: '#5a35c7', accent: '#8B5FEB' },
        { id: 'blue', name: 'Azul', primary: '#2196F3', secondary: '#1976D2', accent: '#42A5F5' },
        { id: 'green', name: 'Verde', primary: '#4CAF50', secondary: '#388E3C', accent: '#66BB6A' },
        { id: 'orange', name: 'Naranja', primary: '#FF9800', secondary: '#F57C00', accent: '#FFB74D' },
        { id: 'red', name: 'Rojo', primary: '#F44336', secondary: '#D32F2F', accent: '#EF5350' },
        { id: 'teal', name: 'Verde Azulado', primary: '#009688', secondary: '#00796B', accent: '#26A69A' }
    ];

    // Estado de la personalización
    const personalizationState = {
        currentUser: null,
        userData: null,
        preferences: {
            background: 'light',
            theme: 'purple',
            backgroundImage: null
        }
    };

    // Función auxiliar para obtener colores más sutiles
    function getSubtleBackground(baseColor) {
        // Si es un color oscuro, aclararlo ligeramente
        if (baseColor === '#1a1a1a') return '#2a2a2a';
        if (baseColor === '#808080') return '#909090';
        // Si es claro, oscurecerlo ligeramente
        return '#f0f0f0';
    }

    // Aplicar imagen de fondo si está disponible
    function applyBackgroundImage(backgroundImage) {
        console.log('🖼️ Aplicando imagen de fondo:', backgroundImage ? 'Sí' : 'No');
        
        // Remover imagen de fondo anterior si existe
        const existingBg = document.getElementById('custom-background-image');
        if (existingBg) {
            existingBg.remove();
        }
        
        // Si hay una imagen de fondo, aplicarla
if (backgroundImage && backgroundImage.startsWith('data:image/')) {
    const bgElement = document.createElement('div');
    bgElement.id = 'custom-background-image';
    bgElement.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 700px;  /* Tamaño fijo en píxeles */
        height: 700px;
        background-image: url('${backgroundImage}');
        background-size: contain;
        background-position: center;
        background-repeat: no-repeat;
        z-index: -1;  /* ¡CAMBIO CLAVE! Por detrás de todo */
        pointer-events: none; /* Para que no interfiera con clics */
    `;
    document.body.appendChild(bgElement);

    // Asegurarse de que el body tenga posición relativa
    document.body.style.position = 'relative';
    document.body.style.minHeight = '100vh';

    console.log('✅ Imagen de fondo aplicada correctamente');
} else if (backgroundImage) {
    console.warn('⚠️ Formato de imagen de fondo no reconocido:', backgroundImage.substring(0, 50) + '...');
}
    }

    // Aplicar estilos CSS personalizados
    function applyCustomStyles(preferences) {
        console.log('🎨 Aplicando estilos personalizados:', preferences);
        
        const selectedBackground = backgroundOptions.find(bg => bg.id === preferences.background) || backgroundOptions[0];
        const selectedTheme = themeOptions.find(theme => theme.id === preferences.theme) || themeOptions[0];
        
        // Aplicar imagen de fondo si está disponible
        if (preferences.backgroundImage) {
            applyBackgroundImage(preferences.backgroundImage);
        } else {
            // Remover imagen de fondo si no hay
            const existingBg = document.getElementById('custom-background-image');
            if (existingBg) {
                existingBg.remove();
            }
        }
        
        const styleId = 'personalizacion-colores-styles';
        let styleElement = document.getElementById(styleId);
        
        if (!styleElement) {
            styleElement = document.createElement('style');
            styleElement.id = styleId;
            document.head.appendChild(styleElement);
        }
        
        // CSS personalizado para toda la aplicación
        styleElement.textContent = `
            /* ESTILOS PERSONALIZADOS - CARGADOS AUTOMÁTICAMENTE */
            
            /* Variables CSS globales */
            :root {
                --primary-color: ${selectedTheme.primary};
                --secondary-color: ${selectedTheme.secondary};
                --accent-color: ${selectedTheme.accent};
                --background-color: ${selectedBackground.color};
                --text-color: ${selectedBackground.textColor};
                --card-bg: ${selectedBackground.cardBg};
                --card-shadow: ${selectedBackground.id === 'dark' ? '0 4px 12px rgba(0, 0, 0, 0.3)' : '0 4px 12px rgba(0, 0, 0, 0.1)'};
            }
            
            /* Aplicar colores a elementos comunes */
            body{
                background-color: ${getSubtleBackground(selectedBackground.color)} !important;
                color: var(--text-color) !important;
                transition: background-color 0.3s ease, color 0.3s ease;
                position: relative;
                min-height: 100vh;
            }
            
            /* Si hay imagen de fondo, ajustar la opacidad del contenido */
            ${preferences.backgroundImage ? `
                body::before {
                    content: '';
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background-color: ${getSubtleBackground(selectedBackground.color)};
                    opacity: 0.9;
                    z-index: -1;
                }
                
                .card,
                .panel,
                .container-custom,
                .content-box {
                   background-color: ${selectedBackground.cardBg} !important;
                    backdrop-filter: blur(10px);
                }
            ` : ''}
            
            /* Botones primarios */
            .btn-primary, 
            button[class*="primary"],
            .primary-button {
                background-color: var(--primary-color) !important;
                border-color: var(--primary-color) !important;
                color: white !important;
            }
            
            .btn-primary:hover,
            button[class*="primary"]:hover,
            .primary-button:hover {
                background-color: var(--secondary-color) !important;
                border-color: var(--secondary-color) !important;
            }
            
            /* Botones secundarios */
            .btn-secondary,
            button[class*="secondary"],
            .secondary-button {
                background-color: var(--accent-color) !important;
                border-color: var(--accent-color) !important;
                color: white !important;
            }
            
            /* Tarjetas y contenedores */
            .card,
            .panel,
            .container-custom,
            .content-box {
                background-color: var(--card-bg) !important;
                color: var(--text-color) !important;
                box-shadow: var(--card-shadow) !important;
            }
            
            /* Encabezados */
            h1, h2, h3, h4, h5, h6 {
                color: var(--primary-color) !important;
            }
            
            /* Enlaces */
            a {
                color: var(--primary-color) !important;
            }
            
            a:hover {
                color: var(--secondary-color) !important;
            }
            
            /* Barras de progreso */
            .progress-bar,
            .bar-fill {
                background-color: var(--primary-color) !important;
            }
            
            /* Bordes y separadores */
            .border-primary,
            .separator {
                border-color: var(--primary-color) !important;
            }
            
            /* Estados de elementos */
            .active,
            .selected {
                background-color: var(--primary-color) !important;
                color: white !important;
            }
            
            /* Mensajes y alertas */
            .alert-info,
            .message-info {
                background-color: ${selectedTheme.primary}20 !important;
                border-color: var(--primary-color) !important;
                color: var(--text-color) !important;
            }
            
            .alert-success,
            .message-success {
                background-color: #d4edda !important;
                border-color: #c3e6cb !important;
                color: #155724 !important;
            }
            
            .alert-warning,
            .message-warning {
                background-color: #fff3cd !important;
                border-color: #ffeaa7 !important;
                color: #856404 !important;
            }
            
            .alert-error,
            .message-error {
                background-color: #f8d7da !important;
                border-color: #f5c6cb !important;
                color: #721c24 !important;
            }
            
            /* Tablas */
            table {
                background-color: var(--card-bg) !important;
                color: var(--text-color) !important;
            }
            
            th {
                background-color: var(--primary-color) !important;
                color: white !important;
            }
            
            tr:nth-child(even) {
                background-color: ${selectedBackground.cardBg}20 !important;
            }
            
            /* Formularios */
            input, textarea, select {
                background-color: var(--card-bg) !important;
                color: var(--text-color) !important;
                border-color: ${selectedTheme.primary}40 !important;
            }
            
            input:focus, textarea:focus, select:focus {
                border-color: var(--primary-color) !important;
                box-shadow: 0 0 0 2px ${selectedTheme.primary}20 !important;
            }
            
            /* Navegación y menús */
            .navbar,
            .nav-menu {
                background-color: var(--card-bg) !important;
                color: var(--text-color) !important;
            }
            
            .nav-item.active {
                background-color: var(--primary-color) !important;
                color: white !important;
            }
            
            /* Iconos con color temático */
            .icon-primary {
                color: var(--primary-color) !important;
            }
            
            .icon-secondary {
                color: var(--secondary-color) !important;
            }
            
            .icon-accent {
                color: var(--accent-color) !important;
            }
            
            /* Badges y etiquetas */
            .badge-primary {
                background-color: var(--primary-color) !important;
                color: white !important;
            }
            
            .badge-secondary {
                background-color: var(--secondary-color) !important;
                color: white !important;
            }
            
            /* Modo oscuro específico */
            ${selectedBackground.id === 'dark' ? `
                /* Ajustes adicionales para modo oscuro */
                .card, .panel {
                    border: 1px solid #444 !important;
                }
                
                input, textarea, select {
                    border: 1px solid #555 !important;
                }
                
                .table-hover tbody tr:hover {
                    background-color: #333 !important;
                }
            ` : ''}
            
            ${selectedBackground.id === 'gray' ? `
                /* Ajustes adicionales para modo gris */
                .card, .panel {
                    border: 1px solid #999 !important;
                }
            ` : ''}

            /* ESTILOS PARA SWEETALERT2 PERSONALIZADOS */
            .swal2-popup {
                background: ${selectedBackground.cardBg} !important;
                color: ${selectedBackground.textColor} !important;
                border: 2px solid ${selectedTheme.primary} !important;
                border-radius: 12px !important;
            }

            .swal2-title {
                color: ${selectedTheme.primary} !important;
                font-weight: 700 !important;
            }

            .swal2-content {
                color: ${selectedBackground.textColor} !important;
            }

            .swal2-confirm {
                background: ${selectedTheme.primary} !important;
                border: 2px solid ${selectedTheme.secondary} !important;
                color: white !important;
                font-weight: 600 !important;
                border-radius: 8px !important;
                transition: all 0.3s ease !important;
            }

            .swal2-confirm:hover {
                background: ${selectedTheme.secondary} !important;
                transform: translateY(-2px) !important;
                box-shadow: 0 4px 8px ${selectedTheme.primary}40 !important;
            }

            .swal2-cancel {
                background: ${selectedBackground.id === 'dark' ? '#555' : '#e9ecef'} !important;
                border: 2px solid ${selectedBackground.id === 'dark' ? '#666' : '#ced4da'} !important;
                color: ${selectedBackground.textColor} !important;
                font-weight: 600 !important;
                border-radius: 8px !important;
                transition: all 0.3s ease !important;
            }

            .swal2-cancel:hover {
                background: ${selectedBackground.id === 'dark' ? '#666' : '#dee2e6'} !important;
                transform: translateY(-2px) !important;
            }

            .swal2-success [class^=swal2-success-line] {
                background-color: ${selectedTheme.primary} !important;
            }

            .swal2-success [class^=swal2-success-circular-line] {
                background-color: transparent !important;
            }

            .swal2-icon.swal2-success .swal2-success-ring {
                border: 4px solid ${selectedTheme.primary}30 !important;
            }

            .swal2-icon.swal2-error {
                border-color: ${selectedTheme.primary} !important;
            }

            .swal2-icon.swal2-error [class^=swal2-x-mark-line] {
                background-color: ${selectedTheme.primary} !important;
            }

            .swal2-icon.swal2-warning {
                border-color: #ffc107 !important;
                color: #ffc107 !important;
            }

            .swal2-icon.swal2-info {
                border-color: ${selectedTheme.primary} !important;
                color: ${selectedTheme.primary} !important;
            }

            .swal2-actions {
                gap: 10px !important;
            }

            /* SweetAlert2 con fondo oscuro */
            ${selectedBackground.id === 'dark' ? `
                .swal2-popup {
                    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4) !important;
                }
                
                .swal2-input, .swal2-textarea {
                    background: #333 !important;
                    color: white !important;
                    border: 1px solid #555 !important;
                }
                
                .swal2-input:focus, .swal2-textarea:focus {
                    border-color: ${selectedTheme.primary} !important;
                    box-shadow: 0 0 0 2px ${selectedTheme.primary}20 !important;
                }
            ` : ''}

            ${selectedBackground.id === 'gray' ? `
                .swal2-popup {
                    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2) !important;
                }
            ` : ''}
        `;
        
        console.log('✅ Estilos personalizados aplicados correctamente');
        
        // Aplicar configuración global para SweetAlert2
        applySweetAlertConfig(selectedTheme, selectedBackground);
    }

    // Configurar SweetAlert2 globalmente con los colores personalizados
    function applySweetAlertConfig(selectedTheme, selectedBackground) {
        if (typeof Swal !== 'undefined') {
            // Configuración global de SweetAlert2
            Swal.mixin({
                background: selectedBackground.cardBg,
                color: selectedBackground.textColor,
                confirmButtonColor: selectedTheme.primary,
                cancelButtonColor: selectedBackground.id === 'dark' ? '#555' : '#6c757d',
                customClass: {
                    popup: 'sweet-alert-custom',
                    confirmButton: 'sweet-alert-confirm-custom',
                    cancelButton: 'sweet-alert-cancel-custom',
                    title: 'sweet-alert-title-custom',
                    htmlContainer: 'sweet-alert-content-custom'
                }
            });
            
            console.log('🎨 Configuración de SweetAlert2 aplicada con colores personalizados');
        } else {
            console.log('ℹ️ SweetAlert2 no está cargado, se aplicarán estilos via CSS');
        }
    }

    // Función para mostrar SweetAlert con colores personalizados
    window.showCustomAlert = function(config) {
        if (typeof Swal === 'undefined') {
            console.warn('SweetAlert2 no está cargado');
            return Promise.resolve(false);
        }

        // Obtener preferencias actuales
        const savedPrefs = localStorage.getItem('personalizationPreferences');
        const preferences = savedPrefs ? JSON.parse(savedPrefs) : personalizationState.preferences;
        
        const selectedBackground = backgroundOptions.find(bg => bg.id === preferences.background) || backgroundOptions[0];
        const selectedTheme = themeOptions.find(theme => theme.id === preferences.theme) || themeOptions[0];

        // Configuración base con colores personalizados
        const defaultConfig = {
            background: selectedBackground.cardBg,
            color: selectedBackground.textColor,
            confirmButtonColor: selectedTheme.primary,
            cancelButtonColor: selectedBackground.id === 'dark' ? '#555' : '#6c757d',
            iconColor: selectedTheme.primary
        };

        return Swal.fire({
            ...defaultConfig,
            ...config
        });
    };

    // Función para confirmación personalizada
    window.showCustomConfirm = function(title, text, confirmButtonText = 'Confirmar', cancelButtonText = 'Cancelar') {
        return window.showCustomAlert({
            title: title,
            text: text,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: confirmButtonText,
            cancelButtonText: cancelButtonText,
            customClass: {
                confirmButton: 'btn-confirm-custom',
                cancelButton: 'btn-cancel-custom'
            }
        });
    };

    // Función para éxito personalizado
    window.showCustomSuccess = function(title, text, confirmButtonText = 'OK') {
        return window.showCustomAlert({
            title: title,
            text: text,
            icon: 'success',
            confirmButtonText: confirmButtonText
        });
    };

    // Función para error personalizado
    window.showCustomError = function(title, text, confirmButtonText = 'OK') {
        return window.showCustomAlert({
            title: title,
            text: text,
            icon: 'error',
            confirmButtonText: confirmButtonText
        });
    };

    // Función para advertencia personalizada
    window.showCustomWarning = function(title, text, confirmButtonText = 'Entendido') {
        return window.showCustomAlert({
            title: title,
            text: text,
            icon: 'warning',
            confirmButtonText: confirmButtonText
        });
    };

    // Cargar perfil del usuario desde colaboradores
    async function loadUserProfile() {
        try {
            const user = auth.currentUser;
            if (!user) {
                console.log('No hay usuario autenticado');
                return null;
            }
            
            const colaboradorQuery = await db.collection("colaboradores")
                .where("CORREO ELECTRÓNICO EMPRESARIAL", "==", user.email)
                .get();
            
            if (!colaboradorQuery.empty) {
                const doc = colaboradorQuery.docs[0];
                const userData = doc.data();
                
                return {
                    id: doc.id,
                    nombre: userData.NOMBRE || 'Usuario',
                    area: userData.ÁREA || 'Sin área',
                    correoEmpresarial: userData["CORREO ELECTRÓNICO EMPRESARIAL"]
                };
            } else {
                console.log('Usuario no encontrado en colaboradores');
                return {
                    id: user.uid,
                    nombre: user.email,
                    area: 'Usuario no registrado',
                    correoEmpresarial: user.email
                };
            }
            
        } catch (error) {
            console.error("Error al cargar perfil:", error);
            return null;
        }
    }

    // Cargar preferencias de personalización
    async function loadPersonalizationPreferences() {
        try {
            // 1. Intentar cargar desde localStorage (más rápido)
            const savedPrefs = localStorage.getItem('personalizationPreferences');
            if (savedPrefs) {
                const preferences = JSON.parse(savedPrefs);
                applyCustomStyles(preferences);
                console.log('✅ Preferencias cargadas desde localStorage');
                return preferences;
            }
            
            // 2. Si hay usuario autenticado, cargar desde Firebase
            const user = auth.currentUser;
            if (user) {
                const userData = await loadUserProfile();
                if (userData) {
                    const prefsDoc = await db.collection('personalizacion')
                        .where('colaboradorId', '==', userData.id)
                        .get();
                    
                    if (!prefsDoc.empty) {
                        const prefsData = prefsDoc.docs[0].data();
                        const preferences = {
                            background: prefsData.preferences?.background || 'light',
                            theme: prefsData.preferences?.theme || 'purple',
                            backgroundImage: prefsData.preferences?.backgroundImage || null
                        };
                        
                        applyCustomStyles(preferences);
                        // Guardar en localStorage para acceso rápido
                        localStorage.setItem('personalizationPreferences', JSON.stringify(preferences));
                        console.log('✅ Preferencias cargadas desde Firebase');
                        return preferences;
                    }
                }
            }
            
            // 3. Usar valores por defecto
            console.log('ℹ️ Usando valores por defecto para personalización');
            applyCustomStyles(personalizationState.preferences);
            return personalizationState.preferences;
            
        } catch (error) {
            console.error('❌ Error al cargar preferencias:', error);
            // En caso de error, usar valores por defecto
            applyCustomStyles(personalizationState.preferences);
            return personalizationState.preferences;
        }
    }

    // Función global para forzar actualización de estilos
    window.actualizarColoresPersonalizados = function(nuevasPreferencias) {
        if (nuevasPreferencias) {
            applyCustomStyles(nuevasPreferencias);
            localStorage.setItem('personalizationPreferences', JSON.stringify(nuevasPreferencias));
            console.log('🔄 Colores actualizados manualmente');
        } else {
            loadPersonalizationPreferences();
        }
    };

    // Función para aplicar solo la imagen de fondo
    window.aplicarImagenFondo = function(backgroundImage) {
        applyBackgroundImage(backgroundImage);
    };

    // Inicializar la carga de colores
    function init() {
        console.log('🎨 Iniciando carga de colores personalizados...');
        
        // Esperar a que el DOM esté listo
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                // Esperar a que Firebase esté listo
                if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
                    loadPersonalizationPreferences();
                } else {
                    // Intentar cada 100ms hasta que Firebase esté listo
                    const checkFirebase = setInterval(() => {
                        if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
                            clearInterval(checkFirebase);
                            loadPersonalizationPreferences();
                        }
                    }, 100);
                }
            });
        } else {
            // DOM ya está listo
            if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
                loadPersonalizationPreferences();
            } else {
                const checkFirebase = setInterval(() => {
                    if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
                        clearInterval(checkFirebase);
                        loadPersonalizationPreferences();
                    }
                }, 100);
            }
        }
        
        // Escuchar cambios de autenticación para actualizar colores
        auth.onAuthStateChanged((user) => {
            if (user) {
                console.log('👤 Usuario autenticado, recargando preferencias...');
                loadPersonalizationPreferences();
            }
        });
    }

    // Iniciar automáticamente
    init();

    console.log('✅ Función de carga de colores personalizados cargada correctamente');

})();
