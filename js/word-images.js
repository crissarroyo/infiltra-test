/**
 * INFILTRA v2.1.0 — Ilustración de palabras
 *
 * La imagen se resuelve en el navegador contra la API pública de
 * Wikipedia en español (sin clave, CORS abierto):
 *   https://es.wikipedia.org/api/rest_v1/page/summary/{título}
 *
 * WORD_IMAGE_TITLES corrige las palabras ambiguas para que el artículo
 * (y por tanto la miniatura) sea el correcto y family friendly.
 * Si el artículo resulta ser una desambiguación o no tiene miniatura,
 * el juego simplemente no muestra imagen.
 *
 * COLOR_SWATCHES: la categoría Colores no usa Wikipedia; se pinta una
 * muestra del color real.
 */

window.WORD_IMAGE_TITLES = {
    // Animales
    "León": "Panthera leo",
    "Tigre": "Panthera tigris",
    "Zebra": "Cebra",
    "Pájaro": "Ave",
    // Comida
    "Tacos": "Taco",
    "Empanadas": "Empanada",
    "Donas": "Donut",
    "Galletas": "Galleta",
    "Mole": "Mole (gastronomía)",
    "Tamales": "Tamal",
    "Hot dog": "Perrito caliente",
    "Cereal": "Cereal de desayuno",
    // Ciudades
    "México DF": "Ciudad de México",
    "Dubai": "Dubái",
    // Profesiones
    "Mesero": "Camarero",
    "Contador": "Contador público",
    "Piloto": "Aviador",
    "Diseñador": "Diseño gráfico",
    // Deportes
    "Ping pong": "Tenis de mesa",
    "Skate": "Skateboarding",
    "Remo": "Remo (deporte)",
    // Frutas
    "Naranja": "Naranja (fruta)",
    "Coco": "Cocos nucifera",
    "Mora": "Mora (fruta)",
    "Granada": "Granada (fruta)",
    "Kiwi": "Actinidia deliciosa",
    "Mango": "Mango (fruta)",
    "Toronja": "Pomelo",
    "Mamey": "Pouteria sapota",
    "Guanábana": "Annona muricata",
    "Tuna": "Opuntia ficus-indica",
    "Durazno": "Prunus persica",
    // Vehículos
    "Coche": "Automóvil",
    "Metro": "Ferrocarril metropolitano",
    "Patineta": "Monopatín",
    // Instrumentos
    "Batería": "Batería (instrumento musical)",
    "Bajo": "Bajo eléctrico",
    "Órgano": "Órgano (instrumento musical)",
    "Cello": "Violonchelo",
    // Películas
    "Titanic": "Titanic (película de 1997)",
    "Avatar": "Avatar (película)",
    "Frozen": "Frozen (película de 2013)",
    "Up": "Up (película)",
    "Cars": "Cars (película)",
    "Encanto": "Encanto (película)",
    "Intensamente": "Intensa-Mente",
    "E.T.": "E.T., el extraterrestre",
    "Inception": "Origen (película)",
    "The Matrix": "Matrix",
    "Avengers": "The Avengers (película de 2012)",
    "El Rey León": "El rey león",
    "Ratatouille": "Ratatouille (película)",
    "Volver al Futuro": "Volver al futuro",
    "Madagascar": "Madagascar (película)",
    "Moana": "Moana (película de 2016)",
    // Superhéroes
    "Flash": "Flash (DC Comics)",
    "Thor": "Thor (Marvel Comics)",
    "Robin": "Robin (DC Comics)",
    "Captain America": "Capitán América",
    // Objetos
    "Vela": "Vela (iluminación)",
    "Libreta": "Cuaderno",
    "Control remoto": "Mando a distancia",
    "Llaves": "Llave (cerradura)",
    // Lugares
    "Cine": "Sala de cine",
    "Iglesia": "Iglesia (edificio)",
    "Parque de diversiones": "Parque de atracciones",
    // Naturaleza
    "Coral": "Arrecife de coral",
    "Aurora boreal": "Aurora polar",
    // Tecnología
    "Celular": "Teléfono móvil",
    "Audífonos": "Auriculares",
    "Dron": "Vehículo aéreo no tripulado",
    "Tablet": "Tableta (computadora)",
    "Cargador": "Cargador de baterías",
    "Pantalla": "Monitor de computadora",
    "Teclado": "Teclado (informática)",
    "Cámara": "Cámara fotográfica",
    "Consola": "Videoconsola",
    "Satélite": "Satélite artificial",
    "Bocina": "Altavoz",
    "Smartwatch": "Reloj inteligente",
    // Dibujos Animados
    "Gumball": "El asombroso mundo de Gumball",
    "Winnie Pooh": "Winnie the Pooh",
    // Bebidas
    "Jugo de naranja": "Zumo de naranja",
    "Malteada": "Batido (bebida)",
    "Agua de jamaica": "Hibiscus sabdariffa",
    // Videojuegos
    "Zelda": "The Legend of Zelda",
    "Sonic": "Sonic the Hedgehog",
    "FIFA": "FIFA (serie de videojuegos)",
    "Halo": "Halo (franquicia)",
    "Kirby": "Kirby (personaje)",
    "Candy Crush": "Candy Crush Saga",
    "Plants vs Zombies": "Plants vs. Zombies"
};

window.COLOR_SWATCHES = {
    "Rojo": "#e53935",
    "Azul": "#1e88e5",
    "Verde": "#43a047",
    "Amarillo": "#fdd835",
    "Naranja": "#fb8c00",
    "Morado": "#8e24aa",
    "Rosa": "#ec407a",
    "Negro": "#000000",
    "Blanco": "#ffffff",
    "Gris": "#9e9e9e",
    "Turquesa": "#26c6da",
    "Violeta": "#7c4dff",
    "Dorado": "#d4af37",
    "Plateado": "#c0c0c0",
    "Beige": "#f5f5dc",
    "Marfil": "#fffff0",
    "Lavanda": "#b57edc",
    "Cian": "#00bcd4"
};
