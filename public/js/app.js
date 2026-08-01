// public/js/app.js
import state from './state.js';
import { CARTAS_LOTERIA } from './cartas.js';

import { setupSocketClient } from './socketClient.js';
import { setupPhysics } from './physics.js';
import { setupCreador } from './creador.js';
import { setupUIEvents } from './events.js';
import * as ui from './ui.js';

const socket = io();
state.socketId = socket.id;

document.addEventListener('iniciar_preview', () => { ui.iniciarPrevisualizacion(state, construirPanelEspectadorCb); });
document.addEventListener('cerrar_preview', () => { ui.cerrarPrevisualizacion(state); });

function renderizarTablillasCallback(t) {
    state.tablillasActuales = t; 
    const contBotones = document.getElementById('botonesTablilla');
    if (contBotones && contBotones.parentNode !== document.body) {
        document.body.appendChild(contBotones); contBotones.style.display = 'none';
    }

    const cont = document.getElementById('contenedorTablillas'); cont.innerHTML = ''; 
    t.forEach(tab => {
        const divTab = document.createElement('div'); divTab.className = 'tablilla';
        divTab.id = 'tablilla-dom-' + tab.id;
        
        let controlesTop = ''; 
        let contenedorLoteria = ''; 
        let nombreTablilla = tab.isCustom ? '¡Tu Tablilla!' : `Tablilla ${tab.id}`;
        let tituloHTML = `<h4>${nombreTablilla}</h4>`;
        
        if (tab.bloqueadaPor) { 
            if (tab.bloqueadaPor === socket.id) {
                divTab.classList.add('bloqueada-mia');
                tituloHTML = ''; 
                controlesTop = `
                    <div class="controles-superiores-tablilla">
                        <div class="resizer-handle" title="Arrastra para ajustar tamaño">⤡ TAMAÑO</div>
                        <div class="mover-handle" title="Arrastra para mover">✥ MOVER</div>
                    </div>
                `;
                contenedorLoteria = `<div class="contenedor-titulo-loteria"></div>`;
            } else {
                divTab.classList.add('bloqueada-otros');
            }
        } 
        else if (tab.viendoPor.length > 0) { 
            if (tab.viendoPor.includes(socket.id)) divTab.classList.add('viendo-mia'); 
            else divTab.classList.add('viendo-otros'); 
        }
        
        divTab.innerHTML = `
            ${controlesTop}
            <div class="tablilla-header-container">
                ${tituloHTML}
                ${contenedorLoteria}
            </div>
            <div class="grid-cartas"></div>
        `;

        const grid = divTab.querySelector('.grid-cartas');
        
        tab.cartas.forEach(c => { 
            const divC = document.createElement('div'); divC.className = 'carta'; 
            const numCarta = c.split(' ')[1]; divC.dataset.numero = numCarta;
            const infoCarta = CARTAS_LOTERIA[numCarta];
            
            if (infoCarta) {
                divC.innerHTML = `
                    <img src="${infoCarta.img}" alt="${infoCarta.nombre}" class="img-carta-adentro">
                    <div class="nombre-carta-tablilla" title="${infoCarta.nombre}">${infoCarta.nombre}</div>
                `;
            } else {
                divC.textContent = numCarta; 
            }
            grid.appendChild(divC); 
        });

        divTab.addEventListener('pointerdown', (e) => { 
            if(e.target.classList.contains('resizer-handle') || e.target.classList.contains('mover-handle')) return; 
            e.preventDefault();
            if (state.miRol === 'jugador' && !tab.bloqueadaPor) socket.emit('ver_tablilla', { nombreSala: state.miSalaActual, idTablilla: tab.id }); 
        });
        cont.appendChild(divTab);
    });
}

function construirPanelEspectadorCb() {
    document.getElementById('panelEspectadorUI').style.display = 'block'; 
    
    const oldChecks = Array.from(document.querySelectorAll('.check-jugador:checked')).map(c => c.value);
    const hadChecks = document.querySelectorAll('.check-jugador').length > 0;

    const contChecks = document.getElementById('listaChecksJugadores'); 
    contChecks.innerHTML = '';
    
    for (const id in state.estadoJugadores) {
        // FIX MAESTRO: Si la etiqueta rol viene vacía, asumimos que es jugador porque el servidor manda la lista pura
        const rolData = state.estadoJugadores[id].rol || 'jugador';
        
        if (id !== socket.id && rolData === 'jugador') {
            let isChecked = (!hadChecks || oldChecks.includes(id)) ? 'checked' : '';
            contChecks.innerHTML += `<label class="checkbox-label"><input type="checkbox" class="check-jugador" value="${id}" ${isChecked}> ${state.estadoJugadores[id].nombre || 'Anónimo'}</label>`;
        }
    }
    
    const cTodos = document.getElementById('checkTodos'); const cInd = document.querySelectorAll('.check-jugador');
    cTodos.checked = document.querySelectorAll('.check-jugador:not(:checked)').length === 0;
    
    cTodos.addEventListener('change', (e) => { cInd.forEach(c => c.checked = e.target.checked); renderTabEspectadoresCb(); });
    cInd.forEach(c => c.addEventListener('change', () => { if(!c.checked) cTodos.checked = false; renderTabEspectadoresCb(); }));
    
    renderTabEspectadoresCb(); 
}

function renderTabEspectadoresCb() {
    const cont = document.getElementById('contenedorEspectador'); cont.innerHTML = '';
    const checks = document.querySelectorAll('.check-jugador:checked');
    const checkedIds = Array.from(checks).map(c => c.value);
    
    let jugadoresEnSala = Object.keys(state.estadoJugadores).filter(id => {
        // FIX MAESTRO: Mismo seguro de vida aquí
        const rolData = state.estadoJugadores[id].rol || 'jugador';
        return rolData === 'jugador';
    });
    
    let myIndex = jugadoresEnSala.indexOf(socket.id); 
    if (myIndex === -1) myIndex = 0; 

    const orderedOtherIds = [];
    for (let i = 1; i < jugadoresEnSala.length; i++) {
        const idx = (myIndex + i) % jugadoresEnSala.length; 
        if (jugadoresEnSala[idx] !== socket.id) {
            orderedOtherIds.push(jugadoresEnSala[idx]);
        }
    }

    const maxJug = state.configSala.maxJugadores || 8;
    const totalAsientos = maxJug - 1;

    for (let i = 0; i < totalAsientos; i++) {
        const id = orderedOtherIds[i]; 
        let isPlaceholder = !id;
        let isChecked = id && checkedIds.includes(id);

        if (!isPlaceholder && !isChecked) continue; 

        const divTab = document.createElement('div');
        divTab.className = 'tablilla tablilla-enemiga';

        if (isPlaceholder) {
            if (state.enPrevisualizacion) {
                divTab.classList.add('placeholder-enemigo');
            } else {
                continue; 
            }
        } else {
            const d = state.estadoJugadores[id];
            divTab.id = `tablilla-espectador-${id}`;
            let img = d.foto ? `<img src="${d.foto}" class="foto-perfil">` : '';
            divTab.innerHTML = `<h4>Juego de: ${d.nombre} ${img}</h4><div class="grid-cartas"></div>`;
            const grid = divTab.querySelector('.grid-cartas');

            let cartasDelJugador = null;
            if (state.tablillasActuales) {
                const tab = state.tablillasActuales.find(t => t.bloqueadaPor === id);
                if (tab) cartasDelJugador = tab.cartas;
            }
            if (d.cartas && d.cartas.length > 0) cartasDelJugador = d.cartas;

            if (cartasDelJugador && cartasDelJugador.length > 0) {
                cartasDelJugador.forEach(c => {
                    const divC = document.createElement('div'); divC.className = 'carta'; 
                    const numCarta = c.split(' ')[1]; divC.dataset.numero = numCarta;
                    const infoCarta = CARTAS_LOTERIA[numCarta];

                    if (infoCarta) {
                        divC.innerHTML = `<img src="${infoCarta.img}" class="img-carta-adentro"><div class="nombre-carta-tablilla" title="${infoCarta.nombre}">${infoCarta.nombre}</div>`;
                    } else {
                        divC.textContent = numCarta;
                    }
                    if(d.marcas && d.marcas.includes(c)) { divC.classList.add('marcada'); divC.innerHTML += '<div class="palomita">✔</div>'; }
                    grid.appendChild(divC);
                });
            } else {
                grid.innerHTML = '<div style="display:flex; align-items:center; justify-content:center; height:100%; width:100%; color:#94a3b8; font-weight:bold; text-align:center;">Seleccionando...</div>';
            }
        }

        if (state.juegoEnCurso || state.enPrevisualizacion) {
            let angle;
            if (totalAsientos === 1) angle = Math.PI * 1.5; 
            else {
                const mitadIzquierda = Math.ceil(totalAsientos / 2); 
                const mitadDerecha = totalAsientos - mitadIzquierda;
                if (i < mitadIzquierda) { 
                    const step = mitadIzquierda > 1 ? (Math.PI * 1.3 - Math.PI * 0.75) / (mitadIzquierda - 1) : 0; 
                    angle = Math.PI * 0.75 + (step * i); 
                } else { 
                    const idxDer = i - mitadIzquierda; 
                    const step = mitadDerecha > 1 ? (Math.PI * 2.25 - Math.PI * 1.7) / (mitadDerecha - 1) : 0; 
                    angle = Math.PI * 1.7 + (step * idxDer); 
                }
            }
            const radiusX = 44; const radiusY = 40; 
            divTab.style.left = `${50 + (radiusX * Math.cos(angle))}%`; 
            divTab.style.top = `${45 + (radiusY * Math.sin(angle))}%`; 
            const gradosRotacion = (angle * 180 / Math.PI) - 90; 
            divTab.style.setProperty('--rotacion', `${gradosRotacion}deg`);
        } else {
            divTab.style.position = 'relative'; divTab.style.transform = 'none'; divTab.style.setProperty('--rotacion', `0deg`);
        }
        cont.appendChild(divTab);
    }
}

setupUIEvents(socket);
setupPhysics(); 
setupCreador(socket);
setupSocketClient(socket, { renderizarTablillasCallback, construirPanelEspectadorCb });