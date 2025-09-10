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
      const db = firebase.firestore();
  
      // Elementos del DOM
      const chatMessages = document.getElementById('chat-messages');
      const optionsContainer = document.getElementById('options-container');
      const chatbotContainer = document.getElementById('chatbot-container');
      const chatbotToggle = document.getElementById('chatbot-toggle');
      const closeChatbot = document.getElementById('close-chatbot');
  
      // Estado del chatbot
      let chatbotVisible = false;
      let currentCategory = '';
      let allProducts = [];
      let categories = [];
  
      // Opciones del chatbot
      const chatbotOptions = {
        main: [
          { text: "¿Cómo contacto a un asesor?", action: "contact" },
          { text: "¿Cómo creo una cuenta?", action: "create_account" },
          { text: "¿Cómo inicio sesión?", action: "login" },
          { text: "¿Cómo realizo los pagos?", action: "payments" },
          { text: "Recomendaciones de equipos de seguridad", action: "products" }
        ],
        products: []
      };
  
      // Función para mostrar/ocultar el chatbot
      function toggleChatbot() {
        chatbotVisible = !chatbotVisible;
        if (chatbotVisible) {
          chatbotContainer.classList.add('visible');
          setTimeout(() => {
            const options = optionsContainer.querySelectorAll('.option-button');
            if (options.length > 0) {
              options[0].focus();
            }
          }, 300);
        } else {
          chatbotContainer.classList.remove('visible');
        }
      }
  
      // Mostrar opciones en el contenedor
      function showOptions(options) {
        optionsContainer.innerHTML = '';
        options.forEach(option => {
          const button = document.createElement('button');
          button.className = 'option-button';
          button.textContent = option.text;
          button.onclick = function(e) {
            e.stopPropagation();
            handleOptionClick(option);
          };
          optionsContainer.appendChild(button);
        });
      }
  
      // Manejar clic en una opción
      function handleOptionClick(option) {
        addMessage(option.text, 'user');
        
        if (option.action === 'main') {
          showMainMenu();
        } else if (option.action === 'products') {
          showProductCategories();
        } else if (option.category) {
          currentCategory = option.category;
          loadProductsByCategory(option.category);
        } else {
          showResponse(option.action);
        }
      }
  
      // Cargar productos por categoría
      function loadProductsByCategory(category) {
        addMessage(`Cargando productos de ${category}...`, 'bot');
        
        allProducts = [];
        
        db.collection("Productos")
          .where("Categoria", "==", category)
          .limit(3)
          .get()
          .then((querySnapshot) => {
            if (chatMessages.lastChild.textContent.includes('Cargando')) {
              chatMessages.removeChild(chatMessages.lastChild);
            }
            
            if (querySnapshot.empty) {
              addMessage('No se encontraron productos en esta categoría.', 'bot');
            } else {
              querySnapshot.forEach((doc) => {
                allProducts.push({ id: doc.id, ...doc.data() });
              });
              
              addMessage(`Productos en ${category}:`, 'bot');
              
              allProducts.forEach(product => {
                displayProduct(product);
              });
            }
            
            setTimeout(() => {
              addMessage('¿En qué más puedo ayudarte?', 'bot');
              showOptions(chatbotOptions.products);
            }, 300);
          })
          .catch((error) => {
            console.error("Error al cargar productos: ", error);
            addMessage('Error al cargar productos. Intenta más tarde.', 'bot');
            showOptions(chatbotOptions.products);
          });
      }
  
      // Mostrar un producto en el chat
      function displayProduct(product) {
        const price = product['Precio MXN'] ? 
          `$${product['Precio MXN'].toLocaleString('es-MX', {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : 
          'Precio no disponible';
        
        const firstImage = product.Imagenes && product.Imagenes.length > 0 ? 
          `<img src="${product.Imagenes[0]}" class="product-image" alt="${product['Nombre Producto']}">` : 
          '<div class="product-image" style="display: flex; align-items: center; justify-content: center; color: #999;">Sin imagen</div>';
          
        const productHtml = `
          <div class="product-card">
            ${firstImage}
            <div class="product-title">${product['Nombre Producto'] || 'Producto sin nombre'}</div>
            <div class="product-price">${price}</div>
          </div>
        `;
        chatMessages.insertAdjacentHTML('beforeend', productHtml);
      }
  
      // Mostrar respuesta según la acción seleccionada
      function showResponse(action) {
        let response = '';
        
        switch(action) {
          case 'contact':
            response = `
              <p>Para soporte técnico o asistencia puedes contactarnos:</p>
              <p><strong>Teléfono:</strong> 55 5139 1533</p>
              <p><strong>Correo electrónico:</strong> aadministracion@rhafasoluciones.com</p>
              <p>Horario de atención: Lunes a Viernes de 9:00 am a 6:00 pm</p>
            `;
            break;
          case 'create_account':
            response = `
              <p>Para crear una cuenta en RSI Enterprise:</p>
              <ol>
                <li>Visita nuestro sitio web oficial</li>
                <li>Haz clic en "Registrarse"</li>
                <li>Completa el formulario con tus datos personales</li>
                <li>Verifica tu correo electrónico</li>
              </ol>
              <p>También puedes <a href="https://rsienterprise.com/inicio-de-sesion" target="_blank">registrarte desde aquí</a></p>
            `;
            break;
          case 'login':
            response = `
              <p>Para iniciar sesión en tu cuenta:</p>
              <ol>
                <li>Ve a nuestra <a href="https://rsienterprise.com/inicio-de-sesion" target="_blank">página de inicio de sesión</a></li>
                <li>Ingresa tu correo electrónico registrado</li>
                <li>Ingresa tu contraseña</li>
                <li>Haz clic en "Iniciar sesión"</li>
              </ol>
              <p>Si no tienes una cuenta, haz clic en "Registrarse aquí" en la misma página.</p>
            `;
            break;
          case 'payments':
            response = 'Puedes realizar pagos:\n- En línea con tarjeta de crédito/débito\n- Transferencia bancaria\n- En efectivo en nuestras oficinas\n- A través de nuestra app móvil';
            break;
          default:
            response = 'No entendí tu solicitud. Por favor selecciona una opción válida.';
        }
        
        addMessage(response, 'bot');
        setTimeout(() => showOptions(chatbotOptions.main), 500);
      }
  
      // Añadir un mensaje al chat
      function addMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        if (typeof text === 'string' && text.includes('<')) {
          messageDiv.innerHTML = text;
        } else {
          messageDiv.textContent = text;
        }
        
        messageDiv.querySelectorAll('a').forEach(link => {
          link.setAttribute('target', '_blank');
          link.setAttribute('rel', 'noopener noreferrer');
        });
        
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
      }
  
      // Mostrar menú principal
      function showMainMenu() {
        addMessage('Por favor selecciona una opción:', 'bot');
        showOptions(chatbotOptions.main);
      }
  
      // Mostrar categorías de productos
      function showProductCategories() {
        addMessage('Tenemos estas categorías de equipos de seguridad:', 'bot');
        showOptions(chatbotOptions.products);
      }
  
      // Cargar categorías desde Firestore
      function loadCategories() {
        db.collection("categorias").get()
          .then((querySnapshot) => {
            categories = [];
            querySnapshot.forEach((doc) => {
              categories.push(doc.data().nombre);
            });
            
            chatbotOptions.products = categories.map(category => ({
              text: category,
              category: category
            }));
            
            chatbotOptions.products.push({ 
              text: "Volver al menú principal", 
              action: "main" 
            });
            
            showMainMenu();
          })
          .catch((error) => {
            console.error("Error al cargar categorías: ", error);
            addMessage('Error al cargar categorías. Intenta más tarde.', 'bot');
            showMainMenu();
          });
      }
  
      // Event listeners
      chatbotToggle.addEventListener('click', function(e) {
        e.stopPropagation();
        toggleChatbot();
      });
      
      closeChatbot.addEventListener('click', function(e) {
        e.stopPropagation();
        toggleChatbot();
      });
  
      document.addEventListener('click', function(e) {
        if (chatbotVisible && 
            !chatbotContainer.contains(e.target) && 
            e.target !== chatbotToggle && 
            !e.target.classList.contains('option-button')) {
          toggleChatbot();
        }
      });
  
      // Inicializar
      document.addEventListener('DOMContentLoaded', () => {
        loadCategories();
        
        document.addEventListener('keydown', (e) => {
          if (e.key === 'Escape' && chatbotVisible) {
            toggleChatbot();
          }
        });
      });