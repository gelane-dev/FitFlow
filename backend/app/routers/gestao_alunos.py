from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..core.seguranca import exigir_papeis, exigir_permissao, verificar_admin
from ..database import get_db
from ..models import Acesso, Matricula, Pagamento, Plano
from ..schemas.acesso import AcessoResposta
from ..schemas.gestao import (
    AlunoGestaoAtualizar, AlunoGestaoCriar, AlunoGestaoDetalhe, AlunoGestaoItem,
    ProfessorDoAlunoAtualizar, RestricaoAtualizar, Situacao,
)
from ..schemas.matricula import MatriculaResposta
from ..schemas.pagamento import PagamentoResposta
from ..schemas.plano import StatusAtualizar
from ..services import gestao_alunos as servico
from ..services.acessos import montar_itens_acesso
from ..services.matriculas import dias_alerta_vencimento, resposta_matricula
from ..services.paginacao import Pagina, ParametrosPagina, montar_pagina, paginar
from ..core.tempo import hoje
from ..services.pagamentos import resposta_pagamento

router = APIRouter()

qualquer_recepcao = exigir_papeis("admin", "recepcao")


@router.get("/gestao/alunos", response_model=Pagina[AlunoGestaoItem])
def listar_alunos(
    busca: str | None = None,
    situacao: Situacao | None = None,
    professor_id: int | None = Query(default=None, ge=0),
    plano_id: int | None = None,
    parametros: ParametrosPagina = Depends(),
    usuario=Depends(qualquer_recepcao),
    db: Session = Depends(get_db),
):
    itens, total = servico.listar(db, parametros, busca, situacao, professor_id, plano_id)

    return montar_pagina(itens, total, parametros)


@router.get("/gestao/alunos/{aluno_id}", response_model=AlunoGestaoDetalhe)
def obter_aluno(aluno_id: int, usuario=Depends(qualquer_recepcao), db: Session = Depends(get_db)):

    return servico.detalhe(db, servico.obter_aluno(db, aluno_id))


@router.post("/gestao/alunos", response_model=AlunoGestaoDetalhe)
def cadastrar_aluno(dados: AlunoGestaoCriar, usuario=Depends(exigir_permissao("cadastrar_aluno")), db: Session = Depends(get_db)):

    aluno = servico.cadastrar(db, usuario, dados)
    db.commit()

    return servico.detalhe(db, aluno)


@router.put("/gestao/alunos/{aluno_id}", response_model=AlunoGestaoDetalhe)
def editar_aluno(
    aluno_id: int, dados: AlunoGestaoAtualizar,
    usuario=Depends(exigir_permissao("editar_aluno")), db: Session = Depends(get_db),
):
    aluno = servico.editar(db, usuario, servico.obter_aluno(db, aluno_id), dados)
    db.commit()

    return servico.detalhe(db, aluno)


@router.post("/gestao/alunos/{aluno_id}/aprovar", response_model=AlunoGestaoDetalhe)
def aprovar_aluno(aluno_id: int, usuario=Depends(exigir_permissao("aprovar_aluno")), db: Session = Depends(get_db)):

    aluno = servico.decidir_cadastro(db, usuario, servico.obter_aluno(db, aluno_id), True)
    db.commit()

    return servico.detalhe(db, aluno)


@router.post("/gestao/alunos/{aluno_id}/recusar", response_model=AlunoGestaoDetalhe)
def recusar_aluno(aluno_id: int, usuario=Depends(exigir_permissao("aprovar_aluno")), db: Session = Depends(get_db)):

    aluno = servico.decidir_cadastro(db, usuario, servico.obter_aluno(db, aluno_id), False)
    db.commit()

    return servico.detalhe(db, aluno)


@router.get("/gestao/alunos/{aluno_id}/matriculas", response_model=list[MatriculaResposta])
def historico_matriculas(aluno_id: int, usuario=Depends(qualquer_recepcao), db: Session = Depends(get_db)):

    aluno = servico.obter_aluno(db, aluno_id)
    alerta = dias_alerta_vencimento(db)
    linhas = db.execute(
        select(Matricula, Plano).join(Plano, Plano.id == Matricula.plano_id)
        .where(Matricula.aluno_id == aluno.id).order_by(Matricula.criado_em.desc(), Matricula.id.desc())
    ).all()

    return [resposta_matricula(m, aluno, p, hoje(), alerta) for m, p in linhas]


@router.get("/gestao/alunos/{aluno_id}/pagamentos", response_model=list[PagamentoResposta])
def historico_pagamentos(aluno_id: int, usuario=Depends(qualquer_recepcao), db: Session = Depends(get_db)):

    aluno = servico.obter_aluno(db, aluno_id)
    pagamentos = db.scalars(
        select(Pagamento).where(Pagamento.aluno_id == aluno.id).order_by(Pagamento.vencimento.desc(), Pagamento.id.desc())
    ).all()

    return [resposta_pagamento(p, aluno) for p in pagamentos]


@router.get("/gestao/alunos/{aluno_id}/acessos", response_model=Pagina[AcessoResposta])
def historico_acessos(
    aluno_id: int, parametros: ParametrosPagina = Depends(),
    usuario=Depends(qualquer_recepcao), db: Session = Depends(get_db),
):
    aluno = servico.obter_aluno(db, aluno_id)
    consulta = select(Acesso).where(Acesso.aluno_id == aluno.id).order_by(Acesso.data_hora.desc(), Acesso.id.desc())
    linhas, total = paginar(db, consulta, parametros)
    itens = montar_itens_acesso(db, [(linha[0], aluno) for linha in linhas])

    return montar_pagina(itens, total, parametros)


@router.put("/admin/alunos/{aluno_id}/status", response_model=AlunoGestaoDetalhe)
def alterar_status_aluno(
    aluno_id: int, dados: StatusAtualizar, admin=Depends(verificar_admin), db: Session = Depends(get_db),
):
    aluno = servico.alterar_status(db, admin, servico.obter_aluno(db, aluno_id), dados.ativo)
    db.commit()

    return servico.detalhe(db, aluno)


@router.put("/admin/alunos/{aluno_id}/professor", response_model=AlunoGestaoDetalhe)
def trocar_professor_do_aluno(
    aluno_id: int, dados: ProfessorDoAlunoAtualizar, admin=Depends(verificar_admin), db: Session = Depends(get_db),
):
    aluno = servico.trocar_professor(db, admin, servico.obter_aluno(db, aluno_id), dados.professor_id)
    db.commit()

    return servico.detalhe(db, aluno)


@router.put("/admin/alunos/{aluno_id}/restricao", response_model=AlunoGestaoDetalhe)
def alterar_restricao_do_aluno(
    aluno_id: int, dados: RestricaoAtualizar, admin=Depends(verificar_admin), db: Session = Depends(get_db),
):
    aluno = servico.alterar_restricao(db, admin, servico.obter_aluno(db, aluno_id), dados.restricao_acesso)
    db.commit()

    return servico.detalhe(db, aluno)
