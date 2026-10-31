"""cria tabela sessoes_treino e sessao_id no historico

Revision ID: d3e4f5a6b7c8
Revises: c2d3e4f5a6b7
Create Date: 2026-10-30 13:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd3e4f5a6b7c8'
down_revision: Union[str, Sequence[str], None] = 'c2d3e4f5a6b7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('sessoes_treino',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('aluno_id', sa.Integer(), nullable=False),
    sa.Column('treino_id', sa.Integer(), nullable=False),
    sa.Column('iniciada_em', sa.DateTime(), nullable=False),
    sa.Column('finalizada_em', sa.DateTime(), nullable=True),
    sa.Column('esforco', sa.Integer(), nullable=True),
    sa.Column('comentario', sa.String(length=500), nullable=True),
    sa.ForeignKeyConstraint(['aluno_id'], ['alunos.id'], name='sessoes_treino_aluno_id_fkey'),
    sa.ForeignKeyConstraint(['treino_id'], ['treino.id'], name='sessoes_treino_treino_id_fkey'),
    sa.PrimaryKeyConstraint('id', name='sessoes_treino_pkey')
    )
    op.add_column('historicos_execucao', sa.Column('sessao_id', sa.Integer(), nullable=True))
    op.create_foreign_key('historicos_execucao_sessao_id_fkey', 'historicos_execucao', 'sessoes_treino', ['sessao_id'], ['id'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint('historicos_execucao_sessao_id_fkey', 'historicos_execucao', type_='foreignkey')
    op.drop_column('historicos_execucao', 'sessao_id')
    op.drop_table('sessoes_treino')
