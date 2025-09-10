// footer.js - Componente de footer autónomo
(function() {
    // Crear elemento <style> para los estilos del footer
    const style = document.createElement('style');
    style.textContent =/*css */ `
    /* Estilos del footer */
    footer {
        background-color: #1c1948;
        color: #ffffff;
        padding: 60px 0 20px;
    }

    .container {
        width: 100%;
        max-width: 1200px;
        margin: 0 auto;
        padding: 0 15px;
    }

    .footer-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 30px;
        margin-bottom: 40px;
    }

    .footer-column h4 {
        color: #ffffff;
        margin-bottom: 20px;
        font-size: 1.2rem;
        position: relative;
        padding-bottom: 10px;
        font-family: 'Montserrat', sans-serif;
    }

    .footer-column h4::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 0;
        width: 50px;
        height: 2px;
        background-color: #8f94fb;
    }

    .footer-column p {
        color: rgba(255, 255, 255, 0.7);
        margin-bottom: 20px;
    }

    .footer-column ul {
        list-style: none;
        padding: 0;
        margin: 0;
    }

    .footer-column ul li {
        margin-bottom: 10px;
    }

    .footer-column ul li a {
        color: rgba(255, 255, 255, 0.7);
        transition: all 0.3s ease;
        text-decoration: none;
    }

    .footer-column ul li a:hover {
        color: #ffffff;
        padding-left: 5px;
    }

    .social-links {
        display: flex;
        gap: 15px;
        margin-top: 20px;
    }

    .social-links a {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background-color: rgba(255, 255, 255, 0.1);
        color: #ffffff;
        transition: all 0.3s ease;
        text-decoration: none;
    }

    .social-links a:hover {
        background-color: #8f94fb;
        transform: translateY(-3px);
    }

    .contact-info {
        margin-top: 20px;
    }

    .contact-info p {
        display: flex;
        align-items: flex-start;
        margin-bottom: 15px;
    }

    .contact-info i {
        margin-right: 10px;
        color: #8f94fb;
    }

    .contact-info a {
        color: rgba(255, 255, 255, 0.7);
        transition: all 0.3s ease;
        text-decoration: none;
    }

    .contact-info a:hover {
        color: #ffffff;
        text-decoration: underline;
    }

    .payment-methods {
        text-align: center;
        margin: 40px 0;
    }

    .payment-methods h4 {
        color: #ffffff;
        margin-bottom: 15px;
    }

    .payment-icons {
        display: flex;
        justify-content: center;
        gap: 15px;
        font-size: 1.8rem;
        color: rgba(255, 255, 255, 0.7);
    }

    .copyright {
        text-align: center;
        padding-top: 20px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        color: rgba(255, 255, 255, 0.5);
        font-size: 0.9rem;
    }

    /* Responsive */
    @media (max-width: 768px) {
        .footer-grid {
            grid-template-columns: repeat(2, 1fr);
        }
    }

    @media (max-width: 480px) {
        .footer-grid {
            grid-template-columns: 1fr;
        }
        
        footer {
            padding: 40px 0 20px;
        }
    }
    `;
    document.head.appendChild(style);

    // Función para cargar Font Awesome si no está presente
    function loadFontAwesome() {
        if (!document.querySelector('link[href*="font-awesome"]')) {
            const faLink = document.createElement('link');
            faLink.rel = 'stylesheet';
            faLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
            document.head.appendChild(faLink);
        }
    }

    // Inyectar el HTML del footer
    const footerHTML =/*html*/ `
    <footer>
        <div class="container">
            <div class="footer-grid">
                <div class="footer-column">
                    <h4>RSI Enterprise</h4>
                    <p>Líderes en soluciones de seguridad electrónica en México.</p>
                    <div class="social-links">
                        <a href="https://www.facebook.com/RafhaSolucionIntegrales/" target="_blank"><i class="fab fa-facebook-f"></i></a>
                        <a href="https://www.instagram.com/rafhasolucionintegrales/" target="_blank"><i class="fab fa-instagram"></i></a>
                        <a href="https://www.linkedin.com/company/rafha-soluciones/" target="_blank"><i class="fab fa-linkedin-in"></i></a>
                    </div>
                </div>
                
                <div class="footer-column">
                    <h4>Enlaces Rápidos</h4>
                    <ul>
                        <li><a href="/vista/nav-visitantes/politiac-privasida.html">Términos y Condiciones, Política de Privacidad</a></li>
                        <li><a href="/vista/nav-visitantes/politica-devoluciones.html">Política de Devoluciones</a></li>
                        <li><a href="/vista/nav-visitantes/factura.html">Proceso de facturación</a></li>
                    </ul>
                </div>
                
                <div class="footer-column">
                    <h4>Servicios</h4>
                    <ul>
                        <li><a href="/vista/nav-visitantes/seguridad-electronica.htm">Seguridad electrónica</a></li>
                        <li><a href="/vista/nav-visitantes/multimedia.html">Multimedia</a></li>
                        <li><a href="/vista/nav-visitantes/servicios.html">Desarrollo de Software</a></li>
                        <li><a href="/vista/nav-visitantes/quienesSomos.html">Acerca de nosotros</a></li>
                        <li><a href="/vista/nav-visitantes/contacto-&-comentarios.html">Contacto</a></li>
                        <li><a href="/vista/nav-visitantes/Unete.html">Únete a RSI</a></li>
                    </ul>
                </div>
                
                <div class="footer-column">
                    <h4>Contacto</h4>
                    <div class="contact-info">
                        <p><i class="fas fa-map-marker-alt"></i> 
                            <a href="https://maps.app.goo.gl/BL5MLBb3TAPXV6r3A" target="_blank" rel="noopener noreferrer">
                                Calle 31 #110, Col. El Sol, Nezahualcóyotl, Méx
                            </a>
                        </p>
                        <p><i class="fas fa-phone"></i> <a href="tel:+525576908248">55 7690 8248</a></p>
                        <p><i class="fas fa-envelope"></i> <a href="mailto:contacto@rsienterprise.com">contacto@rsienterprise.com</a></p>
                    </div>
                </div>
            </div>
            
            <div class="payment-methods">
                <h4>Métodos de Pago</h4>
                <div class="payment-icons">
                    <i class="fab fa-cc-visa"></i>
                    <i class="fab fa-cc-mastercard"></i>
                    <i class="fab fa-cc-amex"></i>
                    <i class="fas fa-money-bill-wave"></i>
                </div>
            </div>
            
            <div class="copyright">
                <p>&copy; ${new Date().getFullYear()} RSI Enterprise. Todos los derechos reservados.</p>
            </div>
        </div>
    </footer>
    `;

    // Insertar el footer al final del body
    document.body.insertAdjacentHTML('beforeend', footerHTML);

    // Cargar Font Awesome si es necesario
    loadFontAwesome();
})();