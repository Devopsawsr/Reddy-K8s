#!/usr/bin/env python3
from common.books import BOOKS
from common.server import App

app = App("inventory")
STOCK = {book["id"]: 8 + ((index * 7) % 34) for index, book in enumerate(BOOKS)}

def inventory(query):
    book_id = query.get("book_id")
    if book_id:
        if book_id not in STOCK:
            return 404, {"message": "Book not found"}
        quantity = STOCK[book_id]
        return 200, {"book_id": book_id, "quantity": quantity, "available": quantity > 0}
    return 200, {"items": [{"book_id": key, "quantity": value, "available": value > 0} for key, value in STOCK.items()]}

app.get("/api/inventory", inventory)

if __name__ == "__main__":
    app.serve()

