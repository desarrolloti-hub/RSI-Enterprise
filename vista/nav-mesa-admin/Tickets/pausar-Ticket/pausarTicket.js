// modules/pausarTicket.js
// Dependencias: requiere Firebase (db, auth) y funciones globales de UI (showLoading, hideLoading, showError, showSuccess)
import { db, auth } from '../firebase-init.js'; // Ajusta la ruta según tu configuración
import { showLoading, hideLoading, showError, showSuccess } from '../utils/ui.js'; // Funciones de UI reutilizables
import { recordHistory } from '../utils/history.js'; // Si tienes history separado, o puedes pasar la función

// Constantes de validación
const MAX_PAUSE_REASON_LENGTH = 500;
const MIN_PAUSE_REASON_LENGTH = 10;

/**
 * Valida la razón de pausa
 * @param {string} reason
 * @throws {Error} si no cumple las reglas
 */
export function validatePauseForm(reason) {
    if (reason.length < MIN_PAUSE_REASON_LENGTH) {
        throw new Error(`La razón de pausa debe tener al menos ${MIN_PAUSE_REASON_LENGTH} caracteres`);
    }
    if (reason.length > MAX_PAUSE_REASON_LENGTH) {
        throw new Error(`La razón de pausa no debe exceder ${MAX_PAUSE_REASON_LENGTH} caracteres`);
    }
    return true;
}

/**
 * Pausa un ticket registrando la razón y actualizando el estado
 * @param {string} ticketId
 * @param {object} userData - { colaboradorId, NOMBRE }
 * @param {string} reason
 */
export async function handlePauseTicket(ticketId, userData, reason) {
    try {
        showLoading('Pausando ticket y registrando razón...');

        const ticketRef = db.collection('ticketsmesa').doc(ticketId);
        const ticketSnap = await ticketRef.get();
        const oldStatus = ticketSnap.data().estado || 'desconocido';

        const updateData = {
            estado: 'en_proceso', // Estado de Pausa (puedes usar 'pausado' si lo prefieres)
            pauseComment: reason,
            fechaActualizacion: firebase.firestore.FieldValue.serverTimestamp()
        };

        await ticketRef.update(updateData);

        await recordHistory(
            ticketId,
            oldStatus,
            'en_proceso',
            `Pausado desde formulario de Finalización: ${reason}`,
            userData.colaboradorId,
            userData.NOMBRE
        );

        hideLoading();
        await showSuccess('El ticket ha sido puesto en pausa. Volverá a la lista activa en Gestión de Tickets.', 'Ticket en Pausa');
        
        window.location.href = '../gestion-tickets/gestion-tickets.html';
        
    } catch (error) {
        console.error("Error al pausar ticket:", error);
        showError(error.message || 'No se pudo pausar el ticket.');
        hideLoading();
    }
}

/**
 * Muestra un diálogo SweetAlert2 para ingresar la razón de pausa y ejecuta la pausa.
 * @param {string} ticketId
 * @param {object} userData
 * @param {string} initialReason - razón existente (si se está editando)
 */
export async function showPauseDialog(ticketId, userData, initialReason = '') {
    const swalHtml = `
        <label for="swalPauseReason" class="swal2-label" style="text-align: left; display: block; margin-bottom: 10px;">
            <i class="fas fa-comment-dots"></i> Razón para poner en pausa (Requerido)
        </label>
        <textarea 
            id="swalPauseReason" 
            class="swal2-textarea" 
            rows="4" 
            minlength="10" 
            maxlength="500" 
            placeholder="Escriba la razón detallada para pausar el ticket (mínimo 10 caracteres)"
            style="width: 100%; box-sizing: border-box;"
        ></textarea>
        <div class="char-counter" style="text-align: right; font-size: 0.8em; color: #999; margin-top: 5px;">
            <span id="swalPauseCharCount">0</span>/${MAX_PAUSE_REASON_LENGTH} caracteres
        </div>
    `;

    const { value: reason } = await Swal.fire({
        title: 'Razón para Pausar Ticket',
        html: swalHtml,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: '<i class="fas fa-pause"></i> Pausar Ticket',
        cancelButtonText: 'Cancelar',
        focusConfirm: false,
        didOpen: () => {
            const swalTextarea = Swal.getHtmlContainer().querySelector('#swalPauseReason');
            const swalCounter = Swal.getHtmlContainer().querySelector('#swalPauseCharCount');
            
            swalTextarea.value = initialReason;
            swalCounter.textContent = `${initialReason.length}/${MAX_PAUSE_REASON_LENGTH} caracteres`;

            swalTextarea.addEventListener('input', function() {
                let length = this.value.length;
                if (length > MAX_PAUSE_REASON_LENGTH) {
                    this.value = this.value.substring(0, MAX_PAUSE_REASON_LENGTH);
                    length = MAX_PAUSE_REASON_LENGTH;
                }
                swalCounter.textContent = `${length}/${MAX_PAUSE_REASON_LENGTH} caracteres`;
            });
        },
        preConfirm: (reasonInput) => {
            const reason = Swal.getHtmlContainer().querySelector('#swalPauseReason').value.trim();
            try {
                validatePauseForm(reason);
                return reason;
            } catch (error) {
                Swal.showValidationMessage(error.message);
                return false;
            }
        }
    });

    if (reason) {
        await handlePauseTicket(ticketId, userData, reason);
    }
}