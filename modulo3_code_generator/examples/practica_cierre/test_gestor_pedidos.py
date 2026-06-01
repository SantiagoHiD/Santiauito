"""Tests para gestor_pedidos — cobertura completa (>80%).

Cada test valida un escenario especifico con su valor esperado (True/False,
string de estado, o costo numerico). Sin verificaciones 'is not None':
todo test afirma un valor concreto.
"""

import pytest
from gestor_pedidos import validar_pedido, estado_pedido, calcular_envio


# --- validar_pedido: cobertura completa (4/4 ramas) ---

def test_validar_pedido_valido():
    """AC-001: pedido valido con items y cliente"""
    pedido = {"items": ["zapatos"], "cliente": "Juan"}
    assert validar_pedido(pedido) is True


def test_validar_pedido_tipo_invalido():
    """AC-002: entrada que no es dict"""
    assert validar_pedido("no soy un dict") is False


def test_validar_pedido_sin_items():
    """AC-003: dict sin items"""
    pedido = {"items": [], "cliente": "Juan"}
    assert validar_pedido(pedido) is False


def test_validar_pedido_sin_cliente():
    """AC-004: dict sin clave cliente"""
    pedido = {"items": ["zapatos"]}
    assert validar_pedido(pedido) is False


# --- estado_pedido: cobertura completa (9/9 codigos) ---

def test_estado_pendiente():
    """AC-005: codigo P -> Pendiente"""
    assert estado_pedido("P") == "Pendiente"


def test_estado_confirmado():
    """AC-006: codigo C -> Confirmado"""
    assert estado_pedido("C") == "Confirmado"


def test_estado_preparando():
    """AC-007: codigo PR -> Preparando"""
    assert estado_pedido("PR") == "Preparando"


def test_estado_enviado():
    """AC-008: codigo E -> Enviado"""
    assert estado_pedido("E") == "Enviado"


def test_estado_transito():
    """AC-009: codigo T -> En transito"""
    assert estado_pedido("T") == "En transito"


def test_estado_entregado():
    """AC-010: codigo D -> Entregado"""
    assert estado_pedido("D") == "Entregado"


def test_estado_cancelado():
    """AC-011: codigo X -> Cancelado"""
    assert estado_pedido("X") == "Cancelado"


def test_estado_devuelto():
    """AC-012: codigo R -> Devuelto"""
    assert estado_pedido("R") == "Devuelto"


def test_estado_desconocido():
    """AC-013: codigo invalido -> Desconocido"""
    assert estado_pedido("Z") == "Desconocido"


# --- calcular_envio: cobertura completa (todas las combinaciones) ---

def test_envio_peso_cero():
    """AC-014: peso <= 0 -> costo 0"""
    assert calcular_envio(0, "nacional", urgente=False, cliente_premium=False) == 0


def test_envio_nacional_no_urgente_ligero():
    """AC-015: nacional, no urgente, peso < 5 -> 15000"""
    assert calcular_envio(2, "nacional", urgente=False, cliente_premium=False) == 15000


def test_envio_nacional_no_urgente_pesado():
    """AC-016: nacional, no urgente, peso >= 5 -> 25000"""
    assert calcular_envio(10, "nacional", urgente=False, cliente_premium=False) == 25000


def test_envio_nacional_urgente_ligero():
    """AC-017: nacional, urgente, peso < 5 -> 25000"""
    assert calcular_envio(2, "nacional", urgente=True, cliente_premium=False) == 25000


def test_envio_nacional_urgente_medio():
    """AC-018: nacional, urgente, 5 <= peso < 20 -> 40000"""
    assert calcular_envio(10, "nacional", urgente=True, cliente_premium=False) == 40000


def test_envio_nacional_urgente_pesado():
    """AC-019: nacional, urgente, peso >= 20 -> 60000"""
    assert calcular_envio(25, "nacional", urgente=True, cliente_premium=False) == 60000


def test_envio_internacional_no_urgente_ligero():
    """AC-020: internacional, no urgente, peso < 5 -> 50000"""
    assert calcular_envio(2, "internacional", urgente=False, cliente_premium=False) == 50000


def test_envio_internacional_no_urgente_pesado():
    """AC-021: internacional, no urgente, peso >= 5 -> 90000"""
    assert calcular_envio(10, "internacional", urgente=False, cliente_premium=False) == 90000


def test_envio_internacional_urgente_ligero():
    """AC-022: internacional, urgente, peso < 5 -> 80000"""
    assert calcular_envio(3, "internacional", urgente=True, cliente_premium=False) == 80000


def test_envio_internacional_urgente_pesado():
    """AC-023: internacional, urgente, peso >= 5 -> 150000"""
    assert calcular_envio(10, "internacional", urgente=True, cliente_premium=False) == 150000


def test_envio_premium_nacional():
    """AC-024: premium descuento -> costo * 0.85"""
    assert calcular_envio(2, "nacional", urgente=False, cliente_premium=True) == 12750


def test_envio_premium_internacional_urgente():
    """AC-025: premium + internacional urgente -> (150000) * 0.85 = 127500"""
    assert calcular_envio(10, "internacional", urgente=True, cliente_premium=True) == 127500
