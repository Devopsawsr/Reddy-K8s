#!/usr/bin/env python3
from common.books import NAMES
from common.db import fetch_all, fetch_one
from common.server import App
from psycopg.types.json import Jsonb

app = App("orders")


def list_orders(_query):
    rows = fetch_all(
        """
        SELECT name, email, books,
               to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI UTC') AS "when"
        FROM orders
        ORDER BY created_at DESC
        """
    )
    return 200, rows


def buy(payload):
    items = payload.get("items") or []
    books = ", ".join(NAMES.get(i.get("id"), i.get("id")) for i in items)
    row = fetch_one(
        """
        INSERT INTO orders (name, email, books, items)
        VALUES (%s, %s, %s, %s)
        RETURNING name, email, books,
                  to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI UTC') AS "when"
        """,
        (
            payload.get("name") or "Learner",
            (payload.get("email") or "").lower(),
            books,
            Jsonb(items),
        ),
    )
    return 201, {"message": f"Purchased: {books}", "order": row}


app.get("/api/orders", list_orders)
app.post("/api/buy", buy)

if __name__ == "__main__":
    app.serve()
