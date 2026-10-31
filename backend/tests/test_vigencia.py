from datetime import timedelta

from app.models import Ficha
from app.core.tempo import agora

MSG_DATA = "A data final deve ser posterior à data inicial"


def _hoje():
    return agora().date()


def _criar(client, headers, aluno_id, **extra):
    return client.post("/ficha", json={"aluno_id": aluno_id, "nome": "F", **extra}, headers=headers)


def test_criar_ficha_sem_datas_usa_hoje(client, professor_headers, aluno_id):
    r = _criar(client, professor_headers, aluno_id)
    assert r.status_code == 200
    corpo = r.json()
    assert corpo["data_inicio"] == _hoje().isoformat()
    assert corpo["data_fim"] is None
    assert corpo["vigente"] is True


def test_criar_ficha_futura_nao_e_vigente(client, professor_headers, aluno_id):
    inicio = _hoje() + timedelta(days=3)
    corpo = _criar(client, professor_headers, aluno_id, data_inicio=inicio.isoformat()).json()
    assert corpo["vigente"] is False


def test_criar_ficha_encerrada_nao_e_vigente(client, professor_headers, aluno_id):
    inicio = _hoje() - timedelta(days=10)
    fim = _hoje() - timedelta(days=1)
    corpo = _criar(client, professor_headers, aluno_id,
                   data_inicio=inicio.isoformat(), data_fim=fim.isoformat()).json()
    assert corpo["vigente"] is False


def test_data_fim_hoje_ainda_e_vigente(client, professor_headers, aluno_id):
    corpo = _criar(client, professor_headers, aluno_id, data_fim=_hoje().isoformat()).json()
    assert corpo["vigente"] is True


def test_data_fim_anterior_ao_inicio_400(client, professor_headers, aluno_id):
    r = _criar(client, professor_headers, aluno_id,
               data_inicio="2026-05-10", data_fim="2026-05-09")
    assert r.status_code == 400
    assert r.json()["detail"] == MSG_DATA


def test_criar_ficha_aluno_inexistente_404(client, professor_headers):
    assert _criar(client, professor_headers, 999).status_code == 404


def test_criar_ficha_por_aluno_403(client, aluno_headers, aluno_id):
    assert _criar(client, aluno_headers, aluno_id).status_code == 403


def test_atualizar_vigencia(client, professor_headers, ficha_id):
    r = client.put(f"/ficha/{ficha_id}", json={"nome": "Novo", "data_inicio": "2026-01-01", "data_fim": "2026-02-01"},
                   headers=professor_headers)
    assert r.status_code == 200
    corpo = r.json()
    assert (corpo["nome"], corpo["data_inicio"], corpo["data_fim"], corpo["vigente"]) == \
        ("Novo", "2026-01-01", "2026-02-01", False)


def test_atualizar_omitindo_datas_mantem(client, professor_headers, aluno_id):
    ficha = _criar(client, professor_headers, aluno_id, data_inicio="2026-01-01", data_fim="2026-02-01").json()
    r = client.put(f"/ficha/{ficha['id']}", json={"nome": "Só nome"}, headers=professor_headers)
    assert r.status_code == 200
    assert (r.json()["data_inicio"], r.json()["data_fim"]) == ("2026-01-01", "2026-02-01")


def test_atualizar_data_fim_null_remove_limite(client, professor_headers, aluno_id):
    ficha = _criar(client, professor_headers, aluno_id, data_inicio="2026-01-01", data_fim="2026-02-01").json()
    r = client.put(f"/ficha/{ficha['id']}", json={"nome": "X", "data_fim": None}, headers=professor_headers)
    assert r.json()["data_fim"] is None


def test_atualizar_valida_periodo_com_data_existente(client, professor_headers, aluno_id):
    ficha = _criar(client, professor_headers, aluno_id, data_inicio="2026-03-01").json()
    r = client.put(f"/ficha/{ficha['id']}", json={"nome": "X", "data_fim": "2026-02-01"}, headers=professor_headers)
    assert r.status_code == 400
    assert r.json()["detail"] == MSG_DATA


def test_atualizar_ficha_permissoes_e_404(client, outro_professor_headers, aluno_headers, professor_headers, ficha_id):
    assert client.put(f"/ficha/{ficha_id}", json={"nome": "X"}, headers=outro_professor_headers).status_code == 403
    assert client.put(f"/ficha/{ficha_id}", json={"nome": "X"}, headers=aluno_headers).status_code == 403
    assert client.put("/ficha/999", json={"nome": "X"}, headers=professor_headers).status_code == 404


def test_ficha_antiga_sem_data_inicio_usa_data_criacao(client, db, professor_headers, aluno_headers, ficha_id):
    ficha = db.get(Ficha, ficha_id)
    ficha.data_inicio = None
    ficha.data_criacao = agora().replace(tzinfo=None) - timedelta(days=5)
    db.commit()

    corpo = client.get("/ficha/aluno", headers=aluno_headers).json()[0]
    assert corpo["data_inicio"] == (_hoje() - timedelta(days=5)).isoformat()
    assert corpo["vigente"] is True


def test_listar_fichas_do_professor_filtra_por_aluno(client, db, professor_headers, aluno_id, outro_aluno_headers):
    from app.models import Aluno
    outro = db.query(Aluno).filter(Aluno.nome == "Aluno 2").one().id
    _criar(client, professor_headers, aluno_id)
    _criar(client, professor_headers, outro)

    assert len(client.get("/ficha", headers=professor_headers).json()) == 2
    filtradas = client.get(f"/ficha?aluno_id={aluno_id}", headers=professor_headers).json()
    assert [f["aluno_id"] for f in filtradas] == [aluno_id]
    assert {"data_inicio", "data_fim", "vigente"} <= set(filtradas[0])
    assert client.get("/ficha?aluno_id=999", headers=professor_headers).json() == []


def test_ficha_professor_por_id_tem_vigencia(client, professor_headers, outro_professor_headers, ficha_id):
    r = client.get(f"/ficha/professor/{ficha_id}", headers=professor_headers)
    assert r.status_code == 200
    assert r.json()["vigente"] is True
    assert client.get(f"/ficha/professor/{ficha_id}", headers=outro_professor_headers).status_code == 403
    assert client.get("/ficha/professor/999", headers=professor_headers).status_code == 404


def test_ficha_aluno_ordena_vigentes_primeiro(client, professor_headers, aluno_headers, aluno_id):
    futura = _criar(client, professor_headers, aluno_id, nome="x",
                    data_inicio=(_hoje() + timedelta(days=9)).isoformat()).json()["id"]
    vigente_antiga = _criar(client, professor_headers, aluno_id).json()["id"]
    vigente_nova = _criar(client, professor_headers, aluno_id).json()["id"]
    encerrada = _criar(client, professor_headers, aluno_id, data_inicio="2026-01-01", data_fim="2026-01-02").json()["id"]

    lista = client.get("/ficha/aluno", headers=aluno_headers).json()
    ids = [f["id"] for f in lista]
    assert ids[:2] == [vigente_nova, vigente_antiga]
    assert set(ids[2:]) == {futura, encerrada}
    assert [f["vigente"] for f in lista] == [True, True, False, False]


def test_ficha_aluno_detalhe_tem_vigencia(client, aluno_headers, ficha_id):
    corpo = client.get(f"/ficha/{ficha_id}", headers=aluno_headers).json()
    assert corpo["vigente"] is True
    assert corpo["data_inicio"] == _hoje().isoformat()
    assert corpo["data_fim"] is None


def test_listas_vazias_do_aluno(client, aluno_headers):
    assert client.get("/ficha/aluno", headers=aluno_headers).json() == []
    assert client.get("/ficha/progresso", headers=aluno_headers).json() == []
