"""change_customer_role_to_user

Revision ID: 2e2f89d86633
Revises: a78e714f1ce8
Create Date: 2026-08-26 03:36:17.210071

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2e2f89d86633'
down_revision: Union[str, Sequence[str], None] = 'a78e714f1ce8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Update all rows where role is 'customer' to 'user'
    op.execute(
        "UPDATE users SET role = 'user' WHERE role = 'customer';"
    )


def downgrade() -> None:
    # Revert 'user' back to 'customer' if you ever rollback
    op.execute(
        "UPDATE users SET role = 'customer' WHERE role = 'user';"
    )