"""update_services_schema_icon_duration_drop_price

Revision ID: 8c454d2519c1
Revises: a6258bd3f9f2
Create Date: 2026-08-12 10:06:44.394229

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8c454d2519c1'
down_revision: Union[str, Sequence[str], None] = 'a6258bd3f9f2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Drop the price column
    op.drop_column('services', 'price')

    # 2. Add the icon column with default value
    op.add_column(
        'services',
        sa.Column(
            'icon',
            sa.String(length=50),
            nullable=False,
            server_default='construct-outline'
        )
    )

    # 3. Update existing NULL values in duration before enforcing NOT NULL (Prevents migration errors)
    op.execute("UPDATE services SET duration = '30 mins' WHERE duration IS NULL")

    # 4. Alter duration to NOT NULL
    op.alter_column('services', 'duration', existing_type=sa.String(length=50), nullable=False)


def downgrade() -> None:
    # Revert duration column back to nullable
    op.alter_column('services', 'duration', existing_type=sa.String(length=50), nullable=True)

    # Remove the icon column
    op.drop_column('services', 'icon')

    # Re-add the price column
    op.add_column('services', sa.Column('price', sa.Float(), nullable=True))
