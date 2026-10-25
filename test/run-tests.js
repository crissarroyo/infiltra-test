// Matriz de pruebas del paso 5 sobre el arnés multi-cliente.
'use strict';
const { FakeDB } = require('./fake-firebase');
const { SimClient, World, drain, DB_SIZES } = require('./client');

let results = [];
function check(name, cond, detail) {
    results.push({ name, ok: !!cond, detail: cond ? '' : (detail || '') });
    if (!cond) console.log('  FAIL: ' + name + (detail ? ' — ' + detail : ''));
}

function freshWorld() {
    const db = new FakeDB();
    const world = new World(db);
    return { db, world };
}

// setup(host): configura la pantalla de sala ANTES de crearla (la
// config viaja en state/, como en el juego real).
async function makeRoom(db, world, names, setup) {
    const host = new SimClient(names[0], db, world);
    host.setName(names[0]);
    if (setup) setup(host);
    host.eval('createRoom()');
    await world.tick(500);
    const code = host.G().channel;
    const others = [];
    for (let i = 1; i < names.length; i++) {
        const c = new SimClient(names[i], db, world);
        c.setName(names[i]);
        c.w.document.getElementById('input-join-code').value = code;
        c.eval('joinRoom()');
        await world.tick(300);
        others.push(c);
    }
    await world.tick(500);
    return { host, others, code, all: [host].concat(others) };
}

async function playRoundToVoting(world, all) {
    const host = all.find(c => c.G().isHost);
    host.eval('startRound()');
    await world.tick(4000);          // overlay de inicio
    await world.tick(61000, 500);    // ronda de 60s
    await world.tick(1000);          // transición a votación
}

async function voteAll(world, all, targetId) {
    for (const c of all) {
        if (c.G().isSpectator || c.G().eliminated.includes(c.G().myId)) continue;
        c.eval(`sendVote(${JSON.stringify(typeof targetId === 'function' ? targetId(c) : targetId)})`);
        await world.tick(100);
    }
    await world.tick(1500); // debounce + publicación
}

// ── S1: partida completa a 3 ────────────────────────────────────
async function s1() {
    console.log('S1: partida completa a 3 jugadores');
    const { db, world } = freshWorld();
    const { host, others, all } = await makeRoom(db, world, ['Ana', 'Beto', 'Caro']);
    check('S1 lobby: 3 jugadores en host', Object.keys(host.G().players).length === 3, JSON.stringify(Object.keys(host.G().players)));
    check('S1 lobby: no-host ve host', others[0].G().hostId === host.G().myId);
    host.eval('distributeRoles()');
    await world.tick(1000);
    check('S1 roles: fase roles en todos', all.every(c => c.G().gamePhase === 'roles'), all.map(c => c.G().gamePhase).join(','));
    check('S1 roles: todos tienen rol', all.every(c => c.G().myRole && c.G().myRole.word));
    const imp = all.find(c => c.G().myRole.role === 'INFILTRADO');
    check('S1 roles: hay exactamente 1 infiltrado', all.filter(c => c.G().myRole.role === 'INFILTRADO').length === 1);
    const citizens = all.filter(c => c.G().myRole.role !== 'INFILTRADO');
    check('S1 roles: ciudadanos comparten palabra', citizens[0].G().myRole.word === citizens[1].G().myRole.word);
    check('S1 roles: infiltrado ve categoría', imp.G().myRole.word.startsWith('Categoría:'));
    all.forEach(c => c.eval('revealRole()'));
    await playRoundToVoting(world, all);
    check('S1 voting: fase voting en todos', all.every(c => c.G().gamePhase === 'voting'), all.map(c => c.G().gamePhase).join(','));
    const impId = imp.G().myId;
    await voteAll(world, all, (c) => c.G().myId === impId ? citizens[0].G().myId : impId);
    await world.tick(1000);
    check('S1 results: infiltrado eliminado', host.G().eliminated.includes(impId), JSON.stringify(host.G().eliminated));
    await world.tick(6000); // RESULT_DISPLAY_TIME → checkGameOver
    check('S1 gameover: ciudadanos ganan', all.filter(c => c !== imp).every(c => c.G().gamePhase === 'gameover'), all.map(c => c.G().gamePhase).join(','));
    check('S1 gameover: pantalla correcta', citizens[0].screen() === 'screen-gameover', citizens[0].screen());
    check('S1 scores: votantes correctos +7', citizens.every(c => (host.G().scores[c.G().myId] || 0) >= 7), JSON.stringify(host.G().scores));
    check('S1 sin errores JS', all.every(c => c.errors.length === 0), JSON.stringify(all.map(c => c.errors)));
}

// ── S2: partida a 10 + sala llena ───────────────────────────────
async function s2() {
    console.log('S2: partida a 10 jugadores + jugador 11 rechazado');
    const { db, world } = freshWorld();
    const names = 'ABCDEFGHIJ'.split('').map(x => 'J' + x);
    const { host, others, code, all } = await makeRoom(db, world, names);
    check('S2 lobby: 10 jugadores', Object.keys(host.G().players).length === 10, String(Object.keys(host.G().players).length));
    const extra = new SimClient('Extra', db, world);
    extra.setName('Extra');
    extra.w.document.getElementById('input-join-code').value = code;
    extra.eval('joinRoom()');
    await world.tick(3000);
    check('S2 sala llena: 11º expulsado', extra.toasts.some(t => t.m === 'Sala llena'), JSON.stringify(extra.toasts));
    check('S2 sala llena: host sigue con 10', Object.keys(host.G().players).length === 10, String(Object.keys(host.G().players).length));
    host.eval('distributeRoles()');
    await world.tick(1000);
    check('S2 roles asignados a 10', all.every(c => c.G().myRole), all.map(c => !!c.G().myRole).join(','));
    await playRoundToVoting(world, all);
    check('S2 voting alcanzada', all.every(c => c.G().gamePhase === 'voting'));
    const anyImp = all.find(c => c.G().myRole.role === 'INFILTRADO').G().myId;
    await voteAll(world, all, (c) => c.G().myId === anyImp ? all[0].G().myId === anyImp ? all[1].G().myId : all[0].G().myId : anyImp);
    check('S2 eliminación correcta', host.G().eliminated.includes(anyImp));
    check('S2 sin errores JS', all.every(c => c.errors.length === 0), JSON.stringify(all.map(c => c.errors).flat()));
}

// ── S3: host se desconecta a mitad de ronda ─────────────────────
async function s3() {
    console.log('S3: host abandona a mitad de ronda → sucesión automática');
    const { db, world } = freshWorld();
    const { host, others, all } = await makeRoom(db, world, ['Ana', 'Beto', 'Caro', 'Dani']);
    // El host NO es el infiltrado: si lo fuera, su desconexión decide la
    // partida (ganan ciudadanos, ver S19) y no habría votación que probar
    distributeLastIsImpostor(host);
    await world.tick(1000);
    host.eval('startRound()');
    await world.tick(10000);
    const oldHostId = host.G().myId;
    host.disconnect(); // cierra pestaña: onDisconnect marca offline + hostOnline false
    await world.tick(500);
    check('S3 hostOnline false en DB', db._get(['rooms', others[0].G().channel, 'state', 'hostOnline']) === false);
    await world.tick(9000); // gracia de reclamo 8s
    await world.tick(2000);
    const newHost = others.find(c => c.G().isHost);
    check('S3 hay nuevo host', !!newHost, others.map(c => String(c.G().isHost)).join(','));
    if (newHost) {
        check('S3 sucesor = más antiguo (Beto)', newHost.name === 'Beto', newHost.name);
        check('S3 toast de host', newHost.toasts.some(t => t.m === '¡Ahora eres el host!'));
    }
    // La partida continúa hasta votación con el nuevo host
    await world.tick(55000, 500);
    await world.tick(3000);
    check('S3 nuevo host llevó a votación', others.every(c => c.G().gamePhase === 'voting'), others.map(c => c.G().gamePhase).join(','));
    // El viejo host queda eliminado tras la gracia
    check('S3 viejo host eliminado tras gracia', others[0].G().eliminated.includes(oldHostId), JSON.stringify(others[0].G().eliminated));
    check('S3 sin errores JS', others.every(c => c.errors.length === 0), JSON.stringify(others.map(c => c.errors).flat()));
}

// ── S4: F5 en cada fase (no-host) ───────────────────────────────
async function s4() {
    console.log('S4: F5 (recarga) en fases roles / round / voting');
    const { db, world } = freshWorld();
    let { host, others, all } = await makeRoom(db, world, ['Ana', 'Beto', 'Caro']);

    async function refresh(client) {
        const storage = client.storageSnapshot();
        const name = client.name;
        client.disconnect();
        await world.tick(1000); // offline visible, pero dentro de la gracia
        const reborn = new SimClient(name, db, world, storage);
        await world.tick(2000);
        return reborn;
    }

    // Fase roles
    host.eval('distributeRoles()');
    await world.tick(1000);
    let beto = others[0];
    const roleBefore = JSON.stringify(beto.G().myRole);
    beto.eval('revealRole()');
    await world.tick(200);
    beto = await refresh(beto);
    check('S4 roles: reconecta en fase roles', beto.G().gamePhase === 'roles', beto.G().gamePhase);
    check('S4 roles: pantalla de rol', beto.screen() === 'screen-role', beto.screen());
    check('S4 roles: mismo rol restaurado', JSON.stringify(beto.G().myRole) === roleBefore, JSON.stringify(beto.G().myRole));
    check('S4 roles: carta ya revelada', beto.G().roleRevealed === true);
    check('S4 roles: no eliminado (gracia)', !host.G().eliminated.includes(beto.G().myId), JSON.stringify(host.G().eliminated));

    // Fase round
    host.eval('startRound()');
    await world.tick(5000);
    beto = await refresh(beto);
    check('S4 round: reconecta en round', beto.G().gamePhase === 'round', beto.G().gamePhase);
    check('S4 round: timer restaurado y corriendo', beto.G().roundEndTime > 0 && beto.text('timer') !== '', beto.text('timer'));

    // Fase voting
    await world.tick(56000, 500);
    await world.tick(2000);
    check('S4 voting: todos en voting', beto.G().gamePhase === 'voting', beto.G().gamePhase);
    beto.eval(`sendVote(${JSON.stringify(host.G().myId)})`);
    await world.tick(500);
    beto = await refresh(beto);
    check('S4 voting: reconecta en voting', beto.G().gamePhase === 'voting', beto.G().gamePhase);
    check('S4 voting: pantalla de votación', beto.screen() === 'screen-voting', beto.screen());
    check('S4 voting: su voto se conserva', beto.G().hasVotedThisRound === true);
    check('S4 voting: botones deshabilitados', Array.from(beto.w.document.querySelectorAll('.btn-vote')).every(b => b.disabled));
    check('S4 sin errores JS', beto.errors.length === 0, JSON.stringify(beto.errors));
}

// ── S5: dos rondas seguidas ─────────────────────────────────────
async function s5() {
    console.log('S5: dos rondas seguidas (empate → siguiente ronda)');
    const { db, world } = freshWorld();
    const { host, others, all } = await makeRoom(db, world, ['Ana', 'Beto', 'Caro', 'Dani']);
    host.eval('distributeRoles()');
    await world.tick(1000);
    const words1 = host.G().usedWords.slice();
    await playRoundToVoting(world, all);
    // Empate 2-2
    const ids = all.map(c => c.G().myId);
    all[0].eval(`sendVote(${JSON.stringify(ids[1])})`);
    all[1].eval(`sendVote(${JSON.stringify(ids[0])})`);
    all[2].eval(`sendVote(${JSON.stringify(ids[3])})`);
    all[3].eval(`sendVote(${JSON.stringify(ids[2])})`);
    await world.tick(2000);
    check('S5 empate: nadie eliminado', host.G().eliminated.length === 0, JSON.stringify(host.G().eliminated));
    check('S5 empate: pantalla resultados', all[1].screen() === 'screen-results', all[1].screen());
    check('S5 empate: mensaje de empate', all[1].w.document.getElementById('eliminated-box').textContent.includes('Empate'));
    // TIE_BUTTON_DELAY: a los 2.5s (no 5s) aparece el botón del host
    await world.tick(3000);
    check('S5 botón post-empate visible a 2.5s', host.w.document.getElementById('btn-next-round').style.display === 'block');
    host.eval('nextRound()');
    await world.tick(1000);
    check('S5 ronda 2: fase roles', all.every(c => c.G().gamePhase === 'roles'), all.map(c => c.G().gamePhase).join(','));
    check('S5 ronda 2: rol ya revelado', all.every(c => c.G().roleRevealed === true));
    await playRoundToVoting(world, all);
    check('S5 ronda 2: votación alcanzada', all.every(c => c.G().gamePhase === 'voting'));
    check('S5 sin errores JS', all.every(c => c.errors.length === 0), JSON.stringify(all.map(c => c.errors).flat()));
}

// ── S6: votos simultáneos + doble voto ──────────────────────────
async function s6() {
    console.log('S6: votos simultáneos y voto duplicado');
    const { db, world } = freshWorld();
    const { host, others, all } = await makeRoom(db, world, ['Ana', 'Beto', 'Caro', 'Dani']);
    host.eval('distributeRoles()');
    await world.tick(1000);
    await playRoundToVoting(world, all);
    const target = others[0].G().myId;
    // Todos votan en el MISMO tick, sin drenar entre medias
    for (const c of all) {
        if (c.G().myId === target) continue;
        c.eval(`sendVote(${JSON.stringify(target)})`);
    }
    // Intento de voto duplicado inmediato del host hacia otro
    host.eval(`sendVote(${JSON.stringify(others[1].G().myId)})`);
    // La víctima no vota → el cierre llega por timeout del ancla (+2s)
    await world.tick(35000, 500);
    const votes = host.G().votes;
    check('S6 conteo exacto: 3 votos a la víctima', votes[target] === 3, JSON.stringify(votes));
    check('S6 duplicado ignorado', Object.values(votes).reduce((a, b) => a + b, 0) === 3, JSON.stringify(votes));
    check('S6 víctima eliminada', host.G().eliminated.includes(target));
    check('S6 sin errores JS', all.every(c => c.errors.length === 0));
}

// ── S7: cierre de pestaña sin salir (onDisconnect + gracia) ─────
async function s7() {
    console.log('S7: jugador cierra la pestaña sin salir');
    const { db, world } = freshWorld();
    const { host, others, all } = await makeRoom(db, world, ['Ana', 'Beto', 'Caro', 'Dani']);
    host.eval('distributeRoles()');
    await world.tick(1000);
    host.eval('startRound()');
    await world.tick(5000);
    const goneId = others[1].G().myId;
    others[1].disconnect();
    await world.tick(2000);
    check('S7 aún no eliminado (gracia)', !host.G().eliminated.includes(goneId), JSON.stringify(host.G().eliminated));
    await world.tick(10000);
    check('S7 eliminado tras la gracia', host.G().eliminated.includes(goneId), JSON.stringify(host.G().eliminated));
    check('S7 fuera de activePlayers', !host.G().activePlayers.includes(goneId));
    check('S7 sin errores JS', host.errors.length === 0);
}

// ── S8: usedWords agotado ───────────────────────────────────────
async function s8() {
    console.log('S8: agotar palabras de una categoría con skipWord');
    const { db, world } = freshWorld();
    // Solo la categoría más corta (dinámico, robusto a cambios del DB)
    const sizes = DB_SIZES;
    const smallest = Object.entries(sizes).sort((a, b) => a[1] - b[1])[0][0];
    const { host, others, all } = await makeRoom(db, world, ['Ana', 'Beto', 'Caro'], (h) =>
        h.eval(`document.querySelectorAll('.category-item input').forEach(cb => cb.checked = cb.value === ${JSON.stringify(smallest)});`));
    host.eval('distributeRoles()');
    await world.tick(1000);
    // Regresión: la carta del PROPIO host debe refrescarse al cambiar palabra
    host.eval('revealRole()');
    await world.tick(200);
    host.eval('skipWord()');
    await world.tick(500);
    const hostWordInState = db._get(['rooms', host.G().channel, 'state', 'roles', host.G().myId, 'word']);
    check('S8 host ve su palabra nueva tras skipWord', host.G().myRole.word === hostWordInState,
        JSON.stringify({ local: host.G().myRole.word, estado: hostWordInState }));
    check('S8 carta del host re-oculta tras skipWord', host.G().roleRevealed === false && host.text('role-word') === '???',
        host.text('role-word'));
    let resets = 0;
    const iters = Math.ceil(sizes[smallest] / 2) + 2;
    for (let i = 0; i < iters; i++) {
        host.eval('skipWord()');
        await world.tick(500);
        if (host.toasts.some(t => t.m === 'Palabras reiniciadas')) { resets++; host.toasts = host.toasts.filter(t => t.m !== 'Palabras reiniciadas'); }
    }
    check('S8 hubo reinicio de palabras', resets >= 1, String(resets));
    check('S8 la palabra sigue siendo válida', all.every(c => c.G().myRole && c.G().myRole.word && c.G().myRole.word !== '???'), JSON.stringify(all.map(c => c.G().myRole?.word)));
    const words = all.filter(c => c.G().myRole.role !== 'INFILTRADO').map(c => c.G().myRole.word);
    check('S8 charlatán/ciudadanos coherentes', words.length > 0);
    check('S8 sin errores JS', all.every(c => c.errors.length === 0), JSON.stringify(all.map(c => c.errors).flat()));
}

// ── S9: transferencia manual de host ────────────────────────────
async function s9() {
    console.log('S9: transferencia manual de host (long-press → confirmar)');
    const { db, world } = freshWorld();
    const { host, others, all } = await makeRoom(db, world, ['Ana', 'Beto', 'Caro']);
    const betoId = others[0].G().myId;
    host.eval(`confirmHostTransfer(${JSON.stringify(betoId)})`);
    await world.tick(1000);
    check('S9 nuevo host es Beto', others[0].G().isHost === true && host.G().isHost === false);
    check('S9 hostId propagado a todos', all.every(c => c.G().hostId === betoId), all.map(c => c.G().hostId).join(','));
    check('S9 toast a nuevo host', others[0].toasts.some(t => t.m === '¡Ahora eres el host!'));
    check('S9 toast a viejo host', host.toasts.some(t => t.m === 'Ya no eres el host'));
    check('S9 botón distribuir cambia de manos', others[0].w.document.getElementById('btn-distribute').style.display === 'block' && host.w.document.getElementById('btn-distribute').style.display === 'none');
    // Carrera: dos transferencias simultáneas desde el mismo estado
    const caroId = others[1].G().myId;
    others[0].eval(`confirmHostTransfer(${JSON.stringify(caroId)})`);
    host.eval(`confirmHostTransfer(${JSON.stringify(host.G().myId)})`); // el viejo host ya no puede
    await world.tick(1000);
    check('S9 transaction: solo gana el host legítimo', all.every(c => c.G().hostId === caroId), all.map(c => c.G().hostId).join(','));
    check('S9 sin errores JS', all.every(c => c.errors.length === 0));
}

// ── S10: host hace F5 durante la votación ───────────────────────
async function s10() {
    console.log('S10: host recarga (F5) durante la votación');
    const { db, world } = freshWorld();
    let { host, others, all } = await makeRoom(db, world, ['Ana', 'Beto', 'Caro']);
    host.eval('distributeRoles()');
    await world.tick(1000);
    await playRoundToVoting(world, all);
    check('S10 en votación', others.every(c => c.G().gamePhase === 'voting'));
    const storage = host.storageSnapshot();
    host.disconnect();
    await world.tick(2000); // < gracia de reclamo (8s): nadie roba el host
    const reHost = new SimClient('Ana', db, world, storage);
    await world.tick(2000);
    check('S10 host reconecta en voting', reHost.G().gamePhase === 'voting', reHost.G().gamePhase);
    check('S10 sigue siendo host', reHost.G().isHost === true);
    // Los demás votan; el host renacido debe contar y publicar
    const target = others[0].G().myId;
    reHost.eval(`sendVote(${JSON.stringify(target)})`);
    others[0].eval(`sendVote(${JSON.stringify(reHost.G().myId)})`);
    others[1].eval(`sendVote(${JSON.stringify(target)})`);
    await world.tick(3000);
    check('S10 resultados publicados por host renacido', others[1].G().gamePhase === 'results', others[1].G().gamePhase);
    check('S10 eliminado correcto', others[1].G().eliminated.includes(target), JSON.stringify(others[1].G().eliminated));
    check('S10 sin errores JS', reHost.errors.length === 0 && others.every(c => c.errors.length === 0), JSON.stringify(reHost.errors));
}

// ── S11: todos los infiltrados eliminados a la vez (2 imp) ──────
async function s11() {
    console.log('S11: gameover con múltiples infiltrados + dominio de infiltrados');
    const { db, world } = freshWorld();
    // 5 jugadores: 2 infiltrados es el máximo (deben ser menos que el resto)
    const { host, others, all } = await makeRoom(db, world, ['Ana', 'Beto', 'Caro', 'Dani', 'Eva'],
        (h) => { h.w.document.getElementById('config-impostors').value = '2'; });
    host.eval('distributeRoles()');
    await world.tick(1000);
    const imps = all.filter(c => c.G().myRole.role === 'INFILTRADO');
    check('S11 hay 2 infiltrados', imps.length === 2, String(imps.length));
    await playRoundToVoting(world, all);
    // Todos votan al primer infiltrado
    const imp0 = imps[0].G().myId;
    await voteAll(world, all, (c) => c.G().myId === imp0 ? imps[1].G().myId : imp0);
    await world.tick(6000);
    // 4 vivos, 1 infiltrado → sigue la partida
    check('S11 la partida continúa con 1 imp vivo', host.G().gamePhase !== 'gameover', host.G().gamePhase);
    // Dos rondas expulsando inocentes → quedan 1 imp + 1 → INFILTRADOS dominan
    for (let r = 0; r < 2; r++) {
        if (host.G().gamePhase === 'gameover') break;
        host.eval('nextRound()');
        await world.tick(1000);
        await playRoundToVoting(world, all);
        const alive = host.G().activePlayers;
        const impAliveId = imps.map(c => c.G().myId).find(id => alive.includes(id));
        const citAliveId = alive.find(id => id !== impAliveId);
        await voteAll(world, all, (c) => c.G().myId === citAliveId ? impAliveId : citAliveId);
        await world.tick(7000);
    }
    check('S11 gameover: infiltrados dominan', host.G().gamePhase === 'gameover', host.G().gamePhase);
    check('S11 título correcto', host.text('gameover-title')?.includes('INFILTRADOS'), host.text('gameover-title'));
    check('S11 sin errores JS', all.every(c => c.errors.length === 0), JSON.stringify(all.map(c => c.errors).flat()));
}

// ── Utilidades v2.2.0 ───────────────────────────────────────────
// Reparto determinista: con Math.random ≈ 1 el último jugador de la
// lista del host queda de infiltrado (y el penúltimo de charlatán).
function distributeLastIsImpostor(host) {
    host.eval('window.__rnd = Math.random; Math.random = () => 0.999; distributeRoles(); Math.random = window.__rnd;');
}
const byName = (all, n) => all.find(c => c.name === n);
const idOf = (all, n) => byName(all, n).G().myId;
async function tickToVoting(world) {
    await world.tick(4000);
    await world.tick(61000, 500);
    await world.tick(1000);
}

// ── S12: controles del host eliminado (espectador) ──────────────
async function s12() {
    console.log('S12: host eliminado dirige desde espectador (botones por fase)');
    const { db, world } = freshWorld();
    const { host, others, all } = await makeRoom(db, world, ['Ana', 'Beto', 'Caro', 'Dani']);
    distributeLastIsImpostor(host);
    await world.tick(1000);
    check('S12 Dani es infiltrado', byName(all, 'Dani').G().myRole.role === 'INFILTRADO');
    host.eval('startRound()');
    await tickToVoting(world);
    await voteAll(world, all, (c) => c.name === 'Ana' ? idOf(all, 'Beto') : idOf(all, 'Ana'));
    await world.tick(4000);
    const doc = host.w.document;
    check('S12 host es espectador', host.G().isSpectator === true && host.screen() === 'screen-spectator', host.screen());
    check('S12 botón Cambiar Palabra existe en espectador', !!doc.getElementById('btn-spectator-skip'));
    check('S12 resultados: "Siguiente Ronda" visible', doc.getElementById('btn-spectator-next').style.display === 'block' &&
        doc.getElementById('btn-spectator-next').textContent === 'Siguiente Ronda', doc.getElementById('btn-spectator-next').textContent);
    await world.tick(2000);
    host.click('btn-spectator-next');
    await world.tick(1000);
    check('S12 roles: "Iniciar Ronda" + cambiar palabra visibles', doc.getElementById('btn-spectator-next').textContent === 'Iniciar Ronda' &&
        doc.getElementById('btn-spectator-skip').style.display === 'block');
    const wordBefore = byName(all, 'Beto').G().myRole.word;
    host.click('btn-spectator-skip');
    await world.tick(500);
    check('S12 cambiar palabra desde espectador', byName(all, 'Beto').G().myRole.word !== wordBefore);
    host.click('btn-spectator-next');
    await world.tick(1000);
    check('S12 ronda: botones de avance ocultos', doc.getElementById('btn-spectator-next').style.display === 'none' &&
        doc.getElementById('btn-spectator-skip').style.display === 'none');
    await tickToVoting(world);
    check('S12 votación: "Siguiente Ronda" oculto (no corta la votación)', doc.getElementById('btn-spectator-next').style.display === 'none');
    check('S12 sin errores JS', all.every(c => c.errors.length === 0), JSON.stringify(all.map(c => c.errors).flat()));
}

// ── S13: jugador que llega con la partida empezada ──────────────
async function s13() {
    console.log('S13: jugador entra a mitad de partida → espera la siguiente');
    const { db, world } = freshWorld();
    const { host, others, code, all } = await makeRoom(db, world, ['Ana', 'Beto', 'Caro', 'Dani']);
    distributeLastIsImpostor(host);
    await world.tick(1000);
    host.eval('startRound()');
    await world.tick(5000);
    const eva = new SimClient('Eva', db, world);
    eva.setName('Eva');
    eva.w.document.getElementById('input-join-code').value = code;
    eva.eval('joinRoom()');
    await world.tick(2000);
    check('S13 Eva espera en el lobby', eva.screen() === 'screen-lobby' && eva.G().waitingNextGame === true, eva.screen());
    check('S13 aviso de partida en curso', /partida en curso/i.test(eva.text('lobby-status')) &&
        eva.w.document.getElementById('lobby-status').style.display === 'block', eva.text('lobby-status'));
    await world.tick(60000, 500);
    await world.tick(1000);
    check('S13 Eva no ve la votación', eva.screen() === 'screen-lobby', eva.screen());
    await voteAll(world, all, (c) => c.name === 'Dani' ? idOf(all, 'Ana') : idOf(all, 'Dani'));
    await world.tick(7000);
    check('S13 gameover para jugadores, Eva sigue esperando', host.G().gamePhase === 'gameover' && eva.screen() === 'screen-lobby');
    check('S13 Eva no aparece en el marcador final de una partida que no jugó', !host.text('final-scores').includes('Eva'), host.text('final-scores'));
    host.eval('backToLobby()');
    await world.tick(1000);
    check('S13 de vuelta al lobby: aviso oculto', eva.w.document.getElementById('lobby-status').style.display === 'none' && eva.G().waitingNextGame === false);
    host.eval('distributeRoles()');
    await world.tick(1000);
    check('S13 Eva juega la siguiente partida', !!eva.G().myRole && eva.screen() === 'screen-role', eva.screen());
    check('S13 sin errores JS', all.concat([eva]).every(c => c.errors.length === 0), JSON.stringify(all.concat([eva]).map(c => c.errors).flat()));
}

// ── S14: config de sala y roles verdaderos tras cambio de host ──
async function s14() {
    console.log('S14: host heredado reparte con la config de la sala y respeta al charlatán');
    const { db, world } = freshWorld();
    const { host, others, all } = await makeRoom(db, world, ['Ana', 'Beto', 'Caro', 'Dani', 'Eva'], (h) => {
        h.w.document.getElementById('config-charlatans').value = '1';
    });
    host.eval(`confirmHostTransfer(${JSON.stringify(idOf(all, 'Beto'))})`);
    await world.tick(1000);
    const beto = byName(all, 'Beto');
    check('S14 Beto es host', beto.G().isHost === true);
    beto.eval('distributeRoles()');
    await world.tick(1000);
    const roles = Object.values(host.G().trueRoles);
    check('S14 config de sala respetada (1 charlatán)', roles.filter(r => r === 'CHARLATÁN').length === 1, JSON.stringify(roles));
    beto.eval(`confirmHostTransfer(${JSON.stringify(idOf(all, 'Caro'))})`);
    await world.tick(1000);
    const caro = byName(all, 'Caro');
    check('S14 Caro es host a mitad de partida', caro.G().isHost === true);
    caro.eval('skipWord()');
    await world.tick(1000);
    const tr = caro.G().trueRoles;
    const charl = all.find(c => tr[c.G().myId] === 'CHARLATÁN');
    const cit = all.find(c => tr[c.G().myId] === 'CIUDADANO');
    check('S14 tras cambiar palabra, el charlatán conserva palabra falsa', charl && cit &&
        charl.G().myRole.word !== cit.G().myRole.word && charl.G().myRole.cat === cit.G().myRole.cat,
        JSON.stringify({ charl: charl?.G().myRole, cit: cit?.G().myRole }));
    check('S14 sin errores JS', all.every(c => c.errors.length === 0), JSON.stringify(all.map(c => c.errors).flat()));
}

// ── S15: puntos por voto (como se anuncian) ─────────────────────
async function s15() {
    console.log('S15: puntos +7 / -3 por cada voto y +5 al infiltrado en empate');
    {
        const { db, world } = freshWorld();
        const { host, all } = await makeRoom(db, world, ['Ana', 'Beto', 'Caro', 'Dani']);
        distributeLastIsImpostor(host);
        await world.tick(1000);
        host.eval('startRound()');
        await tickToVoting(world);
        const plan = { Ana: 'Dani', Beto: 'Dani', Caro: 'Ana', Dani: 'Beto' };
        await voteAll(world, all, (c) => idOf(all, plan[c.name]));
        const s = host.G().scores;
        const sc = (n) => s[idOf(all, n)] || 0;
        check('S15 voto correcto aunque haya más votos: +7', sc('Ana') === 7 && sc('Beto') === 7, JSON.stringify(s));
        check('S15 voto a inocente: -3 aunque no salga eliminado', sc('Caro') === -3, JSON.stringify(s));
        check('S15 infiltrado no puntúa por votar', sc('Dani') === 0, JSON.stringify(s));
        await world.tick(7000);
        check('S15 final: +15 a ciudadanos vivos', sc('Ana') === 22 && sc('Caro') === 12, JSON.stringify(host.G().scores));
    }
    {
        const { db, world } = freshWorld();
        const { host, all } = await makeRoom(db, world, ['Ana', 'Beto', 'Caro', 'Dani', 'Eva']);
        distributeLastIsImpostor(host);
        await world.tick(1000);
        host.eval('startRound()');
        await tickToVoting(world);
        const plan = { Ana: 'Beto', Beto: 'Ana', Caro: 'Ana', Dani: 'Beto', Eva: 'Caro' };
        await voteAll(world, all, (c) => idOf(all, plan[c.name]));
        const s = host.G().scores;
        check('S15 empate: nadie eliminado', host.G().eliminated.length === 0);
        check('S15 empate: infiltrado +5 por sobrevivir la ronda', (s[idOf(all, 'Eva')] || 0) === 5, JSON.stringify(s));
        check('S15 empate: votos a inocentes -3', ['Ana', 'Beto', 'Caro', 'Dani'].every(n => (s[idOf(all, n)] || 0) === -3), JSON.stringify(s));
    }
}

// ── S16: fin de partida diferido no pisa al lobby / nextRound ───
async function s16() {
    console.log('S16: volver a sala o "siguiente ronda" antes del chequeo de fin');
    {
        const { db, world } = freshWorld();
        const { host, all } = await makeRoom(db, world, ['Ana', 'Beto', 'Caro']);
        distributeLastIsImpostor(host);
        await world.tick(1000);
        host.eval('startRound()');
        await tickToVoting(world);
        await voteAll(world, all, (c) => c.name === 'Caro' ? idOf(all, 'Ana') : idOf(all, 'Caro'));
        host.eval('backToLobby()');
        await world.tick(8000);
        check('S16 volver a sala: se queda en lobby', all.every(c => c.G().gamePhase === 'lobby'), all.map(c => c.G().gamePhase).join(','));
    }
    {
        const { db, world } = freshWorld();
        const { host, all } = await makeRoom(db, world, ['Ana', 'Beto', 'Caro']);
        distributeLastIsImpostor(host);
        await world.tick(1000);
        host.eval('startRound()');
        await tickToVoting(world);
        await voteAll(world, all, (c) => c.name === 'Caro' ? idOf(all, 'Ana') : idOf(all, 'Caro'));
        host.eval('nextRound()');
        await world.tick(8000);
        check('S16 siguiente ronda con partida decidida → gameover', all.every(c => c.G().gamePhase === 'gameover'), all.map(c => c.G().gamePhase).join(','));
        const s = host.G().scores;
        check('S16 puntos finales sumados una sola vez', (s[idOf(all, 'Ana')] || 0) === 22, JSON.stringify(s));
    }
}

// ── S17: host cae con la ronda ya vencida ───────────────────────
async function s17() {
    console.log('S17: host se cae justo al terminar la ronda → el nuevo abre la votación');
    const { db, world } = freshWorld();
    const { host, others, all } = await makeRoom(db, world, ['Ana', 'Beto', 'Caro', 'Dani']);
    host.eval('distributeRoles()');
    await world.tick(1000);
    host.eval('startRound()');
    await world.tick(59800, 200);
    host.disconnect();
    await world.tick(15000);
    check('S17 nuevo host', others.some(c => c.G().isHost));
    check('S17 la partida pasó a votación', others.every(c => c.G().gamePhase === 'voting'), others.map(c => c.G().gamePhase).join(','));
    check('S17 sin errores JS', others.every(c => c.errors.length === 0), JSON.stringify(others.map(c => c.errors).flat()));
}

// ── S18: nombre con HTML ────────────────────────────────────────
async function s18() {
    console.log('S18: un nombre con HTML se muestra como texto');
    const { db, world } = freshWorld();
    const { host, others, all } = await makeRoom(db, world, ['<b id=pwn>x</b>', 'Beto', 'Caro']);
    const beto = others[0];
    check('S18 no se inyecta HTML en la lista', !beto.w.document.getElementById('pwn') &&
        beto.w.document.getElementById('player-list').textContent.includes('<b id=pwn>'), beto.text('player-list'));
    host.eval('distributeRoles()');
    await world.tick(1000);
    host.eval('startRound()');
    await tickToVoting(world);
    check('S18 votación sin HTML inyectado', !beto.w.document.getElementById('pwn'));
    check('S18 sin errores JS', all.every(c => c.errors.length === 0));
}

// ── S19: el último infiltrado se desconecta a mitad de ronda ────
async function s19() {
    console.log('S19: el último infiltrado se desconecta → ganan ciudadanos');
    const { db, world } = freshWorld();
    const { host, all } = await makeRoom(db, world, ['Ana', 'Beto', 'Caro', 'Dani']);
    distributeLastIsImpostor(host);
    await world.tick(1000);
    host.eval('startRound()');
    await world.tick(5000);
    byName(all, 'Dani').disconnect();
    await world.tick(13000);
    const rest = all.filter(c => c.name !== 'Dani');
    check('S19 gameover', rest.every(c => c.G().gamePhase === 'gameover'), rest.map(c => c.G().gamePhase).join(','));
    check('S19 ganan ciudadanos', host.text('gameover-title').includes('CIUDADANOS'), host.text('gameover-title'));
    check('S19 sin errores JS', rest.every(c => c.errors.length === 0), JSON.stringify(rest.map(c => c.errors).flat()));
}

// ── S20: código inexistente y límites de configuración ──────────
async function s20() {
    console.log('S20: unirse a sala inexistente y config acotada');
    const { db, world } = freshWorld();
    const c = new SimClient('Solo', db, world);
    c.setName('Solo');
    c.w.document.getElementById('input-join-code').value = 'ZZZZ';
    c.eval('joinRoom()');
    await world.tick(1000);
    check('S20 toast sala no encontrada', c.toasts.some(t => t.m === 'Sala no encontrada'), JSON.stringify(c.toasts));
    check('S20 no deja basura en rooms/', db._get(['rooms', 'ZZZZ']) === null);
    check('S20 sigue en inicio', c.screen() === 'screen-home', c.screen());
    // max jugadores 2 → se acota a 3; 5 infiltrados con 10 → no se crea
    const h = new SimClient('Host', db, world);
    h.setName('Host');
    h.w.document.getElementById('config-impostors').value = '5';
    h.eval('createRoom()');
    await world.tick(500);
    check('S20 5 infiltrados con 10 jugadores: bloqueado', !h.G().channel, String(h.G().channel));
    h.w.document.getElementById('config-impostors').value = '1';
    h.w.document.getElementById('config-max-players').value = '2';
    h.eval('createRoom()');
    await world.tick(500);
    check('S20 máx. jugadores acotado a 3', db._get(['rooms', h.G().channel, 'state', 'maxPlayers']) === 3);
    check('S20 sin errores JS', c.errors.length === 0 && h.errors.length === 0);
}

// ── S21: sonido con Web Audio simulado ──────────────────────────
async function s21() {
    console.log('S21: sonido (Web Audio) y silencio persistente');
    const { db, world } = freshWorld();
    const { host, all } = await makeRoom(db, world, ['Ana', 'Beto', 'Caro']);
    const beto = byName(all, 'Beto');
    beto.eval(`window.__osc = 0; window.AudioContext = function() {
        this.state = 'running'; this.currentTime = 0; this.destination = {};
        this.resume = () => {};
        this.createOscillator = () => { window.__osc++; return { type: '', frequency: {}, connect() {}, start() {}, stop() {} }; };
        this.createGain = () => ({ gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} });
    };`);
    beto.w.document.dispatchEvent(new beto.w.Event('pointerdown'));
    host.eval('distributeRoles()');
    await world.tick(1000);
    beto.eval('revealRole()');
    check('S21 suena al revelar el rol', beto.eval('window.__osc') > 0, String(beto.eval('window.__osc')));
    beto.click('btn-sound');
    check('S21 silencio guardado', beto.w.localStorage.getItem('infiltra_sound') === 'off');
    const n = beto.eval('window.__osc');
    host.eval('startRound()');
    await world.tick(4000);
    check('S21 silenciado no suena', beto.eval('window.__osc') === n);
    check('S21 sin errores JS', beto.errors.length === 0, JSON.stringify(beto.errors));
}

// ── S22: quien espera la siguiente partida no hereda el host ────
async function s22() {
    console.log('S22: jugador en espera (joinedAt viejo) no hereda el host a mitad de partida');
    const { db, world } = freshWorld();
    const { host, others, code, all } = await makeRoom(db, world, ['Ana', 'Eva', 'Beto', 'Caro', 'Dani']);
    const eva = byName(all, 'Eva');
    eva.eval('exitGame()');            // sale antes del reparto (conserva su joinedAt)
    await world.tick(500);
    distributeLastIsImpostor(host);    // el host no es el infiltrado (ver S19)
    await world.tick(1000);
    host.eval('startRound()');
    await world.tick(5000);
    eva.w.document.getElementById('input-join-code').value = code;
    eva.eval('joinRoom()');
    await world.tick(2000);
    check('S22 Eva espera', eva.G().waitingNextGame === true);
    host.disconnect();
    await world.tick(70000, 500);
    const rest = all.filter(c => c !== host);
    check('S22 Eva no es host', eva.G().isHost === false);
    check('S22 el nuevo host es un jugador de la partida', rest.some(c => c !== eva && c.G().isHost), rest.map(c => c.name + ':' + c.G().isHost).join(' '));
    check('S22 la partida avanza a votación', rest.filter(c => c !== eva).every(c => c.G().gamePhase === 'voting'), rest.map(c => c.G().gamePhase).join(','));
    check('S22 sin falso fin de partida', db._get(['rooms', code, 'state', 'gamePhase']) !== 'gameover');
    check('S22 sin errores JS', rest.every(c => c.errors.length === 0), JSON.stringify(rest.map(c => c.errors).flat()));
}

// ── S23: ayuda como ventana y voto propio marcado ──────────────
async function s23() {
    console.log('S23: ayuda abre/cierra con el mismo botón; voto propio marcado');
    const { db, world } = freshWorld();
    const { host, all } = await makeRoom(db, world, ['Ana', 'Beto', 'Caro']);
    const beto = byName(all, 'Beto');
    const modal = () => beto.w.document.getElementById('help-modal');
    check('S23 ayuda cerrada al inicio', modal().hidden === true);
    beto.click('btn-help');
    check('S23 primer toque abre', modal().hidden === false && beto.w.document.getElementById('btn-help').classList.contains('active'));
    check('S23 la pantalla de fondo no cambia', beto.screen() === 'screen-lobby', beto.screen());
    beto.click('btn-help');
    check('S23 segundo toque cierra', modal().hidden === true && !beto.w.document.getElementById('btn-help').classList.contains('active'));
    beto.click('btn-help');
    beto.w.document.dispatchEvent(new beto.w.KeyboardEvent('keydown', { key: 'Escape' }));
    check('S23 Esc cierra', modal().hidden === true);
    beto.click('btn-help');
    beto.w.document.querySelector('#help-modal .help-backdrop').click();
    check('S23 tocar el fondo cierra', modal().hidden === true);
    beto.click('btn-help');
    distributeLastIsImpostor(host);
    await world.tick(1000);
    host.eval('startRound()');
    await world.tick(500);
    check('S23 la ayuda se cierra sola al iniciar la ronda', modal().hidden === true);
    await tickToVoting(world);
    const target = idOf(all, 'Caro');
    const btn = Array.from(beto.w.document.querySelectorAll('.btn-vote')).find(b => b.dataset.target === target);
    btn.click();
    await world.tick(300);
    const item = btn.closest('.vote-item');
    check('S23 voto propio marcado', item.classList.contains('my-vote') && btn.textContent === 'Tu voto', btn.textContent);
    check('S23 progreso de votos visible', /han votado/.test(beto.text('vote-status')), beto.text('vote-status'));
    check('S23 sin errores JS', all.every(c => c.errors.length === 0), JSON.stringify(all.map(c => c.errors).flat()));
}

// ── S24: la carta se revela y se oculta con cada toque ──────────
async function s24() {
    console.log('S24: tocar la carta revela y vuelve a ocultar');
    const { db, world } = freshWorld();
    const { host, all } = await makeRoom(db, world, ['Ana', 'Beto', 'Caro']);
    distributeLastIsImpostor(host);
    await world.tick(1000);
    const beto = byName(all, 'Beto');
    const card = () => beto.w.document.getElementById('role-card');
    check('S24 empieza oculta', card().classList.contains('blurred') && beto.text('role-word') === '???');
    beto.click('role-card');
    check('S24 primer toque revela', !card().classList.contains('blurred') && beto.text('role-word') === beto.G().myRole.word, beto.text('role-word'));
    check('S24 recordatorio de puntos al revelar', beto.w.document.getElementById('points-box').style.display === 'block');
    beto.click('role-card');
    check('S24 segundo toque oculta', card().classList.contains('blurred') && beto.text('role-word') === '???', beto.text('role-word'));
    beto.click('role-card');
    check('S24 tercer toque revela otra vez', !card().classList.contains('blurred') && beto.G().roleRevealed === true);
    host.eval('startRound()');
    await world.tick(4500);
    beto.click('role-card');
    check('S24 también se oculta durante la ronda', card().classList.contains('blurred'));
    check('S24 el recordatorio no reaparece en la ronda', beto.w.document.getElementById('points-box').style.display === 'none');
    check('S24 sin errores JS', all.every(c => c.errors.length === 0), JSON.stringify(all.map(c => c.errors).flat()));
}

// ── S25: fin de partida para espectadores y para todos ──────────
async function s25() {
    console.log('S25: fin de partida (espectador, resumen, espera, nueva partida, host que se va)');
    {
        const { db, world } = freshWorld();
        const { host, all } = await makeRoom(db, world, ['Ana', 'Beto', 'Caro']);
        distributeLastIsImpostor(host); // Caro infiltrada
        await world.tick(1000);
        host.eval('startRound()');
        await tickToVoting(world);
        const plan = { Ana: 'Beto', Caro: 'Beto', Beto: 'Caro' };
        await voteAll(world, all, (c) => idOf(all, plan[c.name]));
        const beto = byName(all, 'Beto'), caro = byName(all, 'Caro');
        await world.tick(3500);
        check('S25 expulsado pasa a espectador', beto.G().isSpectator && beto.screen() === 'screen-spectator', beto.screen());
        await world.tick(3000);
        check('S25 todos ven el final (también el espectador)', all.every(c => c.screen() === 'screen-gameover'), all.map(c => c.screen()).join(','));
        check('S25 ganan infiltrados', host.text('gameover-title').includes('INFILTRADOS'), host.text('gameover-title'));
        const summary = beto.text('game-summary');
        const secret = host.G().fullRoles[idOf(all, 'Ana')].word;
        check('S25 resumen con la palabra secreta', summary.includes(secret), summary);
        check('S25 resumen revela al infiltrado', summary.includes('Caro'), summary);
        check('S25 historial de la ronda', summary.includes('Beto fue expulsado') && summary.includes('CIUDADANO'), summary);
        check('S25 no-host ve "esperando al host"', beto.w.document.getElementById('gameover-wait').style.display === 'block' &&
            caro.w.document.getElementById('gameover-wait').style.display === 'block' &&
            host.w.document.getElementById('gameover-wait').style.display === 'none');
        check('S25 solo el host tiene "Volver a sala"', host.w.document.getElementById('btn-back-to-lobby').style.display === 'block' &&
            beto.w.document.getElementById('btn-back-to-lobby').style.display === 'none');
        check('S25 barra de reacciones en el final', !!beto.w.document.querySelector('#screen-gameover .reaction-bar'));
        host.eval('backToLobby()');
        await world.tick(1000);
        check('S25 todos vuelven a la sala', all.every(c => c.screen() === 'screen-lobby'), all.map(c => c.screen()).join(','));
        check('S25 el espectador deja de serlo', beto.G().isSpectator === false);
        check('S25 historial limpio para la siguiente', all.every(c => (c.G().history || []).length === 0));
        host.eval('distributeRoles()');
        await world.tick(1000);
        check('S25 el ex espectador juega la nueva partida', !!beto.G().myRole && beto.screen() === 'screen-role', beto.screen());
        check('S25 sin errores JS', all.every(c => c.errors.length === 0), JSON.stringify(all.map(c => c.errors).flat()));
    }
    {
        // Carrera: el host pulsa "siguiente" con la partida decidida antes de
        // que el expulsado pase a espectador → el final no se tapa.
        const { db, world } = freshWorld();
        const { host, all } = await makeRoom(db, world, ['Ana', 'Beto', 'Caro']);
        distributeLastIsImpostor(host);
        await world.tick(1000);
        host.eval('startRound()');
        await tickToVoting(world);
        const plan = { Ana: 'Caro', Beto: 'Caro', Caro: 'Ana' };
        await voteAll(world, all, (c) => idOf(all, plan[c.name]));
        host.eval('nextRound()');
        await world.tick(4500);
        const caro = byName(all, 'Caro');
        check('S25 el expulsado se queda en el final', caro.screen() === 'screen-gameover', caro.screen());
        check('S25 sin overlay colgado', !caro.w.document.getElementById('you-eliminated-overlay'));
    }
    {
        // El host se va en la pantalla final: el nuevo host puede volver a la sala
        const { db, world } = freshWorld();
        const { host, others, all } = await makeRoom(db, world, ['Ana', 'Beto', 'Caro']);
        distributeLastIsImpostor(host);
        await world.tick(1000);
        host.eval('startRound()');
        await tickToVoting(world);
        await voteAll(world, all, (c) => c.name === 'Caro' ? idOf(all, 'Ana') : idOf(all, 'Caro'));
        await world.tick(6000);
        check('S25b fin de partida', others.every(c => c.G().gamePhase === 'gameover'));
        host.disconnect();
        await world.tick(12000);
        const newHost = others.find(c => c.G().isHost);
        check('S25b hay nuevo host en el final', !!newHost);
        if (newHost) {
            check('S25b el nuevo host ve "Volver a sala"', newHost.w.document.getElementById('btn-back-to-lobby').style.display === 'block');
            newHost.eval('backToLobby()');
            await world.tick(1000);
            check('S25b todos en la sala', others.every(c => c.screen() === 'screen-lobby'), others.map(c => c.screen()).join(','));
        }
    }
}

// ── S26: reacciones y ajustes ────────────────────────────────────
async function s26() {
    console.log('S26: reacciones rápidas y ajustes persistentes');
    const { db, world } = freshWorld();
    const { host, all } = await makeRoom(db, world, ['Ana', 'Beto', 'Caro']);
    distributeLastIsImpostor(host);
    await world.tick(1000);
    host.eval('startRound()');
    await tickToVoting(world);
    const beto = byName(all, 'Beto');
    check('S26 barra de reacciones en votación', beto.w.document.querySelectorAll('#screen-voting .btn-reaction').length === 7);
    beto.w.document.querySelector('#screen-voting .btn-reaction[data-e="😂"]').click();
    await world.tick(300);
    const bubbles = (c) => Array.from(c.w.document.querySelectorAll('.reaction-bubble')).map(b => b.textContent);
    check('S26 los demás ven la reacción con el nombre', bubbles(host).some(t => t.includes('😂') && t.includes('Beto')), JSON.stringify(bubbles(host)));
    check('S26 quien reacciona la ve como "Tú"', bubbles(beto).some(t => t.includes('Tú')));
    beto.eval("sendReaction('😱')");
    await world.tick(300);
    check('S26 sin spam (1 por segundo)', !bubbles(host).some(t => t.includes('😱')));
    await world.tick(1500);
    beto.eval("sendReaction('<img src=x>')");
    db._set(['rooms', host.G().channel, 'players', idOf(all, 'Caro'), 'reaction'], { e: '<b id=pwn>', t: world.nowMs });
    await world.tick(300);
    check('S26 emojis fuera de la lista se ignoran', !host.w.document.getElementById('pwn') && !bubbles(host).some(t => t.includes('<')));
    await world.tick(3000);
    check('S26 las burbujas desaparecen', bubbles(host).length === 0, JSON.stringify(bubbles(host)));
    // Ajustes
    beto.click('btn-settings');
    const sm = beto.w.document.getElementById('settings-modal');
    check('S26 ajustes abre con su botón', sm.hidden === false);
    const clicks = beto.w.document.getElementById('set-clicks');
    clicks.checked = false;
    clicks.dispatchEvent(new beto.w.Event('change'));
    const sfx = beto.w.document.getElementById('set-sfx');
    sfx.value = '30';
    sfx.dispatchEvent(new beto.w.Event('input'));
    const saved = JSON.parse(beto.w.localStorage.getItem('infiltra_settings') || '{}');
    check('S26 ajustes guardados', saved.clicks === false && Math.abs(saved.sfx - 0.3) < 0.01, JSON.stringify(saved));
    beto.click('btn-help');
    check('S26 abrir ayuda cierra ajustes', sm.hidden === true && beto.w.document.getElementById('help-modal').hidden === false);
    beto.click('btn-help');
    const motion = beto.w.document.getElementById('set-motion');
    beto.click('btn-settings');
    motion.checked = true;
    motion.dispatchEvent(new beto.w.Event('change'));
    check('S26 reducir animaciones aplica clase', beto.w.document.body.classList.contains('reduce-motion'));
    check('S26 sin errores JS', all.every(c => c.errors.length === 0), JSON.stringify(all.map(c => c.errors).flat()));
}

// ── S27: reacciones visibles para todos (v2.4.1) ────────────────
async function s27() {
    console.log('S27: reacciones junto al nombre, línea fija y error de escritura visible');
    const { db, world } = freshWorld();
    const { host, all } = await makeRoom(db, world, ['Ana', 'Beto', 'Caro']);
    distributeLastIsImpostor(host);
    await world.tick(1000);
    host.eval('startRound()');
    await tickToVoting(world);
    const beto = byName(all, 'Beto');
    const caro = byName(all, 'Caro');
    const caroId = idOf(all, 'Caro');
    const badge = (c, id) => {
        const btn = c.w.document.querySelector('.btn-vote[data-target="' + id + '"]');
        const b = btn && btn.closest('.vote-item').querySelector('.row-reaction');
        return b ? b.textContent : null;
    };
    const feed = (c) => (c.w.document.querySelector('#screen-voting .reaction-feed') || {}).textContent || '';
    caro.eval("sendReaction('🤔')");
    await world.tick(300);
    check('S27 el emoji aparece junto al nombre en la votación de los demás', badge(host, caroId) === '🤔' && badge(beto, caroId) === '🤔', badge(host, caroId) + '/' + badge(beto, caroId));
    check('S27 línea fija con quién reaccionó', feed(host).includes('Caro') && feed(host).includes('🤔') && feed(caro).includes('Tú'), feed(host) + ' | ' + feed(caro));
    await world.tick(3200);
    check('S27 el emoji junto al nombre se quita solo', badge(host, caroId) === null);
    check('S27 la línea fija se queda', feed(host).includes('Caro'));
    // Firebase rechaza la escritura (p. ej. reglas): se avisa una sola vez
    beto.eval(`(function() {
        const orig = G.db.ref.bind(G.db);
        G.db.ref = function(p) {
            const r = orig(p);
            if (String(p || '').endsWith('/reaction')) r.set = function() { return Promise.reject(new Error('PERMISSION_DENIED')); };
            return r;
        };
    })()`);
    const toasts = () => Array.from(beto.w.document.querySelectorAll('.toast')).filter(t => /reacción/.test(t.textContent)).length;
    beto.eval("sendReaction('😂')");
    await world.tick(200);
    check('S27 si Firebase rechaza la reacción se avisa', toasts() === 1, String(toasts()));
    await world.tick(1300);
    beto.eval("sendReaction('😱')");
    await world.tick(200);
    check('S27 el aviso sale una sola vez', toasts() === 1, String(toasts()));
    check('S27 sin errores JS', all.every(c => c.errors.length === 0), JSON.stringify(all.map(c => c.errors).flat()));
}

(async () => {
    const scenarios = [s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11, s12, s13, s14, s15, s16, s17, s18, s19, s20, s21, s22, s23, s24, s25, s26, s27];
    for (const s of scenarios) {
        try { await s(); }
        catch (e) { results.push({ name: s.name + ' (excepción)', ok: false, detail: e.stack?.split('\n').slice(0, 3).join(' | ') }); console.log('  EXCEPTION in ' + s.name + ': ' + e.message); }
    }
    const pass = results.filter(r => r.ok).length;
    console.log('\n==== RESUMEN: ' + pass + '/' + results.length + ' checks OK ====');
    results.filter(r => !r.ok).forEach(r => console.log('FALLO: ' + r.name + ' — ' + r.detail));
    process.exit(results.every(r => r.ok) ? 0 : 1);
})();
