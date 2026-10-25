/**
 * INFILTRA - Game Logic v2.3.0 (Definitive Edition)
 *
 * v2.3.0: sonido con archivos (assets/sounds, Web Audio, ambiente por
 * pantalla), ayuda en ventana que abre/cierra, carta con giro,
 * temporizador circular, votos marcados, confeti y vibración.
 *
 * v2.2.0: revisión de bugs y congruencia con lo anunciado
 * ✓ Sonido real (Web Audio, sin archivos) con el botón de silencio
 * ✓ Puntos por voto tal como se anuncian (+7 / -3 por cada voto) y
 *   +5 al infiltrado también en rondas con empate
 * ✓ Configuración de sala (infiltrados, charlatanes, categorías) en
 *   state/: sobrevive a F5 y a cambios de host
 * ✓ Quien entra con la partida empezada espera a la siguiente
 * ✓ Nombres escapados (sin inyección de HTML entre jugadores)
 * ✓ Desconexiones actualizan roles y pueden terminar la partida
 *
 * v2.1.0: base de palabras ampliada — 19 categorías, 481 palabras
 * (7 categorías nuevas: Objetos, Lugares, Naturaleza, Tecnología,
 * Dibujos Animados, Bebidas, Videojuegos).
 *
 * Base: Firebase RTDB Edition (estado de sala en rooms/{CODIGO},
 * onValue para sync, onDisconnect para presencia, QR dinámico,
 * palabra falsa del charlatán de la misma categoría).
 *
 * Portado de v1.1.0 "Robust Edition" y adaptado al modelo RTDB:
 * ✓ Transferencia de host manual (long-press 800ms) y automática,
 *   ambas con runTransaction sobre state/hostId
 * ✓ Reconexión tras F5: sesión mínima en sessionStorage + estado
 *   completo desde RTDB (restoreScreenForPhase/restoreRoleScreen)
 * ✓ Timers universales anclados a timestamp de servidor
 *   (.info/serverTimeOffset), resistentes a pantalla apagada
 * ✓ Botón post-empate con TIE_BUTTON_DELAY
 * ✓ Overlay "contando votos" y validación de configuración de roles
 * ✓ Controles de host en modo espectador
 *
 * Nuevo en v2.0.0:
 * ✓ Conteo de votos idempotente + lectura final autoritativa
 * ✓ Creación de sala atómica (transaction crear-si-no-existe)
 * ✓ Gracia de desconexión (10s) y de reclamo de host (8s)
 * ✓ El consenso distribuido de v1.1.0 se elimina: RTDB es la única
 *   fuente de verdad (el host calcula sobre el nodo votes/ y publica
 *   en state/; ver tallyVotes/publishResults)
 */

const ICONS = {
    citizen: 'assets/icons/icon-citizen.png',
    impostor: 'assets/icons/icon-impostor.png',
    charlatan: 'assets/icons/icon-charlatan.png',
    help: 'assets/icons/icon-help.png',
    kick: 'assets/icons/icon-kick.png',
    active: 'assets/icons/icon-active.png',
    eliminated: 'assets/icons/icon-eliminated.png',
    voted: 'assets/icons/icon-voted.png',
    pending: 'assets/icons/icon-pending.png',
    tie: 'assets/icons/icon-tie.png',
    celebrate: 'assets/icons/icon-celebrate.png',
    medalGold: 'assets/icons/icon-medal-gold.png',
    medalSilver: 'assets/icons/icon-medal-silver.png',
    medalBronze: 'assets/icons/icon-medal-bronze.png',
    soundOn: 'assets/icons/icon-sound-on.png',
    soundOff: 'assets/icons/icon-sound-off.png',
    play: 'assets/icons/icon-play.png'
};

const POINTS = {
    CITIZEN_SURVIVE: 15,
    CITIZEN_CORRECT_VOTE: 7,
    CITIZEN_WRONG_VOTE: -3,
    IMPOSTOR_WIN: 30,
    IMPOSTOR_SURVIVE_ROUND: 5,
    CHARLATAN_SURVIVE: 25
};

const DB = {
    "Animales": ["León", "Tigre", "Elefante", "Zebra", "Delfín", "Lobo", "Gorila", "Águila", "Jirafa", "Oso", "Zorro", "Panda", "Tiburón", "Canguro", "Hipopótamo", "Serpiente", "Cocodrilo", "Pájaro", "Mono", "Tortuga", "Pingüino", "Camello", "Murciélago", "Pulpo", "Ballena", "Caballo", "Conejo", "Ardilla", "Flamenco", "Erizo", "Koala", "Búho"],
    "Comida": ["Pizza", "Tacos", "Sushi", "Hamburguesa", "Pasta", "Ensalada", "Helado", "Pollo", "Pescado", "Chocolate", "Empanadas", "Ramen", "Curry", "Paella", "Burrito", "Croissant", "Queso", "Arroz", "Sopa", "Tarta", "Ceviche", "Lasaña", "Quesadilla", "Hot dog", "Donas", "Galletas", "Pozole", "Mole", "Tamales", "Elote", "Cereal", "Sándwich"],
    "Países": ["México", "Japón", "Brasil", "España", "Francia", "Italia", "Alemania", "Australia", "Argentina", "Canadá", "China", "India", "Rusia", "Estados Unidos", "Reino Unido", "Sudáfrica", "Egipto", "Nueva Zelanda", "Corea del Sur", "Turquía", "Perú", "Chile", "Colombia", "Cuba", "Grecia", "Suiza", "Suecia", "Noruega", "Portugal", "Marruecos", "Tailandia", "Vietnam"],
    "Profesiones": ["Médico", "Abogado", "Ingeniero", "Profesor", "Chef", "Piloto", "Arquitecto", "Programador", "Fotógrafo", "Enfermero", "Diseñador", "Periodista", "Músico", "Actor", "Científico", "Veterinario", "Contador", "Psicólogo", "Bombero", "Policía", "Dentista", "Carpintero", "Electricista", "Plomero", "Astronauta", "Granjero", "Peluquero", "Taxista", "Mesero", "Juez", "Panadero", "Cartero"],
    "Deportes": ["Fútbol", "Baloncesto", "Tenis", "Natación", "Boxeo", "Golf", "Voleibol", "Surf", "Ciclismo", "Atletismo", "Esquí", "Karate", "Béisbol", "Rugby", "Gimnasia", "Escalada", "Patinaje", "Hockey", "Ajedrez", "Ping pong", "Bádminton", "Esgrima", "Judo", "Taekwondo", "Lucha libre", "Parkour", "Skate", "Buceo", "Cricket", "Remo"],
    "Ciudades": ["París", "Tokio", "Nueva York", "Londres", "Roma", "Berlín", "Madrid", "Dubai", "Barcelona", "México DF", "Sídney", "Río de Janeiro", "Los Ángeles", "Toronto", "Estambul", "Singapur", "Ámsterdam", "Seúl", "Cancún", "Guadalajara", "Monterrey", "Miami", "Chicago", "Buenos Aires", "Lima", "Bogotá", "Praga", "Viena", "Atenas", "El Cairo"],
    "Frutas": ["Manzana", "Banana", "Naranja", "Uva", "Fresa", "Piña", "Mango", "Sandía", "Kiwi", "Melón", "Pera", "Durazno", "Cereza", "Limón", "Papaya", "Granada", "Coco", "Mora", "Guayaba", "Maracuyá", "Higo", "Ciruela", "Mandarina", "Toronja", "Mamey", "Guanábana", "Tuna", "Frambuesa"],
    "Vehículos": ["Coche", "Bicicleta", "Avión", "Barco", "Tren", "Helicóptero", "Motocicleta", "Camión", "Submarino", "Cohete", "Autobús", "Patineta", "Tractor", "Yate", "Ambulancia", "Metro", "Tranvía", "Globo aerostático", "Camioneta", "Grúa", "Limusina", "Carruaje", "Kayak", "Trineo"],
    "Instrumentos": ["Guitarra", "Piano", "Batería", "Violín", "Flauta", "Trompeta", "Saxofón", "Arpa", "Bajo", "Ukelele", "Acordeón", "Cello", "Clarinete", "Órgano", "Tambor", "Maracas", "Pandereta", "Xilófono", "Armónica", "Gaita", "Banjo", "Marimba", "Trombón", "Castañuelas"],
    "Películas": ["Titanic", "Star Wars", "Avatar", "Frozen", "Shrek", "Avengers", "Coco", "Inception", "The Matrix", "Jurassic Park", "Harry Potter", "Toy Story", "Los Increíbles", "Up", "Ratatouille", "Buscando a Nemo", "El Rey León", "Piratas del Caribe", "Volver al Futuro", "E.T.", "Moana", "Encanto", "Intensamente", "Kung Fu Panda", "Madagascar", "Cars"],
    "Colores": ["Rojo", "Azul", "Verde", "Amarillo", "Naranja", "Morado", "Rosa", "Negro", "Blanco", "Gris", "Turquesa", "Violeta", "Dorado", "Plateado", "Beige", "Marfil", "Lavanda", "Cian"],
    "Superhéroes": ["Superman", "Batman", "Spider-Man", "Wonder Woman", "Iron Man", "Captain America", "Thor", "Hulk", "Flash", "Aquaman", "Wolverine", "Deadpool", "Doctor Strange", "Pantera Negra", "Ant-Man", "Shazam", "Robin", "Linterna Verde", "Groot", "Capitana Marvel"],
    "Objetos": ["Silla", "Espejo", "Reloj", "Paraguas", "Tijeras", "Almohada", "Escalera", "Martillo", "Cepillo de dientes", "Llaves", "Mochila", "Linterna", "Vela", "Peine", "Cuchara", "Escoba", "Ventilador", "Candado", "Maleta", "Lápiz", "Libreta", "Taza", "Sartén", "Control remoto"],
    "Lugares": ["Playa", "Hospital", "Biblioteca", "Cine", "Supermercado", "Museo", "Aeropuerto", "Gimnasio", "Castillo", "Granja", "Desierto", "Selva", "Cueva", "Faro", "Estadio", "Circo", "Zoológico", "Escuela", "Oficina", "Panadería", "Parque de diversiones", "Iglesia", "Mercado"],
    "Naturaleza": ["Montaña", "Río", "Cascada", "Arcoíris", "Tormenta", "Nube", "Luna", "Sol", "Estrella", "Bosque", "Isla", "Nieve", "Rayo", "Terremoto", "Glaciar", "Pantano", "Duna", "Coral", "Marea", "Volcán", "Aurora boreal", "Eclipse", "Cometa", "Manantial"],
    "Tecnología": ["Celular", "Computadora", "Audífonos", "Dron", "Robot", "Impresora", "Tablet", "Cargador", "Wifi", "Batería portátil", "Pantalla", "Teclado", "Cámara", "Consola", "Memoria USB", "Satélite", "Antena", "Micrófono", "Bocina", "Router", "Videollamada", "Smartwatch"],
    "Dibujos Animados": ["Bob Esponja", "Homero Simpson", "Goku", "Pikachu", "Doraemon", "Tom y Jerry", "Scooby-Doo", "Los Pitufos", "Mickey Mouse", "Bugs Bunny", "Garfield", "Popeye", "Dora la Exploradora", "Phineas y Ferb", "Gumball", "Naruto", "Minions", "Pato Donald", "Snoopy", "Winnie Pooh", "Peppa Pig", "Hora de Aventura"],
    "Bebidas": ["Café", "Leche", "Jugo de naranja", "Limonada", "Horchata", "Agua mineral", "Refresco", "Malteada", "Smoothie", "Té helado", "Chocolate caliente", "Atole", "Ponche", "Agua de coco", "Capuchino", "Frappé", "Té verde", "Agua de jamaica"],
    "Videojuegos": ["Mario Bros", "Zelda", "Minecraft", "Fortnite", "Pokémon", "Tetris", "Pac-Man", "Sonic", "FIFA", "Among Us", "Roblox", "Kirby", "Halo", "Angry Birds", "Candy Crush", "Mario Kart", "Animal Crossing", "Just Dance", "Plants vs Zombies", "Street Fighter"]
};

const AVATARS = [
    { id: 'avatar-01', image: 'assets/avatars/avatar-01.png' },
    { id: 'avatar-02', image: 'assets/avatars/avatar-02.png' },
    { id: 'avatar-03', image: 'assets/avatars/avatar-03.png' },
    { id: 'avatar-04', image: 'assets/avatars/avatar-04.png' },
    { id: 'avatar-11', image: 'assets/avatars/avatar-11.png' },
    { id: 'avatar-12', image: 'assets/avatars/avatar-12.png' },
    { id: 'avatar-13', image: 'assets/avatars/avatar-13.png' },
    { id: 'avatar-14', image: 'assets/avatars/avatar-14.png' }
];

const FRAMES = [
    { id: 'fr-none', color: 'transparent', name: 'Sin Marco', locked: false },
    { id: 'fr-silver', color: '#a8b5c4', name: 'Plata', locked: false },
    { id: 'fr-gold', color: '#f4c542', name: 'Oro', locked: false },
    { id: 'fr-bronze', color: '#cd7f32', name: 'Bronce', locked: false },
    { id: 'fr-ruby', color: '#e63946', name: 'Rubí', locked: false },
    { id: 'fr-emerald', color: '#2ecc71', name: 'Esmeralda', locked: false },
    { id: 'fr-sapphire', color: '#3498db', name: 'Zafiro', locked: false },
    { id: 'fr-amethyst', color: '#9b59b6', name: 'Amatista', locked: false },
    { id: 'fr-obsidian', color: '#2c3e50', name: 'Obsidiana', locked: false },
    { id: 'fr-flame', color: '#ff6b35', name: 'Llama', locked: false }
];

const RESULT_DISPLAY_TIME = 5000;
const ROUND_START_DISPLAY_TIME = 3500;
const TIE_BUTTON_DELAY = 2500; // botón post-empate aparece antes (v1.1.0)

// ── Firebase Config ──────────────────────────────────────────────
const firebaseConfig = {
    apiKey: "AIzaSyBWFKZMjIBKbUD45vSMBxlqVp7Dd36FzsM",
    authDomain: "infiltra-5ff66.firebaseapp.com",
    databaseURL: "https://infiltra-5ff66-default-rtdb.firebaseio.com",
    projectId: "infiltra-5ff66",
    storageBucket: "infiltra-5ff66.firebasestorage.app",
    messagingSenderId: "49008737043",
    appId: "1:49008737043:web:1b8716c6ffd57ad14238e6",
    measurementId: "G-QVV2GJJD5M"
};

// ── Game State ───────────────────────────────────────────────────
let G = {
    db: null,              // Firebase Database instance
    dbListeners: [],       // Active listeners for cleanup
    votesListenerAttached: false, // evita doble registro al heredar host
    claimingHost: false,   // transaction de reclamo de host en curso
    reconnecting: false,   // restaurando sesión tras F5/reapertura
    offlineTimers: {},     // gracia antes de eliminar a un desconectado
    hostClaimTimer: null,  // gracia antes de reclamar host caído
    channel: null,
    myId: null,
    playerName: '',
    avatar: 'avatar-01',
    frame: 'fr-none',
    isHost: false,
    hostId: null,
    maxPlayers: 10,
    roundTime: 60,
    numImpostors: 1,       // config de sala; se sincroniza desde state/
    numCharlatans: 0,
    selectedCategories: Object.keys(DB),
    players: {},
    activePlayers: [],
    eliminated: [],
    impostors: [],
    charlatans: [],
    citizens: [],
    myRole: null,
    fullRoles: {},
    trueRoles: {},
    scores: {},
    usedWords: [],
    currentCategory: null,
    currentSecretWord: null,
    currentFakeWord: null,
    starterPlayerId: null,
    gamePhase: 'home',
    prevPhase: null,           // track prev phase for transitions
    rolesVersion: 0,           // detect skip_word without phase change
    resultsPublished: false,   // prevent double publish
    gameOverPublished: false,  // evita sumar puntos finales dos veces
    waitingNextGame: false,    // llegó con la partida empezada (sin rol)
    isSpectator: false,
    votes: {},
    votedPlayers: new Set(),
    voteTargets: {},
    hasVotedThisRound: false,
    wordImageCache: {},    // palabra → URL de miniatura (o null)
    serverTimeOffset: 0,   // corrección de reloj vía .info/serverTimeOffset
    roundEndTime: null,    // timestamp (servidor) de fin de ronda
    voteEndTime: null,     // timestamp (servidor) de cierre de votación
    timerInterval: null,
    voteTimerInterval: null,
    voteTimeout: null,
    spectatorTimerInterval: null,
    soundEnabled: true,
    roleRevealed: false,
    isFirstRound: true,
    roundStarting: false
};

document.addEventListener('DOMContentLoaded', init);

// Escapa texto que viene de otros jugadores (nombres) antes de
// insertarlo con innerHTML.
function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
}

function roleClassOf(role) {
    return role === 'INFILTRADO' ? 'impostor' : role === 'CHARLATÁN' ? 'charlatan' : 'citizen';
}

// Ícono local según el rol (no se toma la ruta que viene del estado)
function roleIconOf(role) { return ICONS[roleClassOf(role)]; }

// Rol verdadero (el charlatán cree ser ciudadano, pero espectadores y
// pantalla final deben ver CHARLATÁN).
function trueRoleOf(id) {
    return (G.trueRoles && G.trueRoles[id]) || (G.fullRoles[id] && G.fullRoles[id].role) || '';
}

// ── Sonido (v2.3.0) ──────────────────────────────────────────────
// Efectos y ambientes en assets/sounds/*.mp3 reproducidos con Web
// Audio (mezcla, volumen y loops sin corte). Si un archivo no carga,
// suena un tono sintetizado de respaldo. El contexto se crea en el
// primer toque, como exigen los navegadores móviles; el silencio se
// guarda en localStorage.
const SOUND_FILES = {
    click: 'ui_click', whoosh: 'ui_whoosh', join: 'join', reveal: 'reveal',
    start: 'round_start', tick: 'tick', timeup: 'timeup', voting: 'voting',
    vote: 'vote', eliminated: 'eliminated', tie: 'tie', win: 'win', lose: 'lose',
    lobby: 'ambient_lobby', tension: 'ambient_tension'
};
const SOUND_VOLUME = { click: 0.35, tick: 0.6, whoosh: 0.5, join: 0.6 };
const AMBIENT_VOLUME = 0.22;
const SYNTH_FALLBACK = {
    click:      [[900, 0.03]],
    whoosh:     [[500, 0.08]],
    join:       [[988, 0.1], [1319, 0.15]],
    reveal:     [[523, 0.08], [784, 0.14]],
    start:      [[392, 0.1], [523, 0.1], [659, 0.18]],
    tick:       [[880, 0.05]],
    timeup:     [[660, 0.15], [440, 0.25]],
    voting:     [[440, 0.08], [554, 0.12]],
    vote:       [[700, 0.06]],
    tie:        [[440, 0.12], [440, 0.12]],
    eliminated: [[330, 0.15], [247, 0.3]],
    win:        [[523, 0.1], [659, 0.1], [784, 0.1], [1047, 0.3]],
    lose:       [[392, 0.18], [330, 0.18], [262, 0.4]]
};
let audioCtx = null;
let masterGain = null;
const soundBuffers = {};
let soundsRequested = false;
const ambient = { wanted: null, name: null, src: null, gain: null };

function unlockAudio() {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    try {
        if (!audioCtx) {
            audioCtx = new Ctx();
            masterGain = audioCtx.createGain();
            masterGain.gain.value = G.soundEnabled ? 1 : 0;
            masterGain.connect(audioCtx.destination);
            maybeShowSilentHint();
        }
        if (audioCtx.state === 'suspended') {
            const p = audioCtx.resume();
            if (p && p.then) p.then(applyAmbient).catch(function() {});
        }
        loadSounds();
        applyAmbient();
    } catch (e) { audioCtx = null; }
}

// Descarga y decodifica todos los sonidos una sola vez (≈0.9 MB)
function loadSounds() {
    if (soundsRequested || !audioCtx || typeof fetch === 'undefined') return;
    soundsRequested = true;
    Object.keys(SOUND_FILES).forEach(function(name) {
        fetch('assets/sounds/' + SOUND_FILES[name] + '.mp3?v=2.3.0')
            .then(function(r) { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
            .then(function(data) {
                // Safari antiguo solo acepta la forma con callbacks
                return new Promise(function(ok, fail) { audioCtx.decodeAudioData(data, ok, fail); });
            })
            .then(function(buf) {
                soundBuffers[name] = buf;
                if (name === ambient.wanted) applyAmbient();
            })
            .catch(function() { /* queda el tono de respaldo */ });
    });
}

function playSound(name) {
    // Con el contexto suspendido el reloj está congelado: los sonidos se
    // acumularían y sonarían todos juntos al reanudarse.
    if (!G.soundEnabled || !audioCtx || audioCtx.state !== 'running') return;
    try {
        const buf = soundBuffers[name];
        if (buf) {
            const src = audioCtx.createBufferSource();
            const gain = audioCtx.createGain();
            src.buffer = buf;
            gain.gain.value = SOUND_VOLUME[name] || 0.9;
            src.connect(gain);
            gain.connect(masterGain);
            src.start();
            return;
        }
        playSynth(name);
    } catch (e) { /* sin sonido no rompe el juego */ }
}

function playSynth(name) {
    if (!SYNTH_FALLBACK[name]) return;
    let t = audioCtx.currentTime;
    SYNTH_FALLBACK[name].forEach(function(note) {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = note[0];
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.18, t + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + note[1]);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(t);
        osc.stop(t + note[1] + 0.02);
        t += note[1] * 0.9;
    });
}

// Ambiente de fondo en loop según la pantalla; cambia con fundido.
function setAmbient(name) {
    ambient.wanted = name || null;
    applyAmbient();
}

function applyAmbient() {
    if (!audioCtx || audioCtx.state !== 'running') return;
    const want = G.soundEnabled ? ambient.wanted : null;
    if (want === ambient.name && (!want || ambient.src)) return;
    const now = audioCtx.currentTime;
    if (ambient.src) {
        const oldSrc = ambient.src, oldGain = ambient.gain;
        oldGain.gain.cancelScheduledValues(now);
        oldGain.gain.setValueAtTime(oldGain.gain.value, now);
        oldGain.gain.linearRampToValueAtTime(0, now + 1.2);
        setTimeout(function() { try { oldSrc.stop(); } catch (e) {} }, 1400);
        ambient.src = null; ambient.gain = null;
    }
    ambient.name = want;
    if (!want || !soundBuffers[want]) return; // se aplica al terminar de cargar
    try {
        const src = audioCtx.createBufferSource();
        const gain = audioCtx.createGain();
        src.buffer = soundBuffers[want];
        src.loop = true;
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(AMBIENT_VOLUME, now + 1.5);
        src.connect(gain);
        gain.connect(masterGain);
        src.start();
        ambient.src = src; ambient.gain = gain;
    } catch (e) {}
}

// Ambiente por pantalla: sala tranquila, partida tensa, final sin fondo
function ambientForScreen(id) {
    if (id === 'screen-gameover') return null;
    if (id === 'screen-home' || id === 'screen-config' || id === 'screen-lobby') return 'lobby';
    return 'tension';
}

// En iPhone/iPad el interruptor de silencio apaga el audio web: se avisa
// una vez para que nadie piense que el juego no tiene sonido.
function maybeShowSilentHint() {
    const ios = /iP(hone|ad|od)/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (!ios || !G.soundEnabled) return;
    try {
        if (sessionStorage.getItem('infiltra_silent_hint')) return;
        sessionStorage.setItem('infiltra_silent_hint', '1');
    } catch (e) {}
    setTimeout(function() { toast('¿Sin sonido? Quita el modo silencio del iPhone', 'info'); }, 600);
}

function vibrate(pattern) {
    try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) {}
}

function updateSoundButton() {
    const btn = document.getElementById('btn-sound');
    if (!btn) return;
    const img = btn.querySelector('img');
    if (img) img.src = G.soundEnabled ? ICONS.soundOn : ICONS.soundOff;
    btn.classList.toggle('muted', !G.soundEnabled);
}

// ── Persistencia de sesión (reconexión tras F5) ──────────────────
// RTDB reenvía el estado completo de la sala al re-suscribirse, así
// que basta con persistir la identidad local mínima; el resto se
// deriva de rooms/{code}/state al llegar el primer snapshot.
function saveSession() {
    if (!G.channel) return;
    try {
        sessionStorage.setItem('infiltra_session', JSON.stringify({
            channel: G.channel,
            isSpectator: G.isSpectator,
            roleRevealed: G.roleRevealed,
            gamePhase: G.gamePhase,
            timestamp: Date.now()
        }));
    } catch (e) { console.error('Error guardando sesión:', e); }
}

function loadSession() {
    try {
        const raw = sessionStorage.getItem('infiltra_session');
        if (!raw) return null;
        const s = JSON.parse(raw);
        if (!s.channel || Date.now() - s.timestamp > 3600000) { clearSession(); return null; }
        return s;
    } catch (e) { return null; }
}

function clearSession() { sessionStorage.removeItem('infiltra_session'); }

// Protección de refresh (v1.1.0): pull-to-refresh, F5/Ctrl+R en
// partida, aviso beforeunload y resincronización de timers al volver.
function setupRefreshProtection() {
    let lastTouchY = 0, touchStartTime = 0;
    document.addEventListener('touchstart', function(e) {
        if (e.touches.length !== 1) return;
        lastTouchY = e.touches[0].clientY;
        touchStartTime = Date.now();
    }, { passive: true });

    document.addEventListener('touchmove', function(e) {
        if (G.gamePhase === 'home' || window.scrollY !== 0) return;
        const deltaY = e.touches[0].clientY - lastTouchY;
        if (deltaY > 30 && Date.now() - touchStartTime > 100) e.preventDefault();
    }, { passive: false });

    document.addEventListener('keydown', function(e) {
        if (G.gamePhase !== 'home' && G.gamePhase !== 'lobby' && !G.waitingNextGame && (e.key === 'F5' || (e.ctrlKey && e.key === 'r'))) {
            e.preventDefault();
            toast('Actualizar deshabilitado durante el juego', 'warning');
        }
    });

    window.addEventListener('beforeunload', function(e) {
        if (G.gamePhase !== 'home' && G.channel) { e.preventDefault(); e.returnValue = '¿Seguro?'; return e.returnValue; }
    });

    // Firebase se reconecta solo; aquí solo resincronizamos los timers
    // contra sus anclas de servidor al volver a primer plano.
    document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'visible' && G.channel && G.db) {
            if (G.gamePhase === 'voting' && G.voteEndTime) updateVoteTimerFromTimestamp();
            else if (G.gamePhase === 'round' && G.roundEndTime && !G.isSpectator) startTimer();
        }
    });
}

function init() {
    G.myId = sessionStorage.getItem('infiltra_myId');
    if (!G.myId) {
        G.myId = 'P-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
        sessionStorage.setItem('infiltra_myId', G.myId);
    }
    injectDynamicStyles();
    setupRefreshProtection();
    try { G.soundEnabled = localStorage.getItem('infiltra_sound') !== 'off'; } catch (e) {}
    updateSoundButton();
    // Ambiente de la pantalla inicial (suena tras el primer toque)
    setAmbient(ambientForScreen((document.querySelector('.screen.active') || {}).id || 'screen-home'));
    // En móviles el gesto válido para el audio es touchend/click
    ['pointerdown', 'touchend', 'click', 'keydown'].forEach(function(ev) {
        document.addEventListener(ev, unlockAudio, { passive: true });
    });
    const saved = loadSession();
    if (saved && saved.gamePhase && saved.gamePhase !== 'home') {
        if (confirm('Se detectó una partida en progreso. ¿Deseas reconectarte?')) {
            loadProfile();
            G.channel      = saved.channel;
            G.isSpectator  = !!saved.isSpectator;
            G.roleRevealed = !!saved.roleRevealed;
            G.gamePhase    = 'lobby';
            G.reconnecting = true;
            initAvatars(); initFrames(); initCategories(); initParticles();
            bindEvents(); updateProfilePreview(); createPlayersSidebar();
            createSpectatorControls();
            initFirebase();
            return;
        } else { clearSession(); }
    }
    loadProfile();
    initAvatars();
    initFrames();
    initCategories();
    initParticles();
    bindEvents();
    checkURLParams();
    updateProfilePreview();
    createPlayersSidebar();
    createSpectatorControls();
}

function loadProfile() {
    const name = localStorage.getItem('infiltra_name');
    const avatar = localStorage.getItem('infiltra_avatar');
    const frame = localStorage.getItem('infiltra_frame');
    if (name) {
        document.getElementById('input-name').value = name;
        G.playerName = name;
    }
    G.avatar = (avatar && AVATARS.find(a => a.id === avatar)) ? avatar : AVATARS[0].id;
    G.frame = (frame && FRAMES.find(f => f.id === frame)) ? frame : FRAMES[0].id;
    updateProfilePreview();
    saveProfile();
}

function saveProfile() {
    localStorage.setItem('infiltra_name', G.playerName);
    localStorage.setItem('infiltra_avatar', G.avatar);
    localStorage.setItem('infiltra_frame', G.frame);
}

function updateProfilePreview() {
    const previewAvatar = document.getElementById('preview-avatar');
    const previewWrapper = document.getElementById('preview-avatar-wrapper');
    const previewName = document.getElementById('preview-name');
    if (!previewAvatar || !previewWrapper) return;
    const avatar = AVATARS.find(a => a.id === G.avatar) || AVATARS[0];
    const frame = FRAMES.find(f => f.id === G.frame);
    previewAvatar.innerHTML = '<img src="' + avatar.image + '" alt="avatar" class="hex-avatar-img">';
    if (frame && frame.color !== 'transparent') {
        previewWrapper.className = 'preview-avatar-wrapper hex-frame';
        previewWrapper.style.setProperty('--frame-color', frame.color);
    } else {
        previewWrapper.className = 'preview-avatar-wrapper hex-frame no-frame';
        previewWrapper.style.setProperty('--frame-color', 'transparent');
    }
    if (previewName) previewName.textContent = document.getElementById('input-name')?.value || 'Tu Nombre';
}

function initAvatars() {
    const grid = document.getElementById('avatar-grid');
    if (!grid) return;
    grid.innerHTML = '';
    if (!G.avatar || !AVATARS.find(a => a.id === G.avatar)) G.avatar = AVATARS[0].id;
    AVATARS.forEach(avatar => {
        const div = document.createElement('div');
        div.className = 'avatar-option hex-avatar-option' + (avatar.id === G.avatar ? ' selected' : '');
        div.innerHTML = '<img src="' + avatar.image + '" alt="' + avatar.id + '" class="hex-avatar-img"><div class="avatar-check">✓</div>';
        div.onclick = function() {
            G.avatar = avatar.id;
            grid.querySelectorAll('.avatar-option').forEach(el => el.classList.remove('selected'));
            div.classList.add('selected');
            updateProfilePreview();
            saveProfile();
        };
        grid.appendChild(div);
    });
}

function initFrames() {
    const grid = document.getElementById('frame-grid');
    if (!grid) return;
    grid.innerHTML = '';
    if (!G.frame || !FRAMES.find(f => f.id === G.frame)) G.frame = FRAMES[0].id;
    FRAMES.forEach(frame => {
        const div = document.createElement('div');
        div.className = 'frame-option-new hex-frame-option' + (frame.id === G.frame ? ' selected' : '') + (frame.locked ? ' locked' : '');
        const preview = document.createElement('div');
        preview.className = 'frame-preview hex-frame-preview';
        if (frame.color !== 'transparent') {
            preview.style.setProperty('--frame-color', frame.color);
            preview.innerHTML = '<div class="hex-frame-inner"><img src="' + ICONS.citizen + '" alt="" class="frame-preview-img"></div>';
        } else {
            preview.classList.add('no-frame');
            preview.innerHTML = '<div class="hex-frame-inner"><img src="' + ICONS.citizen + '" alt="" class="frame-preview-img"></div>';
        }
        div.appendChild(preview);
        const check = document.createElement('div');
        check.className = 'frame-check';
        check.textContent = '✓';
        div.appendChild(check);
        if (!frame.locked) {
            div.onclick = function() {
                G.frame = frame.id;
                grid.querySelectorAll('.frame-option-new').forEach(el => el.classList.remove('selected'));
                div.classList.add('selected');
                updateProfilePreview();
                saveProfile();
            };
        }
        grid.appendChild(div);
    });
}

function initCategories() {
    const list = document.getElementById('categories-list');
    if (!list) return;
    list.innerHTML = Object.keys(DB).map(cat =>
        '<div class="category-item"><input type="checkbox" id="cat-' + cat + '" value="' + cat + '" checked><label for="cat-' + cat + '">' + cat + '</label></div>'
    ).join('');
}

function updateSelectedCategories() {
    G.selectedCategories = Array.from(document.querySelectorAll('.category-item input:checked')).map(cb => cb.value);
}

// ── Role Configuration Validation (ported from v1.1.0) ───────────
// Valores de configuración leídos y acotados (3-10 jugadores, al
// menos 1 infiltrado, charlatanes >= 0).
function readRoleConfig() {
    const maxPlayers = Math.min(Math.max(parseInt(document.getElementById('config-max-players')?.value) || 10, 3), 10);
    const impostors  = Math.max(parseInt(document.getElementById('config-impostors')?.value) || 1, 1);
    const charlatans = Math.max(parseInt(document.getElementById('config-charlatans')?.value) || 0, 0);
    return { maxPlayers: maxPlayers, impostors: impostors, charlatans: charlatans };
}

// Los infiltrados ganan al igualar en número, así que deben empezar
// siendo menos que el resto: como máximo floor((n-1)/2).
function maxImpostorsFor(n) { return Math.max(1, Math.floor((n - 1) / 2)); }

function validateRoleConfiguration() {
    const cfg = readRoleConfig();
    const maxPlayers = cfg.maxPlayers;
    const impostors = cfg.impostors;
    const charlatans = cfg.charlatans;
    const specialRoles = impostors + charlatans;
    const citizens = maxPlayers - specialRoles;
    const summaryImpostors = document.getElementById('summary-impostors');
    const summaryCharlatans = document.getElementById('summary-charlatans');
    const summaryCitizens = document.getElementById('summary-citizens');
    const summaryTotal = document.getElementById('summary-total');
    const errorElement = document.getElementById('summary-error');
    const createButton = document.getElementById('btn-create-room');
    if (summaryImpostors) summaryImpostors.textContent = impostors;
    if (summaryCharlatans) summaryCharlatans.textContent = charlatans;
    if (summaryCitizens) summaryCitizens.textContent = Math.max(0, citizens);
    if (summaryTotal) summaryTotal.textContent = maxPlayers;
    const blockError = specialRoles >= maxPlayers ? '❌ Debe haber al menos 1 ciudadano'
        : impostors > maxImpostorsFor(maxPlayers) ? '❌ Con ' + maxPlayers + ' jugadores el máximo es ' + maxImpostorsFor(maxPlayers) + ' infiltrado(s)'
        : null;
    if (blockError) {
        if (errorElement) { errorElement.textContent = blockError; errorElement.style.display = 'block'; errorElement.style.color = '#ff4757'; }
        if (createButton) { createButton.disabled = true; createButton.style.opacity = '0.5'; }
        return false;
    }
    if (citizens === 1) {
        if (errorElement) { errorElement.textContent = '⚠️ Se recomienda al menos 2 ciudadanos'; errorElement.style.display = 'block'; errorElement.style.color = '#ffa502'; }
    } else { if (errorElement) errorElement.style.display = 'none'; }
    if (createButton) { createButton.disabled = false; createButton.style.opacity = '1'; }
    return true;
}

function initParticles() {
    const container = document.getElementById('particles');
    if (!container) return;
    for (let i = 0; i < 40; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        p.style.left = Math.random() * 100 + '%';
        p.style.top = Math.random() * 100 + '%';
        p.style.animationDelay = Math.random() * 5 + 's';
        container.appendChild(p);
    }
}

// Estilos dinámicos (v1.1.0): overlay de conteo de votos, long-press
// y menú de transferencia de host.
function injectDynamicStyles() {
    if (document.getElementById('dynamic-styles-v2')) return;
    const style = document.createElement('style');
    style.id = 'dynamic-styles-v2';
    style.textContent = '.role-word-image{margin:10px auto 0;display:none;text-align:center}.role-word-image .word-image{max-width:180px;max-height:120px;border-radius:10px;object-fit:cover;box-shadow:0 4px 12px rgba(0,0,0,.4)}.word-color-swatch{width:120px;height:60px;border-radius:10px;margin:0 auto;border:2px solid rgba(255,255,255,.25)}html,body{overscroll-behavior-y:contain}.player-item.long-press-active{background:rgba(255,255,255,0.1);transform:scale(0.98)}.host-transfer-menu{position:fixed;bottom:0;left:0;right:0;background:#1a1a2e;border-top:2px solid #4a4a6a;padding:20px;z-index:1000;animation:slideUp .3s ease}@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}.host-transfer-menu h3{margin:0 0 15px;color:#fff;text-align:center}.host-transfer-btn{width:100%;padding:12px;margin:5px 0;background:#2d2d4a;border:none;border-radius:8px;color:#fff;font-size:16px;cursor:pointer}.host-transfer-btn:hover{background:#3d3d5a}.host-transfer-btn.cancel{background:#4a2d2d}.counting-votes-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;z-index:999}.counting-votes-message{text-align:center;color:#fff}.counting-votes-message h2{font-size:28px}';
    document.head.appendChild(style);
}

function createPlayersSidebar() {
    if (document.getElementById('players-sidebar')) return;
    const sidebar = document.createElement('div');
    sidebar.id = 'players-sidebar';
    sidebar.className = 'players-sidebar';
    sidebar.innerHTML = '<div class="players-sidebar-title">Jugadores</div><div class="players-sidebar-list" id="sidebar-players-list"></div>';
    document.body.appendChild(sidebar);
}

// ── Controles de host en modo espectador (v1.1.0) ────────────────
// Un host eliminado sigue dirigiendo la partida desde la pantalla de
// espectador: siguiente ronda, cambiar palabra y volver al lobby.
function createSpectatorControls() {
    const spectatorScreen = document.getElementById('screen-spectator');
    if (!spectatorScreen || document.getElementById('btn-spectator-skip')) return;
    const skipBtn = document.createElement('button');
    skipBtn.id = 'btn-spectator-skip';
    skipBtn.className = 'btn btn-secondary';
    skipBtn.textContent = 'Cambiar Palabra';
    skipBtn.style.display = 'none';
    skipBtn.onclick = skipWord;
    // Va junto a "Siguiente Ronda", en el mismo grupo de botones
    const nextBtn = document.getElementById('btn-spectator-next');
    if (nextBtn && nextBtn.parentNode) nextBtn.parentNode.insertBefore(skipBtn, nextBtn);
}

function updateSpectatorHostControls() {
    const btnNext = document.getElementById('btn-spectator-next');
    const btnLobby = document.getElementById('btn-spectator-lobby');
    const btnSkip = document.getElementById('btn-spectator-skip');
    if (G.isHost && G.isSpectator) {
        // Solo hay acción de host entre rondas: con la ronda o la
        // votación en curso, "Siguiente/Iniciar" las cortaría a medias.
        const canAdvance = G.gamePhase === 'roles' || G.gamePhase === 'results';
        if (btnNext) {
            btnNext.style.display = canAdvance ? 'block' : 'none';
            btnNext.disabled = false;
            btnNext.textContent = G.gamePhase === 'roles' ? 'Iniciar Ronda' : 'Siguiente Ronda';
        }
        if (btnLobby) btnLobby.style.display = 'block';
        if (btnSkip) btnSkip.style.display = G.gamePhase === 'roles' ? 'block' : 'none';
    } else {
        if (btnNext) btnNext.style.display = 'none';
        if (btnLobby) btnLobby.style.display = 'none';
        if (btnSkip) btnSkip.style.display = 'none';
    }
}

function updateRolePlayersList() {
    const list = document.getElementById('role-players-list');
    if (!list) return;
    const allPlayerIds = G.activePlayers.length > 0 ? G.activePlayers : Object.keys(G.players);
    list.innerHTML = allPlayerIds.map(id => {
        const p = G.players[id];
        const isEliminated = G.eliminated.includes(id);
        const isMe = id === G.myId;
        return '<div class="role-player-item' + (isEliminated ? ' eliminated' : '') + (isMe ? ' is-me' : '') + '">' +
            '<div class="role-player-avatar">' + renderHexAvatar(id, 32) + '</div>' +
            '<span class="role-player-name">' + esc(p?.name || id.substring(0, 8)) + (isMe ? ' (Tú)' : '') + '</span>' +
            '</div>';
    }).join('');
}

function updatePlayersSidebar() {
    const list = document.getElementById('sidebar-players-list');
    const sidebar = document.getElementById('players-sidebar');
    if (!list || !sidebar) return;
    // En partida, solo quienes juegan esta partida (no quien espera)
    const roleIds = Object.keys(G.fullRoles || {});
    const allPlayerIds = roleIds.length > 0 ? roleIds : Object.keys(G.players);
    list.innerHTML = allPlayerIds.map(id => {
        const p = G.players[id];
        const isEliminated = G.eliminated.includes(id);
        return '<div class="sidebar-player' + (isEliminated ? ' eliminated' : '') + '">' +
            '<div class="sidebar-player-avatar">' + renderHexAvatar(id, 28) + '</div>' +
            '<span class="sidebar-player-name">' + esc(p?.name || id.substring(0, 8)) + '</span></div>';
    }).join('');
}

function showPlayersSidebar() {
    const sidebar = document.getElementById('players-sidebar');
    if (sidebar && window.innerWidth > 768) {
        updatePlayersSidebar();
        sidebar.classList.add('visible');
    }
}

function hidePlayersSidebar() {
    const sidebar = document.getElementById('players-sidebar');
    if (sidebar) sidebar.classList.remove('visible');
}

function bindEvents() {
    const bind = (id, fn) => {
        const el = document.getElementById(id);
        if (el) el.onclick = fn;
    };
    bind('btn-show-config', showConfig);
    bind('btn-back-home', function() { showScreen('screen-home'); });
    bind('btn-join-room', joinRoom);
    bind('btn-create-room', createRoom);
    bind('btn-leave-room', leaveRoom);
    bind('btn-distribute', distributeRoles);
    bind('btn-start-round', startRound);
    bind('btn-skip-word', skipWord);
    bind('btn-next-round', nextRound);
    bind('btn-back-lobby', backToLobby);
    bind('btn-back-to-lobby', backToLobby);
    bind('btn-exit-game', exitGame);
    bind('btn-spectator-next', spectatorNextAction);
    bind('btn-spectator-lobby', backToLobby);
    bind('role-card', revealRole);
    bind('btn-leave-role', leaveRoom);
    bind('btn-leave-voting', leaveRoom);
    bind('btn-leave-results', leaveRoom);
    bind('btn-leave-spectator', leaveRoom);
    bind('btn-cat-all', function() {
        document.querySelectorAll('.category-item input').forEach(cb => cb.checked = true);
        updateSelectedCategories();
    });
    bind('btn-cat-none', function() {
        document.querySelectorAll('.category-item input').forEach(cb => cb.checked = false);
        updateSelectedCategories();
    });
    bind('btn-sound', function() {
        G.soundEnabled = !G.soundEnabled;
        try { localStorage.setItem('infiltra_sound', G.soundEnabled ? 'on' : 'off'); } catch (e) {}
        if (masterGain) masterGain.gain.value = G.soundEnabled ? 1 : 0;
        updateSoundButton();
        unlockAudio();
        applyAmbient();
        playSound('click');
    });
    // Ayuda: el mismo botón abre y cierra la ventana
    bind('btn-help', function() { toggleHelp(); });
    const helpModal = document.getElementById('help-modal');
    if (helpModal) helpModal.querySelectorAll('[data-close]').forEach(function(el) {
        el.addEventListener('click', function() { toggleHelp(false); });
    });
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') toggleHelp(false);
    });
    // Clic de interfaz en botones y selecciones (los que tienen sonido
    // propio, como votar o revelar, no lo duplican)
    document.addEventListener('click', function(e) {
        const el = e.target.closest && e.target.closest('button, .avatar-option, .frame-option-new, .category-item');
        if (!el || el.disabled || el.id === 'btn-sound' || el.id === 'btn-help' || el.hasAttribute('data-close') ||
            el.classList.contains('btn-vote')) return;
        unlockAudio();
        playSound('click');
    });
    const maxPlayersInput = document.getElementById('config-max-players');
    const impostorsInput = document.getElementById('config-impostors');
    const charlatansInput = document.getElementById('config-charlatans');
    if (maxPlayersInput) maxPlayersInput.addEventListener('input', function() {
        const cfg = readRoleConfig();
        if (impostorsInput) impostorsInput.max = maxImpostorsFor(cfg.maxPlayers);
        if (charlatansInput) charlatansInput.max = Math.max(0, cfg.maxPlayers - cfg.impostors - 1);
        validateRoleConfiguration();
    });
    if (impostorsInput) impostorsInput.addEventListener('input', function() {
        const cfg = readRoleConfig();
        if (charlatansInput) charlatansInput.max = Math.max(0, cfg.maxPlayers - cfg.impostors - 1);
        validateRoleConfiguration();
    });
    if (charlatansInput) charlatansInput.addEventListener('input', validateRoleConfiguration);
    const nameInput = document.getElementById('input-name');
    if (nameInput) nameInput.addEventListener('input', updateProfilePreview);
}

function checkURLParams() {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code') || params.get('room');
    if (code) {
        const input = document.getElementById('input-join-code');
        if (input) {
            input.value = code.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
            toast('Código detectado');
        }
    }
}

function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const screen = document.getElementById(id);
    if (screen) screen.classList.add('active');
    if (id === 'screen-voting') {
        showPlayersSidebar();
    } else {
        hidePlayersSidebar();
    }
    setAmbient(ambientForScreen(id));
}

// Ventana de ayuda (v2.3.0): se abre y cierra con el botón "?", la X,
// el fondo o Esc, sin cambiar de pantalla ni perder la partida.
function toggleHelp(force) {
    const modal = document.getElementById('help-modal');
    if (!modal) return;
    const open = typeof force === 'boolean' ? force : modal.hidden;
    if (open === !modal.hidden) return;
    modal.hidden = !open;
    document.body.classList.toggle('help-open', open);
    const btn = document.getElementById('btn-help');
    if (btn) {
        btn.classList.toggle('active', open);
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
    unlockAudio();
    playSound('whoosh');
}

function showConfig() {
    G.playerName = document.getElementById('input-name')?.value.trim() || '';
    if (!G.playerName) {
        toast('Ingresa tu nombre', 'error');
        return;
    }
    saveProfile();
    showScreen('screen-config');
    setTimeout(validateRoleConfiguration, 100);
}

// ── Room Creation / Join ─────────────────────────────────────────

function createRoom() {
    if (G.channel) return; // doble toque en "Crear Sala"
    G.playerName = document.getElementById('input-name')?.value.trim() || '';
    if (!G.playerName) { toast('Ingresa tu nombre', 'error'); return; }
    updateSelectedCategories();
    if (G.selectedCategories.length === 0) { toast('Selecciona categorías', 'error'); return; }
    if (!validateRoleConfiguration()) { toast('Revisa la distribución de roles', 'error'); return; }
    const cfg = readRoleConfig();
    G.isHost = true;
    G.hostId = G.myId;
    G.maxPlayers = cfg.maxPlayers;
    G.numImpostors = cfg.impostors;
    G.numCharlatans = cfg.charlatans;
    G.roundTime = parseInt(document.getElementById('config-time')?.value) || 60;
    G.scores = {};
    G.usedWords = [];
    G.isFirstRound = true;
    G.gamePhase = 'lobby';
    saveProfile();
    createRoomAtomic(0);
}

// Creación de sala atómica: transaction "crear si no existe" sobre
// rooms/{code}. Si el código de 4 letras ya está ocupado, se genera
// otro y se reintenta (evita pisar una sala ajena en curso).
function createRoomAtomic(attempts) {
    if (attempts >= 5) { G.channel = null; toast('No se pudo crear la sala, reintenta', 'error'); return; }
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    const db = firebase.database();
    G.channel = generateCode();
    db.ref('rooms/' + G.channel).transaction(function(current) {
        if (current !== null) return; // código ocupado → abortar
        return {
            state: {
                hostId: G.myId,
                hostOnline: true,
                maxPlayers: G.maxPlayers,
                roundTime: G.roundTime,
                // Config en el estado: un host heredado o recargado
                // reparte con la misma configuración que el creador.
                impostorCount: G.numImpostors,
                charlatanCount: G.numCharlatans,
                categories: G.selectedCategories,
                gamePhase: 'lobby',
                isFirstRound: true,
                rolesVersion: 0,
                createdAt: firebase.database.ServerValue.TIMESTAMP // para limpieza de salas viejas
            }
        };
    }).then(function(res) {
        if (res.committed) {
            initFirebase();
        } else {
            createRoomAtomic(attempts + 1);
        }
    }).catch(function(e) {
        G.channel = null;
        console.error('Error creando sala:', e);
        toast('Error creando sala', 'error');
    });
}

function joinRoom() {
    G.playerName = document.getElementById('input-name')?.value.trim() || '';
    if (!G.playerName) { toast('Ingresa tu nombre', 'error'); return; }
    const code = (document.getElementById('input-join-code')?.value || '').toUpperCase().trim();
    // Solo A-Z: un código del QR/URL con . # $ [ ] haría fallar ref()
    if (!/^[A-Z]{4}$/.test(code)) { toast('Código de 4 letras', 'error'); return; }
    if (G.channel || G.joining) return; // doble toque en "Unirse"
    saveProfile();
    // Comprobar que la sala existe ANTES de escribir la presencia: así
    // un código mal tecleado no deja nodos basura en rooms/.
    G.joining = true;
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    firebase.database().ref('rooms/' + code + '/state/hostId').once('value').then(function(snap) {
        G.joining = false;
        if (!snap.val()) { toast('Sala no encontrada', 'error'); return; }
        G.isHost = false;
        G.channel = code;
        G.gamePhase = 'lobby';
        initFirebase();
    }).catch(function(e) {
        G.joining = false;
        console.error('Error buscando sala:', e);
        toast('No se pudo conectar, reintenta', 'error');
    });
}

function generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    return code;
}

// ── Firebase Init & Listeners ─────────────────────────────────────

function initFirebase() {
    clearAllTimers();
    cleanupListeners();

    // Initialize Firebase app (guard against double init)
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    G.db = firebase.database();

    const roomRef = G.db.ref('rooms/' + G.channel);

    // Write own player presence
    const myPlayerRef = roomRef.child('players/' + G.myId);
    // update + joinedAt condicional: en reconexión (F5) se conserva el
    // joinedAt original para no perder el orden de sucesión de host.
    myPlayerRef.once('value').then(function(snap) {
        const existing = snap.val();
        const data = { name: G.playerName, avatar: G.avatar, frame: G.frame, online: true };
        if (!existing || !existing.joinedAt) data.joinedAt = firebase.database.ServerValue.TIMESTAMP;
        return myPlayerRef.update(data);
    }).catch(function(e) { console.error('Error registrando jugador:', e); });
    myPlayerRef.onDisconnect().update({ online: false });

    // Attach listeners
    const stateRef   = roomRef.child('state');
    const playersRef = roomRef.child('players');
    const signalRef  = roomRef.child('signals/' + G.myId);

    const stateHandler   = onStateChange;
    const playersHandler = onPlayersChange;
    const signalHandler  = onMySignal;

    // Desfase de reloj contra el servidor de Firebase
    const offsetRef = G.db.ref('.info/serverTimeOffset');
    const offsetHandler = function(snap) { G.serverTimeOffset = snap.val() || 0; };
    offsetRef.on('value', offsetHandler);
    G.dbListeners.push({ ref: offsetRef, event: 'value', fn: offsetHandler });

    // Presencia canónica de Firebase: en CADA reconexión (incluida la
    // vuelta de una pestaña congelada por el navegador) re-publicamos
    // online:true y re-armamos onDisconnect. Sin esto, el cliente que
    // vuelve queda como fantasma offline y la sala lo trata como caído.
    const connRef = G.db.ref('.info/connected');
    const connHandler = function(snap) {
        if (snap.val() !== true || !G.db || !G.channel) return;
        const meRef = G.db.ref('rooms/' + G.channel + '/players/' + G.myId);
        meRef.update({ online: true }).catch(function() {});
        meRef.onDisconnect().update({ online: false });
        if (G.isHost) {
            const hostOnlineRef = G.db.ref('rooms/' + G.channel + '/state/hostOnline');
            hostOnlineRef.set(true).catch(function() {});
            hostOnlineRef.onDisconnect().set(false);
        }
    };
    connRef.on('value', connHandler);
    G.dbListeners.push({ ref: connRef, event: 'value', fn: connHandler });

    stateRef.on('value', stateHandler);
    playersRef.on('value', playersHandler);
    signalRef.on('value', signalHandler);

    G.dbListeners.push(
        { ref: stateRef,   event: 'value', fn: stateHandler },
        { ref: playersRef, event: 'value', fn: playersHandler },
        { ref: signalRef,  event: 'value', fn: signalHandler }
    );

    if (G.isHost) {
        // Host watches raw votes node
        attachVotesListener();
        // El estado inicial de la sala ya lo escribió createRoomAtomic().
        // Aquí solo se asume la responsabilidad del flag de presencia.
        stateRef.child('hostOnline').onDisconnect().set(false);
    }

    // Show lobby immediately
    setRoomCode(G.channel);
    showScreen('screen-lobby');
    generateQR();
    if (G.isHost) {
        document.getElementById('btn-distribute').style.display = 'block';
    }

    // Timeout if no state arrives (non-host joining nonexistent room)
    if (!G.isHost) {
        setTimeout(function() {
            if (G.gamePhase === 'lobby' && !G.hostId) {
                toast('Sala no encontrada', 'error');
                setTimeout(exitGame, 1500);
            }
        }, 6000);
    }
}

function cleanupListeners() {
    G.dbListeners.forEach(function(l) { l.ref.off(l.event, l.fn); });
    G.dbListeners = [];
    G.votesListenerAttached = false;
}

// Registro idempotente del listener de votos (solo host). Necesario
// también al RECIBIR el rol de host a mitad de partida.
function attachVotesListener() {
    if (!G.db || !G.channel || G.votesListenerAttached) return;
    const votesRef = G.db.ref('rooms/' + G.channel + '/votes');
    votesRef.on('value', onVotesChange);
    G.dbListeners.push({ ref: votesRef, event: 'value', fn: onVotesChange });
    G.votesListenerAttached = true;
}

// ── Helper: Firebase arrays ──────────────────────────────────────
// Firebase can return arrays as {0:v, 1:v} objects if keys were set as integers
function arrayFromFirebase(val) {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    // Object with numeric-ish keys → values
    return Object.values(val);
}

// ── Helper: hora de servidor ─────────────────────────────────────
// Firebase expone el desfase entre el reloj local y el del servidor.
// Todos los timers se calculan contra serverNow(), nunca contra
// Date.now() a secas, para que el cierre sea consistente entre clientes.
function serverNow() {
    return Date.now() + (G.serverTimeOffset || 0);
}

// ── Main State Listener ──────────────────────────────────────────

function onStateChange(snapshot) {
    const state = snapshot.val();
    if (!state) return; // Room not yet initialised

    const newPhase = state.gamePhase || 'lobby';
    const prevPhase = G.prevPhase;

    // Sync config
    const prevHostId = G.hostId;
    const wasIHost   = G.isHost;
    G.hostId     = state.hostId;
    G.isHost     = (G.myId === G.hostId);
    G.maxPlayers = Math.min(state.maxPlayers || 10, 10);
    G.roundTime  = state.roundTime || 60;
    G.usedWords  = arrayFromFirebase(state.usedWords);
    G.scores     = state.scores || {};
    if (state.impostorCount)  G.numImpostors  = state.impostorCount;
    if (state.charlatanCount !== undefined) G.numCharlatans = state.charlatanCount;
    if (state.categories) {
        const cats = arrayFromFirebase(state.categories).filter(function(c) { return DB[c]; });
        if (cats.length > 0) G.selectedCategories = cats;
    }

    // Cambio de host (manual o automático) detectado por estado
    if (prevHostId && state.hostId && prevHostId !== state.hostId) {
        handleHostChange(wasIHost);
    }

    // Host desconectado → sucesión automática (con gracia por si es un F5)
    if (state.hostOnline === false && !G.isHost && G.gamePhase !== 'home') {
        scheduleHostClaim();
    } else if (state.hostOnline !== false && G.hostClaimTimer) {
        clearTimeout(G.hostClaimTimer);
        G.hostClaimTimer = null;
    }

    // Llegó con la partida empezada (no tiene rol): espera en el lobby
    // a la siguiente partida en vez de ver pantallas de ronda sin rol.
    if (newPhase !== 'lobby' && !(state.roles && state.roles[G.myId])) {
        G.prevPhase     = newPhase;
        G.gamePhase     = newPhase;
        G.activePlayers = arrayFromFirebase(state.activePlayers);
        G.eliminated    = arrayFromFirebase(state.eliminated);
        G.fullRoles     = state.roles || {}; // para excluirlo de la sucesión de host
        if (!G.waitingNextGame) {
            G.waitingNextGame = true;
            G.reconnecting = false;
            setRoomCode(G.channel);
            showScreen('screen-lobby');
            setLobbyNotice('Hay una partida en curso. Entrarás en la siguiente.');
        }
        renderPlayerList();
        saveSession();
        return;
    }
    if (G.waitingNextGame) {
        G.waitingNextGame = false;
        setLobbyNotice('');
    }

    // Handle phase transitions
    if (newPhase !== prevPhase) {
        G.prevPhase  = newPhase;
        G.gamePhase  = newPhase;

        // Sync role/game arrays on any phase change
        G.isFirstRound  = state.isFirstRound !== false;
        G.activePlayers = arrayFromFirebase(state.activePlayers);
        G.eliminated    = arrayFromFirebase(state.eliminated);
        G.impostors     = arrayFromFirebase(state.impostors);
        G.charlatans    = arrayFromFirebase(state.charlatans);
        G.citizens      = arrayFromFirebase(state.citizens);
        G.fullRoles     = state.roles || {};
        G.starterPlayerId = state.starterPlayerId || null;
        // Todos guardan los roles verdaderos: un host heredado los
        // necesita para "Cambiar Palabra" (si no, el charlatán recibía
        // la palabra secreta) y los espectadores para ver al charlatán.
        if (state.trueRoles) G.trueRoles = state.trueRoles;
        // Eliminado por desconexión que vuelve sin recargar: pasa a espectador
        if (newPhase !== 'lobby' && G.eliminated.includes(G.myId) && !G.isSpectator && !G.reconnecting) {
            G.isSpectator = true;
        }
        // Si la lista de jugadores llegó antes que el estado (p. ej. tras
        // un F5 del host), los que ya estaban offline no tenían cuenta
        // atrás de eliminación: se agenda ahora que se conoce la partida.
        if (newPhase !== 'lobby' && newPhase !== 'gameover') {
            Object.keys(G.players).forEach(function(id) {
                if (G.players[id] && G.players[id].online === false) scheduleOfflineElimination(id);
            });
        }

        // Reconexión (F5): el primer snapshot trae la sala completa.
        // Restauramos rol, anclas de timers y pantalla según la fase,
        // sin pasar por los handlers de transición normales.
        if (G.reconnecting) {
            G.reconnecting = false;
            if (state.roles && state.roles[G.myId]) G.myRole = state.roles[G.myId];
            if (G.eliminated.includes(G.myId)) G.isSpectator = true;
            G.rolesVersion = state.rolesVersion || 0;
            if (newPhase === 'round' && state.roundStartedAt) {
                G.roundEndTime = state.roundStartedAt + (state.roundDuration || G.roundTime) * 1000;
            }
            if (newPhase === 'voting') {
                G.votes        = state.votes || {};
                G.votedPlayers = new Set(arrayFromFirebase(state.votedPlayers));
                G.voteTargets  = state.voteTargets || {};
                G.hasVotedThisRound = G.votedPlayers.has(G.myId);
                G.voteEndTime  = state.voteStartedAt
                    ? state.voteStartedAt + (state.voteDuration || 30) * 1000
                    : null;
            }
            if (G.isHost) becomeHost(); // era host: reasumir hostOnline y listener de votos
            setRoomCode(G.channel);
            restoreScreenForPhase(state);
            renderPlayerList();
            updatePlayersSidebar();
            saveSession();
            toast('Reconectado', 'success');
            return;
        }

        switch (newPhase) {
            case 'lobby':
                if (prevPhase !== null) {
                    handleBackToLobbyFromState(state);
                } else {
                    // First arrival — show lobby
                    setRoomCode(G.channel);
                    renderPlayerList();
                }
                break;
            case 'roles':
                G.rolesVersion = state.rolesVersion || 0;
                if (prevPhase === 'lobby' || prevPhase === null) {
                    handleAssignFromState(state);
                } else {
                    handleNextRoundFromState(state);
                }
                break;
            case 'round':
                handleStartRoundFromState(state);
                break;
            case 'voting':
                // Votación nueva: quien sea host ahora debe poder publicar
                // (un ex-host conservaba el flag de una ronda anterior).
                G.resultsPublished = false;
                G.myVoteTarget = null;
                // Reset local vote state and show voting screen
                G.votes       = state.votes || {};
                G.votedPlayers = new Set(arrayFromFirebase(state.votedPlayers));
                G.voteTargets  = state.voteTargets || {};
                G.hasVotedThisRound = G.votedPlayers.has(G.myId);
                // Ancla del timer de voto por timestamp de servidor
                G.voteEndTime = state.voteStartedAt
                    ? state.voteStartedAt + (state.voteDuration || 30) * 1000
                    : serverNow() + 30000;
                startVoting();
                break;
            case 'results':
                showResults(state.results || {});
                break;
            case 'gameover':
                handleGameOver(state.gameOver || {});
                break;
        }
        renderPlayerList();
        updatePlayersSidebar();
        saveSession();
        return;
    }

    // Same phase — check for within-phase updates
    if (newPhase === 'roles') {
        const newRolesVersion = state.rolesVersion || 0;
        if (newRolesVersion !== G.rolesVersion) {
            // Roles changed without phase change → skip_word
            G.rolesVersion  = newRolesVersion;
            G.fullRoles     = state.roles || {};
            G.starterPlayerId = state.starterPlayerId || null;
            G.usedWords     = arrayFromFirebase(state.usedWords);
            if (state.trueRoles) G.trueRoles = state.trueRoles;
            handleSkipWordFromState(state);
        }
    } else if (newPhase === 'voting') {
        // Vote-progress broadcast from host
        G.votes       = state.votes || {};
        G.votedPlayers = new Set(arrayFromFirebase(state.votedPlayers));
        G.voteTargets  = state.voteTargets || {};
        if (G.isSpectator) updateSpectatorVotes();
        // Disable vote buttons for players who have already voted
        if (G.votedPlayers.has(G.myId)) {
            G.hasVotedThisRound = true;
            document.querySelectorAll('.btn-vote').forEach(btn => btn.disabled = true);
        }
        updateVoteProgress();
    } else if (newPhase === 'lobby') {
        // Config update in lobby
        renderPlayerList();
    }

    updatePlayersSidebar();
}

// ── Players Listener ─────────────────────────────────────────────

function onPlayersChange(snapshot) {
    const playersData = snapshot.val() || {};
    const newIds = Object.keys(playersData);
    const firstSnapshot = !G.playersLoaded;
    G.playersLoaded = true;
    let someoneJoined = false;

    // Sala llena (solo host): también con la partida en curso, para que
    // quien espera la siguiente no exceda el máximo. Se cuentan solo los
    // jugadores online y se acumulan los admitidos en este mismo evento.
    if (G.isHost) {
        let count = Object.keys(G.players).filter(function(pid) { return G.players[pid] && G.players[pid].online !== false; }).length;
        newIds.forEach(function(id) {
            if (id === G.myId || G.players[id] || !playersData[id] || playersData[id].online === false) return;
            if (count >= G.maxPlayers) {
                G.db.ref('rooms/' + G.channel + '/signals/' + id).set({
                    type: 'room_full',
                    ts: firebase.database.ServerValue.TIMESTAMP
                });
            } else {
                count++;
            }
        });
    }

    if (G.gamePhase === 'lobby' || G.gamePhase === 'home') {
        // Remove players who have gone offline in lobby
        Object.keys(G.players).forEach(function(id) {
            if (!newIds.includes(id) || playersData[id]?.online === false) {
                delete G.players[id];
            }
        });
    }

    // Update player data from Firebase
    newIds.forEach(function(id) {
        const p = playersData[id];
        if (!p) return;
        if (p.online === false) {
            // Offline en partida → eliminación con periodo de gracia
            // (un F5 tarda segundos en volver; no lo tratamos como abandono)
            if (G.gamePhase !== 'lobby' && G.gamePhase !== 'home' && G.gamePhase !== 'gameover') {
                // Conservar datos (nombre, avatar) para render y sucesión,
                // aunque este cliente no lo haya visto antes online
                G.players[id] = {
                    name:   p.name   || (G.players[id] && G.players[id].name) || id.substring(0, 8),
                    avatar: p.avatar || 'avatar-01',
                    frame:  p.frame  || 'fr-none',
                    online: false,
                    joinedAt: p.joinedAt || 0
                };
                scheduleOfflineElimination(id);
            } else {
                delete G.players[id];
            }
            return;
        }
        // Volvió online → cancelar eliminación pendiente
        if (G.offlineTimers[id]) { clearTimeout(G.offlineTimers[id]); delete G.offlineTimers[id]; }
        if (!firstSnapshot && id !== G.myId && !G.players[id] && G.gamePhase === 'lobby') someoneJoined = true;
        G.players[id] = {
            name:   p.name   || id.substring(0, 8),
            avatar: p.avatar || 'avatar-01',
            frame:  p.frame  || 'fr-none',
            online: true,
            joinedAt: p.joinedAt || 0  // orden de sucesión de host
        };
        if (G.scores[id] === undefined) G.scores[id] = 0;
    });

    // Si el jugador del host aparece offline, agendar sucesión con gracia
    if (G.hostId && !G.isHost && G.players[G.hostId] && G.players[G.hostId].online === false &&
        G.gamePhase !== 'home' && G.gamePhase !== 'gameover') {
        scheduleHostClaim();
    }

    if (someoneJoined) playSound('join');
    renderPlayerList();
    updatePlayersSidebar();
    updateRolePlayersList();
    // Tras una reconexión, la pantalla puede haberse pintado antes de
    // conocer los nombres: refrescar el banner "Inicia: ..." si procede.
    if (G.gamePhase === 'round' && !G.isSpectator && G.starterPlayerId && G.players[G.starterPlayerId]) {
        const banner = document.getElementById('starter-banner');
        if (banner && banner.textContent.includes('Alguien')) {
            showStarterBanner(G.players[G.starterPlayerId].name);
        }
    }
}

// ── Personal Signal Listener ─────────────────────────────────────

function onMySignal(snapshot) {
    const signal = snapshot.val();
    if (!signal) return;
    switch (signal.type) {
        case 'room_full':
            toast('Sala llena', 'error');
            setTimeout(exitGame, 1500);
            break;
        case 'kicked':
            toast('Fuiste expulsado', 'error');
            setTimeout(exitGame, 1500);
            break;
        case 'host_left':
            toast('Host desconectado', 'error');
            setTimeout(exitGame, 2000);
            break;
    }
    // Clear after processing
    if (G.db && G.channel) {
        G.db.ref('rooms/' + G.channel + '/signals/' + G.myId).remove();
    }
}

// ── Votes Listener (host only) ───────────────────────────────────

// Derivación idempotente del recuento desde el nodo crudo de votos.
// Cada jugador escribe solo su clave votes/{id} (sin conflicto de
// escritura); el host SIEMPRE recalcula desde cero sobre el snapshot
// completo, nunca acumula incrementalmente. Así el resultado es
// independiente del orden/duplicación de eventos y sobrevive a un
// cambio de host a mitad de votación.
function tallyVotes(rawVotes) {
    const votes = {};
    const votedPlayers = new Set();
    const voteTargets = {};
    Object.entries(rawVotes || {}).forEach(function([voterId, targetId]) {
        if (
            typeof targetId === 'string' &&
            voterId !== targetId &&
            !votedPlayers.has(voterId) &&
            G.activePlayers.includes(voterId) &&
            G.activePlayers.includes(targetId) &&
            !G.eliminated.includes(targetId)
        ) {
            votes[targetId] = (votes[targetId] || 0) + 1;
            votedPlayers.add(voterId);
            voteTargets[voterId] = targetId;
        }
    });
    return { votes: votes, votedPlayers: votedPlayers, voteTargets: voteTargets };
}

function onVotesChange(snapshot) {
    if (!G.isHost || G.gamePhase !== 'voting') return;
    const tally = tallyVotes(snapshot.val());
    G.votes        = tally.votes;
    G.votedPlayers = tally.votedPlayers;
    G.voteTargets  = tally.voteTargets;

    // Broadcast vote progress to all clients
    G.db.ref('rooms/' + G.channel + '/state').update({
        votes:        G.votes,
        votedPlayers: Array.from(G.votedPlayers),
        voteTargets:  G.voteTargets
    }).catch(function(e) { console.error('Error sincronizando votos:', e); });

    // All voted → publish results early
    if (G.votedPlayers.size >= G.activePlayers.length && !G.resultsPublished) {
        if (G.voteTimeout) clearTimeout(G.voteTimeout);
        G.voteTimeout = setTimeout(function() {
            if (!G.resultsPublished) publishResults();
        }, 500);
    }

    if (G.isSpectator) updateSpectatorVotes();
}

// ── State-to-handler bridges ─────────────────────────────────────

function handleAssignFromState(state) {
    const msg = {
        activePlayers: arrayFromFirebase(state.activePlayers),
        impostors:     arrayFromFirebase(state.impostors),
        charlatans:    arrayFromFirebase(state.charlatans),
        citizens:      arrayFromFirebase(state.citizens),
        roles:         state.roles || {},
        hostId:        state.hostId,
        starterPlayerId: state.starterPlayerId,
        usedWords:     arrayFromFirebase(state.usedWords),
        isFirstRound:  state.isFirstRound !== false
    };
    handleAssign(msg);
}

function handleStartRoundFromState(state) {
    // Ancla de fin de ronda por timestamp de servidor: resistente a
    // pantalla apagada, F5 y relojes locales desviados.
    const duration = (state.roundDuration || G.roundTime) * 1000;
    G.roundEndTime = state.roundStartedAt ? state.roundStartedAt + duration : serverNow() + duration;
    const remaining = Math.max(Math.ceil((G.roundEndTime - serverNow()) / 1000), 0);
    handleStartRound({ starterPlayerId: state.starterPlayerId, time: remaining });
}

function handleNextRoundFromState(state) {
    const msg = {
        activePlayers: arrayFromFirebase(state.activePlayers),
        fullRoles:     state.roles || {}
    };
    handleNextRound(msg);
}

function handleSkipWordFromState(state) {
    const msg = {
        roles:           state.roles || {},
        starterPlayerId: state.starterPlayerId,
        usedWords:       arrayFromFirebase(state.usedWords)
    };
    handleSkipWord(msg);
}

// ── Restauración de pantalla tras reconexión (v1.1.0 → RTDB) ─────
function restoreScreenForPhase(state) {
    switch (G.gamePhase) {
        case 'lobby':
            showScreen('screen-lobby');
            generateQR();
            renderPlayerList();
            break;
        case 'roles':
            if (G.isSpectator) { showScreen('screen-spectator'); updateSpectatorRoles(); }
            else { showScreen('screen-role'); restoreRoleScreen(); }
            break;
        case 'round':
            if (G.isSpectator) { showScreen('screen-spectator'); updateSpectatorRoles(); startSpectatorTimer(); }
            else {
                showScreen('screen-role');
                restoreRoleScreen();
                showStarterBanner(G.players[G.starterPlayerId]?.name || 'Alguien');
                startTimer();
            }
            break;
        case 'voting':
            if (G.isSpectator) { showScreen('screen-spectator'); updateSpectatorVotes(); }
            else {
                showScreen('screen-voting');
                renderVotingList();
                updateVoteTimerFromTimestamp();
            }
            break;
        case 'results':
            showResults((state && state.results) || {});
            break;
        case 'gameover':
            handleGameOver((state && state.gameOver) || {});
            break;
        default:
            showScreen('screen-lobby');
    }
    updateHostUI();
}

function restoreRoleScreen() {
    if (!G.myRole) return;
    const card = document.getElementById('role-card');
    if (G.roleRevealed) {
        const roleClass = roleClassOf(G.myRole.role);
        if (card) card.className = 'role-card ' + roleClass;
        document.getElementById('role-icon').innerHTML = '<img src="' + roleIconOf(G.myRole.role) + '" alt="" class="role-icon-img">';
        document.getElementById('role-title').textContent = G.myRole.role;
        document.getElementById('role-word').textContent = G.myRole.word;
        document.getElementById('role-instruction').textContent = 'Tu rol (ya revelado)';
        updateRoleWordImage();
    } else {
        if (card) card.className = 'role-card blurred';
        document.getElementById('role-icon').innerHTML = '<img src="' + ICONS.help + '" alt="?" class="role-icon-img">';
        document.getElementById('role-title').textContent = 'SECRETO';
        document.getElementById('role-word').textContent = '???';
        document.getElementById('role-instruction').textContent = 'Toca la carta para revelar';
        hideRoleWordImage();
    }
    updateRolePlayersList();
}

function handleBackToLobbyFromState(state) {
    const msg = {
        scores:   state.scores || {},
        hostId:   state.hostId,
        usedWords: arrayFromFirebase(state.usedWords)
    };
    handleBackToLobby(msg);
}

// ── QR Code ──────────────────────────────────────────────────────

function generateQR() {
    const container = document.getElementById('qr-container');
    if (!container || typeof qrcode === 'undefined') return;
    const qr = qrcode(0, 'M');
    // Dynamic URL — works on GitHub Pages, local dev, staging, etc.
    const baseUrl = window.location.href.split('#')[0].split('?')[0];
    qr.addData(baseUrl + '?code=' + G.channel);
    qr.make();
    container.innerHTML = qr.createImgTag(4) +
        '<div class="qr-instructions"><strong>Comparte el código</strong> para que tus amigos se unan</div>';
}

// ── Avatar Rendering ─────────────────────────────────────────────

function renderHexAvatar(playerId, size) {
    size = size || 40;
    const p = G.players[playerId];
    const avatar = AVATARS.find(a => a.id === p?.avatar) || AVATARS[0];
    const frame  = FRAMES.find(f => f.id === p?.frame);
    const hasFrame  = frame && frame.color !== 'transparent';
    const frameColor = hasFrame ? frame.color : 'transparent';
    return '<div class="hex-avatar-container" style="width:' + size + 'px;height:' + (size * 1.15) + 'px;--frame-color:' + frameColor + '">' +
        '<img src="' + avatar.image + '" alt="" class="hex-avatar-img">' +
        (hasFrame ? '<div class="hex-avatar-frame"></div>' : '') +
        '</div>';
}

function renderPlayerList() {
    const list    = document.getElementById('player-list');
    const countEl = document.getElementById('player-count');
    if (!list) return;

    const playerIds = Object.keys(G.players).sort((a, b) => (G.scores[b] || 0) - (G.scores[a] || 0));
    if (countEl) countEl.textContent = playerIds.length + '/' + G.maxPlayers;

    // Quien aparece por primera vez entra con animación
    const seen = G.renderedPlayers || (G.renderedPlayers = new Set());
    let headerHtml = '<div class="player-list-score-header"><span>Jugador</span><span>Puntos</span></div>';
    list.innerHTML = headerHtml + playerIds.map(function(id, index) {
        const p = G.players[id];
        const isMe         = id === G.myId;
        const isHostPlayer = id === G.hostId;
        const score        = G.scores[id] || 0;

        let rankHtml = '';
        if (index === 0) rankHtml = '<div class="player-rank"><img src="' + ICONS.medalGold   + '" alt="1"></div>';
        else if (index === 1) rankHtml = '<div class="player-rank"><img src="' + ICONS.medalSilver + '" alt="2"></div>';
        else if (index === 2) rankHtml = '<div class="player-rank"><img src="' + ICONS.medalBronze + '" alt="3"></div>';
        else rankHtml = '<div class="player-rank"><span class="player-rank-number">' + (index + 1) + '</span></div>';

        const kickBtn = (G.isHost && !isMe && (G.gamePhase === 'lobby' || G.gamePhase === 'home'))
            ? '<button class="btn-kick" data-kick="' + esc(id) + '" title="Expulsar"><img src="' + ICONS.kick + '" alt="Kick"></button>'
            : '';

        return '<div class="player-item' + (seen.has(id) ? '' : ' is-new') + '" data-player-id="' + esc(id) + '">' + rankHtml +
            '<div class="player-avatar">' + renderHexAvatar(id, 40) + '</div>' +
            '<div class="player-info"><div class="player-name">' + esc(p.name) + (isMe ? ' (Tú)' : '') + '</div>' +
            (isHostPlayer ? '<div class="player-tag">Host</div>' : '') + '</div>' +
            '<div class="player-score">' + (Number(score) || 0) + '</div>' + kickBtn + '</div>';
    }).join('');

    playerIds.forEach(function(id) { seen.add(id); });

    list.querySelectorAll('.btn-kick').forEach(function(btn) {
        btn.onclick = function() { kickPlayer(btn.dataset.kick); };
    });

    // Long-press para transferir host (v1.1.0)
    if (G.isHost) list.querySelectorAll('.player-item').forEach(function(el) {
        const id = el.dataset.playerId;
        if (id && id !== G.myId) setupLongPressForHost(el, id);
    });

    const btnDistribute = document.getElementById('btn-distribute');
    if (btnDistribute) btnDistribute.style.display = G.isHost && (G.gamePhase === 'lobby' || G.gamePhase === 'home') ? 'block' : 'none';
}

function kickPlayer(playerId) {
    if (!G.isHost || !G.db) return;
    const playerName = G.players[playerId]?.name || 'Jugador';
    if (confirm('¿Expulsar a ' + playerName + '?')) {
        delete G.players[playerId];
        delete G.scores[playerId];
        renderPlayerList();
        // Send signal to player
        G.db.ref('rooms/' + G.channel + '/signals/' + playerId).set({
            type: 'kicked',
            ts:   firebase.database.ServerValue.TIMESTAMP
        });
        // Mark offline in players node
        G.db.ref('rooms/' + G.channel + '/players/' + playerId).update({ online: false });
        // Update scores in state
        G.db.ref('rooms/' + G.channel + '/state').update({ scores: G.scores });
    }
}

// ── Transferencia de Host (v1.1.0, portada a RTDB) ───────────────
// Manual: long-press 800ms sobre un jugador → menú de confirmación.
// Automática: al detectar host offline, el sucesor determinista
// (jugador online más antiguo por joinedAt) reclama el rol.
// Ambas rutas escriben state/hostId con runTransaction: si dos
// clientes reclaman a la vez, solo uno gana.

function setupLongPressForHost(element, playerId) {
    if (!G.isHost || playerId === G.myId) return;
    let pressTimer = null;
    const startPress = function() {
        element.classList.add('long-press-active');
        pressTimer = setTimeout(function() { element.classList.remove('long-press-active'); showHostTransferMenu(playerId); }, 800);
    };
    const endPress = function() { element.classList.remove('long-press-active'); if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; } };
    element.addEventListener('mousedown', startPress);
    element.addEventListener('mouseup', endPress);
    element.addEventListener('mouseleave', endPress);
    element.addEventListener('touchstart', startPress, { passive: true });
    element.addEventListener('touchend', endPress);
    element.addEventListener('touchcancel', endPress);
    element.addEventListener('touchmove', endPress);
}

function showHostTransferMenu(playerId) {
    const existing = document.getElementById('host-transfer-menu');
    if (existing) existing.remove();
    const playerName = G.players[playerId]?.name || 'Jugador';
    const menu = document.createElement('div');
    menu.id = 'host-transfer-menu';
    menu.className = 'host-transfer-menu';
    menu.innerHTML = '<h3>¿Transferir host a ' + esc(playerName) + '?</h3><button class="host-transfer-btn">Sí, hacer host</button><button class="host-transfer-btn cancel">Cancelar</button>';
    const buttons = menu.querySelectorAll('button');
    buttons[0].onclick = function() { confirmHostTransfer(playerId); };
    buttons[1].onclick = closeHostTransferMenu;
    document.body.appendChild(menu);
}

function closeHostTransferMenu() { const menu = document.getElementById('host-transfer-menu'); if (menu) menu.remove(); }

function confirmHostTransfer(newHostId) {
    closeHostTransferMenu();
    if (!G.isHost || !G.db || !G.players[newHostId] || G.players[newHostId].online === false) return;
    G.db.ref('rooms/' + G.channel + '/state/hostId').transaction(function(current) {
        // Solo el host actual puede ceder el rol
        if (current === G.myId || current === null) return newHostId;
        return; // abortar: otro cambio se adelantó
    }).then(function(res) {
        if (res.committed) toast('Host transferido a ' + (G.players[newHostId]?.name || 'Jugador'), 'success');
    }).catch(function(e) { console.error('Error transfiriendo host:', e); });
}

function computeHostSuccessor(excludeId) {
    // Con partida en curso solo puede heredar quien juega en ella: quien
    // espera la siguiente no tiene roles ni controles de host en pantalla.
    const inGame = G.gamePhase !== 'lobby' && G.gamePhase !== 'home' && Object.keys(G.fullRoles || {}).length > 0;
    const candidates = Object.keys(G.players).filter(function(id) {
        return id !== excludeId && G.players[id] && G.players[id].online !== false && (!inGame || G.fullRoles[id]);
    });
    if (candidates.length === 0) return null;
    candidates.sort(function(a, b) {
        const ja = G.players[a].joinedAt || Infinity;
        const jb = G.players[b].joinedAt || Infinity;
        if (ja !== jb) return ja - jb;
        return a < b ? -1 : 1; // desempate determinista por id
    });
    return candidates[0];
}

// Gracia antes de reclamar: si el host solo hizo F5, vuelve en segundos
// y recupera su flag hostOnline sin cambio de rol.
const HOST_CLAIM_GRACE = 8000;
function scheduleHostClaim() {
    if (G.hostClaimTimer || G.isHost) return;
    G.hostClaimTimer = setTimeout(function() {
        G.hostClaimTimer = null;
        if (!G.db || !G.channel || G.isHost) return;
        G.db.ref('rooms/' + G.channel + '/state/hostOnline').once('value').then(function(snap) {
            if (snap.val() === false) attemptAutoHostClaim();
        }).catch(function() { attemptAutoHostClaim(); });
    }, HOST_CLAIM_GRACE);
}

// Gracia antes de eliminar a un jugador offline en partida.
const DISCONNECT_GRACE = 10000;
function scheduleOfflineElimination(id) {
    // Solo cuenta para quien juega esta partida (no para quien espera)
    if (G.offlineTimers[id] || G.eliminated.includes(id) || !G.activePlayers.includes(id)) return;
    G.offlineTimers[id] = setTimeout(function() {
        delete G.offlineTimers[id];
        const p = G.players[id];
        if (!p || p.online !== false) return; // volvió a tiempo
        if (G.gamePhase === 'lobby' || G.gamePhase === 'home' || G.gamePhase === 'gameover') return;
        if (!G.activePlayers.includes(id)) return;
        const without = function(arr) { return arr.filter(function(pid) { return pid !== id; }); };
        G.activePlayers = without(G.activePlayers);
        // También fuera de su bando: si no, checkGameOver seguía contando
        // a un infiltrado desconectado y la partida no terminaba.
        G.impostors  = without(G.impostors);
        G.charlatans = without(G.charlatans);
        G.citizens   = without(G.citizens);
        if (!G.eliminated.includes(id)) G.eliminated.push(id);
        renderPlayerList();
        updatePlayersSidebar();
        updateRolePlayersList();
        if (G.isSpectator) updateSpectatorRoles();
        toast((p.name || 'Jugador') + ' se desconectó', 'warning');
        // El host escribe la eliminación al estado autoritativo; si no,
        // el siguiente cambio de fase la borraría al re-sincronizar.
        if (G.isHost && G.db && G.channel) {
            G.db.ref('rooms/' + G.channel + '/state').update({
                activePlayers: G.activePlayers,
                eliminated:    G.eliminated,
                impostors:     G.impostors,
                charlatans:    G.charlatans,
                citizens:      G.citizens
            }).catch(function(e) { console.error('Error registrando desconexión:', e); });
            // Con la ronda sin votación de por medio, la desconexión
            // puede decidir la partida (p. ej. se fue el último infiltrado)
            if (G.gamePhase === 'roles' || G.gamePhase === 'round') checkGameOver();
        }
        // Si ya votaron todos los que quedan, el host cierra antes
        const activeVoters = Array.from(G.votedPlayers).filter(function(v) { return G.activePlayers.includes(v); });
        if (G.isHost && G.gamePhase === 'voting' && !G.resultsPublished &&
            activeVoters.length >= G.activePlayers.length) {
            publishResults();
        }
    }, DISCONNECT_GRACE);
}

function attemptAutoHostClaim() {
    if (!G.db || !G.channel || G.claimingHost || G.isHost) return;
    const oldHostId = G.hostId;
    const successor = computeHostSuccessor(oldHostId);
    if (!successor) {
        toast('Host desconectado', 'error');
        setTimeout(exitGame, 2000);
        return;
    }
    if (successor !== G.myId) return; // reclamará otro; la transaction resuelve empates
    G.claimingHost = true;
    G.db.ref('rooms/' + G.channel + '/state/hostId').transaction(function(current) {
        if (current === oldHostId || current === null) return G.myId;
        return; // otro ya reclamó
    }).then(function(res) {
        G.claimingHost = false;
        // Si se confirmó, onStateChange detecta el cambio y llama a
        // handleHostChange → becomeHost()
        if (!res.committed) return;
    }).catch(function(e) {
        G.claimingHost = false;
        console.error('Error reclamando host:', e);
    });
}

function handleHostChange(wasIHost) {
    if (G.isHost && !wasIHost) {
        toast('¡Ahora eres el host!', 'success');
        becomeHost();
    } else if (!G.isHost && wasIHost) {
        toast('Ya no eres el host', 'info');
        // El host saliente deja de ser responsable del flag hostOnline
        if (G.db && G.channel) {
            G.db.ref('rooms/' + G.channel + '/state/hostOnline').onDisconnect().cancel();
        }
        closeHostTransferMenu();
    }
    updateHostUI();
}

// Asumir responsabilidades de host a mitad de partida
function becomeHost() {
    if (!G.db || !G.channel) return;
    attachVotesListener();
    // Respaldo: si aun así hereda alguien que espera (p. ej. transferencia
    // manual), lleva a todos a la sala para no dejar la partida colgada.
    if (G.waitingNextGame) {
        const ref = G.db.ref('rooms/' + G.channel + '/state/hostOnline');
        ref.set(true).catch(function() {});
        ref.onDisconnect().set(false);
        backToLobby();
        return;
    }
    const hostOnlineRef = G.db.ref('rooms/' + G.channel + '/state/hostOnline');
    hostOnlineRef.set(true).catch(function(e) { console.error('Error marcando hostOnline:', e); });
    hostOnlineRef.onDisconnect().set(false);
    if (G.gamePhase === 'voting') scheduleHostVoteClose();
    // El host anterior cayó con la ronda ya vencida: nadie había abierto
    // la votación y la partida se quedaba colgada.
    if (G.gamePhase === 'round' && G.roundEndTime && serverNow() >= G.roundEndTime) hostOpenVoting();
}

// Refresca los controles de host según fase (v1.1.0, adaptada)
function updateHostUI() {
    const btnDistribute = document.getElementById('btn-distribute');
    const btnStartRound = document.getElementById('btn-start-round');
    const btnSkipWord = document.getElementById('btn-skip-word');
    const btnNextRound = document.getElementById('btn-next-round');
    const btnBackLobby = document.getElementById('btn-back-lobby');
    if (btnDistribute) btnDistribute.style.display = G.isHost && G.gamePhase === 'lobby' ? 'block' : 'none';
    if (G.gamePhase === 'roles' && !G.isSpectator) {
        if (btnStartRound) btnStartRound.style.display = G.isHost ? 'block' : 'none';
        if (btnSkipWord) btnSkipWord.style.display = G.isHost ? 'block' : 'none';
    }
    if (G.gamePhase === 'results' && !G.isSpectator) {
        if (btnNextRound) btnNextRound.style.display = G.isHost ? 'block' : 'none';
        if (btnBackLobby) btnBackLobby.style.display = G.isHost ? 'block' : 'none';
    }
    if (G.gamePhase === 'gameover') {
        const btnBackToLobby = document.getElementById('btn-back-to-lobby');
        if (btnBackToLobby) btnBackToLobby.style.display = G.isHost ? 'block' : 'none';
    }
    if (G.isSpectator) updateSpectatorHostControls();
    renderPlayerList();
}

// ── Word Selection ───────────────────────────────────────────────

function selectNewWord() {
    // Categorías de la sala (state/categories), no del DOM: el DOM de un
    // host heredado o recargado tiene los valores por defecto.
    if (!G.selectedCategories || G.selectedCategories.length === 0) G.selectedCategories = Object.keys(DB);
    let availableWords = [];
    G.selectedCategories.forEach(function(cat) {
        DB[cat].forEach(function(word) {
            if (!G.usedWords.includes(word)) availableWords.push({ category: cat, word: word });
        });
    });
    if (availableWords.length < 2) {
        G.usedWords = [];
        availableWords = [];
        G.selectedCategories.forEach(function(cat) {
            DB[cat].forEach(function(word) { availableWords.push({ category: cat, word: word }); });
        });
        toast('Palabras reiniciadas');
    }
    const secretIdx  = Math.floor(Math.random() * availableWords.length);
    const secretData = availableWords[secretIdx];
    G.currentCategory   = secretData.category;
    G.currentSecretWord = secretData.word;
    G.usedWords.push(G.currentSecretWord);

    // La palabra falsa es de la MISMA categoría. Si en esa categoría ya
    // no quedan palabras sin usar, se toma cualquiera de ella (antes el
    // charlatán recibía "???" y quedaba delatado).
    const pick = function(arr) { return arr[Math.floor(Math.random() * arr.length)]; };
    const sameCatOptions = availableWords.filter(function(w) {
        return w.word !== G.currentSecretWord && w.category === G.currentCategory;
    }).map(function(w) { return w.word; });
    const fallback = DB[G.currentCategory].filter(function(w) { return w !== G.currentSecretWord; });
    G.currentFakeWord = sameCatOptions.length > 0 ? pick(sameCatOptions) : pick(fallback);
    if (sameCatOptions.length > 0) G.usedWords.push(G.currentFakeWord);

    return { category: G.currentCategory, secretWord: G.currentSecretWord, fakeWord: G.currentFakeWord };
}

// ── Role Distribution ────────────────────────────────────────────

function distributeRoles() {
    if (!G.db || !G.isHost) return;
    let playerIds = Object.keys(G.players).filter(function(id) { return G.players[id] && G.players[id].online !== false; });
    if (playerIds.length < 3) { toast('Mínimo 3 jugadores', 'error'); return; }
    // Tope de la sala: entran los que llegaron primero, el resto espera
    if (playerIds.length > G.maxPlayers) {
        playerIds = playerIds.sort(function(a, b) { return (G.players[a].joinedAt || 0) - (G.players[b].joinedAt || 0); }).slice(0, G.maxPlayers);
        toast('Sala llena: juegan los primeros ' + G.maxPlayers, 'warning');
    }

    // Config de la sala (sincronizada desde state/), acotada a los
    // jugadores reales: infiltrados < resto y al menos 1 ciudadano.
    const numImp  = Math.min(G.numImpostors || 1, maxImpostorsFor(playerIds.length));
    const numChar = Math.max(0, Math.min(G.numCharlatans || 0, playerIds.length - numImp - 1));
    if (numImp < (G.numImpostors || 1) || numChar < (G.numCharlatans || 0)) {
        toast('Con ' + playerIds.length + ' jugadores: ' + numImp + ' infiltrado(s), ' + numChar + ' charlatán(es)', 'warning');
    }

    G.gameOverPublished = false;
    G.resultsPublished = false;
    const wordData = selectNewWord();
    let roles = {};
    let pool  = [...playerIds];
    G.impostors  = [];
    G.charlatans = [];
    G.citizens   = [];
    G.trueRoles  = {};

    // Assign impostors
    for (let i = 0; i < numImp && pool.length; i++) {
        const idx = Math.floor(Math.random() * pool.length);
        const id  = pool.splice(idx, 1)[0];
        roles[id] = { role: 'INFILTRADO', icon: ICONS.impostor, word: 'Categoría: ' + wordData.category };
        G.trueRoles[id] = 'INFILTRADO';
        G.impostors.push(id);
    }
    // Assign charlatans — FIX: give them the FAKE word (same category), not the secret word
    for (let i = 0; i < numChar && pool.length; i++) {
        const idx = Math.floor(Math.random() * pool.length);
        const id  = pool.splice(idx, 1)[0];
        roles[id] = { role: 'CIUDADANO', icon: ICONS.citizen, word: wordData.fakeWord, cat: wordData.category };
        G.trueRoles[id] = 'CHARLATÁN';
        G.charlatans.push(id);
    }
    // Assign citizens
    pool.forEach(function(id) {
        roles[id] = { role: 'CIUDADANO', icon: ICONS.citizen, word: wordData.secretWord, cat: wordData.category };
        G.trueRoles[id] = 'CIUDADANO';
        G.citizens.push(id);
    });

    G.activePlayers  = [...playerIds];
    G.eliminated     = [];
    G.fullRoles      = roles;
    G.gamePhase      = 'roles';
    G.isFirstRound   = true;
    G.rolesVersion   = (G.rolesVersion || 0) + 1;
    G.starterPlayerId = G.activePlayers[Math.floor(Math.random() * G.activePlayers.length)];

    // Write to Firebase — all clients react via onStateChange
    G.db.ref('rooms/' + G.channel + '/votes').remove();
    G.db.ref('rooms/' + G.channel + '/state').update({
        gamePhase:     'roles',
        activePlayers: G.activePlayers,
        eliminated:    [],
        impostors:     G.impostors,
        charlatans:    G.charlatans,
        citizens:      G.citizens,
        roles:         roles,
        trueRoles:     G.trueRoles,
        starterPlayerId: G.starterPlayerId,
        usedWords:     G.usedWords,
        isFirstRound:  true,
        rolesVersion:  G.rolesVersion
    });
}

function skipWord() {
    if (!G.isHost || !G.db) return;
    const wordData = selectNewWord();
    // FIX: use G.trueRoles to correctly assign words to charlatans
    Object.keys(G.fullRoles).forEach(function(id) {
        const trueRole = G.trueRoles[id];
        if (trueRole === 'INFILTRADO') {
            G.fullRoles[id].word = 'Categoría: ' + wordData.category;
        } else if (trueRole === 'CHARLATÁN') {
            G.fullRoles[id].word = wordData.fakeWord;
            G.fullRoles[id].cat  = wordData.category;
        } else {
            G.fullRoles[id].word = wordData.secretWord;
            G.fullRoles[id].cat  = wordData.category;
        }
    });
    G.starterPlayerId = G.activePlayers[Math.floor(Math.random() * G.activePlayers.length)];
    G.rolesVersion    = (G.rolesVersion || 0) + 1;
    G.db.ref('rooms/' + G.channel + '/state').update({
        roles:           G.fullRoles,
        trueRoles:       G.trueRoles,
        starterPlayerId: G.starterPlayerId,
        usedWords:       G.usedWords,
        rolesVersion:    G.rolesVersion
    }).catch(function(e) { console.error('Error cambiando palabra:', e); });
    // El host no recibe su propio cambio de rolesVersion (ya lo tiene
    // incrementado), así que refresca su carta localmente. Sin esto,
    // el host seguía viendo la palabra/categoría anterior.
    handleSkipWord({
        roles:           G.fullRoles,
        starterPlayerId: G.starterPlayerId,
        usedWords:       G.usedWords
    });
}

function handleSkipWord(msg) {
    G.fullRoles      = msg.roles;
    G.starterPlayerId = msg.starterPlayerId;
    G.usedWords      = msg.usedWords || G.usedWords;
    if (G.fullRoles[G.myId]) G.myRole = G.fullRoles[G.myId];
    if (G.isSpectator) {
        updateSpectatorRoles();
        toast('Palabra cambiada', 'info');
        return;
    }
    G.roleRevealed = false;
    const card = document.getElementById('role-card');
    if (card) card.className = 'role-card blurred';
    document.getElementById('role-icon').innerHTML = '<img src="' + ICONS.help + '" alt="?" class="role-icon-img">';
    document.getElementById('role-title').textContent = 'SECRETO';
    document.getElementById('role-word').textContent = '???';
    document.getElementById('role-instruction').textContent = 'Toca la carta para revelar';
    hideRoleWordImage();
    // Ya no se anuncia "Inicia: X" aquí: quien inicia se sortea al
    // pulsar "Iniciar Ronda" y el aviso mostraba a otra persona.
    const pointsBox = document.getElementById('points-box');
    if (pointsBox) pointsBox.style.display = 'none';
    toast('Palabra cambiada', 'info');
}

function handleAssign(msg) {
    G.activePlayers  = msg.activePlayers;
    G.impostors      = msg.impostors;
    G.charlatans     = msg.charlatans;
    G.citizens       = msg.citizens;
    G.fullRoles      = msg.roles;
    G.hostId         = msg.hostId || G.hostId;
    G.isHost         = (G.myId === G.hostId);
    G.starterPlayerId = msg.starterPlayerId;
    G.usedWords      = msg.usedWords || G.usedWords;
    G.gamePhase      = 'roles';
    G.isSpectator    = false;
    G.isFirstRound   = msg.isFirstRound !== false;
    if (G.isFirstRound) G.roleRevealed = false;

    const myRoleData = msg.roles[G.myId];
    if (!myRoleData) return;
    G.myRole = myRoleData;

    const card     = document.getElementById('role-card');
    const roleIcon = document.getElementById('role-icon');
    const roleTitle = document.getElementById('role-title');
    const roleWord  = document.getElementById('role-word');
    const roleInst  = document.getElementById('role-instruction');
    const starterInfo = document.getElementById('starter-info');
    const btnStart  = document.getElementById('btn-start-round');
    const btnSkip   = document.getElementById('btn-skip-word');

    if (starterInfo) starterInfo.style.display = 'none';

    if (G.isFirstRound) {
        if (card) card.className = 'role-card blurred';
        roleIcon.innerHTML = '<img src="' + ICONS.help + '" alt="?" class="role-icon-img">';
        roleTitle.textContent = 'SECRETO';
        roleWord.textContent  = '???';
        roleInst.textContent  = 'Toca la carta para revelar';
        hideRoleWordImage();
    } else {
        G.roleRevealed = true;
        const roleClass = roleClassOf(G.myRole.role);
        if (card) card.className = 'role-card ' + roleClass;
        roleIcon.innerHTML = '<img src="' + roleIconOf(G.myRole.role) + '" alt="" class="role-icon-img">';
        roleTitle.textContent = G.myRole.role;
        roleWord.textContent  = G.myRole.word;
        roleInst.textContent  = 'Tu rol (ya revelado)';
        updateRoleWordImage();
    }

    document.getElementById('points-box').style.display = 'none';
    document.getElementById('timer').style.display = 'none';
    document.getElementById('wait-message').style.display = 'block';
    if (btnStart) {
        btnStart.style.display = G.isHost ? 'block' : 'none';
        btnStart.disabled = false;
        btnStart.className = 'btn btn-start-round';
        btnStart.textContent = 'Iniciar Ronda';
    }
    if (btnSkip) btnSkip.style.display = G.isHost ? 'block' : 'none';
    showScreen('screen-role');
    updatePlayersSidebar();
    updateRolePlayersList();
}

// ── Ilustración de la palabra (v2.1.0) ───────────────────────────
// Ciudadanos y charlatán ven una imagen de SU palabra junto a ella;
// el infiltrado no (solo conoce la categoría). Colores usa una
// muestra local; el resto se resuelve contra la API de Wikipedia con
// títulos curados (window.WORD_IMAGE_TITLES). Sin imagen → no pasa nada.
function hideRoleWordImage() {
    const box = document.getElementById('role-word-image');
    if (box) { box.innerHTML = ''; box.style.display = 'none'; }
}

function updateRoleWordImage() {
    const box = document.getElementById('role-word-image');
    if (!box) return;
    box.innerHTML = '';
    box.style.display = 'none';
    if (!G.myRole || !G.roleRevealed) return;
    const word = G.myRole.word;
    if (!word || G.myRole.role === 'INFILTRADO' || word.indexOf('Categoría:') === 0) return;
    const cat = G.myRole.cat;
    const swatch = (window.COLOR_SWATCHES || {})[word];
    if (swatch && (!cat || cat === 'Colores')) {
        box.innerHTML = '<div class="word-color-swatch" style="background:' + swatch + '"></div>';
        box.style.display = 'block';
        return;
    }
    if (typeof fetch === 'undefined') return;
    // Clave por categoría: "Coco" es fruta y película, "Naranja" fruta y color
    const cacheKey = (cat || '') + '|' + word;
    if (G.wordImageCache[cacheKey] !== undefined) {
        renderWordImage(box, G.wordImageCache[cacheKey]);
        return;
    }
    const titles = window.WORD_IMAGE_TITLES || {};
    const title = titles[(cat || '') + ':' + word] || titles[word] || word;
    fetch('https://es.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(title))
        .then(function(r) { return r.ok ? r.json() : null; })
        .then(function(d) {
            const url = (d && d.type !== 'disambiguation' && d.thumbnail && d.thumbnail.source) || null;
            G.wordImageCache[cacheKey] = url;
            // Solo pintar si la carta sigue mostrando esta palabra
            if (G.myRole && G.myRole.word === word && G.roleRevealed) renderWordImage(box, url);
        })
        .catch(function() { G.wordImageCache[cacheKey] = null; });
}

function renderWordImage(box, url) {
    if (!url) return;
    const img = document.createElement('img');
    img.className = 'word-image';
    img.alt = '';
    img.onerror = function() { box.style.display = 'none'; };
    img.src = url;
    box.innerHTML = '';
    box.appendChild(img);
    box.style.display = 'block';
}

function revealRole() {
    if (G.roleRevealed || !G.myRole) return;
    G.roleRevealed = true;
    playSound('reveal');
    const card = document.getElementById('role-card');
    if (card) card.classList.remove('blurred');
    document.getElementById('role-icon').innerHTML = '<img src="' + roleIconOf(G.myRole.role) + '" alt="" class="role-icon-img">';
    document.getElementById('role-title').textContent = G.myRole.role;
    document.getElementById('role-word').textContent  = G.myRole.word;
    document.getElementById('role-instruction').textContent = 'Memoriza tu información';
    const roleClass = roleClassOf(G.myRole.role);
    if (card) {
        card.classList.add(roleClass);
        // Animación de giro (se reinicia si se vuelve a revelar)
        card.classList.remove('flip-reveal');
        void card.offsetWidth;
        card.classList.add('flip-reveal');
    }
    vibrate(30);
    updateRoleWordImage();
    showPointsReminder();
    saveSession(); // conservar roleRevealed para restaurar tras F5
}

function showPointsReminder() {
    const box  = document.getElementById('points-box');
    const list = document.getElementById('points-list');
    if (!box || !list) return;
    let html = '';
    // El charlatán ve el recordatorio de ciudadano: cree serlo.
    if (G.myRole.role === 'INFILTRADO') {
        html = '<li><span class="points-value positive">+' + POINTS.IMPOSTOR_WIN           + '</span> Sobrevivir y ganar</li>' +
               '<li><span class="points-value positive">+' + POINTS.IMPOSTOR_SURVIVE_ROUND + '</span> Por ronda sobrevivida</li>';
    } else {
        html = '<li><span class="points-value positive">+' + POINTS.CITIZEN_SURVIVE       + '</span> Sobrevivir y ganar</li>' +
               '<li><span class="points-value positive">+' + POINTS.CITIZEN_CORRECT_VOTE  + '</span> Votar al infiltrado</li>' +
               '<li><span class="points-value negative">'  + POINTS.CITIZEN_WRONG_VOTE    + '</span> Votar a un inocente</li>';
    }
    list.innerHTML = html;
    box.style.display = 'block';
}

// ── Round Management ─────────────────────────────────────────────

function startRound() {
    if (!G.db || !G.isHost || G.roundStarting) return;
    G.roundStarting = true;
    const btnStart = document.getElementById('btn-start-round');
    const btnSkip  = document.getElementById('btn-skip-word');
    if (btnStart) { btnStart.disabled = true; btnStart.textContent = 'Iniciando...'; }
    if (btnSkip)  btnSkip.style.display = 'none';

    const newStarter = G.activePlayers[Math.floor(Math.random() * G.activePlayers.length)];
    G.db.ref('rooms/' + G.channel + '/state').update({
        gamePhase:      'round',
        roundStartedAt: firebase.database.ServerValue.TIMESTAMP,
        roundDuration:  G.roundTime,
        starterPlayerId: newStarter
    });
    setTimeout(function() { G.roundStarting = false; }, 2000);
}

function showRoundStartOverlay(starterName, starterAvatar, starterFrame) {
    const existing = document.getElementById('round-start-overlay');
    if (existing) existing.remove();
    const avatar = AVATARS.find(a => a.id === starterAvatar) || AVATARS[0];
    const frame  = FRAMES.find(f => f.id === starterFrame);
    const hasFrame  = frame && frame.color !== 'transparent';
    const frameColor = hasFrame ? frame.color : 'transparent';
    const overlay = document.createElement('div');
    overlay.id = 'round-start-overlay';
    overlay.className = 'round-start-overlay';
    overlay.innerHTML = '<div class="round-start-message"><h2>¡COMIENZA LA RONDA!</h2>' +
        '<div class="round-start-avatar hex-avatar-container" style="width:100px;height:115px;--frame-color:' + frameColor + '">' +
        '<img src="' + avatar.image + '" alt="avatar" class="hex-avatar-img">' +
        (hasFrame ? '<div class="hex-avatar-frame"></div>' : '') +
        '</div>' +
        '<p>Empieza: <span class="starter-name">' + esc(starterName) + '</span></p></div>';
    document.body.appendChild(overlay);
}

function hideRoundStartOverlay() {
    const overlay = document.getElementById('round-start-overlay');
    if (overlay) overlay.remove();
}

function showStarterBanner(starterName) {
    const existing = document.getElementById('starter-banner');
    if (existing) existing.remove();
    const banner = document.createElement('div');
    banner.id = 'starter-banner';
    banner.className = 'starter-banner';
    banner.innerHTML = '<img src="' + ICONS.play + '" alt="">Inicia: ' + esc(starterName);
    document.body.appendChild(banner);
}

function hideStarterBanner() {
    const banner = document.getElementById('starter-banner');
    if (banner) banner.remove();
}

function handleStartRound(msg) {
    clearAllTimers();
    G.starterPlayerId = msg.starterPlayerId;
    G.gamePhase      = 'round';
    G.roundStarting  = false;

    const btnStart = document.getElementById('btn-start-round');
    const btnSkip  = document.getElementById('btn-skip-word');
    if (btnStart) { btnStart.style.display = 'none'; btnStart.disabled = false; btnStart.textContent = 'Iniciar Ronda'; }
    if (btnSkip)  btnSkip.style.display = 'none';

    const starterName = G.players[G.starterPlayerId]?.name || 'Alguien';
    toggleHelp(false);
    playSound('start');
    vibrate(80);

    if (G.isSpectator) {
        updateSpectatorHostControls(); // oculta Iniciar/Cambiar palabra
        const specStatus = document.getElementById('spectator-status');
        if (specStatus) specStatus.textContent = starterName + ' inicia!';
        setTimeout(function() { startSpectatorTimer(); }, ROUND_START_DISPLAY_TIME);
        return;
    }

    const starter = G.players[G.starterPlayerId] || {};
    showRoundStartOverlay(starterName, starter.avatar || 'avatar-01', starter.frame || 'fr-none');
    setTimeout(function() {
        hideRoundStartOverlay();
        showStarterBanner(starterName);
        startTimer();
    }, ROUND_START_DISPLAY_TIME);
}

function clearAllTimers() {
    if (G.timerInterval)         { clearInterval(G.timerInterval);         G.timerInterval         = null; }
    if (G.voteTimerInterval)     { clearInterval(G.voteTimerInterval);     G.voteTimerInterval     = null; }
    if (G.voteTimeout)           { clearTimeout(G.voteTimeout);            G.voteTimeout           = null; }
    if (G.spectatorTimerInterval){ clearInterval(G.spectatorTimerInterval); G.spectatorTimerInterval = null; }
}

function startTimer() {
    if (G.timerInterval) clearInterval(G.timerInterval);
    const timer = document.getElementById('timer');
    if (!timer || !G.roundEndTime) return;
    timer.style.display = 'flex';
    timer.classList.remove('warning', 'done');
    document.getElementById('wait-message').style.display = 'none';
    document.getElementById('points-box').style.display  = 'none';
    let fired = false;
    let lastBeep = null;
    const tick = function() {
        const remaining = Math.max(0, Math.ceil((G.roundEndTime - serverNow()) / 1000));
        updateTimerDisplay(remaining);
        setTimerRing(timer, remaining, G.roundTime || 60);
        if (remaining <= 10) timer.classList.add('warning');
        if (remaining > 0 && remaining <= 5 && remaining !== lastBeep) { lastBeep = remaining; playSound('tick'); }
        if (remaining <= 0 && !fired) {
            fired = true;
            clearInterval(G.timerInterval);
            G.timerInterval = null;
            timer.textContent = '¡TIEMPO!';
            timer.classList.add('done');
            playSound('timeup');
            vibrate([500, 200, 500]);
            hostOpenVoting();
            // Los no-host esperan el cambio de fase vía onStateChange
        }
    };
    tick();
    G.timerInterval = setInterval(tick, 500);
}

// Solo el HOST transiciona a votación; escribe el ancla del timer de
// voto con timestamp de servidor. Se llama desde el timer normal Y
// desde el timer de espectador (un host eliminado sigue dirigiendo:
// sin esto la ronda se quedaría colgada sin pasar a votación).
function hostOpenVoting() {
    if (!G.isHost || !G.db || G.gamePhase !== 'round') return;
    G.db.ref('rooms/' + G.channel + '/votes').remove().catch(function() {});
    G.db.ref('rooms/' + G.channel + '/state').update({
        gamePhase:     'voting',
        votes:         {},
        votedPlayers:  [],
        voteTargets:   {},
        voteStartedAt: firebase.database.ServerValue.TIMESTAMP,
        voteDuration:  30
    }).catch(function(e) { console.error('Error iniciando votación:', e); });
}

function startSpectatorTimer() {
    if (G.spectatorTimerInterval) clearInterval(G.spectatorTimerInterval);
    const specStatus = document.getElementById('spectator-status');
    if (!specStatus || !G.roundEndTime) return;
    const tick = function() {
        const remaining = Math.max(0, Math.ceil((G.roundEndTime - serverNow()) / 1000));
        if (remaining <= 0) {
            clearInterval(G.spectatorTimerInterval);
            G.spectatorTimerInterval = null;
            specStatus.textContent = 'Votación...';
            hostOpenVoting(); // host-espectador también cierra la ronda
            return;
        }
        const mins = Math.floor(remaining / 60);
        const secs = remaining % 60;
        specStatus.textContent = 'Ronda: ' + mins.toString().padStart(2, '0') + ':' + secs.toString().padStart(2, '0');
    };
    tick();
    G.spectatorTimerInterval = setInterval(tick, 500);
}

// Anillo del temporizador: --p va de 1 (lleno) a 0 (vacío)
function setTimerRing(el, remaining, total) {
    if (!el) return;
    el.style.setProperty('--p', Math.max(0, Math.min(1, remaining / (total || 1))).toFixed(3));
}

function updateTimerDisplay(seconds) {
    if (seconds < 0) seconds = 0;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    document.getElementById('timer').textContent = mins.toString().padStart(2, '0') + ':' + secs.toString().padStart(2, '0');
}

// ── Voting ───────────────────────────────────────────────────────

function startVoting() {
    if (G.timerInterval) clearInterval(G.timerInterval);
    hideStarterBanner();
    toggleHelp(false);
    playSound('voting');
    vibrate(60);
    if (G.isSpectator) {
        const specStatus = document.getElementById('spectator-status');
        if (specStatus) specStatus.textContent = 'Votación...';
        showScreen('screen-spectator');
        updateSpectatorVotes();
        updateSpectatorHostControls();
        scheduleHostVoteClose(); // host-espectador también cierra la votación
        return;
    }
    G.gamePhase   = 'voting';
    G.votes       = G.votes || {};       // keep any already-synced votes
    G.votedPlayers = G.votedPlayers || new Set();
    G.voteTargets  = G.voteTargets  || {};
    showScreen('screen-voting');
    renderVotingList();
    startUniversalVoteTimer();
    scheduleHostVoteClose();
}

// El host agenda el cierre de votación contra el ancla de servidor
// (+2s de gracia para votos en vuelo). Se re-agenda si el host cambia.
function scheduleHostVoteClose() {
    if (!G.isHost || !G.voteEndTime) return;
    if (G.voteTimeout) clearTimeout(G.voteTimeout);
    const delay = Math.max(0, G.voteEndTime - serverNow()) + 2000;
    G.voteTimeout = setTimeout(function() {
        if (!G.resultsPublished) publishResults();
    }, delay);
}

function renderVotingList() {
    const list = document.getElementById('voting-list');
    if (!list) return;
    const votable = G.activePlayers.filter(id => id !== G.myId && !G.eliminated.includes(id));
    // FIX v2: los botones se deshabilitan si YO ya voté (antes se
    // deshabilitaba el botón de quien había votado, que es otra cosa)
    const iVoted = G.hasVotedThisRound || G.votedPlayers.has(G.myId);
    const myTarget = (G.voteTargets || {})[G.myId] || G.myVoteTarget;
    list.innerHTML = votable.map(function(id, i) {
        const mine = iVoted && id === myTarget;
        return '<div class="vote-item' + (mine ? ' my-vote' : '') + '" style="animation-delay:' + (i * 60) + 'ms">' +
            '<div class="vote-avatar">' + renderHexAvatar(id, 48) + '</div>' +
            '<div class="player-info"><div class="player-name">' + esc(G.players[id]?.name || 'Jugador') + '</div></div>' +
            '<button class="btn-vote' + (mine ? ' voted' : '') + '" data-target="' + esc(id) + '"' +
            (iVoted ? ' disabled' : '') + '>' +
            (mine ? 'Tu voto' : 'Votar') + '</button></div>';
    }).join('');
    if (!iVoted) {
        list.querySelectorAll('.btn-vote').forEach(function(btn) {
            btn.onclick = function() { sendVote(btn.dataset.target, btn); };
        });
    }
    updateVoteProgress();
}

// "Voto registrado · 2/4 han votado" (o la instrucción si aún no vota)
function updateVoteProgress() {
    const voteStatus = document.getElementById('vote-status');
    if (!voteStatus || G.isSpectator) return;
    const iVoted = G.hasVotedThisRound || G.votedPlayers.has(G.myId);
    const voters = Array.from(G.votedPlayers).filter(function(v) { return G.activePlayers.includes(v); }).length;
    const total = G.activePlayers.length;
    voteStatus.textContent = iVoted
        ? 'Voto registrado · ' + Math.max(voters, 1) + '/' + total + ' han votado'
        : 'Selecciona a quién expulsar · ' + voters + '/' + total + ' han votado';
}

// Timer de voto universal (v1.1.0) sobre timestamp de servidor:
// resistente a pantalla apagada y relojes desviados.
function startUniversalVoteTimer() {
    if (G.voteTimerInterval) clearInterval(G.voteTimerInterval);
    const display = document.getElementById('vote-timer');
    const voteStatus = document.getElementById('vote-status');
    if (!display || !G.voteEndTime) return;
    const updateTimer = function() {
        const remaining = Math.max(0, Math.ceil((G.voteEndTime - serverNow()) / 1000));
        display.textContent = '00:' + remaining.toString().padStart(2, '0');
        setTimerRing(display, remaining, 30);
        display.classList.toggle('warning', remaining <= 10);
        if (remaining <= 0) {
            clearInterval(G.voteTimerInterval);
            G.voteTimerInterval = null;
            document.querySelectorAll('.btn-vote').forEach(btn => btn.disabled = true);
            if (voteStatus) voteStatus.textContent = 'Contando votos...';
            showCountingVotesOverlay();
        }
    };
    updateTimer();
    G.voteTimerInterval = setInterval(updateTimer, 250);
}

// Al volver de pantalla apagada / reconexión: recalcular desde el ancla.
function updateVoteTimerFromTimestamp() {
    if (!G.voteEndTime || G.gamePhase !== 'voting') return;
    const remaining = Math.max(0, Math.ceil((G.voteEndTime - serverNow()) / 1000));
    if (remaining > 0) {
        startUniversalVoteTimer();
        scheduleHostVoteClose();
    } else {
        const display = document.getElementById('vote-timer');
        if (display) display.textContent = '00:00';
        document.querySelectorAll('.btn-vote').forEach(btn => btn.disabled = true);
        const voteStatus = document.getElementById('vote-status');
        if (voteStatus) voteStatus.textContent = 'Contando votos...';
        showCountingVotesOverlay();
        if (G.isHost && !G.resultsPublished) publishResults();
    }
}

function sendVote(targetId, button) {
    if (!G.db || G.eliminated.includes(targetId) || !G.activePlayers.includes(targetId) || G.hasVotedThisRound) return;
    if (G.voteEndTime && serverNow() >= G.voteEndTime) { toast('Tiempo agotado', 'warning'); return; }
    G.hasVotedThisRound = true;
    G.myVoteTarget = targetId;
    playSound('vote');
    vibrate(40);
    // Each player writes their own vote to Firebase (clave propia → sin conflicto)
    G.db.ref('rooms/' + G.channel + '/votes/' + G.myId).set(targetId)
        .catch(function(e) { console.error('Error registrando voto:', e); });
    if (!button) {
        button = Array.from(document.querySelectorAll('.btn-vote')).find(function(btn) { return btn.dataset.target === targetId; });
    }
    if (button) {
        button.classList.add('voted');
        button.textContent = 'Tu voto';
        button.disabled = true;
        const item = button.closest('.vote-item');
        if (item) item.classList.add('my-vote');
    }
    document.querySelectorAll('.btn-vote').forEach(function(btn) { btn.disabled = true; });
    updateVoteProgress();
}

// ── Results ──────────────────────────────────────────────────────

function publishResults() {
    if (!G.isHost || !G.db || G.resultsPublished) return;
    G.resultsPublished = true;
    clearAllTimers();
    // Lectura única y autoritativa del nodo de votos antes de calcular:
    // no dependemos de que el listener haya procesado el último evento.
    G.db.ref('rooms/' + G.channel + '/votes').once('value').then(function(snap) {
        const tally = tallyVotes(snap.val());
        G.votes        = tally.votes;
        G.votedPlayers = tally.votedPlayers;
        G.voteTargets  = tally.voteTargets;
        finalizeResults();
    }).catch(function(e) {
        console.error('Error leyendo votos, uso el estado local:', e);
        finalizeResults();
    });
}

function finalizeResults() {
    let maxVotes  = 0;
    let mostVoted = [];
    Object.entries(G.votes).forEach(function([id, count]) {
        if (count > maxVotes)      { maxVotes = count; mostVoted = [id]; }
        else if (count === maxVotes) mostVoted.push(id);
    });

    const isTie        = mostVoted.length > 1 || maxVotes === 0;
    let eliminatedId   = null;
    let eliminatedRole = null;

    if (!isTie) {
        eliminatedId = mostVoted[0];
        G.eliminated.push(eliminatedId);
        G.activePlayers = G.activePlayers.filter(id => id !== eliminatedId);

        if (G.impostors.includes(eliminatedId)) {
            eliminatedRole = 'INFILTRADO';
            G.impostors = G.impostors.filter(id => id !== eliminatedId);
        } else if (G.charlatans.includes(eliminatedId)) {
            eliminatedRole = 'CHARLATÁN';
            G.charlatans = G.charlatans.filter(id => id !== eliminatedId);
        } else {
            eliminatedRole = 'CIUDADANO';
            G.citizens = G.citizens.filter(id => id !== eliminatedId);
        }
    }

    // Puntos por voto, tal como se anuncian: cada ciudadano/charlatán
    // gana +7 si votó a un infiltrado y pierde 3 si votó a un inocente,
    // haya o no eliminación. Los infiltrados no puntúan por votar.
    // (Antes solo contaba el voto al eliminado y el infiltrado que
    // votaba a su compañero eliminado se llevaba +7.)
    const wasImpostor = function(id) { return (G.trueRoles[id] || G.fullRoles[id]?.role) === 'INFILTRADO'; };
    Object.entries(G.voteTargets).forEach(function([voterId, targetId]) {
        if (wasImpostor(voterId)) return;
        G.scores[voterId] = (G.scores[voterId] || 0) +
            (wasImpostor(targetId) ? POINTS.CITIZEN_CORRECT_VOTE : POINTS.CITIZEN_WRONG_VOTE);
    });

    // +5 por ronda sobrevivida a cada infiltrado que sigue en juego,
    // también si la ronda terminó en empate.
    G.impostors.forEach(function(id) {
        G.scores[id] = (G.scores[id] || 0) + POINTS.IMPOSTOR_SURVIVE_ROUND;
    });

    const resultsPayload = {
        votes:         G.votes,
        eliminatedId:  eliminatedId,
        eliminatedName: eliminatedId ? (G.players[eliminatedId]?.name || 'Jugador') : null,
        eliminatedRole: eliminatedRole,
        isTie:         isTie,
        scores:        G.scores,
        activePlayers: G.activePlayers,
        impostors:     G.impostors,
        fullRoles:     G.fullRoles
    };

    G.db.ref('rooms/' + G.channel + '/state').update({
        gamePhase:     'results',
        votes:         G.votes,
        activePlayers: G.activePlayers,
        eliminated:    G.eliminated,
        impostors:     G.impostors,
        charlatans:    G.charlatans,
        citizens:      G.citizens,
        scores:        G.scores,
        roles:         G.fullRoles,
        results:       resultsPayload
    }).catch(function(e) { console.error('Error publicando resultados:', e); });

    // Solo si seguimos en resultados: si el host ya volvió a la sala,
    // un fin de partida tardío lo sacaba del lobby.
    setTimeout(function() { if (G.gamePhase === 'results') checkGameOver(); }, RESULT_DISPLAY_TIME);
}

// Overlay "contando votos" (v1.1.0): feedback entre el cierre de la
// votación y la publicación de resultados por el host.
function showCountingVotesOverlay() {
    if (document.getElementById('counting-votes-overlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'counting-votes-overlay';
    overlay.className = 'counting-votes-overlay';
    overlay.innerHTML = '<div class="counting-votes-message"><h2>Contando votos...</h2></div>';
    document.body.appendChild(overlay);
}

function hideCountingVotesOverlay() {
    const overlay = document.getElementById('counting-votes-overlay');
    if (overlay) overlay.remove();
}

function showYouEliminatedOverlay(role) {
    const existing = document.getElementById('you-eliminated-overlay');
    if (existing) existing.remove();
    const overlay = document.createElement('div');
    overlay.id = 'you-eliminated-overlay';
    overlay.className = 'you-eliminated-overlay';
    overlay.innerHTML = '<div class="you-eliminated-message">' +
        '<h1 class="stamp">EXPULSADO</h1>' +
        '<p>Eras <strong class="role-' + roleClassOf(role) + '">' + esc(role) + '</strong></p>' +
        '<p class="you-eliminated-sub">Sigues en la sala como espectador</p>' +
        '</div>';
    document.body.appendChild(overlay);
    vibrate([80, 40, 120]);
}

function hideYouEliminatedOverlay() {
    const overlay = document.getElementById('you-eliminated-overlay');
    if (overlay) overlay.remove();
}

function showResults(msg) {
    clearAllTimers();
    hideStarterBanner();
    hideCountingVotesOverlay();
    G.votes        = msg.votes || {};
    G.scores       = msg.scores || G.scores;
    // arrayFromFirebase: results.* llega del árbol y puede venir como objeto
    G.activePlayers = msg.activePlayers ? arrayFromFirebase(msg.activePlayers) : G.activePlayers;
    G.impostors    = msg.impostors ? arrayFromFirebase(msg.impostors) : G.impostors;
    if (msg.eliminatedId && !G.eliminated.includes(msg.eliminatedId)) {
        G.eliminated.push(msg.eliminatedId);
    }
    updatePlayersSidebar();
    updateRolePlayersList();
    playSound(msg.eliminatedId === G.myId ? 'lose' : msg.isTie ? 'tie' : 'eliminated');

    if (msg.eliminatedId === G.myId) {
        G.isSpectator = true;
        G.fullRoles   = msg.fullRoles || G.fullRoles;
        showYouEliminatedOverlay(msg.eliminatedRole);
        setTimeout(function() {
            hideYouEliminatedOverlay();
            showScreen('screen-spectator');
            document.getElementById('spectator-status').textContent = 'Eliminado (' + msg.eliminatedRole + ')';
            updateSpectatorRoles();
            updateSpectatorHostControls();
        }, 3000);
        saveSession();
        return;
    }

    if (G.isSpectator) {
        document.getElementById('spectator-status').textContent = msg.isTie ? 'Empate' : (msg.eliminatedName || 'Jugador') + ' eliminado';
        updateSpectatorRoles();
        updateSpectatorHostControls();
        return;
    }

    showScreen('screen-results');
    G.gamePhase = 'results';

    const resultsList = document.getElementById('results-list');
    if (resultsList) {
        const voteEntries = Object.entries(msg.votes || {});
        const maxVotes    = voteEntries.length > 0 ? Math.max(...Object.values(msg.votes), 1) : 1;
        resultsList.innerHTML = voteEntries.map(function([id, count]) {
            return '<div class="result-item">' +
                '<div class="result-header">' +
                '<div class="result-player">' +
                '<div class="result-avatar">' + renderHexAvatar(id, 36) + '</div>' +
                '<span class="result-name">' + esc(G.players[id]?.name || 'Jugador') + '</span>' +
                '</div>' +
                '<span class="result-votes">' + (Number(count) || 0) + ' votos</span>' +
                '</div>' +
                '<div class="result-bar"><div class="result-bar-fill" style="width:' + (count / maxVotes * 100) + '%"></div></div>' +
                '</div>';
        }).join('');
    }

    const elimBox = document.getElementById('eliminated-box');
    if (elimBox) {
        if (msg.isTie) {
            elimBox.innerHTML = '<div class="eliminated-message">Empate en la votación</div>' +
                '<div class="eliminated-name">NADIE ELIMINADO</div>' +
                '<div class="eliminated-role-container">' +
                '<img src="' + ICONS.tie + '" alt="" class="eliminated-role-icon"></div>';
        } else {
            const iconSrc = msg.eliminatedRole === 'INFILTRADO' ? ICONS.impostor :
                            msg.eliminatedRole === 'CHARLATÁN'  ? ICONS.charlatan : ICONS.citizen;
            elimBox.innerHTML = '<div class="eliminated-message">Ha sido expulsado</div>' +
                '<div class="eliminated-name">' + esc(msg.eliminatedName || 'Jugador') + '</div>' +
                '<div class="eliminated-role-container">' +
                '<img src="' + iconSrc + '" alt="" class="eliminated-role-icon">' +
                '<span class="eliminated-role">Era <strong>' + esc(msg.eliminatedRole) + '</strong></span></div>';
        }
    }

    const btnNext = document.getElementById('btn-next-round');
    const btnBackLobby = document.getElementById('btn-back-lobby');
    if (btnNext) { btnNext.style.display = 'none'; btnNext.disabled = false; btnNext.className = 'btn btn-next-round'; }
    if (btnBackLobby) btnBackLobby.style.display = 'none';
    if (G.isHost) {
        // En empate el botón aparece antes (TIE_BUTTON_DELAY, v1.1.0)
        const delay = msg.isTie ? TIE_BUTTON_DELAY : RESULT_DISPLAY_TIME;
        setTimeout(function() {
            if (btnNext) btnNext.style.display = 'block';
            if (btnBackLobby) btnBackLobby.style.display = 'block';
        }, delay);
    }
}

function nextRound() {
    if (!G.db || !G.isHost) return;
    // Si la partida ya está decidida (el host pulsó antes de que corriera
    // el chequeo diferido), se termina en vez de abrir otra ronda.
    if (computeWinner()) { checkGameOver(); return; }
    const btnNext = document.getElementById('btn-next-round');
    if (btnNext) btnNext.disabled = true;
    G.resultsPublished = false;
    G.rolesVersion     = (G.rolesVersion || 0) + 1;
    G.db.ref('rooms/' + G.channel + '/votes').remove();
    G.db.ref('rooms/' + G.channel + '/state').update({
        gamePhase:     'roles',
        activePlayers: G.activePlayers,
        roles:         G.fullRoles,
        isFirstRound:  false,
        rolesVersion:  G.rolesVersion
    });
}

function spectatorNextAction() {
    if (!G.isHost) return;
    if (G.gamePhase === 'roles') startRound();
    else if (G.gamePhase === 'results') nextRound();
}

function handleNextRound(msg) {
    clearAllTimers();
    hideStarterBanner();
    hideCountingVotesOverlay();
    G.votes        = {};
    G.votedPlayers = new Set();
    G.voteTargets  = {};
    G.hasVotedThisRound = false;
    G.voteEndTime  = null;
    G.roundEndTime = null;
    G.isFirstRound = false;
    G.gamePhase    = 'roles';
    if (msg && msg.activePlayers) G.activePlayers = msg.activePlayers;
    if (msg && msg.fullRoles)     { G.fullRoles = msg.fullRoles; if (G.fullRoles[G.myId]) G.myRole = G.fullRoles[G.myId]; }

    if (G.isSpectator) {
        document.getElementById('spectator-status').textContent = 'Esperando inicio...';
        showScreen('screen-spectator');
        updateSpectatorRoles();
        updateSpectatorHostControls();
        return;
    }
    if (!G.myRole) return;

    const card     = document.getElementById('role-card');
    const btnStart = document.getElementById('btn-start-round');
    const btnSkip  = document.getElementById('btn-skip-word');
    G.roleRevealed = true;
    const roleClass = roleClassOf(G.myRole.role);
    if (card) card.className = 'role-card ' + roleClass;
    document.getElementById('role-icon').innerHTML = '<img src="' + roleIconOf(G.myRole.role) + '" alt="" class="role-icon-img">';
    document.getElementById('role-title').textContent = G.myRole.role;
    document.getElementById('role-word').textContent  = G.myRole.word;
    document.getElementById('role-instruction').textContent = 'Tu rol (conocido)';
    updateRoleWordImage();
    document.getElementById('points-box').style.display = 'none';
    const timer = document.getElementById('timer');
    timer.style.display = 'none';
    timer.classList.remove('warning');
    document.getElementById('wait-message').style.display = 'block';
    document.getElementById('starter-info').style.display  = 'none';
    if (btnStart) {
        btnStart.style.display = G.isHost ? 'block' : 'none';
        btnStart.disabled = false;
        btnStart.className = 'btn btn-start-round';
        btnStart.textContent = 'Iniciar Ronda';
    }
    if (btnSkip) btnSkip.style.display = G.isHost ? 'block' : 'none';
    showScreen('screen-role');
    updatePlayersSidebar();
    updateRolePlayersList();
}

// ── Game Over ────────────────────────────────────────────────────

// Condición de victoria sin efectos: ciudadanos si no quedan
// infiltrados; infiltrados si igualan o superan al resto.
function computeWinner() {
    if (G.impostors.length === 0) return 'CIUDADANOS';
    if (G.activePlayers.length - G.impostors.length <= G.impostors.length) return 'INFILTRADOS';
    return null;
}

function checkGameOver() {
    if (!G.isHost || !G.db || G.gameOverPublished) return;
    const winner = computeWinner();
    if (!winner) return;
    G.gameOverPublished = true; // los puntos finales se suman una sola vez
    let reason = '';
    if (winner === 'CIUDADANOS') {
        reason = 'Infiltrados eliminados';
        G.citizens.forEach(function(id) {
            if (G.activePlayers.includes(id)) G.scores[id] = (G.scores[id] || 0) + POINTS.CITIZEN_SURVIVE;
        });
        G.charlatans.forEach(function(id) {
            if (G.activePlayers.includes(id)) G.scores[id] = (G.scores[id] || 0) + POINTS.CHARLATAN_SURVIVE;
        });
    } else {
        reason = 'Infiltrados dominan';
        G.impostors.forEach(function(id) {
            G.scores[id] = (G.scores[id] || 0) + POINTS.IMPOSTOR_WIN;
        });
    }
    G.db.ref('rooms/' + G.channel + '/state').update({
        gamePhase: 'gameover',
        scores:    G.scores,
        gameOver:  { winner: winner, reason: reason, scores: G.scores, roles: G.fullRoles }
    });
}

function handleGameOver(msg) {
    clearAllTimers();
    hideStarterBanner();
    hidePlayersSidebar();
    G.gamePhase = 'gameover';
    G.scores    = msg.scores || G.scores;
    G.fullRoles = msg.roles  || G.fullRoles;
    showScreen('screen-gameover');
    // Solo el host puede llevar a todos al lobby; a los demás no se
    // les muestra un botón que no haría nada.
    const btnBackToLobby = document.getElementById('btn-back-to-lobby');
    if (btnBackToLobby) btnBackToLobby.style.display = G.isHost ? 'block' : 'none';
    document.getElementById('gameover-title').textContent  = '¡' + msg.winner + ' GANAN!';
    document.getElementById('gameover-reason').textContent = msg.reason;
    document.getElementById('gameover-icon').src = msg.winner === 'INFILTRADOS' ? ICONS.impostor : ICONS.celebrate;
    const iAmImpostor = trueRoleOf(G.myId) === 'INFILTRADO';
    const iWon = (msg.winner === 'INFILTRADOS') === iAmImpostor;
    playSound(iWon ? 'win' : 'lose');
    const card = document.querySelector('#screen-gameover .game-card');
    if (card) {
        card.classList.toggle('winner-impostors', msg.winner === 'INFILTRADOS');
        card.classList.toggle('winner-citizens', msg.winner !== 'INFILTRADOS');
    }
    const verdict = document.getElementById('gameover-verdict');
    if (verdict) {
        verdict.textContent = iWon ? '¡VICTORIA!' : 'DERROTA';
        verdict.className = 'gameover-verdict ' + (iWon ? 'won' : 'lost');
    }
    if (iWon) launchConfetti(msg.winner === 'INFILTRADOS' ? ['#8b2635', '#c9a227', '#e8e8e8'] : ['#c9a227', '#3b82f6', '#e8e8e8', '#238c4e']);

    const scoresList = document.getElementById('final-scores');
    if (!scoresList) return;
    // Solo quienes jugaron esta partida (no quien esperaba la siguiente)
    const playedIds = Object.keys(G.fullRoles || {});
    const sorted = (playedIds.length ? playedIds : Object.keys(G.scores))
        .map(function(id) { return [id, G.scores[id] || 0]; })
        .sort((a, b) => b[1] - a[1]);
    scoresList.innerHTML = '<div class="final-scores-list">' + sorted.map(function([id, score], idx) {
        const p    = G.players[id];
        const role = trueRoleOf(id); // al final se revela al charlatán
        let rankHtml = '';
        if (idx === 0)      rankHtml = '<div class="score-rank"><img src="' + ICONS.medalGold   + '" alt="1"></div>';
        else if (idx === 1) rankHtml = '<div class="score-rank"><img src="' + ICONS.medalSilver + '" alt="2"></div>';
        else if (idx === 2) rankHtml = '<div class="score-rank"><img src="' + ICONS.medalBronze + '" alt="3"></div>';
        else rankHtml = '<div class="score-rank"><span class="score-rank-number">' + (idx + 1) + '</span></div>';
        return '<div class="score-item">' + rankHtml +
            '<div class="score-avatar">' + renderHexAvatar(id, 44) + '</div>' +
            '<div class="score-info">' +
            '<div class="score-name">'  + esc(p?.name || 'Jugador') + '</div>' +
            '<div class="score-role">'  + esc(role) + '</div>' +
            '</div>' +
            '<div class="score-points">' + (Number(score) || 0) + '</div>' +
            '</div>';
    }).join('') + '</div>';
}

// ── Back to Lobby / Exit ─────────────────────────────────────────

function backToLobby() {
    if (G.isHost && G.db) {
        G.db.ref('rooms/' + G.channel + '/votes').remove();
        G.db.ref('rooms/' + G.channel + '/state').update({
            gamePhase: 'lobby',
            scores:    G.scores,
            hostId:    G.hostId,
            usedWords: G.usedWords
        });
    }
    // For host, onStateChange will fire and call handleBackToLobbyFromState
    // For non-hosts, same happens via listener
}

function handleBackToLobby(msg) {
    clearAllTimers();
    hideStarterBanner();
    G.scores    = msg.scores   || G.scores;
    G.hostId    = msg.hostId   || G.hostId;
    G.isHost    = (G.myId === G.hostId);
    G.usedWords = msg.usedWords || G.usedWords;
    // En la sala solo se listan los conectados (en partida se conservaban
    // los caídos para mostrar su nombre)
    Object.keys(G.players).forEach(function(id) { if (G.players[id] && G.players[id].online === false) delete G.players[id]; });
    resetGameState();
    showScreen('screen-lobby');
    const btn = document.getElementById('btn-distribute');
    if (btn) btn.style.display = G.isHost ? 'block' : 'none';
    renderPlayerList();
}

function resetGameState() {
    clearAllTimers();
    hideStarterBanner();
    hidePlayersSidebar();
    hideCountingVotesOverlay();
    G.gamePhase      = 'lobby';
    G.prevPhase      = 'lobby';
    G.isSpectator    = false;
    G.activePlayers  = [];
    G.eliminated     = [];
    G.impostors      = [];
    G.charlatans     = [];
    G.citizens       = [];
    G.myRole         = null;
    G.fullRoles      = {};
    G.votes          = {};
    G.votedPlayers   = new Set();
    G.voteTargets    = {};
    G.roleRevealed   = false;
    G.starterPlayerId = null;
    G.isFirstRound   = true;
    G.roundStarting  = false;
    G.resultsPublished = false;
    G.gameOverPublished = false;
    G.waitingNextGame = false;
    setLobbyNotice('');
    G.hasVotedThisRound = false;
    G.roundEndTime   = null;
    G.voteEndTime    = null;
}

function leaveRoom() {
    if (confirm('¿Abandonar?')) exitGame();
}

function exitGame() {
    clearAllTimers();
    hideStarterBanner();
    hidePlayersSidebar();
    Object.values(G.offlineTimers).forEach(clearTimeout);
    G.offlineTimers = {};
    if (G.hostClaimTimer) { clearTimeout(G.hostClaimTimer); G.hostClaimTimer = null; }
    if (G.isHost && G.db && G.channel) {
        // Signal host has left to remaining clients (dispara sucesión)
        G.db.ref('rooms/' + G.channel + '/state').update({ hostOnline: false }).catch(function() {});
    }
    if (G.db && G.channel) {
        const myRef = G.db.ref('rooms/' + G.channel + '/players/' + G.myId);
        myRef.update({ online: false }).catch(function() {});
        myRef.onDisconnect().cancel(); // salida limpia: sin escrituras póstumas
    }
    clearSession();
    cleanupListeners();
    G.db      = null;
    G.channel = null;
    G.isHost  = false;
    G.hostId  = null;
    G.players = {};
    G.scores  = {};
    G.usedWords = [];
    G.trueRoles = {};
    G.prevPhase = null;
    G.rolesVersion = 0;
    G.resultsPublished = false;
    G.playersLoaded = false;
    G.renderedPlayers = new Set();
    resetGameState();
    showScreen('screen-home');
}

// Código de sala en fichas, una letra por ficha
function setRoomCode(code) {
    const el = document.getElementById('display-room-code');
    if (!el) return;
    el.setAttribute('aria-label', 'Código de sala ' + (code || ''));
    el.innerHTML = String(code || '----').split('').map(function(c, i) {
        return '<span class="code-tile" style="animation-delay:' + (i * 70) + 'ms">' + esc(c) + '</span>';
    }).join('');
}

// Aviso en la sala de espera (p. ej. "partida en curso"); vacío = oculto
function setLobbyNotice(text) {
    const el = document.getElementById('lobby-status');
    if (!el) return;
    el.textContent = text || '';
    el.style.display = text ? 'block' : 'none';
}

// ── Spectator Helpers ────────────────────────────────────────────

function updateSpectatorRoles() {
    const list = document.getElementById('spectator-roles');
    if (!list || !G.fullRoles) return;
    list.innerHTML = Object.entries(G.fullRoles).map(function([id, role]) {
        const p        = G.players[id];
        const isActive = G.activePlayers.includes(id);
        const statusIcon = isActive ? ICONS.active : ICONS.eliminated;
        return '<div class="player-item" style="opacity:' + (isActive ? 1 : 0.5) + '">' +
            '<div class="player-avatar">' + renderHexAvatar(id, 36) + '</div>' +
            '<div class="player-info">' +
            '<div class="player-name">' + esc(p?.name || 'Jugador') + '</div>' +
            '<div class="player-tag">'  + esc(trueRoleOf(id) + ' - ' + role.word) + '</div>' +
            '</div>' +
            '<img src="' + statusIcon + '" alt="" class="player-status-icon">' +
            '</div>';
    }).join('');
}

function updateSpectatorVotes() {
    const list = document.getElementById('spectator-votes');
    if (!list) return;
    list.innerHTML = G.activePlayers.map(function(id) {
        const p        = G.players[id];
        const votes    = G.votes[id]       || 0;
        const hasVoted = G.votedPlayers.has(id);
        const statusIcon = hasVoted ? ICONS.voted : ICONS.pending;
        return '<div class="player-item">' +
            '<div class="player-avatar">' + renderHexAvatar(id, 36) + '</div>' +
            '<div class="player-info">' +
            '<div class="player-name">' + esc(p?.name || 'Jugador') + '</div>' +
            '<div class="player-tag">'  + (hasVoted ? 'Ha votado' : 'Pendiente') + '</div>' +
            '</div>' +
            '<span>' + (Number(votes) || 0) + ' votos</span>' +
            '<img src="' + statusIcon + '" alt="" class="player-status-icon">' +
            '</div>';
    }).join('');
}

// ── Confeti (v2.3.0) ─────────────────────────────────────────────
// Piezas con CSS (sin librerías); se limpian solas.
function launchConfetti(colors) {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const old = document.getElementById('confetti');
    if (old) old.remove();
    const box = document.createElement('div');
    box.id = 'confetti';
    box.className = 'confetti';
    for (let i = 0; i < 70; i++) {
        const piece = document.createElement('i');
        piece.style.left = (Math.random() * 100) + '%';
        piece.style.background = colors[i % colors.length];
        piece.style.animationDelay = (Math.random() * 0.8) + 's';
        piece.style.animationDuration = (2.2 + Math.random() * 1.6) + 's';
        piece.style.setProperty('--drift', ((Math.random() - 0.5) * 160) + 'px');
        piece.style.setProperty('--spin', (Math.random() * 720 - 360) + 'deg');
        box.appendChild(piece);
    }
    document.body.appendChild(box);
    setTimeout(function() { box.remove(); }, 4800);
}

// ── Toast ────────────────────────────────────────────────────────

function toast(message, type) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const t = document.createElement('div');
    t.className = 'toast ' + (type || 'info');
    t.textContent = message;
    container.appendChild(t);
    setTimeout(function() { t.remove(); }, 3000);
}

window.G = G;
