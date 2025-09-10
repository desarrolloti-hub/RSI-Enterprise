/*------------------Inicio incorporacion de modulos------------------------*/
function includeHTML(selector, url) {
    fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error(`Error al cargar ${url}`);
        return response.text();
      })
      .then((html) => {
        document.querySelector(selector).innerHTML = html;
      })
      .catch((error) => console.error(error));
  }

  // Cargar los componentes

  includeHTML('#footer-wrapper', 'https://rsienterprise.web.app/vista/nav-visitantes/modulos/footer.html');
  
/*-------------------Fin incorporacion de modulos--------------------------*/