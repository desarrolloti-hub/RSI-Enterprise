// personalizacion-colores.js - Función autónoma para cargar colores personalizados
(function() {
    'use strict';

    // Configuración de Firebase
    const firebaseConfig = {
        apiKey: "AIzaSyBJy992gkvsT77-_fMp_O_z99wtjZiK77Y",
        authDomain: "rsienterprise.firebaseapp.com",
        projectId: "rsienterprise",
        storageBucket: "rsienterprise.firebasestorage.app",
        messagingSenderId: "1063117165770",
        appId: "1:1063117165770:web:8555f26b25ae80bc42d033"
    };

    // Inicializar Firebase si no está inicializado
    if (typeof firebase === 'undefined') {
        console.error('Firebase no está cargado'); // Solo este error se mantiene porque es crítico
        return;
    }
    
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    
    const auth = firebase.auth();
    const db = firebase.firestore();
    
    // Referencia al documento global de apariencia (logo)
    const globalConfigRef = db.collection('global_config').doc('appearance');
    
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
            // backgroundImage se carga globalmente
        },
        globalBackgroundImage: null,
        unsubscribeGlobal: null
    };

    // Función auxiliar para obtener colores más sutiles
    function getSubtleBackground(baseColor) {
        if (baseColor === '#1a1a1a') return '#2a2a2a';
        if (baseColor === '#808080') return '#909090';
        return '#f0f0f0';
    }

    // Aplicar imagen de fondo global
    function applyBackgroundImage(backgroundImage) {
        const existingBg = document.getElementById('custom-background-image');
        if (existingBg) {
            existingBg.remove();
        }
        
        if (backgroundImage && backgroundImage.startsWith('data:image/')) {
            const bgElement = document.createElement('div');
            bgElement.id = 'custom-background-image';
            bgElement.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 700px;
                height: 700px;
                background-image: url('${backgroundImage}');
                background-size: contain;
                background-position: center;
                background-repeat: no-repeat;
                z-index: -1;
                pointer-events: none;
            `;
            document.body.appendChild(bgElement);
            document.body.style.position = 'relative';
            document.body.style.minHeight = '100vh';
        }
    }

    // Aplicar estilos CSS personalizados (colores + imagen global)
    function applyCustomStyles(preferences) {
        const selectedBackground = backgroundOptions.find(bg => bg.id === preferences.background) || backgroundOptions[0];
        const selectedTheme = themeOptions.find(theme => theme.id === preferences.theme) || themeOptions[0];
        
        // Aplicar imagen global
        if (personalizationState.globalBackgroundImage) {
            applyBackgroundImage(personalizationState.globalBackgroundImage);
        } else {
            const existingBg = document.getElementById('custom-background-image');
            if (existingBg) existingBg.remove();
        }
        
        const styleId = 'personalizacion-colores-styles';
        let styleElement = document.getElementById(styleId);
        
        if (!styleElement) {
            styleElement = document.createElement('style');
            styleElement.id = styleId;
            document.head.appendChild(styleElement);
        }
        
        styleElement.textContent = `
            :root {
                --primary-color: ${selectedTheme.primary};
                --secondary-color: ${selectedTheme.secondary};
                --accent-color: ${selectedTheme.accent};
                --background-color: ${selectedBackground.color};
                --text-color: ${selectedBackground.textColor};
                --card-bg: ${selectedBackground.cardBg};
                --card-shadow: ${selectedBackground.id === 'dark' ? '0 4px 12px rgba(0, 0, 0, 0.3)' : '0 4px 12px rgba(0, 0, 0, 0.1)'};
            }
            
            body {
                background-color: ${getSubtleBackground(selectedBackground.color)} !important;
                color: var(--text-color) !important;
                transition: background-color 0.3s ease, color 0.3s ease;
                position: relative;
                min-height: 100vh;
            }
            
            ${personalizationState.globalBackgroundImage ? `
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
                .card, .panel, .container-custom, .content-box {
                    background-color: ${selectedBackground.cardBg} !important;
                    backdrop-filter: blur(10px);
                }
            ` : ''}
            
            .btn-primary, button[class*="primary"], .primary-button {
                background-color: var(--primary-color) !important;
                border-color: var(--primary-color) !important;
                color: white !important;
            }
            .btn-primary:hover, button[class*="primary"]:hover, .primary-button:hover {
                background-color: var(--secondary-color) !important;
                border-color: var(--secondary-color) !important;
            }
            .btn-secondary, button[class*="secondary"], .secondary-button {
                background-color: var(--accent-color) !important;
                border-color: var(--accent-color) !important;
                color: white !important;
            }
            .card, .panel, .container-custom, .content-box {
                background-color: var(--card-bg) !important;
                color: var(--text-color) !important;
                box-shadow: var(--card-shadow) !important;
            }
            h1, h2, h3, h4, h5, h6 { color: var(--primary-color) !important; }
            a { color: var(--primary-color) !important; }
            a:hover { color: var(--secondary-color) !important; }
            .border-primary, .separator { border-color: var(--primary-color) !important; }
            .alert-info, .message-info {
                background-color: ${selectedTheme.primary}20 !important;
                border-color: var(--primary-color) !important;
                color: var(--text-color) !important;
            }
            .alert-success, .message-success {
                background-color: #d4edda !important;
                border-color: #c3e6cb !important;
                color: #155724 !important;
            }
            .alert-warning, .message-warning {
                background-color: #fff3cd !important;
                border-color: #ffeaa7 !important;
                color: #856404 !important;
            }
            .alert-error, .message-error {
                background-color: #f8d7da !important;
                border-color: #f5c6cb !important;
                color: #721c24 !important;
            }
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
            input, textarea, select {
                background-color: var(--card-bg) !important;
                color: var(--text-color) !important;
                border-color: ${selectedTheme.primary}40 !important;
            }
            input:focus, textarea:focus, select:focus {
                border-color: var(--primary-color) !important;
                box-shadow: 0 0 0 2px ${selectedTheme.primary}20 !important;
            }
            .navbar, .nav-menu {
                background-color: var(--card-bg) !important;
                color: var(--text-color) !important;
            }
            .nav-item.active {
                background-color: var(--primary-color) !important;
                color: white !important;
            }
            .icon-primary { color: var(--primary-color) !important; }
            .icon-secondary { color: var(--secondary-color) !important; }
            .icon-accent { color: var(--accent-color) !important; }
            .badge-primary {
                background-color: var(--primary-color) !important;
                color: white !important;
            }
            .badge-secondary {
                background-color: var(--secondary-color) !important;
                color: white !important;
            }
            ${selectedBackground.id === 'dark' ? `
                .card, .panel { border: 1px solid #444 !important; }
                input, textarea, select { border: 1px solid #555 !important; }
                .table-hover tbody tr:hover { background-color: #333 !important; }
            ` : ''}
            ${selectedBackground.id === 'gray' ? `
                .card, .panel { border: 1px solid #999 !important; }
            ` : ''}

            /* SweetAlert2 personalizado */
            .swal2-popup {
                background: ${selectedBackground.cardBg} !important;
                color: ${selectedBackground.textColor} !important;
                border: 2px solid ${selectedTheme.primary} !important;
                border-radius: 12px !important;
            }
            .swal2-title { color: ${selectedTheme.primary} !important; font-weight: 700 !important; }
            .swal2-confirm {
                background: ${selectedTheme.primary} !important;
                border: 2px solid ${selectedTheme.secondary} !important;
                color: white !important;
                font-weight: 600 !important;
                border-radius: 8px !important;
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
            }
            .swal2-success [class^=swal2-success-line] { background-color: ${selectedTheme.primary} !important; }
            .swal2-icon.swal2-success .swal2-success-ring { border: 4px solid ${selectedTheme.primary}30 !important; }
            .swal2-icon.swal2-error { border-color: ${selectedTheme.primary} !important; }
            .swal2-icon.swal2-error [class^=swal2-x-mark-line] { background-color: ${selectedTheme.primary} !important; }
            .swal2-icon.swal2-info { border-color: ${selectedTheme.primary} !important; color: ${selectedTheme.primary} !important; }
            ${selectedBackground.id === 'dark' ? `
                .swal2-input, .swal2-textarea {
                    background: #333 !important;
                    color: white !important;
                    border: 1px solid #555 !important;
                }
            ` : ''}
        `;
        
        // Configurar SweetAlert2 globalmente
        if (typeof Swal !== 'undefined') {
            Swal.mixin({
                background: selectedBackground.cardBg,
                color: selectedBackground.textColor,
                confirmButtonColor: selectedTheme.primary,
                cancelButtonColor: selectedBackground.id === 'dark' ? '#555' : '#6c757d'
            });
        }
    }

    // Listener en tiempo real para la imagen global
    function listenGlobalBackgroundImage() {
        if (personalizationState.unsubscribeGlobal) {
            personalizationState.unsubscribeGlobal();
        }
        personalizationState.unsubscribeGlobal = globalConfigRef.onSnapshot((doc) => {
            personalizationState.globalBackgroundImage = doc.exists && doc.data().backgroundImage ? doc.data().backgroundImage : null;
            // Reaplicar estilos (para actualizar la imagen en el DOM)
            const savedPrefs = localStorage.getItem('personalizationPreferences');
            const preferences = savedPrefs ? JSON.parse(savedPrefs) : personalizationState.preferences;
            applyCustomStyles(preferences);
        }, (error) => {
            // Silenciamos el error
        });
    }

    // Función auxiliar para cargar perfil de usuario
    async function loadUserProfile() {
        const user = auth.currentUser;
        if (!user) return null;
        try {
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
                return { id: user.uid, nombre: user.email, area: 'Usuario no registrado', correoEmpresarial: user.email };
            }
        } catch (error) {
            return null;
        }
    }

    // Cargar preferencias personales (colores/tema) desde localStorage y Firestore
    async function loadPersonalizationPreferences() {
        let preferences = { background: 'light', theme: 'purple' };
        
        // 1. LocalStorage
        const savedPrefs = localStorage.getItem('personalizationPreferences');
        if (savedPrefs) {
            try {
                const prefs = JSON.parse(savedPrefs);
                if (prefs.background) preferences.background = prefs.background;
                if (prefs.theme) preferences.theme = prefs.theme;
            } catch(e) {}
        }
        
        // 2. Firebase (si autenticado)
        const user = auth.currentUser;
        if (user) {
            const userData = await loadUserProfile();
            if (userData) {
                try {
                    const prefsDoc = await db.collection('personalizacion')
                        .where('colaboradorId', '==', userData.id)
                        .get();
                    if (!prefsDoc.empty) {
                        const data = prefsDoc.docs[0].data();
                        if (data.preferences) {
                            if (data.preferences.background) preferences.background = data.preferences.background;
                            if (data.preferences.theme) preferences.theme = data.preferences.theme;
                        }
                    }
                } catch(e) {}
            }
        }
        
        // Guardar en localStorage para futuras visitas
        localStorage.setItem('personalizationPreferences', JSON.stringify(preferences));
        personalizationState.preferences = preferences;
        applyCustomStyles(preferences);
    }

    // Función global para forzar actualización de estilos (útil después de guardar)
    window.actualizarColoresPersonalizados = function(nuevasPreferencias) {
        if (nuevasPreferencias) {
            personalizationState.preferences = {
                background: nuevasPreferencias.background || personalizationState.preferences.background,
                theme: nuevasPreferencias.theme || personalizationState.preferences.theme
            };
            localStorage.setItem('personalizationPreferences', JSON.stringify(personalizationState.preferences));
            applyCustomStyles(personalizationState.preferences);
        } else {
            loadPersonalizationPreferences();
        }
    };

    // Función para aplicar imagen de fondo manualmente (para la página de personalización)
    window.aplicarImagenFondo = function(backgroundImage) {
        personalizationState.globalBackgroundImage = backgroundImage;
        const savedPrefs = localStorage.getItem('personalizationPreferences');
        const preferences = savedPrefs ? JSON.parse(savedPrefs) : personalizationState.preferences;
        applyCustomStyles(preferences);
    };

    // Funciones de SweetAlert personalizadas
    window.showCustomAlert = function(config) {
        if (typeof Swal === 'undefined') return Promise.resolve(false);
        const savedPrefs = localStorage.getItem('personalizationPreferences');
        const prefs = savedPrefs ? JSON.parse(savedPrefs) : personalizationState.preferences;
        const bg = backgroundOptions.find(b => b.id === prefs.background) || backgroundOptions[0];
        const theme = themeOptions.find(t => t.id === prefs.theme) || themeOptions[0];
        return Swal.fire({
            background: bg.cardBg,
            color: bg.textColor,
            confirmButtonColor: theme.primary,
            cancelButtonColor: bg.id === 'dark' ? '#555' : '#6c757d',
            iconColor: theme.primary,
            ...config
        });
    };
    window.showCustomConfirm = function(title, text, confirmButtonText = 'Confirmar', cancelButtonText = 'Cancelar') {
        return window.showCustomAlert({
            title, text, icon: 'question', showCancelButton: true,
            confirmButtonText, cancelButtonText
        });
    };
    window.showCustomSuccess = function(title, text, confirmButtonText = 'OK') {
        return window.showCustomAlert({ title, text, icon: 'success', confirmButtonText });
    };
    window.showCustomError = function(title, text, confirmButtonText = 'OK') {
        return window.showCustomAlert({ title, text, icon: 'error', confirmButtonText });
    };
    window.showCustomWarning = function(title, text, confirmButtonText = 'Entendido') {
        return window.showCustomAlert({ title, text, icon: 'warning', confirmButtonText });
    };

    // Inicialización
    function init() {
        const doLoad = () => {
            loadPersonalizationPreferences();
            listenGlobalBackgroundImage();
        };
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', doLoad);
        } else {
            doLoad();
        }
        
        auth.onAuthStateChanged(() => {
            loadPersonalizationPreferences();
        });
    }
    
    init();
})();