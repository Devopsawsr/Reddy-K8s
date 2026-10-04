#!/usr/bin/env python3
from common.db import fetch_all, fetch_one
from common.server import App

app = App("certificates")


def list_certs(_query):
    rows = fetch_all(
        """
        SELECT 'CERT-' || lpad(certificate_id::text, 4, '0') AS id,
               name, email, book, score,
               issued_on::text AS "when", valid_until::text,
               valid_for, wish
        FROM certificates
        ORDER BY certificate_id DESC
        """
    )
    return 200, rows


def issue(payload):
    cert = fetch_one(
        """
        INSERT INTO certificates
            (name, email, book, score, issued_on, valid_until, valid_for, wish)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING 'CERT-' || lpad(certificate_id::text, 4, '0') AS id,
                  name, email, book, score,
                  issued_on::text AS "when", valid_until::text,
                  valid_for, wish
        """,
        (
            payload.get("name") or "Learner",
            (payload.get("email") or "").lower(),
            payload.get("book") or "",
            int(payload.get("score") or 0),
            payload.get("when"),
            payload.get("valid_until"),
            payload.get("valid_for") or "1 year",
            payload.get("wish") or "",
        ),
    )
    return 201, cert


app.get("/api/certificates", list_certs)
app.post("/api/certificates", issue)

if __name__ == "__main__":
    app.serve()
