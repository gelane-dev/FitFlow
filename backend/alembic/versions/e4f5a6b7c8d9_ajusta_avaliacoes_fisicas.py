"""ajusta avaliacoes_fisicas: professor_id e campos opcionais

Revision ID: e4f5a6b7c8d9
Revises: d3e4f5a6b7c8
Create Date: 2026-10-30 13:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e4f5a6b7c8d9'
down_revision: Union[str, Sequence[str], None] = 'd3e4f5a6b7c8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('avaliacoes_fisicas', sa.Column('professor_id', sa.Integer(), nullable=True))
    op.create_foreign_key('avaliacoes_fisicas_professor_id_fkey', 'avaliacoes_fisicas', 'professores', ['professor_id'], ['id'])
    op.alter_column('avaliacoes_fisicas', 'percentual_gordura', existing_type=sa.Float(), nullable=True)
    op.alter_column('avaliacoes_fisicas', 'massa_muscular', existing_type=sa.Float(), nullable=True)
    op.alter_column('avaliacoes_fisicas', 'observacao', existing_type=sa.String(length=500), nullable=True)


def downgrade() -> None:
    """Downgrade schema."""
    # Linhas com valores nulos precisam de um valor antes de voltar a NOT NULL
    op.execute("UPDATE avaliacoes_fisicas SET percentual_gordura = 0 WHERE percentual_gordura IS NULL")
    op.execute("UPDATE avaliacoes_fisicas SET massa_muscular = 0 WHERE massa_muscular IS NULL")
    op.execute("UPDATE avaliacoes_fisicas SET observacao = '' WHERE observacao IS NULL")
    op.alter_column('avaliacoes_fisicas', 'observacao', existing_type=sa.String(length=500), nullable=False)
    op.alter_column('avaliacoes_fisicas', 'massa_muscular', existing_type=sa.Float(), nullable=False)
    op.alter_column('avaliacoes_fisicas', 'percentual_gordura', existing_type=sa.Float(), nullable=False)
    op.drop_constraint('avaliacoes_fisicas_professor_id_fkey', 'avaliacoes_fisicas', type_='foreignkey')
    op.drop_column('avaliacoes_fisicas', 'professor_id')
