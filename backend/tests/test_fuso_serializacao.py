"""ADR-016 (adendo): datetimes da API saem com o offset de APP_TIMEZONE."""
import re
from datetime import datetime, timezone

from app.core.tempo import para_iso_com_fuso

OFFSET = re.compile(r"[+-]\d{2}:\d{2}$")


def test_naive_ganha_offset_do_app_timezone():
    assert para_iso_com_fuso(datetime(2026, 10, 31, 10, 0, 0)) == "2026-10-31T10:00:00-03:00"


def test_aware_e_convertido_para_o_app_timezone():
    assert para_iso_com_fuso(datetime(2026, 10, 31, 13, 0, 0, tzinfo=timezone.utc)) == "2026-10-31T10:00:00-03:00"


def test_sessao_serializa_datas_com_offset(client, aluno_headers, treino_id):
    sessao = client.post("/sessoes", json={"treino_id": treino_id}, headers=aluno_headers).json()
    assert OFFSET.search(sessao["iniciada_em"])
    assert sessao["finalizada_em"] is None
    lista = client.get("/sessoes", headers=aluno_headers).json()
    assert OFFSET.search(lista[0]["iniciada_em"])
    assert lista[0]["iniciada_em"].endswith("-03:00")


def test_avaliacao_serializa_data_com_offset(client, professor_headers, aluno_id):
    r = client.post(f"/alunos/{aluno_id}/avaliacoes",
                    json={"peso": 70, "altura": 1.75, "data_avaliacao": "2026-01-11T02:30:00Z"},
                    headers=professor_headers)
    assert r.json()["data_avaliacao"] == "2026-01-10T23:30:00-03:00"
