/// VARIÁVEIS GLOBAIS REFERENTES AO FILTRO DE VENDAS ///
let defaultStartDate; 
let defaultEndDate;
let vendasMensaisChart; // Variável global para armazenar o objeto Chart
let clientesMensaisChart; // Variável global para armazenar o objeto Chart
let totalVendasPorFilialGlobal;
let resumoFaturamentoPorFilialGlobal;
let comparativoChart; // Variável global para armazenar o objeto Chart comparativo
let topFiliaisChart;
let annualComparisonChart;

/////////////////////////////////////////////////////////////////////////////////////////////////////////////
$(document).ready(function() {
    setupModal();
    setupDefaultDates();
    setupInputs();
    fetchDataAndDisplay();
    setupComparisonForm();
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

function setupComparisonForm() {
    $('#comparisonForm').submit(function(event) {
        event.preventDefault();
        const startPeriod = $('#startPeriodInput').val() || "undefined";
        const endPeriod = $('#endPeriodInput').val() || "undefined";
        fetchComparativoDisplayData(startPeriod, endPeriod);
    });
}

function fetchComparativoDisplayData() {
    const startPeriod = $('#startPeriodInput').val() || "undefined";
    const endPeriod = $('#endPeriodInput').val() || "undefined";
    
    return $.getJSON(`/filter_compara?start_period=${startPeriod}&end_period=${endPeriod}`)
        .done(function(response) {
            displayComparativo(response);
        });
}

function setupDefaultDates() {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    defaultStartDate = `${currentYear}-01-01`;
    defaultEndDate = `${currentYear}-12-31`;
}

function setupInputs() {
    $('#start_date_input').val(defaultStartDate);
    $('#end_date_input').val(defaultEndDate);
}

function fetchDataAndDisplay() {
    fetchFaturamentoDisplayData()
        .then(fetchAndDisplayData)
        .then(fetchComparativoDisplayData)
        .then(fetchAndDisplayAnnualComparison)
        .catch(handleApiError);
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////

function fetchFaturamentoDisplayData() {
    const startDate = $('#start_date_input').val();
    const endDate = $('#end_date_input').val();

    return $.getJSON(`/faturamento?start_date=${startDate}&end_date=${endDate}`)
        .done(function(response) {
            const totalGeral = parseFloat(response.total_geral);
            resumoFaturamentoPorFilialGlobal = response.resumo_por_filial;
            displayFaturamento(response.resumo_por_filial, totalGeral);
            if (totalVendasPorFilialGlobal) {
                displayTopFiliaisChart(totalVendasPorFilialGlobal, resumoFaturamentoPorFilialGlobal, startDate, endDate);
            }
        });
}

function fetchAndDisplayData() {
    const startDate = $('#start_date_input').val();
    const endDate = $('#end_date_input').val();

    return $.getJSON(`/filter?start_date=${startDate}&end_date=${endDate}`)
        .done(function(response) {
            totalVendasPorFilialGlobal = response.total_vendas_por_filial;
            displayVendasMensais(response.vendas_mensais);
            displayTotalVendasPorFilial(response.total_vendas_por_filial, resumoFaturamentoPorFilialGlobal, startDate, endDate);
            if (resumoFaturamentoPorFilialGlobal) {
                displayTopFiliaisChart(totalVendasPorFilialGlobal, resumoFaturamentoPorFilialGlobal, startDate, endDate);
            }
            console.log(response.total_vendas_por_filial);
        });
}

function fetchAndDisplayAnnualComparison() {
    return $.getJSON('/comparativo_ano')
        .done(function(response) {
            displayAnnualComparisonChart(response);
        });
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////
function handleApiError(jqXHR, textStatus, errorThrown) {
    console.error('Erro ao buscar dados da API:', textStatus, errorThrown);
}

function calcularTotalVendas(totalVendasPorFilial) {
    return Object.values(totalVendasPorFilial).reduce((acc, filial) => {
        const venda = parseFloat(filial.totvrvenda);
        return acc + (isNaN(venda) ? 0 : venda);
    }, 0);
}

function calcularTotalFaturamentoPorFilial(codfil, resumo_por_filial) {
    if (!resumo_por_filial) return 0;
    const filial = resumo_por_filial.find(filial => filial.codfil == codfil);
    if (!filial || !filial.faturamento) return 0;

    return filial.faturamento.reduce((acc, fat) => acc + parseFloat(fat.total_faturamento), 0);
}

function calcularTotalClientes(totalVendasPorFilial) {
    return Object.values(totalVendasPorFilial).reduce((acc, filial) => {
        const clientes = parseInt(filial.nclientes);
        return acc + (isNaN(clientes) ? 0 : clientes);
    }, 0);
}


function displayTotalVendasPorFilial(totalVendasPorFilial, resumoFaturamentoPorFilial, startDate, endDate) {
    if (!totalVendasPorFilial) {
        console.error('totalVendasPorFilial is undefined or null');
        return;
    }
    const container = $('#totalVendasPorFilial .card-body');
    container.empty(); // Clear the container content

    const table = $('<table class="table table-responsive-lg"></table>').appendTo(container);
    const thead = $('<thead></thead>').appendTo(table);
    const tbody = $('<tbody></tbody>').appendTo(table);
    

    $('<tr></tr>').appendTo(thead)
        .append('<th scope="col">Filial</th>')
        .append('<th scope="col">Total Vendas</th>')
        .append('<th scope="col">Total Faturamento</th>')
        .append('<th scope="col">Tickets</th>')
        .append('<th scope="col">Ticket Medio</th>')
        .append('<th scope="col">Custo</th>')
        .append('<th scope="col">Produtos</th>')
        .append('<th scope="col">Lucro</th>')
        .append('<th scope="col">Vendas + Faturamento</th>');

    $('<tr></tr>').appendTo(tbody)
        .append(`<td colspan="8" id="periodoTd">Período: ${startDate} a ${endDate}</td>`);

    let totalVendas = 0;
    let totalCusto = 0;
    let totalClientes = 0;
    let totalProdutos = 0;
    let totalLucroSobreCusto = 0;
    let totalFaturamento = 0;

    Object.entries(totalVendasPorFilial).forEach(([codfil, values]) => {
        const row = $('<tr></tr>').appendTo(tbody);
        const totalFilial = parseFloat(values.totvrvenda);
        const totalCustoFilial = parseFloat(values.totvrcusto);
        const faturamentoFilial = calcularTotalFaturamentoPorFilial(codfil, resumoFaturamentoPorFilial) || 0;
        const lucroSobreCusto = totalFilial - totalCustoFilial;
        const totalVendasMaisFaturamento = totalFilial + faturamentoFilial;
        const ticketMedio = totalVendasMaisFaturamento / values.nclientes;

        row.append('<td>Filial ' + codfil + '</td>')
           .append('<td>R$ ' + totalFilial.toFixed(2) + '</td>')
           .append('<td>R$ ' + faturamentoFilial.toFixed(2) + '</td>')
           .append('<td>' + values.nclientes + '</td>')
           .append('<td> R$ ' + ticketMedio.toFixed(2) + '</td>')
           .append('<td>R$ ' + totalCustoFilial.toFixed(2) + '</td>')
           .append('<td>' + values.totprodvda + '</td>')
           .append('<td>R$ ' + lucroSobreCusto.toFixed(2) + '</td>')
           .append('<td>R$ ' + totalVendasMaisFaturamento.toFixed(2) + '</td>');

        totalVendas += totalFilial;
        totalFaturamento += faturamentoFilial;
        totalCusto += totalCustoFilial;
        totalClientes += parseInt(values.nclientes);
        totalProdutos += parseFloat(values.totprodvda);
        totalLucroSobreCusto += lucroSobreCusto;
        totalTicketMedio = totalVendas / totalClientes;
    });

    $('<tr></tr>').appendTo(tbody)
        .append('<td>Total Global</td>')
        .append('<td>R$ ' + totalVendas.toFixed(2) + '</td>')
        .append('<td>R$ ' + totalFaturamento.toFixed(2) + '</td>')
        .append('<td>' + totalClientes + '</td>')
        .append('<td>R$ ' + totalTicketMedio.toFixed(2) + '</td>')
        .append('<td>R$ ' + totalCusto.toFixed(2) + '</td>')
        .append('<td>' + totalProdutos + '</td>')
        .append('<td>R$ ' + totalLucroSobreCusto.toFixed(2) + '</td>')
        .append('<td>R$ ' + (totalVendas + totalFaturamento).toFixed(2) + '</td>');

    $('<tr></tr>').appendTo(tbody)
        .append('<td colspan="8" class="text-center"><strong>Total de Vendas e Faturamento: R$ ' + (totalVendas + totalFaturamento).toFixed(2) + '</strong></td>');
}


function displayTopFiliaisChart(totalVendasPorFilial, resumoFaturamentoPorFilial, startDate, endDate) {
    if (!totalVendasPorFilial || !resumoFaturamentoPorFilial) {
        console.error('Dados de vendas ou faturamento não disponíveis');
        return;
    }

    const ctx = document.getElementById('topFiliaisChart');
    const totaisContainer = document.getElementById('totaisGerais');
    const periodElement = document.getElementById('periodoTd');

    if (!ctx || !totaisContainer || !periodElement) {
        console.error('Elemento canvas com id "topFiliaisChart", div com id "totaisGerais" ou p com id "periodoTd" não encontrado');
        return;
    }

    // Adicionando o período no elemento correto
    periodElement.innerText = `Período: ${startDate} a ${endDate}`;

    const filialData = Object.entries(totalVendasPorFilial).map(([codfil, values]) => {
        const totalFilial = parseFloat(values.totvrvenda);
        const totalCustoFilial = parseFloat(values.totvrcusto);
        const faturamentoFilial = calcularTotalFaturamentoPorFilial(codfil, resumoFaturamentoPorFilial) || 0;
        const lucroSobreCusto = totalFilial - totalCustoFilial;
        const totalVendasMaisFaturamento = totalFilial + faturamentoFilial;
        
        return {
            codfil,
            totalFilial,
            faturamentoFilial,
            nclientes: parseInt(values.nclientes, 10), // Convertendo para número inteiro
            totalCustoFilial,
            totprodvda: values.totprodvda,
            lucroSobreCusto,
            totalVendasMaisFaturamento
        };
    });

    filialData.sort((a, b) => b.totalVendasMaisFaturamento - a.totalVendasMaisFaturamento);

    const totalFaturamentoGlobal = filialData.reduce((acc, filial) => acc + filial.faturamentoFilial, 0);
    const totalVendasGlobal = filialData.reduce((acc, filial) => acc + filial.totalFilial, 0);
    const totalClientesGlobal = filialData.reduce((acc, filial) => acc + filial.nclientes, 0); // Somando como números
    const totalProdutosGlobal = filialData.reduce((acc, filial) => acc + filial.totprodvda, 0);
    const totalCustosGlobal = filialData.reduce((acc, filial) => acc + filial.totalCustoFilial, 0);
    const totalLucroSobreCustoGlobal = filialData.reduce((acc, filial) => acc + filial.lucroSobreCusto, 0);
    const totalGeralVendasFaturamento = totalVendasGlobal + totalFaturamentoGlobal;

    const labels = filialData.map(filial => `Filial ${filial.codfil}`);
    const data = filialData.map(filial => ((filial.totalVendasMaisFaturamento / totalGeralVendasFaturamento) * 100).toFixed(2));

    const canvas = ctx.getContext('2d');

    if (topFiliaisChart) {
        topFiliaisChart.destroy();
    }

    topFiliaisChart = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                label: 'Percentual de Faturamento',
                data,
                backgroundColor: labels.map(() => getRandomColor(0.5)),
                borderColor: labels.map(() => getRandomColor()),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            return `${label}: ${value}%`;
                        }
                    }
                }
            }
        }
    });

    // Display the totals
    totaisContainer.innerHTML = `
        <div class="total-info">
            <i class="fas fa-dollar-sign"></i>
            <span>Total de Vendas PDVs: R$ ${totalVendasGlobal.toFixed(2)}</span>
        </div>
        <div class="total-info">
            <i class="fas fa-boxes"></i>
            <span>Total de Produtos Vendidos: ${totalProdutosGlobal}</span>
        </div>
        <div class="total-info">
            <i class="fas fa-users"></i>
            <span>Total de Clientes: ${totalClientesGlobal}</span>
        </div>
        <div class="total-info">
            <i class="fas fa-cash-register"></i>
            <span>Total de Custos: R$ ${totalCustosGlobal.toFixed(2)}</span>
        </div>
        <div class="total-info">
            <i class="fas fa-chart-line"></i>
            <span>Lucro Sobre Custo: R$ ${totalLucroSobreCustoGlobal.toFixed(2)}</span>
        </div>
        <div class="total-info">
            <i class="fas fa-dollar-sign"></i>
            <span>Total de Faturamento: R$ ${totalFaturamentoGlobal.toFixed(2)}</span>
        </div>
        <div class="total-info">
            <i class="fas fa-chart-pie"></i>
            <span>Total Geral (Vendas + Faturamento): R$ ${totalGeralVendasFaturamento.toFixed(2)}</span>
        </div>
    `;

    console.log('Top Filiais Chart:', topFiliaisChart);
}




function displayVendasMensais(vendasMensais) {
    const ctxVendas = document.getElementById('vendasMensaisChart').getContext('2d');
    const ctxClientes = document.getElementById('clientesMensaisChart').getContext('2d');
    const labels = new Set();
    const datasetsVendas = [];
    const datasetsClientes = [];

    Object.entries(vendasMensais).forEach(([codfil, data]) => {
        const mesLabels = data.map(item => item.mes);
        const vendasData = data.map(item => item.totvrvenda);
        const clientesData = data.map(item => item.nclientes);

        mesLabels.forEach(label => labels.add(label));
        datasetsVendas.push({
            label: `Vendas - Filial ${codfil}`,
            data: vendasData,
            backgroundColor: getRandomColor(),
            borderColor: getRandomColor(),
            borderWidth: 1
        });
        datasetsClientes.push({
            label: `Clientes - Filial ${codfil}`,
            data: clientesData,
            backgroundColor: getRandomColor(),
            borderColor: getRandomColor(),
            borderWidth: 1
        });
    });

    const uniqueLabels = Array.from(labels).sort();

    if (vendasMensaisChart) {
        vendasMensaisChart.destroy();
    }
    if (clientesMensaisChart) {
        clientesMensaisChart.destroy();
    }

    vendasMensaisChart = new Chart(ctxVendas, {
        type: 'bar',
        data: {
            labels: uniqueLabels,
            datasets: datasetsVendas
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Mês',
                        font: {
                            size: 16,
                            weight: 'bold'
                        }
                    }
                },
                y: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Valor de Vendas',
                        font: {
                            size: 16,
                            weight: 'bold'
                        }
                    }
                }
            }
        }
    });

    clientesMensaisChart = new Chart(ctxClientes, {
        type: 'bar',
        data: {
            labels: uniqueLabels,
            datasets: datasetsClientes
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Mês',
                        font: {
                            size: 16,
                            weight: 'bold'
                        }
                    }
                },
                y: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Número de Clientes',
                        font: {
                            size: 16,
                            weight: 'bold'
                        }
                    }
                }
            }
        }
    });

    if ($('#faturamentoButton').length === 0) {
        const faturamentoButton = $('<button id="faturamentoButton" class="btn btn-primary btn-sm mt-3 mr-2">Visualizar Gráficos de Faturamento</button>');
        $('#vendasMensaisChart').after(faturamentoButton);
        
        const faturamentoSection = $('<h2 id="faturamentoSection" class="mt-5" style="display: none;">Comparativo de Vendas Faturamento</h2>');
        $('#faturamentoChart').before(faturamentoSection);
        
        faturamentoButton.click(function() {
            $('#faturamentoSection, #faturamentoChart').toggle();
        });
    }
}

let faturamentoChartInstance;

function displayFaturamento(resumo_por_filial, total_geral) {
    const ctx = document.getElementById('faturamentoChart').getContext('2d');
    const labels = new Set();
    const datasetsFaturamento = [];

    resumo_por_filial.forEach(filial => {
        const { codfil, faturamento } = filial;
        const data = [];

        faturamento.forEach(item => {
            labels.add(item.month_year);
            data.push({
                x: item.month_year,
                y: parseFloat(item.total_faturamento)
            });
        });

        datasetsFaturamento.push({
            label: `Filial ${codfil}`,
            data: data,
            backgroundColor: getRandomColor(0.5),
            borderColor: getRandomColor(),
            borderWidth: 1,
            fill: 'origin'
        });
    });

    const sortedLabels = Array.from(labels).sort();

    if (faturamentoChartInstance) {
        faturamentoChartInstance.destroy();
    }

    faturamentoChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sortedLabels,
            datasets: datasetsFaturamento
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    type: 'category',
                    display: true,
                    title: {
                        display: true,
                        text: 'Mês',
                        font: {
                            size: 16,
                            weight: 'bold'
                        }
                    }
                },
                y: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Faturamento (R$)',
                        font: {
                            size: 16,
                            weight: 'bold'
                        }
                    }
                }
            }
        }
    });
}

function getRandomColor(alpha = 1) {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
}

function displayComparativo(data) {
    const container = $('#comparativoContent').empty();

    // Extraindo os dados retornados pela API
    const startPeriod = data.start_period;
    const endPeriod = data.end_period;
    const startPeriodTotals = data.start_period_totals;
    const endPeriodTotals = data.end_period_totals;
    const percentChanges = data.percent_changes;
    const startPeriodDetails = data.details.start_period_details;
    const endPeriodDetails = data.details.end_period_details;
    const detailedChanges = data.details.detailed_changes;

    // Função para exibir os dados da filial selecionada
    function updateFilialDetails(filialCode) {
        let startDetails, endDetails, changes, startTicketMedio, endTicketMedio;
        if (filialCode === 'geral') {
            startDetails = startPeriodTotals;
            endDetails = endPeriodTotals;
            changes = percentChanges;
            startTicketMedio = parseFloat(data.start_ticket_medio) || 0;
            endTicketMedio = parseFloat(data.end_ticket_medio) || 0;
        } else {
            startDetails = startPeriodDetails.find(filial => filial.codfil === filialCode);
            endDetails = endPeriodDetails.find(filial => filial.codfil === filialCode);
            changes = detailedChanges.find(change => change.codfil === filialCode);
            startTicketMedio = parseFloat(changes.start_ticket_medio) || 0;
            endTicketMedio = parseFloat(changes.end_ticket_medio) || 0;
        }

        if (!startDetails || !endDetails || !changes) {
            console.error('Detalhes não encontrados para a filial selecionada.');
            return;
        }

        const nclientesChange = parseFloat(changes.nclientesChange) || 0;
        const totprodvdaChange = parseFloat(changes.totprodvdaChange) || 0;
        const totvrcustoChange = parseFloat(changes.totvrcustoChange) || 0;
        const totvrvendaChange = parseFloat(changes.totvrvendaChange) || 0;
        const ticketMedioChange = ((endTicketMedio - startTicketMedio) / startTicketMedio) * 100 || 0;

        const getVariationClass = (value) => value < 0 ? 'variation-negative' : 'variation-positive';
        const getVariationIcon = (value) => value < 0 ? '▼' : '▲';

        const card = $(`
            <div class="card mb-3">
                <div class="card-header comparativo-card-header">
                    Comparativo de Vendas (${startPeriod} vs ${endPeriod})
                </div>
                <div class="card-body comparativo-card-body">
                    <div class="row">
                        <div class="col-md-6">
                            <h5 class="card-title">Período Inicial</h5>
                            <p class="card-text">Ticket: ${startDetails.nclientes}</p>
                            <p class="card-text">Produtos Vendidos: ${startDetails.totprodvda}</p>
                            <p class="card-text">Custo: R$ ${parseFloat(startDetails.totvrcusto).toFixed(2)}</p>
                            <p class="card-text">Vendas: R$ ${parseFloat(startDetails.totvrvenda).toFixed(2)}</p>
                            <p class="card-text">Ticket Médio: R$ ${startTicketMedio.toFixed(2)}</p>
                        </div>
                        <div class="col-md-6">
                            <h5 class="card-title">Período Final</h5>
                            <p class="card-text">Ticket: ${endDetails.nclientes}</p>
                            <p class="card-text">Produtos Vendidos: ${endDetails.totprodvda}</p>
                            <p class="card-text">Custo: R$ ${parseFloat(endDetails.totvrcusto).toFixed(2)}</p>
                            <p class="card-text">Vendas: R$ ${parseFloat(endDetails.totvrvenda).toFixed(2)}</p>
                            <p class="card-text">Ticket Médio: R$ ${endTicketMedio.toFixed(2)}</p>
                        </div>
                    </div>
                    <hr>
                    <div class="row">
                        <div class="col-md-3">
                            <div class="card variation-card ${getVariationClass(nclientesChange)} mb-3">
                                <div class="card-body">
                                    <h5 class="card-title"><i class="bi bi-people"></i>Ticket</h5>
                                    <p class="card-text ${getVariationClass(nclientesChange)}">
                                        Variação: ${nclientesChange.toFixed(2)}% ${getVariationIcon(nclientesChange)}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card variation-card ${getVariationClass(totprodvdaChange)} mb-3">
                                <div class="card-body">
                                    <h5 class="card-title"><i class="bi bi-box-seam"></i> Produtos</h5>
                                    <p class="card-text ${getVariationClass(totprodvdaChange)}">
                                        Variação: ${totprodvdaChange.toFixed(2)}% ${getVariationIcon(totprodvdaChange)}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card variation-card ${getVariationClass(totvrvendaChange)} mb-3">
                                <div class="card-body">
                                    <h5 class="card-title"><i class="bi bi-bar-chart-line"></i> Vendas</h5>
                                    <p class="card-text ${getVariationClass(totvrvendaChange)}">
                                        Variação: ${totvrvendaChange.toFixed(2)}% ${getVariationIcon(totvrvendaChange)}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card variation-card ${getVariationClass(ticketMedioChange)} mb-3">
                                <div class="card-body">
                                    <h5 class="card-title"><i class="bi bi-cash"></i> Ticket Médio</h5>
                                    <p class="card-text ${getVariationClass(ticketMedioChange)}">
                                        Variação: ${ticketMedioChange.toFixed(2)}% ${getVariationIcon(ticketMedioChange)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `);

        container.empty().append(card);
    }

    // Atualizando ou criando o dropdown para selecionar a filial
    let filialSelector = $('#filialSelector');
    if (filialSelector.length === 0) {
        filialSelector = $('<select id="filialSelector" class="form-control mb-3"></select>');
        $('#dropdownContainer').append(filialSelector);
    }

    // Populando o dropdown com as opções de filiais
    filialSelector.empty();
    filialSelector.append('<option value="geral">Geral</option>');
    startPeriodDetails.forEach(filial => {
        filialSelector.append(`<option value="${filial.codfil}">Filial ${filial.codfil}</option>`);
    });

    // Adicionando evento para atualizar os dados ao selecionar uma filial
    filialSelector.off('change').on('change', function() {
        const selectedFilial = $(this).val();
        updateFilialDetails(selectedFilial);
    });

    updateFilialDetails('geral'); // Exibir dados gerais por padrão
}

function displayAnnualComparisonChart(data) {
    const ctx = document.getElementById('annualComparisonChart').getContext('2d');
    const labels = data.map(item => item.mes_ano);
    const currentYearData = data.map(item => parseFloat(item.current_year.totvrvenda) + parseFloat(item.current_year.total_faturamento));
    const previousYearData = data.map(item => parseFloat(item.previous_year.totvrvenda) + parseFloat(item.previous_year.total_faturamento));
    const vendaChangeData = data.map(item => parseFloat(item.changes.venda_change));
    const previousMesAnoData = data.map(item => item.previous_mes_ano);

    if (annualComparisonChart) {
        annualComparisonChart.destroy();
    }

    annualComparisonChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Ano Atual',
                    data: currentYearData,
                    backgroundColor: 'rgba(75, 192, 192, 0.6)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1,
                    datalabels: {
                        align: 'end',
                        anchor: 'end',
                        formatter: function(value, context) {
                            const index = context.dataIndex;
                            const change = vendaChangeData[index];
                            const sign = change >= 0 ? '+' : '';
                            return sign + change.toFixed(2) + '%';
                        },
                        color: function(context) {
                            const index = context.dataIndex;
                            const change = vendaChangeData[index];
                            return change >= 0 ? 'green' : 'red';
                        },
                        font: {
                            weight: 'bold'
                        },
                        offset: -10
                    }
                },
                {
                    label: 'Ano Anterior',
                    data: previousYearData,
                    backgroundColor: 'rgba(153, 102, 255, 0.6)',
                    borderColor: 'rgba(153, 102, 255, 1)',
                    borderWidth: 1,
                    datalabels: {
                        display: false // Hide datalabels for the previous year
                    }
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Comparativo Anual de Vendas',
                    font: {
                        size: 20,
                        weight: 'bold'
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(tooltipItem) {
                            const dataset = tooltipItem.dataset;
                            const currentValue = dataset.data[tooltipItem.dataIndex];
                            let label = dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            label += currentValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                            if (dataset.label === 'Ano Anterior') {
                                label += ` (Ref: ${previousMesAnoData[tooltipItem.dataIndex]})`;
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Mês/Ano',
                        font: {
                            size: 16,
                            weight: 'bold'
                        }
                    }
                },
                y: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Total (Vendas + Faturamento)',
                        font: {
                            size: 16,
                            weight: 'bold'
                        }
                    }
                }
            }
        },
        plugins: [ChartDataLabels]
    });
}



function handleApiError(jqXHR, textStatus, errorThrown) {
    console.error('Erro ao buscar dados da API:', textStatus, errorThrown);
}

