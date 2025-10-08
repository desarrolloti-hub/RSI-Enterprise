// navegacion-admin.js - Función autónoma COMPLETA con iconos, gráficas y personalización ACTUALIZADA
(function() {
    'use strict';
    
    // Agregar FontAwesome CDN si no existe
    function loadFontAwesome() {
        if (!document.querySelector('link[href*="font-awesome"]')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css';
            document.head.appendChild(link);
        }
    }
    
    // Esperar a que todo esté listo
    function init() {
        // Verificar que Firebase esté disponible
        if (typeof firebase === 'undefined' || !firebase.apps.length) {
            console.error('Firebase no está disponible');
            return;
        }
        
        const auth = firebase.auth();
        const db = firebase.firestore();
        
        // Estado del menú
        const menuState = {
            currentUser: null,
            userData: null,
            stats: {
                total: 0,
                pendiente: 0,
                en_proceso: 0,
                finalizado: 0,
                cancelado: 0,
                alta: 0,
                media: 0,
                baja: 0
            }
        };
        
        // Agregar estilos CORREGIDOS
        function addMenuStyles() {
            const style = document.createElement('style');
            style.textContent = `
                /* ESTILOS CORREGIDOS - SIN SCROLL HORIZONTAL Y RESPONSIVE COMPLETO */
                
                /* Reset para evitar scroll horizontal */
                body {
                    margin: 0;
                    padding: 0;
                    overflow-x: hidden;
                }
                
                .menu-nav-sidebar {
                    position: fixed;
                    top: 0;
                    left: -100%;
                    width: 100%;
                    height: 100vh;
                    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                    color: white;
                    transition: left 0.3s ease;
                    z-index: 1000;
                    overflow-y: auto;
                    overflow-x: hidden;
                    box-shadow: 2px 0 10px rgba(0,0,0,0.3);
                    font-family: 'Inter', sans-serif;
                }
                
                .menu-nav-sidebar.active {
                    left: 0;
                }
                
                .menu-nav-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0,0,0,0.5);
                    z-index: 999;
                    display: none;
                }
                
                .menu-nav-overlay.active {
                    display: none;
                }
                
                .menu-nav-floating-btn {
                    position: fixed;
                    top: 20px;
                    left: 20px;
                    width: 50px;
                    height: 50px;
                    background: #6C43E0;
                    color: white;
                    border: none;
                    border-radius: 50%;
                    cursor: pointer;
                    z-index: 1001;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 4px 12px rgba(108, 67, 224, 0.4);
                    transition: all 0.3s ease;
                }
                
                .menu-nav-floating-btn:hover {
                    background: #5a35c7;
                    transform: scale(1.05);
                }
                
                .menu-nav-floating-btn i {
                    font-size: 1.2rem;
                    transition: transform 0.3s ease;
                }
                
                .menu-nav-user-profile {
                    padding: 30px 20px;
                    text-align: center;
                    border-bottom: 1px solid rgba(255,255,255,0.1);
                    max-width: 100%;
                    box-sizing: border-box;
                }
                
                .menu-nav-user-avatar {
                    width: 80px;
                    height: 80px;
                    border-radius: 50%;
                    object-fit: cover;
                    border: 3px solid #6C43E0;
                    margin-bottom: 15px;
                    max-width: 100%;
                }
                
                .menu-nav-user-name {
                    font-size: 1.2rem;
                    font-weight: 600;
                    margin-bottom: 5px;
                    word-wrap: break-word;
                    padding: 0 10px;
                }
                
                .menu-nav-user-area {
                    font-size: 0.9rem;
                    color: #a0a0c0;
                    margin-bottom: 0;
                    word-wrap: break-word;
                    padding: 0 10px;
                }
                
                .menu-nav-stats-container {
                    padding: 20px;
                    border-bottom: 1px solid rgba(255,255,255,0.1);
                    max-width: 100%;
                    box-sizing: border-box;
                }
                
                .menu-nav-stat-card {
                    background: rgba(255,255,255,0.05);
                    border-radius: 8px;
                    padding: 15px;
                    margin-bottom: 12px;
                    transition: all 0.3s ease;
                    max-width: 100%;
                    box-sizing: border-box;
                }
                
                .menu-nav-stat-card:hover {
                    background: rgba(255,255,255,0.1);
                    transform: translateY(-2px);
                }
                
                .menu-nav-stat-title {
                    display: flex;
                    align-items: center;
                    margin-bottom: 8px;
                    font-size: 0.85rem;
                    color: #a0a0c0;
                    flex-wrap: wrap;
                }
                
                .menu-nav-stat-title i {
                    margin-right: 8px;
                    font-size: 0.9rem;
                    flex-shrink: 0;
                }
                
                .menu-nav-stat-value {
                    font-size: 1.5rem;
                    font-weight: 700;
                    color: white;
                    word-wrap: break-word;
                }
                
                .menu-nav-month-indicator {
                    text-align: center;
                    font-size: 0.8rem;
                    color: #6C43E0;
                    margin-bottom: 15px;
                    font-weight: 500;
                    padding: 0 10px;
                }
                
                /* ESTILOS PARA GRÁFICAS */
                .menu-nav-charts-container {
                    padding: 20px;
                    border-bottom: 1px solid rgba(255,255,255,0.1);
                    max-width: 100%;
                    box-sizing: border-box;
                }
                
                .menu-nav-chart-title {
                    text-align: center;
                    font-size: 0.9rem;
                    color: #6C43E0;
                    margin-bottom: 15px;
                    font-weight: 500;
                }
                
                .menu-nav-chart {
                    background: rgba(255,255,255,0.05);
                    border-radius: 8px;
                    padding: 15px;
                    margin-bottom: 15px;
                    max-width: 100%;
                    box-sizing: border-box;
                }
                
                .menu-nav-chart-bars {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
                
                .menu-nav-chart-bar {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                
                .menu-nav-chart-label {
                    font-size: 0.8rem;
                    color: #a0a0c0;
                    width: 80px;
                    flex-shrink: 0;
                }
                
                .menu-nav-chart-progress {
                    flex: 1;
                    height: 20px;
                    background: rgba(255,255,255,0.1);
                    border-radius: 10px;
                    overflow: hidden;
                    position: relative;
                }
                
                .menu-nav-chart-fill {
                    height: 100%;
                    border-radius: 10px;
                    transition: width 0.5s ease;
                }
                
                .menu-nav-chart-value {
                    font-size: 0.8rem;
                    color: white;
                    width: 30px;
                    text-align: right;
                    flex-shrink: 0;
                }
                
                .menu-nav-buttons-container {
                    padding: 20px;
                    max-width: 100%;
                    box-sizing: border-box;
                }
                
                .menu-nav-btn {
                    display: flex;
                    align-items: center;
                    width: 100%;
                    padding: 12px 15px;
                    margin-bottom: 10px;
                    background: rgba(255,255,255,0.05);
                    color: white;
                    text-decoration: none;
                    border: none;
                    border-radius: 8px;
                    cursor: button;
                    transition: all 0.3s ease;/* ==============================================
   editar-ticket.css - Estilos para Finalizar Ticket
   (CORREGIDO: Estilo del botón CANCELAR mejorado)
   ==============================================
   Utiliza variables CSS inyectadas por personalizacion-colores.js:
   --primary-color, --text-color, --card-bg, --card-shadow, --accent-color
   ============================================== */

/* 1. Base y Resets */
body {
    font-family: 'Inter', sans-serif; /* Asumiendo una fuente moderna */
    margin: 0;
    padding: 0;
    /* Las variables se aplican aquí desde personalizacion-colores.js */
    background-color: var(--background-color, #f5f5f5);
    color: var(--text-color, #333);
    line-height: 1.6;
    min-height: 100vh;
    display: flex;
    justify-content: center;
    align-items: flex-start; /* Alinear arriba en lugar de centrar verticalmente */
    padding: 20px;
}

* {
    box-sizing: border-box;
}

/* 2. Estructura principal */
.container {
    width: 100%;
    max-width: 900px; /* Ancho máximo para el contenido principal */
    background-color: transparent; /* El fondo lo maneja el body/tarjeta */
    padding: 0;
    margin-top: 50px; /* Espacio para el botón flotante del menú */
}

/* 3. Encabezado y Botón de Regreso */
.header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 25px;
    padding: 0 10px;
    flex-wrap: wrap; /* Para responsividad */
}

.header h1 {
    font-size: 1.8rem;
    color: var(--primary-color, #6C43E0);
    font-weight: 700;
    margin: 0;
    padding: 5px 0;
}

.back-btn {
    display: inline-flex;
    align-items: center;
    padding: 8px 15px;
    background-color: var(--card-bg, #ffffff);
    color: var(--text-color, #333) !important;
    border: 1px solid var(--accent-color, #ccc);
    border-radius: 6px;
    text-decoration: none;
    font-size: 0.9rem;
    transition: all 0.3s ease;
    box-shadow: var(--card-shadow-subtle, 0 1px 3px rgba(0, 0, 0, 0.1));
}

.back-btn i {
    margin-right: 8px;
    color: var(--primary-color, #6C43E0);
}

.back-btn:hover {
    background-color: var(--primary-color, #6C43E0);
    color: white !important;
    border-color: var(--primary-color, #6C43E0);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    transform: translateY(-2px);
}

.back-btn:hover i {
    color: white;
}

/* 4. Contenedor Principal del Formulario y Tarjetas */
.finish-ticket-container {
    display: flex;
    flex-direction: column;
    gap: 25px;
}

/* 5. Tarjeta de Información del Ticket */
.ticket-info-card {
    background-color: var(--card-bg, #ffffff);
    padding: 25px;
    border-radius: 12px;
    box-shadow: var(--card-shadow, 0 4px 12px rgba(0, 0, 0, 0.1));
    border: 1px solid rgba(108, 67, 224, 0.1);
}

.ticket-info-card h3 {
    margin-top: 0;
    margin-bottom: 15px;
    color: var(--primary-color, #6C43E0);
    border-bottom: 2px solid var(--accent-color, #6C43E0);
    padding-bottom: 5px;
    font-size: 1.2rem;
}

.ticket-info-card p {
    margin: 8px 0;
    font-size: 1rem;
    color: var(--text-color, #444);
}

.ticket-info-card strong {
    color: var(--primary-color, #6C43E0);
    font-weight: 600;
}

/* 6. Formulario de Finalización */
.finish-form {
    background-color: var(--card-bg, #ffffff);
    padding: 25px;
    border-radius: 12px;
    box-shadow: var(--card-shadow, 0 4px 12px rgba(0, 0, 0, 0.1));
    border: 1px solid rgba(108, 67, 224, 0.1);
}

.form-group {
    margin-bottom: 20px;
}

.form-group label {
    display: block;
    margin-bottom: 8px;
    font-weight: 600;
    color: var(--primary-color, #6C43E0);
    font-size: 1rem;
    display: flex;
    align-items: center;
}

.form-group label i {
    margin-right: 8px;
}

.form-control {
    width: 100%;
    padding: 12px;
    border: 1px solid var(--accent-color, #ced4da);
    border-radius: 8px;
    font-size: 1rem;
    color: var(--text-color, #333);
    background-color: var(--card-bg, #fff);
    transition: border-color 0.3s, box-shadow 0.3s;
    resize: vertical;
}

.form-control:focus {
    border-color: var(--primary-color, #6C43E0);
    outline: none;
    box-shadow: 0 0 0 3px var(--primary-color, #6C43E0)30;
}

/* Contador de caracteres */
.char-counter {
    text-align: right;
    font-size: 0.85rem;
    color: var(--accent-color, #6c757d);
    margin-top: 5px;
}

.char-counter span {
    font-weight: bold;
}

/* 7. Botones de Acción */
.form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 15px;
    margin-top: 25px;
}

.action-btn {
    padding: 12px 25px;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 700;
    font-size: 1rem;
    transition: all 0.3s ease;
    display: inline-flex;
    align-items: center;
}

.action-btn i {
    margin-right: 8px;
}

.confirm-btn {
    /* Estilo para Guardar/Confirmar (usa color primario) */
    background-color: var(--primary-color, #6C43E0) !important;
    color: white !important;
    box-shadow: 0 4px 10px var(--primary-color, #6C43E0)40;
}

.confirm-btn:hover {
    background-color: var(--secondary-color, #5a35c7) !important;
    transform: translateY(-2px);
}

.cancel-btn {
    /* ESTILO CORREGIDO PARA CANCELAR (usa color neutro con borde primario) */
    background-color: var(--card-bg, #ffffff) !important;
    color: var(--text-color, #495057) !important;
    border: 2px solid var(--primary-color, #6C43E0) !important;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.cancel-btn:hover {
    /* Hover más sutil para no competir con el botón principal */
    background-color: var(--primary-color, #6C43E0)10 !important; /* Ligeramente más claro/oscuro */
    color: var(--primary-color, #6C43E0) !important;
    transform: translateY(-1px);
}

/* 8. Estilos de Previsualización de Imágenes */
.image-preview-container {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 15px;
    padding: 10px;
    border: 1px dashed var(--accent-color, #ced4da);
    border-radius: 8px;
}

.image-preview-item {
    position: relative;
    width: 100px;
    height: 100px;
    border: 2px solid var(--primary-color, #6C43E0);
    border-radius: 6px;
    overflow: hidden;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

.image-preview-item img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.delete-image-btn {
    position: absolute;
    top: 5px;
    right: 5px;
    background-color: rgba(220, 53, 69, 0.8);
    color: white;
    border: none;
    border-radius: 50%;
    width: 25px;
    height: 25px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 0.7rem;
    transition: background-color 0.2s;
    opacity: 0.9;
}

.delete-image-btn:hover {
    background-color: #dc3545;
    opacity: 1;
}

/* 9. Modal del Visor de Imágenes */
.modal {
    display: none; /* Oculto por defecto */
    position: fixed;
    z-index: 2000; /* Asegurar que esté por encima de todo */
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    overflow: auto;
    background-color: rgba(0, 0, 0, 0.85); /* Fondo muy oscuro */
    justify-content: center;
    align-items: center;
}

.modal-content {
    margin: auto;
    display: block;
    width: 80%;
    max-width: 700px;
}

.close {
    position: absolute;
    top: 15px;
    right: 35px;
    color: #f1f1f1;
    font-size: 40px;
    font-weight: bold;
    transition: 0.3s;
}

.close:hover,
.close:focus {
    color: #bbb;
    text-decoration: none;
    cursor: pointer;
}

/* 10. Estilos Responsivos */
@media (max-width: 768px) {
    .container {
        padding: 0 10px;
        margin-top: 70px; /* Más espacio para el botón flotante en móvil */
    }
    
    .header {
        flex-direction: column;
        align-items: flex-start;
    }
    
    .header h1 {
        font-size: 1.5rem;
        margin-bottom: 15px;
    }
    
    .finish-ticket-container {
        gap: 15px;
    }

    .ticket-info-card,
    .finish-form {
        padding: 20px;
        border-radius: 10px;
    }
    
    .form-actions {
        flex-direction: column-reverse; /* Pone Confirmar/Guardar arriba */
        gap: 10px;
    }

    .action-btn {
        width: 100%;
        justify-content: center;
        padding: 15px 20px;
    }
    
    .image-preview-container {
        justify-content: center;
    }
}

@media (max-width: 480px) {
    .ticket-info-card,
    .finish-form {
        padding: 15px;
    }
    
    .header h1 {
        font-size: 1.3rem;
    }

    .back-btn {
        padding: 6px 10px;
        font-size: 0.85rem;
    }

    .form-group label {
        font-size: 0.95rem;
    }

    .form-control {
        padding: 10px;
        font-size: 0.95rem;
    }
    
    .char-counter {
        font-size: 0.8rem;
    }
    
    .image-preview-item {
        width: 80px;
        height: 80px;
    }
}cerr
                    font-family: inherit;
                    font-size: 0.95rem;
                    box-sizing: border-box;
                    word-wrap: break-word;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                
                .menu-nav-btn:hover {
                    background: rgba(108, 67, 224, 0.2);
                    transform: translateX(5px);
                }
                
                .menu-nav-btn i {
                    margin-right: 10px;
                    width: 20px;
                    text-align: center;
                    flex-shrink: 0;
                }
                
                .menu-nav-btn-logout {
                    background: rgba(220, 53, 69, 0.2);
                    margin-top: 20px;
                }
                
                .menu-nav-btn-logout:hover {
                    background: rgba(220, 53, 69, 0.4);
                }
                
                .menu-nav-btn-finish {
                    background: rgba(255, 193, 7, 0.2);
                    margin-top: 10px;
                }
                
                .menu-nav-btn-finish:hover {
                    background: rgba(255, 193, 7, 0.4);
                }
                
                /* RESPONSIVE PARA ESCRITORIO */
                @media (min-width: 769px) {
                    .menu-nav-sidebar {
                        width: 320px;
                        left: -320px;
                    }
                    
                    .menu-nav-floating-btn {
                        top: 20px;
                        left: 20px;
                        width: 50px;
                        height: 50px;
                    }
                }
                
                /* RESPONSIVE PARA TABLETS */
                @media (max-width: 768px) and (min-width: 481px) {
                    .menu-nav-sidebar {
                        width: 100%;
                        left: -100%;
                    }
                    
                    .menu-nav-floating-btn {
                        top: 15px;
                        left: 15px;
                        width: 45px;
                        height: 45px;
                    }
                    
                    .menu-nav-user-profile {
                        padding: 25px 15px;
                    }
                    
                    .menu-nav-stats-container {
                        padding: 15px;
                    }
                    
                    .menu-nav-charts-container {
                        padding: 15px;
                    }
                    
                    .menu-nav-buttons-container {
                        padding: 15px;
                    }
                }
                
                /* RESPONSIVE PARA MÓVILES */
                @media (max-width: 480px) {
                    .menu-nav-sidebar {
                        width: 100%;
                        left: -100%;
                    }
                    
                    .menu-nav-floating-btn {
                        top: 10px;
                        left: 10px;
                        width: 40px;
                        height: 40px;
                    }
                    
                    .menu-nav-user-profile {
                        padding: 20px 10px;
                    }
                    
                    .menu-nav-user-avatar {
                        width: 70px;
                        height: 70px;
                    }
                    
                    .menu-nav-user-name {
                        font-size: 1.1rem;
                    }
                    
                    .menu-nav-user-area {
                        font-size: 0.8rem;
                    }
                    
                    .menu-nav-stats-container {
                        padding: 10px;
                    }
                    
                    .menu-nav-stat-card {
                        padding: 12px;
                    }
                    
                    .menu-nav-stat-value {
                        font-size: 1.3rem;
                    }
                    
                    .menu-nav-charts-container {
                        padding: 10px;
                    }
                    
                    .menu-nav-chart {
                        padding: 12px;
                    }
                    
                    .menu-nav-buttons-container {
                        padding: 10px;
                    }
                    
                    .menu-nav-btn {
                        padding: 10px 12px;
                        font-size: 0.9rem;
                    }
                    
                    .menu-nav-month-indicator {
                        font-size: 0.75rem;
                    }
                    
                    .menu-nav-chart-title {
                        font-size: 0.8rem;
                    }
                }
                
                /* RESPONSIVE EXTREMO PARA PANTALLAS MUY PEQUEÑAS */
                @media (max-width: 320px) {
                    .menu-nav-user-avatar {
                        width: 60px;
                        height: 60px;
                    }
                    
                    .menu-nav-user-name {
                        font-size: 1rem;
                    }
                    
                    .menu-nav-stat-value {
                        font-size: 1.2rem;
                    }
                    
                    .menu-nav-btn {
                        font-size: 0.85rem;
                        padding: 8px 10px;
                    }
                    
                    .menu-nav-btn i {
                        margin-right: 8px;
                        font-size: 0.9rem;
                    }
                    
                    .menu-nav-chart-label {
                        width: 70px;
                        font-size: 0.75rem;
                    }
                }
                
                /* Prevenir scroll horizontal en todo el documento */
                html, body {
                    max-width: 100%;
                    overflow-x: hidden;
                }
                
                * {
                    box-sizing: border-box;
                }
            `;
            document.head.appendChild(style);
        }
        
        // Crear HTML del menú CON ICONOS Y GRÁFICAS
        function createMenuHTML() {
            // Overlay
            const overlay = document.createElement('div');
            overlay.className = 'menu-nav-overlay';
            overlay.id = 'menuNavOverlay';
            
            // Botón flotante CON ÍCONO DINÁMICO
            const floatingBtn = document.createElement('button');
            floatingBtn.className = 'menu-nav-floating-btn';
            floatingBtn.id = 'menuNavFloatingBtn';
            floatingBtn.innerHTML = '<i class="fas fa-bars"></i>';
            
            // Sidebar
            const sidebar = document.createElement('div');
            sidebar.className = 'menu-nav-sidebar';
            sidebar.id = 'menuNavSidebar';
            
            sidebar.innerHTML = `
                <div class="menu-nav-user-profile">
                    <img src="../css/img/Logo-RSI-OFICIAL.png" alt="Foto de perfil" class="menu-nav-user-avatar" id="menuNavUserAvatar">
                    <h2 class="menu-nav-user-name" id="menuNavUserName">Cargando...</h2>
                    <p class="menu-nav-user-area" id="menuNavUserArea">Cargando área...</p>
                </div>
                
                <div class="menu-nav-stats-container">
                    <div class="menu-nav-month-indicator" id="menuNavMonthIndicator">Mis Estadísticas</div>
                    
                    <div class="menu-nav-stat-card">
                        <div class="menu-nav-stat-title">
                            <i class="fas fa-ticket-alt"></i>
                            <span>Total Tickets</span>
                        </div>
                        <div class="menu-nav-stat-value" id="menuNavTotalTickets">0</div>
                    </div>
                    <div class="menu-nav-stat-card">
                        <div class="menu-nav-stat-title">
                            <i class="fas fa-clock"></i>
                            <span>Pendientes</span>
                        </div>
                        <div class="menu-nav-stat-value" id="menuNavPendingTickets">0</div>
                    </div>
                    <div class="menu-nav-stat-card">
                        <div class="menu-nav-stat-title">
                            <i class="fas fa-spinner"></i>
                            <span>En Proceso</span>
                        </div>
                        <div class="menu-nav-stat-value" id="menuNavInProgressTickets">0</div>
                    </div>
                    <div class="menu-nav-stat-card">
                        <div class="menu-nav-stat-title">
                            <i class="fas fa-check-circle"></i>
                            <span>Finalizados</span>
                        </div>
                        <div class="menu-nav-stat-value" id="menuNavCompletedTickets">0</div>
                    </div>
                </div>
                
                <div class="menu-nav-charts-container">
                    <div class="menu-nav-chart-title">Estado de mis tickets</div>
                    
                    <div class="menu-nav-chart">
                        <div class="menu-nav-chart-bars" id="menuNavChartBars">
                            <!-- Las barras se generarán dinámicamente -->
                        </div>
                    </div>
                    
                    <div class="menu-nav-chart-title">Tickets por Prioridad</div>
                    
                    <div class="menu-nav-chart">
                        <div class="menu-nav-chart-bars" id="menuNavPriorityBars">
                            <!-- Las barras de prioridad se generarán dinámicamente -->
                        </div>
                    </div>
                </div>
                
                <div class="menu-nav-buttons-container">
                    
                  
                    <a href="../gestion-tickets/gestion-tickets.html" class="menu-nav-btn">
                        <i class="fas fa-ticket-alt"></i>  Ver Mis Tickets
                    </a>
                    
                    <a href="../personalizar-interfaz/personalizar-interfaz.html" class="menu-nav-btn">
                        <i class="fas fa-palette"></i> Personalizar Interfaz
                    </a>
                    
                    <a href="../Rembolsos/rembolso.html" class="menu-nav-btn">
                        <i class="fas fa-money-bill-transfer"></i> Reembolsos
                    </a>

                    <a href="../fin-asistencia/fin-asistencia.html" class="menu-nav-btn">
                        <i class="fas fa-flag-checkered"></i> Terminar Asistencia
                    </a>
                    
                    <button class="menu-nav-btn menu-nav-btn-logout" id="menuNavLogoutBtn">
                        <i class="fas fa-sign-out-alt"></i> Cerrar Sesión
                    </button>
                </div>
            `;
            
            document.body.appendChild(overlay);
            document.body.appendChild(floatingBtn);
            document.body.appendChild(sidebar);
        }
        
        // Cargar datos del usuario
        async function loadUserProfile() {
            try {
                const user = auth.currentUser;
                if (!user) {
                    console.log('No hay usuario autenticado');
                    return;
                }
                
                console.log('🔍 Buscando usuario en colaboradores con email:', user.email);
                
                // BUSCAR EXCLUSIVAMENTE EN LA COLECCIÓN "colaboradores"
                const colaboradorQuery = await db.collection("colaboradores")
                    .where("CORREO ELECTRÓNICO EMPRESARIAL", "==", user.email)
                    .get();
                
                console.log('📊 Resultados de la búsqueda:', {
                    encontrados: !colaboradorQuery.empty,
                    cantidad: colaboradorQuery.size
                });
                
                if (!colaboradorQuery.empty) {
                    const doc = colaboradorQuery.docs[0];
                    const userData = doc.data();
                    
                    console.log('✅ Datos encontrados en colaboradores:', {
                        id: doc.id,
                        nombre: userData.NOMBRE,
                        area: userData.ÁREA,
                        correoEmpresarial: userData["CORREO ELECTRÓNICO EMPRESARIAL"],
                        correoPersonal: userData["CORREO ELECTRÓNICO PERSONAL"]
                    });
                    
                    menuState.currentUser = user;
                    menuState.userData = {
                        id: doc.id,
                        nombre: userData.NOMBRE || 'Usuario',
                        area: userData.ÁREA || 'Sin área',
                        imagen: userData.imagen || '../css/img/Logo-RSI-OFICIAL.png',
                        correoEmpresarial: userData["CORREO ELECTRÓNICO EMPRESARIAL"],
                        correoPersonal: userData["CORREO ELECTRÓNICO PERSONAL"],
                        nombreCompleto: userData.NOMBRE,
                        colaboradorId: doc.id
                    };
                    
                    // Actualizar UI
                    document.getElementById('menuNavUserAvatar').src = menuState.userData.imagen;
                    document.getElementById('menuNavUserName').textContent = menuState.userData.nombre;
                    document.getElementById('menuNavUserArea').textContent = menuState.userData.area;
                    
                } else {
                    console.log('❌ Usuario NO encontrado en colaboradores');
                    
                    // Usuario no encontrado - mostrar información básica
                    menuState.currentUser = user;
                    menuState.userData = {
                        id: user.uid,
                        nombre: user.email,
                        area: 'Usuario no registrado',
                        imagen: '../css/img/Logo-RSI-OFICIAL.png',
                        nombreCompleto: user.email,
                        colaboradorId: user.uid
                    };
                    
                    document.getElementById('menuNavUserName').textContent = menuState.userData.nombre;
                    document.getElementById('menuNavUserArea').textContent = menuState.userData.area;
                    document.getElementById('menuNavUserAvatar').src = menuState.userData.imagen;
                    
                    console.warn('⚠️ El usuario no está registrado en la colección "colaboradores"');
                }
                
            } catch (error) {
                console.error("❌ Error al cargar perfil:", error);
                
                // En caso de error, mostrar información básica
                const user = auth.currentUser;
                if (user) {
                    document.getElementById('menuNavUserName').textContent = user.email;
                    document.getElementById('menuNavUserArea').textContent = 'Error al cargar datos';
                }
            }
        }
        
        // Crear gráficas de barras
        function createCharts(stats) {
            const chartBars = document.getElementById('menuNavChartBars');
            const priorityBars = document.getElementById('menuNavPriorityBars');
            
            if (!chartBars || !priorityBars) return;
            
            // Colores para las gráficas
            const statusColors = {
                'pendiente': '#ff6b6b',
                'en_proceso': '#ffd93d',
                'finalizado': '#6bcf7f',
                'cancelado': '#a0a0c0'
            };
            
            const priorityColors = {
                'alta': '#ff6b6b',
                'media': '#ffd93d',
                'baja': '#6bcf7f'
            };
            
            // Calcular total para porcentajes
            const totalTickets = stats.total || 1;
            
            // Gráfica de estado de tickets
            chartBars.innerHTML = '';
            const statusData = {
                'pendiente': stats.pendiente,
                'en_proceso': stats.en_proceso,
                'finalizado': stats.finalizado
            };
            
            Object.entries(statusData).forEach(([status, count]) => {
                if (count > 0) {
                    const percentage = Math.round((count / totalTickets) * 100);
                    const color = statusColors[status] || '#6C43E0';
                    
                    const barHtml = `
                        <div class="menu-nav-chart-bar">
                            <span class="menu-nav-chart-label">${formatStatus(status)}</span>
                            <div class="menu-nav-chart-progress">
                                <div class="menu-nav-chart-fill" 
                                     style="width: ${percentage}%; background: ${color};">
                                </div>
                            </div>
                            <span class="menu-nav-chart-value">${percentage}%</span>
                        </div>
                    `;
                    chartBars.innerHTML += barHtml;
                }
            });
            
            // Gráfica de prioridad con datos reales
            priorityBars.innerHTML = '';
            const priorityData = {
                'alta': stats.alta,
                'media': stats.media,
                'baja': stats.baja
            };
            
            Object.entries(priorityData).forEach(([priority, count]) => {
                if (count > 0) {
                    const percentage = Math.round((count / totalTickets) * 100);
                    const color = priorityColors[priority] || '#6C43E0';
                    
                    const barHtml = `
                        <div class="menu-nav-chart-bar">
                            <span class="menu-nav-chart-label">${priority.charAt(0).toUpperCase() + priority.slice(1)}</span>
                            <div class="menu-nav-chart-progress">
                                <div class="menu-nav-chart-fill" 
                                     style="width: ${percentage}%; background: ${color};">
                                </div>
                            </div>
                            <span class="menu-nav-chart-value">${percentage}%</span>
                        </div>
                    `;
                    priorityBars.innerHTML += barHtml;
                }
            });
        }
        
        // Función auxiliar para formatear estados
        function formatStatus(status) {
            const statusMap = {
                'pendiente': 'Pendientes',
                'en_proceso': 'En Proceso',
                'finalizado': 'Finalizados',
                'cancelado': 'Cancelados'
            };
            return statusMap[status] || status;
        }
        
        // Obtener rango de fechas del mes actual
        function getCurrentMonthRange() {
            const now = new Date();
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
            const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            
            // Ajustar para incluir todo el día
            firstDay.setHours(0, 0, 0, 0);
            lastDay.setHours(23, 59, 59, 999);
            
            return { firstDay, lastDay };
        }
        
        // Cargar estadísticas del usuario POR MES ACTUAL
        async function loadUserStats() {
            try {
                if (!menuState.userData || !menuState.userData.nombreCompleto) {
                    console.log('Esperando datos del usuario...');
                    return;
                }
                
                console.log('📊 Cargando estadísticas del mes actual para:', menuState.userData.nombreCompleto);
                
                // Obtener rango del mes actual
                const { firstDay, lastDay } = getCurrentMonthRange();
                
                console.log('📅 Rango del mes:', {
                    desde: firstDay.toLocaleDateString('es-MX'),
                    hasta: lastDay.toLocaleDateString('es-MX')
                });
                
                // Consultar tickets del usuario (como responsable o colaborador) DEL MES ACTUAL
                const ticketsRef = db.collection('ticketsmesa');
                const nombreResponsable = menuState.userData.nombreCompleto;
                const colaboradorId = menuState.userData.colaboradorId;
                
                // Ejecutar ambas consultas con filtro por fecha
                const qResponsable = ticketsRef
                    .where("responsableNombre", "==", nombreResponsable)
                    .where("fechaCreacion", ">=", firstDay)
                    .where("fechaCreacion", "<=", lastDay);
                
                const qColaborador = ticketsRef
                    .where("colaboradores", "array-contains", colaboradorId)
                    .where("fechaCreacion", ">=", firstDay)
                    .where("fechaCreacion", "<=", lastDay);
                
                const [snapshotResponsable, snapshotColaborador] = await Promise.all([
                    qResponsable.get(),
                    qColaborador.get()
                ]);
                
                // Combinar resultados evitando duplicados
                const allTickets = new Map();
                
                snapshotResponsable.forEach(doc => {
                    allTickets.set(doc.id, doc.data());
                });
                
                snapshotColaborador.forEach(doc => {
                    allTickets.set(doc.id, doc.data());
                });
                
                console.log('🎫 Tickets del mes encontrados:', allTickets.size);
                
                // Calcular estadísticas
                const stats = {
                    total: allTickets.size,
                    pendiente: 0,
                    en_proceso: 0,
                    finalizado: 0,
                    cancelado: 0,
                    alta: 0,
                    media: 0,
                    baja: 0
                };
                
                allTickets.forEach(ticket => {
                    // Contar por estado
                    if (stats[ticket.estado] !== undefined) {
                        stats[ticket.estado]++;
                    }
                    
                    // Contar por prioridad
                    if (ticket.prioridad && stats[ticket.prioridad] !== undefined) {
                        stats[ticket.prioridad]++;
                    }
                });
                
                // Actualizar UI
                document.getElementById('menuNavTotalTickets').textContent = stats.total;
                document.getElementById('menuNavPendingTickets').textContent = stats.pendiente;
                document.getElementById('menuNavInProgressTickets').textContent = stats.en_proceso;
                document.getElementById('menuNavCompletedTickets').textContent = stats.finalizado;
                
                // Actualizar mes actual en el indicador
                const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
                    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
                const now = new Date();
                document.getElementById('menuNavMonthIndicator').textContent = 
                    `Estadísticas de ${monthNames[now.getMonth()]} ${now.getFullYear()}`;
                
                menuState.stats = stats;
                
                // Crear gráficas
                createCharts(stats);
                
                console.log('✅ Estadísticas del mes cargadas:', stats);
                
            } catch (error) {
                console.error("❌ Error al cargar estadísticas del mes:", error);
                
                // En caso de error de índice, intentar sin filtro de fecha
                if (error.code === 'failed-precondition') {
                    console.log('⚠️ Índice faltante, intentando cargar sin filtro de fecha...');
                    await loadUserStatsWithoutDateFilter();
                }
            }
        }
        
        // Función alternativa sin filtro de fecha (para cuando falta índice)
        async function loadUserStatsWithoutDateFilter() {
            try {
                if (!menuState.userData || !menuState.userData.nombreCompleto) {
                    return;
                }
                
                console.log('📊 Cargando estadísticas sin filtro de fecha para:', menuState.userData.nombreCompleto);
                
                const ticketsRef = db.collection('ticketsmesa');
                const nombreResponsable = menuState.userData.nombreCompleto;
                const colaboradorId = menuState.userData.colaboradorId;
                
                // Ejecutar ambas consultas sin filtro de fecha
                const qResponsable = ticketsRef
                    .where("responsableNombre", "==", nombreResponsable);
                
                const qColaborador = ticketsRef
                    .where("colaboradores", "array-contains", colaboradorId);
                
                const [snapshotResponsable, snapshotColaborador] = await Promise.all([
                    qResponsable.get(),
                    qColaborador.get()
                ]);
                
                // Combinar resultados evitando duplicados
                const allTickets = new Map();
                
                snapshotResponsable.forEach(doc => {
                    allTickets.set(doc.id, doc.data());
                });
                
                snapshotColaborador.forEach(doc => {
                    allTickets.set(doc.id, doc.data());
                });
                
                console.log('🎫 Tickets totales encontrados:', allTickets.size);
                
                // Obtener rango del mes actual para filtrar manualmente
                const { firstDay, lastDay } = getCurrentMonthRange();
                
                // Filtrar manualmente por mes
                const ticketsDelMes = Array.from(allTickets.values()).filter(ticket => {
                    if (!ticket.fechaCreacion) return false;
                    const fechaTicket = ticket.fechaCreacion.toDate();
                    return fechaTicket >= firstDay && fechaTicket <= lastDay;
                });
                
                console.log('🎫 Tickets del mes (filtrados manualmente):', ticketsDelMes.length);
                
                // Calcular estadísticas
                const stats = {
                    total: ticketsDelMes.length,
                    pendiente: 0,
                    en_proceso: 0,
                    finalizado: 0,
                    cancelado: 0,
                    alta: 0,
                    media: 0,
                    baja: 0
                };
                
                ticketsDelMes.forEach(ticket => {
                    // Contar por estado
                    if (stats[ticket.estado] !== undefined) {
                        stats[ticket.estado]++;
                    }
                    
                    // Contar por prioridad
                    if (ticket.prioridad && stats[ticket.prioridad] !== undefined) {
                        stats[ticket.prioridad]++;
                    }
                });
                
                // Actualizar UI
                document.getElementById('menuNavTotalTickets').textContent = stats.total;
                document.getElementById('menuNavPendingTickets').textContent = stats.pendiente;
                document.getElementById('menuNavInProgressTickets').textContent = stats.en_proceso;
                document.getElementById('menuNavCompletedTickets').textContent = stats.finalizado;
                
                // Actualizar mes actual
                const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
                    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
                const now = new Date();
                document.getElementById('menuNavMonthIndicator').textContent = 
                    `Estadísticas de ${monthNames[now.getMonth()]} ${now.getFullYear()}`;
                
                menuState.stats = stats;
                
                // Crear gráficas
                createCharts(stats);
                
                console.log('✅ Estadísticas del mes (filtro manual) cargadas:', stats);
                
            } catch (error) {
                console.error("❌ Error al cargar estadísticas sin filtro:", error);
            }
        }
        
        // Cargar datos completos del usuario
        async function loadCompleteUserData() {
            await loadUserProfile();
            await loadUserStats();
        }
        
        // Terminar asistencia
        async function finishAttendance() {
            try {
                const user = auth.currentUser;
                if (!user) {
                    alert('No hay usuario autenticado');
                    return;
                }
                
                await db.collection('asistencias').add({
                    usuarioId: user.uid,
                    usuarioEmail: user.email,
                    tipo: 'salida',
                    fecha: firebase.firestore.FieldValue.serverTimestamp(),
                    fechaLocal: new Date().toLocaleString('es-MX')
                });
                
                // Redirigir sin cerrar sesión
                window.location.href = '../fin-asistencia.html';
                
            } catch (error) {
                console.error("Error al terminar asistencia:", error);
                alert('No se pudo registrar la salida.');
            }
        }
        
        // Cerrar sesión
        async function logout() {
            try {
                await auth.signOut();
                sessionStorage.clear();
                localStorage.clear();
                window.location.href = '/vista/nav-visitantes/inicio-de-sesion/inicio-de-sesion.html';
            } catch (error) {
                console.error("Error al cerrar sesión:", error);
                alert('Error al cerrar sesión');
                // Forzar redirección incluso si hay error
                window.location.href = '/vista/nav-visitantes/inicio-de-sesion/inicio-de-sesion.html';
            }
        }
        
        // Configurar event listeners CON BOTÓN DINÁMICO
        function setupMenuEventListeners() {
            const floatingBtn = document.getElementById('menuNavFloatingBtn');
            const sidebar = document.getElementById('menuNavSidebar');
            const overlay = document.getElementById('menuNavOverlay');
            const finishBtn = document.getElementById('menuNavFinishAttendanceBtn');
            const logoutBtn = document.getElementById('menuNavLogoutBtn');
            
            if (floatingBtn && sidebar && overlay) {
                floatingBtn.addEventListener('click', () => {
                    const isActive = sidebar.classList.toggle('active');
                    overlay.classList.toggle('active');
                    
                    // CAMBIAR ÍCONO DEL BOTÓN FLOTANTE
                    const icon = floatingBtn.querySelector('i');
                    if (isActive) {
                        icon.classList.remove('fa-bars');
                        icon.classList.add('fa-times');
                    } else {
                        icon.classList.remove('fa-times');
                        icon.classList.add('fa-bars');
                    }
                });
                
                overlay.addEventListener('click', () => {
                    sidebar.classList.remove('active');
                    overlay.classList.remove('active');
                    
                    // RESTAURAR ÍCONO DE BARRAS
                    const icon = floatingBtn.querySelector('i');
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars');
                });
            }
            
            if (finishBtn) {
                finishBtn.addEventListener('click', finishAttendance);
            }
            
            if (logoutBtn) {
                logoutBtn.addEventListener('click', logout);
            }
        }
        
        // =============================================
        // FUNCIONES DE PERSONALIZACIÓN
        // =============================================
        
        // Cargar preferencias de personalización
        async function loadPersonalizationPreferences() {
            try {
                // Cargar desde localStorage primero
                const savedPrefs = localStorage.getItem('personalizationPreferences');
                if (savedPrefs) {
                    const preferences = JSON.parse(savedPrefs);
                    applyCustomMenuStyles(preferences);
                    console.log('✅ Preferencias cargadas desde localStorage');
                }
                
                // Cargar desde Firebase si hay usuario
                if (menuState.currentUser && menuState.userData) {
                    const prefsDoc = await db.collection('personalizacion')
                        .where('colaboradorId', '==', menuState.userData.id)
                        .get();
                    
                    if (!prefsDoc.empty) {
                        const prefsData = prefsDoc.docs[0].data();
                        applyCustomMenuStyles(prefsData.preferences);
                        // Guardar también en localStorage para acceso rápido
                        localStorage.setItem('personalizationPreferences', JSON.stringify(prefsData.preferences));
                        console.log('✅ Preferencias cargadas desde Firebase');
                    }
                }
            } catch (error) {
                console.error('❌ Error al cargar preferencias de personalización:', error);
            }
        }
        
        // Aplicar estilos personalizados al menú
        // Reemplazar la función applyCustomMenuStyles existente con esta versión mejorada
function applyCustomMenuStyles(preferences) {
    console.log('🎨 Aplicando estilos personalizados al menú con bordes pronunciados:', preferences);
    
    // Definir opciones de personalización
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
    
    // Obtener los colores seleccionados
    const selectedBackground = backgroundOptions.find(bg => bg.id === preferences.background) || backgroundOptions[0];
    const selectedTheme = themeOptions.find(theme => theme.id === preferences.theme) || themeOptions[0];
    
    // Crear o actualizar estilos personalizados
    const styleId = 'menu-nav-custom-styles';
    let styleElement = document.getElementById(styleId);
    
    if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = styleId;
        document.head.appendChild(styleElement);
    }
    
    // Generar CSS personalizado con bordes más pronunciados
    styleElement.textContent = `
        /* ESTILOS PERSONALIZADOS PARA EL MENÚ - BORDES PRONUNCIADOS */
        .menu-nav-sidebar {
            background: linear-gradient(135deg, ${selectedBackground.cardBg} 0%, ${selectedBackground.color} 100%) !important;
            color: ${selectedBackground.textColor} !important;
            border-right: 3px solid ${selectedTheme.primary} !important;
        }
        
        .menu-nav-floating-btn {
            background: ${selectedTheme.primary} !important;
            box-shadow: 0 4px 12px ${selectedTheme.primary}40 !important;
            border: 2px solid ${selectedTheme.secondary} !important;
        }
        
        .menu-nav-floating-btn:hover {
            background: ${selectedTheme.secondary} !important;
            border-color: ${selectedTheme.accent} !important;
        }
        
        .menu-nav-user-profile {
            border-bottom: 2px solid ${selectedTheme.accent} !important;
        }
        
        .menu-nav-user-avatar {
            border: 3px solid ${selectedTheme.primary} !important;
            box-shadow: 0 0 0 2px ${selectedTheme.accent} !important;
        }
        
        .menu-nav-user-name {
            color: ${selectedBackground.textColor} !important;
        }
        
        .menu-nav-user-area {
            color: ${selectedTheme.accent} !important;
        }
        
        .menu-nav-stats-container,
        .menu-nav-charts-container {
            border-bottom: 2px solid ${selectedTheme.accent} !important;
        }
        
        .menu-nav-stat-card {
            background: ${selectedBackground.cardBg}20 !important;
            color: ${selectedBackground.textColor} !important;
            border: 2px solid ${selectedTheme.accent}30 !important;
            box-shadow: 0 2px 6px rgba(0,0,0,0.1) !important;
        }
        
        .menu-nav-stat-card:hover {
            background: ${selectedBackground.cardBg}40 !important;
            border-color: ${selectedTheme.accent}60 !important;
        }
        
        .menu-nav-stat-title {
            color: ${selectedTheme.accent} !important;
        }
        
        .menu-nav-stat-value {
            color: ${selectedBackground.textColor} !important;
        }
        
        .menu-nav-month-indicator {
            color: ${selectedTheme.primary} !important;
            font-weight: 600;
        }
        
        .menu-nav-chart-title {
            color: ${selectedTheme.primary} !important;
            font-weight: 600;
        }
        
        .menu-nav-chart {
            background: ${selectedBackground.cardBg}20 !important;
            border: 2px solid ${selectedTheme.accent}30 !important;
            border-radius: 8px;
        }
        
        .menu-nav-chart-progress {
            background: ${selectedBackground.cardBg}40 !important;
            border: 1px solid ${selectedTheme.accent}20 !important;
        }
        
        .menu-nav-chart-value {
            color: ${selectedBackground.textColor} !important;
            font-weight: 600;
        }
        
        .menu-nav-btn {
            background: ${selectedBackground.cardBg}20 !important;
            color: ${selectedBackground.textColor} !important;
            border: 2px solid ${selectedTheme.accent}30 !important;
            font-weight: 600;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1) !important;
        }
        
        .menu-nav-btn:hover {
            background: ${selectedTheme.primary}20 !important;
            border-color: ${selectedTheme.primary} !important;
        }
        
        .menu-nav-btn-logout {
            background: rgba(220, 53, 69, 0.2) !important;
            border-color: rgba(220, 53, 69, 0.4) !important;
        }
        
        .menu-nav-btn-logout:hover {
            background: rgba(220, 53, 69, 0.4) !important;
            border-color: rgba(220, 53, 69, 0.8) !important;
        }
        
        .menu-nav-btn-finish {
            background: rgba(255, 193, 7, 0.2) !important;
            border-color: rgba(255, 193, 7, 0.4) !important;
        }
        
        .menu-nav-btn-finish:hover {
            background: rgba(255, 193, 7, 0.4) !important;
            border-color: rgba(255, 193, 7, 0.8) !important;
        }
        
        /* Ajustes para modo oscuro */
        ${selectedBackground.id === 'dark' ? `
            .menu-nav-stat-title,
            .menu-nav-chart-label {
                color: ${selectedTheme.accent} !important;
            }
        ` : ''}
    `;
    
    console.log('✅ Estilos personalizados con bordes pronunciados aplicados al menú');
}
        
        // Función global para actualizar estilos (llamada desde personalizacion.html)
        window.updateMenuStyles = function(preferences) {
            console.log('🔄 Actualizando estilos del menú desde personalización');
            applyCustomMenuStyles(preferences);
            
            // Guardar en localStorage
            localStorage.setItem('personalizationPreferences', JSON.stringify(preferences));
            
            // Si hay usuario autenticado, guardar también en Firebase
            if (menuState.currentUser && menuState.userData) {
                db.collection('personalizacion').doc(menuState.userData.id).set({
                    colaboradorId: menuState.userData.id,
                    colaboradorNombre: menuState.userData.nombre,
                    colaboradorEmail: menuState.userData.correoEmpresarial,
                    preferences: preferences,
                    lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                }).then(() => {
                    console.log('✅ Preferencias guardadas en Firebase');
                }).catch(error => {
                    console.error('❌ Error al guardar en Firebase:', error);
                });
            }
        };
        
        // =============================================
        // INICIALIZACIÓN DEL MENÚ
        // =============================================
        
        // Inicializar el menú
        function initMenu() {
            loadFontAwesome(); // Cargar FontAwesome primero
            addMenuStyles();
            createMenuHTML();
            setupMenuEventListeners();
            
            // Esperar a que el usuario esté autenticado
            auth.onAuthStateChanged((user) => {
                if (user) {
                    console.log('👤 Usuario autenticado detectado:', user.email);
                    loadCompleteUserData();
                    loadPersonalizationPreferences(); // Cargar preferencias de personalización
                    
                    // Actualizar estadísticas cada 30 segundos
                    setInterval(loadUserStats, 30000);
                    
                } else {
                    console.log('🚫 No hay usuario autenticado');
                    // Ocultar menú si no hay usuario
                    const sidebar = document.getElementById('menuNavSidebar');
                    const floatingBtn = document.getElementById('menuNavFloatingBtn');
                    if (sidebar) sidebar.style.display = 'none';
                    if (floatingBtn) floatingBtn.style.display = 'none';
                }
            });
            
            console.log('✅ Menú lateral autónomo cargado correctamente');
        }
        
        // Esperar a que el DOM esté listo
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initMenu);
        } else {
            initMenu();
        }
    }
    
    // Iniciar cuando Firebase esté listo
    if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
        init();
    } else {
        // Esperar a que Firebase se cargue
        const checkFirebase = setInterval(() => {
            if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
                clearInterval(checkFirebase);
                init();
            }
        }, 100);
    }
    
})();