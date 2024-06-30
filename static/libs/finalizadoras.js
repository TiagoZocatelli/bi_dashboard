/// VARIÁVEIS GLOBAIS REFERENTES ÀS FINALIZADORAS ///
let finalizadorasTotaisGlobal;

/////////////////////////////////////////////////////////////////////////////////////////////////////////////
$(document).ready(function() {
    fetchFinalizadorasPorPeriodo();
    fetchAndDisplayVendasOnline();
    setupModal();
});

function setupModal() {
    if ($('#pdvRankingModal').length === 0) {
        $('body').append(`
            <div class="modal fade" id="pdvRankingModal" tabindex="-1" aria-labelledby="pdvRankingModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="pdvRankingModalLabel">Ranking dos PDVs</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <!-- Conteúdo será preenchido dinamicamente -->
                        </div>
                    </div>
                </div>
            </div>
        `);
    }
}

function fetchFinalizadorasPorPeriodo() {
    $.getJSON('/finalizadoras')
        .done(function(response) {
            displayFinalizadorasPorPeriodo(response.finalizadoras, response.pdvs, "Resumo Geral Periodo Total");
        })
        .fail(handleApiError);
}

function fetchFinalizadorasPorPeriodoData(dataInicial, dataFinal) {
    const url = `/finalizadoras_periodo?data_inicial=${dataInicial}&data_final=${dataFinal}`;

    $.getJSON(url)
        .done(function(response) {
            const periodo = `De ${dataInicial} até ${dataFinal}`;
            displayFinalizadorasPorPeriodo(response.finalizadoras, response.pdvs, periodo);
        })
        .fail(handleApiError);
}

function fetchAndDisplayVendasOnline() {
    $.getJSON('/finalizadorasonline')
        .done(function(response) {
            displayFinalizadorasOnline(response.pdvs_online);
        })
        .fail(handleApiError);
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////
function handleApiError(jqXHR, textStatus, errorThrown) {
    console.error('Erro ao buscar dados da API:', textStatus, errorThrown);
}

function displayFinalizadorasOnline(pdvs_online) {
    const container = $('#finalizadorasOnline').empty();
    finalizadorasTotaisGlobal = {};

    // Iterar sobre as filiais e seus respectivos caixas
    Object.entries(pdvs_online).forEach(([filial, caixas]) => {
        if (!finalizadorasTotaisGlobal[filial]) {
            finalizadorasTotaisGlobal[filial] = {};
        }

        // Iterar sobre os caixas e suas finalizadoras
        Object.values(caixas).forEach(finalizadoras => {
            Object.entries(finalizadoras).forEach(([finalizadora, valor]) => {
                const finalizadoraTrim = finalizadora.trim();
                if (!finalizadorasTotaisGlobal[filial][finalizadoraTrim]) {
                    finalizadorasTotaisGlobal[filial][finalizadoraTrim] = 0;
                }
                finalizadorasTotaisGlobal[filial][finalizadoraTrim] += valor;
            });
        });
    });

    // Calculando o total geral das finalizadoras
    const totalGeralFinalizadoras = Object.values(finalizadorasTotaisGlobal).reduce((acc, finalizadoras) => {
        Object.entries(finalizadoras).forEach(([finalizadora, valor]) => {
            if (!acc[finalizadora]) {
                acc[finalizadora] = 0;
            }
            acc[finalizadora] += valor;
        });
        return acc;
    }, {});

    // Criação da tabela para exibir os dados
    const table = $('<table class="table"></table>').appendTo(container);
    const thead = $('<thead></thead>').appendTo(table);
    const tbody = $('<tbody></tbody>').appendTo(table);

    $('<tr></tr>').appendTo(thead)
        .append('<th scope="col">Finalizadora</th>')
        .append('<th scope="col">Total</th>');

    // Adicionando os dados das finalizadoras na tabela
    Object.entries(totalGeralFinalizadoras).forEach(([finalizadora, total]) => {
        $('<tr></tr>').appendTo(tbody)
            .append('<td>' + finalizadora + '</td>')
            .append('<td>R$ ' + total.toFixed(2) + '</td>');
    });

    // Adicionando o total geral na tabela
    $('<tr></tr>').appendTo(tbody)
        .append('<td><strong>Total Geral</strong></td>')
        .append('<td><strong>R$ ' + Object.values(totalGeralFinalizadoras).reduce((acc, val) => acc + val, 0).toFixed(2) + '</strong></td>');

    // Botão para ver detalhes
    $('<button class="btn btn-primary btn-sm mt-3 mr-2">Ver Detalhes</button>')
        .appendTo(container)
        .on('click', () => showDetailsModal(finalizadorasTotaisGlobal));
}

function showDetailsModal(finalizadorasTotais) {
    const modalBody = $('#pdvRankingModal .modal-body').empty();
    const allFinalizadoras = new Set();

    // Coletar todas as finalizadoras únicas
    Object.values(finalizadorasTotais).forEach(finalizadoras => {
        Object.keys(finalizadoras).forEach(finalizadora => {
            allFinalizadoras.add(finalizadora.trim());
        });
    });

    const detailsTable = $('<table class="table"></table>').appendTo(modalBody);
    const thead = $('<thead></thead>').appendTo(detailsTable);
    const tbody = $('<tbody></tbody>').appendTo(detailsTable);

    const headerRow = $('<tr></tr>').appendTo(thead)
        .append('<th scope="col">Filial</th>');

    // Adicionar cabeçalhos das finalizadoras na tabela de detalhes
    allFinalizadoras.forEach(finalizadora => {
        headerRow.append('<th scope="col">' + finalizadora + '</th>');
    });
    headerRow.append('<th scope="col"><strong>Total por Filial</strong></th>');

    // Adicionar os dados das finalizadoras na tabela de detalhes
    Object.entries(finalizadorasTotais).forEach(([filial, finalizadoras]) => {
        const row = $('<tr></tr>').appendTo(tbody)
            .append('<td>' + filial + '</td>');

        let totalPorFilial = 0;

        allFinalizadoras.forEach(finalizadora => {
            const total = finalizadoras[finalizadora.trim()] ? finalizadoras[finalizadora.trim()].toFixed(2) : '0.00';
            totalPorFilial += parseFloat(total);
            row.append('<td>' + total + '</td>');
        });

        row.append('<td><strong>' + totalPorFilial.toFixed(2) + '</strong></td>');
    });

    $('#pdvRankingModal').modal('show');
}

function displayFinalizadorasPorPeriodo(finalizadoras, pdvs, periodo = "Resumo Geral Periodo Total") {
    const container = $('#finalizadorasPorPeriodo').empty();
    $('<h2 class="mt-2"></h2>').text(`Período Selecionado: ${periodo}`).appendTo(container);

    const totalGeral = Object.values(finalizadoras).reduce((acc, total) => acc + total, 0);

    const table = $('<table class="table"></table>').appendTo(container);
    const thead = $('<thead></thead>').appendTo(table);
    const tbody = $('<tbody></tbody>').appendTo(table);

    $('<tr></tr>').appendTo(thead)
        .append('<th scope="col">Finalizadora</th>')
        .append('<th scope="col">Total</th>');

    Object.entries(finalizadoras).forEach(([finalizadora, total]) => {
        $('<tr></tr>').appendTo(tbody)
            .append('<td>' + finalizadora.trim() + '</td>')
            .append('<td>R$ ' + total.toFixed(2) + '</td>');
    });

    $('<tr></tr>').appendTo(tbody)
        .append('<td><strong>Total Geral</strong></td>')
        .append('<td><strong>R$ ' + totalGeral.toFixed(2) + '</strong></td>');

    $('<button class="btn btn-primary btn-sm mt-3 mr-2">Ver Detalhes</button>')
        .appendTo(container)
        .click(() => displayPdvRankingPeriodo(pdvs));

    $('<button id="space-btn" class="btn btn-primary btn-sm mt-3 ml-2">Pesquisar Período</button>')
        .appendTo(container)
        .click(() => $('#periodModal').modal('show'));

    $('#periodForm').submit(function(event) {
        event.preventDefault();
        const dataInicial = $('#startDateInput').val();
        const dataFinal = $('#endDateInput').val();
        fetchFinalizadorasPorPeriodoData(dataInicial, dataFinal);
        $('#periodModal').modal('hide'); // Close the modal after form submission
    });
}

function displayPdvRankingPeriodo(pdvs) {
    const modal = $('#pdvRankingModal').modal('show');
    const container = modal.find('.modal-body').empty();
    const filiais = Object.keys(pdvs);

    const selectFilial = $('<select id="selectFilial" class="form-select mb-3"></select>').appendTo(container);
    filiais.forEach(filial => {
        selectFilial.append(`<option value="${filial}">Filial ${filial}</option>`);
    });

    const tableContainer = $('<div id="pdvTablesContainer"></div>').appendTo(container);
    displayPdvTable(pdvs[filiais[0]]);

    selectFilial.on('change', function() {
        displayPdvTable(pdvs[$(this).val()]);
    });

    function displayPdvTable(pdvsData) {
        tableContainer.empty();

        const table = $('<table class="table table-bordered table-striped mb-4"></table>').appendTo(tableContainer);
        const thead = $('<thead></thead>').appendTo(table);
        const tbody = $('<tbody></tbody>').appendTo(table);

        const finalizadoras = {};
        Object.values(pdvsData).forEach(finalizadorasData => {
            Object.keys(finalizadorasData).forEach(finalizadora => {
                finalizadoras[finalizadora] = true;
            });
        });

        const headerRow = $('<tr><th>PDV</th></tr>').appendTo(thead);
        Object.keys(finalizadoras).forEach(finalizadora => {
            headerRow.append('<th>' + finalizadora + '</th>');
        });
        headerRow.append('<th>Total</th>');

        const totalFinalizadoras = {};
        Object.entries(pdvsData).forEach(([pdv, finalizadorasData]) => {
            const row = $('<tr><td>' + pdv + '</td></tr>').appendTo(tbody);
            let totalPdv = 0;
            Object.keys(finalizadoras).forEach(finalizadora => {
                const valor = finalizadorasData[finalizadora] || 0;
                row.append('<td>' + (typeof valor === 'number' ? 'R$ ' + valor.toFixed(2) : valor) + '</td>');
                if (typeof valor === 'number') {
                    totalPdv += valor;
                    totalFinalizadoras[finalizadora] = (totalFinalizadoras[finalizadora] || 0) + valor;
                }
            });
            row.append('<td>R$ ' + totalPdv.toFixed(2) + '</td>');
        });

        const totalRow = $('<tr><td>Total Filial</td></tr>').appendTo(tbody);
        let totalFilial = 0;
        Object.keys(finalizadoras).forEach(finalizadora => {
            const valor = totalFinalizadoras[finalizadora] || 0;
            totalFilial += valor;
            totalRow.append('<td>R$ ' + valor.toFixed(2) + '</td>');
        });
        totalRow.append('<td>R$ ' + totalFilial.toFixed(2) + '</td>');
    }
}
