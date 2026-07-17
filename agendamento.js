document.addEventListener("contextmenu", (e) => {
    e.preventDefault();
}, false);

document.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.keyCode == 123) {
        e.stopPropagation();
        e.preventDefault();
    }
});

const API_URL_FERIADOS = "https://apiarearestritagenericainthm.capef.com.br";
const urlSchedule = "https://apiagendamento.capef.com.br";
let tipoAtendimento = 1;

const LISTA_ASSUNTOS = [
    { id: 1, key: "adesao", descricao: "Adesão" },
    { id: 2, key: "beneficio", descricao: "Benefício" },
    { id: 3, key: "cadastro", descricao: "Cadastro" },
    { id: 4, key: "contribuiçãoprevidenciaria", descricao: "Contribuição previdenciária" },
    { id: 5, key: "cancelamento", descricao: "Cancelamento" },
    { id: 6, key: "concessaodebeneficio", descricao: "Concessão de Benefícios" },
    { id: 7, key: "declaracao", descricao: "Declaração" },
    { id: 8, key: "emprestimo", descricao: "Empréstimo" },
    { id: 9, key: "financiamentoimobiliário", descricao: "Financiamento imobiliário" },
    { id: 10, key: "impostoderenda", descricao: "Imposto de renda" },
    { id: 12, key: "processosdeadesaodoacordo", descricao: "Processos de Adesão do acordo 2003" },
    { id: 13, key: "recadastramento", descricao: "Recadastramento" },
    { id: 14, key: "outros", descricao: "Outros" }
];

async function removerFeriadosDaLista(diasArray, mes, ano) {
    const promessasFeriados = diasArray.map(async (dia) => {
        const dataFormatada = `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
        try {
            const response = await fetch(`${API_URL_FERIADOS}/api/Atendimento/obterFeriado?dia=${dataFormatada}`);
            if (response.ok) {
                const isFeriado = await response.json();
                return isFeriado ? null : dia; 
            }
            return dia;
        } catch (error) {
            console.error("Erro ao consultar feriado para o dia", dataFormatada, error);
            return dia;
        }
    });

    const resultados = await Promise.all(promessasFeriados);
    return resultados.filter(dia => dia !== null);
}

async function setupToken() {
    const authResponse = await fetch(`${urlSchedule}/auth/access-token`, {
        method: "POST",
        body: JSON.stringify({
            username: authUserName,
            password: authPassword
        }),
        headers: {
            "Content-Type": "application/json"
        }
    });

    if (!authResponse.ok) {
        throw new Error("Failed to obtain authentication token");
    }

    const authData = await authResponse.json();
    localStorage.setItem('authToken', authData.access_Token);
}

async function authFetch(url, options = {}) {
    try {
        let token = localStorage.getItem('authToken');
        const headers = {
            ...options.headers,
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        };
        const dataResponse = await fetch(url, { ...options, headers });

        if (dataResponse.status === 401) {
            localStorage.removeItem("authToken");
            await setupToken();
            return authFetch(url, options); 
        }

        if (dataResponse.status === 400) {
            const result = await dataResponse.json();
            return { status: dataResponse.status, data: result[0] };
        }
        if (dataResponse.status === 204) {
            return { status: dataResponse.status };
        }
        if (!dataResponse.ok) {
            if (dataResponse.status === 415) {
                return { status: dataResponse.status };
            } else {
                const result = await dataResponse.json();
                return { error: result[0], status: dataResponse.status };
            }
        } 
        
        return await dataResponse.json();

    } catch (error) {
        return error;
    }
}

const api = authFetch;

function clearError() {
    $(".w-form-fail").css("display", "none").text("");
    $("#atendimento-presencial-submit, #atendimento-eletronico-submit").text("Enviar");
    preloader.style.display = "none";
}

function showFormFailMessage(message) {
    $(".w-form-fail").css("display", "block").text(message);
}

function addMask() {
    $("#phone-01, #phone-02").mask("(99) 9 9999-9999");
    $("#cpf-01, #cpf-02").mask("999.999.999-99");
}

$(document).ready(function ($) {
    addMask();
});

const loadingIcon = document.getElementById("loading-icon");
const preloader = document.getElementById("preloader");

if (loadingIcon) {
    loadingIcon.style.background = "#28343e";
    loadingIcon.style.padding = "10px";
    loadingIcon.style.borderRadius = "6px";
    loadingIcon.style.boxShadow = "0px 0px 0px 1px rgba(0, 0, 0, 0.1), 0px 2px 4px rgba(0, 0, 0, 0.2)";
}

if (preloader) {
    preloader.style.display = "none";
    preloader.style.opacity = 1;
    preloader.style.position = "fixed";
    preloader.style.top = 0;
    preloader.style.left = 0;
    preloader.style.width = "100%";
    preloader.style.height = "100%";
}

function getElement(selector) {
    return document.querySelector(selector);
}

async function getPlans() {
    const response = await api(`${urlSchedule}/plano`);
    const planInput = $("#plan-input");
    const planInput2 = $("#plan-input-2");
    
    planInput.empty();
    planInput2.empty();
    
    $.each(response, function (index, value) {
        const optionHTML = `<option value='${value.id}'>${value.descricao}</option>`;
        planInput.append(optionHTML);
        planInput2.append(optionHTML);
    });

    if(response.length > 0) {
        planInput.val(response[0].id);
        planInput2.val(response[0].id);
        carregarAssuntos(response[0].descricao);
    }
}

async function getTimes({ day, year, month, atendimentoType }) {
    const timeInput = $("#time-input-2");
    const timeInput2 = $("#horario-2");

    timeInput.empty();
    timeInput2.empty();

    try {
        const response = await api(`${urlSchedule}/horarios/atendimento/${atendimentoType}/dia/${day}/mes/${month}/ano/${year}`);
        
        if (response.status === 204) {
            showFormFailMessage("Sem horários disponíveis para esta data");
            return;
        } 
        
        if (response.error) {
            console.log("error ===> ", response.error);
            return;
        }

        clearError();
        if (response.length) {
            const horarios = response.map(item => item.horarios);
            
            $.each(horarios, function (index, value) {
                const optionHTML = `<option value='${value}'>${value}</option>`;
                timeInput.append(optionHTML);
                timeInput2.append(optionHTML);
            });
            timeInput.val(horarios[0]);
            timeInput2.val(horarios[0]);
        }
    } catch (error) {
        console.error(error);
    }
}

async function checkCPF(cpf) {
    await api(`${urlSchedule}/agendamento/validar/cpf/${cpf}`);
}

function loadOptions(selectElement, items, isMonth = false) {
    selectElement.empty();
    for (let key in items) {
        const item = items[key];
        let val, text;
        
        if (isMonth) {
            text = item.descricao.charAt(0).toUpperCase() + item.descricao.slice(1);
            val = item.mes;
        } else {
            text = item;
            val = item;
        }
        
        selectElement.append($("<option>").val(val).text(text));
    }
}

async function getCalendarioAtenimento() {
    const dataAtual = new Date();
    let mesAtual = dataAtual.getMonth() + 1;
    let anoAtual = dataAtual.getFullYear();
    let iteracoes = 0;
    let calendarioData = null;

    while (iteracoes < 12) {
        iteracoes++;
        try {  
            calendarioData = await api(`${urlSchedule}/calendario/atendimento/${tipoAtendimento}/mes/${mesAtual}/ano/${anoAtual}`);							
        } catch (erro) {
            console.error("Erro:", erro); 
        }

        if (calendarioData && calendarioData[0].dias.length !== 0) {
            break;
        } else {
            mesAtual++;
            if (mesAtual > 12) {
                mesAtual = 1;
                anoAtual++;
            }
        }
    }

    if (calendarioData) {
        calendarioData[0].ano = calendarioData[0].ano.filter(item => item >= dataAtual.getFullYear());
        calendarioData[0].mes = calendarioData[0].mes.filter(item => item.mes >= dataAtual.getMonth() + 1 || calendarioData[0].ano[0] > dataAtual.getFullYear());
    }
    
    return calendarioData;
}

async function loadCalendar() {
    if(preloader) preloader.style.display = "flex";
    const response = await getCalendarioAtenimento();
    if(preloader) preloader.style.display = "none";
    
    if (!response || !response[0]) return;
    const result = response[0];

    const mesParaFiltrar = result.mes[0]?.mes || new Date().getMonth() + 1;
    const anoParaFiltrar = result.ano[0] || new Date().getFullYear();
    
    result.dias = await removerFeriadosDaLista(result.dias, mesParaFiltrar, anoParaFiltrar);

    loadOptions($("#dia-input"), result.dias);
    loadOptions($("#dia-input-2"), result.dias);
    loadOptions($("#mes-input"), result.mes, true);
    loadOptions($("#mes-input-2"), result.mes, true);
    loadOptions($("#year-input"), result.ano);
    loadOptions($("#year-input-2"), result.ano);

    await getTimesOfToday();
}

async function getTimesOfToday() {
    const isPresencial = tipoAtendimento === 1;
    const day = $(isPresencial ? "#dia-input" : "#dia-input-2").val();
    const month = $(isPresencial ? "#mes-input" : "#mes-input-2").val();
    const year = $(isPresencial ? "#year-input" : "#year-input-2").val();
	
    if(day && month && year) {
        await getTimes({ day, year, month, atendimentoType: tipoAtendimento });
    }
}

async function isAttendAlreadyExist({ typeAtt, cpf }) {
    const response = await api(`${urlSchedule}/agendamento/existe/atendimento/${typeAtt}/cpf/${cpf}`);
    if (response.status === 400) {
        clearError();
        showFormFailMessage("CPF não encontrado");
        return false;
    }
    clearError();
    return true;
}

async function scheduleAttend(data) {
    clearError();
    const submitBtns = $("#atendimento-presencial-submit, #atendimento-eletronico-submit");
    submitBtns.prop("disabled", true).text("carregando...");

    const response = await api(`${urlSchedule}/agendamento/criar`, {
        method: "POST",
        body: JSON.stringify(data)
    });

    submitBtns.prop("disabled", false).text("Enviar");

    if (response && response.id) {
        await loadCalendar();
        $(".tab-button-box, .c-input-form, .c-input-tab").css("display", "none");
        $(".w-form-done").css("display", "block");
    } else if (response && response.data) {
        showFormFailMessage(response.data);
    } else {
        showFormFailMessage("Erro ao realizar agendamento.");
    }
}

async function loadScript() {
    await setupToken();
    await loadCalendar();

    const seletorDias = "#dia-input, #dia-input-2";
    const seletorMeses = "#mes-input, #mes-input-2";
    const seletorAnos = "#year-input, #year-input-2";

    $(seletorDias).change(async function () {
        clearError();
        const isPresencial = tipoAtendimento === 1;
        getTimes({
            day: $(isPresencial ? "#dia-input" : "#dia-input-2").val(),
            year: $(isPresencial ? "#year-input" : "#year-input-2").val(),
            month: Number($(isPresencial ? "#mes-input" : "#mes-input-2").val()),
            atendimentoType: tipoAtendimento
        });
    });

    $(seletorMeses).change(async function () {
        clearError();
        const month = $(this).val();
        const isPresencial = tipoAtendimento === 1;
        const year = $(isPresencial ? "#year-input" : "#year-input-2").val();

        if(preloader) preloader.style.display = "flex";
        const response = await api(`${urlSchedule}/calendario/atendimento/${tipoAtendimento}/mes/${month}/ano/${year}`);
        if(preloader) preloader.style.display = "none";
        
        if (response && response[0]) {
            const result = response[0];
            result.dias = await removerFeriadosDaLista(result.dias, month, year);

            loadOptions($("#dia-input"), result.dias);
            loadOptions($("#dia-input-2"), result.dias);

            getTimes({
                day: $(isPresencial ? "#dia-input" : "#dia-input-2").val(),
                year,
                month: Number(month),
                atendimentoType: tipoAtendimento
            });
        }
    });

    $(seletorAnos).change(async function () {
        clearError();
        const year = $(this).val();
        const isPresencial = tipoAtendimento === 1;

        if(preloader) preloader.style.display = "flex";
        const response = await api(`${urlSchedule}/calendario/atendimento/${tipoAtendimento}/ano/${year}`);
        if(preloader) preloader.style.display = "none";
        
        if (response && response[0]) {
            const result = response[0];
            const mesAtualSelect = $(isPresencial ? "#mes-input" : "#mes-input-2").val() || new Date().getMonth() + 1;
            
            result.dias = await removerFeriadosDaLista(result.dias, mesAtualSelect, year);

            loadOptions($("#dia-input"), result.dias);
            loadOptions($("#dia-input-2"), result.dias);
            loadOptions($("#mes-input"), result.mes, true);
            loadOptions($("#mes-input-2"), result.mes, true);

            getTimes({
                day: $(isPresencial ? "#dia-input" : "#dia-input-2").val(),
                year,
                month: Number($(isPresencial ? "#mes-input" : "#mes-input-2").val()),
                atendimentoType: tipoAtendimento
            });
        }
    });

    $("#atendimento-eletronico-input").click(async function () {
        clearError();
        addMask();
        tipoAtendimento = 2;
        await getPlans();
        await loadCalendar();
    });

    $("#atendimento-presencial-input").click(async function () {
        clearError();
        addMask();
        tipoAtendimento = 1;
        await getPlans();
        await loadCalendar();
    });

    await getPlans();
    
    const allInputs = "#dia-input, #mes-input, #year-input, #plan-input, #mes-input-2, #year-input-2, #plan-input-2, #phone-01, #phone-02, #time-input-2, #horario-2, #email-input, #email-input-2, #assunto-input";
    $(allInputs).change(function () {
        clearError();
    });
}

function obterAssuntoEspecial(planoSelecionado) {
    const isEspecial = planoSelecionado === "Plano CV I" || planoSelecionado === "Família";
    return {
        id: isEspecial ? 15 : 11,
        key: isEspecial ? "portabilidade" : "institutosprevidenciarios",
        descricao: isEspecial ? "Desafio Portabilidade" : "Institutos previdenciários"
    };
}

function carregarAssuntos(planoSelecionadoTexto) {
    const assuntoSelect = document.getElementById("assunto-input");
    if (!assuntoSelect) return;

    const assuntoEspecial = obterAssuntoEspecial(planoSelecionadoTexto);
    
    const listaCompleta = [
        ...LISTA_ASSUNTOS.filter(a => a.key !== "portabilidade" && a.key !== "institutosprevidenciarios"),
        assuntoEspecial
    ].sort((a, b) => a.descricao.localeCompare(b.descricao));

    assuntoSelect.innerHTML = "";
    listaCompleta.forEach(assunto => {
        const option = document.createElement("option");
        option.value = assunto.key;
        option.text = assunto.descricao;
        assuntoSelect.appendChild(option);
    });
}

document.getElementById("plan-input-2")?.addEventListener("change", function () {
    const planoSelecionadoTexto = this.options[this.selectedIndex].text;
    carregarAssuntos(planoSelecionadoTexto);
});

document.getElementById("plan-input")?.addEventListener("change", function () {
    const planoSelecionadoTexto = this.options[this.selectedIndex].text;
    carregarAssuntos(planoSelecionadoTexto);
});

async function getAssuntoInputValue() {
    try {
        const assuntoSelecionado = document.querySelector('#assunto-input')?.value;
        if (!assuntoSelecionado) return 0;

        const isPresencial = tipoAtendimento === 1;
        const planoSelecionado = document.querySelector(isPresencial ? "#plan-input" : "#plan-input-2").selectedOptions[0].text;
        const assuntoEspecial = obterAssuntoEspecial(planoSelecionado);

        if (assuntoSelecionado === assuntoEspecial.key) {
            return assuntoEspecial.id;
        }

        const assuntoEncontrado = LISTA_ASSUNTOS.find(x => x.key === assuntoSelecionado);
        return assuntoEncontrado ? assuntoEncontrado.id : 0;

    } catch (e) {
        return 0;
    }
}

async function createRegistration() {
    clearError();
    const isPresencial = tipoAtendimento === 1;
    
    const phoneValue = getElement(isPresencial ? "#phone-01" : "#phone-02").value;
    const cpfInputValue = getElement(isPresencial ? "#cpf-01" : "#cpf-02").value;
    const timeInputValue = getElement(isPresencial ? "#time-input-2" : "#horario-2").value;
    const planInputValue = getElement(isPresencial ? "#plan-input" : "#plan-input-2").value;
    const emailInputValue = getElement(isPresencial ? "#email-input" : "#email-input-2").value;
    const day = getElement(isPresencial ? "#dia-input" : "#dia-input-2").value;
    const month = getElement(isPresencial ? "#mes-input" : "#mes-input-2").value;
    const year = getElement(isPresencial ? "#year-input" : "#year-input-2").value;

    const phoneDDD = phoneValue.replace(/\D/g, '').substring(0, 2);
    const phoneRest = phoneValue.replace(/\D/g, '').substring(2);
    const cpfLimpo = cpfInputValue.replace(/\D/g, "");

    if (cpfInputValue && timeInputValue && planInputValue && emailInputValue && phoneValue) {
        if(preloader) preloader.style.display = "flex";

        const resultCPF = await isAttendAlreadyExist({
            cpf: cpfLimpo,
            typeAtt: tipoAtendimento
        });

        const setAssunto = await getAssuntoInputValue();

        if (resultCPF) {
            const raw = {
                ano: year,
                dia: day,
                mes: Number(month),
                plano: planInputValue,
                assunto: setAssunto,
                horario: timeInputValue,
                cpf: cpfLimpo,
                ddd: phoneDDD,
                telefone: phoneRest,
                email: emailInputValue,
                tipoAtendimento: tipoAtendimento,
            };

            await scheduleAttend(raw);
        }
        
        $("#atendimento-presencial-submit, #atendimento-eletronico-submit").text("Enviar");
        if(preloader) preloader.style.display = "none";
    } else {
        showFormFailMessage("Todos os campos são obrigatórios");
    }
}

loadScript();

document.querySelector("#atendimento-presencial-submit")?.addEventListener("click", createRegistration);
document.getElementById("atendimento-eletronico-submit")?.addEventListener("click", createRegistration);