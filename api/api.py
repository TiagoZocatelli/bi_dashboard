from flask import Flask, request, jsonify, send_from_directory, render_template
import mysql.connector
from mysql.connector import pooling
from datetime import datetime, timedelta
import logging
from pydantic import BaseModel, ValidationError
from typing import List, Dict, Any
import os

logging.basicConfig(level=logging.DEBUG)

app = Flask(__name__)

# Configurações de conexão com o banco de dados MySQL
db_config = {
    'host': '127.0.0.1',
    'user': os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASSWORD', 'SG515t3m45'),
    'database': 'dashboard',
    'pool_name': 'mypool',
    'pool_size': 5
}

db_pool = mysql.connector.pooling.MySQLConnectionPool(**db_config)

# Modelos de Dados
class FilterParams(BaseModel):
    start_date: datetime
    end_date: datetime

class FinalizadoraOnline(BaseModel):
    especie: str
    pdv: str
    filial: str
    total: float

class VendasMensaisResponse(BaseModel):
    vendas_mensais: Dict[str, List[Dict[str, Any]]]
    total_vendas_por_filial: Dict[str, Dict[str, Any]]

@app.route('/comparativo_ano', methods=['GET'])
def comparativo_ano():
    try:
        conn = db_pool.get_connection()
        cursor = conn.cursor(dictionary=True)

        # Obter a data atual
        now = datetime.now()
        current_year = now.year
        current_month = now.month
        current_day = now.day

        # Função para obter dados anuais
        def get_yearly_data(year):
            data = []
            for month in range(1, current_month + 1):
                start_date = datetime(year, month, 1)
                if month == current_month:
                    end_date = datetime(year, month, current_day)
                else:
                    end_date = (start_date + timedelta(days=32)).replace(day=1) - timedelta(days=1)

                query_vendas_mes = """
                    SELECT 
                        codfil,
                        SUM(totvrvenda) as totvrvenda
                    FROM vendas_mes 
                    WHERE data BETWEEN %s AND %s
                    GROUP BY codfil
                """
                query_vendas_faturamento = """
                    SELECT 
                        SUM(valcon83) as total_faturamento
                    FROM vendas_faturamento 
                    WHERE DATE(datemis83) BETWEEN %s AND %s
                """
                cursor.execute(query_vendas_mes, (start_date.strftime('%Y-%m-%d'), end_date.strftime('%Y-%m-%d')))
                vendas_mes = cursor.fetchall()
                cursor.execute(query_vendas_faturamento, (start_date.strftime('%Y-%m-%d'), end_date.strftime('%Y-%m-%d')))
                faturamento = cursor.fetchone()

                totvrvenda = sum([item['totvrvenda'] or 0 for item in vendas_mes])
                total_faturamento = faturamento['total_faturamento'] or 0

                data.append({
                    'mes_ano': f'{month:02d}-{year}',
                    'totvrvenda': totvrvenda,
                    'total_faturamento': total_faturamento,
                    'filiais': vendas_mes
                })
            return data

        current_year_data = get_yearly_data(current_year)
        previous_year_data = get_yearly_data(current_year - 1)

        # Construir a resposta com os dados comparativos
        response = []
        for current_data, previous_data in zip(current_year_data, previous_year_data):
            current_totvrvenda = current_data.get('totvrvenda', 0) or 0
            previous_totvrvenda = previous_data.get('totvrvenda', 0) or 0
            current_total_faturamento = current_data.get('total_faturamento', 0) or 0
            previous_total_faturamento = previous_data.get('total_faturamento', 0) or 0

            current_total = current_totvrvenda + current_total_faturamento
            previous_total = previous_totvrvenda + previous_total_faturamento

            venda_change = ((current_total - previous_total) / previous_total * 100) if previous_total else 0

            filiais = []
            for current_filial in current_data.get('filiais', []):
                codfil = current_filial['codfil']
                previous_filial = next((item for item in previous_data.get('filiais', []) if item['codfil'] == codfil), None)

                filial_current_total = current_filial['totvrvenda'] or 0
                filial_previous_total = previous_filial['totvrvenda'] if previous_filial else 0

                filiais.append({
                    'codfil': codfil,
                    'current_year': {
                        'totvrvenda': filial_current_total
                    },
                    'previous_year': {
                        'totvrvenda': filial_previous_total
                    },
                    'changes': {
                        'venda_change': ((filial_current_total - filial_previous_total) / (filial_previous_total if filial_previous_total else 1) * 100)
                    }
                })

            response.append({
                'mes_ano': current_data['mes_ano'],
                'previous_mes_ano': previous_data['mes_ano'],
                'current_year': {
                    'totvrvenda': current_totvrvenda,
                    'total_faturamento': current_total_faturamento,
                    'total': current_total
                },
                'previous_year': {
                    'totvrvenda': previous_totvrvenda,
                    'total_faturamento': previous_total_faturamento,
                    'total': previous_total
                },
                'changes': {
                    'venda_change': venda_change
                },
                'filiais': filiais
            })

        cursor.close()
        conn.close()

        return jsonify(response)

    except mysql.connector.Error as e:
        logging.error("Database error: %s", str(e))
        return jsonify({"error": "Database error"}), 500
    except Exception as e:
        logging.error("Unhandled exception: %s", str(e))
        return jsonify({"error": "Internal server error"}), 500



@app.route('/filter_compara', methods=['GET'])
def filter_compara():
    try:
        # Obtendo parâmetros de período no formato MMyyyy
        start_period = request.args.get('start_period')
        end_period = request.args.get('end_period')

        now = datetime.now()
        current_month = now.strftime('%m%Y')
        previous_year_month = (now.replace(year=now.year - 1)).strftime('%m%Y')

        # Se não forem fornecidos parâmetros, use os períodos padrão
        if not start_period or start_period == "undefined":
            start_period = previous_year_month
        if not end_period or end_period == "undefined":
            end_period = current_month

        start_date = datetime.strptime(start_period, '%m%Y')
        end_date = datetime.strptime(end_period, '%m%Y')

        conn = db_pool.get_connection()
        cursor = conn.cursor(dictionary=True)

        # Função auxiliar para calcular os totais por período
        def get_totals_for_period(period_date):
            start_date = period_date.replace(day=1)
            next_month = (start_date + timedelta(days=32)).replace(day=1)
            end_date = next_month - timedelta(days=1)

            query = """
                SELECT 
                    codfil, 
                    SUM(nclientes) as nclientes, 
                    SUM(totvrvenda) as totvrvenda, 
                    SUM(totvrcusto) as totvrcusto, 
                    SUM(totprodvda) as totprodvda
                FROM vendas_mes 
                WHERE data BETWEEN %s AND %s
                GROUP BY codfil
            """
            cursor.execute(query, (start_date.strftime('%Y-%m-%d'), end_date.strftime('%Y-%m-%d')))
            return cursor.fetchall()

        # Obter totais para os períodos de início e fim
        start_totals = get_totals_for_period(start_date)
        end_totals = get_totals_for_period(end_date)

        cursor.close()
        conn.close()

        def aggregate_totals(results):
            totals = {
                'nclientes': 0,
                'totvrvenda': 0,
                'totvrcusto': 0,
                'totprodvda': 0
            }
            for row in results:
                totals['nclientes'] += row['nclientes']
                totals['totvrvenda'] += row['totvrvenda']
                totals['totvrcusto'] += row['totvrcusto']
                totals['totprodvda'] += row['totprodvda']
            return totals

        def calculate_percentage_change(current, previous):
            if previous == 0:
                return 0 if current == 0 else 100
            return ((current - previous) / previous) * 100

        start_totals_aggregated = aggregate_totals(start_totals)
        end_totals_aggregated = aggregate_totals(end_totals)

        percent_changes = {
            'nclientesChange': calculate_percentage_change(end_totals_aggregated['nclientes'], start_totals_aggregated['nclientes']),
            'totvrvendaChange': calculate_percentage_change(end_totals_aggregated['totvrvenda'], start_totals_aggregated['totvrvenda']),
            'totvrcustoChange': calculate_percentage_change(end_totals_aggregated['totvrcusto'], start_totals_aggregated['totvrcusto']),
            'totprodvdaChange': calculate_percentage_change(end_totals_aggregated['totprodvda'], start_totals_aggregated['totprodvda'])
        }

        def calculate_detailed_changes_with_ticket(start_totals, end_totals):
            detailed_changes = []
            start_totals_dict = {item['codfil']: item for item in start_totals}
            end_totals_dict = {item['codfil']: item for item in end_totals}

            for codfil in start_totals_dict.keys() | end_totals_dict.keys():
                start_data = start_totals_dict.get(codfil, {'nclientes': 0, 'totvrvenda': 0, 'totvrcusto': 0, 'totprodvda': 0})
                end_data = end_totals_dict.get(codfil, {'nclientes': 0, 'totvrvenda': 0, 'totvrcusto': 0, 'totprodvda': 0})

                changes = {
                    'codfil': codfil,
                    'nclientesChange': calculate_percentage_change(end_data['nclientes'], start_data['nclientes']),
                    'totvrvendaChange': calculate_percentage_change(end_data['totvrvenda'], start_data['totvrvenda']),
                    'totvrcustoChange': calculate_percentage_change(end_data['totvrcusto'], start_data['totvrcusto']),
                    'totprodvdaChange': calculate_percentage_change(end_data['totprodvda'], start_data['totprodvda']),
                    'start_ticket_medio': start_data['totvrvenda'] / start_data['nclientes'] if start_data['nclientes'] else 0,
                    'end_ticket_medio': end_data['totvrvenda'] / end_data['nclientes'] if end_data['nclientes'] else 0
                }
                detailed_changes.append(changes)
            return detailed_changes

        detailed_changes_with_ticket = calculate_detailed_changes_with_ticket(start_totals, end_totals)

        # Calcular ticket médio geral
        start_ticket_medio = start_totals_aggregated['totvrvenda'] / start_totals_aggregated['nclientes'] if start_totals_aggregated['nclientes'] else 0
        end_ticket_medio = end_totals_aggregated['totvrvenda'] / end_totals_aggregated['nclientes'] if end_totals_aggregated['nclientes'] else 0

        response = {
            'start_period': start_period,
            'end_period': end_period,
            'start_period_totals': start_totals_aggregated,
            'end_period_totals': end_totals_aggregated,
            'percent_changes': percent_changes,
            'start_ticket_medio': start_ticket_medio,
            'end_ticket_medio': end_ticket_medio,
            'details': {
                'start_period_details': start_totals,
                'end_period_details': end_totals,
                'detailed_changes': detailed_changes_with_ticket
            }
        }

        return jsonify(response)

    except mysql.connector.Error as e:
        logging.error("Database error: %s", str(e))
        return jsonify({"error": "Database error"}), 500
    except Exception as e:
        logging.error("Unhandled exception: %s", str(e))
        return jsonify({"error": "Internal server error"}), 500




@app.route('/filter', methods=['GET'])
def filter_data():
    try:
        params = FilterParams(
            start_date=request.args.get('start_date'),
            end_date=request.args.get('end_date')
        )

        conn = db_pool.get_connection()
        cursor = conn.cursor(dictionary=True)
        
        query = """
            SELECT 
                codfil, 
                DATE_FORMAT(data, '%Y-%m') as mes, 
                SUM(nclientes) as nclientes, 
                SUM(totvrvenda) as totvrvenda, 
                SUM(totvrcusto) as totvrcusto, 
                SUM(totprodvda) as totprodvda
            FROM vendas_mes 
            WHERE data BETWEEN %s AND %s
            GROUP BY codfil, mes
            ORDER BY mes
        """
        cursor.execute(query, (params.start_date, params.end_date))
        results = cursor.fetchall()

        total_query = """
            SELECT 
                codfil,
                SUM(nclientes) as nclientes, 
                SUM(totvrvenda) as totvrvenda, 
                SUM(totvrcusto) as totvrcusto, 
                SUM(totprodvda) as totprodvda
            FROM vendas_mes 
            WHERE data BETWEEN %s AND %s
            GROUP BY codfil
        """
        cursor.execute(total_query, (params.start_date, params.end_date))
        total_results = cursor.fetchall()

        cursor.close()
        conn.close()

        vendas_mensais = {}
        for row in results:
            codfil = row['codfil']
            mes = row['mes']
            if codfil not in vendas_mensais:
                vendas_mensais[codfil] = []
            vendas_mensais[codfil].append({
                'mes': mes,
                'nclientes': row['nclientes'],
                'totvrvenda': row['totvrvenda'],
                'totvrcusto': row['totvrcusto'],
                'totprodvda': row['totprodvda']
            })

        total_vendas_por_filial = {}
        for row in total_results:
            codfil = row['codfil']
            total_vendas_por_filial[codfil] = {
                'nclientes': row['nclientes'],
                'totvrvenda': row['totvrvenda'],
                'totvrcusto': row['totvrcusto'],
                'totprodvda': int(row['totprodvda']),
                'ticket_medio': row['totvrvenda'] / row['nclientes'] if row['nclientes'] > 0 else 0
            }

        response = VendasMensaisResponse(
            vendas_mensais=vendas_mensais,
            total_vendas_por_filial=total_vendas_por_filial
        ).dict()

        return jsonify(response)

    except ValidationError as e:
        return jsonify({"error": e.errors()}), 400
    except mysql.connector.Error as e:
        logging.error("Database error: %s", str(e))
        return jsonify({"error": "Database error"}), 500
    except Exception as e:
        logging.error("Unhandled exception: %s", str(e))
        return jsonify({"error": "Internal server error"}), 500


@app.route('/vendasonline', methods=['GET'])
def get_vendas_online():
    try:
        conn = db_pool.get_connection()
        cursor = conn.cursor(dictionary=True)
        
        query = """
            SELECT 
                especie,
                pdv,
                filial,
                SUM(valor) as total
            FROM finalizadoras_online
            WHERE debi_cred = 'C' AND cancelado = ''
            GROUP BY especie, pdv, filial
        """
        cursor.execute(query)
        results = cursor.fetchall()

        cursor.close()
        conn.close()

        finalizadoras_online = {}
        pdvs_online = {}

        for row in results:
            especie = row['especie']
            pdv = row['pdv']
            filial = row['filial']
            total = float(row['total'])

            if especie not in finalizadoras_online:
                finalizadoras_online[especie] = 0
            finalizadoras_online[especie] += total

            if pdv not in pdvs_online:
                pdvs_online[pdv] = {}
            if filial not in pdvs_online[pdv]:
                pdvs_online[pdv][filial] = {}
            pdvs_online[pdv][filial][especie] = total

        response = {
            "finalizadoras_online": finalizadoras_online,
            "pdvs_online": pdvs_online
        }

        return jsonify(response)

    except mysql.connector.Error as e:
        logging.error("Database error: %s", str(e))
        return jsonify({"error": "Database error"}), 500
    except Exception as e:
        logging.error("Unhandled exception: %s", str(e))
        return jsonify({"error": "Internal server error"}), 500

@app.route('/finalizadorasonline', methods=['GET'])
def get_finalizadorasonline():
    try:
        conn = db_pool.get_connection()
        cursor = conn.cursor(dictionary=True)
        
        query = """
            SELECT 
                especie,
                pdv,
                filial,
                cupom,
                SUM(valor) as total
            FROM finalizadoras_online
            WHERE debi_cred = 'C' AND cancelado = ''
            GROUP BY especie, pdv, filial, cupom
        """
        cursor.execute(query)
        results = cursor.fetchall()

        finalizadoras = {}
        pdvs_online = {}

        # Process finalizadoras and pdvs_online
        for row in results:
            especie = row['especie'].strip()
            pdv = row['pdv']
            filial = row['filial']
            cupom = row['cupom']
            total = float(row['total'])

            if especie not in finalizadoras:
                finalizadoras[especie] = 0
            finalizadoras[especie] += total

            if filial not in pdvs_online:
                pdvs_online[filial] = {}
            if pdv not in pdvs_online[filial]:
                pdvs_online[filial][pdv] = {}
            if especie not in pdvs_online[filial][pdv]:
                pdvs_online[filial][pdv][especie] = 0
            pdvs_online[filial][pdv][especie] += total

        cursor.close()
        conn.close()

        response = {
            "finalizadoras": finalizadoras,
            "pdvs_online": pdvs_online
        }

        return jsonify(response)

    except mysql.connector.Error as e:
        logging.error("Database error: %s", str(e))
        return jsonify({"error": "Database error: " + str(e)}), 500
    except Exception as e:
        logging.error("Unhandled exception: %s", str(e))
        return jsonify({"error": "Internal server error: " + str(e)}), 500

@app.route('/finalizadoras_periodo', methods=['GET'])
def get_finalizadoras_periodo():
    try:
        data_inicial = request.args.get('data_inicial')
        data_final = request.args.get('data_final')

        conn = db_pool.get_connection()
        cursor = conn.cursor(dictionary=True)
        
        query = """
            SELECT 
                especie,
                pdv,
                filial,
                SUM(valor) as total_vendas,
                COUNT(*) as num_compras
            FROM finalizadoras
            WHERE debi_cred = 'C' AND cancelado = ''
              AND data BETWEEN %s AND %s
            GROUP BY especie, pdv, filial
        """
        cursor.execute(query, (data_inicial, data_final))
        results = cursor.fetchall()

        cursor.close()
        conn.close()

        finalizadoras = {}
        pdvs = {}

        for row in results:
            especie = row['especie']
            pdv = row['pdv']
            filial = row['filial']
            total_vendas = float(row['total_vendas'])
            num_compras = int(row['num_compras'])

            if especie not in finalizadoras:
                finalizadoras[especie] = 0
            finalizadoras[especie] += total_vendas

            if filial not in pdvs:
                pdvs[filial] = {}
            if pdv not in pdvs[filial]:
                pdvs[filial][pdv] = {}
            if especie not in pdvs[filial][pdv]:
                pdvs[filial][pdv][especie] = 0
            pdvs[filial][pdv][especie] += total_vendas

        response = {
            "finalizadoras": finalizadoras,
            "pdvs": pdvs,
            "data_inicial": data_inicial,
            "data_final": data_final
        }

        return jsonify(response)

    except mysql.connector.Error as e:
        logging.error("Database error: %s", str(e))
        return jsonify({"error": "Database error"}), 500
    except Exception as e:
        logging.error("Unhandled exception: %s", str(e))
        return jsonify({"error": "Internal server error"}), 500

@app.route('/finalizadoras', methods=['GET'])
def get_finalizadoras():
    try:
        conn = db_pool.get_connection()
        cursor = conn.cursor(dictionary=True)
        
        query = """
            SELECT 
                especie,
                pdv,
                filial,
                SUM(valor) as total_vendas,
                COUNT(*) as num_compras
            FROM finalizadoras
            WHERE debi_cred = 'C'
            GROUP BY especie, pdv, filial
        """
        cursor.execute(query)
        results = cursor.fetchall()

        finalizadoras = {}
        pdvs = {}

        for row in results:
            especie = row['especie']
            pdv = row['pdv']
            filial = row['filial']
            total_vendas = float(row['total_vendas'])
            num_compras = int(row['num_compras'])

            if especie not in finalizadoras:
                finalizadoras[especie] = 0
            finalizadoras[especie] += total_vendas

            if filial not in pdvs:
                pdvs[filial] = {}
            if pdv not in pdvs[filial]:
                pdvs[filial][pdv] = {}
            if especie not in pdvs[filial][pdv]:
                pdvs[filial][pdv][especie] = 0
            pdvs[filial][pdv][especie] += total_vendas

        cursor.close()
        conn.close()

        response = {
            "finalizadoras": finalizadoras,
            "pdvs": pdvs
        }

        return jsonify(response)

    except mysql.connector.Error as e:
        logging.error("Database error: %s", str(e))
        return jsonify({"error": "Database error"}), 500
    except Exception as e:
        logging.error("Unhandled exception: %s", str(e))
        return jsonify({"error": "Internal server error"}), 500

@app.route('/faturamento', methods=['GET'])
def get_faturamento():
    try:
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')

        conn = db_pool.get_connection()
        cursor = conn.cursor(dictionary=True)
        
        query_filial = """
            SELECT 
                codfil,
                month_year,
                SUM(total_faturamento) as total_faturamento
            FROM (
                SELECT 
                    codfil83 as codfil,
                    DATE_FORMAT(datemis83, '%Y-%m') as month_year,
                    SUM(valcon83) as total_faturamento
                FROM vendas_faturamento
                WHERE DATE(datemis83) BETWEEN %s AND %s
                GROUP BY codfil83, DATE_FORMAT(datemis83, '%Y-%m')
            ) AS subquery
            GROUP BY codfil, month_year
        """
        cursor.execute(query_filial, (start_date, end_date))
        results_filial = cursor.fetchall()
        
        resumo_por_filial = {}
        for row in results_filial:
            codfil = row['codfil']
            if codfil not in resumo_por_filial:
                resumo_por_filial[codfil] = []
            resumo_por_filial[codfil].append({
                'month_year': row['month_year'],
                'total_faturamento': row['total_faturamento']
            })

        resumo_por_filial_list = [{'codfil': k, 'faturamento': v} for k, v in resumo_por_filial.items()]

        query_total_geral = """
            SELECT SUM(valcon83) as total_geral_faturamento
            FROM vendas_faturamento
            WHERE DATE(datemis83) BETWEEN %s AND %s
        """
        cursor.execute(query_total_geral, (start_date, end_date))
        total_geral_result = cursor.fetchone()
        total_geral_faturamento = total_geral_result['total_geral_faturamento']

        cursor.close()
        conn.close()

        return jsonify({
            "resumo_por_filial": resumo_por_filial_list,
            "total_geral": total_geral_faturamento
        })

    except mysql.connector.Error as e:
        logging.error("Database error: %s", str(e))
        return jsonify({"error": "Database error"}), 500
    except Exception as e:
        logging.error("Unhandled exception: %s", str(e))
        return jsonify({"error": "Internal server error"}), 500

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/novoRelatorio.html')
def novo_relatorio():
    return send_from_directory('static', 'novoRelatorio.html')


if __name__ == '__main__':
    app.run(host='0.0.0.0', debug=True)
