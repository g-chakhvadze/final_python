"""
models.py — მონაცემთა მოდელები.

ყოველი კლასი ერთ ცხრილს შეესაბამება და თავის თავში კრავს მასთან მუშაობის
ყველა SQL მოთხოვნას. server.py მხოლოდ ამ კლასებს მიმართავს და თვითონ
SQL-ს აღარ წერს.

    Category  — კატეგორიები
    Product   — ნივთები (+ ძიება, ფილტრაცია, მარაგი)
    User      — მომხმარებლები (+ პაროლის შემოწმება)
    Session   — ავტორიზაციის ტოკენები
    Cart      — კალათა და მასში არსებული ნივთები
    Rating    — შეფასებები
    Order     — შეკვეთები
"""

import json

from db import new_id, now_iso, hash_password, verify_password


# ===========================================================================
# Category
# ===========================================================================
class Category:
    TABLE = "categories"

    @staticmethod
    def all(conn):
        """ყველა კატეგორია ნივთების რაოდენობით."""
        rows = conn.execute(
            """SELECT c.id, c.name, c.image, COUNT(p.id) AS count
               FROM categories c
               LEFT JOIN products p ON p.category_id = c.id
               GROUP BY c.id
               ORDER BY c.name"""
        ).fetchall()
        return [dict(r) for r in rows]


# ===========================================================================
# Product
# ===========================================================================
class Product:
    TABLE = "products"

    SELECT = """
        SELECT p.id, p.title, p.brand, p.category_id, p.description, p.price,
               p.before_price, p.currency, p.stock, p.warranty, p.issue_date,
               p.thumbnail, p.images,
               c.name AS category_name, c.image AS category_image,
               IFNULL((SELECT AVG(value) FROM ratings WHERE product_id = p.id), 0) AS avg_rating
        FROM products p
        JOIN categories c ON c.id = p.category_id
    """

    SORT_COLUMNS = {"price": "p.price", "rating": "avg_rating", "title": "p.title"}

    # ---------------- წაკითხვა ----------------
    @classmethod
    def get(cls, conn, product_id):
        """ერთი ნივთი შეფასებებთან ერთად, ან None."""
        row = conn.execute(cls.SELECT + " WHERE p.id = ?", (product_id,)).fetchone()
        if row is None:
            return None
        return cls.serialize(row, Rating.for_product(conn, product_id))

    @staticmethod
    def raw(conn, product_id):
        """ნედლი მწკრივი — სადაც მხოლოდ მარაგი ან ფასი გვჭირდება."""
        return conn.execute("SELECT * FROM products WHERE id = ?", (product_id,)).fetchone()

    @classmethod
    def search(cls, conn, filters):
        """ძიება და ფილტრაცია. აბრუნებს {products, total, limit, skip, page}."""
        where, params = [], []

        if filters.get("keywords"):
            like = f"%{filters['keywords'].lower()}%"
            where.append(
                "(LOWER(p.title) LIKE ? OR LOWER(p.brand) LIKE ? OR LOWER(p.description) LIKE ?)"
            )
            params += [like, like, like]

        if filters.get("category_id"):
            where.append("p.category_id = ?")
            params.append(filters["category_id"])

        if filters.get("brand"):
            where.append("p.brand = ?")
            params.append(filters["brand"])

        if filters.get("price_min"):
            where.append("p.price >= ?")
            params.append(float(filters["price_min"]))

        if filters.get("price_max"):
            where.append("p.price <= ?")
            params.append(float(filters["price_max"]))

        if filters.get("rating"):
            where.append("avg_rating >= ?")
            params.append(float(filters["rating"]))

        where_sql = (" WHERE " + " AND ".join(where)) if where else ""

        column = cls.SORT_COLUMNS.get(filters.get("sort_by"))
        direction = "DESC" if str(filters.get("sort_direction", "")).lower() == "desc" else "ASC"
        order_sql = f" ORDER BY {column} {direction}" if column else " ORDER BY p.title ASC"

        page_size = min(int(filters.get("page_size") or 12), 100)
        page_index = max(int(filters.get("page_index") or 0), 0)

        total = conn.execute(
            f"SELECT COUNT(*) AS n FROM ({cls.SELECT}{where_sql})", params
        ).fetchone()["n"]

        rows = conn.execute(
            f"{cls.SELECT}{where_sql}{order_sql} LIMIT ? OFFSET ?",
            params + [page_size, page_index * page_size],
        ).fetchall()

        return {
            "products": [cls.serialize(r, Rating.for_product(conn, r["id"])) for r in rows],
            "total": total,
            "limit": page_size,
            "skip": page_index * page_size,
            "page": page_index,
        }

    @staticmethod
    def brands(conn, category_id=None):
        """ბრენდები; კატეგორიის მითითებისას მხოლოდ იმ კატეგორიის ბრენდები."""
        if category_id:
            rows = conn.execute(
                """SELECT brand AS name, COUNT(*) AS count FROM products
                   WHERE category_id = ? GROUP BY brand ORDER BY brand""",
                (category_id,),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT brand AS name, COUNT(*) AS count FROM products GROUP BY brand ORDER BY brand"
            ).fetchall()
        return [dict(r) for r in rows]

    # ---------------- ცვლილება ----------------
    @staticmethod
    def decrease_stock(conn, product_id, quantity):
        """მარაგის შემცირება შეკვეთისას (უარყოფითში არ ჩავარდება)."""
        conn.execute(
            "UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?",
            (quantity, product_id, quantity),
        )

    # ---------------- სერიალიზაცია ----------------
    @staticmethod
    def serialize(row, ratings):
        """ბაზის მწკრივი → JSON, როგორსაც ფრონტენდი ელოდება."""
        price, before = row["price"], row["before_price"]
        discount = round((before - price) / before * 100) if before > price else 0
        avg = sum(r["value"] for r in ratings) / len(ratings) if ratings else 0

        return {
            "_id": row["id"],
            "title": row["title"],
            "brand": row["brand"],
            "description": row["description"],
            "issueDate": row["issue_date"],
            "thumbnail": row["thumbnail"],
            "images": json.loads(row["images"] or "[]"),
            "stock": row["stock"],
            "warranty": row["warranty"],
            "rating": round(avg, 1),
            "price": {
                "current": price,
                "currency": row["currency"],
                "beforeDiscount": before,
                "discountPercentage": discount,
            },
            "category": {
                "id": row["category_id"],
                "name": row["category_name"],
                "image": row["category_image"],
            },
            "ratings": [Rating.serialize(r) for r in ratings],
        }


# ===========================================================================
# User
# ===========================================================================
class User:
    TABLE = "users"

    @staticmethod
    def by_email(conn, email):
        return conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()

    @staticmethod
    def by_id(conn, user_id):
        return conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()

    @staticmethod
    def email_taken(conn, email):
        return conn.execute("SELECT 1 FROM users WHERE email = ?", (email,)).fetchone() is not None

    @staticmethod
    def create(conn, data):
        """ახალი მომხმარებელი. პაროლი ბაზაში მხოლოდ ჰეშად ინახება."""
        password_hash, salt = hash_password(data["password"])
        user_id = new_id()
        conn.execute(
            """INSERT INTO users
               (id, first_name, last_name, email, password, salt,
                age, address, phone, zipcode, gender, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                user_id,
                data["firstName"],
                data["lastName"],
                data["email"],
                password_hash,
                salt,
                data.get("age"),
                data.get("address"),
                data.get("phone"),
                data.get("zipcode"),
                data.get("gender"),
                now_iso(),
            ),
        )
        conn.commit()
        return user_id

    @staticmethod
    def check_password(row, password):
        if row is None or not password:
            return False
        return verify_password(password, row["password"], row["salt"])

    @staticmethod
    def full_name(row):
        return f"{row['first_name']} {row['last_name']}".strip()

    @staticmethod
    def serialize(row):
        """საჯარო მონაცემები — პაროლისა და salt-ის გარეშე."""
        return {
            "_id": row["id"],
            "firstName": row["first_name"],
            "lastName": row["last_name"],
            "email": row["email"],
            "age": row["age"],
            "address": row["address"],
            "phone": row["phone"],
            "zipcode": row["zipcode"],
            "gender": row["gender"],
            "createdAt": row["created_at"],
        }


# ===========================================================================
# Session — ავტორიზაციის ტოკენები
# ===========================================================================
class Session:
    TABLE = "sessions"

    @staticmethod
    def create(conn, user_id):
        token = new_id() + new_id()
        conn.execute(
            "INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)",
            (token, user_id, now_iso()),
        )
        conn.commit()
        return token

    @staticmethod
    def user_for(conn, token):
        """ტოკენის მფლობელი მომხმარებელი, ან None."""
        if not token:
            return None
        row = conn.execute("SELECT * FROM sessions WHERE token = ?", (token,)).fetchone()
        return User.by_id(conn, row["user_id"]) if row else None

    @staticmethod
    def delete(conn, token):
        conn.execute("DELETE FROM sessions WHERE token = ?", (token,))
        conn.commit()


# ===========================================================================
# Cart
# ===========================================================================
class Cart:
    TABLE = "carts"

    @staticmethod
    def for_user(conn, user_id, create=False):
        cart = conn.execute("SELECT * FROM carts WHERE user_id = ?", (user_id,)).fetchone()
        if cart is None and create:
            cart_id = new_id()
            conn.execute(
                "INSERT INTO carts (id, user_id, created_at) VALUES (?, ?, ?)",
                (cart_id, user_id, now_iso()),
            )
            conn.commit()
            cart = conn.execute("SELECT * FROM carts WHERE id = ?", (cart_id,)).fetchone()
        return cart

    @staticmethod
    def empty():
        return {
            "products": [],
            "total": {"price": {"current": 0, "beforeDiscount": 0}, "quantity": 0, "products": 0},
        }

    @classmethod
    def payload(cls, conn, user_id):
        """კალათა ჯამებით — ზუსტად იმ ფორმით, რასაც ფრონტენდი კითხულობს."""
        cart = cls.for_user(conn, user_id)
        if cart is None:
            return cls.empty()

        rows = conn.execute(
            """SELECT ci.product_id, ci.quantity, p.price, p.before_price
               FROM cart_items ci
               JOIN products p ON p.id = ci.product_id
               WHERE ci.cart_id = ?""",
            (cart["id"],),
        ).fetchall()

        products = [
            {
                "productId": r["product_id"],
                "quantity": r["quantity"],
                "pricePerQuantity": r["price"],
                "beforeDiscountPrice": r["before_price"],
            }
            for r in rows
        ]

        current = sum(p["pricePerQuantity"] * p["quantity"] for p in products)
        before = sum(p["beforeDiscountPrice"] * p["quantity"] for p in products)

        return {
            "_id": cart["id"],
            "products": products,
            "total": {
                "price": {"current": round(current, 2), "beforeDiscount": round(before, 2)},
                "quantity": sum(p["quantity"] for p in products),
                "products": len(products),
            },
        }

    @classmethod
    def has_item(cls, conn, user_id, product_id):
        cart = cls.for_user(conn, user_id)
        if cart is None:
            return False
        return conn.execute(
            "SELECT 1 FROM cart_items WHERE cart_id = ? AND product_id = ?",
            (cart["id"], product_id),
        ).fetchone() is not None

    @classmethod
    def set_item(cls, conn, user_id, product_id, quantity):
        """ნივთის დამატება ან რაოდენობის განახლება."""
        cart = cls.for_user(conn, user_id, create=True)
        conn.execute(
            """INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (?, ?, ?)
               ON CONFLICT (cart_id, product_id) DO UPDATE SET quantity = excluded.quantity""",
            (cart["id"], product_id, quantity),
        )
        conn.commit()

    @classmethod
    def remove_item(cls, conn, user_id, product_id):
        cart = cls.for_user(conn, user_id)
        if cart is not None:
            conn.execute(
                "DELETE FROM cart_items WHERE cart_id = ? AND product_id = ?",
                (cart["id"], product_id),
            )
            conn.commit()

    @classmethod
    def clear(cls, conn, user_id):
        cart = cls.for_user(conn, user_id)
        if cart is not None:
            conn.execute("DELETE FROM cart_items WHERE cart_id = ?", (cart["id"],))
            conn.commit()


# ===========================================================================
# Rating
# ===========================================================================
class Rating:
    TABLE = "ratings"

    @staticmethod
    def for_product(conn, product_id):
        return conn.execute(
            "SELECT * FROM ratings WHERE product_id = ? ORDER BY created_at DESC",
            (product_id,),
        ).fetchall()

    @staticmethod
    def upsert(conn, product_id, user_row, value, text=None):
        """ერთ მომხმარებელს ერთ ნივთზე ერთი შეფასება აქვს — ხელახლა შეფასება
        ძველს ანახლებს (UNIQUE product_id + user_id)."""
        conn.execute(
            """INSERT INTO ratings (id, product_id, user_id, author, value, text, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT (product_id, user_id)
               DO UPDATE SET value = excluded.value,
                             text = excluded.text,
                             created_at = excluded.created_at""",
            (
                new_id(),
                product_id,
                user_row["id"],
                User.full_name(user_row),
                value,
                text or None,
                now_iso(),
            ),
        )
        conn.commit()

    @staticmethod
    def serialize(row):
        return {
            "userId": row["user_id"],
            "name": row["author"],
            "text": row["text"],
            "value": row["value"],
            "createdAt": row["created_at"],
        }


# ===========================================================================
# Order
# ===========================================================================
class Order:
    TABLE = "orders"

    @staticmethod
    def create_from_cart(conn, user_id, payload):
        """შეკვეთის ჩაწერა, მარაგის შემცირება და კალათის გასუფთავება."""
        order_id = new_id()
        conn.execute(
            "INSERT INTO orders (id, user_id, total, created_at) VALUES (?, ?, ?, ?)",
            (order_id, user_id, payload["total"]["price"]["current"], now_iso()),
        )

        for item in payload["products"]:
            conn.execute(
                """INSERT INTO order_items (order_id, product_id, quantity, price)
                   VALUES (?, ?, ?, ?)""",
                (order_id, item["productId"], item["quantity"], item["pricePerQuantity"]),
            )
            Product.decrease_stock(conn, item["productId"], item["quantity"])

        Cart.clear(conn, user_id)
        conn.commit()
        return order_id

    @staticmethod
    def for_user(conn, user_id):
        """მომხმარებლის შეკვეთების ისტორია."""
        rows = conn.execute(
            "SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC", (user_id,)
        ).fetchall()
        return [dict(r) for r in rows]
