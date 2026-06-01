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
                                <i class="fas fa-clock ${colorClasses.text}"></i>
                                <span class="text-sm text-gray-600">
                                    Última actualización: ${new Date(project.updated_at).toLocaleDateString('es-ES')}
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="flex items-center space-x-2">
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
        alert('Por favor ingresa un nombre para el proyecto');
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
            alert('Error al crear proyecto: ' + data.error);
        }
    } catch (error) {
        console.error('Error:', error);
        hideLoading();
        alert('Error al crear proyecto: ' + error.message);
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
            alert('Error al cargar proyecto: ' + data.error);
        }
    } catch (error) {
        console.error('Error:', error);
        hideLoading();
        alert('Error al cargar proyecto: ' + error.message);
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
        alert('Por favor ingresa un nombre para el proyecto');
        return;
    }
    
    if (!editingProjectId) {
        alert('Error: No se ha seleccionado un proyecto para editar');
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
            alert('Error al actualizar proyecto: ' + data.error);
        }
    } catch (error) {
        console.error('Error:', error);
        hideLoading();
        alert('Error al actualizar proyecto: ' + error.message);
    }
}

// ============================================================
// Delete Project
// ============================================================

async function deleteProject(projectId, projectName) {
    // Confirmación con advertencia clara
    const confirmed = confirm(
        `⚠️ ¿ESTÁS SEGURO?\n\n` +
        `Vas a eliminar el proyecto: "${projectName}"\n\n` +
        `Esta acción:\n` +
        `• Eliminará el proyecto de la lista\n` +
        `• NO eliminará los requerimientos ya creados\n` +
        `• Los requerimientos quedarán sin proyecto asignado\n\n` +
        `Esta acción NO se puede deshacer.`
    );
    
    if (!confirmed) return;
    
    // Segunda confirmación
    const doubleConfirm = confirm(
        `Confirma nuevamente que deseas eliminar "${projectName}"`
    );
    
    if (!doubleConfirm) return;
    
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
            alert('❌ Error al eliminar proyecto: ' + data.error);
        }
    } catch (error) {
        console.error('Error:', error);
        hideLoading();
        alert('❌ Error al eliminar proyecto: ' + error.message);
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
    alert('❌ ' + message);
}

function showSuccessToast(message) {
    // Simple toast notification
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center space-x-2';
    toast.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <span>${message}</span>
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}
