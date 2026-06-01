"""Tests de la calculadora de descuentos - cobertura completa.

Cada test cubre un escenario especifico de la logica de negocio.
Estructura de todo test: Arrange (preparar) - Act (actuar) - Assert (afirmar).

Escenarios cubiertos:
  - calcular_iva:      1 escenario (unico camino posible)
  - aplicar_descuento: 7 escenarios (cada combinacion de tipo_cliente/antiguedad/monto/region)
  - calcular_total:    3 escenarios (orquesta iva + descuento)
"""

from calculadora_descuentos import aplicar_descuento, calcular_iva, calcular_total


def test_calcular_iva_basico():
    subtotal = 100000
    resultado = calcular_iva(subtotal)
    assert resultado == 19000.0


def test_descuento_premium_antiguo_nacional():
    """Camino 1/7: premium, >5 anos, nacional -> 25%"""
    resultado = aplicar_descuento(1000000, "premium", 10, "nacional")
    assert resultado == 750000.0


def test_descuento_premium_antiguo_internacional():
    """Camino 2/7: premium, >5 anos, internacional -> 20%"""
    resultado = aplicar_descuento(1000000, "premium", 10, "internacional")
    assert resultado == 800000.0


def test_descuento_premium_nuevo_alto_monto():
    """Camino 3/7: premium, <=5 anos, monto > 1MM -> 15%"""
    resultado = aplicar_descuento(2000000, "premium", 3, "nacional")
    assert resultado == 1700000.0


def test_descuento_premium_nuevo_bajo_monto():
    """Camino 4/7: premium, <=5 anos, monto <= 1MM -> 10%"""
    resultado = aplicar_descuento(500000, "premium", 2, "nacional")
    assert resultado == 450000.0


def test_descuento_regular_alto_monto():
    """Camino 5/7: regular, monto > 500k -> 5%"""
    resultado = aplicar_descuento(600000, "regular", 1, "nacional")
    assert resultado == 570000.0


def test_descuento_regular_bajo_monto():
    """Camino 6/7: regular, monto <= 500k -> 2%"""
    resultado = aplicar_descuento(300000, "regular", 1, "nacional")
    assert resultado == 294000.0


def test_descuento_sin_tipo():
    """Camino 7/7: tipo no reconocido -> 0% descuento"""
    resultado = aplicar_descuento(500000, "basico", 1, "nacional")
    assert resultado == 500000.0


def test_calcular_total_sin_descuento():
    """Total = monto + iva, sin descuento (tipo basico)"""
    resultado = calcular_total(500000, "basico", 1, "nacional")
    assert resultado == 595000.0


def test_calcular_total_con_descuento_premium():
    """Total = (monto - 25%) + iva, premium antiguo nacional"""
    resultado = calcular_total(1000000, "premium", 10, "nacional")
    assert resultado == 892500.0


def test_calcular_total_con_descuento_regular():
    """Total = (monto - 5%) + iva, regular alto monto"""
    resultado = calcular_total(600000, "regular", 1, "nacional")
    assert resultado == 678300.0
