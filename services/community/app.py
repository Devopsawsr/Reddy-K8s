#!/usr/bin/env python3
from common.db import fetch_all, fetch_one
from common.server import App

app = App("community")


def list_threads(_query):
    rows = fetch_all(
        """
        SELECT name, title, body,
               to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI UTC') AS "when"
        FROM community_threads
        ORDER BY created_at DESC
        """
    )
    return 200, rows


def post_thread(payload):
    thread = {
        "name": payload.get("name") or "Learner",
        "title": (payload.get("title") or "").strip(),
        "body": (payload.get("body") or "").strip(),
    }
    if not thread["title"] or not thread["body"]:
        return 400, {"message": "Title and question are required."}
    thread = fetch_one(
        """
        INSERT INTO community_threads (name, title, body)
        VALUES (%s, %s, %s)
        RETURNING name, title, body,
                  to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI UTC') AS "when"
        """,
        (thread["name"], thread["title"], thread["body"]),
    )
    return 201, thread


app.get("/api/community", list_threads)
app.post("/api/community", post_thread)

if __name__ == "__main__":
    app.serve()
