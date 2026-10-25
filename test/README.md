# Pruebas multi-cliente simuladas

Arnés de integración: varios clientes jsdom con relojes virtuales
comparten un mock en memoria del API compat de Firebase RTDB
(on/off, set/update/remove, once, transaction, onDisconnect,
ServerValue.TIMESTAMP, .info/serverTimeOffset).

```bash
cd test
npm install jsdom@24 @sinonjs/fake-timers
node run-tests.js
```

Cubre: partida completa a 3 y a 10 (+ sala llena), host que abandona
(sucesión automática), F5 en fases roles/round/voting (jugador y host),
dos rondas seguidas, empate + TIE_BUTTON_DELAY, votos simultáneos y
duplicados, cierre de pestaña (onDisconnect + gracia), usedWords
agotado, transferencia manual de host y carrera de transferencias,
gameover por infiltrados eliminados y por dominio de infiltrados.

v2.2.0 agrega: controles del host eliminado por fase, jugador que
entra a mitad de partida (espera la siguiente), config de sala y
charlatán tras cambio de host, puntos +7/-3 por voto y +5 en empate,
volver a sala / siguiente ronda antes del chequeo de fin, host que cae
con la ronda vencida, nombres con HTML, último infiltrado desconectado,
sala inexistente y límites de configuración, sonido y silencio, y
jugador en espera que no hereda el host a mitad de partida.

v2.3.0 agrega: ayuda que abre y cierra con el mismo botón (también
con Esc y el fondo) y voto propio marcado con progreso de votos.

Nota: el mock no sustituye una partida real contra el Firebase de
producción (latencia, reglas de seguridad); esa verificación se hace
en el GitHub Pages de test antes de promocionar.
