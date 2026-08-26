"""add default role and fix empty roles

Revision ID: 51b909072f2c
Revises: f00e080a3c6a
Create Date: 2026-08-25 13:42:41.306100

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '51b909072f2c'
down_revision: Union[str, Sequence[str], None] = 'f00e080a3c6a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Update any existing rows where role is null or empty string to 'customer'
    op.execute("UPDATE users SET role = 'customer' WHERE role IS NULL OR role = ''")
    
    # 2. Set your specific email to admin (optional, or do this manually in your DB client)
    op.execute("UPDATE users SET role = 'admin' WHERE email = 'dawudhassan321@gmail.com'")

    # 3. Alter column to have a server default of 'customer' for future rows
    op.alter_column('users', 'role',
               existing_type=sa.String(),
               server_default='customer',
               existing_nullable=True)


def downgrade() -> None:
    """Downgrade schema."""
    pass
