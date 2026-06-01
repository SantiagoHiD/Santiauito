// QualityAI Web App - JavaScript
const API_BASE = 'http://localhost:3000/api';

let currentAmbiguities = [];
let originalAmbiguities = []; // Guardar ambigüedades originales antes de resolver
let currentResolutions = [];
let currentContractA = null;
let currentContractATimestamp = null; // Timestamp del Contract A para vincular con escenarios
let currentContractBFilename = null; // Nombre del archivo Contract B para guardarlo después de firmar
let selectedProjectId = null; // ID del proyecto seleccionado
let selectedProjectData = null; // Datos del proyecto seleccionado

// Verificar que haya un proyecto seleccionado al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    checkProjectSelection();
});

async function checkProjectSelection() {
    selectedProjectId = localStorage.getItem('selectedProjectId');
    
    if (!selectedProjectId) {
        // No hay proyecto seleccionado, redirigir a la página de proyectos
        window.location.href = '../projects/projects.html';
        return;
    }
    
    // Cargar información del proyecto
    try {
        const response = await fetch(`${API_BASE}/projects/${selectedProjectId}`);
        const data = await response.json();
        
        if (data.success) {
            selectedProjectData = data.project;
            updateProjectHeader();
        } else {
            // Proyecto no encontrado, redirigir
            localStorage.removeItem('selectedProjectId');
            window.location.href = '../projects/projects.html';
        }
    } catch (error) {
        console.error('Error al cargar proyecto:', error);
    }
}

function updateProjectHeader() {
    // Actualizar el header con información del proyecto
    const projectNameElement = document.getElementById('currentProjectName');
    if (projectNameElement && selectedProjectData) {
        projectNameElement.textContent = selectedProjectData.name;
    }
}

function changeProject() {
    // Redirigir a la página de selección de proyectos
    window.location.href = '../projects/projects.html';
}

// ============================================================
// TABS PRINCIPALES (GENERADOR / HISTORIAL)
// ============================================================

function switchMainTab(tabName) {
    // Ocultar todas las secciones principales
    document.querySelectorAll('.main-content-section').forEach(section => {
        section.classList.add('hidden');
    });
    
    // Mostrar la sección seleccionada
    if (tabName === 'generator') {
        document.getElementById('main-content-generator').classList.remove('hidden');
    } else if (tabName === 'history') {
        document.getElementById('main-content-history').classList.remove('hidden');
        // Cargar el historial cuando se abre el tab
        loadHistoryPage();
    }
    
    // Actualizar estilos de los tabs
    document.querySelectorAll('[id^="main-tab-"]').forEach(btn => {
        btn.classList.remove('main-tab-active');
        btn.classList.add('main-tab-inactive');
    });
    
    const activeBtn = document.getElementById(`main-tab-${tabName}`);
    activeBtn.classList.remove('main-tab-inactive');
    activeBtn.classList.add('main-tab-active');
}

function loadHistoryPage() {
    // Cargar el HTML de la página de historial
    fetch('/history/history-page.html')
        .then(response => response.text())
        .then(html => {
            document.getElementById('history-page-content').innerHTML = html;
            // Cargar los datos del historial
            loadHistoryInPage();
        })
        .catch(error => console.error('Error cargando página de historial:', error));
}

function loadHistoryInPage() {
    // Similar a loadHistory pero para la página completa
    const url = selectedProjectId ? `${API_BASE}/history?project_id=${selectedProjectId}` : `${API_BASE}/history`;
    
    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Actualizar contador
                const countElement = document.getElementById('count-stories-page');
                if (countElement) {
                    countElement.textContent = data.total_stories || 0;
                }
                
                // Renderizar el historial
                renderHistoryInPage(data.history);
            }
        })
        .catch(error => console.error('Error:', error));
}

function renderHistoryInPage(stories) {
    const container = document.getElementById('history-content-page');
    if (!container) return;
    
    if (!stories || stories.length === 0) {
        container.innerHTML = `
            <div class="text-center py-12 text-gray-500">
                <i class="fas fa-inbox text-6xl mb-4 opacity-50"></i>
                <p class="text-lg font-semibold">No hay historias generadas aún</p>
                <p class="text-sm mt-2">Comienza generando tu primera historia de usuario</p>
            </div>
        `;
        return;
    }
    
    // Reutilizar la misma lógica de renderizado del modal
    let html = '<div class="space-y-4">';
    
    stories.forEach(story => {
        // Determinar badges y botones según el estado
        let statusBadge = '';
        let viewButton = '';
        let downloadButton = '';
        
        if (story.has_scenarios && story.scenarios) {
            if (story.scenarios.is_signed) {
                // Firmado y aprobado
                statusBadge = `<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-300">
                    <i class="fas fa-check-circle mr-1"></i>Firmado y Aprobado
                </span>`;
                
                downloadButton = `<button onclick="downloadReportFromHistory('${story.scenarios.filename}')" class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all" title="Descargar reporte final firmado">
                    <i class="fas fa-download mr-2"></i>Descargar Reporte Final
                </button>`;
            } else {
                // Con escenarios pero sin firmar
                statusBadge = `<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 border border-yellow-300">
                    <i class="fas fa-pen mr-1"></i>Pendiente Firma
                </span>`;
                
                viewButton = `<button onclick="viewAndSignReport('${story.filename}', '${story.scenarios.filename}')" class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all" title="Ver y firmar reporte">
                    <i class="fas fa-signature mr-2"></i>Ver y Firmar Reporte
                </button>`;
            }
        } else {
            // Sin escenarios
            statusBadge = `
                <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800 border border-orange-300 mr-2">
                    <i class="fas fa-vial mr-1"></i>Pendiente Escenarios de Prueba
                </span>
                <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 border border-yellow-300">
                    <i class="fas fa-pen-fancy mr-1"></i>Pendiente Firma
                </span>
            `;
            
            viewButton = `<button onclick="completeWithScenarios('${story.filename}')" class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all" title="Ver historias y completar con escenarios de prueba">
                <i class="fas fa-eye mr-2"></i>Ver y Completar Proceso
            </button>`;
        }
        
        // Determinar el título a mostrar
        const displayTitle = story.project_name || `Proyecto del ${story.date.split(' ')[0]}`;
        
        html += `
            <div class="history-file-card border border-gray-200 rounded-lg p-4 bg-gradient-to-r from-white to-purple-50">
                <div class="flex items-center justify-between">
                    <div class="flex-1">
                        <div class="flex items-center flex-wrap gap-2 mb-2">
                            <i class="fas fa-file-alt text-purple-600 text-xl"></i>
                            <h3 class="font-bold text-gray-800">${displayTitle}</h3>
                            ${statusBadge}
                        </div>
                        <div class="flex items-center space-x-4 text-sm text-gray-600">
                            <span><i class="fas fa-calendar mr-1"></i>${story.date}</span>
                            <span><i class="fas fa-database mr-1"></i>${(story.size / 1024).toFixed(2)} KB</span>
                        </div>
                    </div>
                    <div class="flex items-center space-x-2">
                        <div class="flex space-x-2">
                            ${viewButton}
                            ${downloadButton}
                        </div>
                        <button onclick="deleteHistoryFile('${story.filename}')" class="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all" title="Eliminar este requerimiento">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

// Ejemplos de requerimientos
const examples = {
    1: "El sistema debe gestionar usuarios de forma segura y eficiente, permitiendo el registro y autenticación de usuarios",
    2: "Necesito que el reporte se genere automáticamente con buena calidad y se envíe periódicamente a los usuarios",
    3: "El sistema debe ser rápido y fácil de usar para los usuarios, permitiendo realizar consultas de forma intuitiva"
};

// Versión fija - siempre usa v4 (la mejor)
const AGENT_VERSION = 'v4';

// ============================================================
// SUB-TABS DE AMBIGÜEDADES
// ============================================================

function switchAmbiguitySubTab(subtabName) {
    // Ocultar todos los sub-tabs
    document.querySelectorAll('.ambiguity-subtab-content').forEach(tab => {
        tab.classList.add('hidden');
    });
    
    // Mostrar el sub-tab seleccionado
    document.getElementById(`ambiguity-subtab-${subtabName}`).classList.remove('hidden');
    
    // Actualizar estilos de los botones (segmented control)
    document.querySelectorAll('[id^="subtab-"]').forEach(btn => {
        btn.classList.remove('bg-white', 'text-indigo-600', 'shadow-sm');
        btn.classList.add('text-gray-600', 'hover:text-gray-800');
    });
    
    const activeBtn = document.getElementById(`subtab-${subtabName}`);
    activeBtn.classList.remove('text-gray-600', 'hover:text-gray-800');
    activeBtn.classList.add('bg-white', 'text-indigo-600', 'shadow-sm');
}

// ============================================================
// SUB-TABS DE RESULTADOS
// ============================================================

function updateStoriesStats() {
    const statsContainer = document.getElementById('storiesStats');
    if (!statsContainer || !currentContractA || !currentContractA.user_stories) {
        return;
    }
    
    const stories = currentContractA.user_stories;
    const totalStories = stories.length;
    
    // Calcular total de criterios de aceptación
    let totalCriteria = 0;
    stories.forEach(story => {
        if (story.acceptance_criteria) {
            totalCriteria += story.acceptance_criteria.length;
        }
    });
    
    // Generar lista compacta de historias
    let storiesList = '';
    stories.forEach((story, index) => {
        const title = story.title || story.user_story || `Historia ${index + 1}`;
        const criteria = story.acceptance_criteria || [];
        const priorityIcon = story.priority === 'Alta' ? '🔴' : story.priority === 'Media' ? '🟡' : '🟢';
        
        // Generar lista de criterios
        let criteriaList = '';
        if (criteria.length > 0) {
            criteriaList = criteria.map(c => {
                // Los criterios son objetos con id y description
                const criteriaText = typeof c === 'string' ? c : (c.description || c.id || 'Criterio sin descripción');
                return `<li class="text-xs text-gray-600">• ${criteriaText}</li>`;
            }).join('');
        }
        
        storiesList += `
            <div class="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div class="flex items-start space-x-3 mb-2">
                    <div class="flex-shrink-0 mt-0.5">
                        <span class="text-lg">${priorityIcon}</span>
                    </div>
                    <div class="flex-1">
                        <p class="text-sm font-bold text-gray-800">${title}</p>
                    </div>
                </div>
                ${criteria.length > 0 ? `
                    <div class="ml-8 mt-2">
                        <p class="text-xs font-semibold text-gray-700 mb-1">Criterios de Aceptación:</p>
                        <ul class="space-y-1">
                            ${criteriaList}
                        </ul>
                    </div>
                ` : '<p class="ml-8 text-xs text-gray-500 italic">Sin criterios de aceptación</p>'}
            </div>
        `;
    });
    
    // Generar HTML del resumen
    const html = `
        <div class="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6 border-2 border-indigo-200">
            <div class="flex items-center justify-between mb-4">
                <h4 class="text-lg font-bold text-gray-800 flex items-center">
                    <i class="fas fa-clipboard-list text-indigo-600 mr-2"></i>
                    Historias a Procesar
                </h4>
                <div class="text-sm font-semibold text-indigo-600">
                    ${totalStories} historia${totalStories !== 1 ? 's' : ''} • ${totalCriteria} criterio${totalCriteria !== 1 ? 's' : ''}
                </div>
            </div>
            <div class="space-y-2 max-h-64 overflow-y-auto">
                ${storiesList}
            </div>
        </div>
    `;
    
    statsContainer.innerHTML = html;
}

function switchResultsSubTab(subtabName) {
    // Ocultar todos los sub-tabs
    document.querySelectorAll('.results-subtab-content').forEach(tab => {
        tab.classList.add('hidden');
    });
    
    // Mostrar el sub-tab seleccionado
    document.getElementById(`results-subtab-${subtabName}`).classList.remove('hidden');
    
    // Si es el sub-tab de escenarios, actualizar estadísticas
    if (subtabName === 'scenarios') {
        updateStoriesStats();
    }
    
    // Actualizar estilos de los botones (segmented control)
    document.querySelectorAll('[id^="subtab-"]').forEach(btn => {
        // Solo actualizar botones de resultados
        if (btn.id === 'subtab-stories' || btn.id === 'subtab-scenarios') {
            btn.classList.remove('bg-white', 'text-indigo-600', 'shadow-sm');
            btn.classList.add('text-gray-600', 'hover:text-gray-800');
        }
    });
    
    const activeBtn = document.getElementById(`subtab-${subtabName}`);
    if (activeBtn) {
        activeBtn.classList.remove('text-gray-600', 'hover:text-gray-800');
        activeBtn.classList.add('bg-white', 'text-indigo-600', 'shadow-sm');
    }
}

// ============================================================
// TOOLTIPS INTERACTIVOS
// ============================================================

function showTooltip(event, tooltipId) {
    const tooltip = document.getElementById(tooltipId);
    if (!tooltip) return;
    
    const button = event.currentTarget;
    const rect = button.getBoundingClientRect();
    
    tooltip.classList.remove('hidden');
    
    // Posicionar el tooltip debajo del botón
    tooltip.style.left = `${rect.left + (rect.width / 2)}px`;
    tooltip.style.top = `${rect.bottom + 10}px`;
    tooltip.style.transform = 'translateX(-50%)';
}

function hideTooltip(tooltipId) {
    const tooltip = document.getElementById(tooltipId);
    if (tooltip) {
        tooltip.classList.add('hidden');
    }
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    checkApiKey();
    checkHealth();
    setupEventListeners();
    setupApiKeyToggle();
    updateGenerateCodeButtonState();
});

function setupEventListeners() {
    const input = document.getElementById('requirementInput');
    input.addEventListener('input', updateCharCount);
}

function updateCharCount() {
    const input = document.getElementById('requirementInput');
    const count = document.getElementById('charCount');
    const button = document.getElementById('startProcessBtn');
    const length = input.value.length;
    
    count.textContent = `${length} caracteres`;
    
    // Habilitar/deshabilitar botón según mínimo de 15 caracteres
    if (length >= 15) {
        button.disabled = false;
    } else {
        button.disabled = true;
    }
}

// ============================================================
// GESTIÓN DE API KEY
// ============================================================

function getApiHeaders(additionalHeaders = {}) {
    const apiKey = localStorage.getItem('groq_api_key');
    return {
        'Content-Type': 'application/json',
        'X-Groq-API-Key': apiKey || '',
        ...additionalHeaders
    };
}

function checkApiKey() {
    const apiKey = localStorage.getItem('groq_api_key');
    if (!apiKey) {
        document.getElementById('apiKeyModal').classList.remove('hidden');
    }
}

function openApiKeyModal() {
    const currentKey = localStorage.getItem('groq_api_key');
    if (currentKey) {
        document.getElementById('apiKeyInput').value = currentKey;
    }
    document.getElementById('apiKeyModal').classList.remove('hidden');
}

function setupApiKeyToggle() {
    const checkbox = document.getElementById('showApiKey');
    const input = document.getElementById('apiKeyInput');
    if (!checkbox || !input) return;
    checkbox.addEventListener('change', () => {
        input.type = checkbox.checked ? 'text' : 'password';
    });
}

function saveApiKey() {
    const apiKey = document.getElementById('apiKeyInput').value.trim();
    
    if (!apiKey) {
        alert('Por favor ingresa una API Key válida');
        return;
    }
    
    if (!apiKey.startsWith('gsk_')) {
        alert('La API Key de Groq debe comenzar con "gsk_"');
        return;
    }
    
    // Guardar en localStorage
    localStorage.setItem('groq_api_key', apiKey);
    
    // Cerrar modal
    document.getElementById('apiKeyModal').classList.add('hidden');
    
    // Mostrar confirmación
    alert('✅ API Key guardada correctamente. Ya puedes usar QualityAI.');
    
    // Recargar health check
    checkHealth();
}

async function checkHealth() {
    try {
        const response = await fetch(`${API_BASE}/health`);
        const data = await response.json();
        
        // Actualizar contador de KB en el menú de usuario
        if (data.kb_count && typeof updateKbCountInMenu === 'function') {
            updateKbCountInMenu(data.kb_count);
        }
        
        // Actualizar estado en el menú de usuario
        if (typeof updateSystemStatusInMenu === 'function') {
            updateSystemStatusInMenu(data.status, data.groq_configured);
        }
        
    } catch (error) {
        console.error('Error checking health:', error);
        
        // Actualizar estado como desconectado en el menú
        if (typeof updateSystemStatusInMenu === 'function') {
            updateSystemStatusInMenu('error', false);
        }
    }
}

function switchTab(tab) {
    // Update tab buttons
    document.querySelectorAll('[id^="tab-"]').forEach(btn => {
        btn.classList.remove('tab-active');
    });
    document.getElementById(`tab-${tab}`).classList.add('tab-active');
    
    // Update content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.add('hidden');
    });
    document.getElementById(`content-${tab}`).classList.remove('hidden');
    
    // Si se cambia al tab de Resultados, actualizar su estado
    if (tab === 'results') {
        updateResultsTabState();
    }
    
    // Si se cambia al tab de Ambigüedades, actualizar su estado
    if (tab === 'ambiguities') {
        // Asegurar que estamos en el sub-tab Resumen
        switchAmbiguitySubTab('summary');
        
        // Solo actualizar si hay un requerimiento procesado
        if (window.requirementTitle || currentAmbiguities.length > 0 || originalAmbiguities.length > 0) {
            // Si ya se resolvieron las ambigüedades, usar las originales para mostrar el estado correcto
            const ambiguitiesToShow = window.hasPendingAmbiguities === false && originalAmbiguities.length > 0 
                ? originalAmbiguities 
                : currentAmbiguities;
            
            displayAmbiguities({
                ambiguities: ambiguitiesToShow,
                requirement_title: window.requirementTitle
            });
        }
    }

    // Si se cambia al tab de Código, mostrar estado sin generar automaticamente
    if (tab === 'code') {
        updateCodeTabState();
    }
}

function loadExample(num) {
    document.getElementById('requirementInput').value = examples[num];
    updateCharCount();
}

function clearInput() {
    // Solo limpiar el input de texto
    document.getElementById('requirementInput').value = '';
    updateCharCount();
}

function startNewRequirement() {
    // Limpiar el input
    document.getElementById('requirementInput').value = '';
    updateCharCount();
    
    // Resetear todas las variables globales
    currentAmbiguities = [];
    originalAmbiguities = [];
    currentResolutions = [];
    currentContractA = null;
    currentContractATimestamp = null;
    window.hasPendingAmbiguities = undefined;
    window.requirementTitle = undefined;
    
    // Resetear Contract C (codigo generado) al crear nueva historia
    currentContractC = null;
    currentContractCFilename = null;
    const codeContainer = document.getElementById('content-code');
    if (codeContainer) {
        codeContainer.innerHTML = '';
    }

    // Limpiar contenedor de ambigüedades - restaurar estado inicial
    const ambiguitiesContainer = document.getElementById('ambiguitiesContainer');
    if (ambiguitiesContainer) {
        ambiguitiesContainer.innerHTML = `
            <div id="noRequirementState" class="flex items-center justify-center" style="min-height: 60vh;">
                <div class="text-center max-w-lg">
                    <div class="mb-8">
                        <div class="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl mb-6">
                            <i class="fas fa-search text-4xl text-indigo-600"></i>
                        </div>
                        <h2 class="text-3xl font-bold text-gray-800 mb-3">No hay análisis disponible</h2>
                        <p class="text-gray-500 text-lg mb-8">Ingresa un requerimiento para detectar automáticamente las ambigüedades</p>
                        <button onclick="switchTab('input')" class="inline-flex items-center px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg">
                            Ir a Entrada de Requerimientos
                        </button>
                    </div>
                </div>
            </div>
            
            <div id="noAmbiguitiesState" class="hidden flex items-center justify-center" style="min-height: 60vh;">
                <div class="text-center max-w-lg">
                    <div class="mb-8">
                        <div class="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-100 to-emerald-100 rounded-2xl mb-6">
                            <i class="fas fa-check-circle text-4xl text-green-600"></i>
                        </div>
                        <h2 class="text-3xl font-bold text-gray-800 mb-3">¡Excelente! No se encontraron ambigüedades</h2>
                        <p class="text-gray-600 text-lg mb-2" id="noAmbiguitiesRequirementTitle">Tu requerimiento está claro y listo</p>
                        <p class="text-gray-500 mb-8">Puedes continuar directamente a generar las historias de usuario</p>
                        <button onclick="switchTab('results')" class="inline-flex items-center px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-all shadow-md hover:shadow-lg">
                            Ver Resultados
                        </button>
                    </div>
                </div>
            </div>
            
            <div id="ambiguitiesResolvedState" class="hidden flex items-center justify-center" style="min-height: 60vh;">
                <div class="text-center max-w-lg">
                    <div class="mb-8">
                        <div class="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl mb-6">
                            <i class="fas fa-check-double text-4xl text-blue-600"></i>
                        </div>
                        <h2 class="text-3xl font-bold text-gray-800 mb-3">Ambigüedades Resueltas</h2>
                        <p class="text-gray-600 text-lg mb-2">Las ambigüedades detectadas ya fueron resueltas</p>
                        <p class="text-gray-500 mb-8">Las historias de usuario han sido generadas exitosamente</p>
                        <button onclick="switchTab('results')" class="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg">
                            Ver Historias Generadas
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Limpiar panel de resolución
    const resolutionPanel = document.getElementById('resolutionPanel');
    if (resolutionPanel) {
        resolutionPanel.classList.add('hidden');
        resolutionPanel.innerHTML = '';
    }
    
    // Limpiar contenedor de resultados - restaurar estado inicial
    const resultsContainer = document.getElementById('resultsContainer');
    if (resultsContainer) {
        resultsContainer.innerHTML = `
            <div id="noStoriesState" class="flex items-center justify-center" style="min-height: 60vh;">
                <div class="text-center max-w-lg">
                    <div class="mb-8">
                        <div class="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl mb-6">
                            <i class="fas fa-clipboard-list text-4xl text-indigo-600"></i>
                        </div>
                        <h2 class="text-3xl font-bold text-gray-800 mb-3">No hay historias disponibles</h2>
                        <p class="text-gray-500 text-lg mb-8">Ingresa un requerimiento para generar historias de usuario automáticamente</p>
                        <button onclick="switchTab('input')" class="inline-flex items-center px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg">
                            Ir a Entrada de Requerimientos
                        </button>
                    </div>
                </div>
            </div>
            
            <div id="pendingAmbiguitiesState" class="hidden">
                <div class="text-center max-w-lg mx-auto">
                    <div class="mb-8">
                        <div class="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-orange-100 to-red-100 rounded-2xl mb-6">
                            <i class="fas fa-exclamation-triangle text-4xl text-orange-600"></i>
                        </div>
                        <h2 class="text-3xl font-bold text-gray-800 mb-3">Ambigüedades Pendientes</h2>
                        <p class="text-gray-500 text-lg mb-8">Debes resolver las ambigüedades detectadas antes de generar las historias de usuario</p>
                        <button onclick="switchTab('ambiguities')" class="inline-flex items-center px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg font-semibold hover:from-orange-700 hover:to-red-700 transition-all shadow-md hover:shadow-lg">
                            Ir a Resolver Ambigüedades
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Limpiar contenedor de escenarios
    const module2Content = document.getElementById('module2Content');
    if (module2Content) {
        module2Content.innerHTML = '';
        module2Content.classList.add('hidden');
    }
    
    const scenariosEmptyState = document.getElementById('scenariosEmptyState');
    if (scenariosEmptyState) {
        scenariosEmptyState.classList.remove('hidden');
    }
    
    // Resetear sub-tabs a su estado inicial (NO deshabilitar los tabs principales)
    const subtabResolution = document.getElementById('subtab-resolution');
    const subtabScenarios = document.getElementById('subtab-scenarios');
    
    if (subtabResolution) {
        subtabResolution.disabled = true;
        subtabResolution.classList.add('text-gray-400', 'cursor-not-allowed');
        subtabResolution.classList.remove('text-gray-600', 'hover:text-gray-800');
    }
    
    if (subtabScenarios) {
        subtabScenarios.disabled = true;
        subtabScenarios.classList.add('text-gray-400', 'cursor-not-allowed');
        subtabScenarios.classList.remove('text-gray-600', 'hover:text-gray-800');
    }
    
    // Resetear contadores en headers
    const ambCountHeader = document.getElementById('ambCountHeader');
    if (ambCountHeader) ambCountHeader.textContent = '0';
    
    const storiesCountHeader = document.getElementById('storiesCountHeader');
    if (storiesCountHeader) storiesCountHeader.textContent = '0';
    
    // Redirigir al tab de entrada de requerimientos
    switchTab('input');
}

async function startProcess() {
    const requirement = document.getElementById('requirementInput').value.trim();
    
    if (!requirement) {
        alert('Por favor ingrese un requerimiento');
        return;
    }
    
    // Paso 1: Analizar ambigüedades
    showLoading('Analizando ambigüedades...');
    
    try {
        const response = await fetch(`${API_BASE}/analyze-ambiguities`, {
            method: 'POST',
            headers: getApiHeaders(),
            body: JSON.stringify({ requirement_text: requirement })
        });
        
        const data = await response.json();
        currentAmbiguities = data.ambiguities || [];
        originalAmbiguities = [...currentAmbiguities]; // Guardar copia de las ambigüedades originales
        
        // Guardar estado de ambigüedades pendientes
        window.hasPendingAmbiguities = currentAmbiguities.length > 0;
        window.requirementTitle = requirement.substring(0, 50);
        
        hideLoading();
        
        // Si NO hay ambigüedades, mostrar estado y generar directamente
        if (currentAmbiguities.length === 0) {
            // Mostrar estado "sin ambigüedades" antes de generar
            displayAmbiguities({
                ambiguities: [],
                requirement_title: requirement.substring(0, 50)
            });
            await refineRequirements(null);
            return;
        }
        
        // Si HAY ambigüedades, mostrar para resolución
        displayAmbiguities(data);
        
        // Actualizar estado del tab de Resultados
        updateResultsTabState();
        
        switchTab('ambiguities');
        
    } catch (error) {
        console.error('Error:', error);
        alert('Error al analizar: ' + error.message);
        hideLoading();
    }
}

function showLoading(message = 'Procesando...') {
    document.getElementById('loadingMessage').textContent = message;
    document.getElementById('loadingModal').classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loadingModal').classList.add('hidden');
}

async function analyzeAmbiguities() {
    const requirement = document.getElementById('requirementInput').value.trim();
    
    if (!requirement) {
        alert('Por favor ingrese un requerimiento');
        return;
    }
    
    showLoading('Analizando ambigüedades...');
    
    try {
        const response = await fetch(`${API_BASE}/analyze-ambiguities`, {
            method: 'POST',
            headers: getApiHeaders(),
            body: JSON.stringify({ requirement_text: requirement })
        });
        
        const data = await response.json();
        currentAmbiguities = data.ambiguities || [];
        originalAmbiguities = [...currentAmbiguities]; // Guardar copia de las ambigüedades originales
        
        // Guardar estado de ambigüedades pendientes
        window.hasPendingAmbiguities = currentAmbiguities.length > 0;
        window.requirementTitle = requirement.substring(0, 50);
        
        // Asegurar que siempre se pase el título del requerimiento
        displayAmbiguities({
            ...data,
            requirement_title: requirement.substring(0, 50)
        });
        
        // Actualizar estado del tab de Resultados
        updateResultsTabState();
        
        switchTab('ambiguities');
        hideLoading();
    } catch (error) {
        console.error('Error:', error);
        alert('Error al analizar ambigüedades: ' + error.message);
        hideLoading();
    }
}

function updateResultsTabState() {
    const noStoriesState = document.getElementById('noStoriesState');
    const pendingAmbiguitiesState = document.getElementById('pendingAmbiguitiesState');
    
    if (!noStoriesState || !pendingAmbiguitiesState) return;
    
    // Si hay historias generadas (currentContractA existe), no mostrar estados vacíos
    if (currentContractA && currentContractA.user_stories && currentContractA.user_stories.length > 0) {
        noStoriesState.classList.add('hidden');
        pendingAmbiguitiesState.classList.add('hidden');
        return;
    }
    
    // Si no hay historias, mostrar el estado apropiado
    if (window.hasPendingAmbiguities) {
        // Mostrar estado de ambigüedades pendientes
        noStoriesState.classList.add('hidden');
        pendingAmbiguitiesState.classList.remove('hidden');
        pendingAmbiguitiesState.classList.add('flex', 'items-center', 'justify-center');
    } else {
        // Mostrar estado normal (sin requerimiento o listo para generar)
        noStoriesState.classList.remove('hidden');
        pendingAmbiguitiesState.classList.add('hidden');
        pendingAmbiguitiesState.classList.remove('flex', 'items-center', 'justify-center');
    }
}

function displayAmbiguities(data) {
    const container = document.getElementById('ambiguitiesContainer');
    const noRequirementState = document.getElementById('noRequirementState');
    const noAmbiguitiesState = document.getElementById('noAmbiguitiesState');
    const ambiguitiesResolvedState = document.getElementById('ambiguitiesResolvedState');
    const noAmbiguitiesTitle = document.getElementById('noAmbiguitiesRequirementTitle');
    const resolutionSubtab = document.getElementById('subtab-resolution');
    
    // Actualizar contador en el header
    const ambCountHeader = document.getElementById('ambCountHeader');
    if (ambCountHeader) {
        ambCountHeader.textContent = data.ambiguities ? data.ambiguities.length : 0;
    }
    
    // Si ya se generaron las historias (hasPendingAmbiguities = false), mostrar estado "resueltas"
    if (window.hasPendingAmbiguities === false && (data.ambiguities && data.ambiguities.length > 0)) {
        
        // Ocultar todos los demás estados (pero NO el contenedor principal)
        if (noRequirementState) noRequirementState.classList.add('hidden');
        if (noAmbiguitiesState) noAmbiguitiesState.classList.add('hidden');
        // NO ocultar el container porque ambiguitiesResolvedState está dentro de él
        
        // Mostrar estado "ambigüedades resueltas"
        let elementToShow = ambiguitiesResolvedState || document.querySelector('#ambiguitiesResolvedState');
        
        if (!elementToShow && container) {
            // Si el elemento no existe (fue borrado por innerHTML), recrearlo
            container.innerHTML = `
                <div id="ambiguitiesResolvedState" class="flex items-center justify-center" style="min-height: 60vh;">
                    <div class="text-center max-w-lg">
                        <div class="mb-8">
                            <div class="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl mb-6">
                                <i class="fas fa-check-double text-4xl text-blue-600"></i>
                            </div>
                            <h2 class="text-3xl font-bold text-gray-800 mb-3">Ambigüedades Resueltas</h2>
                            <p class="text-gray-600 text-lg mb-2">Las ambigüedades detectadas ya fueron resueltas</p>
                            <p class="text-gray-500 mb-8">Las historias de usuario han sido generadas exitosamente</p>
                            <button onclick="switchTab('results')" class="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg">
                                Ver Historias Generadas
                            </button>
                        </div>
                    </div>
                </div>
            `;
            elementToShow = document.getElementById('ambiguitiesResolvedState');
        }
        
        if (elementToShow) {
            elementToShow.classList.remove('hidden');
            elementToShow.classList.add('flex', 'items-center', 'justify-center');
        }
        
        // Deshabilitar sub-tab Resolver
        if (resolutionSubtab) {
            resolutionSubtab.disabled = true;
            resolutionSubtab.classList.add('text-gray-400', 'cursor-not-allowed');
            resolutionSubtab.classList.remove('text-gray-600', 'hover:text-gray-800');
        }
        
        document.getElementById('resolutionPanel')?.classList.add('hidden');
        return;
    }
    
    if (!data.ambiguities || data.ambiguities.length === 0) {
        // Ocultar estado "sin requerimiento" y "resueltas"
        if (noRequirementState) noRequirementState.classList.add('hidden');
        if (ambiguitiesResolvedState) ambiguitiesResolvedState.classList.add('hidden');
        
        // Mostrar estado "sin ambigüedades" con título del requerimiento
        if (noAmbiguitiesState) {
            noAmbiguitiesState.classList.remove('hidden');
            if (noAmbiguitiesTitle && data.requirement_title) {
                noAmbiguitiesTitle.textContent = `Tu requerimiento "${data.requirement_title}" está claro y listo`;
            }
        }
        
        // Deshabilitar sub-tab Resolver
        if (resolutionSubtab) {
            resolutionSubtab.disabled = true;
            resolutionSubtab.classList.add('text-gray-400', 'cursor-not-allowed');
            resolutionSubtab.classList.remove('text-gray-600', 'hover:text-gray-800');
        }
        
        document.getElementById('resolutionPanel')?.classList.add('hidden');
        return;
    }
    
    // Si hay ambigüedades, ocultar todos los estados vacíos y mostrar contenedor
    if (noRequirementState) noRequirementState.classList.add('hidden');
    if (noAmbiguitiesState) noAmbiguitiesState.classList.add('hidden');
    if (ambiguitiesResolvedState) ambiguitiesResolvedState.classList.add('hidden');
    if (container) container.classList.remove('hidden');
    
    // Habilitar sub-tab Resolver
    if (resolutionSubtab) {
        resolutionSubtab.disabled = false;
        resolutionSubtab.classList.remove('text-gray-400', 'cursor-not-allowed');
        resolutionSubtab.classList.add('text-gray-600', 'hover:text-gray-800');
    }
    
    const severityColors = {
        'alta': 'severity-alta',
        'media': 'severity-media',
        'baja': 'severity-baja'
    };
    
    const severityIcons = {
        'alta': 'fa-exclamation-circle',
        'media': 'fa-exclamation-triangle',
        'baja': 'fa-info-circle'
    };
    
    // Asegurar que severity_count existe, si no, calcularlo
    let severityCount = data.severity_count;
    if (!severityCount && data.ambiguities) {
        severityCount = {
            alta: data.ambiguities.filter(a => a.severity === 'alta').length,
            media: data.ambiguities.filter(a => a.severity === 'media').length,
            baja: data.ambiguities.filter(a => a.severity === 'baja').length
        };
    } else if (!severityCount) {
        severityCount = { alta: 0, media: 0, baja: 0 };
    }
    
    let html = `
        <div class="mb-6 p-4 bg-orange-50 border-l-4 border-orange-500 rounded">
            <div class="flex items-center mb-2">
                <i class="fas fa-chart-pie text-orange-600 mr-2"></i>
                <h3 class="font-bold text-gray-800">Resumen del Análisis</h3>
            </div>
            <div class="grid grid-cols-3 gap-4 mt-4">
                <div class="text-center p-3 bg-red-100 rounded-lg">
                    <div class="text-2xl font-bold text-red-700">${severityCount.alta || 0}</div>
                    <div class="text-sm text-red-600">Alta Severidad</div>
                </div>
                <div class="text-center p-3 bg-orange-100 rounded-lg">
                    <div class="text-2xl font-bold text-orange-700">${severityCount.media || 0}</div>
                    <div class="text-sm text-orange-600">Media Severidad</div>
                </div>
                <div class="text-center p-3 bg-green-100 rounded-lg">
                    <div class="text-2xl font-bold text-green-700">${severityCount.baja || 0}</div>
                    <div class="text-sm text-green-600">Baja Severidad</div>
                </div>
            </div>
        </div>
        
        <div class="space-y-4">
    `;
    
    const severityTooltips = {
        'alta': 'Crítico - Afecta significativamente la claridad del requerimiento',
        'media': 'Moderado - Puede causar interpretaciones diferentes',
        'baja': 'Menor - Aclaración recomendada pero no crítica'
    };
    
    data.ambiguities.forEach((amb, index) => {
        html += `
            <div class="border-l-4 border-${amb.severity === 'alta' ? 'red' : amb.severity === 'media' ? 'orange' : 'green'}-500 bg-white p-4 rounded-lg shadow-sm">
                <div class="flex items-start justify-between mb-3">
                    <div class="flex items-center space-x-3">
                        <div class="${severityColors[amb.severity]} text-white w-10 h-10 rounded-full flex items-center justify-center">
                            <i class="fas ${severityIcons[amb.severity]}"></i>
                        </div>
                        <div>
                            <h4 class="font-bold text-gray-800 text-lg">"${amb.word}"</h4>
                            <span class="text-sm text-gray-500">${amb.category.replace(/_/g, ' ')}</span>
                        </div>
                    </div>
                    <span class="badge badge-${amb.severity === 'alta' ? 'critical' : amb.severity === 'media' ? 'high' : 'medium'}" title="${severityTooltips[amb.severity]}">
                        ${amb.severity.toUpperCase()}
                    </span>
                </div>
                
                <div class="space-y-2 text-sm">
                    <div class="flex items-start">
                        <i class="fas fa-quote-left text-gray-400 mr-2 mt-1"></i>
                        <div>
                            <span class="font-semibold text-gray-700">Contexto:</span>
                            <span class="text-gray-600">${amb.context}</span>
                        </div>
                    </div>
                    
                    <div class="flex items-start">
                        <i class="fas fa-lightbulb text-yellow-500 mr-2 mt-1"></i>
                        <div>
                            <span class="font-semibold text-gray-700">Sugerencia:</span>
                            <span class="text-gray-600">${amb.suggestion}</span>
                        </div>
                    </div>
                    
                    ${amb.ieee_830_violation ? `
                        <div class="flex items-start">
                            <i class="fas fa-book text-blue-500 mr-2 mt-1"></i>
                            <div>
                                <span class="font-semibold text-gray-700">IEEE 830:</span>
                                <span class="text-gray-600">${amb.ieee_830_violation}</span>
                            </div>
                        </div>
                    ` : ''}
                    
                    ${amb.iso_25010_category ? `
                        <div class="flex items-start">
                            <i class="fas fa-certificate text-purple-500 mr-2 mt-1"></i>
                            <div>
                                <span class="font-semibold text-gray-700">ISO 25010:</span>
                                <span class="text-gray-600">${amb.iso_25010_category}</span>
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    });
    
    html += `
        </div>
        
        <!-- CTA para ir a resolver -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mt-6">
            <div class="flex items-center justify-between">
                <div class="flex items-center space-x-3">
                    <div class="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                        <i class="fas fa-arrow-right text-indigo-600"></i>
                    </div>
                    <div>
                        <p class="text-sm font-semibold text-gray-800">Siguiente paso</p>
                        <p class="text-xs text-gray-500">Decide cómo resolver cada ambigüedad</p>
                    </div>
                </div>
                <button onclick="switchAmbiguitySubTab('resolution')" class="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg">
                    <i class="fas fa-tasks mr-2"></i>
                    Ir a Resolver Ambigüedades
                </button>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
    
    // Siempre mostrar panel de resolución (v4)
    displayResolutionPanel(data.ambiguities);
}

function displayResolutionPanel(ambiguities) {
    const panel = document.getElementById('resolutionPanel');
    const container = document.getElementById('resolutionItems');
    
    currentResolutions = [];
    
    let html = '';
    ambiguities.forEach((amb, index) => {
        currentResolutions.push({
            word: amb.word,
            category: amb.category,
            analyst_resolution: '',
            status: 'pending'
        });
        
        html += `
            <div class="border-2 border-gray-200 rounded-lg p-4 bg-gray-50">
                <div class="flex items-center justify-between mb-3">
                    <h4 class="font-bold text-gray-800">"${amb.word}"</h4>
                    <span class="text-sm text-gray-500">${amb.category.replace(/_/g, ' ')}</span>
                </div>
                
                <p class="text-sm text-gray-600 mb-3">
                    <i class="fas fa-lightbulb text-yellow-500 mr-1"></i>
                    Sugerencia: ${amb.suggestion}
                </p>
                
                <div class="space-y-2">
                    <label class="flex items-center space-x-2 cursor-pointer">
                        <input type="radio" name="resolution-${index}" value="accept" class="text-purple-600" onchange="updateResolution(${index}, 'accept', '${amb.suggestion.replace(/'/g, "\\'")}')">
                        <span class="text-sm">Aceptar sugerencia</span>
                    </label>
                    
                    <label class="flex items-center space-x-2 cursor-pointer">
                        <input type="radio" name="resolution-${index}" value="custom" class="text-purple-600" onchange="toggleCustomInput(${index})">
                        <span class="text-sm">Proporcionar mi propia resolución</span>
                    </label>
                    
                    <div id="custom-input-${index}" class="hidden ml-6 mt-2">
                        <input type="text" 
                               id="custom-text-${index}"
                               class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                               placeholder="Escriba su resolución..."
                               onchange="updateResolution(${index}, 'custom', this.value)">
                    </div>
                    
                    <label class="flex items-center space-x-2 cursor-pointer">
                        <input type="radio" name="resolution-${index}" value="dismiss" class="text-purple-600" onchange="updateResolution(${index}, 'dismiss', '')">
                        <span class="text-sm">Descartar - no es ambiguo en este contexto</span>
                    </label>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    panel.classList.remove('hidden');
    
    // Inicializar contador
    updateResolutionProgress();
}

function toggleCustomInput(index) {
    const customDiv = document.getElementById(`custom-input-${index}`);
    customDiv.classList.remove('hidden');
    document.getElementById(`custom-text-${index}`).focus();
}

function updateResolution(index, type, value) {
    if (type === 'accept') {
        currentResolutions[index] = {
            ...currentResolutions[index],
            analyst_resolution: value,
            status: 'resolved'
        };
    } else if (type === 'custom') {
        currentResolutions[index] = {
            ...currentResolutions[index],
            analyst_resolution: value,
            status: 'resolved'
        };
    } else if (type === 'dismiss') {
        currentResolutions[index] = {
            ...currentResolutions[index],
            analyst_resolution: '',
            status: 'dismissed'
        };
    }
    
    // Actualizar contador y barra de progreso
    updateResolutionProgress();
}

function showAcceptAllModal() {
    if (!currentResolutions || currentResolutions.length === 0) {
        alert('No hay ambigüedades para resolver');
        return;
    }
    
    // Actualizar el contador en el modal
    const modalCount = document.getElementById('modalAmbCount');
    if (modalCount) {
        modalCount.textContent = currentResolutions.length;
    }
    
    // Mostrar el modal
    document.getElementById('acceptAllModal').classList.remove('hidden');
}

function closeAcceptAllModal() {
    document.getElementById('acceptAllModal').classList.add('hidden');
}

// ============================================================
// MODAL DE ERROR DE GROQ
// ============================================================

function showGroqErrorModal(errorType, fullErrorMessage) {
    const modal = document.getElementById('groqErrorModal');
    if (!modal) {
        alert('Error: ' + fullErrorMessage);
        return;
    }
    const header = document.getElementById('errorModalHeader');
    const icon = document.getElementById('errorModalIcon');
    const title = document.getElementById('errorModalTitle');
    const subtitle = document.getElementById('errorModalSubtitle');
    const message = document.getElementById('errorModalMessage');
    const solutions = document.getElementById('errorModalSolutions');
    const infoBox = document.getElementById('errorModalInfo');
    
    if (!title || !subtitle || !message || !solutions) {
        alert('Error: ' + fullErrorMessage);
        return;
    }
    
    // Configurar según el tipo de error
    let config = {
        title: 'Error en API',
        subtitle: 'Problema al procesar la solicitud',
        message: 'Ha ocurrido un error al procesar tu solicitud.',
        icon: 'fa-exclamation-circle',
        headerColor: 'from-red-600 to-red-700',
        infoColor: 'red',
        solutions: []
    };
    
    switch(errorType) {
        case 'rate_limit':
            config = {
                title: 'Límite de Tokens Alcanzado',
                subtitle: 'Has agotado tu cuota diaria',
                message: 'Has usado todos los tokens gratuitos disponibles para hoy en tu cuenta de Groq.',
                icon: 'fa-hourglass-end',
                headerColor: 'from-orange-600 to-orange-700',
                infoColor: 'orange',
                solutions: [
                    'Espera aproximadamente 1-2 horas para que se renueve tu cuota',
                    'Actualiza tu plan en Groq para obtener más tokens',
                    'Usa un modelo más pequeño temporalmente (consume menos tokens)'
                ]
            };
            break;
            
        case 'invalid_key':
            config = {
                title: 'API Key Inválida',
                subtitle: 'Problema con tu clave de acceso',
                message: 'La API Key de Groq que configuraste no es válida o ha expirado.',
                icon: 'fa-key',
                headerColor: 'from-red-600 to-red-700',
                infoColor: 'red',
                solutions: [
                    'Verifica que copiaste correctamente la API Key',
                    'Genera una nueva API Key en console.groq.com',
                    'Actualiza tu API Key en el menú de usuario'
                ]
            };
            break;
            
        case 'forbidden':
            config = {
                title: 'Acceso Denegado',
                subtitle: 'No tienes permisos suficientes',
                message: 'Tu cuenta de Groq no tiene permisos para acceder a este modelo o servicio.',
                icon: 'fa-ban',
                headerColor: 'from-red-600 to-red-700',
                infoColor: 'red',
                solutions: [
                    'Verifica tu plan de Groq',
                    'Contacta con soporte de Groq si crees que es un error',
                    'Intenta con un modelo diferente'
                ]
            };
            break;
            
        case 'server_error':
            config = {
                title: 'Servicio No Disponible',
                subtitle: 'Groq está experimentando problemas',
                message: 'El servicio de Groq está temporalmente no disponible o experimentando problemas técnicos.',
                icon: 'fa-server',
                headerColor: 'from-yellow-600 to-yellow-700',
                infoColor: 'yellow',
                solutions: [
                    'Espera unos minutos e intenta de nuevo',
                    'Verifica el estado del servicio en status.groq.com',
                    'Intenta más tarde si el problema persiste'
                ]
            };
            break;
            
        default:
            config.message = fullErrorMessage || config.message;
            config.solutions = [
                'Verifica tu conexión a internet',
                'Revisa la configuración de tu API Key',
                'Intenta de nuevo en unos momentos'
            ];
    }
    
    // Actualizar el modal
    title.textContent = config.title;
    subtitle.textContent = config.subtitle;
    message.textContent = config.message;
    icon.className = `fas ${config.icon} text-2xl`;
    header.className = `bg-gradient-to-r ${config.headerColor} p-6 text-white`;
    infoBox.className = `bg-${config.infoColor}-50 border-l-4 border-${config.infoColor}-500 p-4 rounded-lg`;
    infoBox.querySelector('.fas').className = `fas fa-info-circle text-${config.infoColor}-600 mt-0.5`;
    
    // Generar lista de soluciones
    solutions.innerHTML = config.solutions.map(sol => `<li>${sol}</li>`).join('');
    
    // Mostrar el modal
    modal.classList.remove('hidden');
}

function closeGroqErrorModal() {
    const modal = document.getElementById('groqErrorModal');
    if (modal) modal.classList.add('hidden');
}

function confirmAcceptAll() {
    // Cerrar el modal
    closeAcceptAllModal();
    
    // Aceptar todas las sugerencias
    currentResolutions.forEach((resolution, index) => {
        // Obtener la sugerencia del DOM
        const radioAccept = document.querySelector(`input[name="resolution-${index}"][value="accept"]`);
        if (radioAccept) {
            // Marcar el radio button
            radioAccept.checked = true;
            
            // Obtener la sugerencia del atributo onchange
            const onchangeAttr = radioAccept.getAttribute('onchange');
            const suggestionMatch = onchangeAttr.match(/'([^']+)'/);
            const suggestion = suggestionMatch ? suggestionMatch[1].replace(/\\'/g, "'") : '';
            
            // Actualizar la resolución
            currentResolutions[index] = {
                ...currentResolutions[index],
                analyst_resolution: suggestion,
                status: 'resolved'
            };
        }
    });
    
    // Actualizar UI
    updateResolutionProgress();
}

function updateResolutionProgress() {
    const total = currentResolutions.length;
    const completed = currentResolutions.filter(r => r.status !== 'pending').length;
    
    // Actualizar contador
    const resolvedCountEl = document.getElementById('resolvedCount');
    const totalAmbCountEl = document.getElementById('totalAmbCount');
    
    if (resolvedCountEl) resolvedCountEl.textContent = completed;
    if (totalAmbCountEl) totalAmbCountEl.textContent = total;
    
    // Actualizar barra de progreso
    const progressBar = document.getElementById('progressBar');
    if (progressBar) {
        const percentage = total > 0 ? (completed / total) * 100 : 0;
        progressBar.style.width = `${percentage}%`;
    }
    
    // Habilitar/deshabilitar botón según si está completo
    const submitBtn = document.getElementById('submitResolutionsBtn');
    if (submitBtn) {
        if (completed === total && total > 0) {
            // Todas completadas - habilitar botón
            submitBtn.disabled = false;
            submitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        } else {
            // Faltan por completar - deshabilitar botón
            submitBtn.disabled = true;
            submitBtn.classList.add('opacity-50', 'cursor-not-allowed');
        }
    }
}

function cancelResolutions() {
    currentResolutions = [];
    document.getElementById('resolutionPanel').classList.add('hidden');
    switchTab('input');
}

async function submitResolutions() {
    // Validate all resolutions are completed
    const pending = currentResolutions.filter(r => r.status === 'pending');
    if (pending.length > 0) {
        alert(`Por favor resuelva todas las ambigüedades (${pending.length} pendientes)`);
        return;
    }
    
    await refineRequirements(currentResolutions);
}

async function refineRequirements(resolutions = null) {
    const requirement = document.getElementById('requirementInput').value.trim();
    const version = AGENT_VERSION; // Siempre v4
    
    if (!requirement) {
        alert('Por favor ingrese un requerimiento');
        return;
    }
    
    showLoading('Refinando requerimientos con IA...');
    
    try {
        const payload = {
            requirement_text: requirement,
            version: version,
            project_id: selectedProjectId
        };
        
        if (resolutions) {
            payload.analyst_resolutions = resolutions;
        }
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minutos de timeout
        
        const response = await fetch(`${API_BASE}/refine-requirements`, {
            method: 'POST',
            headers: getApiHeaders(),
            body: JSON.stringify(payload),
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        // Marcar que ya no hay ambigüedades pendientes
        window.hasPendingAmbiguities = false;
        
        // Pasar el timestamp para vincular con escenarios
        displayResults(data.result, data.timestamp);
        
        // Actualizar estado del tab de Resultados
        updateResultsTabState();
        
        switchTab('results');
        hideLoading();
    } catch (error) {
        console.error('Error:', error);
        
        // Detectar tipo de error de Groq
        let errorMessage = error.message;
        let isGroqError = false;
        let errorType = 'general';
        
        if (errorMessage.includes('Rate limit') || errorMessage.includes('429')) {
            // Error de límite de tokens
            errorType = 'rate_limit';
            isGroqError = true;
        } else if (errorMessage.includes('401') || errorMessage.includes('Invalid API Key')) {
            // API Key inválida
            errorType = 'invalid_key';
            isGroqError = true;
        } else if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
            // Acceso denegado
            errorType = 'forbidden';
            isGroqError = true;
        } else if (errorMessage.includes('500') || errorMessage.includes('503')) {
            // Error del servidor de Groq
            errorType = 'server_error';
            isGroqError = true;
        }
        
        // Actualizar estado del sistema si es error de Groq
        if (isGroqError && typeof updateSystemStatusInMenu === 'function') {
            updateSystemStatusInMenu('groq_error', false);
        }
        
        // Mostrar modal de error
        showGroqErrorModal(errorType, errorMessage);
        hideLoading();
    }
}

function displayResults(result, timestamp = null) {
    const container = document.getElementById('resultsContainer');
    
    // Guardar Contract A y su timestamp para el módulo 2
    currentContractA = result || null;
    currentContractATimestamp = timestamp;
    
    if (!result || !result.user_stories) {
        container.innerHTML = `
            <div class="text-center py-12 text-gray-500">
                <i class="fas fa-exclamation-circle text-6xl mb-4 text-gray-300"></i>
                <p class="text-lg">Error: respuesta inválida del servidor</p>
            </div>
        `;
        return;
    }
    
    // Activar automáticamente el sub-tab "Historias"
    switchResultsSubTab('stories');
    
    // Actualizar contador en el header
    const storiesCountHeader = document.getElementById('storiesCountHeader');
    if (storiesCountHeader) {
        storiesCountHeader.textContent = result.user_stories.length;
    }
    
    // Mostrar botón para continuar al módulo 2
    const continueBtn = document.getElementById('continueToModule2');
    if (continueBtn) {
        continueBtn.classList.remove('hidden');
    }
    
    if (!result.user_stories.length) {
        container.innerHTML = `
            <div class="text-center py-12 text-gray-500">
                <i class="fas fa-exclamation-circle text-6xl mb-4 text-gray-300"></i>
                <p class="text-lg">No se generaron historias de usuario</p>
            </div>
        `;
        return;
    }
    
    let html = `
        <!-- Summary -->
        <div class="mb-6 p-6 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
            <h3 class="text-xl font-bold text-gray-800 mb-4">
                <i class="fas fa-chart-line text-purple-600 mr-2"></i>
                Resumen del Refinamiento
            </h3>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div class="text-center p-3 bg-white rounded-lg shadow-sm">
                    <div class="text-3xl font-bold text-purple-600">${result.user_stories.length}</div>
                    <div class="text-sm text-gray-600">Historias</div>
                </div>
                <div class="text-center p-3 bg-white rounded-lg shadow-sm">
                    <div class="text-3xl font-bold text-blue-600">${result.user_stories.reduce((sum, s) => sum + s.acceptance_criteria.length, 0)}</div>
                    <div class="text-sm text-gray-600">Criterios</div>
                </div>
                <div class="text-center p-3 bg-white rounded-lg shadow-sm">
                    <div class="text-3xl font-bold text-orange-600">${result.total_ambiguities_found}</div>
                    <div class="text-sm text-gray-600">Ambigüedades</div>
                </div>
                <div class="text-center p-3 bg-white rounded-lg shadow-sm" title="Número de decisiones que la IA tuvo que adivinar (0 es ideal)">
                    <div class="text-3xl font-bold ${result.total_assumptions_made === 0 ? 'text-green-600' : 'text-red-600'}">${result.total_assumptions_made}</div>
                    <div class="text-sm text-gray-600">Decisiones de IA</div>
                </div>
            </div>
            
            ${result.project_context ? `
                <div class="mt-4 p-4 bg-white rounded-lg">
                    <h4 class="font-semibold text-gray-700 mb-2">Contexto del Proyecto:</h4>
                    <p class="text-gray-600">${result.project_context}</p>
                </div>
            ` : ''}
        </div>
        
        <!-- User Stories -->
        <div class="space-y-6">
    `;
    
    result.user_stories.forEach((story, index) => {
        const priorityClass = {
            'critical': 'badge-critical',
            'high': 'badge-high',
            'medium': 'badge-medium',
            'low': 'badge-low'
        }[story.priority] || 'badge-medium';
        
        const priorityTooltip = {
            'critical': 'Urgente - Debe implementarse de inmediato',
            'high': 'Alta prioridad - Implementar pronto',
            'medium': 'Prioridad media - Planificar para próximas iteraciones',
            'low': 'Baja prioridad - Puede esperar'
        }[story.priority] || 'Prioridad media';
        
        const typeClass = {
            'functional': 'badge-functional',
            'non_functional': 'badge-non-functional',
            'technical': 'badge-technical'
        }[story.story_type] || 'badge-functional';
        
        const typeTooltip = {
            'functional': 'Funcionalidad visible para el usuario final',
            'non_functional': 'Requisito de calidad (rendimiento, seguridad, usabilidad)',
            'technical': 'Tarea técnica interna (refactorización, infraestructura)'
        }[story.story_type] || 'Funcionalidad del sistema';
        
        html += `
            <div class="story-card bg-white rounded-lg shadow-md p-6 fade-in">
                <div class="flex items-start justify-between mb-4">
                    <div>
                        <h3 class="text-xl font-bold text-gray-800">${story.id}: ${story.title}</h3>
                        <div class="flex items-center space-x-2 mt-2">
                            <span class="badge ${typeClass}" title="${typeTooltip}">${story.story_type.replace('_', ' ')}</span>
                            <span class="badge ${priorityClass}" title="${priorityTooltip}">${story.priority}</span>
                        </div>
                    </div>
                </div>
                
                <div class="bg-gray-50 rounded-lg p-4 mb-4">
                    <div class="space-y-2 text-sm">
                        <p><span class="font-semibold text-purple-600">Como</span> ${story.as_a}</p>
                        <p><span class="font-semibold text-purple-600">Quiero</span> ${story.i_want}</p>
                        <p><span class="font-semibold text-purple-600">Para que</span> ${story.so_that}</p>
                    </div>
                </div>
                
                <h4 class="font-bold text-gray-800 mb-3">
                    <i class="fas fa-check-square text-green-600 mr-2"></i>
                    Criterios de Aceptación (${story.acceptance_criteria.length})
                </h4>
                
                <div class="space-y-3">
        `;
        
        story.acceptance_criteria.forEach((criterion, cIndex) => {
            html += `
                <div class="criterion-card border border-gray-200 rounded-lg p-4">
                    <div class="flex items-start justify-between mb-2">
                        <h5 class="font-semibold text-gray-800">${criterion.id}: ${criterion.description}</h5>
                        ${criterion.is_negative_case ? '<span class="badge badge-critical" title="Verifica que el sistema rechace datos inválidos"><i class="fas fa-exclamation-triangle mr-1"></i>Prueba de Rechazo</span>' : ''}
                    </div>
                    
                    <div class="space-y-2 text-sm mt-3">
                        <div class="flex items-start">
                            <span class="font-semibold text-blue-600 w-20">GIVEN:</span>
                            <span class="text-gray-700 flex-1">${criterion.given}</span>
                        </div>
                        <div class="flex items-start">
                            <span class="font-semibold text-green-600 w-20">WHEN:</span>
                            <span class="text-gray-700 flex-1">${criterion.when}</span>
                        </div>
                        <div class="flex items-start">
                            <span class="font-semibold text-purple-600 w-20">THEN:</span>
                            <span class="text-gray-700 flex-1">${criterion.then}</span>
                        </div>
                    </div>
                    
                    ${criterion.test_data_examples && criterion.test_data_examples.length > 0 ? `
                        <div class="mt-3 p-3 bg-blue-50 rounded">
                            <h6 class="text-xs font-semibold text-blue-800 mb-2">Datos de Prueba:</h6>
                            <div class="space-y-1">
                                ${criterion.test_data_examples.map(ex => `
                                    <div class="text-xs text-blue-700">
                                        ${Object.entries(ex).map(([k, v]) => `<span class="font-mono">${k}: ${JSON.stringify(v)}</span>`).join(', ')}
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                    
                    ${criterion.boundary_values && criterion.boundary_values.length > 0 ? `
                        <div class="mt-2">
                            <span class="text-xs font-semibold text-gray-600">Valores Límite:</span>
                            <span class="text-xs text-gray-600">${criterion.boundary_values.join(', ')}</span>
                        </div>
                    ` : ''}
                </div>
            `;
        });
        
        html += '</div>';
        
        // Ambiguities resolved
        if (story.ambiguities_resolved && story.ambiguities_resolved.length > 0) {
            html += `
                <div class="mt-4">
                    <h4 class="font-bold text-gray-800 mb-3">
                        <i class="fas fa-lightbulb text-yellow-500 mr-2"></i>
                        Ambigüedades Resueltas
                    </h4>
                    <div class="space-y-2">
            `;
            
            story.ambiguities_resolved.forEach(amb => {
                const badge = amb.assumption_made ? 
                    '<span class="badge badge-critical" title="La IA decidió esto por su cuenta"><i class="fas fa-robot mr-1"></i>Decidido por IA</span>' : 
                    '<span class="badge badge-low" title="Usted decidió esto"><i class="fas fa-user-check mr-1"></i>Decidido por Usted</span>';
                
                html += `
                    <div class="flex items-start space-x-3 text-sm p-3 bg-yellow-50 rounded-lg">
                        <div class="flex-1">
                            <p class="font-semibold text-gray-800">"${amb.original_text}"</p>
                            <p class="text-gray-600 mt-1">${amb.resolution}</p>
                        </div>
                        ${badge}
                    </div>
                `;
            });
            
            html += '</div></div>';
        }
        
        // Additional info
        const hasAdditionalInfo = story.business_rules?.length > 0 || 
                                  story.dependencies?.length > 0 || 
                                  story.ui_elements?.length > 0 || 
                                  story.api_endpoints?.length > 0;
        
        if (hasAdditionalInfo) {
            html += '<div class="mt-4 grid grid-cols-2 gap-4 text-sm">';
            
            if (story.business_rules?.length > 0) {
                html += `
                    <div>
                        <h5 class="font-semibold text-gray-700 mb-2">Reglas de Negocio:</h5>
                        <ul class="list-disc list-inside text-gray-600 space-y-1">
                            ${story.business_rules.map(rule => `<li>${rule}</li>`).join('')}
                        </ul>
                    </div>
                `;
            }
            
            if (story.dependencies?.length > 0) {
                html += `
                    <div>
                        <h5 class="font-semibold text-gray-700 mb-2">Dependencias:</h5>
                        <div class="flex flex-wrap gap-2">
                            ${story.dependencies.map(dep => `<span class="badge badge-medium">${dep}</span>`).join('')}
                        </div>
                    </div>
                `;
            }
            
            if (story.ui_elements?.length > 0) {
                html += `
                    <div>
                        <h5 class="font-semibold text-gray-700 mb-2">Elementos UI:</h5>
                        <div class="flex flex-wrap gap-2">
                            ${story.ui_elements.map(el => `<span class="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">${el}</span>`).join('')}
                        </div>
                    </div>
                `;
            }
            
            if (story.api_endpoints?.length > 0) {
                html += `
                    <div>
                        <h5 class="font-semibold text-gray-700 mb-2">API Endpoints:</h5>
                        <div class="space-y-1">
                            ${story.api_endpoints.map(ep => `<code class="text-xs bg-gray-100 px-2 py-1 rounded block">${ep}</code>`).join('')}
                        </div>
                    </div>
                `;
            }
            
            html += '</div>';
        }
        
        html += '</div>';
    });
    
    html += `
        </div>
        
        <!-- Actions -->
        <div class="mt-8 flex justify-end space-x-4">
            <button onclick="startNewRequirement()" class="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all">
                <i class="fas fa-plus mr-2"></i>Nuevo Requerimiento
            </button>
            <button onclick="startModule2()" class="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg">
                <i class="fas fa-vial mr-2"></i>Crear Escenarios de Prueba
            </button>
        </div>
    `;
    
    container.innerHTML = html;
}

// ============================================================
// MÓDULO 2: TEST ARCHITECT - Generación de Escenarios Gherkin
// ============================================================

async function startModule2() {
    if (!currentContractA) {
        alert('Error: No hay Contract A disponible. Primero genera las historias de usuario.');
        return;
    }
    
    showLoading('Generando escenarios de prueba con IA...');
    
    try {
        const response = await fetch(`${API_BASE}/m2/generate-scenarios`, {
            method: 'POST',
            headers: getApiHeaders(),
            body: JSON.stringify({
                contract_a: currentContractA,
                contract_a_timestamp: currentContractATimestamp  // Enviar timestamp para vinculación
            })
        });
        
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        // Guardar el filename del Contract B para poder guardarlo después de firmar
        currentContractBFilename = data.filename;
        
        // Mostrar resultados de escenarios en el sub-tab
        displayScenariosInTab(data.contract_b);
        
        // Cambiar al sub-tab de Escenarios de Prueba dentro de Resultados
        switchResultsSubTab('scenarios');
        
        hideLoading();
        
    } catch (error) {
        console.error('Error:', error);
        
        // Detectar tipo de error de Groq
        let errorType = 'general';
        let isGroqError = false;
        
        if (error.message.includes('Rate limit') || error.message.includes('429')) {
            errorType = 'rate_limit';
            isGroqError = true;
        } else if (error.message.includes('401') || error.message.includes('Invalid API Key')) {
            errorType = 'invalid_key';
            isGroqError = true;
        } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
            errorType = 'forbidden';
            isGroqError = true;
        } else if (error.message.includes('500') || error.message.includes('503')) {
            errorType = 'server_error';
            isGroqError = true;
        }
        
        if (isGroqError && typeof updateSystemStatusInMenu === 'function') {
            updateSystemStatusInMenu('groq_error', false);
        }
        
        showGroqErrorModal(errorType, error.message);
        hideLoading();
    }
}

function displayScenariosInTab(contractB) {
    const content = document.getElementById('module2Content');
    const emptyState = document.getElementById('scenariosEmptyState');
    const subtabButton = document.getElementById('subtab-scenarios');
    
    if (!content) {
        console.error('No se encontró el contenedor module2Content');
        return;
    }
    
    // Ocultar estado vacío y mostrar contenido
    if (emptyState) emptyState.classList.add('hidden');
    content.classList.remove('hidden');
    
    // Habilitar el botón del sub-tab
    if (subtabButton) {
        subtabButton.disabled = false;
        subtabButton.classList.remove('text-gray-400', 'cursor-not-allowed');
        subtabButton.classList.add('text-gray-600', 'hover:text-gray-800');
    }
    
    let html = `
        <!-- Resumen de Escenarios -->
        <div class="mb-6 p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
            <h3 class="text-xl font-bold text-gray-800 mb-4">
                <i class="fas fa-chart-bar text-green-600 mr-2"></i>
                Resumen de Escenarios Generados
            </h3>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div class="text-center p-4 bg-white rounded-lg shadow-sm">
                    <div class="text-3xl font-bold text-green-600">${contractB.total_scenarios || 0}</div>
                    <div class="text-sm text-gray-600">Escenarios Totales</div>
                </div>
                <div class="text-center p-4 bg-white rounded-lg shadow-sm">
                    <div class="text-3xl font-bold text-blue-600">${contractB.features?.length || 0}</div>
                    <div class="text-sm text-gray-600">Features</div>
                </div>
                <div class="text-center p-4 bg-white rounded-lg shadow-sm">
                    <div class="text-3xl font-bold text-purple-600">${contractB.total_steps || 0}</div>
                    <div class="text-sm text-gray-600">Steps Totales</div>
                </div>
                <div class="text-center p-4 bg-white rounded-lg shadow-sm">
                    <div class="text-3xl font-bold text-orange-600">${contractB.coverage_percentage || 0}%</div>
                    <div class="text-sm text-gray-600">Cobertura</div>
                </div>
            </div>
        </div>
        
        <!-- Features y Escenarios -->
        <div class="space-y-6">
    `;
    
    // Generar cada feature
    if (contractB.features && contractB.features.length > 0) {
        contractB.features.forEach((feature, featureIndex) => {
            html += `
                <div class="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                    <!-- Feature Header -->
                    <div class="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
                        <h3 class="text-2xl font-bold mb-2">
                            <i class="fas fa-layer-group mr-2"></i>
                            Feature: ${feature.name || 'Sin nombre'}
                        </h3>
                        <p class="text-indigo-100">${feature.description || ''}</p>
                        ${feature.user_story_id ? `<p class="text-sm text-indigo-200 mt-2">Historia: ${feature.user_story_id}</p>` : ''}
                    </div>
                    
                    <!-- Escenarios -->
                    <div class="p-6 space-y-4">
            `;
            
            if (feature.scenarios && feature.scenarios.length > 0) {
                feature.scenarios.forEach((scenario, scenarioIndex) => {
                    const scenarioTypeColors = {
                        'positive': 'green',
                        'negative': 'red',
                        'boundary': 'orange',
                        'alternative': 'blue'
                    };
                    const color = scenarioTypeColors[scenario.scenario_type] || 'gray';
                    
                    html += `
                        <div class="border-l-4 border-${color}-500 bg-${color}-50 p-4 rounded-lg">
                            <div class="flex items-start justify-between mb-3">
                                <h4 class="font-bold text-gray-800 text-lg">
                                    <i class="fas fa-check-circle text-${color}-600 mr-2"></i>
                                    Escenario: ${scenario.name || 'Sin nombre'}
                                </h4>
                                <span class="px-3 py-1 bg-${color}-600 text-white text-xs font-semibold rounded-full">
                                    ${scenario.scenario_type || 'normal'}
                                </span>
                            </div>
                            
                            ${scenario.description ? `<p class="text-gray-600 mb-3 italic">${scenario.description}</p>` : ''}
                            
                            <!-- Steps Gherkin -->
                            <div class="bg-white p-4 rounded-lg font-mono text-sm space-y-1">
                    `;
                    
                    // Manejar diferentes estructuras de steps
                    let hasSteps = false;
                    
                    // Opción 1: given/when/then separados
                    if (scenario.given || scenario.when || scenario.then) {
                        // Given steps
                        if (scenario.given) {
                            const givenSteps = Array.isArray(scenario.given) ? scenario.given : [scenario.given];
                            givenSteps.forEach(step => {
                                if (step) {
                                    html += `<div class="text-purple-700"><strong>Given</strong> ${step}</div>`;
                                    hasSteps = true;
                                }
                            });
                        }
                        
                        // When steps
                        if (scenario.when) {
                            const whenSteps = Array.isArray(scenario.when) ? scenario.when : [scenario.when];
                            whenSteps.forEach(step => {
                                if (step) {
                                    html += `<div class="text-blue-700"><strong>When</strong> ${step}</div>`;
                                    hasSteps = true;
                                }
                            });
                        }
                        
                        // Then steps
                        if (scenario.then) {
                            const thenSteps = Array.isArray(scenario.then) ? scenario.then : [scenario.then];
                            thenSteps.forEach(step => {
                                if (step) {
                                    html += `<div class="text-green-700"><strong>Then</strong> ${step}</div>`;
                                    hasSteps = true;
                                }
                            });
                        }
                    }
                    
                    // Opción 2: steps como array de objetos con tipo
                    if (!hasSteps && scenario.steps && Array.isArray(scenario.steps)) {
                        scenario.steps.forEach(step => {
                            const stepType = step.type || step.keyword || 'Given';
                            const stepText = step.text || step.step || step;
                            const colorMap = {
                                'Given': 'purple',
                                'When': 'blue',
                                'Then': 'green',
                                'And': 'gray',
                                'But': 'gray'
                            };
                            const color = colorMap[stepType] || 'gray';
                            html += `<div class="text-${color}-700"><strong>${stepType}</strong> ${stepText}</div>`;
                            hasSteps = true;
                        });
                    }
                    
                    // Si no hay steps, mostrar mensaje
                    if (!hasSteps) {
                        html += `<div class="text-gray-500 italic">No hay steps definidos para este escenario</div>`;
                        console.warn('Escenario sin steps:', scenario);
                    }
                    
                    html += `
                            </div>
                            
                            ${scenario.test_data ? `
                                <div class="mt-3 p-3 bg-gray-100 rounded text-xs">
                                    <strong class="text-gray-700">Test Data:</strong>
                                    <pre class="mt-1 text-gray-600">${JSON.stringify(scenario.test_data, null, 2)}</pre>
                                </div>
                            ` : ''}
                            
                            ${scenario.iso_25010_category ? `
                                <div class="mt-2 flex items-center text-xs text-gray-600">
                                    <i class="fas fa-certificate text-purple-500 mr-2"></i>
                                    <span>ISO 25010: ${scenario.iso_25010_category}</span>
                                </div>
                            ` : ''}
                        </div>
                    `;
                });
            }
            
            html += `
                    </div>
                </div>
            `;
        });
    }
    
    html += `
        </div>
        
        <!-- Siguiente Paso -->
        <div class="mt-8 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-200">
            <h3 class="text-xl font-bold text-gray-800 mb-4">
                <i class="fas fa-route text-indigo-600 mr-2"></i>
                Siguiente Paso
            </h3>
            <p class="text-gray-700 mb-5">Elige cómo continuar con los escenarios generados:</p>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Opción 1: Revisar Escenarios Manualmente -->
                <button onclick="startReview()" class="group px-6 py-6 bg-white border-2 border-indigo-400 rounded-lg font-bold hover:bg-indigo-50 transition-all shadow-md hover:shadow-xl">
                    <div class="flex items-center justify-center mb-3">
                        <i class="fas fa-clipboard-check text-4xl text-indigo-600 group-hover:scale-110 transition-transform"></i>
                    </div>
                    <h4 class="text-lg text-gray-800 mb-2">Revisar Escenarios Manualmente y generar el reporte final</h4>
                    <p class="text-sm text-gray-600 font-normal">
                        Revisa y ajusta cada escenario antes de generar el reporte final
                    </p>
                    <div class="mt-3 text-xs text-indigo-600 font-semibold">
                        ⏱️ Revisión detallada + Reporte final
                    </div>
                </button>
                
                <!-- Opción 2: Generar Reporte Final Automático -->
                <button onclick="generateReportDirect()" class="group px-6 py-6 bg-white border-2 border-emerald-400 rounded-lg font-bold hover:bg-emerald-50 transition-all shadow-md hover:shadow-xl">
                    <div class="flex items-center justify-center mb-3">
                        <i class="fas fa-magic text-4xl text-emerald-600 group-hover:scale-110 transition-transform"></i>
                    </div>
                    <h4 class="text-lg text-gray-800 mb-2">Generar Reporte Final Automático</h4>
                    <p class="text-sm text-gray-600 font-normal">
                        Crea el reporte ejecutivo directamente con validación automática
                    </p>
                    <div class="mt-3 text-xs text-emerald-600 font-semibold">
                        ⚡ Proceso rápido + Reporte final instantáneo
                    </div>
                </button>
            </div>
        </div>
        
    `;
    
    content.innerHTML = html;
    
    // Guardar Contract B para descargas
    window.currentContractB = contractB;

    // Resetear Contract C al generar nuevos escenarios (el codigo depende de estos)
    currentContractC = null;
    currentContractCFilename = null;
    const codeContainer = document.getElementById('content-code');
    if (codeContainer) {
        codeContainer.innerHTML = '';
    }

    // Habilitar el botón de Generar Código
    updateGenerateCodeButtonState();
}

// ============================================================
// FUNCIONES DE REVISIÓN Y REPORTE
// ============================================================

// Variables globales para revisión
let reviewScenarios = [];
let currentReviewIndex = 0;
let reviewChanges = [];

function startReview() {
    if (!window.currentContractB) {
        alert('No hay escenarios para revisar');
        return;
    }
    
    // Aplanar todos los escenarios
    reviewScenarios = [];
    reviewChanges = [];
    currentReviewIndex = 0;
    
    window.currentContractB.features.forEach(feature => {
        if (feature.scenarios && feature.scenarios.length > 0) {
            feature.scenarios.forEach(scenario => {
                reviewScenarios.push({
                    feature: feature,
                    scenario: scenario
                });
            });
        }
    });
    
    if (reviewScenarios.length === 0) {
        alert('No hay escenarios para revisar');
        return;
    }
    
    // Actualizar total
    document.getElementById('reviewTotalScenarios').textContent = reviewScenarios.length;
    
    // Mostrar primer escenario
    showReviewScenario(0);
    
    // Abrir modal
    document.getElementById('reviewModal').classList.remove('hidden');
}

async function generateReportDirect() {
    if (!window.currentContractB) {
        alert('No hay escenarios para generar el reporte');
        return;
    }

    // Mostrar reporte en modal (nombre/decision se ingresan al final)
    showReportInModal(window.currentContractB);
}

function showReviewScenario(index) {
    if (index >= reviewScenarios.length) {
        // Terminó la revisión, mostrar formulario final
        document.getElementById('reviewModalContent').classList.add('hidden');
        document.querySelector('#reviewModal .bg-gray-50').classList.add('hidden');
        document.getElementById('finalReviewSection').classList.remove('hidden');
        return;
    }
    
    currentReviewIndex = index;
    const item = reviewScenarios[index];
    const scenario = item.scenario;
    const feature = item.feature;
    
    // Actualizar progreso
    document.getElementById('reviewCurrentIndex').textContent = index + 1;
    const percentage = ((index + 1) / reviewScenarios.length) * 100;
    document.getElementById('reviewProgressBar').style.width = `${percentage}%`;
    
    // Generar HTML del escenario
    let html = `
        <div class="mb-4">
            <h4 class="text-lg font-bold text-gray-800 mb-2">Feature: ${feature.name || 'Sin nombre'}</h4>
            <p class="text-gray-600">${feature.description || ''}</p>
        </div>
        
        <div class="bg-indigo-50 border-l-4 border-indigo-500 p-4 rounded-lg mb-4">
            <h5 class="font-bold text-gray-800 text-lg mb-2">Escenario: ${scenario.name || 'Sin nombre'}</h5>
            ${scenario.description ? `<p class="text-gray-600 mb-3 italic">${scenario.description}</p>` : ''}
            
            <div class="bg-white p-4 rounded-lg font-mono text-sm space-y-1">
    `;
    
    // Manejar diferentes estructuras de steps
    let hasSteps = false;
    
    // Opción 1: given/when/then separados
    if (scenario.given || scenario.when || scenario.then) {
        // Given steps
        if (scenario.given) {
            const givenSteps = Array.isArray(scenario.given) ? scenario.given : [scenario.given];
            givenSteps.forEach(step => {
                if (step) {
                    html += `<div class="text-purple-700"><strong>Given</strong> ${step}</div>`;
                    hasSteps = true;
                }
            });
        }
        
        // When steps
        if (scenario.when) {
            const whenSteps = Array.isArray(scenario.when) ? scenario.when : [scenario.when];
            whenSteps.forEach(step => {
                if (step) {
                    html += `<div class="text-blue-700"><strong>When</strong> ${step}</div>`;
                    hasSteps = true;
                }
            });
        }
        
        // Then steps
        if (scenario.then) {
            const thenSteps = Array.isArray(scenario.then) ? scenario.then : [scenario.then];
            thenSteps.forEach(step => {
                if (step) {
                    html += `<div class="text-green-700"><strong>Then</strong> ${step}</div>`;
                    hasSteps = true;
                }
            });
        }
    }
    
    // Opción 2: steps como array de objetos
    if (!hasSteps && scenario.steps && Array.isArray(scenario.steps)) {
        scenario.steps.forEach(step => {
            const stepType = step.type || step.keyword || 'Given';
            const stepText = step.text || step.step || step;
            const colorMap = {
                'Given': 'purple',
                'When': 'blue',
                'Then': 'green',
                'And': 'gray',
                'But': 'gray'
            };
            const color = colorMap[stepType] || 'gray';
            html += `<div class="text-${color}-700"><strong>${stepType}</strong> ${stepText}</div>`;
            hasSteps = true;
        });
    }
    
    // Si no hay steps, mostrar mensaje
    if (!hasSteps) {
        html += `<div class="text-gray-500 italic">No hay steps definidos para este escenario</div>`;
        console.warn('Escenario sin steps en modal:', scenario);
    }
    
    html += `
            </div>
        </div>
        
        <div class="grid grid-cols-2 gap-4 mb-4">
            <div>
                <label class="block text-sm font-semibold mb-2">Tipo de Escenario:</label>
                <select id="scenarioTypeSelect" class="w-full px-4 py-2 border-2 border-gray-300 rounded-lg">
                    <option value="positive" ${scenario.scenario_type === 'positive' ? 'selected' : ''}>Positivo</option>
                    <option value="negative" ${scenario.scenario_type === 'negative' ? 'selected' : ''}>Negativo</option>
                    <option value="boundary" ${scenario.scenario_type === 'boundary' ? 'selected' : ''}>Valores Límite</option>
                    <option value="alternative" ${scenario.scenario_type === 'alternative' ? 'selected' : ''}>Alternativo</option>
                </select>
            </div>
            <div>
                <label class="block text-sm font-semibold mb-2">Categoría ISO 25010:</label>
                <select id="isoSelect" class="w-full px-4 py-2 border-2 border-gray-300 rounded-lg">
                    <option value="functional_suitability" ${scenario.iso_25010_category === 'functional_suitability' ? 'selected' : ''}>Funcionalidad</option>
                    <option value="performance_efficiency" ${scenario.iso_25010_category === 'performance_efficiency' ? 'selected' : ''}>Rendimiento</option>
                    <option value="usability" ${scenario.iso_25010_category === 'usability' ? 'selected' : ''}>Usabilidad</option>
                    <option value="reliability" ${scenario.iso_25010_category === 'reliability' ? 'selected' : ''}>Confiabilidad</option>
                    <option value="security" ${scenario.iso_25010_category === 'security' ? 'selected' : ''}>Seguridad</option>
                </select>
            </div>
        </div>
        
        <div>
            <label class="block text-sm font-semibold mb-2">Notas (opcional):</label>
            <textarea id="reviewNotesTextarea" class="w-full px-4 py-2 border-2 border-gray-300 rounded-lg" rows="3" placeholder="Comentarios sobre este escenario..."></textarea>
        </div>
    `;
    
    document.getElementById('reviewModalContent').innerHTML = html;
}

function acceptScenarioInModal() {
    const notes = document.getElementById('reviewNotesTextarea').value.trim();
    
    reviewChanges.push({
        scenario_index: currentReviewIndex,
        scenario_name: reviewScenarios[currentReviewIndex].scenario.name,
        action: 'accepted',
        notes: notes
    });
    
    // Siguiente escenario
    showReviewScenario(currentReviewIndex + 1);
}

function reclassifyScenarioInModal() {
    const newType = document.getElementById('scenarioTypeSelect').value;
    const newISO = document.getElementById('isoSelect').value;
    const notes = document.getElementById('reviewNotesTextarea').value.trim();
    
    if (!notes) {
        alert('Por favor justifica por qué estás reclasificando este escenario');
        return;
    }
    
    const scenario = reviewScenarios[currentReviewIndex].scenario;
    scenario.scenario_type = newType;
    scenario.iso_25010_category = newISO;
    
    reviewChanges.push({
        scenario_index: currentReviewIndex,
        scenario_name: scenario.name,
        action: 'reclassified',
        new_type: newType,
        new_iso: newISO,
        notes: notes
    });
    
    // Siguiente escenario
    showReviewScenario(currentReviewIndex + 1);
}

function skipScenarioInModal() {
    reviewChanges.push({
        scenario_index: currentReviewIndex,
        scenario_name: reviewScenarios[currentReviewIndex].scenario.name,
        action: 'skipped',
        notes: ''
    });
    
    // Siguiente escenario
    showReviewScenario(currentReviewIndex + 1);
}

async function submitReviewInModal() {
    const reviewerName = document.getElementById('reviewerNameInput').value.trim();
    const decision = document.getElementById('reviewDecisionInput').value;
    const finalNotes = document.getElementById('finalNotesInput').value.trim();
    
    if (!reviewerName) {
        alert('Por favor ingresa tu nombre');
        return;
    }
    
    // Agregar metadata de revisión
    window.currentContractB.review = {
        reviewer_name: reviewerName,
        review_status: decision,
        review_date: new Date().toISOString(),
        review_notes: finalNotes,
        change_history: reviewChanges,
        total_scenarios_reviewed: reviewScenarios.length,
        scenarios_accepted: reviewChanges.filter(c => c.action === 'accepted').length,
        scenarios_reclassified: reviewChanges.filter(c => c.action === 'reclassified').length,
        scenarios_skipped: reviewChanges.filter(c => c.action === 'skipped').length
    };
    
    // Guardar el Contract B actualizado con la firma
    if (currentContractBFilename) {
        try {
            await saveContractBWithReview(currentContractBFilename, window.currentContractB);
        } catch (error) {
            console.error('Error al guardar la firma:', error);
            alert('Advertencia: La firma no se pudo guardar permanentemente');
        }
    }
    
    // Cerrar modal de revisión
    closeReviewModal();
    
    // Abrir modal de reporte
    showReportInModal(window.currentContractB);
}

async function saveContractBWithReview(filename, contractB) {
    const response = await fetch(`${API_BASE}/history/modulo2/${filename}/update`, {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify({
            contract_b: contractB
        })
    });
    
    const data = await response.json();
    if (!data.success) {
        throw new Error(data.error || 'Error al guardar');
    }
}

function closeReviewModal() {
    document.getElementById('reviewModal').classList.add('hidden');
    document.getElementById('finalReviewSection').classList.add('hidden');
    document.getElementById('reviewModalContent').classList.remove('hidden');
    document.querySelector('#reviewModal .bg-gray-50').classList.remove('hidden');
}

function showReportInModal(contractB) {
    // Usar el código ORIGINAL del reporte ejecutivo
    const agentVersion = 'v4'; // Asumiendo v4 por tener revisión
    const isSigned = !!(contractB.client_approval && contractB.client_approval.client_name);
    
    // Fecha del reporte
    const now = new Date();
    const reportDate = `Generado el ${now.toLocaleDateString('es-ES', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })}`;
    
    // Calcular métricas
    const totalStories = contractB.features?.length || 0;
    const totalCriteria = contractB.coverage_matrix?.length || contractB.total_scenarios || 0;
    const avgScenariosPerCriteria = totalCriteria > 0 ? (contractB.total_scenarios / totalCriteria).toFixed(1) : 0;
    
    // Análisis de gaps
    const whatIsNotTested = [];
    if (contractB.total_negative === 0) {
        whatIsNotTested.push({
            characteristic: 'Casos negativos',
            reason: 'No se generaron escenarios de prueba para casos de error o validaciones negativas'
        });
    }
    if (contractB.total_boundary === 0) {
        whatIsNotTested.push({
            characteristic: 'Valores límite',
            reason: 'No se generaron escenarios para probar límites y valores extremos'
        });
    }
    
    let html = `
        <div class="space-y-6">
            <!-- Fecha del Reporte -->
            <div class="text-right text-sm text-gray-600 mb-4">
                ${reportDate}
            </div>
            
            <!-- Resumen Ejecutivo COMPLETO -->
            <div class="bg-white border-2 border-gray-200 p-6 rounded-xl">
                <h3 class="text-2xl font-bold text-gray-800 mb-4">📊 Resumen del Análisis</h3>
                <p class="text-gray-700 leading-relaxed mb-4">
                    Se ha completado exitosamente el análisis de sus requerimientos y la generación 
                    de casos de prueba para validar que su sistema funcione correctamente.
                </p>
                <p class="text-gray-700 leading-relaxed mb-4">
                    El sistema analizó <strong>${totalStories} funcionalidades principales</strong> con un total de 
                    <strong>${totalCriteria} requisitos específicos</strong>, generando 
                    <strong>${contractB.total_scenarios} casos de prueba</strong> que verificarán el correcto funcionamiento de su aplicación.
                </p>
                <p class="text-gray-700 leading-relaxed mb-4">
                    Los casos de prueba generados cubren diferentes situaciones: cuando todo funciona bien, 
                    cuando hay errores, y casos especiales que podrían presentarse.
                </p>
                
                <div class="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="bg-green-50 border-l-4 border-green-500 p-4 rounded">
                        <h4 class="font-bold text-green-800 mb-2">✅ Lo que SÍ se va a verificar:</h4>
                        <ul class="text-sm text-green-700 space-y-1">
                            <li>• ${contractB.total_positive || 0} pruebas cuando todo funciona correctamente</li>
                            <li>• ${contractB.total_negative || 0} pruebas cuando hay errores o problemas</li>
                            <li>• ${contractB.total_boundary || 0} pruebas con valores extremos o límites</li>
                            <li>• ${totalCriteria} requisitos validados completamente</li>
                        </ul>
                    </div>
                    
                    <div class="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
                        <h4 class="font-bold text-yellow-800 mb-2">⚠️ Áreas que necesitan más atención:</h4>
                        ${whatIsNotTested.length > 0 ? `
                            <ul class="text-sm text-yellow-700 space-y-1">
                                ${whatIsNotTested.map(gap => `<li>• ${gap.characteristic}: ${gap.reason}</li>`).join('')}
                            </ul>
                        ` : '<p class="text-sm text-green-700">✅ No se identificaron áreas sin cobertura</p>'}
                    </div>
                </div>
            </div>
            
            <!-- Métricas Clave -->
            <div class="bg-white border-2 border-gray-200 p-6 rounded-xl">
                <h3 class="text-2xl font-bold text-gray-800 mb-4">📈 Números Clave</h3>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div class="bg-blue-50 p-4 rounded-lg text-center">
                        <div class="text-3xl font-bold text-blue-600">${contractB.total_scenarios || 0}</div>
                        <div class="text-sm text-gray-600 mt-1">Pruebas Totales</div>
                    </div>
                    <div class="bg-green-50 p-4 rounded-lg text-center">
                        <div class="text-3xl font-bold text-green-600">${contractB.total_positive || 0}</div>
                        <div class="text-sm text-gray-600 mt-1">Flujos Exitosos</div>
                    </div>
                    <div class="bg-red-50 p-4 rounded-lg text-center">
                        <div class="text-3xl font-bold text-red-600">${contractB.total_negative || 0}</div>
                        <div class="text-sm text-gray-600 mt-1">Manejo de Errores</div>
                    </div>
                    <div class="bg-orange-50 p-4 rounded-lg text-center">
                        <div class="text-3xl font-bold text-orange-600">${contractB.total_boundary || 0}</div>
                        <div class="text-sm text-gray-600 mt-1">Casos Especiales</div>
                    </div>
                </div>
                <div class="mt-4 grid grid-cols-2 gap-4">
                    <div class="bg-purple-50 p-4 rounded-lg text-center">
                        <div class="text-3xl font-bold text-purple-600">${totalStories}</div>
                        <div class="text-sm text-gray-600 mt-1">Funcionalidades Analizadas</div>
                    </div>
                    <div class="bg-indigo-50 p-4 rounded-lg text-center">
                        <div class="text-3xl font-bold text-indigo-600">${avgScenariosPerCriteria}</div>
                        <div class="text-sm text-gray-600 mt-1">Pruebas por Requisito (promedio)</div>
                    </div>
                </div>
            </div>
    `;
    
    // Información de revisión
    if (contractB.review) {
        const review = contractB.review;
        const decisionText = {
            'approved': '✅ APROBADO',
            'auto_approved': '✅ AUTO-APROBADO',
            'changes_requested': '⚠️ CAMBIOS SOLICITADOS',
            'rejected': '❌ RECHAZADO'
        };
        
        html += `
            <div class="bg-white border-2 border-emerald-200 p-6 rounded-xl">
                <h3 class="text-xl font-bold text-gray-800 mb-4">ℹ️ Información de Revisión</h3>
                <div class="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <p class="text-sm text-gray-600">Analista de QA:</p>
                        <p class="text-lg font-bold text-gray-800">${review.reviewer_name}</p>
                    </div>
                    <div>
                        <p class="text-sm text-gray-600">Fecha:</p>
                        <p class="text-lg font-semibold text-gray-800">${new Date(review.review_date).toLocaleDateString('es-ES')}</p>
                    </div>
                </div>
                <div class="mb-4 p-4 bg-emerald-50 rounded-lg border-2 border-emerald-500">
                    <p class="text-sm font-semibold mb-1">Decisión:</p>
                    <p class="text-lg font-bold text-emerald-700">${decisionText[review.review_status]}</p>
                </div>
                ${review.review_notes ? `
                    <div>
                        <p class="text-sm font-semibold text-gray-700 mb-2">Notas:</p>
                        <p class="text-gray-600">${review.review_notes}</p>
                    </div>
                ` : ''}
                
                <!-- Estadísticas de Revisión -->
                <div class="mt-4 grid grid-cols-3 gap-3">
                    <div class="text-center p-3 bg-green-50 rounded-lg">
                        <div class="text-2xl font-bold text-green-600">${review.scenarios_accepted || 0}</div>
                        <div class="text-xs text-gray-600">Aceptados</div>
                    </div>
                    <div class="text-center p-3 bg-orange-50 rounded-lg">
                        <div class="text-2xl font-bold text-orange-600">${review.scenarios_reclassified || 0}</div>
                        <div class="text-xs text-gray-600">Reclasificados</div>
                    </div>
                    <div class="text-center p-3 bg-gray-50 rounded-lg">
                        <div class="text-2xl font-bold text-gray-600">${review.scenarios_skipped || 0}</div>
                        <div class="text-xs text-gray-600">Saltados</div>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Matriz de Cobertura ISO 25010 (con tabla detallada como el original)
    if (contractB.coverage_by_characteristic || contractB.coverage_matrix) {
        const coverage = contractB.coverage_by_characteristic || contractB.coverage_matrix || {};
        const characteristics = [
            'functional_suitability',
            'performance_efficiency',
            'security',
            'usability',
            'reliability',
            'compatibility',
            'maintainability',
            'portability'
        ];
        
        const categoryNames = {
            'functional_suitability': 'Idoneidad Funcional',
            'performance_efficiency': 'Eficiencia de Desempeño',
            'security': 'Seguridad',
            'usability': 'Usabilidad',
            'reliability': 'Fiabilidad',
            'compatibility': 'Compatibilidad',
            'maintainability': 'Mantenibilidad',
            'portability': 'Portabilidad'
        };
        
        html += `
            <div class="bg-white border-2 border-purple-200 p-6 rounded-xl">
                <h3 class="text-2xl font-bold text-gray-800 mb-4">🎯 Cobertura por Área de Calidad</h3>
                <p class="text-sm text-gray-600 mb-4">Distribución de pruebas según diferentes aspectos de calidad del sistema</p>
                <table class="w-full border-collapse">
                    <thead>
                        <tr class="bg-gray-100">
                            <th class="border p-3 text-left">Aspecto de Calidad</th>
                            <th class="border p-3 text-center">Pruebas</th>
                            <th class="border p-3 text-center">Cobertura</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        characteristics.forEach(char => {
            const count = coverage[char] || 0;
            const percentage = contractB.total_scenarios > 0 ? ((count / contractB.total_scenarios) * 100).toFixed(1) : 0;
            let status = count === 0 ? '❌ No cubierto' : count < 5 ? '⚠️ Ligero' : '✅ Robusto';
            
            html += `
                <tr>
                    <td class="border p-3 font-semibold">${categoryNames[char]}</td>
                    <td class="border p-3 text-center font-bold">${count}</td>
                    <td class="border p-3 text-center">${percentage}% ${status}</td>
                </tr>
            `;
        });
        
        html += `
                        <tr class="bg-gray-100 font-bold">
                            <td class="border p-3">TOTAL</td>
                            <td class="border p-3 text-center">${contractB.total_scenarios || 0}</td>
                            <td class="border p-3 text-center">100%</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
    }
    
    // Features y Escenarios Completos
    if (contractB.features && contractB.features.length > 0) {
        html += `
            <div class="bg-white border-2 border-indigo-200 p-6 rounded-xl">
                <h3 class="text-xl font-bold text-gray-800 mb-4">📋 Detalle de Funcionalidades y Pruebas</h3>
        `;
        
        contractB.features.forEach((feature, featureIndex) => {
            html += `
                <div class="mb-6 ${featureIndex > 0 ? 'pt-6 border-t-2 border-gray-200' : ''}">
                    <div class="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 rounded-lg text-white mb-4">
                        <h4 class="text-lg font-bold">Funcionalidad ${featureIndex + 1}: ${feature.name || 'Sin nombre'}</h4>
                        <p class="text-indigo-100 text-sm">${feature.description || ''}</p>
                    </div>
                    
                    <div class="space-y-3 ml-4">
            `;
            
            if (feature.scenarios && feature.scenarios.length > 0) {
                feature.scenarios.forEach((scenario, scenarioIndex) => {
                    const typeColors = {
                        'positive': { bg: 'green-50', border: 'green-500', text: 'green-700' },
                        'negative': { bg: 'red-50', border: 'red-500', text: 'red-700' },
                        'boundary': { bg: 'orange-50', border: 'orange-500', text: 'orange-700' },
                        'alternative': { bg: 'blue-50', border: 'blue-500', text: 'blue-700' }
                    };
                    const colors = typeColors[scenario.scenario_type] || { bg: 'gray-50', border: 'gray-500', text: 'gray-700' };
                    
                    html += `
                        <div class="border-l-4 border-${colors.border} bg-${colors.bg} p-4 rounded-lg">
                            <div class="flex items-start justify-between mb-2">
                                <h5 class="font-bold text-${colors.text}">Prueba ${scenarioIndex + 1}: ${scenario.name || 'Sin nombre'}</h5>
                                <span class="px-2 py-1 bg-${colors.border} text-white text-xs font-semibold rounded">
                                    ${scenario.scenario_type || 'normal'}
                                </span>
                            </div>
                            ${scenario.description ? `<p class="text-gray-600 text-sm mb-2 italic">${scenario.description}</p>` : ''}
                            
                            <div class="bg-white p-3 rounded font-mono text-xs space-y-1">
                    `;
                    
                    // Usar scenario.steps como en el reporte original
                    if (scenario.steps && Array.isArray(scenario.steps)) {
                        scenario.steps.forEach(step => {
                            const keyword = step.keyword || 'Given';
                            const text = step.text || step;
                            const colorMap = {
                                'Given': 'purple',
                                'When': 'blue',
                                'Then': 'green',
                                'And': 'gray',
                                'But': 'gray'
                            };
                            const color = colorMap[keyword] || 'gray';
                            html += `<div class="text-${color}-700"><strong>${keyword}</strong> ${text}</div>`;
                        });
                    } else {
                        // Fallback: given/when/then separados
                        if (scenario.given) {
                            const givenSteps = Array.isArray(scenario.given) ? scenario.given : [scenario.given];
                            givenSteps.forEach(step => {
                                if (step) html += `<div class="text-purple-700"><strong>Given</strong> ${step}</div>`;
                            });
                        }
                        if (scenario.when) {
                            const whenSteps = Array.isArray(scenario.when) ? scenario.when : [scenario.when];
                            whenSteps.forEach(step => {
                                if (step) html += `<div class="text-blue-700"><strong>When</strong> ${step}</div>`;
                            });
                        }
                        if (scenario.then) {
                            const thenSteps = Array.isArray(scenario.then) ? scenario.then : [scenario.then];
                            thenSteps.forEach(step => {
                                if (step) html += `<div class="text-green-700"><strong>Then</strong> ${step}</div>`;
                            });
                        }
                    }
                    
                    html += `
                            </div>
                        </div>
                    `;
                });
            }
            
            html += `
                    </div>
                </div>
            `;
        });
        
        html += `
            </div>
        `;
    }
    
    // Recomendaciones
    const recommendations = [];
    const positiveRatio = contractB.total_scenarios > 0 ? (contractB.total_positive / contractB.total_scenarios) * 100 : 0;
    const negativeRatio = contractB.total_scenarios > 0 ? (contractB.total_negative / contractB.total_scenarios) * 100 : 0;
    
    if (positiveRatio > 70) {
        recommendations.push('✅ Excelente cobertura de pruebas para cuando todo funciona correctamente.');
    }
    if (negativeRatio < 20) {
        recommendations.push('⚠️ Considere agregar más pruebas para validar el manejo de errores y situaciones problemáticas.');
    }
    if (contractB.total_boundary < 5) {
        recommendations.push('⚠️ Se recomienda agregar más pruebas con valores extremos o límites del sistema.');
    }
    recommendations.push('📋 Utilice estos casos de prueba como guía para verificar que su sistema funcione correctamente.');
    recommendations.push('🔄 Actualice las pruebas cada vez que cambie algún requisito o funcionalidad.');
    recommendations.push('👥 Comparta este documento con su equipo de desarrollo y pruebas.');
    
    html += `
            <!-- Recomendaciones -->
            <div class="bg-white border-2 border-blue-200 p-6 rounded-xl">
                <h3 class="text-2xl font-bold text-gray-800 mb-4">💡 Recomendaciones</h3>
                <ul class="space-y-2">
                    ${recommendations.map(rec => `<li class="flex items-start"><span class="mr-2">•</span><span>${rec}</span></li>`).join('')}
                </ul>
            </div>
            
            <!-- Información del Revisor QA (solo si no hay revisión guardada) -->
            ${!contractB.review ? `
            <div class="bg-white border-2 border-purple-200 p-6 rounded-xl mb-6">
                <h3 class="text-xl font-bold text-gray-800 mb-4">👤 Revisión QA</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-2">Nombre del Revisor</label>
                        <input type="text" id="reportReviewerName" class="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none" placeholder="Nombre completo">
                    </div>
                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-2">Decisión</label>
                        <select id="reportReviewDecision" class="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none">
                            <option value="approved">✅ Aprobado</option>
                            <option value="changes_requested">⚠️ Cambios Solicitados</option>
                        </select>
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-2">Notas</label>
                    <textarea id="reportReviewNotes" class="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none" rows="3" placeholder="Observaciones..."></textarea>
                </div>
            </div>
            ` : ''}
            <!-- Sección de Aprobación del Cliente -->
            <div class="mt-12 border-t-2 border-gray-300 pt-8">
                <h3 class="text-2xl font-bold text-gray-800 mb-6">✍️ Aprobación del Cliente</h3>
                
                ${isSigned ? `
                    <!-- Reporte ya firmado por el CLIENTE - mostrar datos completos bloqueados -->
                    <div class="bg-green-50 border-2 border-green-500 rounded-lg p-6 mb-6">
                        <div class="flex items-center justify-center mb-6">
                            <i class="fas fa-check-circle text-green-600 text-4xl mr-3"></i>
                            <span class="text-2xl font-bold text-green-800">Reporte Firmado y Aprobado por el Cliente</span>
                        </div>
                        
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                            <div>
                                <label class="block text-sm font-semibold text-gray-700 mb-2">Nombre del Cliente</label>
                                <input type="text" value="${contractB.client_approval?.client_name || 'N/A'}" class="w-full px-4 py-2 border-2 border-green-300 rounded-lg bg-white font-semibold text-gray-800" disabled>
                            </div>
                            <div>
                                <label class="block text-sm font-semibold text-gray-700 mb-2">Cargo</label>
                                <input type="text" value="${contractB.client_approval?.client_position || 'N/A'}" class="w-full px-4 py-2 border-2 border-green-300 rounded-lg bg-white font-semibold text-gray-800" disabled>
                            </div>
                            <div>
                                <label class="block text-sm font-semibold text-gray-700 mb-2">Fecha de Aprobación</label>
                                <input type="text" value="${contractB.client_approval?.approval_date ? new Date(contractB.client_approval.approval_date).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}" class="w-full px-4 py-2 border-2 border-green-300 rounded-lg bg-white font-semibold text-gray-800" disabled>
                            </div>
                        </div>
                        
                        ${contractB.client_approval?.signature ? `
                            <div class="mb-6">
                                <label class="block text-sm font-semibold text-gray-700 mb-2">Firma Digital del Cliente</label>
                                <div class="w-full h-40 bg-white border-2 border-green-300 rounded-lg flex items-center justify-center p-4">
                                    <img src="${contractB.client_approval.signature}" alt="Firma del Cliente" class="max-h-full max-w-full object-contain">
                                </div>
                            </div>
                        ` : ''}
                        
                        <div class="bg-white border-2 border-green-400 rounded-lg p-4">
                            <div class="flex items-center justify-center">
                                <i class="fas fa-shield-check text-green-600 text-2xl mr-3"></i>
                                <div class="text-center">
                                    <p class="text-sm font-semibold text-green-800">
                                        ✓ Apruebo los escenarios de prueba generados y autorizo su implementación
                                    </p>
                                    <p class="text-xs text-green-700 mt-1">
                                        <i class="fas fa-lock mr-1"></i>
                                        Este reporte ha sido firmado y aprobado. No se pueden realizar cambios.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                ` : `
                    <!-- Formulario de firma activo -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                            <label class="block text-sm font-semibold text-gray-700 mb-2">Nombre del Cliente</label>
                            <input type="text" id="clientNameInput" class="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none" placeholder="Nombre completo">
                        </div>
                        <div>
                            <label class="block text-sm font-semibold text-gray-700 mb-2">Cargo</label>
                            <input type="text" id="clientPositionInput" class="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none" placeholder="Cargo en la empresa">
                        </div>
                    </div>

                    <div class="mb-6">
                        <label class="block text-sm font-semibold text-gray-700 mb-2">Firma Digital</label>
                        <canvas id="signaturePadModal" class="w-full h-40 bg-white border-2 border-gray-300 rounded-lg cursor-crosshair" width="800" height="160"></canvas>
                        <button onclick="clearSignatureModal()" class="mt-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-all">
                            <i class="fas fa-eraser mr-2"></i>Limpiar Firma
                        </button>
                    </div>

                    <div class="mb-6">
                        <label class="flex items-center space-x-2">
                            <input type="checkbox" id="approvalCheckboxModal" class="w-5 h-5 text-purple-600">
                            <span class="text-sm font-semibold text-gray-700">
                                Apruebo los escenarios de prueba generados y autorizo su implementación
                            </span>
                        </label>
                    </div>

                    <div class="text-center">
                        <button onclick="submitApprovalModal()" class="px-12 py-4 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-lg font-bold text-lg hover:from-green-700 hover:to-teal-700 transition-all shadow-lg">
                            <i class="fas fa-check-circle mr-2"></i>Firmar y Aprobar Reporte
                        </button>
                    </div>

                    <div id="approvalConfirmationModal" class="hidden mt-6 p-4 bg-green-50 border-2 border-green-500 rounded-lg">
                        <p class="text-green-800 font-semibold text-center">
                            <i class="fas fa-check-circle mr-2"></i>
                            Reporte aprobado y firmado exitosamente
                        </p>
                        <p class="text-sm text-green-700 text-center mt-2" id="approvalTimestampModal"></p>
                    </div>
                `}
            </div>
        </div>
    `;
    
    document.getElementById('reportModalContent').innerHTML = html;
    document.getElementById('reportModal').classList.remove('hidden');
    
    // Inicializar canvas de firma después de que el modal esté visible
    setTimeout(() => {
        initSignatureCanvas();
    }, 100);
}

// Variables para el canvas de firma
let canvasModal = null;
let ctxModal = null;
let isDrawingModal = false;
let hasSignatureModal = false;

function initSignatureCanvas() {
    canvasModal = document.getElementById('signaturePadModal');
    if (!canvasModal) return;
    
    ctxModal = canvasModal.getContext('2d');
    
    canvasModal.addEventListener('mousedown', startDrawingModal);
    canvasModal.addEventListener('mousemove', drawModal);
    canvasModal.addEventListener('mouseup', stopDrawingModal);
    canvasModal.addEventListener('mouseout', stopDrawingModal);
    
    // Touch events para móviles
    canvasModal.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        const rect = canvasModal.getBoundingClientRect();
        const mouseEvent = new MouseEvent('mousedown', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        canvasModal.dispatchEvent(mouseEvent);
    });
    
    canvasModal.addEventListener('touchmove', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousemove', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        canvasModal.dispatchEvent(mouseEvent);
    });
    
    canvasModal.addEventListener('touchend', (e) => {
        e.preventDefault();
        const mouseEvent = new MouseEvent('mouseup', {});
        canvasModal.dispatchEvent(mouseEvent);
    });
}

function startDrawingModal(e) {
    isDrawingModal = true;
    hasSignatureModal = true;
    const rect = canvasModal.getBoundingClientRect();
    ctxModal.beginPath();
    ctxModal.moveTo(e.clientX - rect.left, e.clientY - rect.top);
}

function drawModal(e) {
    if (!isDrawingModal) return;
    const rect = canvasModal.getBoundingClientRect();
    ctxModal.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctxModal.strokeStyle = '#000';
    ctxModal.lineWidth = 2;
    ctxModal.lineCap = 'round';
    ctxModal.stroke();
}

function stopDrawingModal() {
    isDrawingModal = false;
}

function clearSignatureModal() {
    if (ctxModal && canvasModal) {
        ctxModal.clearRect(0, 0, canvasModal.width, canvasModal.height);
        hasSignatureModal = false;
    }
}

function submitApprovalModal() {
    const clientName = document.getElementById('clientNameInput').value.trim();
    const clientPosition = document.getElementById('clientPositionInput').value.trim();
    const approved = document.getElementById('approvalCheckboxModal').checked;
    
    if (!clientName) {
        alert('Por favor ingrese el nombre del cliente');
        return;
    }
    
    if (!clientPosition) {
        alert('Por favor ingrese el cargo del cliente');
        return;
    }
    
    if (!hasSignatureModal) {
        alert('Por favor firme el documento');
        return;
    }
    
    if (!approved) {
        alert('Por favor marque la casilla de aprobación');
        return;
    }
    
    // Guardar firma del CLIENTE en el Contract B (separado de la revisión del QA)
    if (!window.currentContractB.client_approval) {
        window.currentContractB.client_approval = {};
    }
    
    window.currentContractB.client_approval.client_name = clientName;
    window.currentContractB.client_approval.client_position = clientPosition;
    window.currentContractB.client_approval.signature = canvasModal.toDataURL();
    window.currentContractB.client_approval.approval_date = new Date().toISOString();
    window.currentContractB.client_approval.approval_status = 'approved';
    
    // Guardar el Contract B actualizado con la firma
    if (currentContractBFilename) {
        saveContractBWithReview(currentContractBFilename, window.currentContractB)
            .then(() => {
                console.log('✅ Firma guardada correctamente');
            })
            .catch(error => {
                console.error('Error al guardar la firma:', error);
                alert('Advertencia: La firma no se pudo guardar permanentemente');
            });
    }
    
    // Guardar aprobación en localStorage (backup)
    const approval = {
        clientName,
        clientPosition,
        signature: canvasModal.toDataURL(),
        timestamp: new Date().toISOString(),
        contractB: window.currentContractB
    };
    
    localStorage.setItem('approval', JSON.stringify(approval));
    
    // Mostrar confirmación
    const now = new Date();
    document.getElementById('approvalTimestampModal').textContent = 
        `Firmado el ${now.toLocaleString('es-ES')} por ${clientName} (${clientPosition})`;
    document.getElementById('approvalConfirmationModal').classList.remove('hidden');
    
    // Deshabilitar edición
    document.getElementById('clientNameInput').disabled = true;
    document.getElementById('clientPositionInput').disabled = true;
    document.getElementById('approvalCheckboxModal').disabled = true;
    canvasModal.style.pointerEvents = 'none';
    
    alert('✅ Reporte aprobado y firmado exitosamente');
}

function downloadReportPDF() {
    // Usar window.print() para generar PDF
    const printContent = document.getElementById('reportModalContent').innerHTML;
    const originalContent = document.body.innerHTML;
    
    // Crear una ventana temporal con el contenido del reporte
    const printWindow = window.open('', '', 'height=600,width=800');
    printWindow.document.write('<html><head><title>Reporte de Escenarios</title>');
    printWindow.document.write('<link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">');
    printWindow.document.write('<style>@media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }</style>');
    printWindow.document.write('</head><body>');
    printWindow.document.write('<div class="p-8">');
    printWindow.document.write(printContent);
    printWindow.document.write('</div>');
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    
    // Esperar a que cargue y luego imprimir
    printWindow.onload = function() {
        printWindow.print();
        printWindow.close();
    };
}

// ============================================================
// MÓDULO 3: CODE GENERATOR
// ============================================================

let currentContractC = null;
let currentContractCFilename = null;
let codeReviewModules = [];
let currentCodeReviewIndex = 0;
let codeReviewChanges = [];
let codeReviewCommenterName = '';

const QUALITY_CHAR_NAMES = {
    'functional_suitability': 'Idoneidad Funcional',
    'performance_efficiency': 'Eficiencia de Desempeño',
    'security': 'Seguridad',
    'usability': 'Usabilidad',
    'reliability': 'Fiabilidad',
    'compatibility': 'Compatibilidad',
    'maintainability': 'Mantenibilidad',
    'portability': 'Portabilidad'
};

const QUALITY_CHAR_COLORS = {
    'functional_suitability': 'green',
    'performance_efficiency': 'blue',
    'security': 'red',
    'usability': 'purple',
    'reliability': 'orange',
    'compatibility': 'indigo',
    'maintainability': 'yellow',
    'portability': 'teal'
};

function updateGenerateCodeButtonState() {
    const btn = document.getElementById('tab-code');
    if (!btn) return;
    if (window.currentContractB) {
        btn.disabled = false;
        btn.classList.remove('text-gray-400', 'cursor-not-allowed');
        btn.classList.add('text-purple-600', 'hover:text-purple-800', 'cursor-pointer');
    } else {
        btn.disabled = true;
        btn.classList.remove('text-purple-600', 'hover:text-purple-800', 'cursor-pointer');
        btn.classList.add('text-gray-400', 'cursor-not-allowed');
    }
}

async function generateCode() {
    if (!window.currentContractB) {
        alert('No hay Contract B disponible para generar código');
        return;
    }

    showLoading('Generando código fuente y tests con IA...');

    try {
        const response = await fetch(`${API_BASE}/m3/generate-code`, {
            method: 'POST',
            headers: getApiHeaders(),
            body: JSON.stringify({
                contract_b: window.currentContractB,
                contract_b_filename: currentContractBFilename || ''
            })
        });

        const data = await response.json();

        if (data.success) {
            // Limpiar estado anterior antes de cargar el nuevo
            currentContractC = null;
            currentContractCFilename = null;
            codeReviewModules = [];
            codeReviewChanges = [];
            currentContractC = data.contract_c;
            currentContractCFilename = data.filename;
            hideLoading();
            // Restaurar el layout completo del tab (updateCodeTabState lo reemplazo)
            restoreCodeTabLayout();
            showCodeResults(data.contract_c);
            // Asegurar que el tab de código esté activo y el generador visible (incluso desde historial)
            document.querySelectorAll('.main-content-section').forEach(s => s.classList.add('hidden'));
            document.getElementById('main-content-generator').classList.remove('hidden');
            document.querySelectorAll('[id^="tab-"]').forEach(btn => btn.classList.remove('tab-active'));
            document.getElementById('tab-code').classList.add('tab-active');
            document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
            document.getElementById('content-code').classList.remove('hidden');
        } else {
            throw new Error(data.error || 'Error al generar código');
        }
    } catch (error) {
        hideLoading();
        console.error('Error generando código:', error);
        alert('Error al generar código:\n' + error.message);
    }
}

function updateCodeTabState() {
    const container = document.getElementById('content-code');
    if (!container) return;

    if (!window.currentContractB) {
        // No hay Contract B — mostrar mensaje
        container.innerHTML = `
            <div class="bg-white rounded-2xl shadow-md overflow-hidden">
                <div class="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 text-white">
                    <div class="flex items-center space-x-3">
                        <div class="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                            <i class="fas fa-code text-2xl"></i>
                        </div>
                        <div>
                            <h3 class="text-2xl font-bold">Contract C — Código Generado</h3>
                            <p class="text-indigo-100 text-sm">Código Python + Tests Pytest + Quality Report</p>
                        </div>
                    </div>
                </div>
                <div class="p-12 text-center">
                    <i class="fas fa-vial text-gray-300 text-6xl mb-4"></i>
                    <h3 class="text-xl font-bold text-gray-800 mb-2">No hay escenarios de prueba</h3>
                    <p class="text-gray-500">Primero debes generar los escenarios de prueba (Módulo 2) antes de generar código.</p>
                </div>
            </div>
        `;
        return;
    }

    if (currentContractC) {
        // Ya hay código generado — mostrar resultados
        showCodeResults(currentContractC);
        return;
    }

    // Hay Contract B pero no código — mostrar botón Generar
    container.innerHTML = `
        <div class="bg-white rounded-2xl shadow-md overflow-hidden">
            <div class="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 text-white">
                <div class="flex items-center space-x-3">
                    <div class="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                        <i class="fas fa-code text-2xl"></i>
                    </div>
                    <div>
                        <h3 class="text-2xl font-bold">Contract C — Generación de Código</h3>
                        <p class="text-indigo-100 text-sm">Genera código Python + Tests Pytest + Quality Report</p>
                    </div>
                </div>
            </div>
            <div class="p-12 text-center">
                <i class="fas fa-magic text-purple-300 text-6xl mb-4"></i>
                <h3 class="text-xl font-bold text-gray-800 mb-2">Listo para generar código</h3>
                <p class="text-gray-500 mb-6">Se generará código a partir de los escenarios de prueba (Contract B).</p>
                <button onclick="generateCode()" class="px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-bold text-lg hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl">
                    <i class="fas fa-play mr-2"></i>Generar Código
                </button>
            </div>
        </div>
    `;
}

function restoreCodeTabLayout() {
    const container = document.getElementById('content-code');
    if (!container) return;
    container.innerHTML = `
        <div class="bg-white rounded-2xl shadow-md overflow-hidden">
            <div class="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 text-white">
                <div class="flex items-center space-x-3">
                    <div class="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                        <i class="fas fa-code text-2xl"></i>
                    </div>
                    <div>
                        <h3 class="text-2xl font-bold">Contract C — Código Generado</h3>
                        <p class="text-indigo-100 text-sm">Código Python + Tests Pytest + Quality Report</p>
                    </div>
                </div>
            </div>
            <div class="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <div class="flex items-center space-x-6">
                    <div class="flex items-center space-x-2">
                        <i class="fas fa-file-code text-purple-600"></i>
                        <span class="text-sm font-semibold text-gray-700">Módulos:</span>
                        <span id="codeTotalModules" class="text-lg font-bold text-purple-600">0</span>
                    </div>
                    <div class="flex items-center space-x-2">
                        <i class="fas fa-vial text-green-600"></i>
                        <span class="text-sm font-semibold text-gray-700">Tests:</span>
                        <span id="codeTotalTests" class="text-lg font-bold text-green-600">0</span>
                    </div>
                </div>
            </div>
            <div class="px-6 pt-4 border-b border-gray-200 bg-white">
                <div class="flex space-x-2 overflow-x-auto">
                    <button onclick="switchCodeTab('modules')" id="code-tab-btn-modules" class="code-tab-btn px-5 py-2.5 rounded-lg text-sm font-semibold bg-indigo-600 text-white transition-all">
                        <i class="fas fa-file-code mr-2"></i>Código
                    </button>
                    <button onclick="switchCodeTab('tests')" id="code-tab-btn-tests" class="code-tab-btn px-5 py-2.5 rounded-lg text-sm font-semibold bg-gray-100 text-gray-700 transition-all">
                        <i class="fas fa-vial mr-2"></i>Tests
                    </button>
                    <button onclick="switchCodeTab('quality')" id="code-tab-btn-quality" class="code-tab-btn px-5 py-2.5 rounded-lg text-sm font-semibold bg-gray-100 text-gray-700 transition-all">
                        <i class="fas fa-chart-bar mr-2"></i>Quality Report
                    </button>
                    <button onclick="switchCodeTab('traceability')" id="code-tab-btn-traceability" class="code-tab-btn px-5 py-2.5 rounded-lg text-sm font-semibold bg-gray-100 text-gray-700 transition-all">
                        <i class="fas fa-project-diagram mr-2"></i>Trazabilidad
                    </button>
                    <button onclick="switchCodeTab('coverage')" id="code-tab-btn-coverage" class="code-tab-btn px-5 py-2.5 rounded-lg text-sm font-semibold bg-gray-100 text-gray-700 transition-all">
                        <i class="fas fa-shield-alt mr-2"></i>Cobertura
                    </button>
                </div>
            </div>
            <div class="p-6 bg-white overflow-y-auto" style="max-height: 65vh;">
                <div id="code-tab-modules" class="code-tab-content"></div>
                <div id="code-tab-tests" class="code-tab-content hidden"></div>
                <div id="code-tab-quality" class="code-tab-content hidden"></div>
                <div id="code-tab-traceability" class="code-tab-content hidden"></div>
                <div id="code-tab-coverage" class="code-tab-content hidden"></div>
            </div>
            <div class="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <button onclick="generateCode()" class="px-5 py-2.5 border-2 border-purple-300 text-purple-700 rounded-lg font-semibold hover:bg-purple-50 transition-all">
                    <i class="fas fa-sync-alt mr-2"></i>Regenerar
                </button>
                <div class="flex space-x-3">
                    <button onclick="downloadCodeReport()" class="px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg font-semibold hover:from-red-700 hover:to-red-800 transition-all shadow-md">
                        <i class="fas fa-file-pdf mr-2"></i>Descargar Reporte
                    </button>
                    <button id="startCodeReviewBtn" onclick="startCodeReview()" class="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-bold hover:from-purple-700 hover:to-indigo-700 transition-all shadow-md">
                        <i class="fas fa-clipboard-check mr-2"></i>Revisar Código Manualmente
                    </button>
                </div>
            </div>
        </div>
    `;
}

function showCodeResults(contractC) {
    // Métricas generales
    document.getElementById('codeTotalModules').textContent = contractC.total_modules || 0;
    document.getElementById('codeTotalTests').textContent = contractC.total_tests || 0;

    // Pestañas
    switchCodeTab('modules');

    // Poblar contenido de cada pestaña
    populateModulesTab(contractC);
    populateTestsTab(contractC);
    populateQualityTab(contractC);
    populateTraceabilityTab(contractC);
    populateCoverageTab(contractC);
}

function switchCodeTab(tabName) {
    document.querySelectorAll('.code-tab-content').forEach(el => el.classList.add('hidden'));
    document.getElementById(`code-tab-${tabName}`).classList.remove('hidden');

    document.querySelectorAll('.code-tab-btn').forEach(btn => {
        btn.classList.remove('bg-indigo-600', 'text-white');
        btn.classList.add('bg-gray-100', 'text-gray-700');
    });
    const activeBtn = document.getElementById(`code-tab-btn-${tabName}`);
    if (activeBtn) {
        activeBtn.classList.remove('bg-gray-100', 'text-gray-700');
        activeBtn.classList.add('bg-indigo-600', 'text-white');
    }
}

function populateModulesTab(contractC) {
    const container = document.getElementById('code-tab-modules');
    if (!container) return;
    if (!contractC.generated_code || contractC.generated_code.length === 0) {
        container.innerHTML = '<p class="text-gray-500">No se generaron módulos de código.</p>';
        return;
    }
    let html = '';
    contractC.generated_code.forEach((mod, i) => {
        html += `
            <div class="mb-4 border border-gray-200 rounded-lg overflow-hidden">
                <div class="bg-gray-800 text-white px-4 py-2 flex items-center justify-between">
                    <span class="font-mono font-bold">${mod.filename}</span>
                    <span class="text-xs text-gray-400">${mod.user_story_id}</span>
                </div>
                <div class="p-2 bg-gray-50">
                    <pre class="text-xs font-mono overflow-x-auto max-h-64 overflow-y-auto p-2">${escapeHtml(mod.source_code)}</pre>
                </div>
                ${mod.description ? `<div class="px-4 py-2 text-sm text-gray-600 border-t border-gray-200">${mod.description}</div>` : ''}
            </div>
        `;
    });
    container.innerHTML = html;
}

function populateTestsTab(contractC) {
    const container = document.getElementById('code-tab-tests');
    if (!container) return;
    if (!contractC.generated_tests || contractC.generated_tests.length === 0) {
        container.innerHTML = '<p class="text-gray-500">No se generaron tests.</p>';
        return;
    }
    let html = '';
    contractC.generated_tests.forEach((test, i) => {
        html += `
            <div class="mb-4 border border-gray-200 rounded-lg overflow-hidden">
                <div class="bg-green-800 text-white px-4 py-2 flex items-center justify-between">
                    <span class="font-mono font-bold">${test.test_name}</span>
                    <span class="text-xs text-green-200">Target: ${test.target_module || 'N/A'}</span>
                </div>
                <div class="p-2 bg-gray-50">
                    <pre class="text-xs font-mono overflow-x-auto max-h-64 overflow-y-auto p-2">${escapeHtml(test.source_code)}</pre>
                </div>
                ${test.scenario_ids && test.scenario_ids.length > 0 ? `
                    <div class="px-4 py-2 text-xs text-gray-600 border-t border-gray-200">
                        Escenarios cubiertos: ${test.scenario_ids.join(', ')}
                    </div>
                ` : ''}
            </div>
        `;
    });
    container.innerHTML = html;
}

function populateQualityTab(contractC) {
    const container = document.getElementById('code-tab-quality');
    if (!container) return;
    const qr = contractC.quality_report;
    if (!qr) {
        container.innerHTML = '<p class="text-gray-500">No hay Quality Report disponible.</p>';
        return;
    }

    let html = `
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div class="bg-blue-50 p-4 rounded-lg text-center">
                <div class="text-3xl font-bold text-blue-600">${qr.functions_exceeding_threshold || 0}</div>
                <div class="text-sm text-gray-600">Funciones sobre umbral</div>
            </div>
            <div class="bg-purple-50 p-4 rounded-lg text-center">
                <div class="text-3xl font-bold text-purple-600">${qr.maintainability_index || 'N/A'}</div>
                <div class="text-sm text-gray-600">Maintainability Index</div>
            </div>
            <div class="bg-red-50 p-4 rounded-lg text-center">
                <div class="text-3xl font-bold text-red-600">${qr.security_findings ? qr.security_findings.length : 0}</div>
                <div class="text-sm text-gray-600">Hallazgos de seguridad</div>
            </div>
        </div>
    `;

    // Métricas por función
    if (qr.function_metrics && qr.function_metrics.length > 0) {
        html += '<h4 class="font-bold text-gray-800 mb-3">Métricas por Función</h4>';
        html += '<div class="overflow-x-auto mb-6"><table class="w-full text-sm border-collapse"><thead><tr class="bg-gray-100">';
        html += '<th class="border p-2 text-left">Función</th><th class="border p-2 text-center">CC</th><th class="border p-2 text-center">CogC</th><th class="border p-2 text-center">Banda</th><th class="border p-2 text-center">Excede</th>';
        html += '</tr></thead><tbody>';
        qr.function_metrics.forEach(fm => {
            const exceedsBadge = fm.exceeds_threshold
                ? '<span class="text-red-600 font-bold">⚠️ Sí</span>'
                : '<span class="text-green-600">✅ No</span>';
            html += `<tr class="border-b">
                <td class="border p-2 font-mono">${fm.function_name}</td>
                <td class="border p-2 text-center">${fm.cyclomatic_complexity}</td>
                <td class="border p-2 text-center">${fm.cognitive_complexity}</td>
                <td class="border p-2 text-center"><span class="px-2 py-0.5 rounded font-bold text-xs ${fm.cc_band === 'A' || fm.cc_band === 'B' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">${fm.cc_band}</span></td>
                <td class="border p-2 text-center">${exceedsBadge}</td>
            </tr>`;
        });
        html += '</tbody></table></div>';
    }

    // Hallazgos de seguridad
    if (qr.security_findings && qr.security_findings.length > 0) {
        html += '<h4 class="font-bold text-gray-800 mb-3">Hallazgos de Seguridad (Bandit)</h4>';
        qr.security_findings.forEach(sf => {
            const sevColors = { low: 'yellow', medium: 'orange', high: 'red' };
            const c = sevColors[sf.severity] || 'gray';
            html += `<div class="mb-2 p-3 bg-${c}-50 border-l-4 border-${c}-500 rounded">
                <div class="flex items-center justify-between">
                    <span class="font-mono text-sm font-bold">${sf.test_id}</span>
                    <span class="text-xs px-2 py-0.5 bg-${c}-200 text-${c}-800 rounded font-semibold">${sf.severity.toUpperCase()}</span>
                </div>
                <p class="text-sm text-gray-700 mt-1">${sf.description}</p>
                <p class="text-xs text-gray-500 mt-1">${sf.module}:${sf.line_number}</p>
            </div>`;
        });
    }

    // ISO 25010 Coverage
    if (qr.iso_25010_coverage && qr.iso_25010_coverage.length > 0) {
        html += '<h4 class="font-bold text-gray-800 mb-3 mt-6">Cobertura ISO 25010</h4>';
        html += '<div class="overflow-x-auto"><table class="w-full text-sm border-collapse"><thead><tr class="bg-gray-100">';
        html += '<th class="border p-2 text-left">Característica</th><th class="border p-2 text-center">Estado</th><th class="border p-2 text-left">Veredicto</th>';
        html += '</tr></thead><tbody>';
        qr.iso_25010_coverage.forEach(iso => {
            const statusColors = { measured: 'green', requires_human_judgment: 'orange', not_applicable: 'gray' };
            const c = statusColors[iso.status] || 'gray';
            html += `<tr class="border-b">
                <td class="border p-2 font-semibold">${QUALITY_CHAR_NAMES[iso.characteristic] || iso.characteristic}</td>
                <td class="border p-2 text-center"><span class="text-xs px-2 py-0.5 bg-${c}-100 text-${c}-800 rounded font-semibold">${iso.status.replace(/_/g, ' ')}</span></td>
                <td class="border p-2 text-xs">${iso.verdict || ''}</td>
            </tr>`;
        });
        html += '</tbody></table></div>';
    }

    container.innerHTML = html;
}

function populateTraceabilityTab(contractC) {
    const container = document.getElementById('code-tab-traceability');
    if (!container) return;
    const tm = contractC.traceability_matrix;
    if (!tm) {
        container.innerHTML = '<p class="text-gray-500">No hay matriz de trazabilidad disponible.</p>';
        return;
    }

    const cmmiBadge = tm.cmmi_l3_compliant
        ? '<span class="text-green-600 font-bold text-lg">✅ CMMI L3 Compliant</span>'
        : '<span class="text-red-600 font-bold text-lg">❌ No cumple CMMI L3</span>';

    let html = `
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div class="bg-green-50 p-4 rounded-lg text-center">
                <div class="text-3xl font-bold text-green-600">${tm.requirements_coverage_pct}%</div>
                <div class="text-sm text-gray-600">Cobertura de Requisitos</div>
            </div>
            <div class="bg-blue-50 p-4 rounded-lg text-center">
                <div class="text-3xl font-bold text-blue-600">${tm.tests_justified_pct}%</div>
                <div class="text-sm text-gray-600">Tests Justificados</div>
            </div>
            <div class="bg-purple-50 p-4 rounded-lg text-center flex items-center justify-center">
                ${cmmiBadge}
            </div>
        </div>
    `;

    if (tm.orphan_scenarios && tm.orphan_scenarios.length > 0) {
        html += `<div class="mb-4 p-3 bg-red-50 border-l-4 border-red-500 rounded">
            <p class="font-bold text-red-700">Huérfanos Forward (escenarios sin test):</p>
            <p class="text-sm text-red-600">${tm.orphan_scenarios.join(', ')}</p>
        </div>`;
    }
    if (tm.orphan_tests && tm.orphan_tests.length > 0) {
        html += `<div class="mb-4 p-3 bg-orange-50 border-l-4 border-orange-500 rounded">
            <p class="font-bold text-orange-700">Huérfanos Backward (tests sin escenario):</p>
            <p class="text-sm text-orange-600">${tm.orphan_tests.join(', ')}</p>
        </div>`;
    }

    // Matriz forward
    if (tm.forward && tm.forward.length > 0) {
        html += '<h4 class="font-bold text-gray-800 mb-3">Forward: Escenarios → Tests</h4>';
        html += '<div class="overflow-x-auto mb-6"><table class="w-full text-sm border-collapse"><thead><tr class="bg-gray-100">';
        html += '<th class="border p-2 text-left">Escenario</th><th class="border p-2 text-left">Tests que lo cubren</th><th class="border p-2 text-center">Estado</th>';
        html += '</tr></thead><tbody>';
        tm.forward.forEach(fw => {
            const st = fw.status === 'covered' ? '✅ Cubierto' : '❌ Huérfano';
            const stColor = fw.status === 'covered' ? 'green' : 'red';
            html += `<tr class="border-b">
                <td class="border p-2 font-mono text-xs">${fw.scenario_id}: ${fw.scenario_name}</td>
                <td class="border p-2 text-xs">${fw.covering_tests.length > 0 ? fw.covering_tests.join(', ') : '<span class="text-red-500">Ninguno</span>'}</td>
                <td class="border p-2 text-center"><span class="text-${stColor}-600 font-semibold text-xs">${st}</span></td>
            </tr>`;
        });
        html += '</tbody></table></div>';
    }

    container.innerHTML = html;
}

function populateCoverageTab(contractC) {
    const container = document.getElementById('code-tab-coverage');
    if (!container) return;
    const cr = contractC.coverage_report;
    if (!cr) {
        container.innerHTML = '<p class="text-gray-500">No hay reporte de cobertura disponible.</p>';
        return;
    }

    const thresholdBadge = cr.meets_threshold
        ? '<span class="text-green-600 font-bold">✅ Umbral superado (≥80%)</span>'
        : '<span class="text-red-600 font-bold">❌ Umbral no alcanzado (&lt;80%)</span>';

    let html = `
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div class="bg-green-50 p-4 rounded-lg text-center">
                <div class="text-3xl font-bold text-green-600">${cr.branch_coverage_pct}%</div>
                <div class="text-sm text-gray-600">Branch Coverage</div>
            </div>
            <div class="bg-blue-50 p-4 rounded-lg text-center">
                <div class="text-3xl font-bold text-blue-600">${cr.line_coverage_pct}%</div>
                <div class="text-sm text-gray-600">Line Coverage</div>
            </div>
            <div class="bg-purple-50 p-4 rounded-lg text-center flex items-center justify-center">
                ${thresholdBadge}
            </div>
        </div>
    `;

    if (cr.uncovered_modules && cr.uncovered_modules.length > 0) {
        html += `<div class="p-3 bg-yellow-50 border-l-4 border-yellow-500 rounded">
            <p class="font-bold text-yellow-700">Módulos por debajo del umbral:</p>
            <ul class="text-sm text-yellow-600 mt-1">${cr.uncovered_modules.map(m => `<li>• ${m}</li>`).join('')}</ul>
        </div>`;
    }

    container.innerHTML = html;
}

function startCodeReview() {
    if (!currentContractC || !currentContractC.generated_code || currentContractC.generated_code.length === 0) {
        alert('No hay código generado para revisar');
        return;
    }

    codeReviewCommenterName = prompt('Ingresa tu nombre como Desarrollador Senior:', '');
    if (!codeReviewCommenterName || !codeReviewCommenterName.trim()) {
        return;
    }
    codeReviewCommenterName = codeReviewCommenterName.trim();

    codeReviewModules = currentContractC.generated_code.map((m, idx) => ({
        index: idx,
        filename: m.filename,
        source_code: m.source_code,
        user_story_id: m.user_story_id || '',
        description: m.description || '',
        accepted: false,
        skipped: false,
        comments: []
    }));
    codeReviewChanges = [];
    currentCodeReviewIndex = 0;

    document.getElementById('codeReviewTotalModules').textContent = codeReviewModules.length;
    document.getElementById('codeReviewModal').classList.remove('hidden');
    showCodeReviewModule(0);
}

function showCodeReviewModule(index) {
    if (index >= codeReviewModules.length) {
        document.getElementById('codeReviewContent').classList.add('hidden');
        const actionsBar = document.getElementById('codeReviewActions');
        if (actionsBar) actionsBar.classList.add('hidden');
        const nameInput = document.getElementById('codeReviewerName');
        if (nameInput) {
            nameInput.value = codeReviewCommenterName || '';
            nameInput.readOnly = true;
            nameInput.classList.add('bg-gray-100', 'cursor-not-allowed');
        }
        document.getElementById('codeReviewFinalSection').classList.remove('hidden');
        return;
    }
    const actionsBar = document.getElementById('codeReviewActions');
    if (actionsBar) actionsBar.classList.remove('hidden');

    currentCodeReviewIndex = index;
    const mod = codeReviewModules[index];

    document.getElementById('codeReviewCurrentIndex').textContent = index + 1;
    const pct = ((index + 1) / codeReviewModules.length) * 100;
    document.getElementById('codeReviewProgressBar').style.width = `${pct}%`;

    const html = `
        <div class="mb-4">
            <div class="bg-gray-800 text-white px-4 py-3 rounded-t-lg flex items-center justify-between">
                <h4 class="font-bold font-mono">${mod.filename}</h4>
                <span class="text-xs text-gray-400">${mod.user_story_id}</span>
            </div>
            <div class="bg-gray-50 p-3 border-x border-b border-gray-200 rounded-b-lg">
                <pre class="text-xs font-mono overflow-x-auto max-h-96 overflow-y-auto">${escapeHtml(mod.source_code)}</pre>
            </div>
            ${mod.description ? `<p class="text-sm text-gray-600 mt-2 italic">${mod.description}</p>` : ''}
        </div>
        <div>
            <p class="text-sm font-semibold text-gray-700 mb-3">Lo que las métricas no ven y tú debes juzgar:</p>
            <ul class="text-xs text-gray-600 space-y-1 mb-4 list-disc list-inside">
                <li><strong>Naming:</strong> los nombres reflejan la intención?</li>
                <li><strong>Design intent:</strong> la estructura cuenta una historia coherente?</li>
                <li><strong>Code smells:</strong> acoplamiento sutil, abstracciones prematuras?</li>
                <li><strong>Appropriateness:</strong> resuelve el problema real del escenario?</li>
            </ul>
        </div>
    `;

    document.getElementById('codeReviewContent').innerHTML = html;
    document.getElementById('codeReviewContent').classList.remove('hidden');
    document.getElementById('codeReviewFinalSection').classList.add('hidden');
}

function acceptCodeModule() {
    const mod = codeReviewModules[currentCodeReviewIndex];
    codeReviewChanges.push({
        filename: mod.filename,
        action: 'accepted',
        reviewer: codeReviewCommenterName,
        notes: 'Módulo aceptado por el revisor'
    });
    showCodeReviewModule(currentCodeReviewIndex + 1);
}

function commentCodeModule() {
    const notes = document.getElementById('codeReviewNotes').value.trim();
    if (!notes) {
        alert('Por favor escribe tu observación');
        return;
    }
    const mod = codeReviewModules[currentCodeReviewIndex];
    codeReviewChanges.push({
        filename: mod.filename,
        action: 'smell_flagged',
        reviewer: codeReviewCommenterName,
        notes: notes
    });
    const commentsList = document.getElementById('codeReviewCommentsList');
    if (commentsList) {
        const entry = document.createElement('div');
        entry.className = 'text-xs bg-orange-50 border border-orange-200 rounded px-2 py-1 text-orange-800';
        entry.textContent = `${codeReviewCommenterName} → ${mod.filename}: ${notes}`;
        commentsList.appendChild(entry);
    }
    document.getElementById('codeReviewNotes').value = '';
    showCodeReviewModule(currentCodeReviewIndex + 1);
}

function skipCodeModule() {
    const mod = codeReviewModules[currentCodeReviewIndex];
    codeReviewChanges.push({
        filename: mod.filename,
        action: 'skipped',
        reviewer: codeReviewCommenterName,
        notes: ''
    });
    showCodeReviewModule(currentCodeReviewIndex + 1);
}

async function submitCodeReview() {
    const reviewerName = document.getElementById('codeReviewerName').value.trim();
    const decision = document.getElementById('codeReviewDecision').value;
    const finalNotes = document.getElementById('codeReviewFinalNotes').value.trim();

    if (!reviewerName) {
        alert('Por favor ingresa tu nombre');
        return;
    }

    const reviewPayload = {
        review_status: decision,
        approved_by: reviewerName,
        reviewer_feedback: finalNotes || '',
        approved_at: new Date().toISOString(),
        change_history: codeReviewChanges.map(c => ({
            timestamp: new Date().toISOString(),
            reviewer: reviewerName,
            action: c.action,
            target: c.filename,
            notes: c.notes
        }))
    };

    try {
        const response = await fetch(`${API_BASE}/m3/review-code`, {
            method: 'POST',
            headers: getApiHeaders(),
            body: JSON.stringify({
                review: reviewPayload,
                filename: currentContractCFilename
            })
        });

        const data = await response.json();
        if (data.success) {
            document.getElementById('codeReviewModal').classList.add('hidden');
            showCodeReviewReport(decision, reviewerName, finalNotes);
            // Recargar historial si está visible
            if (typeof loadHistoryInPage === 'function') {
                loadHistoryInPage();
            }
        } else {
            throw new Error(data.error || 'Error al guardar revisión');
        }
    } catch (error) {
        console.error('Error al guardar revisión:', error);
        alert('Error al guardar revisión: ' + error.message);
    }
}

function closeCodeReviewModal() {
    document.getElementById('codeReviewModal').classList.add('hidden');
    document.getElementById('codeReviewFinalSection').classList.add('hidden');
    document.getElementById('codeReviewContent').classList.remove('hidden');
}

function showCodeReviewReport(decision, reviewerName, finalNotes) {
    const container = document.getElementById('reportModalContent');
    const reportModal = document.getElementById('reportModal');
    if (!container || !reportModal) return;

    const cc = currentContractC || {};
    const totalMods = codeReviewModules.length;
    const accepted = codeReviewChanges.filter(c => c.action === 'accepted').length;
    const flagged = codeReviewChanges.filter(c => c.action === 'smell_flagged').length;
    const skipped = codeReviewChanges.filter(c => c.action === 'skipped').length;
    const now = new Date();
    const dateStr = now.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

    const qr = cc.quality_report || {};
    const tm = cc.traceability_matrix || {};
    const cr = cc.coverage_report || {};

    container.innerHTML = `
        <div class="space-y-6">
            <div class="bg-gradient-to-r from-purple-50 to-indigo-50 p-6 rounded-lg border border-purple-200">
                <h3 class="text-xl font-bold text-gray-800 mb-2">Reporte de Revisión de Código</h3>
                <p class="text-sm text-gray-600">Generado el ${dateStr}</p>
            </div>

            <!-- Resumen de Revisión -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div class="text-center p-4 bg-white rounded-lg border border-gray-200">
                    <div class="text-3xl font-bold text-purple-600">${totalMods}</div>
                    <div class="text-sm text-gray-600">Módulos Revisados</div>
                </div>
                <div class="text-center p-4 bg-white rounded-lg border border-gray-200">
                    <div class="text-3xl font-bold text-green-600">${accepted}</div>
                    <div class="text-sm text-gray-600">Aceptados</div>
                </div>
                <div class="text-center p-4 bg-white rounded-lg border border-gray-200">
                    <div class="text-3xl font-bold text-orange-600">${flagged}</div>
                    <div class="text-sm text-gray-600">Con Observaciones</div>
                </div>
                <div class="text-center p-4 bg-white rounded-lg border border-gray-200">
                    <div class="text-3xl font-bold text-gray-600">${skipped}</div>
                    <div class="text-sm text-gray-600">Saltados</div>
                </div>
            </div>

            <div class="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h4 class="font-bold text-gray-700 mb-2">Resumen de la Revisión</h4>
                <div class="space-y-1 text-sm">
                    <p><span class="font-semibold">Revisor:</span> ${escapeHtml(reviewerName)}</p>
                    <p><span class="font-semibold">Decisión Final:</span> ${decision === 'approved' ? '✅ Aprobado' : decision === 'needs_changes' ? '⚠️ Solicitar Cambios' : '❌ Rechazado'}</p>
                    ${finalNotes ? `<p><span class="font-semibold">Notas Finales:</span> ${escapeHtml(finalNotes)}</p>` : ''}
                </div>
            </div>

            ${codeReviewChanges.length > 0 ? `
            <div>
                <h4 class="font-bold text-gray-700 mb-3">Detalle por Módulo</h4>
                <div class="overflow-x-auto">
                    <table class="w-full text-sm border-collapse">
                        <thead><tr class="bg-gray-100">
                            <th class="border p-2 text-left">Módulo</th>
                            <th class="border p-2 text-center">Acción</th>
                            <th class="border p-2 text-left">Revisor</th>
                            <th class="border p-2 text-left">Notas</th>
                        </tr></thead>
                        <tbody>
                        ${codeReviewChanges.map(c => {
                            const actionBadge = c.action === 'accepted' ? '<span class="text-green-600 font-semibold">✅ Aceptado</span>'
                                : c.action === 'smell_flagged' ? '<span class="text-orange-600 font-semibold">⚠️ Observación</span>'
                                : '<span class="text-gray-500 font-semibold">⏭️ Saltado</span>';
                            return `<tr class="border-b">
                                <td class="border p-2 font-mono text-xs">${escapeHtml(c.filename)}</td>
                                <td class="border p-2 text-center">${actionBadge}</td>
                                <td class="border p-2 text-xs">${escapeHtml(c.reviewer || reviewerName)}</td>
                                <td class="border p-2 text-xs text-gray-600">${escapeHtml(c.notes || '')}</td>
                            </tr>`;
                        }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
            ` : ''}

            <!-- Código Generado -->
            ${cc.generated_code && cc.generated_code.length ? `
            <div>
                <h4 class="font-bold text-gray-700 mb-3">Código Generado</h4>
                ${cc.generated_code.map(mod => `
                    <div class="mb-3 border border-gray-200 rounded-lg overflow-hidden">
                        <div class="bg-gray-800 text-white px-4 py-2 text-sm font-mono font-bold">${escapeHtml(mod.filename)}${mod.user_story_id ? ' <span class="text-gray-400">(' + escapeHtml(mod.user_story_id) + ')</span>' : ''}</div>
                        <pre class="text-xs font-mono overflow-x-auto max-h-40 overflow-y-auto p-2 bg-gray-50">${escapeHtml(mod.source_code)}</pre>
                        ${mod.description ? `<div class="px-4 py-1 text-xs text-gray-600 border-t border-gray-200">${escapeHtml(mod.description)}</div>` : ''}
                    </div>
                `).join('')}
            </div>
            ` : ''}

            <!-- Tests Generados -->
            ${cc.generated_tests && cc.generated_tests.length ? `
            <div>
                <h4 class="font-bold text-gray-700 mb-3">Tests Generados (${cc.total_tests || cc.generated_tests.length})</h4>
                ${cc.generated_tests.map(t => `
                    <div class="mb-3 border border-gray-200 rounded-lg overflow-hidden">
                        <div class="bg-green-800 text-white px-4 py-2 text-sm font-mono font-bold">${escapeHtml(t.test_name)} <span class="text-green-200 text-xs">Target: ${escapeHtml(t.target_module || 'N/A')}</span></div>
                        <pre class="text-xs font-mono overflow-x-auto max-h-32 overflow-y-auto p-2 bg-gray-50">${escapeHtml(t.source_code)}</pre>
                        ${t.scenario_ids && t.scenario_ids.length ? `<div class="px-4 py-1 text-xs text-gray-600 border-t border-gray-200">Escenarios: ${t.scenario_ids.join(', ')}</div>` : ''}
                    </div>
                `).join('')}
            </div>
            ` : ''}

            <!-- Quality Report -->
            ${qr.functions_exceeding_threshold !== undefined ? `
            <div>
                <h4 class="font-bold text-gray-700 mb-3">Quality Report</h4>
                <div class="grid grid-cols-3 gap-3 mb-3">
                    <div class="bg-blue-50 p-3 rounded-lg text-center">
                        <div class="text-2xl font-bold text-blue-600">${qr.functions_exceeding_threshold}</div>
                        <div class="text-xs text-gray-600">Funciones sobre umbral</div>
                    </div>
                    <div class="bg-purple-50 p-3 rounded-lg text-center">
                        <div class="text-2xl font-bold text-purple-600">${qr.maintainability_index || 'N/A'}</div>
                        <div class="text-xs text-gray-600">Maintainability Index</div>
                    </div>
                    <div class="bg-red-50 p-3 rounded-lg text-center">
                        <div class="text-2xl font-bold text-red-600">${qr.security_findings ? qr.security_findings.length : 0}</div>
                        <div class="text-xs text-gray-600">Hallazgos de seguridad</div>
                    </div>
                </div>
                ${qr.function_metrics && qr.function_metrics.length ? `
                    <table class="w-full text-xs border-collapse mb-3">
                        <thead><tr class="bg-gray-100">
                            <th class="border p-1 text-left">Función</th><th class="border p-1 text-center">CC</th><th class="border p-1 text-center">CogC</th><th class="border p-1 text-center">Banda</th>
                        </tr></thead>
                        <tbody>${qr.function_metrics.map(fm => `<tr class="border-b">
                            <td class="border p-1 font-mono">${escapeHtml(fm.function_name)}</td>
                            <td class="border p-1 text-center">${fm.cyclomatic_complexity}</td>
                            <td class="border p-1 text-center">${fm.cognitive_complexity}</td>
                            <td class="border p-1 text-center"><span class="px-1 py-0.5 rounded font-bold ${(fm.cc_band === 'A' || fm.cc_band === 'B') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">${fm.cc_band}</span></td>
                        </tr>`).join('')}</tbody>
                    </table>
                ` : ''}
                ${qr.iso_25010_coverage && qr.iso_25010_coverage.length ? `
                    <table class="w-full text-xs border-collapse">
                        <thead><tr class="bg-gray-100">
                            <th class="border p-1 text-left">Característica</th><th class="border p-1 text-center">Estado</th><th class="border p-1 text-left">Veredicto</th>
                        </tr></thead>
                        <tbody>${qr.iso_25010_coverage.map(iso => `<tr class="border-b">
                            <td class="border p-1 font-semibold">${iso.characteristic}</td>
                            <td class="border p-1 text-center"><span class="text-xs px-1 py-0.5 rounded font-semibold bg-green-100 text-green-700">${iso.status.replace(/_/g, ' ')}</span></td>
                            <td class="border p-1 text-xs">${iso.verdict || ''}</td>
                        </tr>`).join('')}</tbody>
                    </table>
                ` : ''}
            </div>
            ` : ''}

            <!-- Trazabilidad -->
            ${tm.requirements_coverage_pct !== undefined ? `
            <div>
                <h4 class="font-bold text-gray-700 mb-3">Matriz de Trazabilidad</h4>
                <div class="grid grid-cols-3 gap-3 mb-3">
                    <div class="bg-green-50 p-3 rounded-lg text-center">
                        <div class="text-2xl font-bold text-green-600">${tm.requirements_coverage_pct}%</div>
                        <div class="text-xs text-gray-600">Cobertura Requisitos</div>
                    </div>
                    <div class="bg-blue-50 p-3 rounded-lg text-center">
                        <div class="text-2xl font-bold text-blue-600">${tm.tests_justified_pct}%</div>
                        <div class="text-xs text-gray-600">Tests Justificados</div>
                    </div>
                    <div class="bg-purple-50 p-3 rounded-lg text-center flex items-center justify-center">
                        ${tm.cmmi_l3_compliant ? '<span class="text-green-600 font-bold text-sm">✅ CMMI L3 Compliant</span>' : '<span class="text-red-600 font-bold text-sm">❌ No cumple CMMI L3</span>'}
                    </div>
                </div>
                ${tm.forward && tm.forward.length ? `
                    <table class="w-full text-xs border-collapse">
                        <thead><tr class="bg-gray-100">
                            <th class="border p-1 text-left">Escenario</th><th class="border p-1 text-left">Tests</th><th class="border p-1 text-center">Estado</th>
                        </tr></thead>
                        <tbody>${tm.forward.map(fw => `<tr class="border-b">
                            <td class="border p-1 font-mono text-xs">${escapeHtml(fw.scenario_id)}: ${escapeHtml(fw.scenario_name)}</td>
                            <td class="border p-1 text-xs">${fw.covering_tests.length ? fw.covering_tests.join(', ') : '<span class="text-red-500">Ninguno</span>'}</td>
                            <td class="border p-1 text-center"><span class="text-${fw.status === 'covered' ? 'green' : 'red'}-600 font-semibold text-xs">${fw.status === 'covered' ? '✅ Cubierto' : '❌ Huérfano'}</span></td>
                        </tr>`).join('')}</tbody>
                    </table>
                ` : ''}
            </div>
            ` : ''}

            <!-- Cobertura -->
            ${cr.branch_coverage_pct !== undefined ? `
            <div>
                <h4 class="font-bold text-gray-700 mb-3">Reporte de Cobertura</h4>
                <div class="grid grid-cols-2 gap-3">
                    <div class="bg-green-50 p-3 rounded-lg text-center">
                        <div class="text-2xl font-bold text-green-600">${cr.branch_coverage_pct}%</div>
                        <div class="text-xs text-gray-600">Branch Coverage</div>
                    </div>
                    <div class="bg-blue-50 p-3 rounded-lg text-center">
                        <div class="text-2xl font-bold text-blue-600">${cr.line_coverage_pct}%</div>
                        <div class="text-xs text-gray-600">Line Coverage</div>
                    </div>
                </div>
                ${cr.meets_threshold !== undefined ? `<p class="mt-2 text-sm ${cr.meets_threshold ? 'text-green-600' : 'text-red-600'} font-semibold">${cr.meets_threshold ? '✅ Umbral superado (≥80%)' : '❌ Umbral no alcanzado (<80%)'}</p>` : ''}
            </div>
            ` : ''}
        </div>
    `;

    document.querySelector('#reportModal h3').textContent = 'Reporte de Revisión de Código';
    document.querySelector('#reportModal .text-emerald-100').textContent = 'Documento completo de código generado y revisión';
    reportModal.classList.remove('hidden');
}

function closeReportModal() {
    const modal = document.getElementById('reportModal');
    if (modal) modal.classList.add('hidden');
}

function downloadReportAsPdf() {
    // Guardar datos del revisor QA si existen los inputs
    const nameInput = document.getElementById('reportReviewerName');
    const decisionInput = document.getElementById('reportReviewDecision');
    const notesInput = document.getElementById('reportReviewNotes');
    if (nameInput && nameInput.value.trim() && window.currentContractB) {
        window.currentContractB.review = {
            reviewer_name: nameInput.value.trim(),
            review_status: decisionInput ? decisionInput.value : 'approved',
            review_date: new Date().toISOString(),
            review_notes: notesInput ? notesInput.value.trim() : '',
            change_history: [],
            total_scenarios_reviewed: window.currentContractB.total_scenarios || 0,
            scenarios_accepted: window.currentContractB.total_scenarios || 0,
            scenarios_reclassified: 0,
            scenarios_skipped: 0
        };
    }

    // Abrir ventana de impresión con el contenido del reporte
    const printContent = document.getElementById('reportModalContent');
    if (!printContent) return;
    const printWindow = window.open('', '', 'height=600,width=800');
    const headerText = document.querySelector('#reportModal h3')?.textContent || 'Reporte';
    printWindow.document.write('<html><head><title>' + headerText + '</title>');
    printWindow.document.write('<link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">');
    printWindow.document.write('<style>@media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } img { max-width: 100%; } }');
    printWindow.document.write('body{font-family:Arial,sans-serif;color:#333;padding:40px;}');
    printWindow.document.write('table{width:100%;border-collapse:collapse;}');
    printWindow.document.write('td,th{border:1px solid #d1d5db;padding:6px;text-align:left;font-size:12px;}');
    printWindow.document.write('th{background:#f3f4f6;font-weight:600;}');
    printWindow.document.write('pre{background:#f9fafb;padding:6px;font-size:11px;overflow-x:auto;border:1px solid #e5e7eb;border-radius:4px;font-family:monospace;white-space:pre-wrap;}');
    printWindow.document.write('</style></head><body>');
    printWindow.document.write('<div class="p-8">');
    printWindow.document.write(printContent.innerHTML);
    printWindow.document.write('</div>');
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.onload = function() {
        printWindow.print();
    };
}

function downloadCodeReport() {
    if (!currentContractC) {
        alert('No hay código generado para descargar');
        return;
    }
    const cc = currentContractC;
    const now = new Date();
    const dateStr = now.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    const qr = cc.quality_report || {};
    const tm = cc.traceability_matrix || {};
    const cr = cc.coverage_report || {};

    let html = `
<div class="p-8" style="font-family:Arial,sans-serif;color:#333;">
    <div style="text-align:center;margin-bottom:32px;padding:20px;background:linear-gradient(135deg,#f3e8ff,#e0e7ff);border-radius:12px;">
        <h1 style="font-size:28px;font-weight:bold;color:#5b21b6;margin:0;">Reporte de Código Generado</h1>
        <p style="color:#6b7280;margin:4px 0 0 0;">Generado el ${dateStr}</p>
    </div>

    <div style="margin-bottom:24px;">
        <h2 style="font-size:20px;font-weight:bold;color:#374151;border-bottom:2px solid #e5e7eb;padding-bottom:8px;">Resumen</h2>
        <p style="margin:8px 0;">Módulos: <strong>${cc.total_modules || 0}</strong> | Tests: <strong>${cc.total_tests || 0}</strong></p>
    </div>

    ${cc.generated_code && cc.generated_code.length ? `
    <div style="margin-bottom:24px;">
        <h2 style="font-size:20px;font-weight:bold;color:#374151;border-bottom:2px solid #e5e7eb;padding-bottom:8px;">Código Generado</h2>
        ${cc.generated_code.map(mod => `
        <div style="margin-bottom:16px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
            <div style="background:#1f2937;color:white;padding:8px 12px;font-family:monospace;font-weight:bold;">${escapeHtml(mod.filename)}${mod.user_story_id ? ' <span style="color:#9ca3af;">(' + escapeHtml(mod.user_story_id) + ')</span>' : ''}</div>
            <pre style="background:#f9fafb;padding:8px;font-size:12px;overflow-x:auto;max-height:200px;margin:0;font-family:monospace;">${escapeHtml(mod.source_code)}</pre>
            ${mod.description ? `<div style="padding:6px 12px;font-size:12px;color:#6b7280;border-top:1px solid #e5e7eb;">${escapeHtml(mod.description)}</div>` : ''}
        </div>`).join('')}
    </div>` : ''}

    ${cc.generated_tests && cc.generated_tests.length ? `
    <div style="margin-bottom:24px;">
        <h2 style="font-size:20px;font-weight:bold;color:#374151;border-bottom:2px solid #e5e7eb;padding-bottom:8px;">Tests Generados (${cc.total_tests || cc.generated_tests.length})</h2>
        ${cc.generated_tests.map(t => `
        <div style="margin-bottom:12px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
            <div style="background:#065f46;color:white;padding:8px 12px;font-family:monospace;font-weight:bold;">${escapeHtml(t.test_name)} <span style="color:#a7f3d0;font-size:12px;">Target: ${escapeHtml(t.target_module || 'N/A')}</span></div>
            <pre style="background:#f9fafb;padding:8px;font-size:12px;overflow-x:auto;max-height:150px;margin:0;font-family:monospace;">${escapeHtml(t.source_code)}</pre>
            ${t.scenario_ids && t.scenario_ids.length ? `<div style="padding:6px 12px;font-size:11px;color:#6b7280;border-top:1px solid #e5e7eb;">Escenarios: ${t.scenario_ids.join(', ')}</div>` : ''}
        </div>`).join('')}
    </div>` : ''}

    ${qr.functions_exceeding_threshold !== undefined ? `
    <div style="margin-bottom:24px;">
        <h2 style="font-size:20px;font-weight:bold;color:#374151;border-bottom:2px solid #e5e7eb;padding-bottom:8px;">Quality Report</h2>
        <table style="width:100%;border-collapse:collapse;margin-bottom:12px;">
            <tr>
                <td style="background:#eff6ff;padding:12px;text-align:center;border:1px solid #e5e7eb;">
                    <div style="font-size:24px;font-weight:bold;color:#2563eb;">${qr.functions_exceeding_threshold}</div>
                    <div style="font-size:12px;color:#6b7280;">Funciones sobre umbral</div>
                </td>
                <td style="background:#faf5ff;padding:12px;text-align:center;border:1px solid #e5e7eb;">
                    <div style="font-size:24px;font-weight:bold;color:#9333ea;">${qr.maintainability_index || 'N/A'}</div>
                    <div style="font-size:12px;color:#6b7280;">Maintainability Index</div>
                </td>
                <td style="background:#fef2f2;padding:12px;text-align:center;border:1px solid #e5e7eb;">
                    <div style="font-size:24px;font-weight:bold;color:#dc2626;">${qr.security_findings ? qr.security_findings.length : 0}</div>
                    <div style="font-size:12px;color:#6b7280;">Hallazgos de seguridad</div>
                </td>
            </tr>
        </table>
        ${qr.function_metrics && qr.function_metrics.length ? `
        <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:12px;">
            <thead><tr style="background:#f3f4f6;">
                <th style="border:1px solid #e5e7eb;padding:6px;text-align:left;">Función</th>
                <th style="border:1px solid #e5e7eb;padding:6px;text-align:center;">CC</th>
                <th style="border:1px solid #e5e7eb;padding:6px;text-align:center;">CogC</th>
                <th style="border:1px solid #e5e7eb;padding:6px;text-align:center;">Banda</th>
            </tr></thead>
            <tbody>${qr.function_metrics.map(fm => `
                <tr style="border-bottom:1px solid #e5e7eb;">
                    <td style="border:1px solid #e5e7eb;padding:6px;font-family:monospace;font-size:11px;">${escapeHtml(fm.function_name)}</td>
                    <td style="border:1px solid #e5e7eb;padding:6px;text-align:center;">${fm.cyclomatic_complexity}</td>
                    <td style="border:1px solid #e5e7eb;padding:6px;text-align:center;">${fm.cognitive_complexity}</td>
                    <td style="border:1px solid #e5e7eb;padding:6px;text-align:center;"><span style="padding:2px 6px;border-radius:4px;font-weight:bold;font-size:11px;${(fm.cc_band === 'A' || fm.cc_band === 'B') ? 'background:#d1fae5;color:#065f46;' : 'background:#fee2e2;color:#991b1b;'}">${fm.cc_band}</span></td>
                </tr>`).join('')}</tbody>
        </table>` : ''}
        ${qr.iso_25010_coverage && qr.iso_25010_coverage.length ? `
        <table style="width:100%;border-collapse:collapse;font-size:12px;">
            <thead><tr style="background:#f3f4f6;">
                <th style="border:1px solid #e5e7eb;padding:6px;text-align:left;">Característica</th>
                <th style="border:1px solid #e5e7eb;padding:6px;text-align:center;">Estado</th>
                <th style="border:1px solid #e5e7eb;padding:6px;text-align:left;">Veredicto</th>
            </tr></thead>
            <tbody>${qr.iso_25010_coverage.map(iso => `
                <tr style="border-bottom:1px solid #e5e7eb;">
                    <td style="border:1px solid #e5e7eb;padding:6px;font-weight:600;">${iso.characteristic}</td>
                    <td style="border:1px solid #e5e7eb;padding:6px;text-align:center;"><span style="padding:2px 6px;border-radius:4px;font-weight:bold;font-size:11px;background:#d1fae5;color:#065f46;">${iso.status.replace(/_/g, ' ')}</span></td>
                    <td style="border:1px solid #e5e7eb;padding:6px;font-size:11px;">${iso.verdict || ''}</td>
                </tr>`).join('')}</tbody>
        </table>` : ''}
        ${qr.security_findings && qr.security_findings.length ? `
        <div style="margin-top:12px;">
            <h3 style="font-size:14px;font-weight:bold;color:#374151;margin-bottom:8px;">Hallazgos de Seguridad</h3>
            ${qr.security_findings.map(sf => `
            <div style="margin-bottom:6px;padding:8px;background:#fef2f2;border-left:4px solid #ef4444;border-radius:4px;font-size:12px;">
                <strong>${sf.test_id}</strong> [${sf.severity.toUpperCase()}] — ${sf.description}
                <div style="color:#6b7280;font-size:11px;margin-top:2px;">${sf.module}:${sf.line_number}</div>
            </div>`).join('')}
        </div>` : ''}
    </div>` : ''}

    ${tm.requirements_coverage_pct !== undefined ? `
    <div style="margin-bottom:24px;">
        <h2 style="font-size:20px;font-weight:bold;color:#374151;border-bottom:2px solid #e5e7eb;padding-bottom:8px;">Matriz de Trazabilidad</h2>
        <table style="width:100%;border-collapse:collapse;margin-bottom:12px;">
            <tr>
                <td style="background:#f0fdf4;padding:12px;text-align:center;border:1px solid #e5e7eb;">
                    <div style="font-size:24px;font-weight:bold;color:#16a34a;">${tm.requirements_coverage_pct}%</div>
                    <div style="font-size:12px;color:#6b7280;">Cobertura Requisitos</div>
                </td>
                <td style="background:#eff6ff;padding:12px;text-align:center;border:1px solid #e5e7eb;">
                    <div style="font-size:24px;font-weight:bold;color:#2563eb;">${tm.tests_justified_pct}%</div>
                    <div style="font-size:12px;color:#6b7280;">Tests Justificados</div>
                </td>
                <td style="background:#faf5ff;padding:12px;text-align:center;border:1px solid #e5e7eb;">
                    <div style="font-size:16px;font-weight:bold;${tm.cmmi_l3_compliant ? 'color:#16a34a;' : 'color:#dc2626;'}">${tm.cmmi_l3_compliant ? '✅ CMMI L3 Compliant' : '❌ No cumple CMMI L3'}</div>
                </td>
            </tr>
        </table>
        ${tm.forward && tm.forward.length ? `
        <table style="width:100%;border-collapse:collapse;font-size:12px;">
            <thead><tr style="background:#f3f4f6;">
                <th style="border:1px solid #e5e7eb;padding:6px;text-align:left;">Escenario</th>
                <th style="border:1px solid #e5e7eb;padding:6px;text-align:left;">Tests</th>
                <th style="border:1px solid #e5e7eb;padding:6px;text-align:center;">Estado</th>
            </tr></thead>
            <tbody>${tm.forward.map(fw => `
                <tr style="border-bottom:1px solid #e5e7eb;">
                    <td style="border:1px solid #e5e7eb;padding:6px;font-family:monospace;font-size:11px;">${escapeHtml(fw.scenario_id)}: ${escapeHtml(fw.scenario_name)}</td>
                    <td style="border:1px solid #e5e7eb;padding:6px;font-size:11px;">${fw.covering_tests.length ? fw.covering_tests.join(', ') : '<span style="color:#ef4444;">Ninguno</span>'}</td>
                    <td style="border:1px solid #e5e7eb;padding:6px;text-align:center;"><span style="font-weight:600;font-size:11px;${fw.status === 'covered' ? 'color:#16a34a;' : 'color:#dc2626;'}">${fw.status === 'covered' ? '✅ Cubierto' : '❌ Huérfano'}</span></td>
                </tr>`).join('')}</tbody>
        </table>` : ''}
        ${tm.orphan_scenarios && tm.orphan_scenarios.length ? `<div style="margin-top:8px;padding:8px;background:#fef2f2;border-left:4px solid #ef4444;border-radius:4px;font-size:12px;"><strong>Huérfanos Forward:</strong> ${tm.orphan_scenarios.join(', ')}</div>` : ''}
    </div>` : ''}

    ${cr.branch_coverage_pct !== undefined ? `
    <div style="margin-bottom:24px;">
        <h2 style="font-size:20px;font-weight:bold;color:#374151;border-bottom:2px solid #e5e7eb;padding-bottom:8px;">Reporte de Cobertura</h2>
        <table style="width:100%;border-collapse:collapse;margin-bottom:12px;">
            <tr>
                <td style="background:#f0fdf4;padding:12px;text-align:center;border:1px solid #e5e7eb;">
                    <div style="font-size:24px;font-weight:bold;color:#16a34a;">${cr.branch_coverage_pct}%</div>
                    <div style="font-size:12px;color:#6b7280;">Branch Coverage</div>
                </td>
                <td style="background:#eff6ff;padding:12px;text-align:center;border:1px solid #e5e7eb;">
                    <div style="font-size:24px;font-weight:bold;color:#2563eb;">${cr.line_coverage_pct}%</div>
                    <div style="font-size:12px;color:#6b7280;">Line Coverage</div>
                </td>
            </tr>
        </table>
        <p style="font-weight:600;font-size:14px;${cr.meets_threshold ? 'color:#16a34a;' : 'color:#dc2626;'}">${cr.meets_threshold ? '✅ Umbral superado (≥80%)' : '❌ Umbral no alcanzado (<80%)'}</p>
        ${cr.uncovered_lines && cr.uncovered_lines.length ? `<p style="font-size:12px;color:#6b7280;">Líneas sin cubrir: ${cr.uncovered_lines.join(', ')}</p>` : ''}
    </div>` : ''}

    <div style="text-align:center;margin-top:32px;padding-top:16px;border-top:2px solid #e5e7eb;font-size:11px;color:#9ca3af;">
        Reporte generado por QualityAI — Katary Software
    </div>
</div>`;

    const printWindow = window.open('', '', 'height=600,width=800');
    printWindow.document.write('<html><head><title>Reporte de Código - QualityAI</title>');
    printWindow.document.write('<style>body{margin:0;padding:0;} @media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact;}}</style>');
    printWindow.document.write('</head><body>');
    printWindow.document.write(html);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.onload = function() {
        printWindow.print();
        printWindow.close();
    };
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

