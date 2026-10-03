import heapq

def _para_minutos(horario):
    #Converte HH:mm para miniutos, vai faciliar a comparação
    h, m = horario.split(":")
    return int(h) * 60 + int(m)


def particionar_salas(filmes):
    #Recebe a lista de dicts com filmes
    filmes_ordenados = sorted(filmes, key=lambda f: _para_minutos(f["inicio"]))

    salas_em_uso = []   # heap de horario_termino_em_minutos e numero_da_sala
    proxima_sala_livre = 1
    alocacao = []
    eventos = []

    for filme in filmes_ordenados:
        inicio_min = _para_minutos(filme["inicio"])
        fim_min = _para_minutos(filme["fim"])

        if salas_em_uso and salas_em_uso[0][0] <= inicio_min:
            termino_anterior, sala = heapq.heappop(salas_em_uso)
            eventos.append({
                "tipo": "reaproveitada",
                "filme": filme["titulo"],
                "sala": sala,
                "mensagem": (
                    f"Sala {sala} estava livre desde {filme['inicio']} "
                    f"(filme anterior terminou antes) — reaproveitada para "
                    f"'{filme['titulo']}'."
                ),
            })
        else:
            sala = proxima_sala_livre
            proxima_sala_livre += 1
            eventos.append({
                "tipo": "nova_sala",
                "filme": filme["titulo"],
                "sala": sala,
                "mensagem": (
                    f"Nenhuma sala livre às {filme['inicio']} — abre a Sala {sala} "
                    f"para '{filme['titulo']}'."
                ),
            })

        heapq.heappush(salas_em_uso, (fim_min, sala))
        alocacao.append({
            "titulo": filme["titulo"],
            "categoria": filme["categoria"],
            "inicio": filme["inicio"],
            "fim": filme["fim"],
            "sala": sala,
        })
    numero_salas = proxima_sala_livre - 1
    return numero_salas, alocacao, eventos