// API Configuration
const API_BASE = 'http://localhost:3000/api';

// Global state
let selectedColor = 'indigo';

// ============================================================
// Initialization
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    loadProjects();
});

async function loadProjects() {
    showLoading('Cargando proyectos...');
    
    try {
        const response = await fetch(`${API_BASE}/projects`);
        const data = await response.json();
        
        hideLoading();
        
        if (data.success) {
            renderProjects(data.projects);
        } else {
            showError('Error al cargar proyectos: ' + data.error);
        }
    } catch (error) {
        console.error('Error:', error);
        hideLoading();
        showError('Error al cargar proyectos: ' + error.message);
    }
}

function renderProjects(projects) {
    const container = document.getElementById('projectsList');
    const emptyState = document.getElementById('emptyState');
    
    if (!projects || projects.length === 0) {
        container.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }
    
    emptyState.classList.add('hidden');
    
    container.innerHTML = projects.map(project => {
        const colorClasses = getColorClasses(project.color || 'indigo');
        const requirementsCount = project.requirements_count || 0;
        const storiesCount = project.stories_count || 0;
        const scenariosCount = project.scenarios_count || 0;
        const codeModulesCount = project.code_modules_count || 0;
        const createdDate = new Date(project.created_at).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        return `
            <div class="bg-white rounded-xl shadow-md hover:shadow-xl transition-all p-6 border-l-4 ${colorClasses.border}">
                <div class="flex items-start justify-between">
                    <div class="flex-1 cursor-pointer" onclick="selectProject('${project.id}')">
                        <div class="flex items-center space-x-3 mb-2">
                            <div class="w-12 h-12 ${colorClasses.bg} rounded-lg flex items-center justify-center">
                                <i class="fas fa-folder text-white text-xl"></i>
                            </div>
                            <div>
                                <h4 class="text-xl font-bold text-gray-800">${escapeHtml(project.name)}</h4>
                                <p class="text-sm text-gray-500">Creado el ${createdDate}</p>
                            </div>
                        </div>
                        
                        ${project.description ? `
                            <p class="text-gray-600 mb-3 ml-15">${escapeHtml(project.description)}</p>
                        ` : ''}
                        
                        <div class="flex items-center space-x-4 ml-15">
                            <div class="flex items-center space-x-2">
                                <i class="fas fa-file-alt ${colorClasses.text}"></i>
                                <span class="text-sm text-gray-600">
                                    <strong>${requirementsCount}</strong> requerimiento${requirementsCount !== 1 ? 's' : ''}
                                </span>
                            </div>
                            <div class="flex items-center space-x-2">
                                <i class="fas fa-book ${colorClasses.text}"></i>
                                <span class="text-sm text-gray-600">
                                    <strong>${storiesCount}</strong> historia${storiesCount !== 1 ? 's' : ''}
                                </span>
                            </div>
                            ${scenariosCount > 0 ? `
                            <div class="flex items-center space-x-2">
                                <i class="fas fa-vial ${colorClasses.text}"></i>
                                <span class="text-sm text-gray-600">
                                    <strong>${scenariosCount}</strong> escenario${scenariosCount !== 1 ? 's' : ''}
                                </span>
                            </div>
                            ` : ''}
                            ${codeModulesCount > 0 ? `
                            <div class="flex items-center space-x-2">
                                <i class="fas fa-code ${colorClasses.text}"></i>
                                <span class="text-sm text-gray-600">
                                    <strong>${codeModulesCount}</strong> módulo${codeModulesCount !== 1 ? 's' : ''}
                                </span>
                            </div>
                            ` : ''}
                        </div>
                    </div>
                    
                    <div class="flex items-center space-x-2">
                        <button onclick="toggleFavorite('${project.id}', ${project.is_favorite})"
                                class="p-2 transition-colors ${project.is_favorite ? 'text-amber-400 hover:text-amber-500' : 'text-gray-300 hover:text-amber-400'}"
                                title="${project.is_favorite ? 'Quitar de favoritos' : 'Marcar como favorito'}">
                            <i class="${project.is_favorite ? 'fas' : 'far'} fa-star"></i>
                        </button>
                        <button onclick="editProject('${project.id}')" 
                                class="p-2 text-gray-400 hover:text-indigo-600 transition-colors"
                                title="Editar proyecto">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="deleteProject('${project.id}', '${escapeHtml(project.name)}')" 
                                class="p-2 text-gray-400 hover:text-rose-600 transition-colors"
                                title="Eliminar proyecto">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                
                <div class="mt-4 pt-4 border-t border-gray-100">
                    <button onclick="selectProject('${project.id}')" 
                            class="w-full ${colorClasses.button} text-white py-2 px-4 rounded-lg hover:opacity-90 transition-all font-semibold">
                        <i class="fas fa-arrow-right mr-2"></i>
                        Abrir Proyecto
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function getColorClasses(color) {
    const colors = {
        indigo: {
            bg: 'bg-indigo-500',
            text: 'text-indigo-600',
            border: 'border-indigo-500',
            button: 'bg-indigo-600 hover:bg-indigo-700'
        },
        purple: {
            bg: 'bg-purple-500',
            text: 'text-purple-600',
            border: 'border-purple-500',
            button: 'bg-purple-600 hover:bg-purple-700'
        },
        blue: {
            bg: 'bg-blue-500',
            text: 'text-blue-600',
            border: 'border-blue-500',
            button: 'bg-blue-600 hover:bg-blue-700'
        },
        green: {
            bg: 'bg-green-500',
            text: 'text-green-600',
            border: 'border-green-500',
            button: 'bg-green-600 hover:bg-green-700'
        },
        amber: {
            bg: 'bg-amber-500',
            text: 'text-amber-600',
            border: 'border-amber-500',
            button: 'bg-amber-600 hover:bg-amber-700'
        },
        rose: {
            bg: 'bg-rose-500',
            text: 'text-rose-600',
            border: 'border-rose-500',
            button: 'bg-rose-600 hover:bg-rose-700'
        }
    };
    
    return colors[color] || colors.indigo;
}

// ============================================================
// Create Project
// ============================================================

function showCreateProjectModal() {
    document.getElementById('createProjectModal').classList.remove('hidden');
    document.getElementById('projectName').value = '';
    document.getElementById('projectDescription').value = '';
    selectedColor = 'indigo';
    
    // Reset color selection
    document.querySelectorAll('.color-option').forEach(btn => {
        btn.classList.remove('ring-2');
    });
    document.querySelector('[data-color="indigo"]').classList.add('ring-2');
}

function closeCreateProjectModal() {
    document.getElementById('createProjectModal').classList.add('hidden');
}

function selectColor(color) {
    selectedColor = color;
    
    // Update UI
    document.querySelectorAll('.color-option').forEach(btn => {
        btn.classList.remove('ring-2');
    });
    document.querySelector(`[data-color="${color}"]`).classList.add('ring-2');
}

async function createProject() {
    const name = document.getElementById('projectName').value.trim();
    const description = document.getElementById('projectDescription').value.trim();
    
    if (!name) {
        showToast('Por favor ingresa un nombre para el proyecto', 'warning');
        return;
    }
    
    showLoading('Creando proyecto...');
    closeCreateProjectModal();
    
    try {
        const response = await fetch(`${API_BASE}/projects`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: name,
                description: description,
                color: selectedColor
            })
        });
        
        const data = await response.json();
        hideLoading();
        
        if (data.success) {
            showSuccessToast('Proyecto creado exitosamente');
            loadProjects();
        } else {
            showToast('Error al crear proyecto: ' + data.error, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        hideLoading();
        showToast('Error al crear proyecto: ' + error.message, 'error');
    }
}

// ============================================================
// Select Project
// ============================================================

function selectProject(projectId) {
    // Guardar el proyecto seleccionado en localStorage
    localStorage.setItem('selectedProjectId', projectId);
    
    // Redirigir a la página principal de la WebApp
    window.location.href = '../home/index.html';
}

// ============================================================
// Toggle Favorite
// ============================================================

async function toggleFavorite(projectId, currentState) {
    try {
        const response = await fetch(`${API_BASE}/projects/${projectId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_favorite: !currentState })
        });
        const data = await response.json();
        if (data.success) {
            loadProjects();
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// ============================================================
// Edit Project
// ============================================================

let editingProjectId = null;
let editingProjectColor = 'indigo';

async function editProject(projectId) {
    editingProjectId = projectId;
    
    showLoading('Cargando proyecto...');
    
    try {
        const response = await fetch(`${API_BASE}/projects/${projectId}`);
        const data = await response.json();
        
        hideLoading();
        
        if (data.success) {
            const project = data.project;
            
            // Llenar el formulario con los datos actuales
            document.getElementById('editProjectName').value = project.name;
            document.getElementById('editProjectDescription').value = project.description || '';
            editingProjectColor = project.color || 'indigo';
            
            // Actualizar selección de color
            document.querySelectorAll('.edit-color-option').forEach(btn => {
                btn.classList.remove('ring-2');
            });
            const colorBtn = document.querySelector(`.edit-color-option[data-color="${editingProjectColor}"]`);
            if (colorBtn) {
                colorBtn.classList.add('ring-2');
            }
            
            // Mostrar modal
            document.getElementById('editProjectModal').classList.remove('hidden');
        } else {
            showToast('Error al cargar proyecto: ' + data.error, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        hideLoading();
        showToast('Error al cargar proyecto: ' + error.message, 'error');
    }
}

function closeEditProjectModal() {
    document.getElementById('editProjectModal').classList.add('hidden');
    editingProjectId = null;
}

function selectEditColor(color) {
    editingProjectColor = color;
    
    // Update UI
    document.querySelectorAll('.edit-color-option').forEach(btn => {
        btn.classList.remove('ring-2');
    });
    document.querySelector(`.edit-color-option[data-color="${color}"]`).classList.add('ring-2');
}

async function saveEditProject() {
    const name = document.getElementById('editProjectName').value.trim();
    const description = document.getElementById('editProjectDescription').value.trim();
    
    if (!name) {
        showToast('Por favor ingresa un nombre para el proyecto', 'warning');
        return;
    }
    
    if (!editingProjectId) {
        showToast('Error: No se ha seleccionado un proyecto para editar', 'error');
        return;
    }
    
    showLoading('Guardando cambios...');
    closeEditProjectModal();
    
    try {
        const response = await fetch(`${API_BASE}/projects/${editingProjectId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: name,
                description: description,
                color: editingProjectColor
            })
        });
        
        const data = await response.json();
        hideLoading();
        
        if (data.success) {
            showSuccessToast('Proyecto actualizado exitosamente');
            loadProjects();
        } else {
            showToast('Error al actualizar proyecto: ' + data.error, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        hideLoading();
        showToast('Error al actualizar proyecto: ' + error.message, 'error');
    }
}

// ============================================================
// Delete Confirmation Modal (replaces native confirm)
// ============================================================

let deleteConfirmResolve = null;
let deleteTargetName = '';

function showDeleteConfirm(projectName) {
    return new Promise((resolve) => {
        deleteConfirmResolve = resolve;
        deleteTargetName = projectName;
        renderDeleteStep1();
        document.getElementById('deleteConfirmModal').classList.remove('hidden');
    });
}

function renderDeleteStep1() {
    document.getElementById('deleteConfirmContent').innerHTML = `
        <div class="p-6">
            <div class="flex items-center space-x-3 mb-4">
                <div class="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                    <i class="fas fa-exclamation-triangle text-red-600 text-xl"></i>
                </div>
                <h3 class="text-xl font-bold text-gray-800">¿Eliminar proyecto?</h3>
            </div>
            <p class="text-gray-600 mb-2">Vas a eliminar: <strong>"${escapeHtml(deleteTargetName)}"</strong></p>
            <ul class="text-sm text-gray-500 space-y-1 mb-6 ml-4 list-disc">
                <li>Se eliminará de la lista de proyectos</li>
                <li>NO se eliminarán los requerimientos creados</li>
                <li>Los requerimientos quedarán sin proyecto asignado</li>
                <li>Esta acción NO se puede deshacer</li>
            </ul>
            <div class="flex justify-end space-x-3">
                <button onclick="closeDeleteConfirm()" class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancelar</button>
                <button onclick="renderDeleteStep2()" class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold">Sí, eliminar</button>
            </div>
        </div>
    `;
}

function renderDeleteStep2() {
    document.getElementById('deleteConfirmContent').innerHTML = `
        <div class="p-6">
            <div class="flex items-center space-x-3 mb-4">
                <div class="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                    <i class="fas fa-shield-halved text-red-600 text-xl"></i>
                </div>
                <h3 class="text-xl font-bold text-gray-800">Confirmación final</h3>
            </div>
            <p class="text-gray-600 mb-6">Confirma nuevamente que deseas eliminar <strong>"${escapeHtml(deleteTargetName)}"</strong></p>
            <div class="flex justify-end space-x-3">
                <button onclick="renderDeleteStep1()" class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                    <i class="fas fa-arrow-left mr-1"></i> Volver
                </button>
                <button onclick="executeDelete()" class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold">Sí, estoy seguro</button>
            </div>
        </div>
    `;
}

function closeDeleteConfirm() {
    document.getElementById('deleteConfirmModal').classList.add('hidden');
    if (deleteConfirmResolve) {
        deleteConfirmResolve(false);
        deleteConfirmResolve = null;
    }
}

function executeDelete() {
    document.getElementById('deleteConfirmModal').classList.add('hidden');
    if (deleteConfirmResolve) {
        deleteConfirmResolve(true);
        deleteConfirmResolve = null;
    }
}

// ============================================================
// Delete Project
// ============================================================

async function deleteProject(projectId, projectName) {
    const confirmed = await showDeleteConfirm(projectName);
    if (!confirmed) return;
    
    showLoading('Eliminando proyecto...');
    
    try {
        const response = await fetch(`${API_BASE}/projects/${projectId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        hideLoading();
        
        if (data.success) {
            showSuccessToast('Proyecto eliminado exitosamente');
            loadProjects();
        } else {
            showToast('❌ Error al eliminar proyecto: ' + data.error, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        hideLoading();
        showToast('❌ Error al eliminar proyecto: ' + error.message, 'error');
    }
}

// ============================================================
// Helper Functions
// ============================================================

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showLoading(text = 'Cargando...') {
    document.getElementById('loadingText').textContent = text;
    document.getElementById('loadingOverlay').classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loadingOverlay').classList.add('hidden');
}

function showError(message) {
    hideLoading();
    showToast('❌ ' + message, 'error');
}

function showSuccessToast(message) {
    showToast(message, 'success');
}
