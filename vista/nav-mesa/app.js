// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const { jsPDF } = window.jspdf;

// Variables globales
let currentTicketId = null;
let tickets = [];

// Elementos del DOM
const tableViewBtn = document.getElementById('tableViewBtn');
const cardViewBtn = document.getElementById('cardViewBtn');
const tableView = document.getElementById('tableView');
const cardView = document.getElementById('cardView');
const ticketsTableBody = document.getElementById('ticketsTableBody');
const ticketsCardsContainer = document.getElementById('ticketsCardsContainer');
const previewModal = document.getElementById('previewModal');
const editModal = document.getElementById('editModal');
const closeModalButtons = document.querySelectorAll('.close-modal');
const previewContent = document.getElementById('previewContent');
const previewTitle = document.getElementById('previewTitle');
const editDescription = document.getElementById('editDescription');
const saveEditBtn = document.getElementById('saveEditBtn');

// Event Listeners
tableViewBtn.addEventListener('click', () => {
    tableViewBtn.classList.add('active');
    cardViewBtn.classList.remove('active');
    tableView.classList.add('active');
    cardView.classList.remove('active');
});

cardViewBtn.addEventListener('click', () => {
    cardViewBtn.classList.add('active');
    tableViewBtn.classList.remove('active');
    cardView.classList.add('active');
    tableView.classList.remove('active');
});

closeModalButtons.forEach(button => {
    button.addEventListener('click', () => {
        previewModal.style.display = 'none';
        editModal.style.display = 'none';
    });
});

window.addEventListener('click', (e) => {
    if (e.target === previewModal) {
        previewModal.style.display = 'none';
    }
    if (e.target === editModal) {
        editModal.style.display = 'none';
    }
});

saveEditBtn.addEventListener('click', saveTicketDescription);

// Cargar tickets al cargar la página
document.addEventListener('DOMContentLoaded', loadTickets);

// Función para cargar tickets desde Firestore
function loadTickets() {
    db.collection('evidenciatickets').orderBy('fechaCreacion', 'desc').get()
        .then((querySnapshot) => {
            tickets = [];
            ticketsTableBody.innerHTML = '';
            ticketsCardsContainer.innerHTML = '';
            
            querySnapshot.forEach((doc) => {
                const ticket = doc.data();
                ticket.id = doc.id;
                tickets.push(ticket);
                
                // Agregar a la tabla
                addTicketToTable(ticket);
                
                // Agregar a las tarjetas
                addTicketToCards(ticket);
            });
        })
        .catch((error) => {
            console.error("Error al obtener tickets: ", error);
        });
}

// Función para agregar ticket a la tabla
function addTicketToTable(ticket) {
    const row = document.createElement('tr');
    
    row.innerHTML = `
        <td>${ticket.ticketId || ticket.id.substring(0, 8)}</td>
        <td>${ticket.colaboradorNombre}</td>
        <td>${ticket.titulo || 'Sin título'}</td>
        <td>${ticket.descripcion.substring(0, 50)}${ticket.descripcion.length > 50 ? '...' : ''}</td>
        <td>${formatDate(ticket.fechaCreacion)}</td>
        <td><span class="status-badge status-${ticket.estado}">${ticket.estado.replace('_', ' ')}</span></td>
        <td>
            <div class="action-buttons">
                <button class="btn btn-primary" onclick="showPreview('${ticket.id}')">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-secondary" onclick="showEditModal('${ticket.id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-danger" onclick="generatePDF('${ticket.id}')">
                    <i class="fas fa-file-pdf"></i>
                </button>
            </div>
        </td>
    `;
    
    ticketsTableBody.appendChild(row);
}

// Función para agregar ticket a las tarjetas
function addTicketToCards(ticket) {
    const card = document.createElement('div');
    card.className = 'ticket-card';
    
    card.innerHTML = `
        <div class="card-header">
            <h3 class="card-title">Ticket #${ticket.ticketId || ticket.id.substring(0, 8)}</h3>
            <span class="status-badge status-${ticket.estado}">${ticket.estado.replace('_', ' ')}</span>
        </div>
        <div class="card-body">
            <h4>${ticket.titulo || 'Sin título'}</h4>
            <p class="card-description">${ticket.descripcion.substring(0, 100)}${ticket.descripcion.length > 100 ? '...' : ''}</p>
        </div>
        <div class="card-footer">
            <span>${ticket.colaboradorNombre} • ${formatDate(ticket.fechaCreacion)}</span>
            <div class="card-actions">
                <button class="btn btn-primary" onclick="showPreview('${ticket.id}')">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-secondary" onclick="showEditModal('${ticket.id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-danger" onclick="generatePDF('${ticket.id}')">
                    <i class="fas fa-file-pdf"></i>
                </button>
            </div>
        </div>
    `;
    
    ticketsCardsContainer.appendChild(card);
}

// Función para mostrar vista previa del ticket
function showPreview(ticketId) {
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) return;
    
    currentTicketId = ticketId;
    previewTitle.textContent = `Ticket #${ticket.ticketId || ticket.id}`;
    
    // Construir el contenido de la vista previa
    let html = `
        <div class="preview-section">
            <h3>Información Básica</h3>
            <div class="preview-field">
                <span class="preview-label">Título:</span>
                <span class="preview-value">${ticket.titulo || 'No especificado'}</span>
            </div>
            <div class="preview-field">
                <span class="preview-label">Colaborador:</span>
                <span class="preview-value">${ticket.colaboradorNombre} (ID: ${ticket.colaboradorId})</span>
            </div>
            <div class="preview-field">
                <span class="preview-label">Estado:</span>
                <span class="preview-value"><span class="status-badge status-${ticket.estado}">${ticket.estado.replace('_', ' ')}</span></span>
            </div>
            <div class="preview-field">
                <span class="preview-label">Fecha de Creación:</span>
                <span class="preview-value">${formatDate(ticket.fechaCreacion)}</span>
            </div>
            ${ticket.fechaActualizacion ? `
            <div class="preview-field">
                <span class="preview-label">Última Actualización:</span>
                <span class="preview-value">${formatDate(ticket.fechaActualizacion)}</span>
            </div>` : ''}
        </div>
        
        <div class="preview-section">
            <h3>Descripción</h3>
            <p class="preview-value">${ticket.descripcion}</p>
        </div>
    `;
    
    // Verificar si hay imágenes y agregarlas
    if (ticket.imagenes && ticket.imagenes.length > 0) {
        html += `
            <div class="preview-section">
                <h3>Evidencias Fotográficas (${ticket.imagenes.length})</h3>
                <div class="preview-images">
                    ${ticket.imagenes.map(img => `<img src="${img}" alt="Evidencia">`).join('')}
                </div>
            </div>
        `;
    }
    
    // Obtener información adicional de ticketsmesa
    db.collection('ticketsmesa').doc(ticketId).get()
        .then((doc) => {
            if (doc.exists) {
                const mesaData = doc.data();
                html += `
                    <div class="preview-section">
                        <h3>Información Adicional</h3>
                        <div class="preview-field">
                            <span class="preview-label">Área:</span>
                            <span class="preview-value">${mesaData.area || 'No especificado'}</span>
                        </div>
                        <div class="preview-field">
                            <span class="preview-label">Cliente:</span>
                            <span class="preview-value">${mesaData.cliente || 'No especificado'}</span>
                        </div>
                        <div class="preview-field">
                            <span class="preview-label">Proyecto:</span>
                            <span class="preview-value">${mesaData.proyecto || 'No especificado'}</span>
                        </div>
                        <div class="preview-field">
                            <span class="preview-label">Servicio:</span>
                            <span class="preview-value">${mesaData.servicio || 'No especificado'}</span>
                        </div>
                    </div>
                `;
            }
            
            previewContent.innerHTML = html;
            previewModal.style.display = 'block';
        })
        .catch((error) => {
            console.error("Error al obtener datos de ticketsmesa: ", error);
            previewContent.innerHTML = html;
            previewModal.style.display = 'block';
        });
}

// Función para mostrar modal de edición
function showEditModal(ticketId) {
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) return;
    
    currentTicketId = ticketId;
    editDescription.value = ticket.descripcion;
    editModal.style.display = 'block';
}

// Función para guardar los cambios de edición
function saveTicketDescription() {
    const newDescription = editDescription.value.trim();
    if (!newDescription || !currentTicketId) return;
    
    db.collection('evidenciatickets').doc(currentTicketId).update({
        descripcion: newDescription,
        fechaActualizacion: new Date()
    })
    .then(() => {
        alert('Descripción actualizada correctamente');
        editModal.style.display = 'none';
        loadTickets(); // Recargar los tickets para reflejar los cambios
    })
    .catch((error) => {
        console.error("Error al actualizar ticket: ", error);
        alert('Error al actualizar la descripción');
    });
}

// Función para generar PDF
function generatePDF(ticketId) {
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) return;
    
    // Verificar si existe en ticketsmesa y recolectar esa información
    db.collection('ticketsmesa').doc(ticketId).get()
        .then((doc) => {
            const mesaData = doc.exists ? doc.data() : null;
            createPDF(ticket, mesaData);
        })
        .catch((error) => {
            console.error("Error al verificar ticket en ticketsmesa: ", error);
            createPDF(ticket, null);
        });
}

// Función para crear el PDF
function createPDF(ticket, mesaData) {
    const doc = new jsPDF();
    
    // Encabezado con ID del ticket como título
    doc.setFontSize(16);
    doc.setTextColor(40);
    doc.text(`REPORTE DE TICKET #${ticket.ticketId || ticket.id.substring(0, 8)}`, 105, 15, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`AREA: ${mesaData?.area || 'No especificado'}`, 14, 25);
    doc.text(`Dirección: ${mesaData?.direccionFiscal || 'No especificada'}`, 14, 30);
    doc.text(`RFC: ${mesaData?.rfc || 'No especificado'}`, 14, 35);
    
    // Información del ticket (ahora más prominente)
    doc.setFontSize(14);
    doc.text('INFORMACIÓN DEL TICKET', 14, 45);
    
    doc.setFontSize(12);
    doc.text(`ID: ${ticket.ticketId || ticket.id}`, 14, 55);
    doc.text(`Título: ${ticket.titulo || 'No especificado'}`, 14, 60);
    doc.text(`Colaborador: ${ticket.colaboradorNombre}`, 14, 65);
    doc.text(`Fecha: ${formatDate(ticket.fechaCreacion)}`, 14, 70);
    doc.text(`Estado: ${ticket.estado.replace('_', ' ')}`, 14, 75);
    
    // Información del cliente (si existe en ticketsmesa)
    if (mesaData) {
        doc.setFontSize(14);
        doc.text('INFORMACIÓN DEL CLIENTE', 14, 85);
        
        doc.setFontSize(12);
        doc.text(`CLIENTE: ${mesaData.cliente || 'No especificado'}`, 14, 95);
        doc.text(`DIRECCIÓN FISCAL: ${mesaData.direccionFiscal || 'No especificada'}`, 14, 100);
        doc.text(`ATENCIÓN: ${mesaData.atencionA || 'No especificado'}`, 14, 105);
        doc.text(`CORREO: ${mesaData.correo || 'No especificado'}`, 14, 110);
        doc.text(`SISTEMAS: ${mesaData.sistemas?.join(' | ') || 'No especificados'}`, 14, 115);
    }
    
    // Detalles del servicio (si existe en ticketsmesa)
    if (mesaData) {
        doc.setFontSize(14);
        doc.text('DETALLES DEL SERVICIO', 14, 125);
        
        doc.setFontSize(12);
        doc.text(`ORDEN DE SERVICIO: ${mesaData.ordenServicio || '0000'}`, 14, 135);
        doc.text(`PROYECTO: ${mesaData.proyecto || 'No especificado'}`, 14, 140);
        doc.text(`SERVICIO: ${mesaData.servicio || 'No especificado'}`, 14, 145);
    }
    
    // Descripción de actividades
    doc.setFontSize(14);
    doc.text('DESCRIPCIÓN DEL TICKET', 14, 155);
    
    doc.setFontSize(12);
    const splitDesc = doc.splitTextToSize(ticket.descripcion, 180);
    doc.text(splitDesc, 14, 165);
    
    // Observaciones (si existen en ticketsmesa)
    if (mesaData?.descripcionActividades) {
        doc.setFontSize(14);
        doc.text('OBSERVACIONES ADICIONALES', 14, doc.autoTable.previous.finalY + 10);
        
        doc.setFontSize(12);
        const splitObs = doc.splitTextToSize(mesaData.descripcionActividades, 180);
        doc.text(splitObs, 14, doc.autoTable.previous.finalY + 20);
    }
    
    // Pie de página
    doc.setFontSize(10);
    doc.text('Documento generado automáticamente por el sistema de tickets', 105, 280, { align: 'center' });
    
    // Guardar el PDF
    doc.save(`ticket_${ticket.ticketId || ticket.id}.pdf`);
}

// Función auxiliar para formatear fechas
function formatDate(date) {
    if (!date) return 'No especificada';
    
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}