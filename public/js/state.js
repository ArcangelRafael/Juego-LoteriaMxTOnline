// public/js/state.js

let session = sessionStorage.getItem('loteria_session_id');
if (!session) {
    session = 'sess_' + Math.random().toString(36).substr(2, 12);
    sessionStorage.setItem('loteria_session_id', session);
}

let salaGuardada = sessionStorage.getItem('loteria_sala_actual') || '';

const state = {
    sessionId: session, 
    miSalaActual: salaGuardada, 
    miRol: '',
    soyAnfitrion: false,
    misCartasMarcadas: 0,
    estadoJugadores: {},
    configSala: { velocidadGriton: 3000, tiempoMarcar: 5000, ayudaNinos: false, sinEspectadores: false },
    juegoEnCurso: false,
    enPrevisualizacion: false, 
    tablillasActuales: [],     
    dummyCartas: null, // FIX MAESTRO: Memoria de las cartas de ensayo
    socketId: null,
    miFicha: 'palomita',
    creadorCartas: Array(16).fill(null)
};

export default state;