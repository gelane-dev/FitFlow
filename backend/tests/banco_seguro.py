from sqlalchemy.engine import make_url


def validar_url_banco_teste(url: str) -> None:
    """Levanta ValueError se o nome do banco não contiver 'test'.

    A suíte executa TRUNCATE/DROP SCHEMA; isso nunca pode atingir um banco real.
    """
    nome = make_url(url).database or ""
    if "test" not in nome.lower():
        raise ValueError(
            f"TEST_POSTGRES_URL aponta para o banco '{nome}', cujo nome não contém 'test'. "
            "A suíte apaga dados (TRUNCATE/DROP SCHEMA); use um banco descartável, ex.: fitflow_teste."
        )
