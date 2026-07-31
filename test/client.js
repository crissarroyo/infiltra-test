// Cliente simulado: jsdom + reloj virtual + fake Firebase compartido.
'use strict';
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const FakeTimers = require('@sinonjs/fake-timers');

const REPO = path.resolve(__dirname, '../beta');
const GAME_HTML = fs.readFileSync(path.join(REPO, 'game.html'), 'utf8')
    .replace(/<script[^>]*src=[^>]*><\/script>/g, '')   // sin scripts externos
    .replace(/<script[\s\S]*?<\/script>/g, '');          // sin inline (gtag)
const GAME_JS = fs.readFileSync(path.join(REPO, 'js/game.js'), 'utf8');

let clientSeq = 0;

class SimClient {
    constructor(name, fakeDb, world, storage) {
        this.name = name;
        this.clientId = 'C' + (++clientSeq) + '-' + name;
        this.fakeDb = fakeDb;
        this.world = world;
        this.confirmResponse = true;
        this.toasts = [];
        this.errors = [];

        const dom = new JSDOM(GAME_HTML, {
            url: 'https://crissarroyo.github.io/infiltra-test/game.html',
            runScripts: 'outside-only',
            pretendToBeVisual: true
        });
        this.dom = dom;
        const w = dom.window;
        this.w = w;

        // Reloj virtual sincronizado con el mundo
        this.clock = FakeTimers.withGlobal(w).install({
            now: world.nowMs,
            toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date']
        });

        // Storage restaurado (simulación de F5 conserva sessionStorage)
        if (storage) {
            for (const [k, v] of Object.entries(storage.session || {})) w.sessionStorage.setItem(k, v);
            for (const [k, v] of Object.entries(storage.local || {})) w.localStorage.setItem(k, v);
        }

        w.confirm = () => this.confirmResponse;
        w.alert = () => {};
        w.navigator.vibrate = () => {};
        w.firebase = fakeDb.makeCompatAPI(this.clientId);
        // qrcode ausente → generateQR sale por el guard

        // Capturar toasts y errores
        w.eval(GAME_JS);
        const self = this;
        w.eval('window.__origToast = toast;');
        w.toastHook = (m, t) => self.toasts.push({ m, t });
        w.eval('toast = function(m,t){ window.toastHook(m,t); window.__origToast(m,t); };');
        w.addEventListener('error', (e) => self.errors.push(String(e.message)));

        w.eval('init();');
        world.clients.push(this);
    }

    eval(code) { return this.w.eval(code); }
    G() { return this.w.G; }
    setName(n) { this.w.document.getElementById('input-name').value = n; this.eval('G.playerName = document.getElementById("input-name").value;'); }
    click(id) { const el = this.w.document.getElementById(id); if (!el) throw new Error('no element ' + id); el.click(); }
    screen() { return this.w.document.querySelector('.screen.active')?.id; }
    text(id) { return this.w.document.getElementById(id)?.textContent; }

    storageSnapshot() {
        const dump = (s) => { const o = {}; for (let i = 0; i < s.length; i++) { const k = s.key(i); o[k] = s.getItem(k); } return o; };
        return { session: dump(this.w.sessionStorage), local: dump(this.w.localStorage) };
    }

    // Cierre de pestaña sin salir: dispara onDisconnect y congela el cliente
    disconnect() {
        this.clock.uninstall();
        this.world.clients = this.world.clients.filter(c => c !== this);
        this.fakeDb.simulateDisconnect(this.clientId);
    }
}

class World {
    constructor(fakeDb) {
        this.nowMs = Date.parse('2026-07-30T12:00:00Z');
        this.clients = [];
        this.fakeDb = fakeDb;
        fakeDb.nowFn = () => this.nowMs;
    }
    // Avanza el tiempo en pasos pequeños en todos los clientes y drena microtasks
    async tick(ms, step) {
        step = step || 100;
        let advanced = 0;
        while (advanced < ms) {
            const d = Math.min(step, ms - advanced);
            this.nowMs += d;
            for (const c of this.clients.slice()) c.clock.tick(d);
            advanced += d;
            await drain();
        }
    }
    async settle() { await drain(); }
}

async function drain() {
    // varias vueltas de microtasks + un macrotask real
    for (let i = 0; i < 20; i++) await Promise.resolve();
    await new Promise(r => setImmediate(r));
}

module.exports = { SimClient, World, drain };
