#!/usr/bin/env python3
from common.server import App
from common.db import fetch_one
from common.store import digest
from psycopg.errors import UniqueViolation

app = App("auth")


def signup(payload):
    name = (payload.get("name") or "").strip()
    email = (payload.get("email") or "").strip().lower()
    password = payload.get("password") or ""
    if not name or not email or len(password) < 6:
        return 400, {"message": "Name, email, and a 6+ character password are required."}
    try:
        row = fetch_one(
            """
            INSERT INTO users (name, email, password_hash)
            VALUES (%s, %s, %s)
            RETURNING name, email
            """,
            (name, email, digest(password)),
        )
    except UniqueViolation:
        return 409, {"message": "That email already has an account. Login instead."}
    return 201, row


def login(payload):
    email = (payload.get("email") or "").strip().lower()
    password = payload.get("password") or ""
    hit = fetch_one(
        """
        SELECT name, email
        FROM users
        WHERE email = %s AND password_hash = %s
        """,
        (email, digest(password)),
    )
    if not hit:
        return 401, {"message": "Email or password is wrong."}
    return 200, {"name": hit["name"], "email": hit["email"]}


app.post("/api/signup", signup)
app.post("/api/login", login)

if __name__ == "__main__":
    app.serve()
