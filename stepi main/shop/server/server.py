"""
server.py — ბექენდი ონლაინ მაღაზიისთვის (Python, სტანდარტული ბიბლიოთეკით).

ეს ფაილი მხოლოდ HTTP-ზეა პასუხისმგებელი: იღებს მოთხოვნას, ამოწმებს
ავტორიზაციას და მიმართავს models.py-ის კლასებს. SQL აქ არ იწერება.

    db.py      → კავშირი ბაზასთან, სქემა, პაროლის ჰეშირება
    models.py  → მოდელები: Product, User, Cart, Rating, Order …
    server.py  → მარშრუტები და სტატიკური ფაილები

გაშვება:   python server/server.py      →  http://localhost:3000
გაჩერება:  Ctrl+C
"""

import json
import os
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from db import connect, init_db, DB_PATH  # noqa: E402
from models import Category, Product, User, Session, Cart, Rating, Order  # noqa: E402

PORT = int(os.environ.get("PORT", 3000))
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # საიტის ფაილები
SERVER_DIR = os.path.join(ROOT, "server")

MIME = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".ico": "image/x-icon",
    ".md": "text/markdown; charset=utf-8",
}


class Handler(BaseHTTPRequestHandler):
    server_version = "StepStore/1.0"

    # ---------------------------------------------------------------
    # დამხმარეები
    # ---------------------------------------------------------------
    def send_json(self, status, body):
        data = json.dumps(body, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
        self.end_headers()
        self.wfile.write(data)

    def fail(self, status, message):
        self.send_json(status, {"statusCode": status, "message": message})

    def read_body(self):
        length = int(self.headers.get("Content-Length") or 0)
        if not length:
            return {}
        try:
            return json.loads(self.rfile.read(length).decode("utf-8"))
        except (ValueError, UnicodeDecodeError):
            return {}

    def token(self):
        header = self.headers.get("Authorization", "")
        return header[7:] if header.startswith("Bearer ") else None

    def current_user(self, conn):
        return Session.user_for(conn, self.token())

    def log_message(self, fmt, *args):
        sys.stderr.write("  %s\n" % (fmt % args))

    # ---------------------------------------------------------------
    # სტატიკური ფაილები
    # ---------------------------------------------------------------
    def serve_static(self, path):
        rel = "index.html" if path == "/" else path.lstrip("/")
        full = os.path.normpath(os.path.join(ROOT, rel))

        if not full.startswith(ROOT) or full.startswith(SERVER_DIR):
            return self.fail(403, "Forbidden")
        if not os.path.isfile(full):
            return self.fail(404, "Not found")

        with open(full, "rb") as fh:
            data = fh.read()

        self.send_response(200)
        self.send_header("Content-Type", MIME.get(os.path.splitext(full)[1], "application/octet-stream"))
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    # ---------------------------------------------------------------
    # მარშრუტიზაცია
    # ---------------------------------------------------------------
    def handle_request(self, method):
        url = urlparse(self.path)
        path = url.path
        query = {k: v[0] for k, v in parse_qs(url.query).items()}

        if not (path.startswith("/shop/") or path.startswith("/auth")):
            if method == "GET":
                return self.serve_static(path)
            return self.fail(404, "Not found")

        conn = connect()
        try:
            self.route(method, path, query, conn)
        finally:
            conn.close()

    def route(self, method, path, query, conn):
        # ---------------- ნივთები ----------------
        if method == "GET" and path in ("/shop/products/all", "/shop/products/search"):
            return self.send_json(200, Product.search(conn, query))

        if method == "GET" and path.startswith("/shop/products/id/"):
            product = Product.get(conn, path.rsplit("/", 1)[-1])
            if product is None:
                return self.fail(404, "ასეთი ნივთი ვერ მოიძებნა")
            return self.send_json(200, product)

        if method == "GET" and path == "/shop/products/categories":
            return self.send_json(200, Category.all(conn))

        if method == "GET" and path == "/shop/products/brands":
            return self.send_json(200, Product.brands(conn, query.get("category_id")))

        # ---------------- შეფასება ----------------
        if method == "POST" and path == "/shop/products/rate":
            user = self.current_user(conn)
            if user is None:
                return self.fail(401, "საჭიროა ავტორიზაცია")

            body = self.read_body()
            product_id = body.get("productId")
            try:
                value = int(body.get("rate", 0))
            except (TypeError, ValueError):
                value = 0

            if not product_id or not 1 <= value <= 5:
                return self.fail(400, "არასწორი მონაცემები")
            if Product.raw(conn, product_id) is None:
                return self.fail(404, "ასეთი ნივთი ვერ მოიძებნა")

            Rating.upsert(conn, product_id, user, value, body.get("text"))
            return self.send_json(200, Product.get(conn, product_id))

        # ---------------- კალათა ----------------
        if path in ("/shop/cart", "/shop/cart/product", "/shop/cart/checkout"):
            user = self.current_user(conn)
            if user is None:
                return self.fail(401, "საჭიროა ავტორიზაცია")
            user_id = user["id"]

            if method == "GET" and path == "/shop/cart":
                if Cart.for_user(conn, user_id) is None:
                    return self.fail(404, "კალათა ცარიელია")
                return self.send_json(200, Cart.payload(conn, user_id))

            if method == "DELETE" and path == "/shop/cart":
                Cart.clear(conn, user_id)
                return self.send_json(200, Cart.payload(conn, user_id))

            if path == "/shop/cart/product" and method in ("POST", "PATCH", "DELETE"):
                body = self.read_body()
                product_id = body.get("id")
                product = Product.raw(conn, product_id) if product_id else None
                if product is None:
                    return self.fail(404, "ასეთი ნივთი ვერ მოიძებნა")

                if method == "DELETE":
                    Cart.remove_item(conn, user_id, product_id)
                    return self.send_json(200, Cart.payload(conn, user_id))

                try:
                    qty = int(body.get("quantity") or 1)
                except (TypeError, ValueError):
                    qty = 0

                if qty < 1:
                    return self.fail(400, "რაოდენობა უნდა იყოს 1 ან მეტი")
                if qty > product["stock"]:
                    return self.fail(400, f"მარაგშია მხოლოდ {product['stock']} ცალი")
                if method == "POST" and Cart.has_item(conn, user_id, product_id):
                    return self.fail(400, "ნივთი უკვე კალათაშია — გამოიყენეთ PATCH")

                Cart.set_item(conn, user_id, product_id, qty)
                return self.send_json(200, Cart.payload(conn, user_id))

            if method == "POST" and path == "/shop/cart/checkout":
                payload = Cart.payload(conn, user_id)
                if not payload["products"]:
                    return self.fail(400, "კალათა ცარიელია")

                order_id = Order.create_from_cart(conn, user_id, payload)
                return self.send_json(200, {
                    "success": True,
                    "orderId": order_id,
                    "total": payload["total"]["price"]["current"],
                    "message": "შეკვეთა წარმატებით გაფორმდა",
                })

        # ---------------- ავტორიზაცია ----------------
        if method == "POST" and path == "/auth/sign_up":
            body = self.read_body()
            required = ("email", "password", "firstName", "lastName")
            if not all(body.get(field) for field in required):
                return self.fail(400, "შეავსეთ ყველა სავალდებულო ველი")
            if len(str(body["password"])) < 6:
                return self.fail(400, "პაროლი უნდა იყოს მინიმუმ 6 სიმბოლო")
            if User.email_taken(conn, body["email"]):
                return self.fail(409, "ასეთი ელ. ფოსტა უკვე რეგისტრირებულია")

            user_id = User.create(conn, body)
            return self.send_json(201, {"message": "რეგისტრაცია წარმატებულია", "userId": user_id})

        if method == "POST" and path == "/auth/sign_in":
            body = self.read_body()
            user = User.by_email(conn, body.get("email"))
            if not User.check_password(user, body.get("password")):
                return self.fail(401, "ელ. ფოსტა ან პაროლი არასწორია")

            token = Session.create(conn, user["id"])
            return self.send_json(200, {
                "access_token": token,
                "refresh_token": token,
                "user": User.serialize(user),
            })

        if method == "GET" and path == "/auth":
            user = self.current_user(conn)
            if user is None:
                return self.fail(401, "საჭიროა ავტორიზაცია")
            return self.send_json(200, User.serialize(user))

        if method == "GET" and path.startswith("/auth/id/"):
            user = User.by_id(conn, path.rsplit("/", 1)[-1])
            if user is None:
                return self.fail(404, "მომხმარებელი ვერ მოიძებნა")
            return self.send_json(200, User.serialize(user))

        if method == "POST" and path == "/auth/sign_out":
            token = self.token()
            if token:
                Session.delete(conn, token)
            return self.send_json(200, {"message": "წარმატებით გახვედით"})

        if method == "GET" and path == "/shop/orders":
            user = self.current_user(conn)
            if user is None:
                return self.fail(401, "საჭიროა ავტორიზაცია")
            return self.send_json(200, Order.for_user(conn, user["id"]))

        return self.fail(404, "ასეთი endpoint არ არსებობს")

    # ---------------------------------------------------------------
    # HTTP მეთოდები
    # ---------------------------------------------------------------
    def do_GET(self):
        self.handle_request("GET")

    def do_POST(self):
        self.handle_request("POST")

    def do_PATCH(self):
        self.handle_request("PATCH")

    def do_DELETE(self):
        self.handle_request("DELETE")

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
        self.end_headers()


def main():
    fresh = init_db()
    line = "─" * 54
    print(line)
    print("  ონლაინ მაღაზია მუშაობს")
    print(f"  საიტი:  http://localhost:{PORT}")
    print(f"  ბაზა:   {os.path.relpath(DB_PATH, ROOT)} "
          f"{'(ახლად შეიქმნა და შეივსო)' if fresh else '(არსებული)'}")
    print("  გასაჩერებლად დააჭირეთ Ctrl+C")
    print(line)

    server = ThreadingHTTPServer(("", PORT), Handler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n  სერვერი გაჩერდა")
        server.server_close()


if __name__ == "__main__":
    main()
