from flask import Flask, render_template

from app.routes.api import api_bp


def create_app():
    app = Flask(__name__)
    app.register_blueprint(api_bp)

    @app.route("/")
    def index():
        return render_template("index.html")

    return app
