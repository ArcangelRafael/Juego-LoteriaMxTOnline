// src/constants.js

module.exports = {
    MAX_JUGADORES: 8,
    MAX_ESPECTADORES: 4,
    TIEMPO_VOTACION_SEC: 15,
    TIEMPO_GRACIA_MS: 500,
    INACTIVIDAD_SALA_PUBLICA_SEC: 3 * 60, // 3 minutos
    INACTIVIDAD_SALA_PRIVADA_SEC: 5 * 60, // 5 minutos
    
    BARAJA_BASE: Array.from({ length: 54 }, (_, i) => `Carta ${i + 1}`),
    
    BOTS_DEFAULT: {
        NOMBRES: ["T-800", "HAL-9000", "Bender", "Ultron", "Skynet", "GLaDOS", "R2-D2", "WALL-E"],
        FOTOS: [1, 2, 3, 4, 5, 6, 7, 8],
        INSULTOS: [
            "¿Listos para perder, niñitas? Mis circuitos no cometen errores.",
            "Vengo a robarles su dinero virtual y su dignidad.",
            "Calculo un 99.9% de probabilidades de que los haga llorar.",
            "Mi procesador tiene más suerte que todos ustedes juntos.",
            "Ni con ayuda para niños van a poder ganarme.",
            "Espero que traigan pañuelos, porque hoy voy a barrer el piso con ustedes.",
            "Manos les van a faltar......para ganarme en las reacciones de clicks.",
            "Soy una máquina de ganar, ustedes son de carne y lágrimas.",
            "Mejor váyanse al modo espectador, esto será una masacre.",
            "Ni reiniciando su router van a tener la velocidad para vencerme."
        ]
    }
};