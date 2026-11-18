"""
db.py — SQLite ბაზა ონლაინ მაღაზიისთვის.

იყენებს მხოლოდ Python-ის სტანდარტულ ბიბლიოთეკას (sqlite3, hashlib),
ამიტომ არანაირი pip install არ არის საჭირო.

სქემა იქმნება ავტომატურად, პირველივე გაშვებაზე ივსება seed.json-იდან.
"""

import hashlib
import json
import os
import secrets
import sqlite3
import uuid
from datetime import datetime, timezone

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "shop.db")
SEED_PATH = os.path.join(BASE_DIR, "seed.json")


# ---------------------------------------------------------------------------
# კავშირი
# ---------------------------------------------------------------------------
def connect():
    """ახალი კავშირი ბაზასთან. sqlite3.Row საშუალებას იძლევა სვეტებს სახელით მივმართოთ."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode = WAL")
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


# ---------------------------------------------------------------------------
# 1. სქემა
# ---------------------------------------------------------------------------
SCHEMA = """
CREATE TABLE IF NOT EXISTS categories (
    id    TEXT PRIMARY KEY,
    name  TEXT NOT NULL,
    image TEXT
);

CREATE TABLE IF NOT EXISTS products (
    id           TEXT PRIMARY KEY,
    title        TEXT    NOT NULL,
    brand        TEXT    NOT NULL,
    category_id  TEXT    NOT NULL REFERENCES categories(id),
    description  TEXT,
    price        REAL    NOT NULL,
    before_price REAL    NOT NULL,
    currency     TEXT    NOT NULL DEFAULT 'USD',
    stock        INTEGER NOT NULL DEFAULT 0,
    warranty     TEXT,
    issue_date   TEXT,
    thumbnail    TEXT,
    images       TEXT
);

CREATE TABLE IF NOT EXISTS users (
    id         TEXT PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name  TEXT NOT NULL,
    email      TEXT NOT NULL UNIQUE,
    password   TEXT NOT NULL,          -- scrypt ჰეში
    salt       TEXT NOT NULL,
    age        INTEGER,
    address    TEXT,
    phone      TEXT,
    zipcode    TEXT,
    gender     TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
    token      TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS carts (
    id         TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cart_items (
    cart_id    TEXT NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES products(id),
    quantity   INTEGER NOT NULL CHECK (quantity > 0),
    PRIMARY KEY (cart_id, product_id)
);

CREATE TABLE IF NOT EXISTS ratings (
    id         TEXT PRIMARY KEY,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    user_id    TEXT NOT NULL,
    author     TEXT,
    value      INTEGER NOT NULL CHECK (value BETWEEN 1 AND 5),
    text       TEXT,
    created_at TEXT NOT NULL,
    UNIQUE (product_id, user_id)
);

CREATE TABLE IF NOT EXISTS orders (
    id         TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    total      REAL NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS order_items (
    order_id   TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES products(id),
    quantity   INTEGER NOT NULL,
    price      REAL NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_brand    ON products(brand);
CREATE INDEX IF NOT EXISTS idx_ratings_product   ON ratings(product_id);
"""


def init_db():
    """ქმნის სქემას და, თუ ბაზა ცარიელია, ავსებს seed.json-იდან.
    აბრუნებს True-ს, თუ მონაცემები ახლად ჩაიწერა."""
    conn = connect()
    try:
        conn.executescript(SCHEMA)
        conn.commit()

        count = conn.execute("SELECT COUNT(*) AS n FROM products").fetchone()["n"]
        if count:
            return False

        with open(SEED_PATH, encoding="utf-8") as fh:
            data = json.load(fh)

        for c in data["categories"]:
            conn.execute(
                "INSERT INTO categories (id, name, image) VALUES (?, ?, ?)",
                (c["id"], c["name"], c.get("image")),
            )

        for p in data["products"]:
            pid = p["_id"].removeprefix("local-")
            conn.execute(
                """INSERT INTO products
                   (id, title, brand, category_id, description, price, before_price,
                    currency, stock, warranty, issue_date, thumbnail, images)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    pid,
                    p["title"],
                    p["brand"],
                    p["category"]["id"],
                    p.get("description"),
                    p["price"]["current"],
                    p["price"]["beforeDiscount"],
                    p["price"].get("currency", "USD"),
                    p.get("stock", 0),
                    p.get("warranty"),
                    p.get("issueDate"),
                    p.get("thumbnail"),
                    json.dumps(p.get("images", []), ensure_ascii=False),
                ),
            )

            for r in p.get("ratings", []):
                conn.execute(
                    """INSERT INTO ratings
                       (id, product_id, user_id, author, value, text, created_at)
                       VALUES (?, ?, ?, ?, ?, ?, ?)""",
                    (
                        new_id(),
                        pid,
                        r["userId"],
                        r.get("name"),
                        r["value"],
                        r.get("text"),
                        r["createdAt"],
                    ),
                )

        conn.commit()
        return True
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# 2. დამხმარეები (სერიალიზაცია models.py-შია)
# ---------------------------------------------------------------------------
def new_id():
    return str(uuid.uuid4())


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def hash_password(password, salt=None):
    """scrypt — იგივე პარამეტრებით, რითაც Node-ის ვერსია მუშაობს."""
    salt = salt or secrets.token_hex(16)
    digest = hashlib.scrypt(
        password.encode("utf-8"), salt=salt.encode("utf-8"), n=16384, r=8, p=1, dklen=64
    )
    return digest.hex(), salt


def verify_password(password, stored_hash, salt):
    check, _ = hash_password(password, salt)
    return secrets.compare_digest(check, stored_hash)
