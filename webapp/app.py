"""
Aplicación Web Unificada para QualityAI
Servidor Flask que expone los servicios de ambos módulos:
- Módulo 1: Requirements Refiner (análisis de ambigüedades)
- Módulo 2: Test Architect (generación de escenarios Gherkin)
"""

import json
import os
import re
import sys
import uuid
from pathlib import Path
from datetime import datetime

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer
import chromadb
from groq import Groq as _RealGroq

# ============================================================
# Cargar .env ANTES de leer MOCK_GROQ
# ============================================================
WEBAPP_DIR = Path(__file__).resolve().parent
load_dotenv(WEBAPP_DIR / ".env")

# ============================================================
# MOCK GLOBAL para pruebas sin tokens
# ============================================================
MOCK_GROQ = os.getenv("MOCK_GROQ", "false").lower() in ("true", "1", "yes")

if MOCK_GROQ:
    class MockGroqChoice:
        def __init__(self, content):
            self.message = type('msg', (), {'content': content})()

    class MockCompletions:
        @staticmethod
        def create(**kwargs):
            prompt = str(kwargs.get('messages', []))
            if 'modules' in prompt or 'Gherkin' in prompt or 'escenarios' in prompt.lower():
                content = '''{"modules": [{"filename": "usuario.py", "source_code": "import re\\nfrom typing import Dict, Optional\\n\\nclass Usuario:\\n    def __init__(self, nombre: str, email: str, contrase\\u00f1a: str):\\n        self.nombre = nombre\\n        self.email = email\\n        self.contrase\\u00f1a = contrase\\u00f1a\\n\\n    def validar_nombre(self) -> bool:\\n        return 1 <= len(self.nombre) <= 50\\n\\n    def validar_email(self) -> bool:\\n        patron = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\\\.[a-zA-Z]{2,}$'\\n        return bool(re.match(patron, self.email))", "description": "Modelo de Usuario"}], "tests": [{"test_name": "test_usuario", "source_code": "import pytest\\nfrom usuario import Usuario\\n\\nclass TestUsuario:\\n    def test_nombre_valido(self):\\n        u = Usuario('Juan', 'juan@test.com', 'Pass1234')\\n        assert u.validar_nombre() is True", "target_module": "usuario.py", "scenario_ids": ["AC-001"]}]}'''
            elif 'historias' in prompt.lower() or 'user story' in prompt.lower():
                content = '{"stories": [{"id": "US-001", "title": "Registro de Usuario", "as_a": "usuario", "i_want": "registrarme", "so_that": "acceder al sistema", "priority": "high", "acceptance_criteria": [{"id": "AC-001", "description": "Validar email", "given": "El usuario ingresa un email", "when": "el email es valido", "then": "se acepta", "is_negative_case": false, "test_data_examples": ["test@test.com"], "boundary_values": []}]}]}'
            elif 'escenarios' in prompt.lower() or 'gherkin' in prompt.lower():
                content = '{"features": [{"name": "Registro de Usuario", "description": "Validacion de registro", "scenarios": [{"name": "Email valido", "type": "positive", "steps": [{"keyword": "Given", "text": "un email valido"}, {"keyword": "When", "text": "se valida"}, {"keyword": "Then", "text": "es aceptado"}]}]}]}'
            else:
                content = '{"result": "ok"}'
            return type('resp', (), {'choices': [MockGroqChoice(content)]})()

    class MockChat:
        def __init__(self):
            self.completions = MockCompletions()

    class MockGroqClient:
        def __init__(self, **kwargs):
            self.chat = MockChat()

    # Monkey-patch a nivel del modulo groq para que TODOS los imports
    # (from groq import Groq) obtengan el mock
    import groq as _groq_module
    _groq_module.Groq = MockGroqClient
    Groq = MockGroqClient

    def _mock_response(ruta):
        print(f"  [MOCK] {ruta} - respondiendo sin llamar a Groq")
        if ruta == 'refine':
            return jsonify({
                'success': True,
                'result': {
                    'pipeline_run_id': 'mock-refine',
                    'agent_name': 'requirements_refiner',
                    'agent_version': 'v4',
                    'created_at': datetime.now().isoformat(),
                    'original_requirements_text': '',
                    'project_context': 'resumen del proyecto mock',
                    'user_stories': [{

                        'id': 'US-001', 'title': 'Registro de Usuario',
                        'story_type': 'functional', 'priority': 'high',
                        'as_a': 'usuario', 'i_want': 'registrarme', 'so_that': 'acceder al sistema',
                        'acceptance_criteria': [{
                            'id': 'AC-001', 'description': 'Validar email del usuario durante el registro',
                            'given': 'El usuario ingresa un email',
                            'when': 'el email es valido',
                            'then': 'se acepta',
                            'is_negative_case': False,
                            'test_data_examples': ['test@test.com'],
                            'boundary_values': []
                        }, {
                            'id': 'AC-002', 'description': 'Validar contrasena segura con requisitos minimos',
                            'given': 'El usuario ingresa una contrasena',
                            'when': 'la contrasena cumple los requisitos de seguridad',
                            'then': 'se acepta como valida',
                            'is_negative_case': False,
                            'test_data_examples': ['Pass1234'],
                            'boundary_values': ['8 caracteres', '64 caracteres']
                        }],
                        'business_rules': [], 'dependencies': [],
                        'ui_elements': [], 'api_endpoints': [],
                        'ambiguities_resolved': []
                    }, {
                        'id': 'US-002', 'title': 'Inicio de Sesion de Usuario',
                        'story_type': 'functional', 'priority': 'high',
                        'as_a': 'usuario registrado', 'i_want': 'iniciar sesion', 'so_that': 'acceder al sistema',
                        'acceptance_criteria': [{
                            'id': 'AC-003', 'description': 'Validar credenciales correctas para acceso',
                            'given': 'un usuario registrado con credenciales validas',
                            'when': 'ingresa usuario y contrasena correctos',
                            'then': 'accede al sistema exitosamente',
                            'is_negative_case': False,
                            'test_data_examples': [{'usuario': 'test@test.com', 'contrasena': 'Pass1234', 'expected': 'acceso concedido'}],
                            'boundary_values': []
                        }, {
                            'id': 'AC-004', 'description': 'Bloquear cuenta tras intentos fallidos de login',
                            'given': 'un usuario registrado',
                            'when': 'ingresa contrasena incorrecta 3 veces consecutivas',
                            'then': 'la cuenta se bloquea temporalmente por 30 minutos',
                            'is_negative_case': True,
                            'test_data_examples': [{'usuario': 'test@test.com', 'contrasena': 'wrong', 'intentos': 3, 'expected': 'cuenta bloqueada'}],
                            'boundary_values': ['2 intentos', '3 intentos', '4 intentos']
                        }],
                        'business_rules': [], 'dependencies': ['US-001'],
                        'ui_elements': [], 'api_endpoints': [],
                        'ambiguities_resolved': []
                    }],
                    'total_ambiguities_found': 2,
                    'total_assumptions_made': 1
                },
                'output_file': 'mock_output_refine.json',
                'tokens_used': 0,
                'timestamp': datetime.now().strftime('%Y%m%d_%H%M%S')
            })
        elif ruta == 'scenarios':
            from datetime import datetime as dt_mock
            now = dt_mock.now()
            ts = now.strftime('%Y%m%d_%H%M%S')
            contract_b = {
                'pipeline_run_id': f'mock-m2-{ts}',
                'agent_name': 'test_architect',
                'agent_version': '0.3.0-v3-iso25010',
                'created_at': now.isoformat(),
                'features': [
                    {
                        'name': 'Registro de Usuario (US-001)',
                        'description': 'Creacion de cuenta y validacion de datos personales',
                        'tags': ['smoke', 'regression'],
                        'scenarios': [
                            {
                                'name': 'Email valido',
                                'scenario_type': 'positive',
                                'quality_characteristic': 'functional_suitability',
                                'heuristic_applied': 'EP',
                                'tags': ['smoke'],
                                'steps': [
                                    {'keyword': 'Given', 'text': 'un usuario ingresa un email valido'},
                                    {'keyword': 'When', 'text': 'el sistema valida el formato del email'},
                                    {'keyword': 'Then', 'text': 'el email es aceptado correctamente'}
                                ],
                                'acceptance_criterion_id': 'AC-001',
                                'user_story_id': 'US-001'
                            },
                            {
                                'name': 'Email invalido',
                                'scenario_type': 'negative',
                                'quality_characteristic': 'functional_suitability',
                                'heuristic_applied': 'BVA',
                                'tags': ['regression'],
                                'steps': [
                                    {'keyword': 'Given', 'text': 'un usuario ingresa un email sin arroba'},
                                    {'keyword': 'When', 'text': 'el sistema valida el formato del email'},
                                    {'keyword': 'Then', 'text': 'muestra error Email invalido'}
                                ],
                                'acceptance_criterion_id': 'AC-001',
                                'user_story_id': 'US-001'
                            },
                            {
                                'name': 'Contrasena segura',
                                'scenario_type': 'positive',
                                'quality_characteristic': 'security',
                                'heuristic_applied': 'EP',
                                'tags': ['security'],
                                'steps': [
                                    {'keyword': 'Given', 'text': 'un usuario ingresa una contrasena de 12 caracteres'},
                                    {'keyword': 'When', 'text': 'el sistema evalua la fortaleza de la contrasena'},
                                    {'keyword': 'Then', 'text': 'la contrasena es aceptada como segura'}
                                ],
                                'acceptance_criterion_id': 'AC-002',
                                'user_story_id': 'US-001'
                            },
                            {
                                'name': 'Contrasena debil',
                                'scenario_type': 'negative',
                                'quality_characteristic': 'security',
                                'heuristic_applied': 'BVA',
                                'tags': ['security', 'validation'],
                                'steps': [
                                    {'keyword': 'Given', 'text': 'un usuario ingresa una contrasena de 4 caracteres'},
                                    {'keyword': 'When', 'text': 'el sistema evalua la fortaleza de la contrasena'},
                                    {'keyword': 'Then', 'text': 'muestra error Contrasena debil'}
                                ],
                                'acceptance_criterion_id': 'AC-002',
                                'user_story_id': 'US-001'
                            }
                        ],
                        'user_story_id': 'US-001'
                    },
                    {
                        'name': 'Inicio de Sesion (US-002)',
                        'description': 'Autenticacion de usuarios registrados en el sistema',
                        'tags': ['smoke', 'security'],
                        'scenarios': [
                            {
                                'name': 'Login exitoso',
                                'scenario_type': 'positive',
                                'quality_characteristic': 'functional_suitability',
                                'heuristic_applied': 'general',
                                'tags': ['smoke'],
                                'steps': [
                                    {'keyword': 'Given', 'text': 'un usuario registrado con credenciales validas'},
                                    {'keyword': 'When', 'text': 'ingresa usuario y contrasena correctos'},
                                    {'keyword': 'Then', 'text': 'accede al sistema exitosamente'}
                                ],
                                'acceptance_criterion_id': 'AC-003',
                                'user_story_id': 'US-002'
                            },
                            {
                                'name': 'Login bloqueo',
                                'scenario_type': 'negative',
                                'quality_characteristic': 'security',
                                'heuristic_applied': 'BVA',
                                'tags': ['security'],
                                'steps': [
                                    {'keyword': 'Given', 'text': 'un usuario registrado con credenciales validas'},
                                    {'keyword': 'When', 'text': 'ingresa contrasena incorrecta 3 veces seguidas'},
                                    {'keyword': 'Then', 'text': 'la cuenta se bloquea temporalmente por 30 minutos'}
                                ],
                                'acceptance_criterion_id': 'AC-004',
                                'user_story_id': 'US-002'
                            },
                            {
                                'name': 'Recuperar contrasena',
                                'scenario_type': 'positive',
                                'quality_characteristic': 'usability',
                                'heuristic_applied': 'general',
                                'tags': ['regression'],
                                'steps': [
                                    {'keyword': 'Given', 'text': 'un usuario olvido su contrasena'},
                                    {'keyword': 'When', 'text': 'solicita recuperacion por email registrado'},
                                    {'keyword': 'Then', 'text': 'recibe un enlace de restablecimiento valido por 24 horas'}
                                ],
                                'acceptance_criterion_id': 'AC-003',
                                'user_story_id': 'US-002'
                            }
                        ],
                        'user_story_id': 'US-002'
                    }
                ],
                'coverage_matrix': [
                    {
                        'user_story_id': 'US-001',
                        'criterion_id': 'AC-001',
                        'scenario_names': ['Email valido', 'Email invalido'],
                        'coverage_type': ['positive', 'negative'],
                        'quality_characteristics_covered': ['functional_suitability']
                    },
                    {
                        'user_story_id': 'US-001',
                        'criterion_id': 'AC-002',
                        'scenario_names': ['Contrasena segura', 'Contrasena debil'],
                        'coverage_type': ['positive', 'negative'],
                        'quality_characteristics_covered': ['security']
                    },
                    {
                        'user_story_id': 'US-002',
                        'criterion_id': 'AC-003',
                        'scenario_names': ['Login exitoso', 'Recuperar contrasena'],
                        'coverage_type': ['positive', 'positive'],
                        'quality_characteristics_covered': ['functional_suitability', 'usability']
                    },
                    {
                        'user_story_id': 'US-002',
                        'criterion_id': 'AC-004',
                        'scenario_names': ['Login bloqueo'],
                        'coverage_type': ['negative'],
                        'quality_characteristics_covered': ['security']
                    }
                ],
                'total_scenarios': 7,
                'total_positive': 4,
                'total_negative': 3,
                'total_boundary': 0,
                'coverage_by_characteristic': {
                    'functional_suitability': 3,
                    'security': 3,
                    'usability': 1
                }
            }
            # Persistir Contract B mockeado para que update_contract_b funcione
            output_dir_m2 = MODULO2_DIR / "output"
            output_dir_m2.mkdir(exist_ok=True, parents=True)
            mock_filename_m2 = f"contract_b_mock_{ts}.json"
            mock_file_m2 = output_dir_m2 / mock_filename_m2
            mock_file_m2.write_text(json.dumps(contract_b, ensure_ascii=False, indent=2, default=str), encoding="utf-8")
            return jsonify({
                'success': True,
                'contract_b': contract_b,
                'output_file': str(mock_file_m2),
                'filename': mock_filename_m2,
                'version': 'v3'
            })
        elif ruta == 'code':
            import tempfile
            mock_contract_c = {
                'pipeline_run_id': 'mock-code',
                'agent_name': 'code_generator',
                'agent_version': '0.3.0-v3-trazabilidad',
                'created_at': datetime.now().isoformat(),
                'source_contract_b_id': 'mock-contract-b-webapp',
                'generated_code': [
                    {'filename': 'usuario.py', 'user_story_id': 'US-001', 'description': 'Modelo de Usuario con validaciones', 'source_code': 'import re\nfrom typing import Optional\n\nclass Usuario:\n    def __init__(self, nombre: str, email: str, password: str):\n        self.nombre = nombre\n        self.email = email\n        self.password = password\n\n    def validar_nombre(self) -> bool:\n        return bool(self.nombre and 1 <= len(self.nombre) <= 50)\n\n    def validar_email(self) -> bool:\n        patron = r\'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$\'\n        return bool(re.match(patron, self.email))\n\n    def validar_password_fortaleza(self) -> dict:\n        result = {"valida": False, "nivel": "debil", "errores": []}\n        if len(self.password) < 8:\n            result["errores"].append("Debe tener al menos 8 caracteres")\n        if not re.search(r\'[A-Z]\', self.password):\n            result["errores"].append("Debe contener mayuscula")\n        if not re.search(r\'[0-9]\', self.password):\n            result["errores"].append("Debe contener numero")\n        if not result["errores"]:\n            result["valida"] = True\n            result["nivel"] = "fuerte"\n        return result\n'},
                    {'filename': 'auth_service.py', 'user_story_id': 'US-002', 'description': 'Servicio de autenticación y login', 'source_code': 'from usuario import Usuario\nfrom typing import Optional\n\nclass AuthService:\n    def __init__(self):\n        self._usuarios: dict[str, Usuario] = {}\n        self._intentos_fallidos: dict[str, int] = {}\n\n    def registrar(self, usuario: Usuario) -> dict:\n        if usuario.email in self._usuarios:\n            return {"exito": False, "error": "Email ya registrado"}\n        self._usuarios[usuario.email] = usuario\n        return {"exito": True, "mensaje": "Usuario registrado"}\n\n    def login(self, email: str, password: str) -> dict:\n        if self._intentos_fallidos.get(email, 0) >= 3:\n            return {"exito": False, "error": "Cuenta bloqueada temporalmente"}\n        usuario = self._usuarios.get(email)\n        if not usuario or usuario.password != password:\n            self._intentos_fallidos[email] = self._intentos_fallidos.get(email, 0) + 1\n            return {"exito": False, "error": "Credenciales invalidas"}\n        self._intentos_fallidos[email] = 0\n        return {"exito": True, "mensaje": "Login exitoso", "usuario": usuario}\n\n    def recuperar_password(self, email: str) -> dict:\n        if email not in self._usuarios:\n            return {"exito": False, "error": "Email no registrado"}\n        return {"exito": True, "mensaje": "Enlace de recuperacion enviado", "token_valido_horas": 24}\n'},
                    {'filename': 'perfil_service.py', 'user_story_id': 'US-003', 'description': 'Servicio de gestión de perfil', 'source_code': 'import os\nfrom typing import Optional\n\nclass PerfilService:\n    MAX_AVATAR_SIZE = 2 * 1024 * 1024\n\n    def __init__(self):\n        self._perfiles: dict[str, dict] = {}\n\n    def actualizar_avatar(self, email: str, datos_imagen: bytes) -> dict:\n        if len(datos_imagen) > self.MAX_AVATAR_SIZE:\n            return {"exito": False, "error": "El archivo excede el tamano maximo de 2MB"}\n        if email not in self._perfiles:\n            self._perfiles[email] = {}\n        self._perfiles[email]["avatar"] = datos_imagen\n        return {"exito": True, "mensaje": "Avatar actualizado"}\n\n    def cambiar_email(self, email_actual: str, nuevo_email: str) -> dict:\n        if email_actual not in self._perfiles:\n            return {"exito": False, "error": "Perfil no encontrado"}\n        self._perfiles[nuevo_email] = self._perfiles.pop(email_actual)\n        return {"exito": True, "mensaje": "Email actualizado correctamente"}\n'},
                ],
                'generated_tests': [
                    {'test_name': 'test_usuario', 'source_code': 'import pytest\nfrom usuario import Usuario\n\nclass TestUsuario:\n    def test_nombre_valido(self):\n        u = Usuario("Juan", "juan@test.com", "Pass1234")\n        assert u.validar_nombre() is True\n\n    def test_email_valido(self):\n        u = Usuario("Juan", "juan@test.com", "Pass1234")\n        assert u.validar_email() is True\n\n    def test_email_invalido_sin_arroba(self):\n        u = Usuario("Juan", "juan test.com", "Pass1234")\n        assert u.validar_email() is False\n\n    def test_password_fortaleza_valida(self):\n        u = Usuario("Juan", "juan@test.com", "StrongPass1")\n        res = u.validar_password_fortaleza()\n        assert res["valida"] is True\n        assert res["nivel"] == "fuerte"\n\n    def test_password_corta(self):\n        u = Usuario("Juan", "juan@test.com", "Ab1")\n        res = u.validar_password_fortaleza()\n        assert res["valida"] is False\n', 'target_module': 'usuario.py', 'scenario_ids': ['S-001', 'S-002', 'S-004']},
                    {'test_name': 'test_auth_service', 'source_code': 'import pytest\nfrom auth_service import AuthService\nfrom usuario import Usuario\n\nclass TestAuthService:\n    def setup_method(self):\n        self.service = AuthService()\n        self.usuario = Usuario("Juan", "juan@test.com", "Pass1234")\n\n    def test_registro_exitoso(self):\n        res = self.service.registrar(self.usuario)\n        assert res["exito"] is True\n\n    def test_registro_email_duplicado(self):\n        self.service.registrar(self.usuario)\n        res = self.service.registrar(self.usuario)\n        assert res["exito"] is False\n        assert "registrado" in res["error"]\n\n    def test_login_exitoso(self):\n        self.service.registrar(self.usuario)\n        res = self.service.login("juan@test.com", "Pass1234")\n        assert res["exito"] is True\n\n    def test_login_bloqueo_tres_intentos(self):\n        self.service.registrar(self.usuario)\n        for _ in range(3):\n            self.service.login("juan@test.com", "wrong")\n        res = self.service.login("juan@test.com", "Pass1234")\n        assert res["exito"] is False\n        assert "bloqueada" in res["error"]\n\n    def test_recuperar_password_email_no_registrado(self):\n        res = self.service.recuperar_password("no@existe.com")\n        assert res["exito"] is False\n', 'target_module': 'auth_service.py', 'scenario_ids': ['S-005', 'S-006', 'S-007']},
                    {'test_name': 'test_perfil_service', 'source_code': 'import pytest\nfrom perfil_service import PerfilService\n\nclass TestPerfilService:\n    def setup_method(self):\n        self.service = PerfilService()\n\n    def test_actualizar_avatar_exitoso(self):\n        res = self.service.actualizar_avatar("test@test.com", b"imagen_data")\n        assert res["exito"] is True\n\n    def test_avatar_excede_tamano(self):\n        data = b"x" * (2 * 1024 * 1024 + 1)\n        res = self.service.actualizar_avatar("test@test.com", data)\n        assert res["exito"] is False\n        assert "excede" in res["error"]\n\n    def test_cambiar_email_exitoso(self):\n        self.service.actualizar_avatar("viejo@test.com", b"data")\n        res = self.service.cambiar_email("viejo@test.com", "nuevo@test.com")\n        assert res["exito"] is True\n', 'target_module': 'perfil_service.py', 'scenario_ids': ['S-008', 'S-009', 'S-010']},
                ],
                'total_modules': 3, 'total_tests': 13,
                'quality_report': {
                    'functions_exceeding_threshold': 1,
                    'maintainability_index': 72.5,
                    'security_findings': [
                        {'test_id': 'B101', 'severity': 'medium', 'description': 'Posible hardcoded password en auth_service.py:15', 'module': 'auth_service.py', 'line_number': 15},
                    ],
                    'function_metrics': [
                        {'function_name': 'Usuario.validar_password_fortaleza', 'cyclomatic_complexity': 7, 'cognitive_complexity': 8, 'cc_band': 'C', 'exceeds_threshold': True},
                        {'function_name': 'AuthService.login', 'cyclomatic_complexity': 5, 'cognitive_complexity': 5, 'cc_band': 'B', 'exceeds_threshold': False},
                        {'function_name': 'PerfilService.actualizar_avatar', 'cyclomatic_complexity': 3, 'cognitive_complexity': 2, 'cc_band': 'A', 'exceeds_threshold': False},
                        {'function_name': 'Usuario.validar_email', 'cyclomatic_complexity': 2, 'cognitive_complexity': 1, 'cc_band': 'A', 'exceeds_threshold': False},
                    ],
                    'iso_25010_coverage': [
                        {'characteristic': 'functional_suitability', 'status': 'measured', 'verdict': 'Cumple al 90%'},
                        {'characteristic': 'reliability', 'status': 'measured', 'verdict': 'Cobertura de casos negativos OK'},
                        {'characteristic': 'security', 'status': 'measured', 'verdict': '1 hallazgo medio (password hardcoded)'},
                        {'characteristic': 'maintainability', 'status': 'measured', 'verdict': 'MI=72.5, aceptable'},
                        {'characteristic': 'usability', 'status': 'requires_human_judgment', 'verdict': 'Requiere revision UX'},
                    ],
                },
                'traceability_matrix': {
                    'cmmi_l3_compliant': True,
                    'requirements_coverage_pct': 92,
                    'tests_justified_pct': 88,
                    'orphan_scenarios': ['S-006 (Login con bloqueo)'],
                    'orphan_tests': [],
                    'forward': [
                        {'scenario_id': 'S-001', 'scenario_name': 'Email valido', 'covering_tests': ['test_email_valido'], 'status': 'covered'},
                        {'scenario_id': 'S-002', 'scenario_name': 'Email invalido', 'covering_tests': ['test_email_invalido_sin_arroba'], 'status': 'covered'},
                        {'scenario_id': 'S-004', 'scenario_name': 'Password segura', 'covering_tests': ['test_password_fortaleza_valida'], 'status': 'covered'},
                        {'scenario_id': 'S-005', 'scenario_name': 'Login exitoso', 'covering_tests': ['test_login_exitoso'], 'status': 'covered'},
                        {'scenario_id': 'S-006', 'scenario_name': 'Login bloqueo', 'covering_tests': ['test_login_bloqueo_tres_intentos'], 'status': 'covered'},
                        {'scenario_id': 'S-008', 'scenario_name': 'Actualizar avatar', 'covering_tests': ['test_actualizar_avatar_exitoso'], 'status': 'covered'},
                        {'scenario_id': 'S-009', 'scenario_name': 'Avatar excede', 'covering_tests': ['test_avatar_excede_tamano'], 'status': 'covered'},
                        {'scenario_id': 'S-010', 'scenario_name': 'Cambiar email', 'covering_tests': ['test_cambiar_email_exitoso'], 'status': 'covered'},
                    ],
                },
                'coverage_report': {
                    'branch_coverage_pct': 82,
                    'line_coverage_pct': 91,
                    'uncovered_lines': [12, 45, 67],
                    'meets_threshold': True,
                },
            }
            output_dir = MODULO3_DIR / "output"
            output_dir.mkdir(exist_ok=True, parents=True)
            mock_filename = f"contract_c_mock_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            mock_file = output_dir / mock_filename
            mock_file.write_text(json.dumps(mock_contract_c, ensure_ascii=False, indent=2, default=str), encoding="utf-8")
            return jsonify({'success': True, 'contract_c': mock_contract_c, 'filename': mock_filename, 'output_file': str(mock_file), 'pipeline_run_id': mock_contract_c['pipeline_run_id']})
        return jsonify({'error': 'ruta desconocida'}), 400
else:
    from groq import Groq

# Setup paths
import sys
MODULO1_DIR = Path(__file__).resolve().parents[1] / "qualityai_modulo1"
MODULO2_DIR = Path(__file__).resolve().parents[1] / "qualityai_modulo2"
MODULO3_DIR = Path(__file__).resolve().parents[1] / "modulo3_code_generator"
WEBAPP_DIR = Path(__file__).resolve().parent
PROJECTS_DB_PATH = WEBAPP_DIR / "data" / "projects.json"

# Agregar módulos al path
sys.path.insert(0, str(MODULO1_DIR))
sys.path.insert(0, str(MODULO2_DIR))
sys.path.insert(0, str(MODULO3_DIR))
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))  # raiz del proyecto

from src.ambiguity_detector import AmbiguityDetector
from src.contract_a import (
    AcceptanceCriterion,
    AmbiguityResolution,
    RefinedRequirements,
    UserStory,
    Priority,
    StoryType,
)

app = Flask(__name__, static_folder='static', static_url_path='')
CORS(app)

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    print("ADVERTENCIA: No se encontró GROQ_API_KEY en .env")

modelo = None
collection = None
detector = AmbiguityDetector()
groq_client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None

# Variables globales para Módulo 2
collection_m2 = None  # KB de patrones de testing Katary

# ============================================================
# MÓDULO 3: CODE GENERATOR
# ============================================================
collection_m3 = None  # KB de patrones de código Katary
modelo_m3 = None

# Contract C models
from modulo3_code_generator.src.contract_c import (
    CodeGenerationResult,
    GeneratedCodeModule,
    GeneratedTest,
    QualityReport,
    TraceabilityMatrix,
    CoverageReport,
    ReviewMetadata,
    ReviewStatus,
)

# M3 agent functions
from modulo3_code_generator.agente_v1_solucion import (
    buscar_patrones_similares,
    construir_prompt,
    generar_con_groq,
    parsear_respuesta,
)
from modulo3_code_generator.agente_v2_solucion import (
    volcar_codigo_a_disco,
    ejecutar_radon,
    ejecutar_complexipy,
    ejecutar_bandit,
    construir_function_metrics,
    clasificar_iso_25010,
    construir_quality_report,
)
from modulo3_code_generator.agente_v3_solucion import (
    construir_prompt_v3,
    extraer_scenario_ids,
    extraer_markers_de_tests,
    construir_matriz_trazabilidad,
    medir_coverage,
    refinar_tests_v3,
)
from qualityai_modulo2.src.contract_b import (
    GherkinTestSuite,
    GherkinFeature,
    GherkinScenario,
    GherkinStep,
    ScenarioType,
    QualityCharacteristic as M2QualityCharacteristic,
    CoverageMatrix,
)


def init_models():
    """Inicializa los modelos y la base de conocimiento"""
    global modelo, collection
    
    if modelo is None:
        print("Cargando modelo de embeddings...")
        modelo = SentenceTransformer("all-MiniLM-L6-v2", local_files_only=True)
        print("Modelo cargado")
    
    if collection is None:
        kb_path = MODULO1_DIR / "knowledge_base_data"
        client = chromadb.PersistentClient(path=str(kb_path))
        collection = client.get_or_create_collection(
            name="katary_sgc",
            metadata={"hnsw:space": "cosine"},
        )
        
        if collection.count() == 0:
            print("Cargando base de conocimiento...")
            stories_path = MODULO1_DIR / "examples" / "knowledge_base" / "katary_stories.json"
            with open(stories_path, "r", encoding="utf-8") as f:
                stories = json.load(f)
            
            textos = [s["texto"] for s in stories]
            embeddings = modelo.encode(textos).tolist()
            collection.add(
                ids=[s["id"] for s in stories],
                embeddings=embeddings,
                documents=textos,
                metadatas=[{"dominio": s.get("dominio", "general"), "criterios": s.get("criterios", "")} for s in stories],
            )
            print(f"[OK] {collection.count()} historias indexadas")
        else:
            print(f"[OK] Base de conocimiento: {collection.count()} historias")


# ============================================================
# INICIALIZACIÓN KB M3
# ============================================================
def init_models_m3():
    """Inicializa el modelo de embeddings y KB de patrones de código (M3)"""
    global modelo_m3, collection_m3

    if modelo_m3 is None:
        try:
            modelo_m3 = SentenceTransformer("all-MiniLM-L6-v2", local_files_only=True)
        except Exception:
            print("  [M3] Modelo local no encontrado, descargando...")
            modelo_m3 = SentenceTransformer("all-MiniLM-L6-v2")

    if collection_m3 is None:
        kb_path = MODULO3_DIR / "knowledge_base_data"
        kb_path.mkdir(exist_ok=True)
        client = chromadb.PersistentClient(path=str(kb_path))
        collection_m3 = client.get_or_create_collection(
            name="katary_code_patterns",
            metadata={"hnsw:space": "cosine"},
        )
        if collection_m3.count() == 0:
            patterns_path = MODULO3_DIR / "examples" / "knowledge_base" / "katary_code_patterns.json"
            if patterns_path.exists():
                with open(patterns_path, "r", encoding="utf-8") as f:
                    patterns = json.load(f)
                textos = [
                    f"{p['domain']}. {p['code_pattern_typical']}. {p['katary_context']}"
                    for p in patterns
                ]
                embeddings = modelo_m3.encode(textos).tolist()
                collection_m3.add(
                    ids=[p["id"] for p in patterns],
                    embeddings=embeddings,
                    documents=textos,
                    metadatas=[{
                        "domain": p["domain"],
                        "quality_practices": json.dumps(p["quality_practices"], ensure_ascii=False),
                        "typical_functions": json.dumps(p["typical_functions"], ensure_ascii=False),
                        "common_smells": json.dumps(p["common_smells"], ensure_ascii=False),
                        "lessons_learned_katary": p["lessons_learned_katary"],
                    } for p in patterns],
                )


# ============================================================
# CONVERTIDOR Contract B (webapp) -> GherkinTestSuite (M2 model)
# ============================================================
def webapp_contract_b_to_gherkin_test_suite(data: dict) -> GherkinTestSuite:
    """Convierte el formato Contract B del webapp al modelo Pydantic de M2"""
    scenario_type_map = {
        "positive": ScenarioType.POSITIVE,
        "negative": ScenarioType.NEGATIVE,
        "boundary": ScenarioType.BOUNDARY,
        "edge_case": ScenarioType.EDGE_CASE,
        "error_handling": ScenarioType.ERROR_HANDLING,
    }
    qc_map = {
        "functional_suitability": M2QualityCharacteristic.FUNCTIONAL_SUITABILITY,
        "performance_efficiency": M2QualityCharacteristic.PERFORMANCE_EFFICIENCY,
        "security": M2QualityCharacteristic.SECURITY,
        "usability": M2QualityCharacteristic.USABILITY,
        "reliability": M2QualityCharacteristic.RELIABILITY,
        "compatibility": M2QualityCharacteristic.COMPATIBILITY,
        "maintainability": M2QualityCharacteristic.MAINTAINABILITY,
        "portability": M2QualityCharacteristic.PORTABILITY,
    }

    features = []
    for feat in data.get("features", []):
        scenarios = []
        for sc in feat.get("scenarios", []):
            steps = []
            for step in sc.get("steps", []):
                steps.append(GherkinStep(
                    keyword=step.get("keyword", "Given"),
                    text=step.get("text", ""),
                ))
            sc_name = sc.get("name", "Escenario")
            if len(sc_name) < 10:
                sc_name = sc_name + " (" + sc.get("acceptance_criterion_id", "AC") + ")"
            sc_type = scenario_type_map.get(sc.get("scenario_type", "positive"), ScenarioType.POSITIVE)
            qc = qc_map.get(sc.get("quality_characteristic", "functional_suitability"), M2QualityCharacteristic.FUNCTIONAL_SUITABILITY)

            scenarios.append(GherkinScenario(
                name=sc_name,
                scenario_type=sc_type,
                quality_characteristic=qc,
                tags=sc.get("tags", []),
                steps=steps if len(steps) >= 3 else steps + [steps[-1]] * (3 - len(steps)),
                acceptance_criterion_id=sc.get("acceptance_criterion_id", "AC-000"),
                user_story_id=sc.get("user_story_id", feat.get("user_story_id", "US-000")),
            ))

        feat_name = feat.get("name", "Feature sin nombre")
        if len(feat_name) < 10:
            feat_name = feat_name + " (" + feat.get("user_story_id", "US") + ")"

        features.append(GherkinFeature(
            name=feat_name,
            description=feat.get("description", ""),
            scenarios=scenarios,
            user_story_id=feat.get("user_story_id", "US-000"),
        ))

    coverage_matrix = []
    for cm in data.get("coverage_matrix", []):
        coverage_matrix.append(CoverageMatrix(
            user_story_id=cm.get("user_story_id", ""),
            criterion_id=cm.get("criterion_id", ""),
            scenario_names=cm.get("scenario_names", []),
            coverage_type=[scenario_type_map.get(t, ScenarioType.POSITIVE) for t in cm.get("coverage_type", [])],
            quality_characteristics_covered=[qc_map.get(q, M2QualityCharacteristic.FUNCTIONAL_SUITABILITY) for q in cm.get("quality_characteristics_covered", [])],
        ))

    return GherkinTestSuite(
        pipeline_run_id=data.get("pipeline_run_id", f"webapp-m2-{uuid.uuid4().hex[:8]}"),
        agent_version=data.get("agent_version", "0.3.0-v3-iso25010"),
        features=features,
        coverage_matrix=coverage_matrix,
        total_scenarios=data.get("total_scenarios", 0),
        total_positive=data.get("total_positive", 0),
        total_negative=data.get("total_negative", 0),
        total_boundary=data.get("total_boundary", 0),
        coverage_by_characteristic=data.get("coverage_by_characteristic", {}),
    )


# ============================================================
# PIPELINE M3-V3 ADAPTADO PARA WEBAPP
# ============================================================
def pipeline_m3_v3_webapp(contract_b_dict: dict, api_key: str) -> dict:
    """Ejecuta el pipeline completo M3-V3 desde el webapp: genera código, analiza, traza y mide cobertura"""
    init_models_m3()

    # Convertir Contract B del webapp a GherkinTestSuite
    contract_b = webapp_contract_b_to_gherkin_test_suite(contract_b_dict)
    client = Groq(api_key=api_key)

    todos_modulos = []
    todos_tests = []

    # FASE 1: Generación de código (V1 con prompt V3)
    for feature in contract_b.features:
        try:
            if modelo_m3 and collection_m3:
                patrones = buscar_patrones_similares(modelo_m3, collection_m3, feature, top_k=3)
            else:
                patrones = []
            system_prompt, user_message = construir_prompt_v3(feature, patrones)
            raw_response = generar_con_groq(client, system_prompt, user_message)
            modulos, tests = parsear_respuesta(raw_response, feature)

            # Post-procesar tests V3: inyectar markers y limpiar aserciones genericas
            tests = refinar_tests_v3(tests)

            todos_modulos.extend(modulos)
            todos_tests.extend(tests)
        except Exception as e:
            print(f"  Error generando código para feature {feature.user_story_id}: {e}")
            continue

    # Fallback: si Groq no devolvió código ni tests válidos, generar módulos básicos por feature
    if not todos_modulos and not todos_tests:
        print("  [FALLBACK] Groq no devolvió código válido — generando módulos básicos")
        for feature in contract_b.features:
            safe_name = re.sub(r'[^a-zA-Z0-9_]', '_', feature.name.lower().replace(' ', '_'))
            class_name = ''.join(word.title() for word in safe_name.split('_'))
            filename = f"{safe_name}.py"
            scenarios_ids = [s.acceptance_criterion_id for s in feature.scenarios if s.acceptance_criterion_id]

            # Generar métodos a partir de los escenarios
            methods_code = []
            for s in feature.scenarios:
                method_name = f"validar_{(s.acceptance_criterion_id or 'AC_000').lower().replace('-', '_')}"
                given_text = s.steps[0].text if len(s.steps) > 0 else ""
                when_text = s.steps[1].text if len(s.steps) > 1 else ""
                then_text = s.steps[2].text if len(s.steps) > 2 else ""
                is_positive = s.scenario_type == "positive"
                body = f'        """{s.name}\n        Dado {given_text}\n        Cuando {when_text}\n        Entonces {then_text}\n        """\n        return {str(is_positive).lower()}'
                methods_code.append(
                    f"    def {method_name}(self) -> bool:\n{body}\n"
                )

            class_code = (
                f'"""{feature.name} - {feature.description}"""\n\n'
                f'class {class_name}:\n'
                f'    """Implementación generada a partir de escenarios Gherkin."""\n\n'
                f'    def __init__(self):\n'
                f'        """Inicializar estado del servicio."""\n'
                f'        pass\n\n'
                + '\n'.join(methods_code)
                + '\n'
            )

            # Generar tests con markers de trazabilidad
            tests = []
            for s in feature.scenarios:
                sid = s.acceptance_criterion_id or "AC-000"
                test_name = f"test_{safe_name}_{sid.lower().replace('-', '_')}"
                method_name = f"validar_{sid.lower().replace('-', '_')}"
                tests.append(
                    f'@pytest.mark.scenario("{sid}")\n'
                    f'def {test_name}():\n'
                    f'    """{s.name}"""\n'
                    f'    servicio = {class_name}()\n'
                    f'    resultado = servicio.{method_name}()\n'
                    f'    assert resultado is not None\n'
                )
            tests_code = '\n'.join(tests) if tests else "def test_placeholder():\n    assert True\n"

            fallback_test = GeneratedTest(
                test_name=f"test_{safe_name}",
                source_code=f'"""Tests para {feature.name}"""\nimport pytest\nfrom {safe_name} import {class_name}\n\n{tests_code}',
                target_module=filename,
                scenario_ids=scenarios_ids,
            )
            fallback_module = GeneratedCodeModule(
                filename=filename,
                source_code=class_code,
                description=f"Implementación base para {feature.name}",
                user_story_id=feature.user_story_id,
            )
            todos_modulos.append(fallback_module)
            todos_tests.append(fallback_test)

    # FASE 2: Análisis estático (V2)
    import tempfile
    code_dir = None
    quality_report = None
    try:
        code_dir = volcar_codigo_a_disco(todos_modulos)
        print(f"  [V2] code_dir: {code_dir}")
        for f in code_dir.iterdir():
            print(f"  [V2]   archivo: {f.name} ({f.stat().st_size} bytes)")
        radon_data = ejecutar_radon(code_dir)
        print(f"  [V2] radon cc: {len(radon_data.get('cc', {}))} archivos, mi: {len(radon_data.get('mi', {}))} archivos")
        complexipy_data = ejecutar_complexipy(code_dir)
        print(f"  [V2] complexipy: {len(complexipy_data)} archivos")
        security_findings = ejecutar_bandit(code_dir)
        print(f"  [V2] bandit: {len(security_findings)} hallazgos")
        function_metrics = construir_function_metrics(radon_data, complexipy_data)
        print(f"  [V2] function_metrics: {len(function_metrics)} funciones")
        mi_values = [v["mi"] for v in radon_data.get("mi", {}).values()]
        maintainability_index = round(sum(mi_values) / len(mi_values), 2) if mi_values else None
        print(f"  [V2] maintainability_index: {maintainability_index}")
        iso_coverage = clasificar_iso_25010(function_metrics, security_findings, maintainability_index)
        quality_report = construir_quality_report(function_metrics, maintainability_index, security_findings, iso_coverage)
    except Exception as e:
        import traceback
        print(f"  Análisis estático (V2) omitido: {e}")
        traceback.print_exc()

    # FASE 3: Trazabilidad + Coverage (V3)
    traceability_matrix = None
    coverage_report = None
    try:
        scenarios = extraer_scenario_ids(contract_b)
        print(f"  [V3] scenarios extraidos: {len(scenarios)}")
        if scenarios:
            for sid, name in list(scenarios.items())[:5]:
                print(f"  [V3]   {sid}: {name}")
        test_markers = extraer_markers_de_tests(todos_tests)
        print(f"  [V3] test_markers: {len(test_markers)} tests")
        for tname, ids in list(test_markers.items())[:5]:
            print(f"  [V3]   {tname}: {ids}")
        traceability_matrix = construir_matriz_trazabilidad(scenarios, test_markers)
        print(f"  [V3] matriz: req_cov={traceability_matrix.requirements_coverage_pct}%, test_just={traceability_matrix.tests_justified_pct}%, cmmi={traceability_matrix.cmmi_l3_compliant}")
        if code_dir:
            coverage_report = medir_coverage(code_dir, todos_tests)
            print(f"  [V3] coverage: branch={coverage_report.branch_coverage_pct}%, line={coverage_report.line_coverage_pct}%, meets={coverage_report.meets_threshold}")
    except Exception as e:
        import traceback
        print(f"  Trazabilidad/Coverage (V3) omitido: {e}")
        traceback.print_exc()

    resultado = CodeGenerationResult(
        pipeline_run_id=f"webapp-m3-{uuid.uuid4().hex[:8]}",
        agent_version="0.3.0-v3-trazabilidad",
        source_contract_b_id=contract_b.pipeline_run_id,
        generated_code=todos_modulos,
        generated_tests=todos_tests,
        quality_report=quality_report,
        traceability_matrix=traceability_matrix,
        coverage_report=coverage_report,
        total_modules=len(todos_modulos),
        total_tests=len(todos_tests),
    )
    return json.loads(resultado.model_dump_json())


@app.route('/')
def index():
    return send_from_directory('static/home', 'index.html')

@app.route('/static/home/')
def home():
    return send_from_directory('static/home', 'index.html')

@app.route('/app.js')
def app_js():
    return send_from_directory('static/home', 'app.js')

@app.route('/static/home/app.js')
def home_app_js():
    return send_from_directory('static/home', 'app.js')

def get_groq_api_key():
    """Obtiene la API Key desde el header o variable de entorno"""
    # Primero intenta obtenerla del header
    api_key = request.headers.get('X-Groq-API-Key')
    if api_key:
        return api_key
    # Si no está en el header, usa la variable de entorno
    return GROQ_API_KEY

@app.route('/api/health', methods=['GET'])
def health():
    """Endpoint de salud"""
    return jsonify({
        'status': 'ok',
        'groq_configured': GROQ_API_KEY is not None,
        'models_loaded': modelo is not None and collection is not None,
        'kb_count': collection.count() if collection else 0
    })


@app.route('/api/upload-requirements', methods=['POST'])
def upload_requirements():
    """Sube un archivo PDF, DOCX o TXT y extrae su texto"""
    ALLOWED_EXTENSIONS = {'.pdf', '.docx', '.txt'}
    MAX_SIZE = 10 * 1024 * 1024  # 10MB

    if 'file' not in request.files:
        return jsonify({'success': False, 'error': 'No se envió ningún archivo'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'success': False, 'error': 'Nombre de archivo vacío'}), 400

    import os
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        return jsonify({'success': False, 'error': f'Formato no soportado: {ext}. Use .pdf, .docx o .txt'}), 400

    file.seek(0, os.SEEK_END)
    size = file.tell()
    file.seek(0)
    if size > MAX_SIZE:
        return jsonify({'success': False, 'error': 'El archivo excede el tamaño máximo de 10MB'}), 400

    try:
        if ext == '.txt':
            text = file.read().decode('utf-8', errors='replace')
        elif ext == '.pdf':
            from pypdf import PdfReader
            reader = PdfReader(file)
            text = '\n'.join(page.extract_text() or '' for page in reader.pages)
        elif ext == '.docx':
            from docx import Document
            doc = Document(file)
            text = '\n'.join(p.text for p in doc.paragraphs)

        text = text.strip()
        if not text:
            return jsonify({'success': False, 'error': 'No se pudo extraer texto del archivo'}), 400

        return jsonify({'success': True, 'text': text, 'filename': file.filename})
    except Exception as e:
        return jsonify({'success': False, 'error': f'Error al procesar el archivo: {str(e)}'}), 500


@app.route('/api/analyze-ambiguities', methods=['POST'])
def analyze_ambiguities():
    """Analiza ambigüedades en un requerimiento"""
    data = request.json
    requirement_text = data.get('requirement_text', '')
    
    if not requirement_text:
        return jsonify({'error': 'requirement_text es requerido'}), 400
    
    ambiguities = detector.analyze(requirement_text)
    
    result = []
    for amb in ambiguities:
        result.append({
            'word': amb.word,
            'category': amb.category,
            'ieee_830_violation': amb.ieee_830_violation,
            'iso_25010_category': amb.iso_25010_category,
            'suggestion': amb.suggestion,
            'context': amb.context,
            'severity': amb.severity
        })
    
    return jsonify({
        'ambiguities': result,
        'total': len(result),
        'severity_count': {
            'alta': sum(1 for a in ambiguities if a.severity == 'alta'),
            'media': sum(1 for a in ambiguities if a.severity == 'media'),
            'baja': sum(1 for a in ambiguities if a.severity == 'baja')
        }
    })


@app.route('/api/search-similar-stories', methods=['POST'])
def search_similar_stories():
    """Busca historias similares en la base de conocimiento"""
    init_models()
    
    data = request.json
    requirement_text = data.get('requirement_text', '')
    n_results = data.get('n_results', 3)
    
    if not requirement_text:
        return jsonify({'error': 'requirement_text es requerido'}), 400
    
    query_emb = modelo.encode([requirement_text]).tolist()
    resultados = collection.query(
        query_embeddings=query_emb,
        n_results=n_results,
        include=["documents", "metadatas", "distances"],
    )
    
    historias = []
    for i in range(len(resultados["ids"][0])):
        sim = 1 - resultados["distances"][0][i]
        historias.append({
            "id": resultados["ids"][0][i],
            "texto": resultados["documents"][0][i],
            "criterios": resultados["metadatas"][0][i].get("criterios", ""),
            "dominio": resultados["metadatas"][0][i].get("dominio", ""),
            "similitud": round(sim, 3)
        })
    
    return jsonify({'stories': historias})


@app.route('/api/refine-requirements', methods=['POST'])
def refine_requirements():
    """Refina requerimientos usando el pipeline completo"""
    if MOCK_GROQ:
        return _mock_response('refine')
    # Obtener API Key del request
    api_key = get_groq_api_key()
    if not api_key:
        return jsonify({'error': 'API Key de Groq no configurada'}), 401
    
    # Crear cliente Groq con la API Key del request
    client = Groq(api_key=api_key)
    
    init_models()
    
    data = request.json
    requirement_text = data.get('requirement_text', '')
    version = data.get('version', 'v4')  # v1, v2, v3, v4
    analyst_resolutions = data.get('analyst_resolutions', [])
    project_id = data.get('project_id')  # ID del proyecto seleccionado
    
    if not requirement_text:
        return jsonify({'error': 'requirement_text es requerido'}), 400
    
    try:
        # 1. Detectar ambigüedades
        ambiguities = detector.analyze(requirement_text)
        
        # 2. Buscar historias similares (RAG)
        query_emb = modelo.encode([requirement_text]).tolist()
        resultados = collection.query(
            query_embeddings=query_emb,
            n_results=3,
            include=["documents", "metadatas", "distances"],
        )
        
        historias = []
        for i in range(len(resultados["ids"][0])):
            sim = 1 - resultados["distances"][0][i]
            historias.append({
                "id": resultados["ids"][0][i],
                "texto": resultados["documents"][0][i],
                "criterios": resultados["metadatas"][0][i].get("criterios", ""),
                "dominio": resultados["metadatas"][0][i].get("dominio", ""),
                "similitud": sim,
            })
        
        # 3. Construir contexto RAG
        contexto_kb = "## HISTORIAS DE REFERENCIA DEL SGC DE KATARY\n"
        contexto_kb += "Usa estas historias como modelo de calidad y profundidad:\n\n"
        for i, h in enumerate(historias, 1):
            contexto_kb += f"### Referencia {i} [{h['id']}] (similitud: {h['similitud']:.2f})\n"
            contexto_kb += f"**Historia:** {h['texto']}\n"
            contexto_kb += f"**Criterios:** {h['criterios']}\n\n"
        
        # 4. Construir sección de ambigüedades según versión
        full_context = contexto_kb
        requerimiento_enriquecido = requirement_text
        
        if version == 'v4' and analyst_resolutions:
            # Human-in-the-Loop: usar resoluciones del analista
            seccion_ambiguedades = detector.build_resolved_prompt_section(analyst_resolutions)
            if seccion_ambiguedades:
                full_context += "\n" + seccion_ambiguedades
            
            # Enriquecer requerimiento
            aclaraciones = []
            for res in analyst_resolutions:
                if res.get('status') == 'resolved':
                    aclaraciones.append(f"- \"{res['word']}\": {res['analyst_resolution']}")
            
            if aclaraciones:
                requerimiento_enriquecido = requirement_text + "\n\nACLARACIONES DEL ANALISTA:\n"
                requerimiento_enriquecido += "\n".join(aclaraciones)
        
        elif version == 'v3' and ambiguities:
            # Detector automático
            seccion_ambiguedades = detector.build_prompt_section(ambiguities)
            if seccion_ambiguedades:
                full_context += "\n" + seccion_ambiguedades
        
        # 5. Construir prompt
        system_prompt = f"""Eres un Analista de Requerimientos Senior de Katary Software (CMMI-DEV L3, 19 años).
Transforma requerimientos ambiguos en historias de usuario estructuradas (IEEE 830 / ISO 25010).

{full_context}

## FORMATO JSON OBLIGATORIO
Responde SOLO con JSON válido, sin texto ni markdown. Estructura:
{{"project_context": "resumen", "user_stories": [
  {{"id": "US-001", "title": "min 10 chars", "story_type": "functional|non_functional|technical",
    "priority": "critical|high|medium|low", "as_a": "rol", "i_want": "acción", "so_that": "beneficio",
    "acceptance_criteria": [
      {{"id": "AC-001", "description": "min 10 chars", "given": "precondición concreta",
        "when": "acción específica", "then": "resultado verificable con tiempos",
        "test_data_examples": [{{"campo": "val", "expected": "resultado"}}],
        "is_negative_case": false, "boundary_values": ["min", "max"]}}],
    "business_rules": [], "dependencies": [], "ui_elements": [], "api_endpoints": [],
    "ambiguities_resolved": [
      {{"original_text": "texto ambiguo", "issue": "por qué", "resolution": "valores concretos", "assumption_made": {"false" if version == 'v4' else "true"}}}]
  }}]}}

## REGLAS
1. IDs: US-001, AC-001 (3 dígitos). ACs secuenciales globales
2. Cada criterio: given/when/then con datos concretos, min 2 test_data_examples
3. Por cada caso positivo, incluir 1 criterio negativo (is_negative_case: true)
4. {"Resolver ambigüedades usando las DECISIONES DEL ANALISTA (assumption_made: false)" if version == 'v4' else "Detectar y resolver ambigüedades con valores concretos en ambiguities_resolved"}
5. IMPORTANTE: Genera TODAS las historias necesarias para cubrir completamente el requerimiento. Si el requerimiento menciona múltiples funcionalidades (ej: notificaciones, login, registro), crea una historia separada para CADA una
6. Responde SOLO JSON"""

        user_message = f"""Analiza el siguiente requerimiento y transfórmalo en historias
de usuario con el nivel de calidad de las referencias del SGC de Katary.

REQUERIMIENTO:
{requerimiento_enriquecido}"""

        # 6. Llamar a Groq
        respuesta = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            temperature=0.3,
            max_tokens=4000,
        )
        
        respuesta_raw = respuesta.choices[0].message.content
        
        # 7. Parsear JSON
        text = respuesta_raw.strip()
        if "```json" in text:
            text = text.split("```json", 1)[1]
            text = text.rsplit("```", 1)[0]
        elif "```" in text:
            text = text.split("```", 1)[1]
            text = text.rsplit("```", 1)[0]
        
        start = text.find("{")
        end = text.rfind("}") + 1
        datos = json.loads(text[start:end])
        
        # 8. Validar con Contract A
        user_stories = []
        ac_counter = 0
        for story_data in datos.get("user_stories", []):
            criteria = []
            for ac_data in story_data.get("acceptance_criteria", []):
                ac_counter += 1
                criteria.append(AcceptanceCriterion(
                    id=ac_data.get("id", f"AC-{ac_counter:03d}"),
                    description=ac_data.get("description", ""),
                    given=ac_data.get("given", ""),
                    when=ac_data.get("when", ""),
                    then=ac_data.get("then", ""),
                    test_data_examples=ac_data.get("test_data_examples", []),
                    is_negative_case=ac_data.get("is_negative_case", False),
                    boundary_values=ac_data.get("boundary_values", []),
                ))
            
            ambiguities_resolved = []
            for amb_data in story_data.get("ambiguities_resolved", []):
                ambiguities_resolved.append(AmbiguityResolution(
                    original_text=amb_data.get("original_text", ""),
                    issue=amb_data.get("issue", ""),
                    resolution=amb_data.get("resolution", ""),
                    assumption_made=amb_data.get("assumption_made", False),
                ))
            
            try:
                story_type = StoryType(story_data.get("story_type", "functional"))
            except ValueError:
                story_type = StoryType.FUNCTIONAL
            try:
                priority = Priority(story_data.get("priority", "medium"))
            except ValueError:
                priority = Priority.MEDIUM
            
            user_stories.append(UserStory(
                id=story_data.get("id", f"US-{len(user_stories) + 1:03d}"),
                title=story_data.get("title", "Sin título"),
                story_type=story_type,
                priority=priority,
                as_a=story_data.get("as_a", ""),
                i_want=story_data.get("i_want", ""),
                so_that=story_data.get("so_that", ""),
                acceptance_criteria=criteria,
                business_rules=story_data.get("business_rules", []),
                dependencies=story_data.get("dependencies", []),
                ui_elements=story_data.get("ui_elements", []),
                api_endpoints=story_data.get("api_endpoints", []),
                ambiguities_resolved=ambiguities_resolved,
            ))
        
        total_ambiguities = sum(len(s.ambiguities_resolved) for s in user_stories)
        total_assumptions = sum(
            sum(1 for a in s.ambiguities_resolved if a.assumption_made)
            for s in user_stories
        )
        
        resultado = RefinedRequirements(
            pipeline_run_id=f"webapp-{uuid.uuid4().hex[:8]}",
            agent_version=version,
            original_requirements_text=requirement_text,
            project_context=datos.get("project_context", ""),
            user_stories=user_stories,
            total_ambiguities_found=total_ambiguities,
            total_assumptions_made=total_assumptions,
        )
        
        # 9. Guardar resultado
        output_dir = MODULO1_DIR / "output"
        output_dir.mkdir(exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_file = output_dir / f"webapp_{version}_{timestamp}.json"
        
        # Agregar project_id al resultado
        contract_a_data = resultado.model_dump(mode="json")
        if project_id:
            contract_a_data['project_id'] = project_id
        
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(contract_a_data, f, ensure_ascii=False, indent=2, default=str)
        
        return jsonify({
            'success': True,
            'result': resultado.model_dump(mode="json"),
            'output_file': str(output_file),
            'tokens_used': respuesta.usage.total_tokens,
            'timestamp': timestamp  # Retornar timestamp para vincular con escenarios
        })
    
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


# ============================================================
# MÓDULO 2: TEST ARCHITECT - Endpoint para generar escenarios
# ============================================================

@app.route('/api/m2/generate-scenarios', methods=['POST'])
def generate_scenarios_m2():
    """Genera escenarios Gherkin desde Contract A (salida del módulo 1)"""
    if MOCK_GROQ:
        return _mock_response('scenarios')
    # Obtener API Key del request
    api_key = get_groq_api_key()
    if not api_key:
        return jsonify({'error': 'API Key de Groq no configurada'}), 401
    
    # Crear cliente Groq con la API Key del request
    client = Groq(api_key=api_key)
    
    try:
        datos = request.json
        contract_a_data = datos.get('contract_a')
        version = datos.get('version', 'v1')
        contract_a_timestamp = datos.get('contract_a_timestamp')  # Timestamp del Contract A
        
        # Validar Contract A
        contract_a = RefinedRequirements(**contract_a_data)
        
        # Generar con V3 (incluye heurísticas EP/BVA/DT + clasificación ISO 25010)
        test_suite = generar_escenarios_v3_completo(contract_a, client)
        
        # Agregar timestamp del Contract A al Contract B para vinculación
        test_suite['contract_a_timestamp'] = contract_a_timestamp
        
        # Heredar project_id del Contract A si existe
        if 'project_id' in contract_a_data:
            test_suite['project_id'] = contract_a_data['project_id']
        
        # Guardar resultado
        output_dir = MODULO1_DIR.parent / "qualityai_modulo2" / "output"
        output_dir.mkdir(exist_ok=True, parents=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        # Usar el timestamp del Contract A en el nombre si está disponible
        if contract_a_timestamp:
            output_file = output_dir / f"contract_b_{version}_{contract_a_timestamp}.json"
        else:
            output_file = output_dir / f"contract_b_{version}_{timestamp}.json"
        
        # Serializar
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(test_suite, f, ensure_ascii=False, indent=2, default=str)
        
        return jsonify({
            'success': True,
            'contract_b': test_suite,
            'output_file': str(output_file),
            'filename': output_file.name,  # Nombre del archivo para guardarlo después
            'version': version
        })
    
    except Exception as e:
        import traceback
        return jsonify({
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 500


def generar_escenarios_v3_completo(contract_a: RefinedRequirements, groq_client):
    """Genera escenarios Gherkin usando V3: heurísticas EP/BVA/DT + clasificación ISO 25010"""
    features = []
    coverage_matrix = []
    
    for story in contract_a.user_stories:
        scenarios = []
        
        for ac in story.acceptance_criteria:
            # Buscar patrones similares en KB (RAG)
            patrones_similares = []
            if modelo and collection:
                try:
                    ac_embedding = modelo.encode(ac.description)
                    resultados = collection.query(
                        query_embeddings=[ac_embedding.tolist()],
                        n_results=3
                    )
                    for i in range(len(resultados["ids"][0])):
                        similitud = 1 - resultados["distances"][0][i]
                        patrones_similares.append({
                            "id": resultados["ids"][0][i],
                            "domain": resultados["metadatas"][0][i].get("domain", "general"),
                            "techniques": resultados["metadatas"][0][i].get("techniques_used", ""),
                            "similitud": similitud
                        })
                except Exception as e:
                    print(f"Error en RAG: {e}")
            
            # Construir contexto RAG
            contexto_kb = "## PATRONES DE TESTING SIMILARES\n"
            for i, p in enumerate(patrones_similares, 1):
                contexto_kb += f"Patrón {i}: {p['domain']} (similitud: {p['similitud']:.2f})\n"
                contexto_kb += f"Técnicas: {p['techniques']}\n\n"
            
            # Prompt V3 completo con heurísticas + ISO 25010
            system_prompt = (
                "Eres un Test Architect que convierte criterios de aceptación en\n"
                "escenarios Gherkin (BDD) aplicando técnicas de caja negra disciplinadas\n"
                "y clasificándolos según ISO/IEC 25010.\n\n"
                f"{contexto_kb}\n"
                "## INSTRUCCIONES DE TESTING DISCIPLINADO (OBLIGATORIAS)\n"
                "\n"
                "Para el criterio de aceptación recibido, aplica las siguientes técnicas:\n"
                "\n"
                "1. EQUIVALENCE PARTITIONING (EP):\n"
                "   - Identifica las clases equivalentes válidas e inválidas del AC.\n"
                "   - Genera UN escenario por cada clase identificada.\n"
                "\n"
                "2. BOUNDARY VALUE ANALYSIS (BVA):\n"
                "   - Si el AC menciona un rango numérico, genera escenarios con:\n"
                "     límite inferior, justo debajo, límite superior, justo encima.\n"
                "\n"
                "3. DECISION TABLES (DT):\n"
                "   - Si el AC tiene múltiples condiciones combinadas, genera UN\n"
                "     escenario por cada combinación relevante.\n"
                "\n"
                "## CLASIFICACIÓN ISO/IEC 25010 (OBLIGATORIA)\n"
                "\n"
                "Por cada escenario, asigna `quality_characteristic` con UNA de estas:\n"
                "\n"
                "   - functional_suitability  (lógica de negocio, validaciones, reglas)\n"
                "   - performance_efficiency  (tiempos de respuesta, carga concurrente)\n"
                "   - security                (autenticación, autorización, bloqueo, cifrado)\n"
                "   - usability               (mensajes claros, accesibilidad, navegación)\n"
                "   - reliability             (recuperación de fallas, manejo de errores)\n"
                "   - compatibility           (interoperabilidad, formatos, navegadores)\n"
                "   - maintainability         (rara vez aplica a BDD funcionales)\n"
                "   - portability             (rara vez aplica a BDD funcionales)\n"
                "\n"
                "REGLAS PARA DECIDIR:\n"
                "   - Si prueba validación de entrada o regla de negocio: functional_suitability\n"
                "   - Si prueba bloqueo tras N intentos o control de acceso: security\n"
                "   - Si prueba tiempo de respuesta o concurrencia: performance_efficiency\n"
                "   - Si prueba mensaje de error claro o accesibilidad: usability\n"
                "\n"
                "## FORMATO DE RESPUESTA OBLIGATORIO\n"
                "Devuelve ÚNICAMENTE un JSON válido con LISTA de escenarios:\n"
                "{\n"
                '  "scenarios": [\n'
                "    {\n"
                '      "name": "nombre descriptivo del escenario",\n'
                '      "scenario_type": "positive" | "negative" | "boundary",\n'
                '      "quality_characteristic": "functional_suitability" | "security" | ...,\n'
                '      "heuristic_applied": "EP" | "BVA" | "DT" | "general",\n'
                '      "steps": [\n'
                '        {"keyword": "Given", "text": "..."},\n'
                '        {"keyword": "When", "text": "..."},\n'
                '        {"keyword": "Then", "text": "..."}\n'
                "      ]\n"
                "    }\n"
                "  ]\n"
                "}\n"
            )
            
            user_prompt = (
                f"Historia: {story.title}\n"
                f"Como {story.as_a}, quiero {story.i_want}, para {story.so_that}.\n\n"
                f"Criterio {ac.id}:\n"
                f"Descripción: {ac.description}\n"
                f"Given: {ac.given}\n"
                f"When: {ac.when}\n"
                f"Then: {ac.then}\n"
                f"Caso negativo: {'Sí' if ac.is_negative_case else 'No'}\n"
                f"Test data examples: {ac.test_data_examples}\n"
                f"Boundary values: {ac.boundary_values}\n\n"
                f"Genera la LISTA de escenarios Gherkin aplicando EP, BVA y/o DT,\n"
                f"y CLASIFICA cada uno con su característica ISO/IEC 25010."
            )
            
            # Llamar a Groq
            response = groq_client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.0,
                seed=42,
                max_tokens=2500,  # Aumentado para V3 (múltiples escenarios)
            )
            
            raw_text = response.choices[0].message.content
            print(f"\n{'='*60}")
            print(f"Respuesta del LLM para AC {ac.id}:")
            print(f"{'='*60}")
            print(raw_text[:500] + "..." if len(raw_text) > 500 else raw_text)
            print(f"{'='*60}\n")
            
            # Parsear JSON
            text = raw_text.strip()
            if "```json" in text:
                text = text.split("```json", 1)[1].rsplit("```", 1)[0]
            elif "```" in text:
                text = text.split("```", 1)[1].rsplit("```", 1)[0]
            
            start = text.find("{")
            end = text.rfind("}") + 1
            if start == -1 or end == 0:
                print(f"[ERROR] No se encontró JSON válido en la respuesta")
                print(f"Texto procesado: {text[:200]}")
                continue  # Saltar este AC si no hay JSON
            
            json_str = text[start:end]
            try:
                data = json.loads(json_str)
            except json.JSONDecodeError as e:
                print(f"[ERROR] Error al parsear JSON: {e}")
                print(f"JSON string: {json_str[:200]}")
                continue  # Saltar este AC si el JSON es inválido
            
            # V3 retorna LISTA de escenarios
            escenarios_generados = data.get("scenarios", [data])  # Fallback si retorna un solo escenario
            
            scenario_names = []
            coverage_types = []
            quality_chars = []
            
            for esc_data in escenarios_generados:
                # Crear escenario con clasificación ISO 25010
                scenario = {
                    "name": esc_data["name"],
                    "scenario_type": esc_data.get("scenario_type", "positive"),
                    "quality_characteristic": esc_data.get("quality_characteristic", "functional_suitability"),
                    "heuristic_applied": esc_data.get("heuristic_applied", "general"),
                    "tags": esc_data.get("tags", []),
                    "steps": esc_data["steps"],
                    "acceptance_criterion_id": ac.id,
                    "user_story_id": story.id
                }
                scenarios.append(scenario)
                
                scenario_names.append(scenario["name"])
                coverage_types.append(scenario["scenario_type"])
                quality_chars.append(scenario["quality_characteristic"])
            
            # Agregar a cobertura (una entrada por AC con todos sus escenarios)
            coverage_matrix.append({
                "user_story_id": story.id,
                "criterion_id": ac.id,
                "scenario_names": scenario_names,
                "coverage_type": coverage_types,
                "quality_characteristics_covered": quality_chars
            })
        
        # Crear feature
        feature = {
            "name": story.title,
            "description": f"Como {story.as_a}, quiero {story.i_want}, para {story.so_that}",
            "scenarios": scenarios,
            "user_story_id": story.id
        }
        features.append(feature)
    
    # Construir test suite
    all_scenarios = [s for f in features for s in f["scenarios"]]
    total_positive = sum(1 for s in all_scenarios if s["scenario_type"] == "positive")
    total_negative = sum(1 for s in all_scenarios if s["scenario_type"] == "negative")
    total_boundary = sum(1 for s in all_scenarios if s["scenario_type"] == "boundary")
    
    # Calcular cobertura por característica
    coverage_by_characteristic = {
        "functional_suitability": 0,
        "performance_efficiency": 0,
        "security": 0,
        "usability": 0,
        "reliability": 0,
        "compatibility": 0,
        "maintainability": 0,
        "portability": 0
    }
    for s in all_scenarios:
        qc = s.get("quality_characteristic", "functional_suitability")
        coverage_by_characteristic[qc] = coverage_by_characteristic.get(qc, 0) + 1
    
    test_suite = {
        "pipeline_run_id": f"webapp-m2-{uuid.uuid4().hex[:8]}",
        "agent_version": "0.3.0-v3-iso25010",
        "features": features,
        "coverage_matrix": coverage_matrix,
        "total_scenarios": len(all_scenarios),
        "total_positive": total_positive,
        "total_negative": total_negative,
        "total_boundary": total_boundary,
        "coverage_by_characteristic": coverage_by_characteristic
    }
    
    return test_suite


# ============================================================
# MÓDULO 3: CODE GENERATOR - Endpoints
# ============================================================

@app.route('/api/m3/generate-code', methods=['POST'])
def generate_code_m3():
    """Genera código Python y tests desde Contract B (M3 pipeline V3 completo)"""
    if MOCK_GROQ:
        return _mock_response('code')
    api_key = get_groq_api_key()
    if not api_key:
        return jsonify({'error': 'API Key de Groq no configurada'}), 401

    try:
        datos = request.json
        contract_b_data = datos.get('contract_b')

        if not contract_b_data:
            return jsonify({'error': 'contract_b es requerido'}), 400

        resultado = pipeline_m3_v3_webapp(contract_b_data, api_key)

        # Guardar Contract C
        output_dir = MODULO3_DIR / "output"
        output_dir.mkdir(exist_ok=True, parents=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_file = output_dir / f"contract_c_v3_{timestamp}.json"
        output_file.write_text(json.dumps(resultado, ensure_ascii=False, indent=2, default=str), encoding="utf-8")

        # Guardar también referencia al Contract B origen
        resultado['source_contract_b_filename'] = datos.get('contract_b_filename')

        return jsonify({
            'success': True,
            'contract_c': resultado,
            'output_file': str(output_file),
            'filename': output_file.name,
            'pipeline_run_id': resultado.get('pipeline_run_id'),
        })

    except Exception as e:
        import traceback
        return jsonify({
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 500


@app.route('/api/m3/review-code', methods=['POST'])
def review_contract_c():
    """Actualiza el estado de revisión del Contract C (HITL desarrollador senior)"""
    try:
        datos = request.json
        review_data = datos.get('review')
        contract_c_filename = datos.get('filename')

        if not contract_c_filename:
            return jsonify({'error': 'filename del Contract C es requerido'}), 400

        output_dir = MODULO3_DIR / "output"
        file_path = output_dir / contract_c_filename

        if not file_path.exists():
            return jsonify({'error': 'Contract C no encontrado'}), 404

        contract_c = json.loads(file_path.read_text(encoding="utf-8"))

        # Actualizar review metadata
        if 'review_status' in review_data:
            contract_c.setdefault('review', {})
            contract_c['review']['review_status'] = review_data['review_status']
        if 'approved_by' in review_data:
            contract_c['review']['approved_by'] = review_data['approved_by']
        if 'reviewer_feedback' in review_data:
            contract_c['review']['reviewer_feedback'] = review_data['reviewer_feedback']
        if 'approved_at' in review_data:
            contract_c['review']['approved_at'] = review_data['approved_at']
        if 'change_history' in review_data:
            contract_c['review']['change_history'] = contract_c['review'].get('change_history', []) + review_data['change_history']

        file_path.write_text(json.dumps(contract_c, ensure_ascii=False, indent=2, default=str), encoding="utf-8")

        return jsonify({
            'success': True,
            'message': 'Contract C actualizado correctamente',
            'review_status': contract_c.get('review', {}).get('review_status'),
        })

    except Exception as e:
        import traceback
        return jsonify({
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 500


@app.route('/api/history', methods=['GET'])
def get_history():
    """Obtiene el historial de archivos generados vinculando historias con sus escenarios"""
    try:
        # Obtener project_id del query parameter
        project_id = request.args.get('project_id')
        # Primero cargar todos los escenarios indexados por timestamp
        scenarios_by_timestamp = {}
        output_dir_m2 = MODULO2_DIR / "output"
        if output_dir_m2.exists():
            for file in output_dir_m2.glob("contract_b_v*.json"):
                # Formato: contract_b_v3_20260515_132059.json
                parts = file.stem.split('_')
                if len(parts) >= 4:
                    version = parts[2]  # v3
                    date_str = parts[3] if len(parts) > 3 else ""
                    time_str = parts[4] if len(parts) > 4 else ""
                    timestamp_key = f"{date_str}_{time_str}"
                    
                    try:
                        if date_str and time_str:
                            dt = datetime.strptime(timestamp_key, "%Y%m%d_%H%M%S")
                            formatted_date = dt.strftime("%d/%m/%Y %H:%M:%S")
                        else:
                            formatted_date = "Fecha desconocida"
                    except:
                        formatted_date = f"{date_str} {time_str}"
                    
                    # Verificar si tiene firma del cliente (client_approval)
                    is_signed = False
                    try:
                        with open(file, 'r', encoding='utf-8') as f:
                            contract_b_data = json.load(f)
                            is_signed = 'client_approval' in contract_b_data and contract_b_data['client_approval'] is not None
                    except:
                        pass
                    
                    scenarios_by_timestamp[timestamp_key] = {
                        'filename': file.name,
                        'version': version,
                        'date': formatted_date,
                        'timestamp': timestamp_key,
                        'size': file.stat().st_size,
                        'type': 'test_scenarios',
                        'is_signed': is_signed
                    }
        
        # Construir lookup de M3 por timestamp para vincular con historias
        m3_by_timestamp = {}
        output_dir_m3 = MODULO3_DIR / "output"
        if output_dir_m3.exists():
            for file in sorted(output_dir_m3.glob("contract_c_v3_*.json"), reverse=True):
                parts = file.stem.split('_')
                if len(parts) >= 5:
                    date_str = parts[3]
                    time_str = parts[4]
                    ts = f"{date_str}_{time_str}"
                    try:
                        if date_str and time_str:
                            dt2 = datetime.strptime(ts, "%Y%m%d_%H%M%S")
                            formatted = dt2.strftime("%d/%m/%Y %H:%M:%S")
                        else:
                            formatted = "Fecha desconocida"
                    except:
                        formatted = f"{date_str} {time_str}"
                    review_status = "pending_review"
                    try:
                        with open(file, 'r', encoding='utf-8') as f:
                            cc_data = json.load(f)
                            review_status = cc_data.get('review', {}).get('review_status', 'pending_review')
                    except:
                        pass
                    m3_by_timestamp[ts] = {
                        'filename': file.name,
                        'date': formatted,
                        'timestamp': ts,
                        'size': file.stat().st_size,
                        'type': 'generated_code',
                        'review_status': review_status,
                    }

        # Ahora cargar historias y vincular con escenarios
        history_list = []
        output_dir_m1 = MODULO1_DIR / "output"
        if output_dir_m1.exists():
            for file in sorted(output_dir_m1.glob("webapp_v*.json"), reverse=True):
                # Extraer información del nombre del archivo
                # Formato: webapp_v4_20260528_143624.json
                parts = file.stem.split('_')
                if len(parts) >= 3:
                    version = parts[1]  # v4
                    date_str = parts[2] if len(parts) > 2 else ""
                    time_str = parts[3] if len(parts) > 3 else ""
                    timestamp_key = f"{date_str}_{time_str}"
                    
                    # Formatear fecha y hora
                    try:
                        if date_str and time_str:
                            dt = datetime.strptime(timestamp_key, "%Y%m%d_%H%M%S")
                            formatted_date = dt.strftime("%d/%m/%Y %H:%M:%S")
                        else:
                            formatted_date = "Fecha desconocida"
                    except:
                        formatted_date = f"{date_str} {time_str}"
                    
                    # Buscar si tiene escenarios asociados
                    has_scenarios = timestamp_key in scenarios_by_timestamp
                    scenarios_info = scenarios_by_timestamp.get(timestamp_key) if has_scenarios else None
                    
                    # Leer el archivo para obtener el requerimiento original del usuario
                    project_name = None
                    file_project_id = None
                    try:
                        with open(file, 'r', encoding='utf-8') as f:
                            contract_a_data = json.load(f)
                            file_project_id = contract_a_data.get('project_id')
                            # Usar el requerimiento original que escribió el usuario
                            project_name = contract_a_data.get('original_requirements_text') or contract_a_data.get('project_name')
                            # Si el nombre es muy largo, truncarlo a 50 caracteres
                            if project_name and len(project_name) > 50:
                                project_name = project_name[:50] + '...'
                    except:
                        pass
                    
                    # Filtrar por project_id si se especificó
                    if project_id and file_project_id != project_id:
                        continue
                    
                    history_list.append({
                        'filename': file.name,
                        'version': version,
                        'date': formatted_date,
                        'timestamp': timestamp_key,
                        'size': file.stat().st_size,
                        'type': 'user_stories',
                        'has_scenarios': has_scenarios,
                        'scenarios': scenarios_info,
                        'has_code': timestamp_key in m3_by_timestamp,
                        'code': m3_by_timestamp.get(timestamp_key),
                        'project_name': project_name
                    })
        
        # Agregar Contract C (M3) al historial
        m3_history = []
        output_dir_m3 = MODULO3_DIR / "output"
        if output_dir_m3.exists():
            for file in sorted(output_dir_m3.glob("contract_c_v3_*.json"), reverse=True):
                parts = file.stem.split('_')
                if len(parts) >= 5:
                    date_str = parts[3] if len(parts) > 3 else ""
                    time_str = parts[4] if len(parts) > 4 else ""
                    try:
                        if date_str and time_str:
                            dt = datetime.strptime(f"{date_str}_{time_str}", "%Y%m%d_%H%M%S")
                            formatted_date = dt.strftime("%d/%m/%Y %H:%M:%S")
                        else:
                            formatted_date = "Fecha desconocida"
                    except:
                        formatted_date = f"{date_str} {time_str}"

                    # Verificar estado de revisión
                    review_status = "pending_review"
                    try:
                        with open(file, 'r', encoding='utf-8') as f:
                            cc_data = json.load(f)
                            review_status = cc_data.get('review', {}).get('review_status', 'pending_review')
                    except:
                        pass

                    m3_history.append({
                        'filename': file.name,
                        'date': formatted_date,
                        'timestamp': f"{date_str}_{time_str}",
                        'size': file.stat().st_size,
                        'type': 'generated_code',
                        'review_status': review_status,
                    })
        
        # Contar escenarios totales
        total_scenarios = len(scenarios_by_timestamp)
        
        return jsonify({
            'success': True,
            'history': history_list,
            'm3_history': m3_history,
            'total_stories': len(history_list),
            'total_scenarios': total_scenarios
        })
    
    except Exception as e:
        import traceback
        return jsonify({
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 500


@app.route('/api/history/<module>/<filename>', methods=['GET'])
def get_history_file(module, filename):
    """Obtiene el contenido de un archivo específico del historial"""
    try:
        if module == 'modulo1':
            file_path = MODULO1_DIR / "output" / filename
        elif module == 'modulo2':
            file_path = MODULO2_DIR / "output" / filename
        elif module == 'modulo3':
            file_path = MODULO3_DIR / "output" / filename
        else:
            return jsonify({'error': 'Módulo inválido'}), 400
        
        if not file_path.exists():
            return jsonify({'error': 'Archivo no encontrado'}), 404
        
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        return jsonify({
            'success': True,
            'filename': filename,
            'module': module,
            'data': data
        })
    
    except Exception as e:
        import traceback
        return jsonify({
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 500


@app.route('/api/history/modulo2/<filename>/update', methods=['POST'])
def update_contract_b(filename):
    """Actualiza un archivo Contract B existente (por ejemplo, después de firmar)"""
    try:
        datos = request.json
        updated_contract_b = datos.get('contract_b')
        
        if not updated_contract_b:
            return jsonify({'error': 'No se proporcionó el Contract B actualizado'}), 400
        
        # Ruta del archivo
        output_dir = MODULO2_DIR / "output"
        file_path = output_dir / filename
        
        if not file_path.exists():
            return jsonify({'error': 'Archivo no encontrado'}), 404
        
        # Guardar el archivo actualizado
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(updated_contract_b, f, ensure_ascii=False, indent=2, default=str)
        
        return jsonify({
            'success': True,
            'message': 'Contract B actualizado correctamente'
        })
    
    except Exception as e:
        import traceback
        return jsonify({
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 500


@app.route('/api/history/delete/<filename>', methods=['DELETE'])
def delete_history_file(filename):
    """Elimina un archivo de historia y sus escenarios asociados"""
    try:
        # Ruta del archivo de historias
        output_dir_m1 = MODULO1_DIR / "output"
        file_path_m1 = output_dir_m1 / filename
        
        print(f"[TRACE] Intentando eliminar: {file_path_m1}")
        print(f"[TRACE] Directorio existe: {output_dir_m1.exists()}")
        print(f"📄 Archivo existe: {file_path_m1.exists()}")
        
        if not file_path_m1.exists():
            return jsonify({
                'error': 'Archivo no encontrado',
                'path': str(file_path_m1),
                'dir_exists': output_dir_m1.exists()
            }), 404
        
        # Extraer timestamp del nombre del archivo
        # Formato: webapp_v4_20260529_162722.json
        parts = file_path_m1.stem.split('_')
        if len(parts) >= 4:
            date_str = parts[2] if len(parts) > 2 else ""
            time_str = parts[3] if len(parts) > 3 else ""
            timestamp_key = f"{date_str}_{time_str}"
            
            # Buscar y eliminar el archivo de escenarios asociado
            output_dir_m2 = MODULO2_DIR / "output"
            if output_dir_m2.exists():
                for scenario_file in output_dir_m2.glob(f"contract_b_*_{timestamp_key}.json"):
                    scenario_file.unlink()
                    print(f"[OK] Escenarios eliminados: {scenario_file.name}")
        
        # Eliminar el archivo de historias
        file_path_m1.unlink()
        print(f"[OK] Historia eliminada: {filename}")
        
        return jsonify({
            'success': True,
            'message': 'Archivo eliminado correctamente'
        })
    
    except Exception as e:
        import traceback
        return jsonify({
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 500


# ============================================================
# GESTIÓN DE PROYECTOS
# ============================================================

def load_projects_db():
    """Carga la base de datos de proyectos desde JSON"""
    if not PROJECTS_DB_PATH.exists():
        PROJECTS_DB_PATH.parent.mkdir(parents=True, exist_ok=True)
        save_projects_db([])
        return []
    
    with open(PROJECTS_DB_PATH, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_projects_db(projects):
    """Guarda la base de datos de proyectos en JSON"""
    PROJECTS_DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(PROJECTS_DB_PATH, 'w', encoding='utf-8') as f:
        json.dump(projects, f, ensure_ascii=False, indent=2, default=str)

def count_project_requirements(project_id):
    """Cuenta los requerimientos de un proyecto"""
    count = 0
    
    # Contar Contract A (archivos webapp_v*.json)
    modulo1_output = MODULO1_DIR / "output"
    if modulo1_output.exists():
        for file in modulo1_output.glob("webapp_v*.json"):
            try:
                with open(file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    if data.get('project_id') == project_id:
                        count += 1
            except:
                pass
    
    return count

@app.route('/api/projects', methods=['GET'])
def get_projects():
    """Obtiene todos los proyectos"""
    try:
        projects = load_projects_db()
        
        # Agregar conteo de requerimientos a cada proyecto
        for project in projects:
            project['requirements_count'] = count_project_requirements(project['id'])
        
        return jsonify({
            'success': True,
            'projects': projects
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/projects', methods=['POST'])
def create_project():
    """Crea un nuevo proyecto"""
    try:
        data = request.json
        name = data.get('name', '').strip()
        description = data.get('description', '').strip()
        color = data.get('color', 'indigo')
        
        if not name:
            return jsonify({'error': 'El nombre del proyecto es requerido'}), 400
        
        projects = load_projects_db()
        
        # Crear nuevo proyecto
        new_project = {
            'id': str(uuid.uuid4()),
            'name': name,
            'description': description,
            'color': color,
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat()
        }
        
        projects.append(new_project)
        save_projects_db(projects)
        
        print(f"[OK] Proyecto creado: {name} ({new_project['id']})")
        
        return jsonify({
            'success': True,
            'project': new_project
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/projects/<project_id>', methods=['GET'])
def get_project(project_id):
    """Obtiene un proyecto específico"""
    try:
        projects = load_projects_db()
        project = next((p for p in projects if p['id'] == project_id), None)
        
        if not project:
            return jsonify({'error': 'Proyecto no encontrado'}), 404
        
        project['requirements_count'] = count_project_requirements(project_id)
        
        return jsonify({
            'success': True,
            'project': project
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/projects/<project_id>', methods=['PUT'])
def update_project(project_id):
    """Actualiza un proyecto"""
    try:
        data = request.json
        projects = load_projects_db()
        
        project = next((p for p in projects if p['id'] == project_id), None)
        if not project:
            return jsonify({'error': 'Proyecto no encontrado'}), 404
        
        # Actualizar campos
        if 'name' in data:
            project['name'] = data['name'].strip()
        if 'description' in data:
            project['description'] = data['description'].strip()
        if 'color' in data:
            project['color'] = data['color']
        
        project['updated_at'] = datetime.now().isoformat()
        
        save_projects_db(projects)
        
        print(f"[OK] Proyecto actualizado: {project['name']}")
        
        return jsonify({
            'success': True,
            'project': project
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/projects/<project_id>', methods=['DELETE'])
def delete_project(project_id):
    """Elimina un proyecto y todos sus requerimientos"""
    try:
        projects = load_projects_db()
        
        project = next((p for p in projects if p['id'] == project_id), None)
        if not project:
            return jsonify({'error': 'Proyecto no encontrado'}), 404
        
        # Eliminar el proyecto
        projects = [p for p in projects if p['id'] != project_id]
        save_projects_db(projects)
        
        # TODO: Eliminar todos los Contract A y Contract B asociados
        # Por ahora solo eliminamos el proyecto de la base de datos
        
        print(f"[OK] Proyecto eliminado: {project['name']}")
        
        return jsonify({
            'success': True,
            'message': 'Proyecto eliminado exitosamente'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    print("Iniciando QualityAI Web App...")
    init_models()
    print("Servidor listo en http://localhost:3000")
    app.run(debug=False, host='0.0.0.0', port=3000)
