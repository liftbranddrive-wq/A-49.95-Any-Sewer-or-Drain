"""clear all push tokens

Revision ID: f90e6f45403e
Revises: 51b909072f2c
Create Date: 2026-08-25 14:02:46.623649

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f90e6f45403e'
down_revision: Union[str, Sequence[str], None] = '51b909072f2c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Set push_token to NULL for all users in the database
    op.execute("UPDATE users SET push_token = NULL")


def downgrade() -> None:
    """Downgrade schema."""
    pass
