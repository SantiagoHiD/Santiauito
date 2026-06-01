// ============================================================
// MÓDULO DE HISTORIAL - QualityAI
// Gestión de historial de historias de usuario y escenarios
// ============================================================

let historyData = null;

// Cargar contador inicial al cargar la página
async function loadHistoryCount() {
    try {
        const response = await fetch(`${API_BASE}/history`);
        const data = await response.json();
        
        if (data.success) {
            const m3Count = (data.m3_history || []).length;
            const totalCount = (data.total_stories || 0) + m3Count;
            
            // Actualizar badge del FAB (botón flotante)
            const badgeElement = document.getElementById('historyTotalCount');
            if (badgeElement) {
                badgeElement.textContent = totalCount > 99 ? '99+' : totalCount;
                
                if (totalCount > 0) {
                    badgeElement.style.display = 'flex';
                } else {
                    badgeElement.style.display = 'none';
                }
            }
            
            // Actualizar badge en el menú de usuario
            if (typeof updateHistoryBadgeInMenu === 'function') {
                updateHistoryBadgeInMenu(totalCount);
            }
        }
    } catch (error) {
        console.error('Error cargando contador de historial:', error);
    }
}

// Ejecutar al cargar el módulo
setTimeout(() => {
    loadHistoryCount();
}, 1000); // Esperar 1 segundo para que la página cargue

// ============================================================
// CONTROL DEL MODAL
// ============================================================

function openHistoryModal() {
    document.getElementById('historyModal').classList.remove('hidden');
    if (!historyData) {
        loadHistory();
    }
}

function closeHistoryModal() {
    document.getElementById('historyModal').classList.add('hidden');
}

// Cerrar modal con ESC
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeHistoryModal();
    }
});

// ============================================================
// CARGA DE DATOS
// ============================================================

async function loadHistory() {
    try {
        const response = await fetch(`${API_BASE}/history`);
        const data = await response.json();
        
        if (data.success) {
            historyData = data.history;
            const m3HistoryData = data.m3_history || [];
            
            // Calcular total (incluye M3)
            const m3Count = (data.m3_history || []).length;
            const totalCount = (data.total_stories || 0) + m3Count;
            
            // Actualizar contador en el modal
            document.getElementById('count-stories').textContent = totalCount;
            
            // Badge del FAB
            const badgeElement = document.getElementById('historyTotalCount');
            if (badgeElement) {
                badgeElement.textContent = totalCount > 99 ? '99+' : totalCount;
                badgeElement.style.display = totalCount > 0 ? 'flex' : 'none';
            }
            
            // Badge del header
            const headerBadge = document.getElementById('headerHistoryBadge');
            if (headerBadge) {
                headerBadge.textContent = totalCount > 99 ? '99+' : totalCount;
                if (totalCount > 0) {
                    headerBadge.classList.remove('hidden');
                } else {
                    headerBadge.classList.add('hidden');
                }
            }
            
            // Actualizar badge en el menú de usuario
            if (typeof updateHistoryBadgeInMenu === 'function') {
                updateHistoryBadgeInMenu(totalCount);
            }
            
            // Mostrar historias con sus escenarios vinculados y M3
            displayHistory(historyData, m3HistoryData);
        } else {
            showToast('Error al cargar historial: ' + data.error, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Error al cargar historial: ' + error.message, 'error');
    }
}

// ============================================================
// RENDERIZADO DE HISTORIAS CON ESCENARIOS VINCULADOS
// ============================================================

function displayHistory(stories, m3History = []) {
    const container = document.getElementById('history-content');
    
    if ((!stories || stories.length === 0) && (!m3History || m3History.length === 0)) {
        container.innerHTML = `
            <div class="text-center py-12 text-gray-500">
                <i class="fas fa-inbox text-6xl mb-4 text-gray-300"></i>
                <p class="text-lg">No hay historias de usuario generadas</p>
                <p class="text-sm">Genera tu primera historia de usuario para verla aquí</p>
            </div>
        `;
        return;
    }
    
    let html = '<div class="space-y-4">';
    
    stories.forEach((story, index) => {
        // Determinar estado y botones
        let statusBadge, viewButton, downloadButton;
        
        if (story.has_scenarios) {
            const isSigned = story.scenarios.is_signed;
            
            if (isSigned) {
                // Tiene escenarios Y está firmado
                statusBadge = `<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-300">
                    <i class="fas fa-check-double mr-1"></i>Firmado y Aprobado
                </span>`;
                
                viewButton = `<button onclick="downloadReportFromHistory('${story.scenarios.filename}')" class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all" title="Descargar reporte ejecutivo firmado">
                    <i class="fas fa-file-download mr-2"></i>Descargar Reporte Ejecutivo
                </button>`;
                
                // Boton M3: continuar o ver codigo segun estado
                if (story.has_code) {
                    viewButton += ` <button onclick="viewCombinedReportFromHistory('${story.code.filename}', '${story.scenarios.filename}')" class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all" title="Ver reporte técnico completo (escenarios + código)">
                        <i class="fas fa-file-alt mr-2"></i>Generar Reporte Técnico Completo
                    </button>`;
                } else {
                    viewButton += ` <button onclick="continueWithCode('${story.filename}', '${story.scenarios.filename}')" class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all" title="Continuar con el proceso en el Modulo 3">
                        <i class="fas fa-forward mr-2"></i>Continuar con el Proceso
                    </button>`;
                }
                
                downloadButton = '';
            } else {
                // Tiene escenarios pero NO está firmado
                statusBadge = `<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 border border-yellow-300">
                    <i class="fas fa-pen mr-1"></i>Pendiente Firma
                </span>`;
                
                viewButton = `<button onclick="viewAndSignReport('${story.filename}', '${story.scenarios.filename}')" class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all" title="Firmar reporte ejecutivo">
                    <i class="fas fa-signature mr-2"></i>Firmar Reporte Ejecutivo
                </button>`;
                
                downloadButton = ''; // Sin botón adicional
            }
        } else {
            // NO tiene escenarios - mostrar dos badges
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
            
            downloadButton = ''; // Sin botón adicional
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
    
    // M3: Generated Code History
    if (m3History && m3History.length > 0) {
        html += `
            <div class="mt-6 mb-4">
                <h4 class="text-lg font-bold text-gray-800 flex items-center mb-4">
                    <i class="fas fa-code text-purple-600 mr-2"></i>
                    Código Generado (M3)
                    <span class="ml-2 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full font-semibold">${m3History.length}</span>
                </h4>
            </div>
        `;
        m3History.forEach(item => {
            let reviewBadge;
            if (item.review_status === 'approved') {
                reviewBadge = `<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-300"><i class="fas fa-check-circle mr-1"></i>Aprobado</span>`;
            } else if (item.review_status === 'needs_changes') {
                reviewBadge = `<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 border border-yellow-300"><i class="fas fa-edit mr-1"></i>Cambios Solicitados</span>`;
            } else if (item.review_status === 'rejected') {
                reviewBadge = `<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-300"><i class="fas fa-times-circle mr-1"></i>Rechazado</span>`;
            } else {
                reviewBadge = `<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 border border-gray-300"><i class="fas fa-clock mr-1"></i>Pendiente Revisión</span>`;
            }
            
            html += `
                <div class="history-file-card border border-gray-200 rounded-lg p-4 bg-gradient-to-r from-white to-purple-50">
                    <div class="flex items-center justify-between">
                        <div class="flex-1">
                            <div class="flex items-center flex-wrap gap-2 mb-2">
                                <i class="fas fa-file-code text-purple-600 text-xl"></i>
                                <h3 class="font-bold text-gray-800">Código Generado</h3>
                                ${reviewBadge}
                            </div>
                            <div class="flex items-center space-x-4 text-sm text-gray-600">
                                <span><i class="fas fa-calendar mr-1"></i>${item.date}</span>
                                <span><i class="fas fa-database mr-1"></i>${(item.size / 1024).toFixed(2)} KB</span>
                                <span><i class="fas fa-file mr-1"></i>${item.filename}</span>
                            </div>
                        </div>
                        <div class="flex items-center space-x-2">
                            <button onclick="viewContractC('${item.filename}')" class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all" title="Ver código generado">
                                <i class="fas fa-eye mr-2"></i>Ver Código
                            </button>
                            <button onclick="downloadHistoryFile('modulo3', '${item.filename}')" class="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all" title="Descargar Contract C">
                                <i class="fas fa-download"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
    }
    
    html += '</div>';
    container.innerHTML = html;
}

// ============================================================
// ACCIONES DE ARCHIVOS
// ============================================================

async function viewCompleteReport(storiesFilename, scenariosFilename) {
    showLoading('Cargando reporte completo...');
    
    try {
        // Cargar ambos archivos en paralelo
        const [storiesResponse, scenariosResponse] = await Promise.all([
            fetch(`${API_BASE}/history/modulo1/${storiesFilename}`),
            fetch(`${API_BASE}/history/modulo2/${scenariosFilename}`)
        ]);
        
        const storiesData = await storiesResponse.json();
        const scenariosData = await scenariosResponse.json();
        
        hideLoading();
        
        if (storiesData.success && scenariosData.success) {
            // Cerrar el modal de historial
            closeHistoryModal();
            
            // Mostrar primero las historias
            displayResults(storiesData.data);
            
            // Luego mostrar los escenarios en el sub-tab
            displayScenariosInTab(scenariosData.data);
            
            // Cambiar al tab de resultados y al sub-tab de escenarios
            switchTab('results');
            switchResultsSubTab('scenarios');
        } else {
            showToast('Error al cargar reporte completo', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Error al cargar reporte completo: ' + error.message, 'error');
        hideLoading();
    }
}

async function viewAndSignReport(storiesFilename, scenariosFilename) {
    showLoading('Cargando reporte para firma...');
    
    try {
        // Cargar ambos archivos en paralelo
        const [storiesResponse, scenariosResponse] = await Promise.all([
            fetch(`${API_BASE}/history/modulo1/${storiesFilename}`),
            fetch(`${API_BASE}/history/modulo2/${scenariosFilename}`)
        ]);
        
        const storiesData = await storiesResponse.json();
        const scenariosData = await scenariosResponse.json();
        
        hideLoading();
        
        if (storiesData.success && scenariosData.success) {
            // Cerrar el modal de historial
            closeHistoryModal();
            
            // Cambiar al tab principal del generador
            if (typeof switchMainTab === 'function') {
                switchMainTab('generator');
            }
            
            // Guardar el filename del Contract B para poder guardarlo después de firmar
            currentContractBFilename = scenariosFilename;
            
            // Cargar las historias y escenarios
            displayResults(storiesData.data);
            displayScenariosInTab(scenariosData.data);
            
            // Cambiar al tab de resultados y sub-tab de escenarios
            switchTab('results');
            switchResultsSubTab('scenarios');
        } else {
            showToast('Error al cargar archivos', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Error al cargar archivos: ' + error.message, 'error');
        hideLoading();
    }
}

async function downloadReportFromHistory(scenariosFilename) {
    showLoading('Cargando reporte final...');
    
    try {
        const response = await fetch(`${API_BASE}/history/modulo2/${scenariosFilename}`);
        const data = await response.json();
        
        hideLoading();
        
        if (data.success) {
            // Cerrar el modal de historial
            closeHistoryModal();
            
            // Cambiar a la sección del generador
            switchMainTab('generator');
            
            // Cargar el reporte y mostrarlo
            displayScenariosInTab(data.data);
            
            // Mostrar el reporte en modal
            showReportInModal(data.data);
        } else {
            showToast('Error al cargar reporte: ' + data.error, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Error al cargar reporte: ' + error.message, 'error');
        hideLoading();
    }
}

let fileToDelete = null;

function deleteHistoryFile(filename) {
    // Guardar el nombre del archivo a eliminar
    fileToDelete = filename;
    
    // Mostrar el nombre del archivo en el modal
    const fileNameElement = document.getElementById('deleteFileName');
    if (fileNameElement) {
        fileNameElement.textContent = `Archivo: ${filename}`;
    }
    
    // Mostrar el modal de confirmación
    const modal = document.getElementById('deleteConfirmModal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

function closeDeleteModal() {
    document.getElementById('deleteConfirmModal').classList.add('hidden');
    fileToDelete = null;
}

async function confirmDelete() {
    if (!fileToDelete) return;
    
    // Guardar el filename antes de cerrar el modal (que resetea fileToDelete)
    const filenameToDelete = fileToDelete;
    
    // Cerrar el modal
    closeDeleteModal();
    
    showLoading('Eliminando...');
    
    try {
        const response = await fetch(`${API_BASE}/history/delete/${filenameToDelete}`, {
            method: 'DELETE',
            headers: getApiHeaders()
        });
        
        const data = await response.json();
        
        hideLoading();
        
        if (data.success) {
            // Mostrar toast de éxito (sin alert)
            showSuccessToast('Requerimiento eliminado correctamente');
            
            // Recargar el historial (tanto del modal como de la página)
            if (typeof loadHistory === 'function') {
                loadHistory();
            }
            if (typeof loadHistoryInPage === 'function') {
                loadHistoryInPage();
            }
        } else {
            // Mostrar toast de error (sin alert)
            showErrorToast('Error al eliminar: ' + data.error);
        }
    } catch (error) {
        console.error('Error:', error);
        hideLoading();
        showErrorToast('Error al eliminar el archivo');
    }
}

function showSuccessToast(message) {
    showToast(message, 'success');
}

function showErrorToast(message) {
    showToast(message, 'error');
}

async function completeWithScenarios(storiesFilename) {
    showLoading('Cargando historia de usuario...');
    
    try {
        const response = await fetch(`${API_BASE}/history/modulo1/${storiesFilename}`);
        const data = await response.json();
        
        hideLoading();
        
        if (data.success) {
            closeHistoryModal();
            
            if (typeof switchMainTab === 'function') {
                switchMainTab('generator');
            }
            
            // Extraer timestamp del filename para vincular con M2
            const fileParts = storiesFilename.replace('.json', '').split('_');
            const timestamp = fileParts.length >= 4 ? fileParts.slice(2).join('_') : null;
            
            displayResults(data.data, timestamp);
            switchTab('results');
        } else {
            showToast('Error al cargar archivo: ' + data.error, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Error al cargar archivo: ' + error.message, 'error');
        hideLoading();
    }
}

async function continueWithCode(storiesFilename, scenariosFilename) {
    showLoading('Cargando datos del proceso...');
    
    try {
        const [resB, resA] = await Promise.all([
            fetch(`${API_BASE}/history/modulo2/${scenariosFilename}`),
            fetch(`${API_BASE}/history/modulo1/${storiesFilename}`)
        ]);
        
        const dataB = await resB.json();
        const dataA = await resA.json();
        
        hideLoading();
        
        if (dataB.success && dataA.success) {
            closeHistoryModal();
            
            if (typeof switchMainTab === 'function') {
                switchMainTab('generator');
            }
            
            // Establecer Contract A con timestamp
            const fileParts = storiesFilename.replace('.json', '').split('_');
            const timestamp = fileParts.length >= 4 ? fileParts.slice(2).join('_') : null;
            if (typeof displayResults === 'function') {
                displayResults(dataA.data, timestamp);
            }
            
            // Guardar filename del Contract B
            if (typeof currentContractBFilename !== 'undefined') {
                currentContractBFilename = scenariosFilename;
            }
            
            // displayScenariosInTab setea window.currentContractB
            if (typeof displayScenariosInTab === 'function') {
                displayScenariosInTab(dataB.data);
            }
            
            // Ir a Resultados (M2) para que el usuario decida el siguiente paso
            if (typeof switchTab === 'function') {
                switchTab('results');
            }
            if (typeof switchResultsSubTab === 'function') {
                switchResultsSubTab('scenarios');
            }
        } else {
            showToast('Error al cargar archivos: M2=' + (dataB.error || 'ok', 'error') + ' M1=' + (dataA.error || 'ok'));
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Error al cargar datos: ' + error.message, 'error');
        hideLoading();
    }
}

async function viewHistoryFile(module, filename) {
    showLoading('Cargando archivo...');
    
    try {
        const response = await fetch(`${API_BASE}/history/${module}/${filename}`);
        const data = await response.json();
        
        hideLoading();
        
        if (data.success) {
            // Cerrar el modal de historial
            closeHistoryModal();
            
            if (module === 'modulo1') {
                // Mostrar historias de usuario
                displayResults(data.data);
                switchTab('results');
            } else if (module === 'modulo2') {
                // Mostrar escenarios de prueba
                displayScenariosInTab(data.data);
                switchTab('results');
                switchResultsSubTab('scenarios');
            }
        } else {
            showToast('Error al cargar archivo: ' + data.error, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Error al cargar archivo: ' + error.message, 'error');
        hideLoading();
    }
}

async function viewContractC(filename) {
    showLoading('Cargando código generado...');
    
    try {
        const response = await fetch(`${API_BASE}/history/modulo3/${filename}`);
        const data = await response.json();
        
        hideLoading();
        
        if (data.success) {
            // Cerrar el modal de historial
            closeHistoryModal();
            
            // Ir al generador
            if (typeof switchMainTab === 'function') {
                switchMainTab('generator');
            }
            
            // Configurar Contract A si existe en los datos
            if (data.data.contract_a && typeof displayResults === 'function') {
                displayResults(data.data.contract_a);
            }
            
            // Configurar Contract B si existe
            if (data.data.contract_b && typeof displayScenariosInTab === 'function') {
                displayScenariosInTab(data.data.contract_b);
            }
            
            // Mostrar el código
            if (typeof restoreCodeTabLayout === 'function') {
                restoreCodeTabLayout();
            }
            if (typeof showCodeResults === 'function') {
                showCodeResults(data.data);
            }
            
            // Cambiar al tab de código
            if (typeof switchTab === 'function') {
                switchTab('code');
            }
        } else {
            showToast('Error al cargar código: ' + data.error, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Error al cargar código: ' + error.message, 'error');
        hideLoading();
    }
}

async function downloadHistoryFile(module, filename) {
    try {
        const response = await fetch(`${API_BASE}/history/${module}/${filename}`);
        const data = await response.json();
        
        if (data.success) {
            const dataStr = JSON.stringify(data.data, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            link.click();
            URL.revokeObjectURL(url);
        } else {
            showToast('Error al descargar archivo: ' + data.error, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Error al descargar archivo: ' + error.message, 'error');
    }
}
