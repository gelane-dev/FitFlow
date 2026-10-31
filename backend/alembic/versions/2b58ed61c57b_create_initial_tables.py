"""create initial tables

Revision ID: 2b58ed61c57b
Revises: 
Create Date: 2026-08-27 11:05:38.697642

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2b58ed61c57b'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema.

    Schema-base como era neste ponto da cadeia: as migrações seguintes adicionam
    users.foto(_public_id), colunas de mídia/ativo/treino_id/ordem, a tabela treino
    e tornam historicos_execucao.observacao nullable.
    """
    op.create_table('users',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('email', sa.String(length=150), nullable=False),
    sa.Column('senha', sa.String(length=255), nullable=False),
    sa.Column('tipo', sa.String(length=50), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('email')
    )
    op.create_table('exercicios',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('nome', sa.String(length=150), nullable=False),
    sa.Column('descricao', sa.String(length=500), nullable=False),
    sa.Column('grupo_muscular', sa.String(length=150), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('professores',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('nome', sa.String(length=150), nullable=False),
    sa.Column('telefone', sa.String(length=20), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('user_id')
    )
    op.create_table('alunos',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('nome', sa.String(length=150), nullable=False),
    sa.Column('data_nascimento', sa.Date(), nullable=False),
    sa.Column('telefone', sa.String(length=20), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('user_id')
    )
    op.create_table('fichas',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('aluno_id', sa.Integer(), nullable=False),
    sa.Column('professor_id', sa.Integer(), nullable=False),
    sa.Column('nome', sa.String(length=150), nullable=False),
    sa.Column('data_criacao', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['aluno_id'], ['alunos.id'], ),
    sa.ForeignKeyConstraint(['professor_id'], ['professores.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('avaliacoes_fisicas',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('aluno_id', sa.Integer(), nullable=False),
    sa.Column('data_avaliacao', sa.DateTime(), nullable=False),
    sa.Column('peso', sa.Float(), nullable=False),
    sa.Column('altura', sa.Float(), nullable=False),
    sa.Column('percentual_gordura', sa.Float(), nullable=False),
    sa.Column('massa_muscular', sa.Float(), nullable=False),
    sa.Column('observacao', sa.String(length=500), nullable=False),
    sa.ForeignKeyConstraint(['aluno_id'], ['alunos.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('itens_ficha',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('ficha_id', sa.Integer(), nullable=False),
    sa.Column('exercicio_id', sa.Integer(), nullable=False),
    sa.Column('series', sa.Integer(), nullable=False),
    sa.Column('repeticoes', sa.Integer(), nullable=False),
    sa.Column('carga', sa.Float(), nullable=False),
    sa.Column('descanso', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['exercicio_id'], ['exercicios.id'], ),
    sa.ForeignKeyConstraint(['ficha_id'], ['fichas.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('historicos_execucao',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('item_ficha_id', sa.Integer(), nullable=False),
    sa.Column('aluno_id', sa.Integer(), nullable=False),
    sa.Column('data_execucao', sa.DateTime(), nullable=False),
    sa.Column('series_realizadas', sa.Integer(), nullable=False),
    sa.Column('repeticoes_realizadas', sa.Integer(), nullable=False),
    sa.Column('carga_utilizada', sa.Float(), nullable=False),
    sa.Column('observacao', sa.String(length=500), nullable=False),
    sa.ForeignKeyConstraint(['aluno_id'], ['alunos.id'], ),
    sa.ForeignKeyConstraint(['item_ficha_id'], ['itens_ficha.id'], ),
    sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('historicos_execucao')
    op.drop_table('itens_ficha')
    op.drop_table('avaliacoes_fisicas')
    op.drop_table('fichas')
    op.drop_table('alunos')
    op.drop_table('professores')
    op.drop_table('exercicios')
    op.drop_table('users')
