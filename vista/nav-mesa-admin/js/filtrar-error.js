// filtrar-error.js
(function() {
  'use strict';

  let isRedirecting = false;

  // --- DEPENDENCIA: Cargar html2canvas dinámicamente si no existe ---
  function loadHtml2Canvas(callback) {
      if (window.html2canvas) {
          callback();
          return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
      script.onload = callback;
      script.onerror = () => {
          console.error('Error cargando html2canvas para reporte automático');
          callback(); // Continuamos aunque falle la carga (sin foto)
      };
      document.head.appendChild(script);
  }

  // -----------------------------------------
  // 1. MANEJADOR GLOBAL DE ERRORES (Tu lógica original intacta)
  // -----------------------------------------
  function manejarErrorGlobal(error) {
    if (isRedirecting) return;
    // Si es un error controlado (validación de usuario, etc.)
    if (error && error.isUserError === true) {
        alert(error.message);
        return;
    }


    isRedirecting = true; // Evitar múltiples redirecciones
    console.error("Error crítico capturado:", error);

    // Preparamos el objeto de error de forma segura
    const errorData = {
        isAutoReport: true, // Bandera para saber que es automático
        mensaje: error.message || (typeof error === 'string' ? error : 'Error desconocido'),
        stack: error.stack || "Sin detalles técnicos (Stack trace no disponible)",
        tipo: 'Bug Critico', // Clasificación automática
        prioridad: 'Alta',   // Prioridad automática
        fecha: new Date().toISOString(),
        origen: window.location.pathname,
        navegador: navigator.userAgent
    };

    // 2. Intentamos tomar la captura AUTOMÁTICAMENTE
    // Mostramos un aviso sutil al usuario mientras capturamos
    const aviso = document.createElement('div');
    aviso.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); color:white; display:flex; align-items:center; justify-content:center; z-index:99999; font-family:sans-serif; font-size:1.5rem; flex-direction:column;";
    aviso.innerHTML = '<i class="fas fa-camera" style="margin-bottom:15px; font-size:3rem;"></i><div>Detectamos un problema...<br><small style="font-size:1rem">Generando reporte automático</small></div>';
    
    const styleSheet = document.createElement("style");
    styleSheet.innerText = "@keyframes blink { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }";
    document.head.appendChild(styleSheet);
    
    document.body.appendChild(aviso);

    loadHtml2Canvas(async () =>{
      try {
        let screenshotBase64 = null;
        if(window.html2canvas) {
          const canvas = await html2canvas(document.body, {
            useCORS: true,
            logging: false,
            scale:1,

            //1. coordenadas
            x: window.scrollX,
            y: window.scrollY,
            width: window.innerWidth,
            height: window.innerHeight,

            windowWidth: window.innerWidth,
            windowHeight: window.innerHeight,
            ignoreElements: (el) => el === aviso // Ignoramos el aviso
          });
          screenshotBase64 = canvas.toDataURL('image/jpeg', 0.5); // Calidad 70%
        }
            // 3. Guardar en SessionStorage (más seguro que LocalStorage para datos grandes temporales)
            // Guardamos la imagen por separado para no saturar el objeto JSON si es muy grande
            if (screenshotBase64) {
                sessionStorage.setItem('tempReportScreenshot', screenshotBase64);
            }
            sessionStorage.setItem('autoErrorReportData', JSON.stringify(errorData));

        // 4. Redirigir a la página de reporte con indicador de automático
        window.location.href="../crear-reporte/crear-reporte.html?autoReport=1";
    } catch (e) {
 console.error("Fallo al generar captura automática:", e);
            // Si falla la captura, guardamos solo los datos y redirigimos igual
            sessionStorage.setItem('autoErrorReportData', JSON.stringify(errorData));
    }
    });
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
      if (!data || typeof data !== 'object') return { isValid: false, message: 'Datos vacíos.' };
      
      const desc = (data.description || '').trim();
      if (!desc) return { isValid: false, message: 'Falta descripción.' };
      if (desc.length < ErrorFilter.config.minDescriptionLength) return { isValid: false, message: `Descripción muy corta.` };

      const attachCheck = ErrorFilter._validateAttachments(data.attachments);
      if (!attachCheck.ok) return { isValid: false, message: attachCheck.message };

      return { isValid: true, code: 'OK', message: 'Válido.' };
    }
  
  }

  // Exportar globalmente
  window.ErrorFilter = ErrorFilter;
  window.manejarErrorGlobal = manejarErrorGlobal;

  // --- AUTO-CAPTURA DE ERRORES DE JAVASCRIPT ---
  // Esto hace que cualquier "crash" real active tu función
  window.onerror = function(message, source, lineno, colno, error) {
      manejarErrorGlobal({
          message: message,
          stack: error ? error.stack : `${source}:${lineno}:${colno}`,
          isUserError: false // Es un error real del sistema
      });
      return true; // Evita que el error salga en la consola estándar del navegador
  };

  // Captura también promesas fallidas (fetch, async/await)
  window.addEventListener('unhandledrejection', function(event) {
      manejarErrorGlobal({
          message: 'Promesa rechazada (Posible fallo de red o BD): ' + event.reason,
          stack: event.reason ? event.reason.stack : 'Sin stack',
          isUserError: false
      });
  });

})();