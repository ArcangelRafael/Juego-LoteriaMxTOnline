// public/js/mezcla.js
import { CARTAS_LOTERIA } from './cartas.js';

const TIPOS_DE_MEZCLA = ['tipo-1', 'tipo-2'];
let poolDisponible = [...TIPOS_DE_MEZCLA];

export function reproducirAnimacionMezcla() {
    const contenedorGriton = document.getElementById('mazoCartasGriton');
    if (!contenedorGriton) return;

    const mazoEstatico = contenedorGriton.querySelectorAll('.mazo-estatico');
    mazoEstatico.forEach(img => img.style.display = 'none');

    const animContainer = document.createElement('div');
    animContainer.className = 'mezcla-container';
    contenedorGriton.appendChild(animContainer);

    // Obtenemos TODAS las 54 cartas para demostrar que el mazo es real y completo
    const todasLasCartas = Object.values(CARTAS_LOTERIA);
    const numCartasObertura = todasLasCartas.length; // 54 Cartas
    const cartasObertura = [];

    // ==========================================
    // FASE 0: CREAR OBERTURA (Las 54 cartas, Boca Arriba)
    // ==========================================
    for (let i = 0; i < numCartasObertura; i++) {
        const cartaReal = todasLasCartas[i]; // Sacamos la carta exacta, sin repetir
        const carta = document.createElement('div');
        carta.className = 'carta-mezcla-3d obertura-ribbon';
        carta.style.zIndex = i; // Apilado correcto
        carta.innerHTML = `
            <img src="/assets/img/backards.webp" class="mezcla-dorso">
            <img src="${cartaReal.img}" class="mezcla-frente">
        `;
        // Inician en el centro, apuntando con la cara frontal
        carta.style.transform = `translateX(0px) rotateY(180deg)`;
        animContainer.appendChild(carta);
        cartasObertura.push(carta);
    }

    // ==========================================
    // FASE 1: EXTENDER ABANICO GIGANTE (Show de 54 cartas)
    // ==========================================
    setTimeout(() => {
        cartasObertura.forEach((carta, i) => {
            const progreso = i / (numCartasObertura - 1);
            // FIX: Ampliamos el abanico a 1200px de ancho (-600 a +600)
            const x = -600 + (progreso * 1200);
            // Acentuamos la curva de la sonrisa
            const y = Math.sin(progreso * Math.PI) * 80; 
            // Aumentamos los grados en las puntas para mantener la forma
            const rotZ = -35 + (progreso * 70);
            
            carta.style.transform = `translateX(${x}px) translateY(${y}px) rotateZ(${rotZ}deg) rotateY(180deg) scale(0.9)`;
            carta.style.boxShadow = `0 10px 15px rgba(0,0,0,0.4)`;
        });
    }, 100);

    // ==========================================
    // FASE 2: EFECTO OLA RÁPIDA (Voltear cara abajo)
    // ==========================================
    setTimeout(() => {
        cartasObertura.forEach((carta, i) => {
            setTimeout(() => {
                const progreso = i / (numCartasObertura - 1);
                const x = -600 + (progreso * 1200);
                const y = Math.sin(progreso * Math.PI) * 80;
                const rotZ = -35 + (progreso * 70);
                // Mantiene su lugar pero gira el eje Y a 0 para ocultar la cara
                carta.style.transform = `translateX(${x}px) translateY(${y}px) rotateZ(${rotZ}deg) rotateY(0deg) scale(0.9)`;
            }, i * 30); // 30ms entre carta y carta (Ola rápida para 54 cartas)
        });
    }, 1500);

    // ==========================================
    // FASE 3: RECOGER MAZO (Regreso al centro)
    // ==========================================
    setTimeout(() => {
        cartasObertura.forEach((carta, i) => {
            setTimeout(() => {
                carta.style.transform = `translateX(0px) translateY(0px) rotateZ(0deg) rotateY(0deg) scale(1)`;
                carta.style.boxShadow = `-2px 2px 5px rgba(0,0,0,0.5)`;
            }, i * 20); // 20ms de separación al recoger
        });
    }, 4000);

    // ==========================================
    // FASE 4: INICIAR MEZCLA DEL POOL
    // ==========================================
    setTimeout(() => {
        animContainer.innerHTML = ''; // Limpiamos la obertura de 54 cartas

        if (poolDisponible.length === 0) poolDisponible = [...TIPOS_DE_MEZCLA];
        const randomIndex = Math.floor(Math.random() * poolDisponible.length);
        const mezclaElegida = poolDisponible.splice(randomIndex, 1)[0];

        // Mezcla elegida (dura 8s)
        for (let i = 1; i <= 10; i++) {
            const cartaA = document.createElement('img');
            cartaA.src = '/assets/img/backards.webp';
            const cartaB = document.createElement('img');
            cartaB.src = '/assets/img/backards.webp';

            if (mezclaElegida === 'tipo-1') {
                cartaA.className = `carta-mezcla tipo-1-izq delay-${i}`;
                cartaB.className = `carta-mezcla tipo-1-der delay-${i}`;
            } else {
                cartaA.className = `carta-mezcla tipo-2-arriba delay-${i}`;
                cartaB.className = `carta-mezcla tipo-2-abajo delay-${i}`;
            }
            animContainer.appendChild(cartaA);
            animContainer.appendChild(cartaB);
        }
    }, 6000);

    // ==========================================
    // FASE FINAL: LIMPIEZA
    // ==========================================
    setTimeout(() => {
        if (animContainer && animContainer.parentNode) animContainer.remove();
        mazoEstatico.forEach(img => img.style.display = 'block');
    }, 14500); // Culmina a tiempo con los 15s de tu servidor
}