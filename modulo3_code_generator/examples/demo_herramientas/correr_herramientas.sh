#!/bin/bash
# Demo de la cadena de herramientas de calidad del Modulo 3 de QualityAI.
# Corre, en orden, las cinco herramientas que los agentes V2 y V3 usan.
#
# Uso:
#   cd modulo3_code_generator/examples/demo_herramientas
#   bash correr_herramientas.sh
#
# Requisitos (instalar una sola vez):
#   pip install pytest pytest-cov radon complexipy bandit

# Sin 'set -e' a proposito: si una herramienta falla o encuentra hallazgos,
# la demo continua con las demas (util para mostrar en clase).
MOD="calculadora_descuentos.py"

echo "============================================================"
echo " 1. PYTEST  --  corre los tests y verifica que el codigo funciona"
echo "============================================================"
pytest -v
echo ""

echo "============================================================"
echo " 2. PYTEST-COV  --  cobertura de RAMAS (branch coverage)"
echo "============================================================"
pytest --cov=calculadora_descuentos --cov-branch --cov-report=term-missing
echo ""

echo "============================================================"
echo " 3. RADON CC  --  Complejidad Ciclomatica por funcion"
echo "============================================================"
radon cc -s "$MOD"
echo ""

echo "============================================================"
echo " 4. RADON MI  --  Maintainability Index del archivo"
echo "============================================================"
radon mi -s "$MOD"
echo ""

echo "============================================================"
echo " 5. COMPLEXIPY  --  Cognitive Complexity por funcion"
echo "============================================================"
complexipy "$MOD"
echo ""

echo "============================================================"
echo " 6. BANDIT  --  analisis de seguridad del codigo"
echo "============================================================"
bandit "$MOD" || true   # Bandit retorna codigo != 0 si encuentra hallazgos: es esperado
echo ""
echo "Demo completa."
