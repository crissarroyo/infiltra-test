/**
 * INFILTRA - Game Logic v2.0.0 (Definitive Edition)
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
    check: 'assets/icons/icon-check.png',
    close: 'assets/icons/icon-close.png',
    kick: 'assets/icons/icon-kick.png',
    lock: 'assets/icons/icon-lock.png',
    active: 'assets/icons/icon-active.png',
    eliminated: 'assets/icons/icon-eliminated.png',
    voted: 'assets/icons/icon-voted.png',
    pending: 'assets/icons/icon-pending.png',
    tie: 'assets/icons/icon-tie.png',
    celebrate: 'assets/icons/icon-celebrate.png',
    medalGold: 'assets/icons/icon-medal-gold.png',
    medalSilver: 'assets/icons/icon-medal-silver.png',
    medalBronze: 'assets/icons/icon-medal-bronze.png',
    warning: 'assets/icons/icon-warning.png',
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
    "Animales": ["León", "Tigre", "Elefante", "Zebra", "Delfín", "Lobo", "Gorila", "Águila", "Jirafa", "Oso", "Zorro", "Panda", "Tiburón", "Canguro", "Hipopótamo", "Serpiente", "Cocodrilo", "Pájaro", "Mono", "Tortuga"],
    "Comida": ["Pizza", "Tacos", "Sushi", "Hamburguesa", "Pasta", "Ensalada", "Helado", "Pollo", "Pescado", "Chocolate", "Empanadas", "Ramen", "Curry", "Paella", "Burrito", "Croissant", "Queso", "Arroz", "Sopa", "Tarta"],
    "Países": ["México", "Japón", "Brasil", "España", "Francia", "Italia", "Alemania", "Australia", "Argentina", "Canadá", "China", "India", "Rusia", "Estados Unidos", "Reino Unido", "Sudáfrica", "Egipto", "Nueva Zelanda", "Corea del Sur", "Turquía"],
    "Profesiones": ["Médico", "Abogado", "Ingeniero", "Profesor", "Chef", "Piloto", "Arquitecto", "Programador", "Fotógrafo", "Enfermero", "Diseñador", "Periodista", "Músico", "Actor", "Científico", "Veterinario", "Contador", "Psicólogo", "Bombero", "Policía"],
    "Deportes": ["Fútbol", "Baloncesto", "Tenis", "Natación", "Boxeo", "Golf", "Voleibol", "Surf", "Ciclismo", "Atletismo", "Esquí", "Karate", "Béisbol", "Rugby", "Gimnasia", "Escalada", "Patinaje", "Hockey"],
    "Ciudades": ["París", "Tokio", "Nueva York", "Londres", "Roma", "Berlín", "Madrid", "Dubai", "Barcelona", "México DF", "Sídney", "Río de Janeiro", "Los Ángeles", "Toronto", "Estambul", "Singapur", "Ámsterdam", "Seúl"],
    "Frutas": ["Manzana", "Banana", "Naranja", "Uva", "Fresa", "Piña", "Mango", "Sandía", "Kiwi", "Melón", "Pera", "Durazno", "Cereza", "Limón", "Papaya", "Granada", "Coco", "Mora"],
    "Vehículos": ["Coche", "Bicicleta", "Avión", "Barco", "Tren", "Helicóptero", "Motocicleta", "Camión", "Submarino", "Cohete", "Autobús", "Patineta", "Tractor", "Yate"],
    "Instrumentos": ["Guitarra", "Piano", "Batería", "Violín", "Flauta", "Trompeta", "Saxofón", "Arpa", "Bajo", "Ukelele", "Acordeón", "Cello", "Clarinete", "Órgano"],
    "Películas": ["Titanic", "Star Wars", "Avatar", "Frozen", "Shrek", "Batman", "Avengers", "Coco", "Inception", "The Matrix", "Jurassic Park", "Harry Potter", "Toy Story"],
    "Colores": ["Rojo", "Azul", "Verde", "Amarillo", "Naranja", "Morado", "Rosa", "Negro", "Blanco", "Gris", "Turquesa", "Violeta", "Dorado", "Plateado"],
    "Superhéroes": ["Superman", "Batman", "Spider-Man", "Wonder Woman", "Iron Man", "Captain America", "Thor", "Hulk", "Flash", "Aquaman", "Wolverine", "Deadpool"]
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
    isSpectator: false,
    votes: {},
    votedPlayers: new Set(),
    voteTargets: {},
    hasVotedThisRound: false,
    serverTimeOffset: 0,   // corrección de reloj vía .info/serverTimeOffset
    roundEndTime: null,    // timestamp (servidor) de fin de ronda
    voteEndTime: null,     // timestamp (servidor) de cierre de votación
    timerInterval: null,
    voteTimerInterval: null,
    voteTimeout: null,
    spectatorTimerInterval: null,
    soundEnabled: true,
    screenStack: [],
    roleRevealed: false,
    isFirstRound: true,
    roundStarting: false,
    roundInProgress: false
};

document.addEventListener('DOMContentLoaded', init);

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
        if (G.gamePhase !== 'home' && G.gamePhase !== 'lobby' && (e.key === 'F5' || (e.ctrlKey && e.key === 'r'))) {
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
function validateRoleConfiguration() {
    const maxPlayers = parseInt(document.getElementById('config-max-players')?.value) || 10;
    const impostors = parseInt(document.getElementById('config-impostors')?.value) || 1;
    const charlatans = parseInt(document.getElementById('config-charlatans')?.value) || 0;
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
    if (specialRoles >= maxPlayers) {
        if (errorElement) { errorElement.textContent = '❌ Debe haber al menos 1 ciudadano'; errorElement.style.display = 'block'; errorElement.style.color = '#ff4757'; }
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
    style.textContent = 'html,body{overscroll-behavior-y:contain}.player-item.long-press-active{background:rgba(255,255,255,0.1);transform:scale(0.98)}.host-transfer-menu{position:fixed;bottom:0;left:0;right:0;background:#1a1a2e;border-top:2px solid #4a4a6a;padding:20px;z-index:1000;animation:slideUp .3s ease}@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}.host-transfer-menu h3{margin:0 0 15px;color:#fff;text-align:center}.host-transfer-btn{width:100%;padding:12px;margin:5px 0;background:#2d2d4a;border:none;border-radius:8px;color:#fff;font-size:16px;cursor:pointer}.host-transfer-btn:hover{background:#3d3d5a}.host-transfer-btn.cancel{background:#4a2d2d}.counting-votes-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;z-index:999}.counting-votes-message{text-align:center;color:#fff}.counting-votes-message h2{font-size:28px}';
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
    const controls = spectatorScreen.querySelector('.spectator-controls');
    if (controls) {
        const nextBtn = document.getElementById('btn-spectator-next');
        if (nextBtn) controls.insertBefore(skipBtn, nextBtn);
        else controls.appendChild(skipBtn);
    }
}

function updateSpectatorHostControls() {
    const btnNext = document.getElementById('btn-spectator-next');
    const btnLobby = document.getElementById('btn-spectator-lobby');
    const btnSkip = document.getElementById('btn-spectator-skip');
    if (G.isHost && G.isSpectator) {
        if (btnNext) {
            btnNext.style.display = 'block';
            btnNext.disabled = false;
            btnNext.textContent = (G.gamePhase === 'results' || G.gamePhase === 'voting') ? 'Siguiente Ronda' : 'Iniciar Ronda';
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
            '<span class="role-player-name">' + (p?.name || id.substring(0, 8)) + (isMe ? ' (Tú)' : '') + '</span>' +
            '</div>';
    }).join('');
}

function updatePlayersSidebar() {
    const list = document.getElementById('sidebar-players-list');
    const sidebar = document.getElementById('players-sidebar');
    if (!list || !sidebar) return;
    const allPlayerIds = Object.keys(G.players);
    list.innerHTML = allPlayerIds.map(id => {
        const p = G.players[id];
        const isEliminated = G.eliminated.includes(id);
        return '<div class="sidebar-player' + (isEliminated ? ' eliminated' : '') + '">' +
            '<div class="sidebar-player-avatar">' + renderHexAvatar(id, 28) + '</div>' +
            '<span class="sidebar-player-name">' + (p?.name || id.substring(0, 8)) + '</span></div>';
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
        const btn = document.getElementById('btn-sound');
        if (btn) {
            btn.querySelector('img').src = G.soundEnabled ? ICONS.soundOn : ICONS.soundOff;
            btn.classList.toggle('muted', !G.soundEnabled);
        }
    });
    bind('btn-help', function() {
        const current = document.querySelector('.screen.active')?.id || 'screen-home';
        if (current !== 'screen-help') G.screenStack.push(current);
        showScreen('screen-help');
    });
    bind('btn-help-back', function() {
        showScreen(G.screenStack.pop() || 'screen-home');
    });
    const maxPlayersInput = document.getElementById('config-max-players');
    const impostorsInput = document.getElementById('config-impostors');
    const charlatansInput = document.getElementById('config-charlatans');
    if (maxPlayersInput) maxPlayersInput.addEventListener('input', function() {
        const maxPlayers = parseInt(this.value) || 3;
        if (impostorsInput) impostorsInput.max = maxPlayers - 1;
        if (charlatansInput) charlatansInput.max = maxPlayers - 1;
        validateRoleConfiguration();
    });
    if (impostorsInput) impostorsInput.addEventListener('input', function() {
        const maxPlayers = parseInt(maxPlayersInput?.value) || 10;
        const impostors = parseInt(this.value) || 1;
        if (charlatansInput) charlatansInput.max = Math.max(0, maxPlayers - impostors - 1);
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
            input.value = code.toUpperCase();
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
    G.playerName = document.getElementById('input-name')?.value.trim() || '';
    if (!G.playerName) { toast('Ingresa tu nombre', 'error'); return; }
    updateSelectedCategories();
    if (G.selectedCategories.length === 0) { toast('Selecciona categorías', 'error'); return; }
    G.isHost = true;
    G.hostId = G.myId;
    G.maxPlayers = Math.min(parseInt(document.getElementById('config-max-players')?.value) || 10, 10);
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
    if (attempts >= 5) { toast('No se pudo crear la sala, reintenta', 'error'); return; }
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
        console.error('Error creando sala:', e);
        toast('Error creando sala', 'error');
    });
}

function joinRoom() {
    G.playerName = document.getElementById('input-name')?.value.trim() || '';
    if (!G.playerName) { toast('Ingresa tu nombre', 'error'); return; }
    const code = (document.getElementById('input-join-code')?.value || '').toUpperCase().trim();
    if (code.length !== 4) { toast('Código de 4 letras', 'error'); return; }
    saveProfile();
    G.isHost = false;
    G.channel = code;
    G.gamePhase = 'lobby';
    initFirebase();
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
    document.getElementById('display-room-code').textContent = G.channel;
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
        if (G.isHost && state.trueRoles) G.trueRoles = state.trueRoles;

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
            document.getElementById('display-room-code').textContent = G.channel;
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
                    document.getElementById('display-room-code').textContent = G.channel;
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
            if (G.isHost && state.trueRoles) G.trueRoles = state.trueRoles;
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
            const statusEl = document.getElementById('vote-status');
            if (statusEl) statusEl.textContent = 'Voto registrado. Esperando...';
        }
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

    if (G.gamePhase === 'lobby' || G.gamePhase === 'home') {
        // In lobby: check room-full for new joiners (host only)
        if (G.isHost) {
            newIds.forEach(function(id) {
                if (id !== G.myId && !G.players[id]) {
                    const currentCount = Object.keys(G.players).filter(pid => G.players[pid]).length;
                    if (currentCount >= G.maxPlayers) {
                        G.db.ref('rooms/' + G.channel + '/signals/' + id).set({
                            type: 'room_full',
                            ts: firebase.database.ServerValue.TIMESTAMP
                        });
                    }
                }
            });
        }
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
                if (G.players[id]) G.players[id].online = false; // conservar datos para sucesión/render
                scheduleOfflineElimination(id);
            } else {
                delete G.players[id];
            }
            return;
        }
        // Volvió online → cancelar eliminación pendiente
        if (G.offlineTimers[id]) { clearTimeout(G.offlineTimers[id]); delete G.offlineTimers[id]; }
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
        const roleClass = G.myRole.role === 'INFILTRADO' ? 'impostor' : G.myRole.role === 'CHARLATÁN' ? 'charlatan' : 'citizen';
        if (card) card.className = 'role-card ' + roleClass;
        document.getElementById('role-icon').innerHTML = '<img src="' + G.myRole.icon + '" alt="" class="role-icon-img">';
        document.getElementById('role-title').textContent = G.myRole.role;
        document.getElementById('role-word').textContent = G.myRole.word;
        document.getElementById('role-instruction').textContent = 'Tu rol (ya revelado)';
    } else {
        if (card) card.className = 'role-card blurred';
        document.getElementById('role-icon').innerHTML = '<img src="' + ICONS.help + '" alt="?" class="role-icon-img">';
        document.getElementById('role-title').textContent = 'SECRETO';
        document.getElementById('role-word').textContent = '???';
        document.getElementById('role-instruction').textContent = 'Toca la carta para revelar';
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
    const baseUrl = window.location.href.split('?')[0];
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
            ? '<button class="btn-kick" onclick="kickPlayer(\'' + id + '\')" title="Expulsar"><img src="' + ICONS.kick + '" alt="Kick"></button>'
            : '';

        return '<div id="player-item-' + id + '" class="player-item" data-player-id="' + id + '">' + rankHtml +
            '<div class="player-avatar">' + renderHexAvatar(id, 40) + '</div>' +
            '<div class="player-info"><div class="player-name">' + p.name + (isMe ? ' (Tú)' : '') + '</div>' +
            (isHostPlayer ? '<div class="player-tag">Host</div>' : '') + '</div>' +
            '<div class="player-score">' + score + '</div>' + kickBtn + '</div>';
    }).join('');

    // Long-press para transferir host (v1.1.0)
    if (G.isHost) playerIds.forEach(function(id) {
        if (id !== G.myId) {
            const el = document.getElementById('player-item-' + id);
            if (el) setupLongPressForHost(el, id);
        }
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
window.kickPlayer = kickPlayer;

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
    menu.innerHTML = '<h3>¿Transferir host a ' + playerName + '?</h3><button class="host-transfer-btn" onclick="confirmHostTransfer(\'' + playerId + '\')">Sí, hacer host</button><button class="host-transfer-btn cancel" onclick="closeHostTransferMenu()">Cancelar</button>';
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
window.confirmHostTransfer = confirmHostTransfer;
window.closeHostTransferMenu = closeHostTransferMenu;

function computeHostSuccessor(excludeId) {
    const candidates = Object.keys(G.players).filter(function(id) {
        return id !== excludeId && G.players[id] && G.players[id].online !== false;
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
    if (G.offlineTimers[id] || G.eliminated.includes(id)) return;
    G.offlineTimers[id] = setTimeout(function() {
        delete G.offlineTimers[id];
        const p = G.players[id];
        if (!p || p.online !== false) return; // volvió a tiempo
        if (G.gamePhase === 'lobby' || G.gamePhase === 'home' || G.gamePhase === 'gameover') return;
        G.activePlayers = G.activePlayers.filter(function(pid) { return pid !== id; });
        if (!G.eliminated.includes(id)) G.eliminated.push(id);
        renderPlayerList();
        updatePlayersSidebar();
        updateRolePlayersList();
        toast((p.name || 'Jugador') + ' se desconectó', 'warning');
        // El host escribe la eliminación al estado autoritativo; si no,
        // el siguiente cambio de fase la borraría al re-sincronizar.
        if (G.isHost && G.db && G.channel) {
            G.db.ref('rooms/' + G.channel + '/state').update({
                activePlayers: G.activePlayers,
                eliminated:    G.eliminated
            }).catch(function(e) { console.error('Error registrando desconexión:', e); });
        }
        // Si ya votaron todos los que quedan, el host cierra antes
        if (G.isHost && G.gamePhase === 'voting' && !G.resultsPublished &&
            G.votedPlayers.size >= G.activePlayers.length) {
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
    const hostOnlineRef = G.db.ref('rooms/' + G.channel + '/state/hostOnline');
    hostOnlineRef.set(true).catch(function(e) { console.error('Error marcando hostOnline:', e); });
    hostOnlineRef.onDisconnect().set(false);
    if (G.gamePhase === 'voting') scheduleHostVoteClose();
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
    updateSelectedCategories();
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

    // FIX: fake word must be from the SAME category as the secret word
    const sameCatOptions = availableWords.filter(function(w) {
        return w.word !== G.currentSecretWord && w.category === G.currentCategory;
    });
    G.currentFakeWord = sameCatOptions.length > 0
        ? sameCatOptions[Math.floor(Math.random() * sameCatOptions.length)].word
        : '???';
    if (G.currentFakeWord !== '???') G.usedWords.push(G.currentFakeWord);

    return { category: G.currentCategory, secretWord: G.currentSecretWord, fakeWord: G.currentFakeWord };
}

// ── Role Distribution ────────────────────────────────────────────

function distributeRoles() {
    if (!G.db) return;
    const playerIds = Object.keys(G.players);
    if (playerIds.length < 3) { toast('Mínimo 3 jugadores', 'error'); return; }

    const numImp  = Math.min(parseInt(document.getElementById('config-impostors')?.value)  || 1, Math.floor(playerIds.length / 2));
    const numChar = Math.min(parseInt(document.getElementById('config-charlatans')?.value) || 0, playerIds.length - numImp - 1);
    updateSelectedCategories();
    if (G.selectedCategories.length === 0) { toast('Selecciona categorías', 'error'); return; }

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
        roles[id] = { role: 'CIUDADANO', icon: ICONS.citizen, word: wordData.fakeWord };
        G.trueRoles[id] = 'CHARLATÁN';
        G.charlatans.push(id);
    }
    // Assign citizens
    pool.forEach(function(id) {
        roles[id] = { role: 'CIUDADANO', icon: ICONS.citizen, word: wordData.secretWord };
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
        } else {
            G.fullRoles[id].word = wordData.secretWord;
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
    });
}

function handleSkipWord(msg) {
    G.fullRoles      = msg.roles;
    G.starterPlayerId = msg.starterPlayerId;
    G.usedWords      = msg.usedWords || G.usedWords;
    if (G.fullRoles[G.myId]) G.myRole = G.fullRoles[G.myId];
    G.roleRevealed = false;
    const card = document.getElementById('role-card');
    if (card) card.className = 'role-card blurred';
    document.getElementById('role-icon').innerHTML = '<img src="' + ICONS.help + '" alt="?" class="role-icon-img">';
    document.getElementById('role-title').textContent = 'SECRETO';
    document.getElementById('role-word').textContent = '???';
    document.getElementById('role-instruction').textContent = 'Toca la carta para revelar';
    const starterInfo = document.getElementById('starter-info');
    if (starterInfo) {
        starterInfo.textContent = 'Inicia: ' + (G.players[G.starterPlayerId]?.name || 'Alguien');
        starterInfo.style.display = 'block';
    }
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
    } else {
        G.roleRevealed = true;
        const roleClass = G.myRole.role === 'INFILTRADO' ? 'impostor' : G.myRole.role === 'CHARLATÁN' ? 'charlatan' : 'citizen';
        if (card) card.className = 'role-card ' + roleClass;
        roleIcon.innerHTML = '<img src="' + G.myRole.icon + '" alt="" class="role-icon-img">';
        roleTitle.textContent = G.myRole.role;
        roleWord.textContent  = G.myRole.word;
        roleInst.textContent  = 'Tu rol (ya revelado)';
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

function revealRole() {
    if (G.roleRevealed) return;
    G.roleRevealed = true;
    const card = document.getElementById('role-card');
    if (card) card.classList.remove('blurred');
    document.getElementById('role-icon').innerHTML = '<img src="' + G.myRole.icon + '" alt="" class="role-icon-img">';
    document.getElementById('role-title').textContent = G.myRole.role;
    document.getElementById('role-word').textContent  = G.myRole.word;
    document.getElementById('role-instruction').textContent = 'Memoriza tu información';
    const roleClass = G.myRole.role === 'INFILTRADO' ? 'impostor' : G.myRole.role === 'CHARLATÁN' ? 'charlatan' : 'citizen';
    if (card) card.classList.add(roleClass);
    showPointsReminder();
    saveSession(); // conservar roleRevealed para restaurar tras F5
}

function showPointsReminder() {
    const box  = document.getElementById('points-box');
    const list = document.getElementById('points-list');
    if (!box || !list) return;
    let html = '';
    if (G.myRole.role === 'CIUDADANO') {
        html = '<li><span class="points-value positive">+' + POINTS.CITIZEN_SURVIVE       + '</span> Sobrevivir</li>' +
               '<li><span class="points-value positive">+' + POINTS.CITIZEN_CORRECT_VOTE  + '</span> Votar bien</li>' +
               '<li><span class="points-value negative">'  + POINTS.CITIZEN_WRONG_VOTE    + '</span> Votar mal</li>';
    } else if (G.myRole.role === 'INFILTRADO') {
        html = '<li><span class="points-value positive">+' + POINTS.IMPOSTOR_WIN           + '</span> Ganar</li>' +
               '<li><span class="points-value positive">+' + POINTS.IMPOSTOR_SURVIVE_ROUND + '</span> Sobrevivir ronda</li>';
    } else {
        html = '<li><span class="points-value positive">+' + POINTS.CHARLATAN_SURVIVE     + '</span> Sobrevivir</li>' +
               '<li><span class="points-value positive">+' + POINTS.CITIZEN_CORRECT_VOTE  + '</span> Votar bien</li>';
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
        '<p>Empieza: <span class="starter-name">' + starterName + '</span></p></div>';
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
    banner.innerHTML = '<img src="' + ICONS.play + '" alt="">Inicia: ' + starterName;
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

    if (G.isSpectator) {
        const btnSpecNext = document.getElementById('btn-spectator-next');
        if (btnSpecNext) { btnSpecNext.style.display = 'none'; btnSpecNext.disabled = true; }
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
    timer.style.display = 'block';
    timer.classList.remove('warning');
    document.getElementById('wait-message').style.display = 'none';
    document.getElementById('points-box').style.display  = 'none';
    let fired = false;
    const tick = function() {
        const remaining = Math.max(0, Math.ceil((G.roundEndTime - serverNow()) / 1000));
        updateTimerDisplay(remaining);
        if (remaining <= 10) timer.classList.add('warning');
        if (remaining <= 0 && !fired) {
            fired = true;
            clearInterval(G.timerInterval);
            G.timerInterval = null;
            timer.textContent = '¡TIEMPO!';
            if (navigator.vibrate) navigator.vibrate([500, 200, 500]);
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
    if (G.isSpectator) {
        const specStatus = document.getElementById('spectator-status');
        if (specStatus) specStatus.textContent = 'Votación...';
        showScreen('screen-spectator');
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
    list.innerHTML = votable.map(function(id) {
        return '<div class="vote-item">' +
            '<div class="vote-avatar">' + renderHexAvatar(id, 48) + '</div>' +
            '<div class="player-info"><div class="player-name">' + (G.players[id]?.name || id) + '</div></div>' +
            '<button class="btn-vote' + (iVoted ? ' voted' : '') + '" data-target="' + id + '"' +
            (iVoted ? ' disabled' : '') + '>' +
            (iVoted ? 'Votado' : 'Votar') + '</button></div>';
    }).join('');
    if (!iVoted) {
        list.querySelectorAll('.btn-vote').forEach(function(btn) {
            btn.onclick = function() { sendVote(btn.dataset.target, btn); };
        });
    } else {
        const voteStatus = document.getElementById('vote-status');
        if (voteStatus) voteStatus.textContent = 'Voto registrado. Esperando...';
    }
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
    // Each player writes their own vote to Firebase (clave propia → sin conflicto)
    G.db.ref('rooms/' + G.channel + '/votes/' + G.myId).set(targetId)
        .catch(function(e) { console.error('Error registrando voto:', e); });
    if (button) {
        button.classList.add('voted');
        button.textContent = 'Votado';
        button.disabled = true;
    }
    document.querySelectorAll('.btn-vote').forEach(function(btn) { btn.disabled = true; });
    const voteStatus = document.getElementById('vote-status');
    if (voteStatus) voteStatus.textContent = 'Voto registrado. Esperando...';
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

        // Points for voters
        Object.entries(G.voteTargets).forEach(function([voterId, targetId]) {
            if (targetId === eliminatedId) {
                if (eliminatedRole === 'INFILTRADO') {
                    G.scores[voterId] = (G.scores[voterId] || 0) + POINTS.CITIZEN_CORRECT_VOTE;
                } else if (!G.impostors.includes(voterId)) {
                    G.scores[voterId] = (G.scores[voterId] || 0) + POINTS.CITIZEN_WRONG_VOTE;
                }
            }
        });

        // Impostors survive-round bonus
        G.impostors.forEach(function(id) {
            G.scores[id] = (G.scores[id] || 0) + POINTS.IMPOSTOR_SURVIVE_ROUND;
        });
    }

    const resultsPayload = {
        votes:         G.votes,
        eliminatedId:  eliminatedId,
        eliminatedName: eliminatedId ? G.players[eliminatedId]?.name : null,
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

    setTimeout(checkGameOver, RESULT_DISPLAY_TIME);
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
        '<h1>HAS SIDO EXPULSADO</h1>' +
        '<p>Eras ' + role + '</p>' +
        '</div>';
    document.body.appendChild(overlay);
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
        document.getElementById('spectator-status').textContent = msg.isTie ? 'Empate' : msg.eliminatedName + ' eliminado';
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
                '<span class="result-name">' + (G.players[id]?.name || id) + '</span>' +
                '</div>' +
                '<span class="result-votes">' + count + ' votos</span>' +
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
                '<div class="eliminated-name">' + msg.eliminatedName + '</div>' +
                '<div class="eliminated-role-container">' +
                '<img src="' + iconSrc + '" alt="" class="eliminated-role-icon">' +
                '<span class="eliminated-role">Era <strong>' + msg.eliminatedRole + '</strong></span></div>';
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
    const btn = document.getElementById('btn-spectator-next');
    if (btn && btn.textContent.includes('Iniciar')) startRound();
    else nextRound();
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

    const card     = document.getElementById('role-card');
    const btnStart = document.getElementById('btn-start-round');
    const btnSkip  = document.getElementById('btn-skip-word');
    G.roleRevealed = true;
    const roleClass = G.myRole.role === 'INFILTRADO' ? 'impostor' : G.myRole.role === 'CHARLATÁN' ? 'charlatan' : 'citizen';
    if (card) card.className = 'role-card ' + roleClass;
    document.getElementById('role-icon').innerHTML = '<img src="' + G.myRole.icon + '" alt="" class="role-icon-img">';
    document.getElementById('role-title').textContent = G.myRole.role;
    document.getElementById('role-word').textContent  = G.myRole.word;
    document.getElementById('role-instruction').textContent = 'Tu rol (conocido)';
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

function checkGameOver() {
    if (!G.isHost || !G.db) return;
    let winner = null;
    let reason = '';
    if (G.impostors.length === 0) {
        winner = 'CIUDADANOS';
        reason = 'Infiltrados eliminados';
        G.citizens.forEach(function(id) {
            if (G.activePlayers.includes(id)) G.scores[id] = (G.scores[id] || 0) + POINTS.CITIZEN_SURVIVE;
        });
        G.charlatans.forEach(function(id) {
            if (G.activePlayers.includes(id)) G.scores[id] = (G.scores[id] || 0) + POINTS.CHARLATAN_SURVIVE;
        });
    } else if (G.activePlayers.length - G.impostors.length <= G.impostors.length) {
        winner = 'INFILTRADOS';
        reason = 'Infiltrados dominan';
        G.impostors.forEach(function(id) {
            G.scores[id] = (G.scores[id] || 0) + POINTS.IMPOSTOR_WIN;
        });
    }
    if (winner) {
        G.db.ref('rooms/' + G.channel + '/state').update({
            gamePhase: 'gameover',
            scores:    G.scores,
            gameOver:  { winner: winner, reason: reason, scores: G.scores, roles: G.fullRoles }
        });
    }
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

    const scoresList = document.getElementById('final-scores');
    if (!scoresList) return;
    const sorted     = Object.entries(G.scores).sort((a, b) => b[1] - a[1]);
    scoresList.innerHTML = '<div class="final-scores-list">' + sorted.map(function([id, score], idx) {
        const p    = G.players[id];
        const role = G.fullRoles[id];
        let rankHtml = '';
        if (idx === 0)      rankHtml = '<div class="score-rank"><img src="' + ICONS.medalGold   + '" alt="1"></div>';
        else if (idx === 1) rankHtml = '<div class="score-rank"><img src="' + ICONS.medalSilver + '" alt="2"></div>';
        else if (idx === 2) rankHtml = '<div class="score-rank"><img src="' + ICONS.medalBronze + '" alt="3"></div>';
        else rankHtml = '<div class="score-rank"><span class="score-rank-number">' + (idx + 1) + '</span></div>';
        return '<div class="score-item">' + rankHtml +
            '<div class="score-avatar">' + renderHexAvatar(id, 44) + '</div>' +
            '<div class="score-info">' +
            '<div class="score-name">'  + (p?.name   || id) + '</div>' +
            '<div class="score-role">'  + (role?.role || '') + '</div>' +
            '</div>' +
            '<div class="score-points">' + score + '</div>' +
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
    G.roundInProgress = false;
    G.resultsPublished = false;
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
    resetGameState();
    showScreen('screen-home');
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
            '<div class="player-name">' + (p?.name || id) + '</div>' +
            '<div class="player-tag">'  + role.role + ' - ' + role.word + '</div>' +
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
            '<div class="player-name">' + (p?.name || id) + '</div>' +
            '<div class="player-tag">'  + (hasVoted ? 'Ha votado' : 'Pendiente') + '</div>' +
            '</div>' +
            '<span>' + votes + ' votos</span>' +
            '</div>';
    }).join('');
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
