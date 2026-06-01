const API_BASE = 'http://localhost:3000/api';

// Traducciones
const SCENARIO_TYPES_ES = {
    'positive': 'Positivo',
    'negative': 'Negativo',
    'boundary': 'Límite',
    'edge_case': 'Caso Extremo',
    'error_handling': 'Manejo de Errores'
};

const QUALITY_CHARACTERISTICS_ES = {
    'functional_suitability': 'Idoneidad Funcional',
    'performance_efficiency': 'Eficiencia de Desempeño',
    'security': 'Seguridad',
    'usability': 'Usabilidad',
    'reliability': 'Fiabilidad',
    'compatibility': 'Compatibilidad',
    'maintainability': 'Mantenibilidad',
    'portability': 'Portabilidad'
};

function translateScenarioType(type) {
    return SCENARIO_TYPES_ES[type] || type;
}

function translateQualityCharacteristic(qc) {
    return QUALITY_CHARACTERISTICS_ES[qc] || qc;
}

const contractB = JSON.parse(localStorage.getItem('contractB') || 'null');
const agentVersion = localStorage.getItem('agentVersion') || 'v1';

if (!contractB) {
    showToast('No hay datos para generar el reporte. Redirigiendo...', 'error');
    window.location.href = '/static/scenarios/';
}

// Configurar canvas para firma
const canvas = document.getElementById('signaturePad');
const ctx = canvas.getContext('2d');
let isDrawing = false;
let hasSignature = false;

canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', stopDrawing);
canvas.addEventListener('mouseout', stopDrawing);

// Touch events para móviles
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousedown', {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    canvas.dispatchEvent(mouseEvent);
});

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousemove', {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    canvas.dispatchEvent(mouseEvent);
});

canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    const mouseEvent = new MouseEvent('mouseup', {});
    canvas.dispatchEvent(mouseEvent);
});

function startDrawing(e) {
    isDrawing = true;
    hasSignature = true;
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
}

function draw(e) {
    if (!isDrawing) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.stroke();
}

function stopDrawing() {
    isDrawing = false;
}

function clearSignature() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasSignature = false;
}

// Mostrar información del analista QA
function displayQAReviewInfo() {
    const review = contractB.review;
    
    // Mostrar sección
    document.getElementById('qaReviewSection').classList.remove('hidden');
    
    // Mapear decisiones a texto legible
    const decisionText = {
        'approved': '✅ APROBADO - Los escenarios están listos para producción',
        'changes_requested': '⚠️ CAMBIOS SOLICITADOS - Se requieren ajustes antes de continuar',
        'rejected': '❌ RECHAZADO - Los escenarios no cumplen con los criterios de calidad'
    };
    
    const decisionColor = {
        'approved': 'text-green-700 bg-green-100 border-green-500',
        'changes_requested': 'text-yellow-700 bg-yellow-100 border-yellow-500',
        'rejected': 'text-red-700 bg-red-100 border-red-500'
    };
    
    const reviewDate = new Date(review.review_date).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    let html = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
                <p class="text-sm text-gray-600 mb-1">Analista de QA:</p>
                <p class="text-lg font-bold text-gray-800">${review.reviewer_name}</p>
            </div>
            <div>
                <p class="text-sm text-gray-600 mb-1">Fecha de revisión:</p>
                <p class="text-lg font-semibold text-gray-800">${reviewDate}</p>
            </div>
        </div>
        
        <div class="mb-4 p-4 rounded-lg border-2 ${decisionColor[review.review_status]}">
            <p class="text-sm font-semibold mb-1">Decisión:</p>
            <p class="text-lg font-bold">${decisionText[review.review_status]}</p>
        </div>
        
        <div class="mb-4">
            <p class="text-sm font-semibold text-gray-700 mb-2">Estadísticas de revisión:</p>
            <div class="grid grid-cols-3 gap-3 text-center">
                <div class="bg-green-50 p-3 rounded">
                    <div class="text-2xl font-bold text-green-600">${review.scenarios_accepted || 0}</div>
                    <div class="text-xs text-gray-600">Aprobados</div>
                </div>
                <div class="bg-orange-50 p-3 rounded">
                    <div class="text-2xl font-bold text-orange-600">${review.scenarios_reclassified || 0}</div>
                    <div class="text-xs text-gray-600">Reclasificados</div>
                </div>
                <div class="bg-gray-50 p-3 rounded">
                    <div class="text-2xl font-bold text-gray-600">${review.scenarios_skipped || 0}</div>
                    <div class="text-xs text-gray-600">Omitidos</div>
                </div>
            </div>
        </div>
    `;
    
    if (review.review_notes) {
        html += `
            <div class="bg-white border-2 border-gray-300 rounded-lg p-4">
                <p class="text-sm font-semibold text-gray-700 mb-2">Comentarios del analista:</p>
                <p class="text-gray-800 italic">"${review.review_notes}"</p>
            </div>
        `;
    }
    
    document.getElementById('qaReviewInfo').innerHTML = html;
}

// Generar contenido del reporte
function generateReport() {
    // Fecha del reporte
    const now = new Date();
    document.getElementById('reportDate').textContent = 
        `Generado el ${now.toLocaleDateString('es-ES', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })}`;
    
    // Mostrar información del analista QA si existe (V4)
    if (contractB.review) {
        displayQAReviewInfo();
    }
    
    // Resumen Ejecutivo
    const totalStories = contractB.features.length;
    const totalCriteria = contractB.coverage_matrix.length;
    const avgScenariosPerCriteria = (contractB.total_scenarios / totalCriteria).toFixed(1);
    
    // Analizar qué se prueba y qué no
    const whatIsTested = [];
    const whatIsNotTested = [];
    
    contractB.features.forEach(feature => {
        feature.scenarios.forEach(scenario => {
            whatIsTested.push({
                feature: feature.name,
                scenario: scenario.name,
                type: scenario.scenario_type,
                quality: scenario.quality_characteristic
            });
        });
    });
    
    // Identificar gaps de cobertura
    if (agentVersion === 'v3' || agentVersion === 'v4') {
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
        
        characteristics.forEach(char => {
            const count = contractB.coverage_by_characteristic[char] || 0;
            if (count === 0) {
                whatIsNotTested.push({
                    characteristic: translateQualityCharacteristic(char),
                    reason: 'No se generaron escenarios para esta característica de calidad'
                });
            } else if (count < 3) {
                whatIsNotTested.push({
                    characteristic: translateQualityCharacteristic(char),
                    reason: `Cobertura insuficiente (solo ${count} escenario${count > 1 ? 's' : ''})`
                });
            }
        });
    }
    
    // Identificar tipos de escenarios faltantes
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
    
    document.getElementById('executiveSummary').innerHTML = `
        <p class="text-gray-700 leading-relaxed mb-4">
            Se ha completado exitosamente la generación de escenarios de prueba utilizando el 
            <strong>Agente ${agentVersion.toUpperCase()}</strong> de QualityAI Test Architect.
        </p>
        <p class="text-gray-700 leading-relaxed mb-4">
            El sistema procesó <strong>${totalStories} historias de usuario</strong> con un total de 
            <strong>${totalCriteria} criterios de aceptación</strong>, generando 
            <strong>${contractB.total_scenarios} escenarios de prueba</strong> en formato Gherkin (BDD).
        </p>
        <p class="text-gray-700 leading-relaxed mb-4">
            Los escenarios generados cubren múltiples tipos de prueba incluyendo casos positivos, 
            negativos, valores límite y manejo de errores.
        </p>
        
        <div class="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="bg-green-50 border-l-4 border-green-500 p-4 rounded">
                <h4 class="font-bold text-green-800 mb-2">✅ Lo que SÍ se va a probar:</h4>
                <ul class="text-sm text-green-700 space-y-1">
                    <li>• ${contractB.total_positive} escenarios de casos positivos (happy path)</li>
                    <li>• ${contractB.total_negative} escenarios de casos negativos</li>
                    <li>• ${contractB.total_boundary} escenarios de valores límite</li>
                    <li>• ${totalCriteria} criterios de aceptación cubiertos</li>
                </ul>
            </div>
            
            <div class="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
                <h4 class="font-bold text-yellow-800 mb-2">⚠️ Gaps de cobertura identificados:</h4>
                ${whatIsNotTested.length > 0 ? `
                    <ul class="text-sm text-yellow-700 space-y-1">
                        ${whatIsNotTested.slice(0, 5).map(gap => `<li>• ${gap.characteristic}: ${gap.reason}</li>`).join('')}
                        ${whatIsNotTested.length > 5 ? `<li class="font-semibold">• Y ${whatIsNotTested.length - 5} gaps adicionales...</li>` : ''}
                    </ul>
                ` : '<p class="text-sm text-green-700">✅ No se identificaron gaps significativos de cobertura</p>'}
            </div>
        </div>
    `;
    
    // Métricas Clave
    document.getElementById('keyMetrics').innerHTML = `
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="bg-blue-50 p-4 rounded-lg text-center">
                <div class="text-3xl font-bold text-blue-600">${contractB.total_scenarios}</div>
                <div class="text-sm text-gray-600 mt-1">Escenarios Totales</div>
            </div>
            <div class="bg-green-50 p-4 rounded-lg text-center">
                <div class="text-3xl font-bold text-green-600">${contractB.total_positive || 0}</div>
                <div class="text-sm text-gray-600 mt-1">Casos Positivos</div>
            </div>
            <div class="bg-red-50 p-4 rounded-lg text-center">
                <div class="text-3xl font-bold text-red-600">${contractB.total_negative || 0}</div>
                <div class="text-sm text-gray-600 mt-1">Casos Negativos</div>
            </div>
            <div class="bg-orange-50 p-4 rounded-lg text-center">
                <div class="text-3xl font-bold text-orange-600">${contractB.total_boundary || 0}</div>
                <div class="text-sm text-gray-600 mt-1">Valores Límite</div>
            </div>
        </div>
        <div class="mt-6 grid grid-cols-2 gap-4">
            <div class="bg-purple-50 p-4 rounded-lg text-center">
                <div class="text-3xl font-bold text-purple-600">${totalStories}</div>
                <div class="text-sm text-gray-600 mt-1">Features Generadas</div>
            </div>
            <div class="bg-indigo-50 p-4 rounded-lg text-center">
                <div class="text-3xl font-bold text-indigo-600">${avgScenariosPerCriteria}</div>
                <div class="text-sm text-gray-600 mt-1">Escenarios por Criterio (promedio)</div>
            </div>
        </div>
    `;
    
    // Matriz de Cobertura (solo V3+)
    if ((agentVersion === 'v3' || agentVersion === 'v4') && contractB.coverage_by_characteristic) {
        document.getElementById('coverageSection').classList.remove('hidden');
        
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
        
        let html = '<table class="w-full border-collapse"><thead><tr class="bg-gray-100">';
        html += '<th class="border p-3 text-left">Característica ISO 25010</th>';
        html += '<th class="border p-3 text-center">Escenarios</th>';
        html += '<th class="border p-3 text-center">Cobertura</th>';
        html += '</tr></thead><tbody>';
        
        characteristics.forEach(char => {
            const count = contractB.coverage_by_characteristic[char] || 0;
            const percentage = ((count / contractB.total_scenarios) * 100).toFixed(1);
            let status = count === 0 ? '❌ No cubierto' : count < 5 ? '⚠️ Ligero' : '✅ Robusto';
            
            html += `
                <tr>
                    <td class="border p-3 font-semibold">${translateQualityCharacteristic(char)}</td>
                    <td class="border p-3 text-center font-bold">${count}</td>
                    <td class="border p-3 text-center">${percentage}% ${status}</td>
                </tr>
            `;
        });
        
        html += `
            <tr class="bg-gray-100 font-bold">
                <td class="border p-3">TOTAL</td>
                <td class="border p-3 text-center">${contractB.total_scenarios}</td>
                <td class="border p-3 text-center">100%</td>
            </tr>
        </tbody></table>`;
        
        document.getElementById('coverageMatrix').innerHTML = html;
    }
    
    // Detalle de escenarios
    generateScenariosDetail();
    
    // Recomendaciones
    generateRecommendations();
}

function generateScenariosDetail() {
    let html = '<div class="space-y-4">';
    
    contractB.features.forEach((feature, idx) => {
        html += `
            <div class="border border-gray-300 rounded-lg overflow-hidden">
                <div class="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4">
                    <h4 class="text-lg font-bold">${idx + 1}. ${feature.name}</h4>
                    <p class="text-sm text-purple-100 mt-1">${feature.description}</p>
                </div>
                <div class="bg-white p-4">
                    <table class="w-full text-sm">
                        <thead class="bg-gray-100">
                            <tr>
                                <th class="border p-2 text-left">Escenario</th>
                                <th class="border p-2 text-center">Tipo</th>
                                ${(agentVersion === 'v3' || agentVersion === 'v4') ? '<th class="border p-2 text-center">Característica</th>' : ''}
                                <th class="border p-2 text-left">Pasos</th>
                            </tr>
                        </thead>
                        <tbody>
        `;
        
        feature.scenarios.forEach((scenario, sIdx) => {
            const typeColors = {
                'positive': 'green',
                'negative': 'red',
                'boundary': 'orange',
                'edge_case': 'yellow',
                'error_handling': 'purple'
            };
            const color = typeColors[scenario.scenario_type] || 'gray';
            
            html += `
                <tr class="border-b">
                    <td class="border p-2 font-semibold">${sIdx + 1}. ${scenario.name}</td>
                    <td class="border p-2 text-center">
                        <span class="px-2 py-1 bg-${color}-100 text-${color}-700 rounded text-xs font-semibold">
                            ${translateScenarioType(scenario.scenario_type)}
                        </span>
                    </td>
                    ${(agentVersion === 'v3' || agentVersion === 'v4') ? `
                        <td class="border p-2 text-center text-xs font-semibold">
                            ${scenario.quality_characteristic ? translateQualityCharacteristic(scenario.quality_characteristic) : 'N/A'}
                        </td>
                    ` : ''}
                    <td class="border p-2">
                        <div class="font-mono text-xs space-y-1">
                            ${scenario.steps.map(step => `
                                <div><span class="font-bold text-${color}-600">${step.keyword}</span> ${step.text}</div>
                            `).join('')}
                        </div>
                    </td>
                </tr>
            `;
        });
        
        html += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    document.getElementById('scenariosDetail').innerHTML = html;
}

function generateRecommendations() {
    let recommendations = [];
    
    // Análisis basado en métricas
    const positiveRatio = (contractB.total_positive / contractB.total_scenarios) * 100;
    const negativeRatio = (contractB.total_negative / contractB.total_scenarios) * 100;
    
    if (positiveRatio > 70) {
        recommendations.push('✅ Excelente cobertura de casos positivos (happy path).');
    }
    
    if (negativeRatio < 20) {
        recommendations.push('⚠️ Considere agregar más escenarios de casos negativos para mejorar la robustez.');
    }
    
    if (contractB.total_boundary < 5) {
        recommendations.push('⚠️ Se recomienda agregar más casos de prueba de valores límite.');
    }
    
    // Recomendaciones por versión
    if (agentVersion === 'v1') {
        recommendations.push('💡 Considere usar el Agente V2 para aplicar heurísticas formales (EP, BVA, Decision Tables) y generar más escenarios por criterio.');
    } else if (agentVersion === 'v2') {
        recommendations.push('💡 Considere usar el Agente V3 para clasificar escenarios según ISO/IEC 25010 y obtener matriz de cobertura por características de calidad.');
    } else if (agentVersion === 'v3') {
        recommendations.push('💡 Considere usar el Agente V4 para incluir revisión humana (HITL) antes de aprobar los escenarios.');
    }
    
    recommendations.push('📋 Implemente los escenarios generados en su framework de testing (Cucumber, Behave, SpecFlow, etc.).');
    recommendations.push('🔄 Mantenga los escenarios sincronizados con los cambios en los requisitos.');
    
    document.getElementById('recommendations').innerHTML = `
        <ul class="space-y-2">
            ${recommendations.map(rec => `<li class="flex items-start"><span class="mr-2">•</span><span>${rec}</span></li>`).join('')}
        </ul>
    `;
}

function submitApproval() {
    const clientName = document.getElementById('clientName').value.trim();
    const clientPosition = document.getElementById('clientPosition').value.trim();
    const approved = document.getElementById('approvalCheckbox').checked;
    
    if (!clientName) {
        showToast('Por favor ingrese el nombre del cliente', 'warning');
        return;
    }
    
    if (!clientPosition) {
        showToast('Por favor ingrese el cargo del cliente', 'warning');
        return;
    }
    
    if (!hasSignature) {
        showToast('Por favor firme el documento', 'warning');
        return;
    }
    
    if (!approved) {
        showToast('Por favor marque la casilla de aprobación', 'warning');
        return;
    }
    
    // Guardar aprobación
    const approval = {
        clientName,
        clientPosition,
        signature: canvas.toDataURL(),
        timestamp: new Date().toISOString(),
        contractB: contractB,
        agentVersion: agentVersion
    };
    
    localStorage.setItem('approval', JSON.stringify(approval));
    
    // Mostrar confirmación
    const now = new Date();
    document.getElementById('approvalTimestamp').textContent = 
        `Firmado el ${now.toLocaleString('es-ES')} por ${clientName} (${clientPosition})`;
    document.getElementById('approvalConfirmation').classList.remove('hidden');
    
    // Deshabilitar edición
    document.getElementById('clientName').disabled = true;
    document.getElementById('clientPosition').disabled = true;
    document.getElementById('approvalCheckbox').disabled = true;
    canvas.style.pointerEvents = 'none';
    
    showToast('✅ Reporte aprobado y firmado exitosamente', 'success');
}

function downloadPDF() {
    showToast('Funcionalidad de descarga PDF - Use el botón Imprimir y seleccione "Guardar como PDF"', 'info');
}

// ========== M3: Code Generator ==========

// Global variables for M3
let currentContractC = null;
let currentContractCFilename = null;
let codeReviewModules = [];
let currentCodeReviewIndex = 0;
let codeReviewChanges = [];

function getApiHeaders(additionalHeaders = {}) {
    const apiKey = localStorage.getItem('groq_api_key');
    return {
        'Content-Type': 'application/json',
        'X-Groq-API-Key': apiKey || '',
        ...additionalHeaders
    };
}

function showLoading(message = 'Procesando...') {
    const m = document.getElementById('loadingMessage');
    if (m) m.textContent = message;
    const el = document.getElementById('loadingModal');
    if (el) el.classList.remove('hidden');
}

function hideLoading() {
    const el = document.getElementById('loadingModal');
    if (el) el.classList.add('hidden');
}

const QUALITY_CHAR_NAMES = {
    'functional_completeness': 'Completitud Funcional',
    'functional_correctness': 'Corrección Funcional',
    'functional_appropriateness': 'Adecuación Funcional',
    'reliability': 'Fiabilidad',
    'usability': 'Usabilidad',
    'performance_efficiency': 'Eficiencia de Rendimiento',
    'security': 'Seguridad',
    'compatibility': 'Compatibilidad',
    'maintainability': 'Mantenibilidad',
    'portability': 'Portabilidad'
};

async function generateCode() {
    if (!contractB) {
        showToast('No hay Contract B disponible para generar código', 'error');
        return;
    }

    showLoading('Generando código fuente y tests con IA...');

    try {
        const response = await fetch(`${API_BASE}/m3/generate-code`, {
            method: 'POST',
            headers: getApiHeaders(),
            body: JSON.stringify({
                contract_b: contractB
            })
        });

        const data = await response.json();

        if (data.success) {
            currentContractC = data.contract_c;
            currentContractCFilename = data.filename;
            hideLoading();
            showCodeResults(data.contract_c);
        } else {
            throw new Error(data.error || 'Error al generar código');
        }
    } catch (error) {
        hideLoading();
        console.error('Error generando código:', error);
        showToast('Error al generar código:\n' + error.message, 'error');
    }
}

function showCodeResults(contractC) {
    document.getElementById('codeResultsModal').classList.remove('hidden');

    document.getElementById('codeTotalModules').textContent = contractC.total_modules || 0;
    document.getElementById('codeTotalTests').textContent = contractC.total_tests || 0;

    switchCodeTab('modules');

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
    const cr = contractC.coverage_report;
    if (!cr) {
        container.innerHTML = '<p class="text-gray-500">No hay reporte de cobertura disponible.</p>';
        return;
    }

    const thresholdBadge = cr.meets_threshold
        ? '<span class="text-green-600 font-bold">✅ Umbral superado (≥80%)</span>'
        : '<span class="text-red-600 font-bold">❌ Umbral no alcanzado (<80%)</span>';

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

function closeCodeResultsModal() {
    document.getElementById('codeResultsModal').classList.add('hidden');
}

function startCodeReview() {
    if (!currentContractC || !currentContractC.generated_code) {
        showToast('No hay código generado para revisar', 'error');
        return;
    }

    codeReviewModules = currentContractC.generated_code.map(m => ({
        ...m,
        status: 'pending'
    }));
    codeReviewChanges = [];
    currentCodeReviewIndex = 0;

    document.getElementById('codeReviewTotalModules').textContent = codeReviewModules.length;
    document.getElementById('codeResultsModal').classList.add('hidden');
    document.getElementById('codeReviewModal').classList.remove('hidden');
    showCodeReviewModule(0);
}

function showCodeReviewModule(index) {
    if (index >= codeReviewModules.length) {
        document.getElementById('codeReviewContent').classList.add('hidden');
        document.getElementById('codeReviewFinalSection').classList.remove('hidden');
        return;
    }

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
        notes: 'Módulo aceptado por el revisor'
    });
    showCodeReviewModule(currentCodeReviewIndex + 1);
}

function commentCodeModule() {
    const notes = document.getElementById('codeReviewNotes').value.trim();
    if (!notes) {
        showToast('Por favor escribe tu observación', 'warning');
        return;
    }
    const mod = codeReviewModules[currentCodeReviewIndex];
    codeReviewChanges.push({
        filename: mod.filename,
        action: 'smell_flagged',
        notes: notes
    });
    document.getElementById('codeReviewNotes').value = '';
    showCodeReviewModule(currentCodeReviewIndex + 1);
}

function skipCodeModule() {
    const mod = codeReviewModules[currentCodeReviewIndex];
    codeReviewChanges.push({
        filename: mod.filename,
        action: 'skipped',
        notes: ''
    });
    showCodeReviewModule(currentCodeReviewIndex + 1);
}

async function submitCodeReview() {
    const reviewerName = document.getElementById('codeReviewerName').value.trim();
    const decision = document.getElementById('codeReviewDecision').value;
    const finalNotes = document.getElementById('codeReviewFinalNotes').value.trim();

    if (!reviewerName) {
        showToast('Por favor ingresa tu nombre', 'warning');
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
            showToast(`✅ Revisión completada. Estado: ${data.review_status}`, 'error');
            document.getElementById('codeReviewModal').classList.add('hidden');
        } else {
            throw new Error(data.error || 'Error al guardar revisión');
        }
    } catch (error) {
        console.error('Error al guardar revisión:', error);
        showToast('Error al guardar revisión: ' + error.message, 'error');
    }
}

function closeCodeReviewModal() {
    document.getElementById('codeReviewModal').classList.add('hidden');
    document.getElementById('codeReviewFinalSection').classList.add('hidden');
    document.getElementById('codeReviewContent').classList.remove('hidden');
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Generar reporte al cargar
generateReport();
