#!/usr/bin/env python3
from common.server import App
from common.db import fetch_one
from psycopg.types.json import Jsonb

app = App("cart")


def get_cart(query):
    email = (query.get("email") or "").strip().lower()
    hit = fetch_one("SELECT email, items FROM carts WHERE email = %s", (email,))
    hit = hit or {"email": email, "items": []}
    return 200, hit


def save_cart(payload):
    email = (payload.get("email") or "").strip().lower()
    items = payload.get("items") or []
    if not email:
        return 400, {"message": "Email is required."}
    row = fetch_one(
        """
        INSERT INTO carts (email, items)
        VALUES (%s, %s)
        ON CONFLICT (email)
        DO UPDATE SET items = EXCLUDED.items, updated_at = CURRENT_TIMESTAMP
        RETURNING email, items
        """,
        (email, Jsonb(items)),
    )
    return 200, row


app.get("/api/cart", get_cart)
app.post("/api/cart", save_cart)

if __name__ == "__main__":
    app.serve()
