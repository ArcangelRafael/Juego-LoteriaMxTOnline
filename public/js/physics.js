// public/js/physics.js

// NUEVO: Variables para la Máquina del Tiempo de la Previsualización
let snapshotLayout = null;

export function guardarSnapshot() {
    const contenedorTabs = document.getElementById('contenedorTablillas');
    const zonaGriton = document.querySelector('.zona-griton');
    snapshotLayout = {
        tabScaleX: contenedorTabs.style.getPropertyValue('--escala-x') || '',
        tabScaleY: contenedorTabs.style.getPropertyValue('--escala-y') || '',
        tabOffsetX: contenedorTabs.style.getPropertyValue('--offset-x') || '',
        tabOffsetY: contenedorTabs.style.getPropertyValue('--offset-y') || '',
        gritonX: zonaGriton ? zonaGriton.style.getPropertyValue('--griton-x') : '',
        gritonY: zonaGriton ? zonaGriton.style.getPropertyValue('--griton-y') : ''
    };
}

export function restaurarSnapshot() {
    if (!snapshotLayout) return;
    const contenedorTabs = document.getElementById('contenedorTablillas');
    const zonaGriton = document.querySelector('.zona-griton');

    contenedorTabs.style.setProperty('--escala-x', snapshotLayout.tabScaleX);
    contenedorTabs.style.setProperty('--escala-y', snapshotLayout.tabScaleY);
    contenedorTabs.style.setProperty('--offset-x', snapshotLayout.tabOffsetX);
    contenedorTabs.style.setProperty('--offset-y', snapshotLayout.tabOffsetY);

    if (zonaGriton) {
        zonaGriton.style.setProperty('--griton-x', snapshotLayout.gritonX);
        zonaGriton.style.setProperty('--griton-y', snapshotLayout.gritonY);
    }
    
    sessionStorage.setItem('loteria_layout', JSON.stringify(snapshotLayout));
}

export function setupPhysics() {
    function guardarLayout() {
        const contenedorTabs = document.getElementById('contenedorTablillas');
        const zonaGriton = document.querySelector('.zona-griton');
        
        const layoutState = {
            tabScaleX: contenedorTabs.style.getPropertyValue('--escala-x') || '',
            tabScaleY: contenedorTabs.style.getPropertyValue('--escala-y') || '',
            tabOffsetX: contenedorTabs.style.getPropertyValue('--offset-x') || '',
            tabOffsetY: contenedorTabs.style.getPropertyValue('--offset-y') || '',
            gritonX: zonaGriton ? zonaGriton.style.getPropertyValue('--griton-x') : '',
            gritonY: zonaGriton ? zonaGriton.style.getPropertyValue('--griton-y') : ''
        };
        sessionStorage.setItem('loteria_layout', JSON.stringify(layoutState));
    }

    document.getElementById('btnMinimizarPanel').addEventListener('pointerdown', (e) => {
        e.preventDefault(); e.stopPropagation();
        const panel = document.getElementById('panelEspectadorUI');
        const contenido = document.getElementById('contenidoPanelEspectador');
        const btn = e.target;
        if (panel.classList.contains('minimizado')) { panel.classList.remove('minimizado'); contenido.style.display = 'block'; btn.textContent = '-'; } 
        else { panel.classList.add('minimizado'); contenido.style.display = 'none'; btn.textContent = '+'; }
    });

    let isResizingTablilla = false;
    let startYResizer = 0; let startXResizer = 0;
    let startScaleY = 1; let startScaleX = 1;

    let isDraggingMiTablilla = false;
    let dragTabStartX = 0; let dragTabStartY = 0;
    let currentOffsetX = 0; let currentOffsetY = 0;

    let isDraggingGriton = false;
    let dragGritonStartX = 0; let dragGritonStartY = 0;
    let currentGritonOffsetX = 0; let currentGritonOffsetY = 0;

    const contenedorTabs = document.getElementById('contenedorTablillas');

    document.addEventListener('pointerdown', (e) => {
        if (e.target.classList.contains('resizer-handle')) {
            e.preventDefault(); 
            e.stopPropagation();
            isResizingTablilla = true;
            startXResizer = e.clientX;
            startYResizer = e.clientY;
            
            startScaleX = parseFloat(contenedorTabs.style.getPropertyValue('--escala-x')) || 1;
            startScaleY = parseFloat(contenedorTabs.style.getPropertyValue('--escala-y')) || 1;
            document.body.style.cursor = 'nwse-resize';
        }
        else if (e.target.classList.contains('mover-handle')) {
            e.preventDefault();
            e.stopPropagation();
            isDraggingMiTablilla = true;
            dragTabStartX = e.clientX;
            dragTabStartY = e.clientY;
            
            currentOffsetX = parseFloat(contenedorTabs.style.getPropertyValue('--offset-x')) || 0;
            currentOffsetY = parseFloat(contenedorTabs.style.getPropertyValue('--offset-y')) || 0;
            document.body.style.cursor = 'move';
        }
        else if (e.target.id === 'textoCartaGriton') {
            e.preventDefault();
            e.stopPropagation();
            isDraggingGriton = true;
            dragGritonStartX = e.clientX;
            dragGritonStartY = e.clientY;
            
            const zonaGriton = document.querySelector('.zona-griton');
            currentGritonOffsetX = parseFloat(zonaGriton.style.getPropertyValue('--griton-x')) || 0;
            currentGritonOffsetY = parseFloat(zonaGriton.style.getPropertyValue('--griton-y')) || 0;
        }
    });

    document.addEventListener('pointermove', (e) => {
        if (isResizingTablilla) {
            e.preventDefault();
            const deltaX = e.clientX - startXResizer; 
            const deltaY = startYResizer - e.clientY; 
            
            const newScaleX = Math.max(0.6, Math.min(startScaleX + (deltaX * 0.005), 2.5));
            const newScaleY = Math.max(0.6, Math.min(startScaleY + (deltaY * 0.005), 2.5));
            
            contenedorTabs.style.setProperty('--escala-x', newScaleX);
            contenedorTabs.style.setProperty('--escala-y', newScaleY);
        }
        
        if (isDraggingMiTablilla) {
            e.preventDefault();
            const deltaX = e.clientX - dragTabStartX;
            const deltaY = e.clientY - dragTabStartY;
            
            contenedorTabs.style.setProperty('--offset-x', (currentOffsetX + deltaX) + 'px');
            contenedorTabs.style.setProperty('--offset-y', (currentOffsetY + deltaY) + 'px');
            
            dragTabStartX = e.clientX;
            dragTabStartY = e.clientY;
            currentOffsetX += deltaX;
            currentOffsetY += deltaY;
        }

        if (isDraggingGriton) {
            e.preventDefault();
            const deltaX = e.clientX - dragGritonStartX;
            const deltaY = e.clientY - dragGritonStartY;
            
            const zonaGriton = document.querySelector('.zona-griton');
            zonaGriton.style.setProperty('--griton-x', (currentGritonOffsetX + deltaX) + 'px');
            zonaGriton.style.setProperty('--griton-y', (currentGritonOffsetY + deltaY) + 'px');
            
            dragGritonStartX = e.clientX;
            dragGritonStartY = e.clientY;
            currentGritonOffsetX += deltaX;
            currentGritonOffsetY += deltaY;
        }
    });

    document.addEventListener('pointerup', () => {
        let changed = false;
        if (isResizingTablilla) {
            isResizingTablilla = false;
            document.body.style.cursor = 'auto';
            changed = true;
        }
        if (isDraggingMiTablilla) { 
            isDraggingMiTablilla = false; 
            document.body.style.cursor = 'auto';
            changed = true; 
        }
        if (isDraggingGriton) { isDraggingGriton = false; changed = true; }
        
        if (changed) guardarLayout();
    });
}