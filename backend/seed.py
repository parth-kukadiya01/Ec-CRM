"""
Seed script entry point.
Invokes init_clean_db to ensure database tables, official users, roles and core companies/partners are seeded.
"""

from init_clean_db import init_clean_db

def seed_db():
    init_clean_db()

if __name__ == "__main__":
    seed_db()
