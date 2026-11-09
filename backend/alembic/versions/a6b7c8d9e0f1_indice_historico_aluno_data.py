"""indice composto em historicos_execucao (aluno_id, data_execucao)

Revision ID: a6b7c8d9e0f1
Revises: f5a6b7c8d9e0
Create Date: 2026-11-07 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'a6b7c8d9e0f1'
down_revision: Union[str, Sequence[str], None] = 'f5a6b7c8d9e0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_index('ix_historicos_execucao_aluno_data', 'historicos_execucao', ['aluno_id', 'data_execucao'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_historicos_execucao_aluno_data', table_name='historicos_execucao')
