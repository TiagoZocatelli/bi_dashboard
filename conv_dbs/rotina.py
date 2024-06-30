import sys
import os
import dbf
import mysql.connector
from datetime import datetime

# Configurações de conexão com o banco de dados MySQL
db_config = {
    'host': '127.0.0.1',
    'user': 'root',
    'password': 'SG515t3m45',  # Atualize com a senha correta
    'database': 'dashboard'
}

def process_vendas_faturamento(dbf_file_path):
    # Abre a conexão com o banco de dados MySQL
    conn = mysql.connector.connect(**db_config)
    cursor = conn.cursor()

    # Esvazia a tabela antes de inserir novos dados
    cursor.execute("TRUNCATE TABLE vendas_faturamento")

    # Abre a tabela DBF
    table = dbf.Table(dbf_file_path)
    table.open()

    # Itera sobre os registros e insere os dados no banco de dados MySQL
    for record in table:
        datemis83 = record["datemis83"]
        valcon83 = record["valcon83"]
        especie83 = record["especie83"].strip()  # Remove espaços em branco
        codfil83 = record["codfil83"]
        numnota83 = record["numnota83"]
        transac83 = record["transac83"].strip()  # Remove espaços em branco

        # Verifica as condições antes de inserir no banco de dados
        if especie83 == 'NF' and transac83 == 'V':
            # Comando SQL para inserção dos dados na tabela do banco de dados
            insert_query = "INSERT INTO vendas_faturamento (datemis83, valcon83, especie83, codfil83, numnota83, transac83) VALUES (%s, %s, %s, %s, %s, %s)"
            cursor.execute(insert_query, (datemis83, valcon83, especie83, codfil83, numnota83, transac83))

    # Confirma as alterações no banco de dados após o término da iteração
    conn.commit()

    # Fecha a tabela e a conexão após o processamento
    table.close()
    cursor.close()
    conn.close()

def process_finalizadoras_online(base_directory):
    # Esvazia a tabela antes de inserir novos dados
    conn = mysql.connector.connect(**db_config)
    cursor = conn.cursor()
    cursor.execute("TRUNCATE TABLE finalizadoras_online")
    conn.commit()
    cursor.close()
    conn.close()

    # Função para processar um arquivo DBF
    def process_dbf_file(dbf_file_path, filial):
        # Extração do PDV a partir do nome do arquivo
        file_name = os.path.basename(dbf_file_path)
        pdv = file_name[-6:-4]   

        # Abre a conexão com o banco de dados MySQL
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor()

        # Abre a tabela DBF
        table = dbf.Table(dbf_file_path)
        table.open()

        # Itera sobre os registros e insere os dados no banco de dados MySQL
        for record in table:
            horario = record["horario"]
            data = record["data"]
            valor = record["valor"]
            operador = record["operador"]
            cupom = record["cupom"]
            especie = record["especie"]
            origem = record["origem"]
            debi_cred = record["debi_cred"]
            cancelado = record["cancelado"]

            # Verifica a condição antes de inserir os dados
            if debi_cred == 'C' and cancelado != '*' and cancelado != 'C':
                # Comando SQL para inserção dos dados na tabela do banco de dados
                insert_query = """
                INSERT INTO finalizadoras_online (horario, data, valor, operador, cupom, especie, origem, debi_cred, cancelado, filial, pdv)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """
                cursor.execute(insert_query, (horario, data, valor, operador, cupom, especie, origem, debi_cred, cancelado, filial, pdv))

        # Confirma as alterações no banco de dados após o término da iteração
        conn.commit()

        # Fecha a tabela e a conexão após o processamento
        table.close()
        cursor.close()
        conn.close()

    # Obtém a data atual
    data_atual = datetime.now()

    # Extrai o dia e o mês da data atual no formato "DDMM"
    dia_mes = data_atual.strftime("%d%m")

    # Percorre todas as pastas comuni
    for root, dirs, files in os.walk(base_directory):
        for dir_name in dirs:
            if dir_name.startswith("comuni"):
                filial = dir_name.replace('comuni', '')
                filial_dir_path = os.path.join(root, dir_name)

                # Percorre todos os arquivos na pasta da filial e suas subpastas
                for sub_root, sub_dirs, sub_files in os.walk(filial_dir_path):
                    for file in sub_files:
                        # Verifica se o arquivo tem o padrão "fiDDMMXX.dbf"
                        if file.startswith("fi" + dia_mes) and file.endswith(".dbf"):
                            dbf_file_path = os.path.join(sub_root, file)
                            process_dbf_file(dbf_file_path, filial)

                            
def process_finalizadoras(base_directory):
    # Esvazia a tabela antes de inserir novos dados
    conn = mysql.connector.connect(**db_config)
    cursor = conn.cursor()
    cursor.execute("TRUNCATE TABLE finalizadoras")
    conn.commit()
    cursor.close()
    conn.close()

    # Função para processar um arquivo DBF
    def process_dbf_file(dbf_file_path, filial):
        # Extração do PDV a partir do nome do arquivo
        file_name = os.path.basename(dbf_file_path)
        pdv = file_name[-6:-4]  # Extrai os dois últimos caracteres do nome do arquivo

        # Abre a conexão com o banco de dados MySQL
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor()

        # Abre a tabela DBF
        table = dbf.Table(dbf_file_path)
        table.open()

        # Itera sobre os registros e insere os dados no banco de dados MySQL
        for record in table:
            horario = record["horario"]
            data = record["data"]
            valor = record["valor"]
            operador = record["operador"]
            cupom = record["cupom"]
            especie = record["especie"]
            origem = record["origem"]
            debi_cred = record["debi_cred"]
            cancelado = record["cancelado"]

            if debi_cred == 'C' and cancelado != '*' and cancelado != 'C':
            # Comando SQL para inserção dos dados na tabela do banco de dados
                insert_query = """
                INSERT INTO finalizadoras (horario, data, valor, operador, cupom, especie, origem, debi_cred, cancelado, filial, pdv)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """
                cursor.execute(insert_query, (horario, data, valor, operador, cupom, especie, origem, debi_cred, cancelado, filial, pdv))

        # Confirma as alterações no banco de dados após o término da iteração
        conn.commit()

        # Fecha a tabela e a conexão após o processamento
        table.close()
        cursor.close()
        conn.close()


    # Percorre todos os diretórios base (como comuni01, comuni02, ...)
    for root, dirs, files in os.walk(base_directory):
        for dir_name in dirs:
            if dir_name.startswith("comuni"):
                filial = dir_name.replace('comuni', '')
                filial_dir_path = os.path.join(root, dir_name)
                print("Processando:", filial_dir_path)

                # Percorre todos os arquivos na pasta da filial e suas subpastas
                for sub_root, sub_dirs, sub_files in os.walk(filial_dir_path):
                    for file in sub_files:
                        if file.startswith("fi") and file.endswith(".dbf"):
                            dbf_file_path = os.path.join(sub_root, file)
                            process_dbf_file(dbf_file_path, filial)

def process_vendas_mes(dbf_file_path):
    # Abre a conexão com o banco de dados MySQL
    conn = mysql.connector.connect(**db_config)
    cursor = conn.cursor()

    # Esvazia a tabela antes de inserir novos dados
    cursor.execute("TRUNCATE TABLE vendas_mes")

    # Abre a tabela DBF
    table = dbf.Table(dbf_file_path)
    table.open()

    # Itera sobre os registros e insere os dados no banco de dados MySQL
    for record in table:
        data = record["data"]
        totvrvenda = record["totvrvenda"]
        nclientes = record["nclientes"]
        codfil = record["codfil"]
        totvrcusto = record["totvrcusto"]
        totprodvda = record["totprodvda"]  # Adiciona o campo totprodvda

        # Comando SQL para inserção dos dados na tabela do banco de dados
        insert_query = "INSERT INTO vendas_mes (data, totvrvenda, nclientes, codfil, totvrcusto, totprodvda) VALUES (%s, %s, %s, %s, %s, %s)"
        cursor.execute(insert_query, (data, totvrvenda, nclientes, codfil, totvrcusto, totprodvda))

    # Confirma as alterações no banco de dados após o término da iteração
    conn.commit()

    # Fecha a tabela e a conexão após o processamento
    table.close()
    cursor.close()
    conn.close()

# Verifica o argumento de execução para determinar qual função chamar
if len(sys.argv) < 3:
    print("Uso: python3 script.py <opção> <argumento>")
    print("Opções disponíveis:")
    print("  vendas_faturamento <caminho_arquivo_dbf>")
    print("  finalizadoras_online <diretorio_base>")
    print("  finalizadoras <diretorio_base>")
    print("  vendas_mes <caminho_arquivo_dbf>")
    sys.exit(1)

option = sys.argv[1]
argument = sys.argv[2]

if option == "vendas_faturamento":
    process_vendas_faturamento(argument)
elif option == "finalizadoras_online":
    process_finalizadoras_online(argument)
elif option == "finalizadoras":
    process_finalizadoras(argument)
elif option == "vendas_mes":
    process_vendas_mes(argument)
else:
    print("Opção inválida. Use uma das opções disponíveis.")
    sys.exit(1)

#Para processar um arquivo de vendas faturamento
## python3 script.py vendas_faturamento caminho/do/arquivo.dbf

#Para processar finalizadoras online:
# python3 script.py finalizadoras_online caminho/do/diretorio/base

#Para processar finalizadoras:
#python3 script.py finalizadoras caminho/do/diretorio/base

#Para processar um arquivo de vendas mês:
#python3 script.py vendas_mes caminho/do/arquivo.dbf

