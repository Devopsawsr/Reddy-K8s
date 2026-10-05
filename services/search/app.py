#!/usr/bin/env python3
from common.books import BOOKS
from common.server import App

app = App("search")

def search(query):
    term = query.get("q", "").strip().lower()
    category = query.get("category", "All").strip().lower()
    rows = [
        book for book in BOOKS
        if (not term or term in " ".join([
            book["name"], book["category"], book["level"], book["description"]
        ]).lower())
        and (category == "all" or book["category"].lower() == category)
    ]
    return 200, {"items": rows, "count": len(rows), "query": term}

app.get("/api/search", search)

if __name__ == "__main__":
    app.serve()

