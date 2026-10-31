"""indice unico parcial: uma sessao aberta por aluno e treino

Revision ID: f5a6b7c8d9e0
Revises: e4f5a6b7c8d9
Create Date: 2026-10-30 15:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f5a6b7c8d9e0'
down_revision: Union[str, Sequence[str], None] = 'e4f5a6b7c8d9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_index(
        'uq_sessoes_treino_aberta', 'sessoes_treino', ['aluno_id', 'treino_id'], unique=True,
        sqlite_where=sa.text('finalizada_em IS NULL'),
        postgresql_where=sa.text('finalizada_em IS NULL'),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('uq_sessoes_treino_aberta', table_name='sessoes_treino')
