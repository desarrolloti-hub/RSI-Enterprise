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
            theme: 'purple'
        }
    };

    // Aplicar estilos CSS personalizados
    function applyCustomStyles(preferences) {
        console.log('🎨 Aplicando estilos personalizados:', preferences);
        
        const selectedBackground = backgroundOptions.find(bg => bg.id === preferences.background) || backgroundOptions[0];
        const selectedTheme = themeOptions.find(theme => theme.id === preferences.theme) || themeOptions[0];
        
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
            body {
                background-color: var(--background-color) !important;
                color: var(--text-color) !important;
                transition: background-color 0.3s ease, color 0.3s ease;
            }
            
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
        `;
        
        console.log('✅ Estilos personalizados aplicados correctamente');
    }

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
                        applyCustomStyles(prefsData.preferences);
                        // Guardar en localStorage para acceso rápido
                        localStorage.setItem('personalizationPreferences', JSON.stringify(prefsData.preferences));
                        console.log('✅ Preferencias cargadas desde Firebase');
                        return prefsData.preferences;
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