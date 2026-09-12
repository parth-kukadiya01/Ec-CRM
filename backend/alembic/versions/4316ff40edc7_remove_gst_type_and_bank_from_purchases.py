"""remove_gst_type_and_bank_from_purchases

Revision ID: 4316ff40edc7
Revises: 0001_initial_schema
Create Date: 2026-09-12 12:33:12.044260

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4316ff40edc7'
down_revision: Union[str, Sequence[str], None] = '0001_initial_schema'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    conn = op.get_bind()
    for col in ['bank', 'gst_type']:
        try:
            conn.execute(sa.text(f"ALTER TABLE purchases DROP COLUMN {col}"))
        except Exception:
            pass


def downgrade() -> None:
    """Downgrade schema."""
    conn = op.get_bind()
    try:
        conn.execute(sa.text("ALTER TABLE purchases ADD COLUMN gst_type VARCHAR(50) DEFAULT 'GST'"))
    except Exception:
        pass
    try:
        conn.execute(sa.text("ALTER TABLE purchases ADD COLUMN bank VARCHAR(150)"))
    except Exception:
        pass
