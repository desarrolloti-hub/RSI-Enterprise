// verTicket.js
(function() {
    "use strict";

    // Configuración de Firebase
    const firebaseConfig = {
        apiKey: "AIzaSyBJy992gkvsT77-_fMp_O_z99wtjZiK77Y",
        authDomain: "rsienterprise.firebaseapp.com",
        projectId: "rsienterprise",
        storageBucket: "rsienterprise.appspot.com",
        messagingSenderId: "1063117165770",
        appId: "1:1063117165770:web:8555f26b25ae80bc42d033"
    };

    // Inicializar Firebase
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    
    const auth = firebase.auth();
    const db = firebase.firestore();
    const storage = firebase.storage();

    // Estado de la aplicación
    const appState = {
        currentUser: null,
        currentTicketId: null,
        colaboradores: [],
        ticketData: null,
        activities: [],
        cotizacionData: null,
        logoBase64Cache: null
    };

    // =================================================================================
    // FUNCIÓN IMPORTANTE: Obtener URL de imagen desde Storage o base64
    // =================================================================================
    
    /**
     * Procesa una imagen que puede estar en diferentes formatos:
     * - Objeto con path y url (nuevo formato Storage)
     * - String base64 (formato antiguo)
     * - String URL directa
     */
    function getImageUrl(imageData) {
        if (!imageData) return null;
        
        // Si es un objeto con url (nuevo formato Storage)
        if (typeof imageData === 'object' && imageData.url) {
            return imageData.url;
        }
        
        // Si es un string (base64 o URL)
        if (typeof imageData === 'string') {
            // Si ya es una URL de Storage o base64, devolverla directamente
            if (imageData.startsWith('http') || imageData.startsWith('data:')) {
                return imageData;
            }
            // Si es un path de Storage (raro, pero por si acaso)
            if (imageData.includes('/')) {
                return null; // Necesitaríamos getDownloadURL, pero mejor manejar en loadActivities
            }
        }
        
        return null;
    }

    /**
     * Obtiene URL de descarga desde un path de Storage
     */
    async function getStorageUrl(path) {
        if (!path) return null;
        try {
            const storageRef = storage.ref().child(path);
            return await storageRef.getDownloadURL();
        } catch (error) {
            console.error("Error obteniendo URL de Storage:", error);
            return null;
        }
    }

    // =================================================================================
    // FUNCIONES PRINCIPALES
    // =================================================================================

    async function initialLoad() {
        try {
            await loadUserProfile();
            await loadCollaborators();
            await loadTicketData();
            await loadActivities();
            await loadCollaboratorStatus();
            await loadCotizacionData();
            setupEventListeners();
        } catch (error) {
            console.error("Error en la carga inicial:", error);
            showError('No se pudieron cargar los datos iniciales.');
        }
    }

    async function loadUserProfile() {
        const user = auth.currentUser;
        if (!user) {
            window.location.href = '../nav-visitantes/inicio-de-sesion.html';
            return;
        }
        
        try {
            const querySnapshot = await db.collection("colaboradores")
                .where("CORREO ELECTRÓNICO EMPRESARIAL", "==", user.email)
                .get();
            
            if (!querySnapshot.empty) {
                const doc = querySnapshot.docs[0];
                const userData = doc.data();
                appState.currentUser = {
                    id: doc.id,
                    nombre: userData.NOMBRE,
                    area: userData.ÁREA,
                    imagen: userData.imagen || '../css/img/Logo-RSI-OFICIAL.png'
                };
                sessionStorage.setItem('currentUser', JSON.stringify(appState.currentUser));
            }
        } catch (error) {
            console.error("Error al cargar perfil:", error);
        }
    }

    async function loadCollaborators() {
        try {
            const snapshot = await db.collection('colaboradores').get();
            appState.colaboradores = snapshot.docs.map(doc => ({
                id: doc.id,
                nombre: doc.data().NOMBRE,
                area: doc.data().ÁREA
            }));
        } catch (error) {
            console.error("Error al cargar colaboradores:", error);
        }
    }

    async function loadTicketData() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const ticketId = urlParams.get('id');
            
            if (!ticketId) {
                showError('No se proporcionó un ID de ticket válido.');
                return;
            }
            
            appState.currentTicketId = ticketId;
            
            const ticketDoc = await db.collection('ticketsmesa').doc(ticketId).get();
            
            if (!ticketDoc.exists) {
                showError('El ticket solicitado no existe.');
                return;
            }
            
            appState.ticketData = {
                id: ticketDoc.id,
                ...ticketDoc.data()
            };
            
            if (appState.ticketData.colaboradores && appState.ticketData.colaboradores.length > 0) {
                appState.ticketData.nombresColaboradores = appState.ticketData.colaboradores.map(colabId => {
                    const colaborador = appState.colaboradores.find(c => c.id === colabId);
                    return colaborador ? colaborador.nombre : 'Desconocido';
                }).filter(Boolean).join(', ');
            } else {
                appState.ticketData.nombresColaboradores = 'Sin asignar';
            }
            
            updateTicketUI();
            
        } catch (error) {
            console.error("Error al cargar datos del ticket:", error);
            showError('No se pudieron cargar los datos del ticket.');
        }
    }

    async function loadCotizacionData() {
        try {
            const ticket = appState.ticketData;
            const cotizacionSection = document.getElementById('cotizacionSection');
            const verCotizacionBtn = document.getElementById('verCotizacionBtn');
            
            if (!ticket.cotizacionId || ticket.asociarCotizacion !== 'si') {
                cotizacionSection.style.display = 'none';
                return;
            }
            
            document.getElementById('ticketCotizacion').textContent = ticket.cotizacionNombre || 'Cotización asociada';
            document.getElementById('ticketCotizacionNumero').textContent = ticket.cotizacionNumero || 'N/A';
            
            const cotizacionDoc = await db.collection('cotizacionPdf').doc(ticket.cotizacionId).get();
            
            if (cotizacionDoc.exists) {
                const cotizacionData = cotizacionDoc.data();
                document.getElementById('ticketCotizacionEstado').innerHTML = getCotizacionStatusBadge(cotizacionData.estado);
                
                appState.cotizacionData = {
                    id: cotizacionDoc.id,
                    ...cotizacionData
                };
                
                verCotizacionBtn.style.display = 'block';
                verCotizacionBtn.onclick = () => showCotizacionPDF(appState.cotizacionData);
            } else {
                document.getElementById('ticketCotizacionEstado').textContent = 'No encontrada';
                verCotizacionBtn.style.display = 'none';
            }
            
            cotizacionSection.style.display = 'block';
            
        } catch (error) {
            console.error("Error al cargar datos de cotización:", error);
            document.getElementById('cotizacionSection').style.display = 'none';
        }
    }

    // =================================================================================
    // FUNCIÓN MODIFICADA: Cargar actividades con soporte para Storage
    // =================================================================================
    
    async function loadActivities() {
        try {
            if (!appState.currentTicketId) {
                appState.activities = [];
                updateActivitiesUI();
                return;
            }
            
            const activitiesSnapshot = await db.collection('evidenciatickets')
                .where('ticketId', '==', appState.currentTicketId)
                .get();
            
            appState.activities = [];
            
            for (const doc of activitiesSnapshot.docs) {
                const activityData = doc.data();
                
                // Procesar imágenes para este activity
                const processedImages = [];
                
                if (activityData.imagenes && activityData.imagenes.length > 0) {
                    for (const img of activityData.imagenes) {
                        let imageUrl = null;
                        
                        // CASO 1: Nuevo formato Storage (objeto con path y url)
                        if (typeof img === 'object' && img.url) {
                            imageUrl = img.url;
                        }
                        // CASO 2: Nuevo formato Storage solo con path (necesita getDownloadURL)
                        else if (typeof img === 'object' && img.path) {
                            imageUrl = await getStorageUrl(img.path);
                        }
                        // CASO 3: Formato antiguo (base64 string)
                        else if (typeof img === 'string') {
                            if (img.startsWith('data:') || img.startsWith('http')) {
                                imageUrl = img;
                            } else if (img.includes('/')) {
                                // Posible path de Storage
                                imageUrl = await getStorageUrl(img);
                            } else {
                                imageUrl = img; // Fallback
                            }
                        }
                        
                        if (imageUrl) {
                            processedImages.push(imageUrl);
                        } else {
                            // Imagen por defecto si no se pudo cargar
                            processedImages.push('../css/img/image-placeholder.png');
                        }
                    }
                }
                
                appState.activities.push({
                    id: doc.id,
                    ...activityData,
                    imagenes: processedImages
                });
            }
            
            updateActivitiesUI();
            
        } catch (error) {
            console.error("Error al cargar actividades:", error);
            showError('No se pudieron cargar las actividades.');
        }
    }

    async function loadCollaboratorStatus() {
        try {
            if (!appState.ticketData || !appState.ticketData.colaboradores) {
                appState.collaboratorStatus = [];
                updateCollaboratorStatusUI();
                return;
            }
            
            const collaboratorStatus = [];
            
            for (const collaboratorId of appState.ticketData.colaboradores) {
                const collaborator = appState.colaboradores.find(c => c.id === collaboratorId);
                
                if (collaborator) {
                    const hasActivity = appState.activities.some(activity => 
                        activity.colaboradorId === collaboratorId
                    );
                    
                    collaboratorStatus.push({
                        id: collaboratorId,
                        nombre: collaborator.nombre,
                        hasActivity: hasActivity
                    });
                }
            }
            
            appState.collaboratorStatus = collaboratorStatus;
            updateCollaboratorStatusUI();
            
        } catch (error) {
            console.error("Error al cargar estado de colaboradores:", error);
            showError('No se pudo cargar el estado de los colaboradores.');
        }
    }

    function updateTicketUI() {
        const ticket = appState.ticketData;
        
        document.getElementById('ticketId').textContent = ticket.idTicket || ticket.id || 'N/A';
        document.getElementById('ticketTitle').textContent = ticket.titulo || 'Sin título';
        document.getElementById('ticketStatus').innerHTML = getStatusBadge(ticket.estado);
        document.getElementById('ticketPriority').innerHTML = getPriorityBadge(ticket.prioridad);
        document.getElementById('ticketArea').textContent = ticket.area || 'N/A';
        document.getElementById('ticketType').textContent = formatTicketType(ticket.tipo);
        
        document.getElementById('ticketResponsable').textContent = ticket.responsableNombre || 'N/A';
        document.getElementById('ticketCollaborators').textContent = ticket.nombresColaboradores || 'Sin asignar';
        document.getElementById('ticketRaisedBy').textContent = ticket.levantadoPor || 'N/A';
        
        document.getElementById('ticketCreationDate').textContent = formatDate(ticket.fechaCreacion);
        document.getElementById('ticketUpdateDate').textContent = formatDate(ticket.updatedAt || ticket.fechaActualizacion);
        document.getElementById('ticketCompletionDate').textContent = ticket.fechaFinalizacion ? formatDateFromString(ticket.fechaFinalizacion) : 'Pendiente';
        
        document.getElementById('ticketAccount').textContent = ticket.cuentaNombre || 'N/A';
        document.getElementById('ticketProject').textContent = ticket.proyecto || 'N/A';
        document.getElementById('ticketService').textContent = ticket.servicio || 'N/A';
        document.getElementById('ticketServiceOrder').textContent = ticket.ordenServicio || 'N/A';
        document.getElementById('ticketSystems').textContent = ticket.sistemas ? ticket.sistemas.join(', ') : 'N/A';
        
        document.getElementById('ticketDescription').textContent = ticket.descripcionActividades || 'Sin descripción';
        document.getElementById('ticketConclusion').textContent = ticket.conclusion || 'Pendiente de conclusión';
    }

    // =================================================================================
    // FUNCIÓN MODIFICADA: Actualizar interfaz de actividades con imágenes de Storage
    // =================================================================================
    
    function updateActivitiesUI() {
        const container = document.getElementById('activitiesContainer');
        
        if (!appState.activities || appState.activities.length === 0) {
            container.innerHTML = `
                <div class="empty-evidences">
                    <i class="fas fa-images"></i>
                    <p>No hay actividades registradas para este ticket</p>
                    <small>Las actividades aparecerán aquí cuando los colaboradores agreguen evidencias</small>
                </div>
            `;
            return;
        }
        
        let html = '';
        
        appState.activities.forEach(activity => {
            const collaboratorName = getCollaboratorName(activity.colaboradorId);
            
            // Generar HTML para las imágenes
            let imagesHtml = '';
            if (activity.imagenes && activity.imagenes.length > 0) {
                imagesHtml = activity.imagenes.map((img, index) => {
                    // Escapar la URL para usarla en onclick
                    const escapedImg = img.replace(/'/g, "\\'");
                    return `
                        <div class="evidence-image-container">
                            <img src="${img}" 
                                 alt="Evidencia ${index + 1}" 
                                 class="evidence-image" 
                                 onclick='openImageModal("${escapedImg}")'
                                 onerror="this.src='../css/img/image-placeholder.png'; this.onerror=null;">
                            <div class="evidence-meta">
                                <div>Evidencia ${index + 1}</div>
                                <small>${collaboratorName}</small>
                            </div>
                        </div>
                    `;
                }).join('');
            } else {
                imagesHtml = '<p class="text-muted">No hay imágenes en esta actividad</p>';
            }
            
            html += `
                <div class="activity-block">
                    <div class="activity-header">
                        <h5>Actividad de ${collaboratorName}</h5>
                        <span class="evidence-date">${formatDate(activity.fechaCreacion)}</span>
                    </div>
                    <div class="activity-description">
                        ${activity.descripcion || 'Sin descripción detallada.'}
                    </div>
                    <div class="evidence-grid">
                        ${imagesHtml}
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    }

    function updateCollaboratorStatusUI() {
        const container = document.getElementById('collaboratorsStatusContainer');
        
        if (!appState.collaboratorStatus || appState.collaboratorStatus.length === 0) {
            container.innerHTML = `
                <div class="empty-evidences">
                    <i class="fas fa-users"></i>
                    <p>No hay colaboradores asignados a este ticket</p>
                </div>
            `;
            return;
        }
        
        let html = '';
        
        appState.collaboratorStatus.forEach(collaborator => {
            const statusClass = collaborator.hasActivity ? 'status-completed' : 'status-pending';
            const statusText = collaborator.hasActivity ? 'Actividad Registrada' : 'Sin Actividad';
            const badgeClass = collaborator.hasActivity ? 'badge-success' : 'badge-danger';
            
            html += `
                <div class="collaborator-status-item">
                    <div class="collaborator-info">
                        <span class="collaborator-name">${collaborator.nombre}</span>
                    </div>
                    <div class="collaborator-status">
                        <span class="status-indicator ${statusClass}"></span>
                        <span class="badge ${badgeClass}">${statusText}</span>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    }

    // =================================================================================
    // FUNCIONES AUXILIARES
    // =================================================================================

    function getCollaboratorName(collaboratorId) {
        if (!collaboratorId) return 'Colaborador desconocido';
        const colaborador = appState.colaboradores.find(c => c.id === collaboratorId);
        return colaborador ? colaborador.nombre : 'Colaborador desconocido';
    }

    function getStatusBadge(status) {
        const statusMap = {
            'finalizado': { class: 'badge-success', text: 'Finalizado' },
            'en_proceso': { class: 'badge-warning', text: 'En Proceso' },
            'pendiente': { class: 'badge-danger', text: 'Pendiente' },
            'cancelado': { class: 'badge-secondary', text: 'Cancelado' }
        };
        
        const statusInfo = statusMap[status] || { class: 'badge-secondary', text: status || 'N/A' };
        return `<span class="badge ${statusInfo.class}">${statusInfo.text}</span>`;
    }

    function getPriorityBadge(priority) {
        const priorityMap = {
            'alta': { class: 'badge-danger', text: 'Alta' },
            'media': { class: 'badge-warning', text: 'Media' },
            'baja': { class: 'badge-success', text: 'Baja' }
        };
        
        const priorityInfo = priorityMap[priority] || { class: 'badge-secondary', text: priority || 'N/A' };
        return `<span class="badge ${priorityInfo.class}">${priorityInfo.text}</span>`;
    }

    function getCotizacionStatusBadge(status) {
        const statusMap = {
            'vendida': { class: 'badge-success', text: '✅ Vendida' },
            'en proceso': { class: 'badge-warning', text: '⏳ En Proceso' },
            'rechazada': { class: 'badge-danger', text: '❌ Rechazada' }
        };
        
        const statusInfo = statusMap[status] || { class: 'badge-secondary', text: status || 'N/A' };
        return `<span class="badge ${statusInfo.class}">${statusInfo.text}</span>`;
    }

    function formatTicketType(type) {
        const typeMap = {
            'administracion': 'Administración',
            'soporte': 'Soporte',
            'desarrollo': 'Desarrollo',
            'infraestructura': 'Infraestructura'
        };
        
        return typeMap[type] || (type ? type.charAt(0).toUpperCase() + type.slice(1) : 'N/A');
    }

    function formatDate(timestamp) {
        if (!timestamp) return 'N/A';
        try {
            if (timestamp.toDate) {
                return timestamp.toDate().toLocaleDateString('es-MX', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            }
            return new Date(timestamp).toLocaleDateString('es-MX', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            return 'Fecha inválida';
        }
    }

    function formatDateFromString(dateString) {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleDateString('es-MX', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch (error) {
            return 'Fecha inválida';
        }
    }

    // =================================================================================
    // FUNCIONES DEL MODAL DE IMÁGENES
    // =================================================================================

    // Hacerla global para que funcione desde el onclick
    window.openImageModal = function(imageSrc) {
        const modal = document.getElementById('imageModal');
        const modalImg = document.getElementById('modalImage');
        
        modal.style.display = 'flex';
        modalImg.src = imageSrc;
        
        modal.onclick = function(event) {
            if (event.target === modal) {
                closeImageModal();
            }
        };
    };

    function closeImageModal() {
        document.getElementById('imageModal').style.display = 'none';
    }

    // =================================================================================
    // FUNCIONES DE COTIZACIÓN (PDF)
    // =================================================================================

    async function getBase64ImageFromURL(url) {
        if (appState.logoBase64Cache) return appState.logoBase64Cache;
        
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous'; 
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                const dataURL = canvas.toDataURL('image/png');
                appState.logoBase64Cache = dataURL; 
                resolve(dataURL);
            };
            img.onerror = (e) => {
                console.error("Error al cargar la imagen:", e);
                reject(new Error('No se pudo cargar la imagen del logo.'));
            };
            img.src = url;
        });
    }

    async function showCotizacionPDF(cotizacionData) {
        try {
            Swal.fire({
                title: 'Generando PDF...',
                text: 'Por favor espere',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            const pdfBlob = await generarPDFCotizacion(cotizacionData);
            const pdfUrl = URL.createObjectURL(pdfBlob);
            
            Swal.close();
            
            Swal.fire({
                title: `Cotización ${cotizacionData.cotizacionNumero}`,
                html: `
                    <div style="text-align: left; margin-bottom: 15px;">
                        <p><strong>Cliente:</strong> ${cotizacionData.clienteNombre}</p>
                        <p><strong>Total:</strong> ${formatearMoneda(cotizacionData.totalFinal)}</p>
                        <p><strong>Fecha:</strong> ${new Date(cotizacionData.cotizacionFecha).toLocaleDateString('es-MX')}</p>
                    </div>
                    <iframe src="${pdfUrl}" width="100%" height="500px" frameborder="0"></iframe>
                `,
                width: '80%',
                showCloseButton: true,
                showConfirmButton: true,
                confirmButtonText: 'Descargar PDF',
                showCancelButton: true,
                cancelButtonText: 'Cerrar'
            }).then((result) => {
                if (result.isConfirmed) {
                    const a = document.createElement('a');
                    a.href = pdfUrl;
                    a.download = `cotizacion-${cotizacionData.cotizacionNumero}.pdf`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                }
                URL.revokeObjectURL(pdfUrl);
            });
            
        } catch (error) {
            console.error("Error al generar PDF:", error);
            Swal.fire({
                title: 'Error',
                text: 'No se pudo generar el PDF de la cotización',
                icon: 'error',
                confirmButtonText: 'Aceptar'
            });
        }
    }

    async function generarPDFCotizacion(data) {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF();
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 15;
        const textColor = '#000000';
        const gray = '#6b7280';
        const navy = '#0d2c54';
        const lightGray = '#f5f5f5';
        
        const formatearNumero = (num) => {
            return new Intl.NumberFormat('es-MX', { 
                style: 'currency', 
                currency: 'MXN' 
            }).format(num).replace('MX', '').trim();
        };
        
        const colX = {
            desc: margin,
            unidad: margin + 90,
            cant: margin + 110,
            precio: margin + 130,
            total: margin + 160
        };
        
        let page = 1;
        let y = 20;
        
        const nuevaPagina = () => {
            pdf.addPage();
            page++;
            y = 20;
        };
        
        const piePagina = () => {
            pdf.setFontSize(8);
            pdf.setTextColor(gray);
            pdf.text(`Cotización No. ${data.cotizacionNumero} | Página ${page}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
        };
        
        const categoriaDisplayMap = {
            'CCTV': '📹 CCTV',
            'DH': '🏠 DETECTOR DE HUMO', 
            'CA': '🔐 CONTROL DE ACCESOS',
            'ALARMA INTRUSION': '🚨 ALARMA INTRUSIÓN',
            'MULTIMEDIA': '📺 MULTIMEDIA',
            'REDES': '🛜 REDES TRANSPORTE DE DATOS',
            'OTRO': '📦 OTRO',
            'AI': '🚨 ALARMA INTRUSIÓN',
            'ALARMA': '🚨 ALARMA INTRUSIÓN'
        };
        
        try {
            const LOGO_URL = '../../css/img/Logo-RSI-OFICIAL.png';
            const logoData = await getBase64ImageFromURL(LOGO_URL);
            pdf.addImage(logoData, 'PNG', pageWidth - margin - 40, margin, 40, 40);
        } catch (e) { 
            console.warn('No se pudo cargar el logo:', e); 
        }
        
        pdf.setFontSize(10);
        pdf.setTextColor(navy);
        pdf.text(data.empresaNombre || "RSI ENTERPRISE", margin, y + 5);
        
        pdf.setFontSize(8);
        pdf.setTextColor(gray);
        pdf.text(data.empresaDireccion || "", margin, y + 10);
        pdf.text(`RFC: ${data.empresaRFC || ''} | Tel: ${data.empresaTelefono || ''}`, margin, y + 15);
        
        y += 25;
        
        pdf.setFontSize(14);
        pdf.setTextColor(navy);
        pdf.text("COTIZACIÓN", pageWidth / 2, y, { align: 'center' });
        
        pdf.setFontSize(9);
        pdf.setTextColor(gray);
        pdf.text(`No. ${data.cotizacionNumero} | Fecha: ${new Date(data.cotizacionFecha).toLocaleDateString('es-MX')}`, pageWidth / 2, y + 7, { align: 'center' });
        
        y += 20;
        
        if (data.cotizacionDescripcion && data.cotizacionDescripcion.trim().length > 0) {
            pdf.setFontSize(9);
            pdf.setTextColor(navy);
            pdf.setFont('helvetica', 'bold');
            pdf.text("DESCRIPCIÓN:", margin, y);
            y += 5;
            
            pdf.setFontSize(9);
            pdf.setTextColor(textColor);
            pdf.setFont('helvetica', 'normal');
            const descLines = pdf.splitTextToSize(data.cotizacionDescripcion.trim(), pageWidth - 2 * margin);
            descLines.forEach(line => {
                pdf.text(line, margin, y);
                y += 5;
            });
            y += 5;
        }
        
        pdf.setFontSize(9);
        pdf.setTextColor(textColor);
        pdf.text(`Cliente: ${data.clienteNombre}`, margin, y);
        y += 5;
        pdf.text(`RFC: ${data.clienteRFC || 'N/E'}`, margin, y);
        y += 5;
        pdf.text(`Dirección: ${data.clienteDireccion}`, margin, y);
        y += 10;
        
        const tipoCotizacionMap = {
            'implementacion': 'Implementación',
            'proyecto': 'Proyecto', 
            'servicio': 'Servicio'
        };
        
        let infoPago = `Pago: ${data.tipoCredito || 'N/E'}`;
        if (data.tipoCredito === 'credito' && data.diasCredito) {
            infoPago += ` (${data.diasCredito} días)`;
        }
        
        const info = [
            `Tipo: ${tipoCotizacionMap[data.tipoCotizacion] || 'N/E'}`,
            `Vigencia: ${data.cotizacionVigencia} días`,
            `Moneda: ${data.cotizacionMoneda}`,
            infoPago
        ].join(" | ");
        
        pdf.text(info, margin, y);
        y += 10;
        
        const grupos = agruparTecnologias(data.items);
        
        Object.entries(grupos).forEach(([categoria, items]) => {
            const textoCompleto = categoriaDisplayMap[categoria] || categoria;
            const displayCategoria = textoCompleto.replace(/^(.*?)\s/, '').trim();
            
            if (y > pageHeight - 70) {
                piePagina();
                nuevaPagina();
            }
            
            pdf.setFillColor(navy);
            pdf.rect(margin, y, pageWidth - 2 * margin, 12, 'F');
            
            pdf.setFontSize(12);
            pdf.setTextColor('#FFFFFF');
            pdf.setFont('helvetica', 'bold');
            pdf.text(displayCategoria, pageWidth / 2, y + 8, { align: 'center' });
            
            y += 14;
            
            pdf.setFillColor(navy);
            pdf.rect(margin, y, pageWidth - 2 * margin, 8, 'F');
            
            pdf.setFontSize(8);
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor('#FFFFFF');
            pdf.text("DESCRIPCIÓN", colX.desc, y + 5);
            pdf.text("UNIDAD", colX.unidad, y + 5, { align: 'center' });
            pdf.text("CANT.", colX.cant, y + 5, { align: 'right' });
            pdf.text("P. UNIT.", colX.precio, y + 5, { align: 'right' });
            pdf.text("TOTAL", colX.total, y + 5, { align: 'right' });
            
            y += 10;
            
            items.forEach((item, index) => {
                const descLines = pdf.splitTextToSize(item.descripcion, colX.unidad - colX.desc - 5);
                const itemHeight = Math.max(descLines.length * 5, 10) + 2;
                
                if (y + itemHeight > pageHeight - 20) {
                    piePagina();
                    nuevaPagina();
                }
                
                if (index % 2 === 0) {
                    pdf.setFillColor(lightGray);
                    pdf.rect(margin, y, pageWidth - 2 * margin, itemHeight, 'F');
                }
                
                pdf.setTextColor(textColor);
                
                descLines.forEach((line, i) => {
                    pdf.text(line, colX.desc, y + 5 + (i * 5));
                });
                
                pdf.text(item.tipoTecnologia.slice(0, 4), colX.unidad, y + 5, { align: 'center' });
                pdf.text(item.cantidad.toString(), colX.cant, y + 5, { align: 'right' });
                pdf.text(formatearNumero(item.precio), colX.precio, y + 5, { align: 'right' });
                pdf.text(formatearNumero(item.total), colX.total, y + 5, { align: 'right' });
                
                pdf.setDrawColor(200, 200, 200);
                pdf.line(margin, y + itemHeight, pageWidth - margin, y + itemHeight);
                
                y += itemHeight;
            });
            
            y += 2;
        });
        
        const tableStartX = colX.total - 82;
        const valueColX = tableStartX + 70;
        
        pdf.setFontSize(9);
        pdf.setTextColor(textColor);
        pdf.text("Subtotal:", tableStartX, y + 5, { align: 'left' });
        pdf.text(formatearNumero(data.subtotal), valueColX, y + 5, { align: 'left' });
        y += 5;
        
        if (data.descuentoMonto > 0) {
            pdf.text(`Descuento (${data.descuento}%):`, tableStartX, y + 5, { align: 'left' });
            pdf.text(`-${formatearNumero(data.descuentoMonto)}`, valueColX, y + 5, { align: 'left' });
            y += 5;
        }
        
        pdf.text(`IVA (${data.impuesto}%):`, tableStartX, y + 5, { align: 'left' });
        pdf.text(formatearNumero(data.impuestoMonto), valueColX, y + 5, { align: 'left' });
        y += 7;
        
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(navy);
        pdf.text("TOTAL:", tableStartX, y + 5, { align: 'left' });
        pdf.text(`${formatearNumero(data.totalFinal)} ${data.cotizacionMoneda}`, valueColX, y + 5, { align: 'left' });
        
        if (data.terminos) {
            y += 20;
            if (y > pageHeight - 50) {
                piePagina();
                nuevaPagina();
            }
            
            pdf.setFontSize(9);
            pdf.setTextColor(navy);
            pdf.setFont('helvetica', 'normal');
            pdf.text("TÉRMINOS Y CONDICIONES", margin, y);
            y += 5;
            
            pdf.setTextColor(textColor);
            data.terminos.split('\n').forEach(term => {
                if (term.trim()) {
                    pdf.splitTextToSize(term, pageWidth - 2 * margin).forEach(line => {
                        if (y > pageHeight - 20) {
                            piePagina();
                            nuevaPagina();
                        }
                        pdf.text(line, margin, y);
                        y += 5;
                    });
                }
            });
        }
        
        piePagina();
        return pdf.output('blob');
    }

    function agruparTecnologias(items) {
        if (!items) return {};
        
        const grupos = {};
        items.forEach(item => {
            const categoria = item.categoria || 'OTRO';
            if (!grupos[categoria]) grupos[categoria] = [];
            grupos[categoria].push(item);
        });
        return grupos;
    }

    function formatearMoneda(cantidad) {
        return new Intl.NumberFormat('es-MX', { 
            style: 'currency', 
            currency: 'MXN' 
        }).format(cantidad);
    }

    // =================================================================================
    // EVENT LISTENERS
    // =================================================================================

    function setupEventListeners() {
        document.getElementById('imageModalClose').addEventListener('click', closeImageModal);
        
        document.getElementById('editTicketBtn').addEventListener('click', () => {
            if (appState.currentTicketId) {
                window.location.href = `../editar-ticket/editar-ticket.html?id=${appState.currentTicketId}`;
            }
        });
        
        document.getElementById('deleteTicketBtn').addEventListener('click', handleDeleteTicket);
    }

    // =================================================================================
    // FUNCIONES DE ACCIÓN
    // =================================================================================
    
    async function handleDeleteTicket() {
        const result = await Swal.fire({
            title: '¿Estás seguro?',
            text: "Esta acción moverá el ticket a la papelera. Podrás restaurarlo más tarde si es necesario.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, mover a papelera',
            cancelButtonText: 'Cancelar'
        });
        
        if (result.isConfirmed) {
            try {
                const ticketDoc = await db.collection('ticketsmesa').doc(appState.currentTicketId).get();
                
                if (!ticketDoc.exists) {
                    showError('El ticket no existe.');
                    return;
                }
                
                const ticketData = ticketDoc.data();
                
                const trashData = {
                    ...ticketData,
                    fechaEliminacion: new Date(),
                    eliminadoPor: appState.currentUser ? appState.currentUser.nombre : 'Sistema',
                    originalId: appState.currentTicketId
                };
                
                await db.collection('ticketsmesaPapelera').doc(appState.currentTicketId).set(trashData);
                await db.collection('ticketsmesa').doc(appState.currentTicketId).delete();
                
                await Swal.fire({
                    title: '¡Movido a papelera!',
                    text: 'El ticket ha sido movido a la papelera correctamente.',
                    icon: 'success',
                    confirmButtonColor: '#3085d6'
                });
                
                window.location.href = '../gestion-tickets-admin/gestion-tickets-admin.html';
                
            } catch (error) {
                console.error("Error al mover ticket a papelera:", error);
                showError('No se pudo mover el ticket a la papelera. Inténtalo de nuevo.');
            }
        }
    }

    function showError(message) {
        Swal.fire({
            title: 'Error',
            text: message,
            icon: 'error',
            confirmButtonColor: '#3085d6'
        });
    }

    // =================================================================================
    // INICIALIZACIÓN
    // =================================================================================

    document.addEventListener('DOMContentLoaded', function() {
        auth.onAuthStateChanged((user) => {
            if (user) {
                initialLoad();
            } else {
                window.location.href = '../nav-visitantes/inicio-de-sesion.html';
            }
        });
    });
})();