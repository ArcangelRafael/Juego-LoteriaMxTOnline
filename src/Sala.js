// src/Sala.js
const { MAX_JUGADORES, BARAJA_BASE, BOTS_DEFAULT, TIEMPO_GRACIA_MS } = require('./constants');

class Sala {
    constructor(nombre, anfitrionId, esPublica) {
        this.nombre = nombre;
        this.codigo = Math.random().toString(36).substring(2, 6).toUpperCase();
        this.anfitrion = anfitrionId;
        this.esPublica = esPublica;
        this.fueCreadaPublica = esPublica; 
        this.estado = 'espera'; 
        
        this.jugadores = {};
        this.tablillas = this.generarTablillas();
        
        this.botsPool = { 
            nombres: [...BOTS_DEFAULT.NOMBRES],
            fotos: [...BOTS_DEFAULT.FOTOS], 
            insultos: Array.from(BOTS_DEFAULT.INSULTOS.keys()) 
        };

        this.mazo = [];
        this.cartasJugadas = [];
        this.ganadores = [];
        this.votacion = null;
        
        this.intervaloGriton = null;
        this.timerInactividad = null;
        
        this.config = { velocidadGriton: 3000, tiempoMarcar: 5000, ayudaNinos: false, sinEspectadores: false };
        this.estadisticas = { rapido: { nombre: null, ms: Infinity }, lento: { nombre: null, ms: 0 }, robo: null, distraido: null };
    }

    mezclar(arreglo) {
        const copia = [...arreglo];
        for (let i = copia.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [copia[i], copia[j]] = [copia[j], copia[i]];
        }
        return copia;
    }

    generarTablillas() {
        const tabs = [];
        for (let i = 0; i < 8; i++) {
            tabs.push({ id: i + 1, cartas: this.mezclar(BARAJA_BASE).slice(0, 16), viendoPor: [], bloqueadaPor: null });
        }
        return tabs;
    }

    // NUEVO: Permite incrustar la tablilla construida por el usuario
    asignarTablillaPersonalizada(idJugador, cartasRevisadas) {
        const jugador = this.jugadores[idJugador];
        if (!jugador) return false;

        // Desvincular tablilla estándar anterior
        if (jugador.tablillaBloqueada) {
            const prev = this.tablillas.find(t => t.id === jugador.tablillaBloqueada);
            if (prev) prev.bloqueadaPor = null;
        }

        const customId = 'CUSTOM_' + idJugador;
        
        // El frontend ya nos manda el array con "Carta X"
        let tab = this.tablillas.find(t => t.id === customId);
        if (!tab) {
            tab = { id: customId, cartas: cartasRevisadas, viendoPor: [], bloqueadaPor: idJugador, isCustom: true };
            this.tablillas.push(tab);
        } else {
            tab.cartas = cartasRevisadas;
            tab.bloqueadaPor = idJugador;
        }
        
        jugador.tablillaBloqueada = customId;
        return true;
    }

    getHumanos() { return Object.values(this.jugadores).filter(j => !j.isBot); }
    getJugadoresActivos() { return Object.values(this.jugadores).filter(j => j.rol === 'jugador'); }

    todosEstanListos() {
        const activos = this.getJugadoresActivos().filter(j => j.enLobby);
        return activos.length > 0 && activos.every(j => j.tablillaBloqueada !== null);
    }

    agregarBot(nombreCustom) {
        if (this.getJugadoresActivos().length >= MAX_JUGADORES) return null;

        if (this.botsPool.fotos.length === 0) this.botsPool.fotos = [...BOTS_DEFAULT.FOTOS];
        if (this.botsPool.insultos.length === 0) this.botsPool.insultos = Array.from(BOTS_DEFAULT.INSULTOS.keys());
        if (this.botsPool.nombres.length === 0) this.botsPool.nombres = [...BOTS_DEFAULT.NOMBRES];

        const fIdx = Math.floor(Math.random() * this.botsPool.fotos.length);
        const numFoto = this.botsPool.fotos.splice(fIdx, 1)[0];

        const iIdx = Math.floor(Math.random() * this.botsPool.insultos.length);
        const numInsulto = this.botsPool.insultos.splice(iIdx, 1)[0];

        let nombreUsado = null;
        let nombreFinal = "";
        if (nombreCustom && nombreCustom.trim() !== "") {
            nombreFinal = `ROBOOT ${nombreCustom.trim()}`;
        } else {
            const nIdx = Math.floor(Math.random() * this.botsPool.nombres.length);
            nombreUsado = this.botsPool.nombres.splice(nIdx, 1)[0];
            nombreFinal = `ROBOOT ${nombreUsado}`;
        }
        
        const fotoBot = `assets/img/r${numFoto}.webp`;
        const idBot = 'BOT_' + Math.random().toString(36).substr(2, 9);

        // Los bots no hacen tablillas personalizadas, agarran las normales libres
        const tablillasLibres = this.tablillas.filter(t => t.bloqueadaPor === null && !t.isCustom);
        if (tablillasLibres.length === 0) return null;
        
        const tabAsignada = tablillasLibres[Math.floor(Math.random() * tablillasLibres.length)];
        tabAsignada.bloqueadaPor = idBot;

        this.jugadores[idBot] = { 
            nombre: nombreFinal, foto: fotoBot, rol: 'jugador', viendoTablilla: null, 
            tablillaBloqueada: tabAsignada.id, marcas: [], enLobby: true, isBot: true,
            botFotoId: numFoto, botInsultoId: numInsulto, botNombreUsado: nombreUsado
        };

        return { bot: this.jugadores[idBot], insultoStr: BOTS_DEFAULT.INSULTOS[numInsulto] };
    }

    removerJugador(idJugador) {
        if (this.jugadores[idJugador]) {
            const j = this.jugadores[idJugador];
            if (j.isBot) {
                if (j.botFotoId) this.botsPool.fotos.push(j.botFotoId);
                if (j.botInsultoId !== undefined) this.botsPool.insultos.push(j.botInsultoId);
                if (j.botNombreUsado) this.botsPool.nombres.push(j.botNombreUsado);
            }
            this.tablillas.forEach(t => { 
                t.viendoPor = t.viendoPor.filter(id => id !== idJugador); 
                if (t.bloqueadaPor === idJugador) t.bloqueadaPor = null; 
            });
            delete this.jugadores[idJugador];
        }
    }

    prepararJuego() {
        this.estado = 'jugando';
        this.mazo = this.mezclar(BARAJA_BASE);
        this.cartasJugadas = [];
        this.ganadores = [];
        this.estadisticas = { rapido: { nombre: null, ms: Infinity }, lento: { nombre: null, ms: 0 }, robo: null, distraido: null };
        Object.values(this.jugadores).forEach(j => j.marcas = []); 
    }

    marcarCartaJugador(idJugador, carta, msReaccion) {
        const jugador = this.jugadores[idJugador];
        if (!jugador || !this.cartasJugadas.includes(carta) || jugador.marcas.includes(carta)) return false;

        jugador.marcas.push(carta);

        if (msReaccion < this.estadisticas.rapido.ms) {
            this.estadisticas.rapido = { nombre: jugador.nombre, ms: msReaccion };
        }
        if (msReaccion > this.estadisticas.lento.ms) {
            this.estadisticas.lento = { nombre: jugador.nombre, ms: msReaccion };
        }
        return true;
    }

    registrarVictoria(idJugador) {
        const jugador = this.jugadores[idJugador];
        if (!jugador || jugador.marcas.length < 16 || this.ganadores.includes(idJugador)) return 0;

        this.ganadores.push(idJugador);
        const posicion = this.ganadores.length;

        if (posicion === 1) {
            let victimas = [];
            for (let id in this.jugadores) {
                if (id !== idJugador && this.jugadores[id].rol === 'jugador' && this.jugadores[id].marcas.length === 16) {
                    victimas.push(this.jugadores[id].nombre);
                }
            }
            if (victimas.length > 0) {
                this.estadisticas.robo = { ganador: jugador.nombre, victimas: victimas };
            }
        }
        return posicion;
    }

    calcularRanking() {
        let ranking = [];
        let maxPerdidas = 0;
        let nombreDistraido = null;

        for (let id in this.jugadores) {
            if (this.jugadores[id].rol === 'jugador') {
                const j = this.jugadores[id];
                const tab = this.tablillas.find(t => t.id === j.tablillaBloqueada);
                let perdidas = tab ? tab.cartas.filter(c => this.cartasJugadas.includes(c) && !j.marcas.includes(c)) : [];
                
                if (perdidas.length > maxPerdidas) { maxPerdidas = perdidas.length; nombreDistraido = j.nombre; }
                ranking.push({ id, nombre: j.nombre, foto: j.foto, marcas: j.marcas.length, perdidas, esGanador: this.ganadores.includes(id) });
            }
        }

        if (maxPerdidas > 0 && nombreDistraido) this.estadisticas.distraido = { nombre: nombreDistraido, cantidad: maxPerdidas };

        ranking.sort((a, b) => {
            if (a.esGanador && !b.esGanador) return -1;
            if (!a.esGanador && b.esGanador) return 1;
            if (a.esGanador && b.esGanador) return this.ganadores.indexOf(a.id) - this.ganadores.indexOf(b.id);
            return b.marcas - a.marcas;
        });

        return ranking;
    }
}

module.exports = Sala;