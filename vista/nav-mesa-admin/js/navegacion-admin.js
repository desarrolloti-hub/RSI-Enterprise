// sistema-unificado-admin.js - Combina footer fijo y navegación de administrador
(function() {
    'use strict';
    
    // =============================================
    // FUNCIONALIDAD DEL FOOTER FIJO
    // =============================================
    
    function createMainContentFooter() {
        // Verificar si ya existe un footer para evitar duplicados
        if (document.getElementById('mainContentFooter')) {
            return;
        }

        const mainFooter = document.createElement('footer');
        mainFooter.id = 'mainContentFooter';
        
        // Estilos base para footer fijo en la parte inferior
        mainFooter.style.cssText = `
            /* POSICIÓN FIJA EN LA PARTE INFERIOR */
            position: fixed !important;
            bottom: 0 !important;
            left: 0 !important;
            right: 0 !important;
            width: 100% !important;
            
            /* ESTILOS BASE - COLORES SE APLICARÁN VIA CSS PERSONALIZADO */
            padding: 8px 15px !important;
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
            
            /* ALTURA MÍNIMA REDUCIDA */
            min-height: auto !important;
        `;

        mainFooter.innerHTML =/*html*/ `
            <div style="
                display: flex !important; 
                align-items: center !important; 
                justify-content: center !important; 
                gap: 8px !important; 
                flex-wrap: wrap !important;
                margin: 0 auto !important;
                max-width: 1200px !important;
            ">
                <img src="/vista/css/img/logoApp.png" alt="RSI Enterprise Mexico" 
                     style="
                         width: 16px !important; 
                         height: 16px !important; 
                         object-fit: contain !important; 
                         opacity: 0.9 !important; 
                         display: block !important;
                     ">
                <p style="
                    margin: 0 !important; 
                    font-size: 0.7rem !important; 
                    color: white !important; 
                    line-height: 1.2 !important;
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
        document.body.style.paddingBottom = '45px';
        
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
            
            /* RESPONSIVE - TAMAÑOS MÁS PEQUEÑOS PARA MÓVILES */
            
            /* Tablets y móviles grandes */
            @media (max-width: 1024px) {
                #mainContentFooter {
                    padding: 7px 12px !important;
                }
                
                .body-padding-adjust {
                    padding-bottom: 40px !important;
                }
            }
            
            /* Tablets pequeñas */
            @media (max-width: 768px) {
                #mainContentFooter {
                    padding: 6px 10px !important;
                }
                
                #mainContentFooter div {
                    gap: 6px !important;
                }
                
                #mainContentFooter img {
                    width: 14px !important;
                    height: 14px !important;
                }
                
                #mainContentFooter p {
                    font-size: 0.65rem !important;
                    line-height: 1.1 !important;
                }
                
                .body-padding-adjust {
                    padding-bottom: 35px !important;
                }
            }
            
            /* Móviles */
            @media (max-width: 480px) {
                #mainContentFooter {
                    padding: 4px 8px !important;
                    min-height: 30px !important;
                }
                
                #mainContentFooter div {
                    gap: 4px !important;
                }
                
                #mainContentFooter img {
                    width: 12px !important;
                    height: 12px !important;
                }
                
                #mainContentFooter p {
                    font-size: 0.6rem !important;
                    line-height: 1 !important;
                }
                
                .body-padding-adjust {
                    padding-bottom: 30px !important;
                }
            }
            
            /* Móviles muy pequeños */
            @media (max-width: 360px) {
                #mainContentFooter {
                    padding: 3px 6px !important;
                    min-height: 25px !important;
                }
                
                #mainContentFooter p {
                    font-size: 0.55rem !important;
                }
                
                #mainContentFooter img {
                    width: 10px !important;
                    height: 10px !important;
                }
                
                .body-padding-adjust {
                    padding-bottom: 25px !important;
                }
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
        `;
        
        // Aplicar clase al body para el padding ajustado
        document.body.classList.add('body-padding-adjust');
    }
    
    // =============================================
    // FUNCIONALIDAD DEL MENÚ DE NAVEGACIÓN ADMIN
    // =============================================
    
    // Agregar FontAwesome CDN si no existe
    function loadFontAwesome() {
        if (!document.querySelector('link[href*="font-awesome"]')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css';
            document.head.appendChild(link);
        }
    }
    
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
                color: white; /* Color blanco por defecto */
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
                color: white; /* Color blanco por defecto */
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
                color: white; /* Color blanco por defecto */
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
                color: white; /* Color blanco por defecto */
                width: 30px;
                text-align: right;
                flex-shrink: 0;
            }
            
            .menu-nav-buttons-container {
                padding: 20px;
                max-width: 100%;
                box-sizing: border-box;
            }
            
            /* ESTILOS PARA SECCIONES DESPLEGABLES */
            .menu-nav-section {
                margin-bottom: 10px;
                border-radius: 8px;
                overflow: hidden;
                background: rgba(255,255,255,0.05);
            }
            
            .menu-nav-section-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 12px 15px;
                background: rgba(108, 67, 224, 0.2);
                color: white; /* Color blanco por defecto */
                border: none;
                width: 100%;
                cursor: pointer;
                transition: all 0.3s ease;
                font-family: inherit;
                font-size: 0.95rem;
                text-align: left;
            }
            
            .menu-nav-section-header:hover {
                background: rgba(108, 67, 224, 0.3);
            }
            
            .menu-nav-section-header i:first-child {
                margin-right: 10px;
                width: 20px;
                text-align: center;
                flex-shrink: 0;
            }
            
            .menu-nav-section-header i:last-child {
                transition: transform 0.3s ease;
                font-size: 0.8rem;
            }
            
            .menu-nav-section-header.active i:last-child {
                transform: rotate(180deg);
            }
            
            .menu-nav-section-content {
                max-height: 0;
                overflow: hidden;
                transition: max-height 0.3s ease;
                background: rgba(255,255,255,0.02);
            }
            
            .menu-nav-section-content.active {
                max-height: 500px;
            }
            
            .menu-nav-btn {
                display: flex;
                align-items: center;
                width: 100%;
                padding: 10px 15px 10px 45px;
                background: transparent;
                color: white; /* Color blanco por defecto */
                text-decoration: none;
                border: none;
                border-radius: 0;
                cursor: button;
                transition: all 0.3s ease;
                font-family: inherit;
                font-size: 0.9rem;
                box-sizing: border-box;
                word-wrap: break-word;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                border-bottom: 1px solid rgba(255,255,255,0.05);
            }
            
            .menu-nav-btn:last-child {
                border-bottom: none;
            }
            
            .menu-nav-btn:hover {
                background: rgba(108, 67, 224, 0.1);
                padding-left: 50px;
            }
            
            .menu-nav-btn i {
                margin-right: 10px;
                width: 20px;
                text-align: center;
                flex-shrink: 0;
                font-size: 0.8rem;
            }
            
            .menu-nav-btn-logout {
                background: rgba(220, 53, 69, 0.1);
                color: #ff6b6b;
            }
            
            .menu-nav-btn-logout:hover {
                background: rgba(220, 53, 69, 0.2);
            }
            
            .menu-nav-btn-finish {
                background: rgba(255, 193, 7, 0.1);
                color: #ffd93d;
            }
            
            .menu-nav-btn-finish:hover {
                background: rgba(255, 193, 7, 0.2);
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
                
                .menu-nav-section-header {
                    padding: 10px 12px;
                    font-size: 0.9rem;
                }
                
                .menu-nav-btn {
                    padding: 8px 12px 8px 40px;
                    font-size: 0.85rem;
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
                    font-size: 0.8rem;
                    padding: 7px 10px 7px 35px;
                }
                
                .menu-nav-btn i {
                    margin-right: 8px;
                    font-size: 0.75rem;
                }
                
                .menu-nav-chart-label {
                    width: 70px;
                    font-size: 0.75rem;
                }
                
                .menu-nav-section-header {
                    font-size: 0.85rem;
                    padding: 8px 10px;
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
    
    // Crear HTML del menú CON SECCIONES DESPLEGABLES
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
        
        sidebar.innerHTML =/*html*/ `
            <div class="menu-nav-user-profile">
                <img src="../../css/img/Logo-RSI-OFICIAL.png" alt="Foto de perfil" class="menu-nav-user-avatar" id="menuNavUserAvatar">
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
                <!-- SECCIÓN TICKETS -->
                <div class="menu-nav-section">
                    <button class="menu-nav-section-header" data-section="tickets">
                        <i class="fas fa-ticket-alt"></i>
                        <span>Tickets</span>
                        <i class="fas fa-chevron-down"></i>
                    </button>
                    <div class="menu-nav-section-content" id="section-tickets">
                        <a href="../gestion-tickets-admin/gestion-tickets-admin.html" class="menu-nav-btn">
                            <i class="fas fa-list-alt"></i> Gestionar tickets
                        </a>
                        <a href="../gestion-tickets/gestion-tickets.html" class="menu-nav-btn">
                            <i class="fas fa-ticket-alt"></i> Ver mis tickets
                        </a>
                        <a href="../graficas-tickets/graficas-tickets.html" class="menu-nav-btn">
                            <i class="fas fa-chart-bar"></i> Ver estadísticas
                        </a>
                    </div>
                </div>
                
                <!-- SECCIÓN ADMINISTRATIVO -->
                <div class="menu-nav-section">
                    <button class="menu-nav-section-header" data-section="administrativo">
                        <i class="fas fa-cogs"></i>
                        <span>Administrativo</span>
                        <i class="fas fa-chevron-down"></i>
                    </button>
                    <div class="menu-nav-section-content" id="section-administrativo">
                        <a href="../notas/notas.html" class="menu-nav-btn">
                            <i class="fas fa-sticky-note"></i> Notas
                        </a>
                        <a href="../asistencias-rsi/asistencias-rsi.html" class="menu-nav-btn">
                            <i class="fas fa-calendar-check"></i> Ver asistencias
                        </a>
                        <a href="../Rembolsos/rembolso.html" class="menu-nav-btn">
                            <i class="fas fa-money-bill-wave"></i> Gestión de reembolsos
                        </a>
                        <a href="../manuales/manuales.html" class="menu-nav-btn">
                            <i class="fas fa-file-alt"></i> Ver manuales
                        </a>
                        <a href="../gestion-colaboradores/gestion-colaboradores.html" class="menu-nav-btn">
                            <i class="fas fa-users-cog"></i> Colaboradores
                        </a>
                        <a href="../checklist-automoviles/checklist-automoviles.html" class="menu-nav-btn">
                            <i class="fas fa-car"></i> Chekclist automoviles
                        </a>
                    </div>
                </div>

                <!-- SECCIÓN FINANZAS -->
                <div class="menu-nav-section">
                    <button class="menu-nav-section-header" data-section="finanzas">
                        <i class="fas fa-chart-line"></i>
                        <span>Finanzas</span>
                        <i class="fas fa-chevron-down"></i>
                    </button>
                    <div class="menu-nav-section-content" id="section-finanzas">
                        <a href="../cotizaciones/coti.html" class="menu-nav-btn">
                            <i class="fas fa-file-invoice-dollar"></i> Cotizar
                        </a>
                        <a href="/404.html" class="menu-nav-btn">
                            <i class="fas fa-file-invoice-dollar"></i> Reportes Financieros
                        </a>
                        <a href="/404.html" class="menu-nav-btn">
                            <i class="fas fa-calculator"></i> Presupuestos
                        </a>
                        <a href="/404.html" class="menu-nav-btn">
                            <i class="fas fa-money-check-alt"></i> Control de Gastos
                        </a>
                    </div>
                </div>

                <!-- SECCIÓN ECOMMERCE -->
                <div class="menu-nav-section">
                    <button class="menu-nav-section-header" data-section="ecommerce">
                        <i class="fas fa-shopping-cart"></i>
                        <span>Ecommerce</span>
                        <i class="fas fa-chevron-down"></i>
                    </button>
                    <div class="menu-nav-section-content" id="section-ecommerce">
                        <a href="/404.html" class="menu-nav-btn">
                            <i class="fas fa-store"></i> Gestión de Tienda
                        </a>
                        <a href="/404.html" class="menu-nav-btn">
                            <i class="fas fa-boxes"></i> Inventario
                        </a>
                        <a href="/404.html" class="menu-nav-btn">
                            <i class="fas fa-chart-bar"></i> Ventas y Métricas
                        </a>
                    </div>
                </div>
                
                <!-- SECCIÓN CONFIGURACIÓN -->
                <div class="menu-nav-section">
                    <button class="menu-nav-section-header" data-section="configuracion">
                        <i class="fas fa-sliders-h"></i>
                        <span>Configuración</span>
                        <i class="fas fa-chevron-down"></i>
                    </button>
                    <div class="menu-nav-section-content" id="section-configuracion">
                        <a href="../personalizar-interfaz/personalizar-interfaz.html" class="menu-nav-btn">
                            <i class="fas fa-palette"></i> Personalizar interfaz
                        </a>
                        <button class="menu-nav-btn menu-nav-btn-finish" id="menuNavFinishAttendanceBtn">
                            <a href="../fin-asistencia/fin-asistencia.html">
                            <i class="fas fa-flag-checkered"></i> Terminar asistencia
                            </a>
                        </button>
                        <button class="menu-nav-btn menu-nav-btn-logout" id="menuNavLogoutBtn">
                            <i class="fas fa-sign-out-alt"></i> Cerrar sesión
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        document.body.appendChild(floatingBtn);
        document.body.appendChild(sidebar);
    }
    
    // Configurar event listeners para secciones desplegables
    function setupMenuEventListeners() {
        const floatingBtn = document.getElementById('menuNavFloatingBtn');
        const sidebar = document.getElementById('menuNavSidebar');
        const overlay = document.getElementById('menuNavOverlay');
        const finishBtn = document.getElementById('menuNavFinishAttendanceBtn');
        const logoutBtn = document.getElementById('menuNavLogoutBtn');
        
        // Event listeners para el botón flotante y overlay
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
        
        // Event listeners para secciones desplegables
        const sectionHeaders = document.querySelectorAll('.menu-nav-section-header');
        sectionHeaders.forEach(header => {
            header.addEventListener('click', function() {
                const sectionId = this.getAttribute('data-section');
                const content = document.getElementById(`section-${sectionId}`);
                
                // Cerrar otras secciones
                sectionHeaders.forEach(otherHeader => {
                    if (otherHeader !== this) {
                        otherHeader.classList.remove('active');
                        const otherSectionId = otherHeader.getAttribute('data-section');
                        const otherContent = document.getElementById(`section-${otherSectionId}`);
                        if (otherContent) {
                            otherContent.classList.remove('active');
                        }
                    }
                });
                
                // Alternar sección actual
                this.classList.toggle('active');
                if (content) {
                    content.classList.toggle('active');
                }
            });
        });
        
        // Event listeners para botones de acción
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
            } else {
                // Si no hay preferencias guardadas, aplicar estilos por defecto (blancos)
                console.log('🎨 Aplicando estilos blancos por defecto');
                applyDefaultWhiteStyles();
            }
            
            // Cargar desde Firebase si hay usuario
            if (menuState.currentUser && menuState.userData) {
                const db = firebase.firestore();
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
            // En caso de error, aplicar estilos blancos por defecto
            applyDefaultWhiteStyles();
        }
    }
    
    // Aplicar estilos blancos por defecto
    function applyDefaultWhiteStyles() {
        console.log('🎨 Aplicando estilos blancos por defecto');
        
        const styleId = 'menu-nav-default-styles';
        let styleElement = document.getElementById(styleId);
        
        if (!styleElement) {
            styleElement = document.createElement('style');
            styleElement.id = styleId;
            document.head.appendChild(styleElement);
        }
        
        // Estilos blancos por defecto
        styleElement.textContent = `
            /* ESTILOS BLANCOS POR DEFECTO */
            .menu-nav-sidebar {
                color: white !important;
            }
            
            .menu-nav-user-name {
                color: white !important;
            }
            
            .menu-nav-stat-value {
                color: white !important;
            }
            
            .menu-nav-chart-value {
                color: white !important;
            }
            
            .menu-nav-section-header {
                color: white !important;
            }
            
            .menu-nav-btn {
                color: white !important;
            }
            
            .menu-nav-btn:hover {
                color: white !important;
            }
        `;
    }
    
    // Aplicar estilos personalizados al menú
    function applyCustomMenuStyles(preferences) {
        console.log('🎨 Aplicando estilos personalizados al menú:', preferences);
        
        // Remover estilos por defecto si existen
        const defaultStyles = document.getElementById('menu-nav-default-styles');
        if (defaultStyles) {
            defaultStyles.remove();
        }
        
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
        
        // Generar CSS personalizado
        styleElement.textContent = `
            /* ESTILOS PERSONALIZADOS PARA EL MENÚ */
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
            
            /* ESTILOS PARA SECCIONES DESPLEGABLES PERSONALIZADAS */
            .menu-nav-section {
                background: ${selectedBackground.cardBg}10 !important;
                border: 1px solid ${selectedTheme.accent}20 !important;
            }
            
            .menu-nav-section-header {
                background: ${selectedTheme.primary}20 !important;
                color: ${selectedBackground.textColor} !important;
            }
            
            .menu-nav-section-header:hover {
                background: ${selectedTheme.primary}30 !important;
            }
            
            .menu-nav-section-header.active {
                background: ${selectedTheme.primary}40 !important;
            }
            
            .menu-nav-section-content {
                background: ${selectedBackground.cardBg}05 !important;
            }
            
            .menu-nav-btn {
                background: transparent !important;
                color: ${selectedBackground.textColor} !important;
                border-bottom: 1px solid ${selectedTheme.accent}10 !important;
            }
            
            .menu-nav-btn:hover {
                background: ${selectedTheme.primary}15 !important;
            }
            
            .menu-nav-btn-logout {
                background: rgba(220, 53, 69, 0.1) !important;
                color: #ff6b6b !important;
            }
            
            .menu-nav-btn-logout:hover {
                background: rgba(220, 53, 69, 0.2) !important;
            }
            
            .menu-nav-btn-finish {
                background: rgba(255, 193, 7, 0.1) !important;
                color: #ffd93d !important;
            }
            
            .menu-nav-btn-finish:hover {
                background: rgba(255, 193, 7, 0.2) !important;
            }
            
            /* Ajustes para modo oscuro */
            ${selectedBackground.id === 'dark' ? `
                .menu-nav-stat-title,
                .menu-nav-chart-label {
                    color: ${selectedTheme.accent} !important;
                }
            ` : ''}
        `;
        
        console.log('✅ Estilos personalizados aplicados al menú');
    }
    
    // Función global para actualizar estilos (llamada desde personalizacion.html)
    window.updateMenuStyles = function(preferences) {
        console.log('🔄 Actualizando estilos del menú desde personalización');
        applyCustomMenuStyles(preferences);
        
        // Guardar en localStorage
        localStorage.setItem('personalizationPreferences', JSON.stringify(preferences));
        
        // Si hay usuario autenticado, guardar también en Firebase
        if (menuState.currentUser && menuState.userData) {
            const db = firebase.firestore();
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
    
    // Cargar datos del usuario
    async function loadUserProfile() {
        try {
            const auth = firebase.auth();
            const db = firebase.firestore();
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
            const user = firebase.auth().currentUser;
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
            'finalizado': stats.finalizado,
            'cancelado': stats.cancelado
        };
        
        Object.entries(statusData).forEach(([status, count]) => {
            if (count > 0 || status === 'pendiente' || status === 'en_proceso' || status === 'finalizado') {
                const percentage = totalTickets > 0 ? Math.round((count / totalTickets) * 100) : 0;
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
        
        // Si no hay datos, mostrar mensaje
        if (chartBars.innerHTML === '') {
            chartBars.innerHTML = `
                <div style="text-align: center; color: #a0a0c0; font-size: 0.8rem; padding: 10px;">
                    No hay tickets para mostrar
                </div>
            `;
        }
        
        // Gráfica de prioridad con datos reales
        priorityBars.innerHTML = '';
        const priorityData = {
            'alta': stats.alta,
            'media': stats.media,
            'baja': stats.baja
        };
        
        Object.entries(priorityData).forEach(([priority, count]) => {
            if (count > 0) {
                const percentage = totalTickets > 0 ? Math.round((count / totalTickets) * 100) : 0;
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
        
        // Si no hay datos de prioridad, mostrar mensaje
        if (priorityBars.innerHTML === '') {
            priorityBars.innerHTML = `
                <div style="text-align: center; color: #a0a0c0; font-size: 0.8rem; padding: 10px;">
                    No hay datos de prioridad
                </div>
            `;
        }
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
    
    // Cargar estadísticas del usuario SOLO DEL MES ACTUAL
    async function loadUserStats() {
        try {
            if (!menuState.userData || !menuState.userData.nombreCompleto) {
                console.log('Esperando datos del usuario...');
                return;
            }
            
            console.log('📊 Cargando estadísticas del mes actual para:', menuState.userData.nombreCompleto);
            
            const db = firebase.firestore();
            const ticketsRef = db.collection('ticketsmesa');
            const nombreResponsable = menuState.userData.nombreCompleto;
            const colaboradorId = menuState.userData.colaboradorId;
            
            // Consultas SIMPLES sin filtros de fecha complejos
            const qResponsable = ticketsRef.where("responsableNombre", "==", nombreResponsable);
            const qColaborador = ticketsRef.where("colaboradores", "array-contains", colaboradorId);
            
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
            
            // Obtener rango del mes actual
            const { firstDay, lastDay } = getCurrentMonthRange();
            
            // Filtrar tickets del mes actual localmente
            const ticketsDelMes = Array.from(allTickets.values()).filter(ticket => {
                if (!ticket.fechaCreacion) return false;
                try {
                    const fechaTicket = ticket.fechaCreacion.toDate();
                    return fechaTicket >= firstDay && fechaTicket <= lastDay;
                } catch (error) {
                    console.warn('Error al procesar fecha del ticket:', ticket.fechaCreacion);
                    return false;
                }
            });
            
            console.log('🎫 Tickets del mes actual:', ticketsDelMes.length);
            
            // Calcular estadísticas SOLO del mes actual
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
                if (ticket.estado && stats[ticket.estado] !== undefined) {
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
            console.error("❌ Error al cargar estadísticas:", error);
            
            // En caso de error, mostrar datos por defecto
            const stats = {
                total: 0,
                pendiente: 0,
                en_proceso: 0,
                finalizado: 0,
                cancelado: 0,
                alta: 0,
                media: 0,
                baja: 0
            };
            
            document.getElementById('menuNavTotalTickets').textContent = '0';
            document.getElementById('menuNavPendingTickets').textContent = '0';
            document.getElementById('menuNavInProgressTickets').textContent = '0';
            document.getElementById('menuNavCompletedTickets').textContent = '0';
            
            createCharts(stats);
        }
    }
    
    // Función para terminar asistencia
    async function finishAttendance() {
        try {
            const auth = firebase.auth();
            const db = firebase.firestore();
            const user = auth.currentUser;
            if (!user) return;
            
            // Buscar en colaboradores
            const colaboradorQuery = await db.collection("colaboradores")
                .where("CORREO ELECTRÓNICO EMPRESARIAL", "==", user.email)
                .get();
            
            if (!colaboradorQuery.empty) {
                const doc = colaboradorQuery.docs[0];
                const userData = doc.data();
                
                // Actualizar estado de asistencia
                await db.collection("asistencias").add({
                    colaboradorId: doc.id,
                    colaboradorNombre: userData.NOMBRE,
                    area: userData.ÁREA,
                    fecha: new Date(),
                    tipo: "salida",
                    timestamp: new Date()
                });
                
                alert('Asistencia registrada correctamente');
            } else {
                alert('Usuario no encontrado en colaboradores');
            }
        } catch (error) {
            console.error('Error al registrar asistencia:', error);
            alert('Error al registrar asistencia');
        }
    }
    
    // Función para cerrar sesión
    async function logout() {
        try {
            await firebase.auth().signOut();
            window.location.href = "/vista/nav-visitantes/inicio-de-sesion/inicio-de-sesion.html";
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
            alert('Error al cerrar sesión');
        }
    }
    
    // Observar cambios en el DOM para detectar cuando se carga el usuario
    function observeUserChanges() {
        const auth = firebase.auth();
        
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                console.log('👤 Usuario autenticado detectado:', user.email);
                await loadUserProfile();
                await loadUserStats();
                await loadPersonalizationPreferences(); // Cargar preferencias de personalización
            } else {
                console.log('🔒 No hay usuario autenticado');
            }
        });
    }
    
    // Inicializar el menú de navegación
    function initializeMenu() {
        console.log('🚀 Inicializando menú de navegación...');
        
        // Cargar FontAwesome
        loadFontAwesome();
        
        // Agregar estilos
        addMenuStyles();
        
        // Crear elementos HTML
        createMenuHTML();
        
        // Configurar event listeners
        setupMenuEventListeners();
        
        // Observar cambios de usuario
        observeUserChanges();
        
        console.log('✅ Menú de navegación inicializado correctamente');
    }
    
    // =============================================
    // FUNCIONES GLOBALES DEL SISTEMA UNIFICADO
    // =============================================
    
    // Función para actualizar estilos del footer cuando cambien las preferencias
    function updateFooterStyles() {
        applyFooterCustomStyles();
    }
    
    // Exponer función global para actualización manual
    window.actualizarFooterPersonalizado = updateFooterStyles;
    
    // Escuchar eventos de actualización de personalización
    document.addEventListener('personalizationUpdated', updateFooterStyles);
    
    // Inicializar el sistema completo
    function initSistemaUnificado() {
        // Inicializar footer
        createMainContentFooter();
        
        // Inicializar menú si Firebase está disponible
        if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
            initializeMenu();
        } else {
            // Esperar a que Firebase se cargue
            const firebaseCheckInterval = setInterval(() => {
                if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
                    clearInterval(firebaseCheckInterval);
                    initializeMenu();
                }
            }, 100);
            
            // Timeout de seguridad
            setTimeout(() => {
                clearInterval(firebaseCheckInterval);
            }, 5000);
        }
        
        console.log('✅ Sistema unificado (footer + navegación admin) cargado correctamente');
    }
    
    // Inicializar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSistemaUnificado);
    } else {
        initSistemaUnificado();
    }
    
})();