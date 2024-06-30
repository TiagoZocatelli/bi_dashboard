$(document).ready(function() {
    setupModal();
    setupDefaultDates();
    setupInputs();
    fetchDataAndDisplay();
    setupComparisonForm();
});

function fetchDataAndDisplay() {
    fetchFaturamentoDisplayData()
        .then(fetchAndDisplayData)
        .then(fetchComparativoDisplayData)
        .then(fetchAndDisplayAnnualComparison)
        .catch(handleApiError);
}

function fetchFaturamentoDisplayData() {
    const startDate = $('#start_date_input').val();
    const endDate = $('#end_date_input').val();

    return $.getJSON(`/faturamento?start_date=${startDate}&end_date=${endDate}`)
        .done(function(response) {
            const totalGeral = parseFloat(response.total_geral);
            resumoFaturamentoPorFilialGlobal = response.resumo_por_filial;
            displayFaturamento(response.resumo_por_filial, totalGeral);
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
                displayTopFiliaisChart(totalVendasPorFilialGlobal, resumoFaturamentoPorFilialGlobal);
            }
            console.log(response.total_vendas_por_filial);
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

function fetchAndDisplayAnnualComparison() {
    return $.getJSON('/comparativo_ano')
        .done(function(response) {
            displayAnnualComparisonChart(response);
        });
}