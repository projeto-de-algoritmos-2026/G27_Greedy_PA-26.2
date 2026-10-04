from flask import Blueprint, jsonify

from app.core.filmes import FILMES
from app.core.interval_partitioning import particionar_salas

api_bp = Blueprint("api", __name__, url_prefix="/api")


@api_bp.route("/filmes")
def filmes():
    # pro front montar a programação antes de calcular
    return jsonify(FILMES)


@api_bp.route("/particionar", methods=["POST"])
def particionar():
    numero_salas, alocacao, eventos = particionar_salas(FILMES)
    return jsonify({
        "numero_salas": numero_salas,
        "alocacao": alocacao,
        "eventos": eventos,
    })