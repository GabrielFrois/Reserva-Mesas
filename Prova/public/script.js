const API = "http://localhost:3000";

// ---------- Helpers DOM ----------
const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

// ---------- Navegação entre "páginas" (abas em index.html) ----------
function mostrarPagina(pagina) {
    document.querySelectorAll(".pagina").forEach(sec => sec.classList.add("hidden"));
    document.getElementById(pagina).classList.remove("hidden");
}

// ---------- Estado local ----------
let mesasCache = [];      // lista de mesas do DB
let reservasCache = [];   // lista de reservas (última fetch)

// ---------- Carregamento de mesas (popula selects) ----------
async function carregarMesas() {
    try {
        const res = await fetch(`${API}/mesas`);
        if (!res.ok) throw new Error("Falha ao buscar mesas");
        const json = await res.json();
        mesasCache = json.mesas || [];

        // popular selects: criar e editar
        const selCriar = $("#mesaNumero");
        const selEdit = $("#editMesaNumero");
        if (selCriar) {
            selCriar.innerHTML = '<option value="">Selecione a mesa</option>';
            mesasCache.forEach(m => {
                const o = document.createElement("option");
                o.value = String(m.numero);
                o.text = `Mesa ${m.numero} — cap ${m.capacidade}`;
                selCriar.appendChild(o);
            });
        }
        if (selEdit) {
            selEdit.innerHTML = '<option value="">Selecione a mesa</option>';
            mesasCache.forEach(m => {
                const o = document.createElement("option");
                o.value = String(m.numero);
                o.text = `Mesa ${m.numero} — cap ${m.capacidade}`;
                selEdit.appendChild(o);
            });
        }

        return mesasCache;
    } catch (err) {
        console.error(err);
        alert("Erro ao carregar mesas: " + err.message);
        return [];
    }
}

// ---------- Carregar reservas (opcional filtro por data) ----------
async function carregarReservas(dataFiltro = "") {
    try {
        const url = dataFiltro ? `${API}/reservas?data=${dataFiltro}` : `${API}/reservas`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Falha ao buscar reservas");
        const json = await res.json();
        reservasCache = json.reservas || [];
        return reservasCache;
    } catch (err) {
        console.error(err);
        alert("Erro ao carregar reservas: " + err.message);
        return [];
    }
}

// ---------- Atualizar dashboard ----------
async function atualizarDashboard() {
    await carregarMesas();
    const hoje = new Date().toISOString().slice(0, 10);
    const reservasHoje = await carregarReservas(hoje);

    $("#totalMesas").innerText = String(mesasCache.length);
    $("#reservasHoje").innerText = String(reservasHoje.length);

    const futuras = reservasHoje.filter(r => r.status !== 'cancelado' && new Date(r.inicio) > new Date())
        .sort((a, b) => new Date(a.inicio) - new Date(b.inicio));
    $("#proximaReserva").innerText = futuras[0] ? `${futuras[0].nomeCliente} — Mesa ${futuras[0].mesaNumero} • ${new Date(futuras[0].inicio).toLocaleString()}` : '---';
}

// ---------- Listagem de reservas (render) ----------
async function listarReservas() {
  const tbody = $("#listaReservas");
  tbody.innerHTML = "";

  const reservas = await carregarReservas(); // atualiza cache

  if (!reservas.length) {
    tbody.innerHTML = "<tr><td colspan='7'>Nenhuma reserva encontrada</td></tr>";
    return;
  }

  reservas.forEach(r => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${r.nomeCliente}</td>
      <td>${r.contatoCliente}</td>
      <td>${r.mesaNumero}</td>
      <td>${r.quantidadePessoas}</td>
      <td>${new Date(r.inicio).toLocaleString()}</td>
      <td>${r.status}</td>
      <td>
        <button class="btn btn-muted btn-edit" data-id="${r._id}">Editar</button>
        ${r.status !== 'cancelado'
            ? `<button class="btn btn-danger btn-cancel" data-id="${r._id}">Cancelar</button>`
            : ""
        }
      </td>
    `;

    tbody.appendChild(tr);
  });

  attachReservaButtons(); 
}

// ---------- Attach buttons (cancel + edit) ----------
function attachReservaButtons() {
    $$(".btn-cancel").forEach(btn => {
        btn.onclick = async () => {
            const id = btn.dataset.id;
            if (!confirm("Confirma cancelar esta reserva?")) return;
            try {
                const res = await fetch(`${API}/reservas/${id}`, { method: "DELETE" });
                if (!res.ok) {
                    const j = await res.json().catch(() => ({ erro: res.statusText }));
                    throw new Error(j.erro || 'Erro ao cancelar');
                }
                await listarReservas();
                await carregarMapa();
                await atualizarDashboard();
                alert("Reserva cancelada");
            } catch (err) {
                alert("Erro: " + err.message);
            }
        };
    });

    $$(".btn-edit").forEach(btn => {
        btn.onclick = () => {
            const id = btn.dataset.id;
            abrirModalEdicao(id);
        };
    });
}

// ---------- Modal de edição ----------
const modal = $("#modalEdit");
const formEdit = $("#formEditReserva");
let reservaEditandoId = null;

function abrirModalEdicao(id) {
  console.log("Abrindo modal para ID:", id);

  const reserva = reservasCache.find(r => r._id === id);

  if (!reserva) {
    console.error("Reserva NÃO encontrada no cache!", reservasCache);
    alert("Erro: reserva não encontrada.");
    return;
  }

  reservaEditandoId = id;

  $("#editNomeCliente").value = reserva.nomeCliente;
  $("#editContatoCliente").value = reserva.contatoCliente;
  $("#editMesaNumero").value = reserva.mesaNumero;
  $("#editQuantidadePessoas").value = reserva.quantidadePessoas;
  $("#editInicio").value = new Date(reserva.inicio).toISOString().slice(0, 16);
  $("#editObservacoes").value = reserva.observacoes || "";

  modal.classList.remove("hidden");
}

function fecharModalEdicao() {
    reservaEditandoId = null;
    modal.classList.add("hidden");
    formEdit.reset();
}

// fechar botões
$("#modalClose").addEventListener("click", fecharModalEdicao);
$("#modalCancel").addEventListener("click", fecharModalEdicao);

// ---------- Validações helpers ----------
function validarAntecedencia(inicioIso, minMin = 60) {
    const inicio = new Date(inicioIso);
    const diff = (inicio.getTime() - Date.now()) / (60 * 1000);
    return diff >= minMin;
}
function capacidadeValida(mesaNumero, qtd) {
    const mesa = mesasCache.find(m => Number(m.numero) === Number(mesaNumero));
    if (!mesa) return false;
    return Number(qtd) <= Number(mesa.capacidade);
}
function conflitoLocal(mesaNumero, inicioIso, reservaIdToExclude) {
    const inicio = new Date(inicioIso);
    const fim = new Date(inicio.getTime() + 90 * 60 * 1000);
    return reservasCache.some(r => {
        if (r.status === 'cancelado') return false;
        if (reservaIdToExclude && r._id === reservaIdToExclude) return false;
        if (Number(r.mesaNumero) !== Number(mesaNumero)) return false;
        const ri = new Date(r.inicio), rf = new Date(r.fim);
        // overlap check
        return !(rf <= inicio || ri >= fim);
    });
}

// ---------- Submissão da edição (PUT) ----------
formEdit.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!reservaEditandoId) return alert("Reserva não selecionada");

    const body = {
        nomeCliente: $("#editNomeCliente").value.trim(),
        contatoCliente: $("#editContatoCliente").value.trim(),
        mesaNumero: Number($("#editMesaNumero").value),
        quantidadePessoas: Number($("#editQuantidadePessoas").value),
        inicio: $("#editInicio").value,
        observacoes: $("#editObservacoes").value.trim()
    };

    // validações client-side (mesma lógica do backend)
    if (!body.nomeCliente || !body.contatoCliente || !body.mesaNumero || !body.quantidadePessoas || !body.inicio) {
        return alert("Preencha todos os campos obrigatórios");
    }
    if (!capacidadeValida(body.mesaNumero, body.quantidadePessoas)) {
        return alert("Quantidade maior que a capacidade da mesa selecionada");
    }
    if (!validarAntecedencia(body.inicio, 60)) {
        return alert("Alterações devem respeitar antecedência mínima de 60 minutos");
    }
    if (conflitoLocal(body.mesaNumero, body.inicio, reservaEditandoId)) {
        return alert("Conflito de horário para a mesa selecionada");
    }

    try {
        const res = await fetch(`${API}/reservas/${reservaEditandoId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });
        if (!res.ok) {
            const j = await res.json().catch(() => ({ erro: res.statusText }));
            throw new Error(j.erro || 'Erro ao atualizar reserva');
        }
        alert("Reserva atualizada");
        fecharModalEdicao();
        await listarReservas();
        await carregarMapa();
        await atualizarDashboard();
    } catch (err) {
        alert("Erro ao salvar: " + err.message);
    }
});

// ---------- Criar reserva (form criação) ----------
$("#formReserva").addEventListener("submit", async (e) => {
    e.preventDefault();
    const nome = $("#nomeCliente").value.trim();
    const contato = $("#contatoCliente").value.trim();
    const mesaValue = $("#mesaNumero").value;
    const qtd = Number($("#quantidadePessoas").value);
    const inicioVal = $("#inicio").value;

    if (!nome || !contato || !mesaValue || !inicioVal || !qtd) {
        return alert("Preencha todos os campos obrigatórios.");
    }
    const mesaNumero = Number(mesaValue);
    if (!capacidadeValida(mesaNumero, qtd)) {
        return alert("Quantidade maior que a capacidade da mesa selecionada.");
    }
    if (!validarAntecedencia(inicioVal, 60)) {
        return alert("Reservas devem ser feitas com antecedência mínima de 60 minutos.");
    }
    if (conflitoLocal(mesaNumero, inicioVal, null)) {
        return alert("Conflito de horário para essa mesa");
    }

    try {
        const res = await fetch(`${API}/reservas`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                nomeCliente: nome,
                contatoCliente: contato,
                mesaNumero,
                quantidadePessoas: qtd,
                inicio: inicioVal
            })
        });
        if (!res.ok) {
            const j = await res.json().catch(() => ({ erro: res.statusText }));
            throw new Error(j.erro || 'Erro ao criar reserva');
        }
        alert("Reserva criada");
        $("#formReserva").reset();
        await listarReservas();
        await carregarMapa();
        await atualizarDashboard();
    } catch (err) {
        alert("Erro ao criar reserva: " + err.message);
    }
});

// ---------- Mapa de mesas (cores apropriadas) ----------
async function carregarMapa() {
    const div = document.getElementById("gridMesas");
    div.innerHTML = "";

    // garante selects atualizados
    await carregarMesas();
    await carregarReservas(new Date().toISOString().slice(0, 10));

    mesasCache.forEach(m => {
        const st = calcularStatusMesa(m.numero);
        const el = document.createElement("div");
        el.className = `mesa ${st === 'disponivel' ? 'disponivel' : st === 'reservado' ? 'reservado' : 'ocupado'}`;
        el.innerText = m.numero;
        el.onclick = () => abrirDetalhesMesa(m);
        div.appendChild(el);
    });
}

// calcular status com base nas reservas do dia
function calcularStatusMesa(mesaNumero) {
    const now = new Date();
    // pegar reservas da mesa hoje
    const rs = reservasCache.filter(r => Number(r.mesaNumero) === Number(mesaNumero) && r.status !== 'cancelado');

    // se algum registro com inicio <= now <= fim => ocupado
    for (const r of rs) {
        const ini = new Date(r.inicio);
        const fim = new Date(r.fim);
        if (now >= ini && now <= fim) return 'ocupado';
    }
    // se houver reserva futura => reservado
    if (rs.some(r => new Date(r.inicio) > now)) return 'reservado';

    return 'disponivel';
}

// abrir detalhes da mesa (lado direito)
function abrirDetalhesMesa(mesa) {
    const div = $("#detalhesMesa");
    div.classList.remove("hidden");

    let html = `<h3>Mesa ${mesa.numero}</h3><p><strong>Capacidade:</strong> ${mesa.capacidade}</p><p><strong>Local:</strong> ${mesa.localizacao}</p>`;
    const rs = reservasCache.filter(r => Number(r.mesaNumero) === Number(mesa.numero)).sort((a, b) => new Date(a.inicio) - new Date(b.inicio));
    if (!rs.length) html += "<p class='small'>Sem reservas hoje.</p>";
    else {
        html += "<div style='margin-top:8px'><strong>Reservas:</strong></div>";
        rs.forEach(r => {
            html += `<div class="card" style="margin-top:8px;padding:8px">
        <div><strong>${r.nomeCliente}</strong> (${r.status})</div>
        <div class="small">${new Date(r.inicio).toLocaleString()} — ${new Date(r.fim).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
        <div style="margin-top:6px">${r.status !== 'cancelado' ? `<button class="btn btn-muted btn-edit-inline" data-id="${r._id}">Editar</button> <button class="btn btn-danger btn-cancel-inline" data-id="${r._id}">Cancelar</button>` : ''}</div>
      </div>`;
        });
    }
    div.innerHTML = html;

    // attach inline buttons
    $$(".btn-edit-inline").forEach(b => b.addEventListener('click', () => abrirModalEdicao(b.dataset.id)));
    $$(".btn-cancel-inline").forEach(b => b.addEventListener('click', async () => {
        if (!confirm('Confirma cancelar?')) return;
        try {
            const res = await fetch(`${API}/reservas/${b.dataset.id}`, { method: "DELETE" });
            if (!res.ok) {
                const j = await res.json().catch(() => ({ erro: res.statusText }));
                throw new Error(j.erro || 'Erro ao cancelar');
            }
            alert('Cancelada');
            await listarReservas(); await carregarMapa(); await atualizarDashboard();
        } catch (err) { alert('Erro: ' + err.message); }
    }));
}

// ---------- Inicialização ----------
(async function init() {
    await carregarMesas();
    await atualizarDashboard();
    await listarReservas();
    await carregarMapa();
    mostrarPagina("dashboard");
})();
