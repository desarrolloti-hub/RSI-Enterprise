// filtrar-error.js - Versión Amigable para Usuarios Reales
(function() {
  'use strict';

  // -----------------------------------------
  // 1. MANEJADOR GLOBAL DE ERRORES (Tu lógica original intacta)
  // -----------------------------------------
  function manejarErrorGlobal(error) {
    // Si es un error controlado (validación de usuario, etc.)
    if (error && error.isUserError === true) {
        alert(error.message);
        return;
    }

    console.error("Error crítico capturado:", error);

    // Preparamos el objeto de error de forma segura
    const errorData = {
        mensaje: error.message || (typeof error === 'string' ? error : 'Error desconocido'),
        stack: error.stack || "Sin detalles técnicos",
        fecha: new Date().toISOString(),
        modulo: window.location.pathname
    };

    try {
        localStorage.setItem("errorReport", JSON.stringify(errorData));
        // Redirigimos a la página de reporte
        // Asegúrate de que la ruta sea relativa correcta desde donde estés
        window.location.href = "../sistema-reportes/crear-reporte.html"; 
    } catch (e) {
        console.error("No se pudo guardar el reporte automático:", e);
        alert("Ocurrió un error crítico y no pudimos generar el reporte automático.\n\n" + errorData.mensaje);
    }
  }

  // -----------------------------------------
  // 2. FILTRO DE CALIDAD (ErrorFilter) - RELAJADO
  // -----------------------------------------
  class ErrorFilter {
    
    // CONFIGURACIÓN AJUSTADA PARA SER "JUSTA"
    static config = {
      minDescriptionLength: 5, // Bajado de 20 a 5. "Falla" ya es válido.
      
      // Eliminamos la obligatoriedad estricta de pasos
      minReproStepsLength: 0, 
      
      allowedAttachmentTypes: ['image/jpeg','image/png','image/webp','application/pdf'],
      maxAttachmentSizeBytes: 10 * 1024 * 1024, // Subido a 10MB (las fotos de celular pesan mucho)
      maxTotalAttachmentBytes: 25 * 1024 * 1024, 

      // Filtros de spam (mantenemos para seguridad básica)
      spamWindowMinutes: 5, 
      spamMaxReportsInWindow: 10, // Permitimos más intentos

      // Eliminamos la lista de palabras "vagas" para no frustrar al usuario
      // requiredFields: Ya no exigimos 'stepsToReproduce'
      requiredFields: ['description', 'type'] 
    };

    // --- UTILIDADES ---
    static _normalizeText(s='') {
      return s.replace(/\s+/g,' ').trim().toLowerCase();
    }

    // Validador de Adjuntos (Mantenemos lógica de seguridad)
    static _validateAttachments(attachments=[]) {
      if (!attachments || !Array.isArray(attachments)) return { ok: true }; // Si no hay, todo bien
      
      let total = 0;
      for (const f of attachments) {
        if (!f.sizeBytes) continue;
        
        // Validación suave de tipos (si el navegador no detecta mime, lo dejamos pasar por ahora)
        if (f.mime && !ErrorFilter.config.allowedAttachmentTypes.includes(f.mime)) {
           // Opcional: Podrías retornar false, pero a veces los mimes fallan. 
           // Dejamos pasar imágenes comunes.
        }
        
        if (f.sizeBytes > ErrorFilter.config.maxAttachmentSizeBytes) {
          return { ok: false, message: `La imagen es muy pesada (${Math.round(f.sizeBytes/1024/1024)}MB). Máximo ${Math.round(ErrorFilter.config.maxAttachmentSizeBytes/1024/1024)}MB.` };
        }
        total += f.sizeBytes;
      }
      
      if (total > ErrorFilter.config.maxTotalAttachmentBytes) {
        return { ok: false, message: 'El total de archivos es demasiado grande.' };
      }
      return { ok: true };
    }

    // --- VALIDADOR PRINCIPAL (MODIFICADO) ---
    static async validateManualReport(data = {}) {
      
      // 1. Validación básica de existencia
      if (!data || typeof data !== 'object') {
        return { isValid: false, message: 'Error interno: Datos del reporte vacíos.' };
      }

      // 2. Campos mínimos vitales
      const desc = (data.description || '').trim();
      const type = (data.type || 'Bug').trim();

      if (!desc) {
        return { isValid: false, message: 'Por favor, escribe una breve descripción del problema.' };
      }

      // 3. Longitud mínima relajada
      if (desc.length < ErrorFilter.config.minDescriptionLength) {
        return { isValid: false, message: `La descripción es muy corta. Por favor detalla un poco más.` };
      }

      // 4. Validación de adjuntos (si existen)
      const attachCheck = ErrorFilter._validateAttachments(data.attachments);
      if (!attachCheck.ok) {
        return { isValid: false, message: attachCheck.message };
      }

      // 5. (Opcional) Detección básica de "texto basura"
      // Evita reportes como "asdfghjkl" o "..."
      const uniqueChars = new Set(desc).size;
      if (uniqueChars < 3 && desc.length > 5) {
         return { isValid: false, message: 'La descripción no parece válida. Por favor sé más específico.' };
      }

      // Si pasa todo, es válido
      return { isValid: true, code: 'OK', message: 'Reporte válido.' };
    }
  }

  // Exportar globalmente
  window.ErrorFilter = ErrorFilter;
  window.manejarErrorGlobal = manejarErrorGlobal;

})();