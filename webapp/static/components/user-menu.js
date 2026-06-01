// ============================================================
// MENÚ DE USUARIO - Gestión del dropdown
// ============================================================

function toggleUserMenu() {
    const button = document.getElementById('userMenuButton');
    const dropdown = document.getElementById('userDropdown');
    const overlay = document.getElementById('menuOverlay');
    
    const isOpen = dropdown.classList.contains('show');
    
    if (isOpen) {
        closeUserMenu();
    } else {
        openUserMenu();
    }
}

function openUserMenu() {
    const button = document.getElementById('userMenuButton');
    const dropdown = document.getElementById('userDropdown');
    const overlay = document.getElementById('menuOverlay');
    
    button.classList.add('active');
    dropdown.classList.add('show');
    overlay.classList.add('show');
}

function closeUserMenu() {
    const button = document.getElementById('userMenuButton');
    const dropdown = document.getElementById('userDropdown');
    const overlay = document.getElementById('menuOverlay');
    
    button.classList.remove('active');
    dropdown.classList.remove('show');
    overlay.classList.remove('show');
}

// Cerrar con ESC
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeUserMenu();
    }
});

// Actualizar estado del sistema en el menú
function updateSystemStatusInMenu(status, groqConfigured) {
    const statusIcon = document.getElementById('statusIcon');
    const statusTitle = document.getElementById('statusTitle');
    const statusDescription = document.getElementById('statusDescription');
    const statusBadge = document.getElementById('statusBadge');
    const userStatusText = document.getElementById('userStatusText');
    const statusDot = document.querySelector('.status-dot');
    
    if (!statusIcon) return;
    
    if (status === 'groq_error') {
        // Error con Groq (rate limit, API key inválida, etc.)
        statusIcon.className = 'status-icon error';
        statusIcon.innerHTML = '<i class="fas fa-exclamation-circle"></i>';
        statusTitle.textContent = 'Error en API Key';
        statusDescription.textContent = 'Problema con la API de Groq';
        statusBadge.className = 'status-badge error';
        statusBadge.textContent = 'ERROR';
        userStatusText.textContent = 'Sistema Inactivo';
        if (statusDot) statusDot.className = 'status-dot error';
    } else if (status === 'ok' && groqConfigured) {
        // Sistema activo
        statusIcon.className = 'status-icon active';
        statusIcon.innerHTML = '<i class="fas fa-check-circle"></i>';
        statusTitle.textContent = 'Sistema Operativo';
        statusDescription.textContent = 'Todos los servicios funcionando';
        statusBadge.className = 'status-badge active';
        statusBadge.textContent = 'ACTIVO';
        userStatusText.textContent = 'Sistema Activo';
        if (statusDot) statusDot.className = 'status-dot active';
    } else if (status === 'ok' && !groqConfigured) {
        // Servidor OK pero falta API Key
        statusIcon.className = 'status-icon inactive';
        statusIcon.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
        statusTitle.textContent = 'Configuración Incompleta';
        statusDescription.textContent = 'Falta configurar API Key de Groq';
        statusBadge.className = 'status-badge inactive';
        statusBadge.textContent = 'PENDIENTE';
        userStatusText.textContent = 'Config. Incompleta';
        if (statusDot) statusDot.className = 'status-dot inactive';
    } else {
        // Servidor desconectado
        statusIcon.className = 'status-icon inactive';
        statusIcon.innerHTML = '<i class="fas fa-times-circle"></i>';
        statusTitle.textContent = 'Servidor Desconectado';
        statusDescription.textContent = 'No se puede conectar al backend';
        statusBadge.className = 'status-badge inactive';
        statusBadge.textContent = 'OFFLINE';
        userStatusText.textContent = 'Desconectado';
        if (statusDot) statusDot.className = 'status-dot inactive';
    }
}

// Actualizar contador de KB en el menú
function updateKbCountInMenu(count) {
    const kbElement = document.getElementById('dropdownKbCount');
    if (kbElement) {
        kbElement.textContent = count || 0;
    }
}

// Actualizar badge de historial en el menú
function updateHistoryBadgeInMenu(count) {
    const badge = document.getElementById('menuHistoryBadge');
    if (badge) {
        badge.textContent = count > 99 ? '99+' : count;
    }
}
