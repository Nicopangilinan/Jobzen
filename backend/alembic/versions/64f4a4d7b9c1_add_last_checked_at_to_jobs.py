"""add_last_checked_at_to_jobs

Revision ID: 64f4a4d7b9c1
Revises: 38fcc32db4aa
Create Date: 2026-07-02 10:50:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "64f4a4d7b9c1"
down_revision: Union[str, None] = "38fcc32db4aa"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("jobs", sa.Column("last_checked_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("jobs", "last_checked_at")
