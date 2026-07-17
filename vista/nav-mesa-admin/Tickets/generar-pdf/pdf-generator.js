// PDF Manager - Maneja toda la lógica de generación de PDFs
const pdfManager = {
    colaboradores: [],
    db: null,
    ticketData: null,
    featuredItem: null,
    currentPage: 1,
    totalPages: 1,
    
    // Constantes para márgenes y espacios protegidos
    PAGE_MARGINS: {
        top: 25,    // Espacio reservado para encabezado
        bottom: 20, // Espacio reservado para pie de página
        left: 15,
        right: 15
    },
    HEADER_HEIGHT: 25,
    FOOTER_HEIGHT: 15,
    COLOR_AZUL_MARINO: '#002D62',
    COLOR_DORADO: '#D4AF37',
    
    // Tamaño estándar para imágenes en el PDF (45mm x 45mm como en la imagen original)
    IMAGE_WIDTH: 45, // mm (tamaño original)
    IMAGE_HEIGHT: 45, // mm (tamaño original)

    // Inicializar el manager
    initialize(colaboradores, db) {
        this.colaboradores = colaboradores;
        this.db = db;
    },

    // NUEVA FUNCIÓN: Verificar espacio disponible considerando encabezado y pie
    getAvailableHeight(doc, currentY) {
        const pageHeight = doc.internal.pageSize.getHeight();
        return pageHeight - currentY - this.PAGE_MARGINS.bottom;
    },

    // NUEVA FUNCIÓN: Verificar si necesitamos nueva página
    needsNewPage(doc, currentY, requiredHeight) {
        return this.getAvailableHeight(doc, currentY) < requiredHeight;
    },

    // NUEVA FUNCIÓN CORREGIDA: Agregar nueva página con encabezado
    addNewPageWithHeader(doc, reportTitle) {
        // Agregar pie de página a la página actual
        if (this.currentPage > 1) {
            this.addFooter(doc);
        }
        
        // Agregar nueva página
        doc.addPage();
        this.currentPage++;
        
        // Agregar encabezado a la nueva página
        const y = this.PAGE_MARGINS.top;
        this.addHeaderNewFormat(doc, reportTitle, this.PAGE_MARGINS.left, y);
        
        return y + this.HEADER_HEIGHT + 5;
    },

    // NUEVA FUNCIÓN: Crear y guardar PDF con descripciones
    async createAndSavePdfWithDescriptions(imageDescriptions = []) {
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
            
            // Generar el PDF con el nuevo formato y descripciones
            await this.generatePdfContentNewFormat(doc, this.ticketData, reportTitle, imageDescriptions);
            
            // Agregar pie de página final
            this.addFooter(doc);
            
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
            
            // Agregar pie de página final
            this.addFooter(doc);
            
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
    async generatePdfContentNewFormat(doc, ticketData, reportTitle, imageDescriptions = []) {
        const MARGIN = this.PAGE_MARGINS.left;
        const PAGE_WIDTH = doc.internal.pageSize.getWidth();
        const CONTENT_WIDTH = PAGE_WIDTH - (MARGIN * 2);
        let y = this.PAGE_MARGINS.top;

        // ===== ENCABEZADO =====
        await this.addHeaderNewFormat(doc, reportTitle, MARGIN, y);
        y += this.HEADER_HEIGHT;

        // ===== TABLA DE INFORMACIÓN UNIFICADA =====
        y = this.addInfoTableUnified(doc, ticketData, MARGIN, y, PAGE_WIDTH);

        // ===== APARTADO DE SISTEMAS CON CHECKBOXES =====
        y = this.addSistemasSectionWithCheckboxes(doc, ticketData, MARGIN, y, CONTENT_WIDTH);

        // ===== DESCRIPCIÓN DE ACTIVIDADES =====
        y = this.addActivityDescriptionSimple(doc, ticketData, MARGIN, y, CONTENT_WIDTH);
        
        // ===== DESCRIPCIÓN DE EVIDENCIAS (si existe) =====
        if (ticketData.descripcionEvidencias && ticketData.descripcionEvidencias.trim() !== '') {
            y = this.addEvidenciasDescription(doc, ticketData, MARGIN, y, CONTENT_WIDTH);
        }

        // ===== EVIDENCIAS FOTOGRÁFICAS (SIEMPRE EN NUEVA PÁGINA) =====
        // Verificar si necesitamos nueva página para evidencias
        if (this.needsNewPage(doc, y, 50)) {
            y = this.addNewPageWithHeader(doc, reportTitle);
        } else if (y > this.PAGE_MARGINS.top + this.HEADER_HEIGHT + 20) {
            // Si ya hay contenido en la página actual, forzar nueva página para evidencias
            y = this.addNewPageWithHeader(doc, reportTitle);
        }
        
        // Agregar título de evidencias fotográficas
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(this.COLOR_AZUL_MARINO);
        doc.text('EVIDENCIAS FOTOGRÁFICAS', MARGIN, y);
        y += 15;
        
        // En generatePdfContentNewFormat, donde se llaman las evidencias
        y = await this.addEvidenceImagesGrid(doc, ticketData, MARGIN, y, CONTENT_WIDTH, imageDescriptions);

        // ===== ORDEN DE SERVICIO (SIEMPRE EN NUEVA PÁGINA) =====
        if (this.featuredItem) {
            // Forzar nueva página para orden de servicio
            y = this.addNewPageWithHeader(doc, reportTitle);
            y = await this.addFeaturedItemNewFormat(doc, MARGIN, y, CONTENT_WIDTH);
        }
        
        // ===== CONCLUSIÓN Y SELLO (EN NUEVA PÁGINA SI ES NECESARIO) =====
        // Verificar si necesitamos nueva página para conclusión y sello
        const neededHeightForSeal = 80; // Espacio para conclusión + sello + nombre
        if (this.needsNewPage(doc, y, neededHeightForSeal)) {
            y = this.addNewPageWithHeader(doc, reportTitle);
        }
        
        // ===== CONCLUSIÓN (si existe) =====
        if (ticketData.conclusion && ticketData.conclusion.trim() !== '') {
            y = this.addConclusionSection(doc, ticketData, MARGIN, y, CONTENT_WIDTH);
        }
        
        // ===== SELLO DE OPERACIONES CON JEFE OPERATIVO =====
        await this.addSealWithJefeOperativo(doc, ticketData, MARGIN, y, PAGE_WIDTH);
    },
    
    // NUEVA FUNCIÓN: Agregar descripción de evidencias
    addEvidenciasDescription(doc, ticketData, MARGIN, y, CONTENT_WIDTH) {
        const reportTitle = 'REPORTE FOTOGRÁFICO';
        
        // Verificar si necesitamos nueva página
        const minSpaceForTitle = 20;
        if (this.needsNewPage(doc, y, minSpaceForTitle)) {
            y = this.addNewPageWithHeader(doc, reportTitle);
        }

        // Título de la sección en azul marino
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(this.COLOR_AZUL_MARINO);
        doc.text('DESCRIPCIÓN DE EVIDENCIAS', MARGIN, y);
        
        y += 8;

        // Descripción de evidencias
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.setTextColor('#000000');
        
        const descripcionText = ticketData.descripcionEvidencias || '';
        
        if (descripcionText.trim() !== '') {
            const splitDescripcion = doc.splitTextToSize(descripcionText, CONTENT_WIDTH);
            
            // Verificar espacio para la descripción
            const descHeight = splitDescripcion.length * 4;
            if (this.needsNewPage(doc, y, descHeight)) {
                y = this.addNewPageWithHeader(doc, reportTitle);
                doc.text('DESCRIPCIÓN DE EVIDENCIAS (continuación)', MARGIN, y);
                y += 8;
            }
            
            doc.text(splitDescripcion, MARGIN, y);
            y += descHeight + 10;
        }

        return y;
    },
    
    // NUEVA FUNCIÓN: Agregar sección de conclusión
    addConclusionSection(doc, ticketData, MARGIN, y, CONTENT_WIDTH) {
        const reportTitle = 'REPORTE FOTOGRÁFICO';

        // Título de la sección en azul marino
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(this.COLOR_AZUL_MARINO);
        doc.text('CONCLUSIÓN', MARGIN, y);
        
        y += 8;

        // Conclusión
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.setTextColor('#000000');
        
        const conclusionText = ticketData.conclusion || '';
        
        if (conclusionText.trim() !== '') {
            const splitConclusion = doc.splitTextToSize(conclusionText, CONTENT_WIDTH);
            
            // Verificar espacio para la conclusión
            const conclusionHeight = splitConclusion.length * 4;
            if (this.needsNewPage(doc, y, conclusionHeight)) {
                y = this.addNewPageWithHeader(doc, reportTitle);
                doc.text('CONCLUSIÓN (continuación)', MARGIN, y);
                y += 8;
            }
            
            doc.text(splitConclusion, MARGIN, y);
            y += conclusionHeight + 20; // Espacio extra antes del sello
        }

        return y;
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
        doc.setTextColor(this.COLOR_AZUL_MARINO);
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
        
        // Fila 5: CORREO | TÉCNICO RESPONSABLE (JEFE OPERATIVO)
        this.addTableFieldUnified(doc, 'CORREO:', 
            getDynamicValue(ticketData.correo, 'N/A'), 
            MARGIN, y + 37, CONTENT_WIDTH/2 - 2);
        
        // USAR EL JEFE OPERATIVO SELECCIONADO
        

        return y + TABLE_HEIGHT + 5;
    },

    // APARTADO DE SISTEMAS CON CHECKBOXES EN UNA SOLA FILA CON COLOR DORADO
    addSistemasSectionWithCheckboxes(doc, ticketData, MARGIN, y, CONTENT_WIDTH) {
        // Título de la sección en azul marino
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(this.COLOR_AZUL_MARINO);
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
        if (this.needsNewPage(doc, y, 50)) {
            y = this.addNewPageWithHeader(doc, 'REPORTE FOTOGRÁFICO');
        }

        // Título de la sección en azul marino
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(this.COLOR_AZUL_MARINO);
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
        
        // Verificar espacio para la descripción
        const descHeight = splitDescripcion.length * 4;
        if (this.needsNewPage(doc, y, descHeight)) {
            y = this.addNewPageWithHeader(doc, 'REPORTE FOTOGRÁFICO');
            doc.text('DESCRIPCIÓN DE ACTIVIDADES (continuación)', MARGIN, y);
            y += 8;
        }
        
        doc.text(splitDescripcion, MARGIN, y);
        
        return y + descHeight + 10;
    },

    // EVIDENCIAS FOTOGRÁFICAS EN GRID (máximo 3 por fila) - TAMAÑO ORIGINAL
    async addEvidenceImagesGrid(doc, ticketData, MARGIN, y, CONTENT_WIDTH, imageDescriptions = []) {
        if (!ticketData.imagenes || ticketData.imagenes.length === 0) {
            return y;
        }

        // Configuración del grid - 3 imágenes por fila
        const imagesPerRow = 3;
        const imageSpacing = 5;
        const imageWidth = this.IMAGE_WIDTH;
        const imageHeight = this.IMAGE_HEIGHT;
        const descriptionHeight = 12;
        const rowSpacing = 15;
        
        const rowWidth = (imageWidth * imagesPerRow) + (imageSpacing * (imagesPerRow - 1));
        const startX = MARGIN + ((CONTENT_WIDTH - rowWidth) / 2);
        let currentX = startX;
        let currentY = y;

        const currentTime = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
        const address = 'C. 31 110, El Sol, 57200 Nezahualcóyotl, Méx.';

        // Procesar todas las imágenes
        for (let i = 0; i < ticketData.imagenes.length; i++) {
            const imageItem = ticketData.imagenes[i];
            // Obtener la URL de la imagen (puede ser string u objeto)
            const imageUrl = typeof imageItem === 'string' ? imageItem : imageItem.url;
            const imageDesc = imageDescriptions[i] || '';
            
            // Verificar si necesitamos nueva página
            const spaceNeeded = imageHeight + descriptionHeight + rowSpacing;
            if (this.needsNewPage(doc, currentY, spaceNeeded)) {
                currentY = this.addNewPageWithHeader(doc, 'REPORTE FOTOGRÁFICO');
                
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(12);
                doc.setTextColor(this.COLOR_AZUL_MARINO);
                doc.text('EVIDENCIAS FOTOGRÁFICAS (continuación)', MARGIN, currentY);
                currentY += 15;
                currentX = startX;
            }

            try {
                // Cargar imagen desde URL
                const imageDataUrl = await this.loadImageAsDataURL(imageUrl);
                if (imageDataUrl) {
                    const imageWithWatermark = await this.addWatermarkNewFormat(imageDataUrl, address, currentTime);
                    const img = await this.loadImage(imageWithWatermark);
                    
                    // Calcular dimensiones manteniendo proporción
                    const aspectRatio = img.width / img.height;
                    let finalWidth = imageWidth;
                    let finalHeight = imageHeight;
                    
                    if (aspectRatio > 1) {
                        finalHeight = imageWidth / aspectRatio;
                    } else {
                        finalWidth = imageHeight * aspectRatio;
                    }
                    
                    const xOffset = currentX + (imageWidth - finalWidth) / 2;
                    const yOffset = currentY;
                    
                    doc.addImage(imageWithWatermark, 'JPEG', xOffset, yOffset, finalWidth, finalHeight);
                    
                    // Agregar descripción debajo de la imagen si existe
                    if (imageDesc) {
                        doc.setFont('helvetica', 'normal');
                        doc.setFontSize(9);
                        doc.setTextColor('#000000');
                        
                        const descY = currentY + imageHeight + 3;
                        
                        if (!this.needsNewPage(doc, descY, descriptionHeight)) {
                            const maxDescWidth = imageWidth - 2;
                            const splitDesc = doc.splitTextToSize(imageDesc, maxDescWidth);
                            
                            splitDesc.forEach((line, lineIndex) => {
                                const lineY = descY + (lineIndex * 4);
                                doc.text(line, currentX, lineY);
                            });
                        }
                    }
                    
                    currentX += imageWidth + imageSpacing;
                    
                    if ((i + 1) % imagesPerRow === 0) {
                        currentX = startX;
                        currentY += imageHeight + rowSpacing + (imageDesc ? descriptionHeight : 0);
                    }
                }
            } catch (error) {
                console.error(`Error al procesar imagen ${i}:`, error);
            }
        }

        // Actualizar posición Y final
        if (ticketData.imagenes.length > 0) {
            const fullRows = Math.floor(ticketData.imagenes.length / imagesPerRow);
            const remainingImages = ticketData.imagenes.length % imagesPerRow;
            
            if (remainingImages > 0) {
                currentY += imageHeight + rowSpacing;
            } else if (fullRows > 0) {
                currentY += 5;
            }
        }

        return currentY;
    },

    // Función auxiliar para campo de tabla unificada
    addTableFieldUnified(doc, label, value, x, y, maxWidth) {
        // Label en azul marino y negrita
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(this.COLOR_AZUL_MARINO);
        
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

    // NUEVO ELEMENTO DESTACADO - ORDEN DE SERVICIO SIN MARCA DE AGUA Y SIN HOJA EN BLANCO
    async addFeaturedItemNewFormat(doc, MARGIN, y, CONTENT_WIDTH) {
        const reportTitle = 'REPORTE FOTOGRÁFICO';
        
        // Verificar si necesitamos nueva página
        const minSpaceForTitle = 30;
        if (this.needsNewPage(doc, y, minSpaceForTitle)) {
            y = this.addNewPageWithHeader(doc, reportTitle);
        }

        if (this.featuredItem) {
            try {
                // Título de la sección
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(12);
                doc.setTextColor(this.COLOR_AZUL_MARINO);
                doc.text('ORDEN DE SERVICIO ADJUNTA', MARGIN, y);
                y += 8;

                if (this.featuredItem.type === 'image') {
                    // Verificar espacio para imagen
                    const estimatedHeight = 100;
                    if (this.needsNewPage(doc, y, estimatedHeight)) {
                        y = this.addNewPageWithHeader(doc, reportTitle);
                        doc.text('ORDEN DE SERVICIO ADJUNTA (continuación)', MARGIN, y);
                        y += 15;
                    }
                    
                    // Procesar imagen SIN marca de agua
                    const imageDataUrl = this.featuredItem.data;
                    const img = await this.loadImage(imageDataUrl);
                    
                    // Calcular dimensiones manteniendo proporción
                    const aspectRatio = img.width / img.height;
                    let finalWidth = CONTENT_WIDTH;
                    let finalHeight = (CONTENT_WIDTH / aspectRatio);
                    
                    // Limitar altura máxima
                    if (finalHeight > 150) {
                        finalHeight = 150;
                        finalWidth = 150 * aspectRatio;
                    }

                    // Centrar la imagen
                    const xOffset = MARGIN + (CONTENT_WIDTH - finalWidth) / 2;
                    
                    // Usar la imagen original SIN marca de agua
                    doc.addImage(imageDataUrl, 'JPEG', xOffset, y, finalWidth, finalHeight);
                    y += finalHeight + 10;
                    
                } else if (this.featuredItem.type === 'pdf') {
                    // CONVERTIR PDF A IMÁGENES SIN MARCA DE AGUA Y SIN HOJA EN BLANCO
                    y = await this.insertPdfAsImagesWithoutWatermark(doc, this.featuredItem.data, MARGIN, y, CONTENT_WIDTH, 'ORDEN DE SERVICIO');
                }
            } catch (error) {
                console.error("Error al procesar orden de servicio:", error);
                
                // Mostrar mensaje de error
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(10);
                doc.setTextColor('#e74c3c');
                doc.text('Error al procesar el archivo adjunto.', MARGIN, y);
                y += 10;
            }
        }

        return y;
    },

    // NUEVA FUNCIÓN: Convertir PDF a imágenes SIN marca de agua Y SIN HOJA EN BLANCO
    async insertPdfAsImagesWithoutWatermark(doc, pdfDataUrl, MARGIN, y, CONTENT_WIDTH, sectionTitle = 'DOCUMENTO ADJUNTO') {
        try {
            const reportTitle = 'REPORTE FOTOGRÁFICO';
            
            // Configurar worker de PDF.js
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
            
            // Cargar el PDF
            const loadingTask = pdfjsLib.getDocument(pdfDataUrl);
            const pdf = await loadingTask.promise;
            const totalPages = pdf.numPages;
            
            console.log(`PDF cargado con ${totalPages} páginas`);
            
            // Procesar cada página
            for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
                try {
                    // Verificar si necesitamos nueva página antes de cada página del PDF
                    const estimatedPageHeight = 150;
                    if (this.needsNewPage(doc, y, estimatedPageHeight + 20)) {
                        y = this.addNewPageWithHeader(doc, reportTitle);
                        doc.setFont('helvetica', 'bold');
                        doc.setFontSize(12);
                        doc.setTextColor(this.COLOR_AZUL_MARINO);
                        doc.text(`${sectionTitle} (continuación)`, MARGIN, y);
                        y += 10;
                    }
                    
                    const page = await pdf.getPage(pageNum);
                    
                    // Configurar viewport para renderizar
                    const viewport = page.getViewport({ scale: 1.5 });
                    
                    // Crear canvas para renderizar
                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;
                    
                    // Renderizar la página del PDF en el canvas
                    const renderContext = {
                        canvasContext: context,
                        viewport: viewport
                    };
                    
                    await page.render(renderContext).promise;
                    
                    // Convertir canvas a DataURL
                    const pageImage = canvas.toDataURL('image/jpeg', 0.85);
                    
                    // Calcular dimensiones para ajustar al ancho del contenido
                    const scaleFactor = 0.9; // 80% del ancho disponible
                    const imageWidth = CONTENT_WIDTH * scaleFactor; // 
                    const imageHeight = (canvas.height * imageWidth) / canvas.width;
                    
                    // Verificar si necesitamos nueva página para esta imagen específica
                    if (this.needsNewPage(doc, y, imageHeight + 10)) {
                        y = this.addNewPageWithHeader(doc, reportTitle);
                        doc.setFont('helvetica', 'bold');
                        doc.setFontSize(12);
                        doc.setTextColor(this.COLOR_AZUL_MARINO);
                        doc.text(`${sectionTitle} (continuación)`, MARGIN, y);
                        y += 10;
                    }
                    
                    
                    // Agregar la imagen SIN marca de agua
                    doc.addImage(pageImage, 'JPEG', MARGIN, y, imageWidth, imageHeight);
                    y += imageHeight + 10;
                    
                } catch (pageError) {
                    console.error(`Error al procesar página ${pageNum}:`, pageError);
                    continue;
                }
            }
            
            return y;
            
        } catch (error) {
            console.error("Error en insertPdfAsImagesWithoutWatermark:", error);
            
            // Mostrar mensaje de error
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor('#e74c3c');
            doc.text('Error al procesar el documento PDF.', MARGIN, y);
            y += 10;
            
            return y;
        }
    },

    // SELLO DE OPERACIONES CON JEFE OPERATIVO (AHORA VA DESPUÉS DE LA CONCLUSIÓN)
    async addSealWithJefeOperativo(doc, ticketData, MARGIN, y, PAGE_WIDTH) {
        const reportTitle = 'REPORTE FOTOGRÁFICO';
        
        y += 10; // Espacio después de la conclusión

        try {
            // Intentar cargar la imagen del sello desde diferentes rutas
            const possibleSealPaths = [
                '/vista/css/img/selloOperaciones.png',
                '../vista/css/img/selloOperaciones.png',
                '../../vista/css/img/selloOperaciones.png',
                './vista/css/img/selloOperaciones.png',
                'css/img/selloOperaciones.png',
                '../css/img/selloOperaciones.png',
                '../../css/img/selloOperaciones.png',
                'vista/css/img/selloOperaciones.png',
                // Rutas alternativas
                '/css/img/selloOperaciones.png',
                '../../../../vista/css/img/selloOperaciones.png'
            ];
            
            let sealLoaded = false;
            let sealDataUrl = null;
            
            for (const sealPath of possibleSealPaths) {
                try {
                    // Intentar cargar como DataURL
                    sealDataUrl = await this.loadImageAsDataURL(sealPath);
                    if (sealDataUrl) {
                        sealLoaded = true;
                        console.log(`Sello cargado desde: ${sealPath}`);
                        break;
                    }
                } catch (error) {
                    console.log(`No se pudo cargar sello desde: ${sealPath}`);
                    continue;
                }
            }
            
            if (sealLoaded && sealDataUrl) {
                // Cargar imagen para obtener dimensiones
                const img = await this.loadImage(sealDataUrl);
                
                // Calcular dimensiones del sello (manteniendo proporción)
                const sealWidth = 40; // Ancho fijo para el sello
                const sealHeight = (img.height * sealWidth) / img.width;
                
                // Centrar el sello
                const sealX = (PAGE_WIDTH - sealWidth) / 2;
                
                // Agregar la imagen del sello con fondo transparente
                // Usar 'PNG' para mantener la transparencia
                doc.addImage(sealDataUrl, 'PNG', sealX, y, sealWidth, sealHeight);
                
                y += sealHeight + 10;
                
                // Agregar nombre del jefe operativo
                const jefeOperativo = ticketData.nombresColaboradores || 'Jefe Operativo';
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(12);
                doc.setTextColor('#000000');
                doc.text(jefeOperativo, PAGE_WIDTH / 2, y, { align: 'center' });
                
                y += 8;
                
                // Agregar texto del sello
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(10);
                doc.setTextColor('#666666');
                doc.text('SELLO DE OPERACIONES', PAGE_WIDTH / 2, y, { align: 'center' });
                
            } else {
                // Si no se puede cargar el sello, mostrar solo el texto
                console.warn('No se pudo cargar el sello de operaciones');
                
                // Agregar nombre del jefe operativo
                const jefeOperativo = ticketData.nombresColaboradores || 'Jefe Operativo';
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(12);
                doc.setTextColor('#000000');
                doc.text(jefeOperativo, PAGE_WIDTH / 2, y, { align: 'center' });
                
                y += 15;
                
                // Agregar texto del sello
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(10);
                doc.setTextColor('#666666');
                doc.text('SELLO DE OPERACIONES', PAGE_WIDTH / 2, y, { align: 'center' });
                
                // Dibujar un recuadro para representar el sello faltante
                doc.setDrawColor(212, 175, 55); // Color dorado
                doc.setLineWidth(0.5);
                const sealWidth = 40;
                const sealX = (PAGE_WIDTH - sealWidth) / 2;
                doc.rect(sealX, y - 30, sealWidth, 25);
            }
            
        } catch (error) {
            console.error('Error al cargar el sello:', error);
            
            // Mostrar solo el texto en caso de error
            const jefeOperativo = ticketData.nombresColaboradores || 'Jefe Operativo';
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12);
            doc.setTextColor('#000000');
            doc.text(jefeOperativo, PAGE_WIDTH / 2, y, { align: 'center' });
            
            y += 8;
            
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor('#666666');
            doc.text('SELLO DE OPERACIONES', PAGE_WIDTH / 2, y, { align: 'center' });
        }
    },

    // MODIFICAR LA FUNCIÓN addFooter para que no agregue página extra
    addFooter(doc) {
        const PAGE_HEIGHT = doc.internal.pageSize.getHeight();
        const PAGE_WIDTH = doc.internal.pageSize.getWidth();
        const fechaCreacion = new Date().toLocaleDateString('es-MX');
        
        // Solo agregar pie de página si hay suficiente espacio
        const footerY = PAGE_HEIGHT - this.PAGE_MARGINS.bottom + 5;
        
        // Verificar si estamos cerca del final de la página (al menos 10mm disponibles)
        if (footerY < PAGE_HEIGHT - 10) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor('#000000');
            
            // Línea divisoria en color dorado
            doc.setDrawColor(212, 175, 55);
            doc.setLineWidth(0.2);
            doc.line(15, footerY - 5, PAGE_WIDTH - 15, footerY - 5);
            
            // Texto del pie de página
            const footerText = `RAFHA SOLUCION INTEGRALES SAS DE CV - Generado el: ${fechaCreacion} - Página ${this.currentPage}`;
            doc.text(footerText, PAGE_WIDTH / 2, footerY, { align: 'center' });
        }
    },

    // NUEVA MARCA DE AGUA MEJORADA (solo para imágenes de evidencias)
    async addWatermarkNewFormat(imageDataUrl, address, time) {
        try {
            const originalImage = await this.loadImage(imageDataUrl);
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Establecer tamaño del canvas igual al de la imagen
            canvas.width = originalImage.width;
            canvas.height = originalImage.height;
            
            // Dibujar la imagen original
            ctx.drawImage(originalImage, 0, 0);
            
            // Verificar si la imagen es suficientemente grande para la marca de agua
            if (canvas.height >= 100) { // Mínimo 100px de alto
                const watermarkHeight = Math.max(canvas.height * 0.08, 20); // Mínimo 20px
                const watermarkY = canvas.height - watermarkHeight;
                
                // Fondo semitransparente para la marca de agua
                ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                ctx.fillRect(0, watermarkY, canvas.width, watermarkHeight);
                
                // Texto de la marca de agua
                ctx.fillStyle = 'white';
                ctx.font = `bold ${watermarkHeight * 0.4}px Arial`;
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                
                const text = `${address} - ${time}`;
                const textX = 10;
                const textY = watermarkY + (watermarkHeight / 2);
                
                ctx.fillText(text, textX, textY);
            }
            
            return canvas.toDataURL('image/jpeg', 0.9);
        } catch (error) {
            console.error("Error al aplicar marca de agua:", error);
            return imageDataUrl; // Retornar la imagen original si hay error
        }
    },

    // FUNCIÓN MEJORADA: Cargar imagen como DataURL (con soporte para PNG transparente)
    async loadImageAsDataURL(url) {
        return new Promise((resolve, reject) => {
            // Si ya es data URL, resolver directamente
            if (url.startsWith('data:')) {
                resolve(url);
                return;
            }

            const img = new Image();
            img.crossOrigin = 'Anonymous';
            
            // Timeout para evitar bloqueos
            const timeout = setTimeout(() => {
                console.warn('Timeout al cargar imagen:', url);
                reject(new Error('Timeout al cargar imagen'));
            }, 15000); // 15 segundos
            
            img.onload = function() {
                clearTimeout(timeout);
                try {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    
                    // Si es PNG, mantener transparencia
                    if (url.toLowerCase().includes('.png')) {
                        ctx.fillStyle = 'white';
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                    }
                    
                    ctx.drawImage(img, 0, 0);
                    
                    const format = url.toLowerCase().includes('.png') ? 'PNG' : 'JPEG';
                    const dataURL = canvas.toDataURL(`image/${format}`, format === 'JPEG' ? 0.9 : 1.0);
                    resolve(dataURL);
                } catch (error) {
                    clearTimeout(timeout);
                    reject(error);
                }
            };
            
            img.onerror = function() {
                clearTimeout(timeout);
                console.error('Error al cargar imagen:', url);
                reject(new Error(`No se pudo cargar la imagen: ${url}`));
            };
            
            img.src = url;
        });
    },

    // Función mejorada para cargar imágenes con manejo de errores
    loadImage(url) {
        return new Promise((resolve, reject) => {
            // Si ya es una data URL, crear imagen directamente
            if (url.startsWith('data:image/')) {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = () => {
                    console.error('Error al cargar imagen DataURL');
                    // Crear una imagen de reemplazo
                    const fallbackImg = new Image();
                    fallbackImg.width = 100;
                    fallbackImg.height = 100;
                    resolve(fallbackImg);
                };
                img.src = url;
                return;
            }
            
            // Para URLs remotas
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            
            // Establecer timeout para evitar bloqueos
            const timeout = setTimeout(() => {
                console.warn('Timeout al cargar imagen');
                img.src = ''; // Cancelar carga
                // Crear imagen de reemplazo
                const fallbackImg = new Image();
                fallbackImg.width = 100;
                fallbackImg.height = 100;
                
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = 100;
                canvas.height = 100;
                ctx.fillStyle = '#f8f9fa';
                ctx.fillRect(0, 0, 100, 100);
                ctx.fillStyle = '#999';
                ctx.font = '10px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('Carga timeout', 50, 50);
                
                fallbackImg.src = canvas.toDataURL();
                resolve(fallbackImg);
            }, 10000); // 10 segundos timeout
            
            img.onload = img.onerror = () => {
                clearTimeout(timeout);
                if (img.complete && img.naturalHeight !== 0) {
                    resolve(img);
                } else {
                    // Crear imagen de reemplazo
                    const fallbackImg = new Image();
                    fallbackImg.width = 100;
                    fallbackImg.height = 100;
                    
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    canvas.width = 100;
                    canvas.height = 100;
                    ctx.fillStyle = '#f8f9fa';
                    ctx.fillRect(0, 0, 100, 100);
                    ctx.fillStyle = '#999';
                    ctx.font = '10px Arial';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('Error carga', 50, 50);
                    
                    fallbackImg.src = canvas.toDataURL();
                    resolve(fallbackImg);
                }
            };
            
            img.src = url;
        });
    }
};

// Agrega esta función después de la función createAndSavePdf() en pdf-generator.js

// NUEVA FUNCIÓN: Generar PDF desde la interfaz HTML
async function generatePdfFromInterface(ticketData, additionalImages = [], ordenServicio = null) {
    if (!ticketData) {
        Swal.fire('Error', 'No hay datos del ticket para generar el PDF.', 'error');
        return false;
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
        
        // Combinar imágenes de evidencias con imágenes adicionales
        const allImages = [...(ticketData.imagenes || [])];
        
        // Agregar imágenes adicionales si existen
        if (additionalImages && additionalImages.length > 0) {
            additionalImages.forEach(img => {
                if (img.url && img.selected) {
                    allImages.push(img.url);
                }
            });
        }
        
        // Actualizar ticketData con todas las imágenes
        ticketData.imagenes = allImages;
        
        // Establecer orden de servicio como featuredItem si existe
        if (ordenServicio) {
            this.featuredItem = ordenServicio;
        } else {
            this.featuredItem = null;
        }
        
        // Inicializar manager
        this.initialize([], null); // Colaboradores y DB no son necesarios para esta generación
        this.ticketData = ticketData;
        this.currentPage = 1;
        this.totalPages = 1;
        
        // Generar el PDF con el nuevo formato
        await this.generatePdfContentNewFormat(doc, ticketData, reportTitle);
        
        // Agregar pie de página final
        this.addFooter(doc);
        
        // Guardar PDF
        const fileName = `${reportTitle.replace(/\s+/g, '_')}_${ticketData.idTicket || ticketData.id || 'ticket'}_${new Date().getTime()}.pdf`;
        doc.save(fileName);
        
        Swal.close();
        Swal.fire({ 
            title: '¡PDF Generado!', 
            text: `El archivo "${fileName}" se ha descargado exitosamente.`, 
            icon: 'success', 
            confirmButtonColor: '#6C43E0',
            timer: 3000
        });
        
        return true;
        
    } catch (error) {
        console.error('Error generando PDF:', error);
        Swal.close();
        Swal.fire('Error', 'Ocurrió un error al generar el PDF: ' + error.message, 'error');
        return false;
    }
}

// Agrega esta función al objeto pdfManager (al final, antes del cierre)
pdfManager.generatePdfFromInterface = generatePdfFromInterface;

// Definir COLOR_AZUL_MARINO como variable global para compatibilidad
const COLOR_AZUL_MARINO = '#002D62';

pdfManager.createAndSavePdfWithDescriptions = pdfManager.createAndSavePdfWithDescriptions || 
    async function(imageDescriptions = []) {
        return this.createAndSavePdfWithDescriptions(imageDescriptions);
    }.bind(pdfManager);