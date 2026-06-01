def pytest_configure(config):
    config.addinivalue_line("markers", "scenario(id): vincula un test a un escenario")
