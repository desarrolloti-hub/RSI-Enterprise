// PDF Manager - Maneja toda la lógica de generación de PDFs
const pdfManager = {
    colaboradores: [],
    db: null,
    ticketData: null,
    featuredItem: null,
    currentPage: 1,
    totalPages: 1,

    // Inicializar el manager
    initialize(colaboradores, db) {
        this.colaboradores = colaboradores;
        this.db = db;
    },

    // Preparar la generación del PDF con SweetAlert2
    async preparePdfGenerationWithSweetAlert(ticketData) {
        this.ticketData = ticketData;
        this.featuredItem = null;
        this.currentPage = 1;
        this.totalPages = 1;

        // Crear HTML para las imágenes disponibles
        let imagesHtml = '';
        if (ticketData.imagenes && ticketData.imagenes.length > 0) {
            imagesHtml = ticketData.imagenes.map(imgUrl => `
                <div class="image-item" style="text-align: center; cursor: pointer; padding: 8px; border: 2px solid transparent; border-radius: 8px; transition: all 0.3s ease;" onclick="pdfManager.selectImage(this, '${imgUrl}')">
                    <img src="${imgUrl}" style="width: 100%; height: 80px; object-fit: cover; border-radius: 5px;">
                    <small style="display: block; margin-top: 0px; color: #666; font-size: 15px;">Seleccionar</small>
                </div>
            `).join('');
        } else {
            imagesHtml = '<p style="text-align: center; color: #666; padding: 20px;">No hay imágenes disponibles para este ticket.</p>';
        }

        // Crear el modal con SweetAlert2
        const { value: formValues } = await Swal.fire({
            title: 'Adjuntar a Reporte PDF',
            html: `
                <div>
                    <p>Seleccione una evidencia existente o suba un nuevo archivo (Imagen o PDF) para adjuntarlo al final del reporte.</p>
                    
                    <div style="margin: 15px 0; padding: 15px; border-radius: 8px;">
                        <label style="font-weight: 600; display: block; margin-bottom: 10px;">Subir un archivo nuevo para adjuntar</label>
                        <input type="file" id="swalFeaturedFileUpload" 
                            accept="image/*,.pdf">
                        <small style="display: block; margin-top: 5px; font-size: 12px;">
                            Formatos aceptados: JPG, PNG, PDF (Tamaño máximo: 10MB)
                        </small>
                    </div>

                    <p style="margin: 20px 0 10px 0; font-weight: 500;">O seleccione una de las evidencias existentes:</p>
                    <div id="swalImageSelectionGrid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 12px; max-height: 300px; overflow-y: auto; padding: 15px; border-radius: 8px;">
                        ${imagesHtml}
                    </div>

                    <div style="margin-top: 15px; padding: 12px; border-radius: 6px; border-left: 4px solid;">
                        <small style="font-size: 12px;">
                            <strong>💡 Nota:</strong> La selección de archivo es opcional. Puede generar el PDF sin adjuntar archivos adicionales.
                        </small>
                    </div>
                </div>
            `,
            width: 800,
            showCancelButton: true,
            confirmButtonText: 'Generar PDF',
            cancelButtonText: 'Cancelar',
            showLoaderOnConfirm: true,
            preConfirm: () => {
                return new Promise((resolve) => {
                    resolve();
                });
            },
            didOpen: () => {
                const fileUpload = document.getElementById('swalFeaturedFileUpload');
                fileUpload.addEventListener('change', (e) => {
                    this.handleFileUpload(e);
                    document.querySelectorAll('#swalImageSelectionGrid .image-item').forEach(item => {
                        item.style.borderColor = 'transparent';
                        item.style.backgroundColor = 'transparent';
                    });
                });
            }
        });

        if (formValues) {
            // Generar el PDF
            await this.createAndSavePdf();
        }
    },

    // Manejar subida de archivos
    handleFileUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (event) => {
                this.featuredItem = { type: 'image', data: event.target.result };
            };
            reader.readAsDataURL(file);
        } else if (file.type === 'application/pdf') {
            const reader = new FileReader();
            reader.onload = (event) => {
                this.featuredItem = { type: 'pdf', data: event.target.result };
            };
            reader.readAsDataURL(file);
        } else {
            Swal.fire('Formato no válido', 'Solo se permiten imágenes y archivos PDF.', 'warning');
            e.target.value = '';
        }
    },

    // Seleccionar imagen existente
    selectImage(element, imageUrl) {
        // Deseleccionar todas las imágenes
        document.querySelectorAll('#swalImageSelectionGrid .image-item').forEach(item => {
            item.style.borderColor = 'transparent';
            item.style.backgroundColor = 'transparent';
        });

        // Seleccionar la imagen clickeada
        element.style.borderColor = '#6C43E0';
        element.style.backgroundColor = 'rgba(108, 67, 224, 0.1)';

        // Limpiar input de archivo
        const fileUpload = document.getElementById('swalFeaturedFileUpload');
        if (fileUpload) fileUpload.value = '';

        // Establecer como elemento destacado
        this.featuredItem = { type: 'image', data: imageUrl };
    },

    // Función principal para crear y guardar PDF
    async createAndSavePdf() {
        if (!this.ticketData) {
            Swal.fire('Error', 'No hay datos del ticket para generar el PDF.', 'error');
            return;
        }

        Swal.fire({ 
            title: 'Generando PDF', 
            html: 'Aplicando marcas de agua y creando documento...', 
            allowOutsideClick: false, 
            didOpen: () => Swal.showLoading() 
        });

        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('p', 'mm', 'a4');
            
            // Determinar tipo de reporte basado en la imagen proporcionada
            const reportTitle = 'REPORTE FOTOGRÁFICO';
            
            // Generar el PDF con el nuevo formato
            await this.generatePdfContentNewFormat(doc, this.ticketData, reportTitle);
            
            // Guardar PDF
            const fileName = `${reportTitle.replace(/\s+/g, '_')}_${this.ticketData.idTicket || this.ticketData.id || 'ticket'}.pdf`;
            doc.save(fileName);
            
            Swal.close();
            Swal.fire({ 
                title: '¡PDF Generado!', 
                text: `El archivo "${fileName}" se ha descargado exitosamente.`, 
                icon: 'success', 
                confirmButtonColor: '#6C43E0',
                timer: 3000
            });
            
        } catch (error) {
            console.error('Error generando PDF:', error);
            Swal.fire('Error', 'Ocurrió un error al generar el PDF.', 'error');
        }
    },

    // NUEVA FUNCIÓN: Generar contenido del PDF en el formato de la imagen
    async generatePdfContentNewFormat(doc, ticketData, reportTitle) {
        const MARGIN = 15;
        const PAGE_WIDTH = doc.internal.pageSize.getWidth();
        const CONTENT_WIDTH = PAGE_WIDTH - (MARGIN * 2);
        let y = MARGIN;

        // Constantes de estilo basadas en la imagen
        const COLOR_AZUL_MARINO = '#002D62'; // Azul marino para títulos
        const COLOR_DORADO = '#D4AF37'; // Color dorado/amarillo para líneas

        // ===== ENCABEZADO =====
        await this.addHeaderNewFormat(doc, reportTitle, MARGIN, y);
        y += 25;

        // ===== TABLA DE INFORMACIÓN UNIFICADA =====
        y = this.addInfoTableUnified(doc, ticketData, MARGIN, y, PAGE_WIDTH);

        // ===== APARTADO DE SISTEMAS CON CHECKBOXES =====
        y = this.addSistemasSectionWithCheckboxes(doc, ticketData, MARGIN, y, CONTENT_WIDTH);

        // ===== DESCRIPCIÓN DE ACTIVIDADES =====
        y = this.addActivityDescriptionSimple(doc, ticketData, MARGIN, y, CONTENT_WIDTH);

        // ===== EVIDENCIAS FOTOGRÁFICAS =====
        y = await this.addEvidenceImagesGrid(doc, ticketData, MARGIN, y, CONTENT_WIDTH);

        // ===== ELEMENTO DESTACADO (si existe) =====
        if (this.featuredItem) {
            y = await this.addFeaturedItemNewFormat(doc, MARGIN, y, CONTENT_WIDTH);
        }

        // ===== FIRMAS =====
        this.addSignaturesCentered(doc, ticketData, MARGIN, y, PAGE_WIDTH);
    },

    // NUEVO ENCABEZADO con logo y Agency FB - CORREGIDO
    async addHeaderNewFormat(doc, reportTitle, MARGIN, y) {
        // Logo en superior izquierda - MANEJO MEJORADO DE ERRORES
        try {
            // Intentar múltiples rutas posibles para el logo
            const possibleLogoPaths = [
                '../css/img/Logo-RSI-OFICIAL.png',
                '../../css/img/Logo-RSI-OFICIAL.png',
                './css/img/Logo-RSI-OFICIAL.png',
                'css/img/Logo-RSI-OFICIAL.png',
                '../img/Logo-RSI-OFICIAL.png',
                '../../img/Logo-RSI-OFICIAL.png',
                './img/Logo-RSI-OFICIAL.png'
            ];
            
            let logoLoaded = false;
            
            for (const logoPath of possibleLogoPaths) {
                try {
                    // Crear una promesa con timeout para evitar bloqueos
                    const logoPromise = new Promise((resolve, reject) => {
                        const img = new Image();
                        img.onload = () => resolve(img);
                        img.onerror = () => reject(new Error(`No se pudo cargar: ${logoPath}`));
                        img.src = logoPath;
                    });
                    
                    // Timeout de 2 segundos para cada intento
                    const timeoutPromise = new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Timeout')), 2000)
                    );
                    
                    const img = await Promise.race([logoPromise, timeoutPromise]);
                    doc.addImage(img.src, 'PNG', MARGIN, y, 25, 25);
                    logoLoaded = true;
                    console.log(`Logo cargado desde: ${logoPath}`);
                    break;
                } catch (error) {
                    console.log(`No se pudo cargar logo desde: ${logoPath}`);
                    continue;
                }
            }
            
            if (!logoLoaded) {
                console.warn('No se pudo cargar el logo desde ninguna ruta, continuando sin logo');
                // No hacemos nada, simplemente continuamos sin logo
            }
            
        } catch (error) {
            console.warn("Error al cargar el logo, continuando sin él:", error);
            // Continuamos sin logo
        }

        // Título principal - Agency FB en azul marino
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.setTextColor(COLOR_AZUL_MARINO);
        doc.text(reportTitle, doc.internal.pageSize.getWidth() / 2, y + 10, { align: 'center' });
        
        // Información de la empresa
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor('#000000'); // Negro para contenido
        doc.text('ÁREA: INGENIERÍA DE PROYECTOS Y MANTENIMIENTO', doc.internal.pageSize.getWidth() / 2, y + 16, { align: 'center' });
        doc.setFontSize(8);
        doc.text('Dirección: C. 31 110, El Sol, 57200 Nezahualcóyotl, Méx. RFC:RSI1810319G0', doc.internal.pageSize.getWidth() / 2, y + 20, { align: 'center' });
    },

    // NUEVA TABLA UNIFICADA CORREGIDA CON DATOS DINÁMICOS Y COLOR DORADO
    addInfoTableUnified(doc, ticketData, MARGIN, y, PAGE_WIDTH) {
        const CONTENT_WIDTH = PAGE_WIDTH - (MARGIN * 2);
        const ROW_HEIGHT = 8;
        const TABLE_HEIGHT = ROW_HEIGHT * 5;
        
        // Marco de la tabla en color dorado
        doc.setDrawColor(212, 175, 55); // RGB para color dorado #D4AF37
        doc.setLineWidth(0.5);
        doc.rect(MARGIN, y, CONTENT_WIDTH, TABLE_HEIGHT);
        
        // Líneas horizontales en dorado
        for (let i = 1; i < 5; i++) {
            doc.setDrawColor(212, 175, 55);
            doc.line(MARGIN, y + (i * ROW_HEIGHT), MARGIN + CONTENT_WIDTH, y + (i * ROW_HEIGHT));
        }
        
        // Línea vertical central en dorado
        const midX = MARGIN + (CONTENT_WIDTH / 2);
        doc.setDrawColor(212, 175, 55);
        doc.line(midX, y, midX, y + TABLE_HEIGHT);
        
        // Contenido de la tabla con datos dinámicos
        doc.setFontSize(9);
        
        // Función para obtener valor dinámico o mostrar "Ticket Interno"
        const getDynamicValue = (value, defaultValue = 'N/A') => {
            if (value === 'interno' || value === 'Interno' || ticketData.tipo === 'interno') {
                return 'Ticket Interno';
            }
            return value || defaultValue;
        };

        // Función especial para orden de servicio (dejar vacío si no hay datos)
        const getOrdenServicio = (value) => {
            if (value === 'interno' || value === 'Interno' || ticketData.tipo === 'interno') {
                return 'Ticket Interno';
            }
            return value || ''; // Vacío en lugar de N/A
        };

        // Fila 1: CLIENTE | FECHA
        this.addTableFieldUnified(doc, 'CLIENTE:', 
            getDynamicValue(ticketData.cuentaNombre, 'TIENDAS CHEDRAUI'), 
            MARGIN, y + 5, CONTENT_WIDTH/2 - 2);
        
        this.addTableFieldUnified(doc, 'FECHA:', 
            ticketData.fechaCreacion ? 
                (ticketData.fechaCreacion.toDate ? 
                    ticketData.fechaCreacion.toDate().toLocaleDateString('es-MX') : 
                    new Date(ticketData.fechaCreacion).toLocaleDateString('es-MX')
                ) : '2025-10-30', 
            midX + 2, y + 5, CONTENT_WIDTH/2 - 2);
        
        // Fila 2: DIRECCIÓN FISCAL | ORDEN DE SERVICIO
        this.addTableFieldUnified(doc, 'DIRECCIÓN FISCAL:', 
            getDynamicValue(ticketData.direccionFiscal, 'CONSTITUYENTES, 1150, LOMAS ALTAS, 11950, MEX'), 
            MARGIN, y + 13, CONTENT_WIDTH/2 - 2);
        
        this.addTableFieldUnified(doc, 'ORDEN DE SERVICIO:', 
            getOrdenServicio(ticketData.ordenServicio), // Vacío si no hay datos
            midX + 2, y + 13, CONTENT_WIDTH/2 - 2);
        
        // Fila 3: RFC | PROYECTO
        this.addTableFieldUnified(doc, 'RFC:', 
            getDynamicValue(ticketData.rfc, 'TCH850701RM1'), 
            MARGIN, y + 21, CONTENT_WIDTH/2 - 2);
        
        this.addTableFieldUnified(doc, 'PROYECTO:', 
            getDynamicValue(ticketData.proyecto, 'N/A'), 
            midX + 2, y + 21, CONTENT_WIDTH/2 - 2);
        
        // Fila 4: ATENCIÓN A | SERVICIO
        this.addTableFieldUnified(doc, 'ATENCIÓN A:', 
            getDynamicValue(ticketData.atencionA, 'N/A'), 
            MARGIN, y + 29, CONTENT_WIDTH/2 - 2);
        
        this.addTableFieldUnified(doc, 'SERVICIO:', 
            getDynamicValue(ticketData.servicio, 'Revision y mantenimiento'), 
            midX + 2, y + 29, CONTENT_WIDTH/2 - 2);
        
        // Fila 5: CORREO | TÉCNICO
        this.addTableFieldUnified(doc, 'CORREO:', 
            getDynamicValue(ticketData.correo, 'N/A'), 
            MARGIN, y + 37, CONTENT_WIDTH/2 - 2);
        
        this.addTableFieldUnified(doc, 'TÉCNICO:', 
            getDynamicValue(ticketData.nombresColaboradores, 'Samuel Alejandro Aragón Vilchez'), 
            midX + 2, y + 37, CONTENT_WIDTH/2 - 2);

        return y + TABLE_HEIGHT + 5;
    },

    // APARTADO DE SISTEMAS CON CHECKBOXES EN UNA SOLA FILA CON COLOR DORADO
    addSistemasSectionWithCheckboxes(doc, ticketData, MARGIN, y, CONTENT_WIDTH) {
        // Título de la sección en azul marino
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(COLOR_AZUL_MARINO);
        doc.text('SISTEMAS:', MARGIN, y);
        
        y += 8;

        // Definir todas las tecnologías disponibles
        const todasTecnologias = ['CCTV', 'DH', 'CA', 'AI', 'SM'];
        
        // Determinar qué tecnologías están marcadas
        let tecnologiasMarcadas = [];
        if (ticketData.sistemas) {
            if (typeof ticketData.sistemas === 'string') {
                tecnologiasMarcadas = ticketData.sistemas.split(',').map(s => s.trim().toUpperCase());
            } else if (Array.isArray(ticketData.sistemas)) {
                tecnologiasMarcadas = ticketData.sistemas.map(s => String(s).trim().toUpperCase());
            }
        } else {
            // Por defecto, marcar CCTV como en la imagen
            tecnologiasMarcadas = ['CCTV'];
        }

        // Contenido de sistemas con checkboxes - TODOS EN UNA SOLA FILA
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.setTextColor('#000000');
        
        let currentX = MARGIN;
        const checkboxSize = 3;
        const lineHeight = 5;
        const techSpacing = 25; // Espacio entre tecnologías
        
        // Mostrar todas las tecnologías en una sola fila
        todasTecnologias.forEach((tecnologia, index) => {
            // Dibujar checkbox (□) en color dorado
            doc.setDrawColor(212, 175, 55); // Color dorado
            doc.setLineWidth(0.5);
            doc.rect(currentX, y - checkboxSize, checkboxSize, checkboxSize);
            
            // Marcar con X si la tecnología está en las marcadas
            const isMarcada = tecnologiasMarcadas.some(tech => 
                tech.includes(tecnologia) || tecnologia.includes(tech)
            );
            
            if (isMarcada) {
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(212, 175, 55); // X en color dorado
                doc.text('X', currentX + 0.7, y - 0.5);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor('#000000'); // Volver a negro para el texto
            }
            
            // Texto de la tecnología
            doc.text(tecnologia, currentX + 6, y);
            
            currentX += techSpacing;
        });
        
        return y + lineHeight + 5;
    },

    // DESCRIPCIÓN DE ACTIVIDADES SIN TABLA
    addActivityDescriptionSimple(doc, ticketData, MARGIN, y, CONTENT_WIDTH) {
        // Verificar si necesitamos nueva página
        if (y > doc.internal.pageSize.getHeight() - 50) {
            this.addFooter(doc);
            doc.addPage();
            this.currentPage++;
            y = MARGIN;
        }

        // Título de la sección en azul marino
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(COLOR_AZUL_MARINO);
        doc.text('DESCRIPCIÓN DE ACTIVIDADES', MARGIN, y);
        
        y += 8;

        // Descripción del servicio sin marco
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.setTextColor('#000000');
        
        const descripcionText = ticketData.descripcionActividades || 
                               ticketData.descripcion || 
                               'Se realizara revisión de cctv y visión de cámaras, peinado de site y mantenimiento a grabador, como tambien el mantenimiento preventivo a sistema de detección de incendio. Al llegar al lugar se realizó la revisión del DVR y cámaras ya que la imagen ya se había perdido, el motivo de la perdida de video fue por una mala configuración de IP en las cámaras y el DVR, se realizó la configuración de la IP adecuada en el DVR y las cámaras se dejó funcionando el equipo adecuadamente.';
        
        const splitDescripcion = doc.splitTextToSize(descripcionText, CONTENT_WIDTH);
        doc.text(splitDescripcion, MARGIN, y);
        
        return y + (splitDescripcion.length * 4) + 10;
    },

    // EVIDENCIAS FOTOGRÁFICAS EN GRID (máximo 3 por fila)
    async addEvidenceImagesGrid(doc, ticketData, MARGIN, y, CONTENT_WIDTH) {
        if (!ticketData.imagenes || ticketData.imagenes.length === 0) {
            return y;
        }

        // Verificar si necesitamos nueva página
        if (y > doc.internal.pageSize.getHeight() - 80) {
            this.addFooter(doc);
            doc.addPage();
            this.currentPage++;
            y = MARGIN;
        }

        // Título de la sección en azul marino
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(COLOR_AZUL_MARINO);
        doc.text('EVIDENCIAS FOTOGRÁFICAS', MARGIN, y);
        y += 10;

        const currentTime = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
        const address = 'C. 31 110, El Sol, 57200 Nezahualcóyotl, Méx.';

        // Configuración del grid
        const imagesPerRow = 3;
        const imageWidth = (CONTENT_WIDTH - 10) / imagesPerRow; // 10mm de espacio entre imágenes
        const imageHeight = 45; // Altura fija para todas las imágenes
        let currentX = MARGIN;
        let currentY = y;

        // Procesar todas las imágenes
        const imagePromises = ticketData.imagenes.map(async (imageUrl, index) => {
            try {
                const imageDataUrl = await this.loadImageAsDataURL(imageUrl);
                if (imageDataUrl) {
                    const imageWithWatermark = await this.addWatermarkNewFormat(imageDataUrl, address, currentTime);
                    const img = await this.loadImage(imageWithWatermark);
                    
                    // Calcular dimensiones manteniendo proporción
                    const aspectRatio = img.width / img.height;
                    let finalWidth = imageWidth;
                    let finalHeight = imageHeight;
                    
                    if (aspectRatio > 1) {
                        // Imagen horizontal
                        finalHeight = imageWidth / aspectRatio;
                    } else {
                        // Imagen vertical
                        finalWidth = imageHeight * aspectRatio;
                    }
                    
                    // Centrar la imagen en su celda
                    const xOffset = currentX + (imageWidth - finalWidth) / 2;
                    const yOffset = currentY;
                    
                    doc.addImage(imageWithWatermark, 'JPEG', xOffset, yOffset, finalWidth, finalHeight);
                    
                    // Actualizar posición para la siguiente imagen
                    currentX += imageWidth + 5;
                    
                    // Si hemos llegado al máximo de imágenes por fila, pasar a la siguiente
                    if ((index + 1) % imagesPerRow === 0) {
                        currentX = MARGIN;
                        currentY += imageHeight + 15;
                    }
                }
            } catch (error) {
                console.error(`Error al procesar imagen ${index}:`, error);
            }
        });

        // Esperar a que todas las imágenes se procesen
        await Promise.all(imagePromises);

        // Si hay imágenes procesadas, actualizar la posición Y
        if (ticketData.imagenes.length > 0) {
            // Calcular cuántas filas completas hay
            const fullRows = Math.floor(ticketData.imagenes.length / imagesPerRow);
            const remainingImages = ticketData.imagenes.length % imagesPerRow;
            
            if (remainingImages > 0) {
                currentY += imageHeight + 15;
            } else if (fullRows > 0) {
                currentY += 5; // Espacio adicional después de la última fila completa
            }
        }

        // Agregar descripción general de evidencias al final
        if (ticketData.descripcionEvidencias) {
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor('#000000');
            const splitDesc = doc.splitTextToSize(ticketData.descripcionEvidencias, CONTENT_WIDTH);
            doc.text(splitDesc, MARGIN, currentY);
            currentY += (splitDesc.length * 3) + 10;
        }

        return currentY;
    },

    // Función auxiliar para campo de tabla unificada
    addTableFieldUnified(doc, label, value, x, y, maxWidth) {
        // Label en azul marino y negrita
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(COLOR_AZUL_MARINO);
        
        // Ajustar posición para evitar superposición
        const labelWidth = doc.getTextWidth(label);
        doc.text(label, x, y);
        
        // Value en negro y normal
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor('#000000');
        
        const valueX = x + labelWidth + 2; // Espacio dinámico después del label
        const availableWidth = maxWidth - labelWidth - 2;
        
        if (value && value.length > 25) {
            const lines = doc.splitTextToSize(value, availableWidth);
            if (Array.isArray(lines)) {
                lines.forEach((line, index) => {
                    doc.text(line, valueX, y + (index * 3));
                });
            } else {
                doc.text(lines, valueX, y);
            }
        } else {
            doc.text(value || '', valueX, y);
        }
    },

   // NUEVO ELEMENTO DESTACADO - CORREGIDO PARA MANEJAR PDFs EN NUEVA PÁGINA
async addFeaturedItemNewFormat(doc, MARGIN, y, CONTENT_WIDTH) {
    const PAGE_HEIGHT = doc.internal.pageSize.getHeight();
    
    // SIEMPRE CREAR NUEVA PÁGINA PARA EL DOCUMENTO ADICIONAL
    this.addFooter(doc);
    doc.addPage();
    this.currentPage++;
    y = MARGIN;

    // Título en azul marino
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(COLOR_AZUL_MARINO);
    doc.text('DOCUMENTO ADICIONAL', MARGIN, y);
    y += 15;

    if (this.featuredItem) {
        try {
            if (this.featuredItem.type === 'image') {
                // Procesar imagen
                const imageDataUrl = this.featuredItem.data;
                const currentTime = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
                const address = 'C. 31 110, El Sol, 57200 Nezahualcóyotl, Méx.';
                
                const imageWithWatermark = await this.addWatermarkNewFormat(imageDataUrl, address, currentTime);
                const img = await this.loadImage(imageWithWatermark);
                
                // Imagen más pequeña para documento adicional
                const maxImageHeight = 120; // Más grande ya que está en página separada
                const imgWidth = CONTENT_WIDTH;
                const imgHeight = Math.min((img.height * imgWidth) / img.width, maxImageHeight);

                // Verificar si la imagen cabe en la página actual
                if (y + imgHeight > PAGE_HEIGHT - 30) {
                    this.addFooter(doc);
                    doc.addPage();
                    this.currentPage++;
                    y = MARGIN;
                }

                doc.addImage(imageWithWatermark, 'JPEG', MARGIN, y, imgWidth, imgHeight);
                y += imgHeight + 15;
                
            } else if (this.featuredItem.type === 'pdf') {
                // Procesar PDF - SOLUCIÓN MEJORADA
                y = await this.insertPdfAsImages(doc, this.featuredItem.data, MARGIN, y, CONTENT_WIDTH);
            }
        } catch (error) {
            console.error("Error al procesar elemento destacado:", error);
            
            // Mensaje de error elegante
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(10);
            doc.setTextColor('#666');
            doc.text('No se pudo cargar el documento adicional', MARGIN, y);
            y += 15;
        }
    } else {
        // Mensaje si no hay documento adicional (por seguridad)
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(10);
        doc.setTextColor('#666');
        doc.text('No se seleccionó ningún documento adicional', MARGIN, y);
        y += 15;
    }

    return y;
},

// NUEVA FUNCIÓN: Convertir PDF a imágenes y insertarlas
async insertPdfAsImages(doc, pdfDataUrl, MARGIN, y, CONTENT_WIDTH) {
    try {
        // Configurar PDF.js
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/pdf.worker.min.js';
        
        // Cargar el PDF
        const loadingTask = pdfjsLib.getDocument(pdfDataUrl);
        const pdf = await loadingTask.promise;
        const totalPages = pdf.numPages;
        
        // Título principal del PDF
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(COLOR_AZUL_MARINO);
        doc.text(`Documento PDF Adjunto - ${this.featuredItem.fileName || 'Archivo'}`, MARGIN, y);
        y += 10;
        
        // Línea separadora
        doc.setDrawColor(212, 175, 55); // Línea dorada
        doc.setLineWidth(0.5);
        doc.line(MARGIN, y, MARGIN + CONTENT_WIDTH, y);
        y += 10;

        // Procesar cada página del PDF
        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
            // Verificar si necesitamos nueva página
            if (y > doc.internal.pageSize.getHeight() - 100) {
                this.addFooter(doc);
                doc.addPage();
                this.currentPage++;
                y = MARGIN;
                
                // Agregar encabezado de continuación
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(10);
                doc.setTextColor(COLOR_AZUL_MARINO);
                doc.text(`Documento PDF Adjunto (continuación) - Página ${pageNum} de ${totalPages}`, MARGIN, y);
                y += 8;
            }
            
            // Obtener la página
            const page = await pdf.getPage(pageNum);
            const viewport = page.getViewport({ scale: 1.8 }); // Mejor calidad
            
            // Crear canvas para renderizar la página
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            
            // Renderizar la página en el canvas
            await page.render({
                canvasContext: context,
                viewport: viewport
            }).promise;
            
            // Convertir canvas a imagen
            const pageImage = canvas.toDataURL('image/jpeg', 0.85); // Mejor calidad
            
            // Calcular dimensiones para ajustar al ancho del contenido
            const imgWidth = CONTENT_WIDTH;
            const imgHeight = (canvas.height * CONTENT_WIDTH) / canvas.width;
            
            // Verificar si la imagen cabe en la página actual
            if (y + imgHeight > doc.internal.pageSize.getHeight() - 30) {
                this.addFooter(doc);
                doc.addPage();
                this.currentPage++;
                y = MARGIN;
                
                // Agregar encabezado de continuación
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(10);
                doc.setTextColor(COLOR_AZUL_MARINO);
                doc.text(`Documento PDF Adjunto (continuación) - Página ${pageNum} de ${totalPages}`, MARGIN, y);
                y += 8;
            }
            
            // Agregar número de página pequeño
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor('#666');
            doc.text(`Página ${pageNum} de ${totalPages}`, MARGIN, y);
            y += 4;
            
            // Agregar la imagen de la página al PDF
            doc.addImage(pageImage, 'JPEG', MARGIN, y, imgWidth, imgHeight);
            y += imgHeight + 15;
            
            // Agregar separador entre páginas (excepto para la última)
            if (pageNum < totalPages) {
                doc.setDrawColor(212, 175, 55); // Línea dorada
                doc.setLineWidth(0.3);
                doc.line(MARGIN, y, MARGIN + CONTENT_WIDTH, y);
                y += 10;
            }
        }
        
        return y;
        
    } catch (error) {
        console.error("Error al convertir PDF a imágenes:", error);
        
        // Mensaje de fallback elegante
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(10);
        doc.setTextColor('#666');
        doc.text('El documento PDF adjunto no pudo ser procesado', MARGIN, y);
        y += 8;
        doc.text('pero fue incluido en la selección.', MARGIN, y);
        y += 15;
        
        return y;
    }
},


// NUEVA FUNCIÓN: Convertir PDF a imágenes y insertarlas
async insertPdfAsImages(doc, pdfDataUrl, MARGIN, y, CONTENT_WIDTH) {
    try {
        // Configurar PDF.js
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/pdf.worker.min.js';
        
        // Cargar el PDF
        const loadingTask = pdfjsLib.getDocument(pdfDataUrl);
        const pdf = await loadingTask.promise;
        const totalPages = pdf.numPages;
        
        // Procesar cada página del PDF
        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
            // Verificar si necesitamos nueva página
            if (y > doc.internal.pageSize.getHeight() - 100) {
                this.addFooter(doc);
                doc.addPage();
                this.currentPage++;
                y = MARGIN;
            }
            
            // Obtener la página
            const page = await pdf.getPage(pageNum);
            const viewport = page.getViewport({ scale: 1.5 });
            
            // Crear canvas para renderizar la página
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            
            // Renderizar la página en el canvas
            await page.render({
                canvasContext: context,
                viewport: viewport
            }).promise;
            
            // Convertir canvas a imagen
            const pageImage = canvas.toDataURL('image/jpeg', 0.8);
            
            // Calcular dimensiones para ajustar al ancho del contenido
            const imgWidth = CONTENT_WIDTH;
            const imgHeight = (canvas.height * CONTENT_WIDTH) / canvas.width;
            
            // Agregar título de la página si es la primera
            if (pageNum === 1) {
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(10);
                doc.setTextColor(COLOR_AZUL_MARINO);
                doc.text(`Documento PDF Adjunto - ${this.featuredItem.fileName || 'Archivo'}`, MARGIN, y);
                y += 6;
            }
            
            // Agregar número de página pequeño
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor('#666');
            doc.text(`Página ${pageNum}`, MARGIN, y);
            y += 4;
            
            // Agregar la imagen de la página al PDF
            doc.addImage(pageImage, 'JPEG', MARGIN, y, imgWidth, imgHeight);
            y += imgHeight + 10;
            
            // Agregar separador entre páginas (excepto para la última)
            if (pageNum < totalPages) {
                doc.setDrawColor(212, 175, 55); // Línea dorada
                doc.setLineWidth(0.3);
                doc.line(MARGIN, y, MARGIN + CONTENT_WIDTH, y);
                y += 5;
            }
        }
        
        return y;
        
    } catch (error) {
        console.error("Error al convertir PDF a imágenes:", error);
        
        // Mensaje de fallback elegante
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(10);
        doc.setTextColor('#666');
        doc.text('El documento PDF adjunto no pudo ser procesado', MARGIN, y);
        y += 8;
        doc.text('pero fue incluido en la selección.', MARGIN, y);
        y += 15;
        
        return y;
    }
},

// ACTUALIZAR LA FUNCIÓN createAndSavePdf PARA MEJORAR EL MANEJO DE ERRORES
async createAndSavePdf() {
    if (!this.ticketData) {
        Swal.fire('Error', 'No hay datos del ticket para generar el PDF.', 'error');
        return;
    }

    Swal.fire({ 
        title: 'Generando PDF', 
        html: 'Procesando contenido y aplicando formato...', 
        allowOutsideClick: false, 
        didOpen: () => Swal.showLoading() 
    });

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        
        const reportTitle = 'REPORTE FOTOGRÁFICO';
        
        // Generar el PDF con el nuevo formato
        await this.generatePdfContentNewFormat(doc, this.ticketData, reportTitle);
        
        // Guardar PDF
        const fileName = `${reportTitle.replace(/\s+/g, '_')}_${this.ticketData.idTicket || this.ticketData.id || 'ticket'}.pdf`;
        doc.save(fileName);
        
        Swal.close();
        Swal.fire({ 
            title: '¡PDF Generado!', 
            text: `El archivo "${fileName}" se ha descargado exitosamente.`, 
            icon: 'success', 
            confirmButtonColor: '#6C43E0',
            timer: 3000
        });
        
    } catch (error) {
        console.error('Error generando PDF:', error);
        Swal.fire('Error', 'Ocurrió un error al generar el PDF. Verifica la consola para más detalles.', 'error');
    }
},

// NUEVA FUNCIÓN: Insertar páginas de PDF en el documento actual
async insertPdfPages(doc, pdfDataUrl, MARGIN, y, CONTENT_WIDTH) {
    try {
        // Convertir DataURL a ArrayBuffer
        const response = await fetch(pdfDataUrl);
        const pdfBlob = await response.blob();
        const arrayBuffer = await pdfBlob.arrayBuffer();
        
        // Crear un nuevo documento PDF temporal
        const { jsPDF } = window.jspdf;
        const tempDoc = new jsPDF();
        
        // Cargar el PDF usando pdf-lib (si está disponible) o alternativa
        if (window.PDFLib) {
            const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
            const pageCount = pdfDoc.getPageCount();
            
            // Agregar cada página del PDF al documento principal
            for (let i = 0; i < pageCount; i++) {
                // Verificar si necesitamos nueva página
                if (y > doc.internal.pageSize.getHeight() - 50) {
                    this.addFooter(doc);
                    doc.addPage();
                    this.currentPage++;
                    y = MARGIN;
                }
                
                // Agregar título para página del PDF adjunto
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(10);
                doc.setTextColor(COLOR_AZUL_MARINO);
                doc.text(`Documento PDF Adjunto - Página ${i + 1}`, MARGIN, y);
                y += 8;
                
                // Aquí deberíamos extraer la página del PDF y agregarla
                // Esta es una implementación simplificada
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(9);
                doc.setTextColor('#000000');
                doc.text(`[Contenido de la página ${i + 1} del PDF adjunto]`, MARGIN, y);
                y += 15;
            }
        } else {
            // Alternativa si pdf-lib no está disponible
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.setTextColor('#000000');
            doc.text('PDF adjunto (no se pudo extraer el contenido)', MARGIN, y);
            y += 15;
        }
        
        return y;
        
    } catch (error) {
        console.error("Error al insertar PDF:", error);
        
        // Mensaje de fallback
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor('#000000');
        doc.text('Error al cargar el PDF adjunto', MARGIN, y);
        y += 15;
        
        return y;
    }
},

// ACTUALIZAR LA FUNCIÓN handleFileUpload PARA MEJORAR EL MANEJO DE PDFs
handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
            this.featuredItem = { 
                type: 'image', 
                data: event.target.result,
                fileName: file.name
            };
        };
        reader.readAsDataURL(file);
    } else if (file.type === 'application/pdf') {
        const reader = new FileReader();
        reader.onload = (event) => {
            this.featuredItem = { 
                type: 'pdf', 
                data: event.target.result,
                fileName: file.name
            };
        };
        reader.readAsDataURL(file);
    } else {
        Swal.fire('Formato no válido', 'Solo se permiten imágenes y archivos PDF.', 'warning');
        e.target.value = '';
    }
},

    // FIRMAS CENTRADAS CON COLOR DORADO
    addSignaturesCentered(doc, ticketData, MARGIN, y, PAGE_WIDTH) {
        const PAGE_HEIGHT = doc.internal.pageSize.getHeight();
        
        // Verificar si necesitamos nueva página para las firmas
        if (y > PAGE_HEIGHT - 40) {
            this.addFooter(doc);
            doc.addPage();
            this.currentPage++;
            y = MARGIN;
        }

        y += 15;

        // Línea para firma del técnico centrada en color dorado
        const lineWidth = 80;
        const lineX = (PAGE_WIDTH - lineWidth) / 2;
        
        doc.setDrawColor(212, 175, 55); // Color dorado
        doc.setLineWidth(0.5);
        doc.line(lineX, y, lineX + lineWidth, y);
        
        y += 6;

        // Texto de la firma centrado
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor('#000000');
        doc.text('NOMBRE Y FIRMA DEL TÉCNICO', PAGE_WIDTH / 2, y, { align: 'center' });
        
        y += 10;

        // Nombre del técnico centrado
        doc.setFont('helvetica', 'bold');
        doc.setTextColor('#000000');
        doc.text(ticketData.nombresColaboradores || 'Samuel Alejandro Aragón Vilchez', PAGE_WIDTH / 2, y, { align: 'center' });

        // Agregar pie de página final
        this.addFooter(doc);
    },

    // NUEVA FUNCIÓN: Pie de página en todas las hojas CON COLOR DORADO
    addFooter(doc) {
        const PAGE_HEIGHT = doc.internal.pageSize.getHeight();
        const PAGE_WIDTH = doc.internal.pageSize.getWidth();
        const fechaCreacion = new Date().toLocaleDateString('es-MX');
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor('#000000');
        
        // Línea divisoria en color dorado
        doc.setDrawColor(212, 175, 55); // Color dorado
        doc.setLineWidth(0.2);
        doc.line(15, PAGE_HEIGHT - 15, PAGE_WIDTH - 15, PAGE_HEIGHT - 15);
        
        // Texto del pie de página
        const footerText = `RAFHA SOLUCION INTEGRALES SAS DE CV - Generado el: ${fechaCreacion} - Página ${this.currentPage}`;
        doc.text(footerText, PAGE_WIDTH / 2, PAGE_HEIGHT - 10, { align: 'center' });
    },

    // NUEVA MARCA DE AGUA
    async addWatermarkNewFormat(imageDataUrl, address, time) {
        try {
            const originalImage = await this.loadImage(imageDataUrl);
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = originalImage.width;
            canvas.height = originalImage.height;
            ctx.drawImage(originalImage, 0, 0);

            const watermarkHeight = canvas.height * 0.08;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
            ctx.fillRect(0, canvas.height - watermarkHeight, canvas.width, watermarkHeight);

            ctx.fillStyle = 'white';
            ctx.font = `${watermarkHeight * 0.3}px Arial`;
            ctx.textAlign = 'left';
            
            const textY = canvas.height - (watermarkHeight / 3);
            ctx.fillText(`${address} - ${time}`, 10, textY);

            return canvas.toDataURL('image/jpeg', 0.9);
        } catch (error) {
            console.error("Error al aplicar marca de agua:", error);
            return imageDataUrl;
        }
    },

    // FUNCIÓN MEJORADA: Cargar imagen como DataURL
    async loadImageAsDataURL(url) {
        return new Promise((resolve, reject) => {
            if (url.startsWith('data:')) {
                resolve(url);
                return;
            }

            const img = new Image();
            img.crossOrigin = 'Anonymous';
            
            img.onload = function() {
                try {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx.drawImage(img, 0, 0);
                    const dataURL = canvas.toDataURL('image/jpeg', 0.9);
                    resolve(dataURL);
                } catch (error) {
                    reject(error);
                }
            };
            
            img.onerror = function() {
                reject(new Error(`No se pudo cargar la imagen: ${url}`));
            };
            
            img.src = url;
        });
    },

    // Función para cargar imágenes
    loadImage(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = () => resolve(img);
            img.onerror = (err) => reject(new Error(`Falló la carga de la imagen: ${url}`));
            img.src = url;
        });
    }
};

// Definir COLOR_AZUL_MARINO como variable global
const COLOR_AZUL_MARINO = '#002D62';