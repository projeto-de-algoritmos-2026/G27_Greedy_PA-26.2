// Visualizacao passo a passo do interval partitioning.
// A alocacao vem da API; o heap de cada passo e reconstruido aqui so para exibicao.

const CATEGORIAS = {
  animacao: "Animação",
  super_heroi: "Super-herói",
  classico: "Clássico",
};

const el = (id) => document.getElementById(id);

const estado = {
  sessoes: [],     // alocacao da API (ja ordenada pelo inicio)
  passos: [],      // snapshot do heap e da decisao de cada passo
  numeroSalas: 0,
  profundidade: 0,
  t0: 0,
  t1: 0,
  passo: 0,
  timer: null,
};

function paraMinutos(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function paraHHMM(min) {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

function escapar(texto) {
  const d = document.createElement("div");
  d.textContent = texto;
  return d.innerHTML;
}

function cor(categoria) {
  return CATEGORIAS[categoria] ? `var(--${categoria})` : "var(--suave)";
}

function pct(min) {
  return ((min - estado.t0) / (estado.t1 - estado.t0)) * 100;
}

// Refaz o algoritmo guardando o heap antes/depois de cada sessao
function montarPassos(sessoes) {
  let heap = [];  // [{fim, sala, titulo}] mantido ordenado por (fim, sala)
  const ordenar = (h) => h.sort((a, b) => a.fim - b.fim || a.sala - b.sala);
  const passos = [];
  let salasAbertas = 0;

  sessoes.forEach((s) => {
    const inicio = paraMinutos(s.inicio);
    const topo = heap[0] ? { ...heap[0] } : null;
    let tipo;
    if (topo && topo.fim <= inicio) {
      heap.shift();
      tipo = "reuso";
    } else {
      salasAbertas += 1;
      tipo = "nova";
    }
    if (tipo === "reuso" && topo.sala !== s.sala) {
      console.warn("Sala diferente da API para", s.titulo, topo.sala, s.sala);
    }
    heap = ordenar([...heap, { fim: paraMinutos(s.fim), sala: s.sala, titulo: s.titulo }]);
    passos.push({ sessao: s, tipo, topo, heap: heap.map((h) => ({ ...h })), salasAbertas });
  });
  return passos;
}


function calcularProfundidade(sessoes) {
  const eventos = [];
  sessoes.forEach((s) => {
    eventos.push([paraMinutos(s.inicio), 1]);
    eventos.push([paraMinutos(s.fim), -1]);
  });

  eventos.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const pontos = [];
  let atual = 0;
  let maior = 0;
  eventos.forEach(([t, d]) => {
    atual += d;
    maior = Math.max(maior, atual);
    pontos.push([t, atual]);
  });
  return { pontos, maior };
}

//  desenho :

function desenharTimeline() {
  const { passo, passos, numeroSalas, t0, t1 } = estado;
  const visiveis = passos.slice(0, passo);
  const atual = passos[passo - 1];
  const abertas = atual ? atual.salasAbertas : 0;

  let eixo = "";
  for (let t = t0; t <= t1; t += 60) {
    eixo += `<span style="left:${pct(t)}%">${paraHHMM(t)}</span>`;
  }

  let linhas = "";
  for (let sala = 1; sala <= numeroSalas; sala++) {
    const blocos = visiveis
      .filter((p) => p.sessao.sala === sala)
      .map((p) => {
        const s = p.sessao;
        const ini = paraMinutos(s.inicio);
        const fim = paraMinutos(s.fim);
        const ehAtual = p === atual ? " atual" : "";
        return `<div class="sessao${ehAtual}" style="left:${pct(ini)}%;width:${pct(fim) - pct(ini)}%;--cor:${cor(s.categoria)}"
          title="${escapar(s.titulo)} · ${s.inicio}–${s.fim}">${escapar(s.titulo)}</div>`;
      })
      .join("");
    const fechada = sala > abertas ? " fechada" : "";
    linhas += `<div class="sala${fechada}"><div class="sala-nome">Sala ${sala}</div><div class="trilho">${blocos}</div></div>`;
  }

  let varredura = "";
  if (atual) {
    const x = pct(paraMinutos(atual.sessao.inicio));
    varredura = `<div class="varredura" style="left:calc(72px + (100% - 88px) * ${x / 100})"><span>${atual.sessao.inicio}</span></div>`;
  }

  el("timeline").innerHTML = `<div class="timeline-interna"><div class="eixo">${eixo}</div>${linhas}${varredura}</div>`;
}

function desenharProfundidade() {
  const { pontos, maior } = calcularProfundidade(estado.sessoes);
  
  const L = 1000;
  const A = 90;
  const x = (t) => (pct(t) / 100) * L;
  const y = (v) => A - (v / Math.max(maior, 1)) * (A - 8);

  let d = `M${x(estado.t0)},${y(0)}`;
  let anterior = 0;
  pontos.forEach(([t, v]) => {
    d += ` L${x(t)},${y(anterior)} L${x(t)},${y(v)}`;
    anterior = v;
  });
  d += ` L${x(estado.t1)},${y(anterior)}`;
  const area = `${d} L${x(estado.t1)},${y(0)} Z`;

  el("profundidade").innerHTML = `
    <div class="prof-linha">
      <div class="prof-rotulos">
        <span class="rotulo-max" style="top:${y(maior)}px">máx ${maior}</span>
        <span style="top:${y(0)}px;transform:translateY(-100%)">0</span>
      </div>
      <svg viewBox="0 0 ${L} ${A}" preserveAspectRatio="none" role="img" aria-label="Número de sessões simultâneas; máximo ${maior}">
        <path class="area" d="${area}"/>
        <path class="degrau" d="${d}" vector-effect="non-scaling-stroke"/>
        <line class="maximo" x1="0" x2="${L}" y1="${y(maior)}" y2="${y(maior)}" vector-effect="non-scaling-stroke"/>
      </svg>
    </div>`;
}

function desenharHeap() {
  const atual = estado.passos[estado.passo - 1];
  const heap = atual ? atual.heap : [];
  el("heap").innerHTML = heap.length
    ? heap
        .map((h, i) => `<li class="${i === 0 ? "topo-heap" : ""}"><span>Sala ${h.sala}</span><span class="fim">livre às ${paraHHMM(h.fim)}</span></li>`)
        .join("")
    : `<li class="vazio">Nenhuma sala aberta ainda</li>`;
}

function desenharFila() {
  el("fila").innerHTML = estado.passos
    .map((p, i) => {
      const s = p.sessao;
      const classe = i === estado.passo - 1 ? "atual" : i < estado.passo ? "feito" : "";
      const badge = i < estado.passo ? `<span class="badge">Sala ${s.sala}</span>` : "";
      return `<li class="${classe}" data-passo="${i + 1}">
        <span class="titulo cor" style="--cor:${cor(s.categoria)}">${escapar(s.titulo)}</span>${badge}
        <span class="horario">${s.inicio} – ${s.fim}</span></li>`;
    })
    .join("");
  const atual = el("fila").querySelector(".atual");
  if (atual) atual.scrollIntoView({ block: "nearest" });
}

function desenharDecisao() {
  const box = el("decisao");
  const atual = estado.passos[estado.passo - 1];
  box.className = "decisao";

  if (!atual) {
    box.innerHTML = `<strong>Pronto para começar.</strong>
      <span class="regra">Aperte ▶ para alocar as ${estado.sessoes.length} sessões, uma por vez, em ordem de início.</span>`;
    return;
  }

  const s = atual.sessao;
  const t = escapar(s.titulo);
  if (atual.tipo === "reuso") {
    box.classList.add("reuso");
    box.innerHTML = `<strong>${t}</strong> começa às ${s.inicio}. A sala que libera primeiro é a <strong>Sala ${atual.topo.sala}</strong>
      (livre às ${paraHHMM(atual.topo.fim)}, após “${escapar(atual.topo.titulo)}”), então ela é reaproveitada.
      <span class="regra">topo do heap: ${paraHHMM(atual.topo.fim)} ≤ ${s.inicio} → reaproveita</span>`;
  } else {
    box.classList.add("nova");
    const motivo = atual.topo
      ? `A sala que libera primeiro (Sala ${atual.topo.sala}) só fica livre às ${paraHHMM(atual.topo.fim)}`
      : "Ainda não há nenhuma sala aberta";
    const regra = atual.topo ? `topo do heap: ${paraHHMM(atual.topo.fim)} > ${s.inicio} → abre sala nova` : "heap vazio → abre sala nova";
    box.innerHTML = `<strong>${t}</strong> começa às ${s.inicio}. ${motivo}, então abrimos a <strong>Sala ${s.sala}</strong>.
      <span class="regra">${regra}</span>`;
  }

  if (estado.passo === estado.passos.length) {
    box.innerHTML += `<span class="regra"><strong>Fim:</strong> ${estado.numeroSalas} salas, igual à profundidade máxima (${estado.profundidade} sessões ao mesmo tempo). Nenhuma solução usa menos.</span>`;
  }
}

function desenhar() {
  const { passo, passos } = estado;
  const atual = passos[passo - 1];
  el("n-salas").textContent = atual ? atual.salasAbertas : 0;
  el("n-salas").classList.toggle("igual", passo === passos.length && passos.length > 0);
  el("passo-texto").textContent = `Passo ${passo} de ${passos.length}`;
  el("passo-slider").value = passo;
  el("btn-inicio").disabled = el("btn-voltar").disabled = passo === 0;
  el("btn-fim").disabled = el("btn-avancar").disabled = passo === passos.length;
  el("btn-play").textContent = estado.timer ? "⏸ Pausar" : passo === passos.length ? "↺ Recomeçar" : "▶ Reproduzir";

  desenharTimeline();
  desenharHeap();
  desenharFila();
  desenharDecisao();
}

// controles :

function irPara(passo) {
  estado.passo = Math.max(0, Math.min(estado.passos.length, passo));
  if (estado.passo === estado.passos.length) pausar();
  desenhar();
}

function pausar() {
  clearInterval(estado.timer);
  estado.timer = null;
}

function tocar() {
  if (estado.passo === estado.passos.length) estado.passo = 0;
  pausar();
  estado.timer = setInterval(() => irPara(estado.passo + 1), Number(el("velocidade").value));
  irPara(estado.passo + 1);
}

function alternar() {
  if (estado.timer) {
    pausar();
    desenhar();
  } else {
    tocar();
  }
}

function ligarControles() {
  el("btn-play").addEventListener("click", alternar);
  el("btn-inicio").addEventListener("click", () => { pausar(); irPara(0); });
  el("btn-voltar").addEventListener("click", () => { pausar(); irPara(estado.passo - 1); });
  el("btn-avancar").addEventListener("click", () => { pausar(); irPara(estado.passo + 1); });
  el("btn-fim").addEventListener("click", () => { pausar(); irPara(estado.passos.length); });
  el("passo-slider").addEventListener("input", (e) => { pausar(); irPara(Number(e.target.value)); });
  el("velocidade").addEventListener("change", () => { if (estado.timer) tocar(); });
  el("fila").addEventListener("click", (e) => {
    const li = e.target.closest("li[data-passo]");
    if (li) { pausar(); irPara(Number(li.dataset.passo)); }
  });
  document.addEventListener("keydown", (e) => {
    if (e.target.matches("input, select")) return;
    if (e.key === " ") { e.preventDefault(); alternar(); }
    else if (e.key === "ArrowRight") { pausar(); irPara(estado.passo + 1); }
    else if (e.key === "ArrowLeft") { pausar(); irPara(estado.passo - 1); }
    else if (e.key === "Home") { pausar(); irPara(0); }
    else if (e.key === "End") { pausar(); irPara(estado.passos.length); }
  });
}

async function iniciar() {
  try {
    const resp = await fetch("/api/particionar", { method: "POST" });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const dados = await resp.json();

    estado.sessoes = dados.alocacao;
    estado.numeroSalas = dados.numero_salas;
    estado.passos = montarPassos(dados.alocacao);
    estado.profundidade = calcularProfundidade(dados.alocacao).maior;

    const inicios = dados.alocacao.map((s) => paraMinutos(s.inicio));
    const fins = dados.alocacao.map((s) => paraMinutos(s.fim));
    estado.t0 = Math.floor(Math.min(...inicios) / 60) * 60;
    estado.t1 = Math.ceil(Math.max(...fins) / 60) * 60;

    el("n-sessoes").textContent = dados.alocacao.length;
    el("n-profundidade").textContent = estado.profundidade;
    el("passo-slider").max = estado.passos.length;
    el("legenda").innerHTML = Object.entries(CATEGORIAS)
      .map(([k, nome]) => `<li style="--cor:${cor(k)}">${nome}</li>`)
      .join("");

    desenharProfundidade();
    ligarControles();
    desenhar();
  } catch (erro) {
    el("erro").hidden = false;
    el("erro").textContent = `Não foi possível carregar a programação (${erro.message}).`;
  }
}

iniciar();
