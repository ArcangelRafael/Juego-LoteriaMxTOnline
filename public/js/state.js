// public/js/state.js
const state = {
    miSalaActual: '',
    miRol: '',
    soyAnfitrion: false,
    misCartasMarcadas: 0,
    estadoJugadores: {},
    configSala: { velocidadGriton: 3000, tiempoMarcar: 5000, ayudaNinos: false, sinEspectadores: false },
    juegoEnCurso: false,
    socketId: null,
    miFicha: 'palomita',
    // NUEVO: Array de 16 posiciones (null = vacío) para el modo Creador
    creadorCartas: Array(16).fill(null)
};

export default state;