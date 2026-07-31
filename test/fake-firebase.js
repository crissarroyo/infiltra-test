// Mock en memoria del API compat de Firebase RTDB, compartido entre
// clientes simulados. Cubre: ref/child/set/update/remove/once/on/off,
// transaction, onDisconnect (set/update/cancel), ServerValue.TIMESTAMP
// y .info/serverTimeOffset.
'use strict';

const SERVER_TS = { '.sv': 'timestamp' };

function deepClone(v) { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); }

class FakeDB {
    constructor(nowFn) {
        this.root = null;
        this.nowFn = nowFn || (() => Date.now());
        this.listeners = []; // {path, fn, clientId}
        this.disconnectOps = []; // {clientId, path, op, value, cancelled}
        this.writeLog = [];
    }

    _resolveServerValues(v) {
        if (v && typeof v === 'object') {
            if (v['.sv'] === 'timestamp') return this.nowFn();
            const out = Array.isArray(v) ? [] : {};
            for (const k of Object.keys(v)) out[k] = this._resolveServerValues(v[k]);
            return out;
        }
        return v;
    }

    _get(pathArr) {
        let node = this.root;
        for (const p of pathArr) {
            if (node == null || typeof node !== 'object') return null;
            node = node[p];
        }
        return node === undefined ? null : node;
    }

    _prune(obj) {
        // Firebase elimina objetos vacíos y nulls
        if (obj === null || obj === undefined) return null;
        if (typeof obj !== 'object') return obj;
        const out = Array.isArray(obj) ? {} : {};
        for (const k of Object.keys(obj)) {
            const v = this._prune(obj[k]);
            if (v !== null) out[k] = v;
        }
        return Object.keys(out).length ? out : null;
    }

    _set(pathArr, value, silent) {
        value = this._prune(this._resolveServerValues(deepClone(value)));
        if (pathArr.length === 0) { this.root = value; }
        else {
            if (this.root == null || typeof this.root !== 'object') this.root = {};
            let node = this.root;
            for (let i = 0; i < pathArr.length - 1; i++) {
                if (node[pathArr[i]] == null || typeof node[pathArr[i]] !== 'object') node[pathArr[i]] = {};
                node = node[pathArr[i]];
            }
            if (value === null) delete node[pathArr[pathArr.length - 1]];
            else node[pathArr[pathArr.length - 1]] = value;
        }
        this.writeLog.push({ path: pathArr.join('/'), value: deepClone(value), t: this.nowFn() });
        if (!silent) this._notify(pathArr);
    }

    // update() es atómico en el RTDB real: aplica todas las claves y
    // notifica UNA sola vez.
    _update(pathArr, obj) {
        for (const k of Object.keys(obj)) {
            const sub = k.split('/').filter(Boolean);
            this._set(pathArr.concat(sub), obj[k], true);
        }
        this._notify(pathArr);
    }

    _notify(changedPath) {
        const changed = changedPath.join('/');
        for (const l of this.listeners.slice()) {
            const lp = l.path;
            if (changed === lp || changed.startsWith(lp + '/') || lp.startsWith(changed + '/') || lp === '' ) {
                this._fire(l);
            }
        }
    }

    _fire(l) {
        const val = l.path === '.info/serverTimeOffset' ? 0
            : l.path === '.info/connected' ? true
            : deepClone(this._get(l.path.split('/').filter(Boolean)));
        // async como el real (microtask)
        Promise.resolve().then(() => {
            if (this.listeners.includes(l)) l.fn({ val: () => val });
        });
    }

    simulateDisconnect(clientId) {
        // Ejecuta los onDisconnect registrados por ese cliente
        const ops = this.disconnectOps.filter(o => o.clientId === clientId && !o.cancelled);
        this.disconnectOps = this.disconnectOps.filter(o => o.clientId !== clientId);
        for (const o of ops) {
            if (o.op === 'set') this._set(o.path.split('/').filter(Boolean), o.value);
            else if (o.op === 'update') this._update(o.path.split('/').filter(Boolean), o.value);
        }
        // Quita listeners del cliente desconectado
        this.listeners = this.listeners.filter(l => l.clientId !== clientId);
    }

    makeCompatAPI(clientId) {
        const db = this;
        function makeRef(path) {
            const pathArr = path.split('/').filter(Boolean);
            return {
                child: (c) => makeRef(path + '/' + c),
                set: (v) => { db._set(pathArr, v); return Promise.resolve(); },
                update: (v) => { db._update(pathArr, v); return Promise.resolve(); },
                remove: () => { db._set(pathArr, null); return Promise.resolve(); },
                once: (ev) => {
                    const val = path === '.info/serverTimeOffset' ? 0
                        : path === '.info/connected' ? true
                        : deepClone(db._get(pathArr));
                    return Promise.resolve({ val: () => val });
                },
                on: (ev, fn) => {
                    const l = { path, fn, clientId };
                    db.listeners.push(l);
                    db._fire(l);
                    return fn;
                },
                off: (ev, fn) => {
                    db.listeners = db.listeners.filter(l => !(l.path === path && (!fn || l.fn === fn) && l.clientId === clientId));
                },
                transaction: (updateFn) => {
                    const current = deepClone(db._get(pathArr));
                    const result = updateFn(current);
                    if (result === undefined) {
                        return Promise.resolve({ committed: false, snapshot: { val: () => current } });
                    }
                    db._set(pathArr, result);
                    return Promise.resolve({ committed: true, snapshot: { val: () => deepClone(db._get(pathArr)) } });
                },
                onDisconnect: () => ({
                    set: (v) => { db.disconnectOps.push({ clientId, path, op: 'set', value: db._resolveServerValues(deepClone(v)) }); return Promise.resolve(); },
                    update: (v) => { db.disconnectOps.push({ clientId, path, op: 'update', value: db._resolveServerValues(deepClone(v)) }); return Promise.resolve(); },
                    cancel: () => { db.disconnectOps.forEach(o => { if (o.clientId === clientId && o.path === path) o.cancelled = true; }); return Promise.resolve(); }
                })
            };
        }
        const databaseFn = () => ({ ref: (p) => makeRef(p || '') });
        databaseFn.ServerValue = { TIMESTAMP: SERVER_TS };
        return {
            apps: [{}],
            initializeApp: () => ({}),
            database: databaseFn
        };
    }
}

module.exports = { FakeDB };
