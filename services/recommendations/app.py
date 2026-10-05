#!/usr/bin/env python3
from common.books import BOOKS
from common.server import App

app = App("recommendations")

def recommendations(query):
    book_id = query.get("book_id", "")
    source = next((book for book in BOOKS if book["id"] == book_id), None)
    category = source["category"] if source else query.get("category", "DevOps")
    rows = [book for book in BOOKS if book["id"] != book_id and book["category"].lower() == category.lower()]
    rows.sort(key=lambda book: (-book["rating"], book["name"]))
    return 200, {"items": rows[:6], "based_on": book_id or category}

app.get("/api/recommendations", recommendations)

if __name__ == "__main__":
    app.serve()

