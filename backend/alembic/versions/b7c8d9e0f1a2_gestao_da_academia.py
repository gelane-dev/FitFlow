"""gestao da academia: papeis, matricula, pagamento, acesso, auditoria, versoes de ficha

Migração única da expansão GA-01 (ver docs/contracts/Contrato-Gestao.md, seção "Banco").
Só adiciona: colunas novas (nulas ou com server_default), tabelas novas, índices e
a linha id=1 de configuracao_academia. A única relaxação é treino.dia_semana aceitar NULL.

Revision ID: b7c8d9e0f1a2
Revises: a6b7c8d9e0f1
Create Date: 2026-11-09 10:00:00.000000

"""
import secrets
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b7c8d9e0f1a2'
down_revision: Union[str, Sequence[str], None] = 'a6b7c8d9e0f1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

CIRCUNFERENCIAS = [
    'cintura', 'quadril', 'abdomen', 'peito', 'braco_direito', 'braco_esquerdo',
    'coxa_direita', 'coxa_esquerda', 'panturrilha',
]


def _criado_em():
    return sa.Column('criado_em', sa.DateTime(), nullable=False)


def upgrade() -> None:
    """Upgrade schema."""
    # --- colunas novas em tabelas existentes ---
    with op.batch_alter_table('users') as batch_op:
        batch_op.add_column(sa.Column('ativo', sa.Boolean(), nullable=False, server_default=sa.true()))
        batch_op.add_column(sa.Column('criado_em', sa.DateTime(), nullable=True))

    with op.batch_alter_table('alunos') as batch_op:
        batch_op.add_column(sa.Column('status_cadastro', sa.String(length=20), nullable=False, server_default='aprovado'))
        batch_op.add_column(sa.Column('professor_id', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('professor_vinculado_em', sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column('cpf', sa.String(length=14), nullable=True))
        batch_op.add_column(sa.Column('endereco', sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column('observacoes', sa.String(length=500), nullable=True))
        batch_op.add_column(sa.Column('restricao_acesso', sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column('codigo_acesso', sa.String(length=32), nullable=True))
        batch_op.add_column(sa.Column('aprovado_em', sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column('aprovado_por_user_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key('fk_alunos_professor_id', 'professores', ['professor_id'], ['id'])
        batch_op.create_foreign_key('fk_alunos_aprovado_por_user_id', 'users', ['aprovado_por_user_id'], ['id'])
        batch_op.create_index('ix_alunos_professor_id', ['professor_id'])
        batch_op.create_unique_constraint('uq_alunos_cpf', ['cpf'])

    with op.batch_alter_table('fichas') as batch_op:
        batch_op.add_column(sa.Column('objetivo', sa.String(length=300), nullable=True))
        batch_op.add_column(sa.Column('status', sa.String(length=20), nullable=False, server_default='publicada'))
        batch_op.add_column(sa.Column('atualizado_em', sa.DateTime(), nullable=True))

    with op.batch_alter_table('treino') as batch_op:
        batch_op.alter_column('dia_semana', existing_type=sa.String(length=20), nullable=True)

    with op.batch_alter_table('itens_ficha') as batch_op:
        batch_op.add_column(sa.Column('observacao', sa.String(length=300), nullable=True))

    with op.batch_alter_table('exercicios') as batch_op:
        batch_op.add_column(sa.Column('instrucoes', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('criado_por_professor_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key('fk_exercicios_criado_por_professor_id', 'professores', ['criado_por_professor_id'], ['id'])

    with op.batch_alter_table('avaliacoes_fisicas') as batch_op:
        for coluna in CIRCUNFERENCIAS:
            batch_op.add_column(sa.Column(coluna, sa.Float(), nullable=True))

    # --- preenchimento de quem já existe ---
    conexao = op.get_bind()

    # professor da ficha ativa mais recente do aluno; sem ficha ativa → NULL
    conexao.execute(
        sa.text(
            "UPDATE alunos SET professor_id = ("
            "SELECT f.professor_id FROM fichas f "
            "WHERE f.aluno_id = alunos.id AND f.ativo = :ativo "
            "ORDER BY f.data_criacao DESC, f.id DESC LIMIT 1)"
        ),
        {"ativo": True},
    )
    conexao.execute(sa.text("UPDATE fichas SET atualizado_em = data_criacao"))

    # codigo_acesso gerado por linha (não dá para gerar token aleatório em SQL portável)
    for (aluno_id,) in conexao.execute(sa.text("SELECT id FROM alunos")).fetchall():
        conexao.execute(
            sa.text("UPDATE alunos SET codigo_acesso = :codigo WHERE id = :id"),
            {"codigo": secrets.token_hex(8), "id": aluno_id},
        )

    with op.batch_alter_table('alunos') as batch_op:
        batch_op.alter_column('codigo_acesso', existing_type=sa.String(length=32), nullable=False)
        batch_op.create_unique_constraint('uq_alunos_codigo_acesso', ['codigo_acesso'])

    # --- tabelas novas ---
    op.create_table(
        'recepcionistas',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('nome', sa.String(length=150), nullable=False),
        sa.Column('telefone', sa.String(length=20), nullable=False),
        sa.Column('permissoes', sa.JSON(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id'),
    )

    configuracao = op.create_table(
        'configuracao_academia',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('nome', sa.String(length=150), nullable=False, server_default='FitFlow'),
        sa.Column('endereco', sa.String(length=255), nullable=True),
        sa.Column('telefone', sa.String(length=20), nullable=True),
        sa.Column('email', sa.String(length=150), nullable=True),
        sa.Column('horarios', sa.JSON(), nullable=False),
        sa.Column('tolerancia_dias_vencimento', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('bloquear_pagamento_pendente', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('dias_alerta_vencimento', sa.Integer(), nullable=False, server_default='7'),
        sa.Column('dias_reavaliacao', sa.Integer(), nullable=False, server_default='90'),
        sa.Column('dias_atualizar_treino', sa.Integer(), nullable=False, server_default='60'),
        sa.Column('atualizado_em', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.bulk_insert(configuracao, [{
        'id': 1,
        'nome': 'FitFlow',
        'horarios': [],
        'tolerancia_dias_vencimento': 0,
        'bloquear_pagamento_pendente': False,
        'dias_alerta_vencimento': 7,
        'dias_reavaliacao': 90,
        'dias_atualizar_treino': 60,
    }])

    op.create_table(
        'planos',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('nome', sa.String(length=100), nullable=False),
        sa.Column('descricao', sa.String(length=500), nullable=True),
        sa.Column('duracao_dias', sa.Integer(), nullable=False),
        sa.Column('valor', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('periodicidade', sa.String(length=20), nullable=False),
        sa.Column('renovacao_automatica', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('condicoes', sa.String(length=500), nullable=True),
        sa.Column('ativo', sa.Boolean(), nullable=False, server_default=sa.true()),
        _criado_em(),
        sa.PrimaryKeyConstraint('id'),
    )

    op.create_table(
        'matriculas',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('aluno_id', sa.Integer(), nullable=False),
        sa.Column('plano_id', sa.Integer(), nullable=False),
        sa.Column('data_inicio', sa.Date(), nullable=False),
        sa.Column('data_vencimento', sa.Date(), nullable=False),
        sa.Column('valor', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('motivo_cancelamento', sa.String(length=300), nullable=True),
        sa.Column('cancelada_em', sa.DateTime(), nullable=True),
        sa.Column('criado_por_user_id', sa.Integer(), nullable=False),
        _criado_em(),
        sa.Column('matricula_anterior_id', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['aluno_id'], ['alunos.id']),
        sa.ForeignKeyConstraint(['plano_id'], ['planos.id']),
        sa.ForeignKeyConstraint(['criado_por_user_id'], ['users.id']),
        sa.ForeignKeyConstraint(['matricula_anterior_id'], ['matriculas.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_matriculas_aluno_status', 'matriculas', ['aluno_id', 'status'])
    op.create_index(
        'uq_matriculas_ativa_por_aluno', 'matriculas', ['aluno_id'], unique=True,
        sqlite_where=sa.text("status = 'ativa'"),
        postgresql_where=sa.text("status = 'ativa'"),
    )

    op.create_table(
        'pagamentos',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('aluno_id', sa.Integer(), nullable=False),
        sa.Column('matricula_id', sa.Integer(), nullable=True),
        sa.Column('descricao', sa.String(length=150), nullable=False),
        sa.Column('valor', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('vencimento', sa.Date(), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('forma', sa.String(length=20), nullable=True),
        sa.Column('valor_recebido', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('pago_em', sa.DateTime(), nullable=True),
        sa.Column('registrado_por_user_id', sa.Integer(), nullable=True),
        sa.Column('motivo_estorno', sa.String(length=300), nullable=True),
        sa.Column('estornado_em', sa.DateTime(), nullable=True),
        sa.Column('estornado_por_user_id', sa.Integer(), nullable=True),
        _criado_em(),
        sa.ForeignKeyConstraint(['aluno_id'], ['alunos.id']),
        sa.ForeignKeyConstraint(['matricula_id'], ['matriculas.id']),
        sa.ForeignKeyConstraint(['registrado_por_user_id'], ['users.id']),
        sa.ForeignKeyConstraint(['estornado_por_user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_pagamentos_aluno_id', 'pagamentos', ['aluno_id'])
    op.create_index('ix_pagamentos_status_vencimento', 'pagamentos', ['status', 'vencimento'])

    op.create_table(
        'acessos',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('aluno_id', sa.Integer(), nullable=False),
        sa.Column('data_hora', sa.DateTime(), nullable=False),
        sa.Column('resultado', sa.String(length=20), nullable=False),
        sa.Column('motivos', sa.JSON(), nullable=False),
        sa.Column('origem', sa.String(length=20), nullable=False, server_default='manual'),
        sa.Column('liberacao_manual', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('registrado_por_user_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['aluno_id'], ['alunos.id']),
        sa.ForeignKeyConstraint(['registrado_por_user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_acessos_aluno_data', 'acessos', ['aluno_id', 'data_hora'])
    op.create_index('ix_acessos_data_hora', 'acessos', ['data_hora'])

    op.create_table(
        'auditoria',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('data_hora', sa.DateTime(), nullable=False),
        sa.Column('acao', sa.String(length=60), nullable=False),
        sa.Column('entidade', sa.String(length=40), nullable=False),
        sa.Column('entidade_id', sa.Integer(), nullable=True),
        sa.Column('descricao', sa.String(length=300), nullable=False),
        sa.Column('detalhes', sa.JSON(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_auditoria_data_hora', 'auditoria', ['data_hora'])
    op.create_index('ix_auditoria_user_id', 'auditoria', ['user_id'])
    op.create_index('ix_auditoria_entidade', 'auditoria', ['entidade', 'entidade_id'])

    op.create_table(
        'fichas_versoes',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('ficha_id', sa.Integer(), nullable=False),
        sa.Column('numero', sa.Integer(), nullable=False),
        sa.Column('publicada_em', sa.DateTime(), nullable=False),
        sa.Column('publicada_por_user_id', sa.Integer(), nullable=False),
        sa.Column('conteudo', sa.JSON(), nullable=False),
        sa.ForeignKeyConstraint(['ficha_id'], ['fichas.id']),
        sa.ForeignKeyConstraint(['publicada_por_user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('ficha_id', 'numero', name='uq_fichas_versoes_ficha_numero'),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('fichas_versoes')

    op.drop_index('ix_auditoria_entidade', table_name='auditoria')
    op.drop_index('ix_auditoria_user_id', table_name='auditoria')
    op.drop_index('ix_auditoria_data_hora', table_name='auditoria')
    op.drop_table('auditoria')

    op.drop_index('ix_acessos_data_hora', table_name='acessos')
    op.drop_index('ix_acessos_aluno_data', table_name='acessos')
    op.drop_table('acessos')

    op.drop_index('ix_pagamentos_status_vencimento', table_name='pagamentos')
    op.drop_index('ix_pagamentos_aluno_id', table_name='pagamentos')
    op.drop_table('pagamentos')

    op.drop_index('uq_matriculas_ativa_por_aluno', table_name='matriculas')
    op.drop_index('ix_matriculas_aluno_status', table_name='matriculas')
    op.drop_table('matriculas')

    op.drop_table('planos')
    op.drop_table('configuracao_academia')
    op.drop_table('recepcionistas')

    with op.batch_alter_table('avaliacoes_fisicas') as batch_op:
        for coluna in reversed(CIRCUNFERENCIAS):
            batch_op.drop_column(coluna)

    with op.batch_alter_table('exercicios') as batch_op:
        batch_op.drop_constraint('fk_exercicios_criado_por_professor_id', type_='foreignkey')
        batch_op.drop_column('criado_por_professor_id')
        batch_op.drop_column('instrucoes')

    with op.batch_alter_table('itens_ficha') as batch_op:
        batch_op.drop_column('observacao')

    # treino.dia_semana voltou a ser obrigatório: treinos sem dia (A/B/C) recebem 'segunda'
    op.get_bind().execute(sa.text("UPDATE treino SET dia_semana = 'segunda' WHERE dia_semana IS NULL"))
    with op.batch_alter_table('treino') as batch_op:
        batch_op.alter_column('dia_semana', existing_type=sa.String(length=20), nullable=False)

    with op.batch_alter_table('fichas') as batch_op:
        batch_op.drop_column('atualizado_em')
        batch_op.drop_column('status')
        batch_op.drop_column('objetivo')

    with op.batch_alter_table('alunos') as batch_op:
        batch_op.drop_constraint('uq_alunos_codigo_acesso', type_='unique')
        batch_op.drop_constraint('uq_alunos_cpf', type_='unique')
        batch_op.drop_index('ix_alunos_professor_id')
        batch_op.drop_constraint('fk_alunos_aprovado_por_user_id', type_='foreignkey')
        batch_op.drop_constraint('fk_alunos_professor_id', type_='foreignkey')
        batch_op.drop_column('aprovado_por_user_id')
        batch_op.drop_column('aprovado_em')
        batch_op.drop_column('codigo_acesso')
        batch_op.drop_column('restricao_acesso')
        batch_op.drop_column('observacoes')
        batch_op.drop_column('endereco')
        batch_op.drop_column('cpf')
        batch_op.drop_column('professor_vinculado_em')
        batch_op.drop_column('professor_id')
        batch_op.drop_column('status_cadastro')

    with op.batch_alter_table('users') as batch_op:
        batch_op.drop_column('criado_em')
        batch_op.drop_column('ativo')
