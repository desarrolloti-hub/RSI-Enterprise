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
          callback(); 
      };
      document.head.appendChild(script);
  }

  // --- FUNCIÓN AUXILIAR: Ejecutar el proceso de reporte (Captura + Redirección) ---
  function ejecutarProcesoDeReporte(errorData) {
    isRedirecting = true; // Ahora sí bloqueamos para evitar dobles envíos

    // 1. Mostrar aviso de "Tomando foto" (Overlay)
    const aviso = document.createElement('div');
    aviso.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); color:white; display:flex; align-items:center; justify-content:center; z-index:99999; font-family:sans-serif; font-size:1.5rem; flex-direction:column;";
    aviso.innerHTML = '<i class="fas fa-camera" style="margin-bottom:15px; font-size:3rem;"></i><div>Generando reporte...<br><small style="font-size:1rem">Por favor espera un momento</small></div>';
    
    // Animación simple
    const styleSheet = document.createElement("style");
    styleSheet.innerText = "@keyframes blink { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }";
    document.head.appendChild(styleSheet);
    document.body.appendChild(aviso);

    // 2. Cargar librería y tomar captura
    loadHtml2Canvas(async () => {
      try {
        let screenshotBase64 = null;
        if(window.html2canvas) {
          const canvas = await html2canvas(document.body, {
            useCORS: true,
            logging: false,
            scale: 1,
            x: window.scrollX,
            y: window.scrollY,
            width: window.innerWidth,
            height: window.innerHeight,
            windowWidth: window.innerWidth,
            windowHeight: window.innerHeight,
            ignoreElements: (el) => el === aviso // Ignoramos el aviso negro
          });
          screenshotBase64 = canvas.toDataURL('image/jpeg', 0.5); 
        }
        
        // 3. Guardar datos
        if (screenshotBase64) {
            sessionStorage.setItem('tempReportScreenshot', screenshotBase64);
        }
        sessionStorage.setItem('autoErrorReportData', JSON.stringify(errorData));

        // 4. Redirigir al Admin / Crear Reporte
        window.location.href = "../crear-reporte/crear-reporte.html?autoReport=1";

      } catch (e) {
        console.error("Fallo al generar captura automática:", e);
        // Si falla la captura, mandamos los datos de texto de todos modos
        sessionStorage.setItem('autoErrorReportData', JSON.stringify(errorData));
        window.location.href = "../crear-reporte/crear-reporte.html?autoReport=1";
      }
    });
  }

  // -----------------------------------------
  // 1. MANEJADOR GLOBAL DE ERRORES (PRINCIPAL)
  // -----------------------------------------
  function manejarErrorGlobal(error) {
    if (isRedirecting) return; // Si ya estamos yendo al reporte, no hacer nada más

    // A. Preparar datos del error
    const errorMsg = error.message || (typeof error === 'string' ? error : '') || '';
    const errorStack = error.stack || '';

    // =========================================================================
    // 🛡️ ZONA DE EXCEPCIONES (Ignorar errores específicos)
    // =========================================================================
    const erroresIgnorados = [
        "requires an index",             
        "failed to fetch",               
        "network error",                 
        "resizeobserver loop limit",
        "service worker",     
        "script error"                   
    ];

    const esErrorIgnorable = erroresIgnorados.some(frase => 
        errorMsg.toLowerCase().includes(frase.toLowerCase())
    );

    if (esErrorIgnorable) {
        console.warn("⚠️ Error ignorado por configuración:", errorMsg);
        return; 
    }
    // =========================================================================

    // B. Si es un "isUserError" (validación simple), mostrar alerta leve y salir
    if (error && error.isUserError === true) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'warning',
                title: 'Atención',
                text: errorMsg,
                confirmButtonColor: '#4e54c8'
            });
        } else {
            alert(errorMsg);
        }
        return;
    }

    console.error("🛑 Error crítico capturado (Esperando confirmación de usuario):", error);

    // C. Preparar objeto de datos para el reporte
    const errorData = {
        isAutoReport: true, 
        mensaje: errorMsg || 'Error desconocido',
        stack: errorStack || "Sin detalles técnicos",
        tipo: 'Bug Critico', 
        prioridad: 'Alta',   
        fecha: new Date().toISOString(),
        origen: window.location.pathname,
        navegador: navigator.userAgent
    };

    // D. MODAL DE CONFIRMACIÓN (Aquí está el cambio clave)
    if (typeof Swal !== 'undefined') {
        // Opción bonita con SweetAlert2
        Swal.fire({
            title: '¡Se ha detectado un error!',
            text: 'El sistema ha encontrado un problema inesperado. ¿Deseas enviar un reporte automático a soporte técnico?',
            icon: 'error',
            showCancelButton: true,
            confirmButtonColor: '#d33', // Rojo para acción importante
            cancelButtonColor: '#3085d6', // Azul para cancelar
            confirmButtonText: 'Sí, reportar error',
            cancelButtonText: 'No, continuar aquí',
            allowOutsideClick: false,
            allowEscapeKey: false
        }).then((result) => {
            if (result.isConfirmed) {
                // Usuario dijo SI -> Ejecutamos captura y redirección
                ejecutarProcesoDeReporte(errorData);
            } else {
                // Usuario dijo NO -> No hacemos nada, se queda en la página
                console.log("Usuario decidió no reportar el error.");
            }
        });
    } else {
        // Opción de respaldo (nativo del navegador) si Swal no carga
        if (confirm("¡Error del Sistema detectedo!\n\n¿Deseas enviar un reporte automático con captura de pantalla?")) {
            ejecutarProcesoDeReporte(errorData);
        }
    }
  }

  // -----------------------------------------
  // 2. FILTRO DE CALIDAD (ErrorFilter)
  // -----------------------------------------
  class ErrorFilter {
    static config = {
      minDescriptionLength: 5, 
      minReproStepsLength: 0, 
      allowedAttachmentTypes: ['image/jpeg','image/png','image/webp','application/pdf'],
      maxAttachmentSizeBytes: 10 * 1024 * 1024, 
      maxTotalAttachmentBytes: 25 * 1024 * 1024, 
      spamWindowMinutes: 5, 
      spamMaxReportsInWindow: 10, 
      requiredFields: ['description', 'type'] 
    };

    static _normalizeText(s='') {
      return s.replace(/\s+/g,' ').trim().toLowerCase();
    }

    static _validateAttachments(attachments=[]) {
      if (!attachments || !Array.isArray(attachments)) return { ok: true }; 
      
      let total = 0;
      for (const f of attachments) {
        if (!f.sizeBytes) continue;
        if (f.sizeBytes > ErrorFilter.config.maxAttachmentSizeBytes) {
          return { ok: false, message: `La imagen es muy pesada. Máximo ${Math.round(ErrorFilter.config.maxAttachmentSizeBytes/1024/1024)}MB.` };
        }
        total += f.sizeBytes;
      }
      
      if (total > ErrorFilter.config.maxTotalAttachmentBytes) {
        return { ok: false, message: 'El total de archivos es demasiado grande.' };
      }
      return { ok: true };
    }

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

  window.ErrorFilter = ErrorFilter;
  window.manejarErrorGlobal = manejarErrorGlobal;

  // --- AUTO-CAPTURA ---
  window.onerror = function(message, source, lineno, colno, error) {
      manejarErrorGlobal({
          message: message,
          stack: error ? error.stack : `${source}:${lineno}:${colno}`,
          isUserError: false 
      });
      return true; 
  };

  window.addEventListener('unhandledrejection', function(event) {
      let mensaje = event.reason;
      if (event.reason && event.reason.message) {
          mensaje = event.reason.message;
      }

      manejarErrorGlobal({
          message: mensaje,
          stack: event.reason ? event.reason.stack : 'Sin stack',
          isUserError: false
      });
  });

})();