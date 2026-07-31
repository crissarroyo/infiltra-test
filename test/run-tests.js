// Matriz de pruebas del paso 5 sobre el arnés multi-cliente.
'use strict';
const { FakeDB } = require('./fake-firebase');
const { SimClient, World, drain } = require('./client');

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

async function makeRoom(db, world, names) {
    const host = new SimClient(names[0], db, world);
    host.setName(names[0]);
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
    host.eval('distributeRoles()');
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
    const { host, others, all } = await makeRoom(db, world, ['Ana', 'Beto', 'Caro']);
    // Solo la categoría más corta: Superhéroes (12 palabras)
    host.eval(`document.querySelectorAll('.category-item input').forEach(cb => cb.checked = cb.value === 'Superhéroes'); updateSelectedCategories();`);
    host.eval('distributeRoles()');
    await world.tick(1000);
    let resets = 0;
    for (let i = 0; i < 8; i++) {
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
    const { host, others, all } = await makeRoom(db, world, ['Ana', 'Beto', 'Caro', 'Dani']);
    host.w.document.getElementById('config-impostors').value = '2';
    host.eval('distributeRoles()');
    await world.tick(1000);
    const imps = all.filter(c => c.G().myRole.role === 'INFILTRADO');
    check('S11 hay 2 infiltrados', imps.length === 2, String(imps.length));
    await playRoundToVoting(world, all);
    // Todos votan al primer infiltrado
    const imp0 = imps[0].G().myId;
    await voteAll(world, all, (c) => c.G().myId === imp0 ? imps[1].G().myId : imp0);
    await world.tick(6000);
    // 3 vivos, 1 infiltrado → 3-1=2 > 1 → sigue la partida
    check('S11 la partida continúa con 1 imp vivo', host.G().gamePhase !== 'gameover', host.G().gamePhase);
    host.eval('nextRound()');
    await world.tick(1000);
    await playRoundToVoting(world, all);
    // Ahora votan a un ciudadano → quedan 2: 1 imp + 1 cit → INFILTRADOS dominan
    const alive = host.G().activePlayers;
    const impAliveId = imps.map(c => c.G().myId).find(id => alive.includes(id));
    const citAliveId = alive.find(id => id !== impAliveId);
    await voteAll(world, all, (c) => c.G().myId === citAliveId ? impAliveId : citAliveId);
    await world.tick(7000);
    check('S11 gameover: infiltrados dominan', host.G().gamePhase === 'gameover', host.G().gamePhase);
    check('S11 título correcto', host.text('gameover-title')?.includes('INFILTRADOS'), host.text('gameover-title'));
    check('S11 sin errores JS', all.every(c => c.errors.length === 0), JSON.stringify(all.map(c => c.errors).flat()));
}

(async () => {
    const scenarios = [s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11];
    for (const s of scenarios) {
        try { await s(); }
        catch (e) { results.push({ name: s.name + ' (excepción)', ok: false, detail: e.stack?.split('\n').slice(0, 3).join(' | ') }); console.log('  EXCEPTION in ' + s.name + ': ' + e.message); }
    }
    const pass = results.filter(r => r.ok).length;
    console.log('\n==== RESUMEN: ' + pass + '/' + results.length + ' checks OK ====');
    results.filter(r => !r.ok).forEach(r => console.log('FALLO: ' + r.name + ' — ' + r.detail));
    process.exit(results.every(r => r.ok) ? 0 : 1);
})();
