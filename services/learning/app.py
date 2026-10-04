#!/usr/bin/env python3
import os
from datetime import datetime, timedelta, timezone

from common.books import NAMES
from common.db import fetch_all, fetch_one
from common.http import post_json
from common.server import App

app = App("learning")
CERTIFICATES_URL = os.environ.get("CERTIFICATES_URL", "http://certificates:8080")


def list_exams(_query):
    rows = fetch_all(
        """
        SELECT name, email, book, score, passed,
               to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI UTC') AS "when"
        FROM exam_results
        ORDER BY created_at DESC
        """
    )
    return 200, rows


def sit_exam(payload):
    score = int(payload.get("score") or 0)
    book_id = payload.get("book_id") or ""
    passed = score >= 70
    email = (payload.get("email") or "").lower()
    name = (payload.get("name") or "").strip()
    if not name:
        hit = fetch_one("SELECT name FROM users WHERE email = %s", (email,))
        name = (hit or {}).get("name") or (email.split("@")[0] if email else "Learner")
    row = fetch_one(
        """
        INSERT INTO exam_results (name, email, book, score, passed)
        VALUES (%s, %s, %s, %s, %s)
        RETURNING name, email, book, score, passed,
                  to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI UTC') AS "when"
        """,
        (name, email, NAMES.get(book_id, book_id), score, passed),
    )
    if passed:
        issued = datetime.now(timezone.utc)
        until = issued + timedelta(days=365)
        cert = {
            "name": name,
            "email": row["email"],
            "book": row["book"],
            "score": score,
            "when": issued.strftime("%Y-%m-%d"),
            "valid_until": until.strftime("%Y-%m-%d"),
            "valid_for": "1 year",
            "wish": "All the best for the year ahead.",
        }
        issued_cert = post_json(f"{CERTIFICATES_URL}/api/certificates", cert)
        if issued_cert:
            row["certificate"] = issued_cert
    return 200, row


app.get("/api/exams", list_exams)
app.post("/api/exam", sit_exam)

if __name__ == "__main__":
    app.serve()
