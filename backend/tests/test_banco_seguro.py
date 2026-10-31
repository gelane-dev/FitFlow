import pytest

from banco_seguro import validar_url_banco_teste


@pytest.mark.parametrize("url", [
    "postgresql+psycopg2://fitflow:fitflow@localhost:5432/fitflow_teste",
    "postgresql+psycopg2://postgres:x@localhost:15432/test",
    "postgresql://u:p@host/FitFlow_TEST_db",
])
def test_aceita_banco_com_test_no_nome(url):
    validar_url_banco_teste(url)


@pytest.mark.parametrize("url", [
    "postgresql+psycopg2://fitflow:fitflow@localhost:5432/fitflow",
    "postgresql://u:p@testhost.exemplo.com/producao",  # 'test' só no host não vale
    "postgresql://u:p@localhost:5432",
])
def test_recusa_banco_sem_test_no_nome(url):
    with pytest.raises(ValueError, match="não contém 'test'"):
        validar_url_banco_teste(url)
