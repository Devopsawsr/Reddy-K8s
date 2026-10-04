import os

import psycopg
from psycopg.rows import dict_row


def connect():
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL is required")
    return psycopg.connect(database_url, row_factory=dict_row)


def fetch_all(sql, params=()):
    with connect() as connection:
        with connection.cursor() as cursor:
            cursor.execute(sql, params)
            return cursor.fetchall()


def fetch_one(sql, params=()):
    with connect() as connection:
        with connection.cursor() as cursor:
            cursor.execute(sql, params)
            return cursor.fetchone()


def execute(sql, params=()):
    with connect() as connection:
        with connection.cursor() as cursor:
            cursor.execute(sql, params)
