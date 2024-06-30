import sys
import dbf
import mysql.connector

# Caminho do arquivo DBF
dbf_file_path = sys.argv[1]

# Configurações de conexão com o banco de dados MySQL
db_config = {
    'host': '127.0.0.1',
    'user': 'root',
    'password': 'SG515t3m45',  # Atualize com a senha correta
    'database': 'dashboard'
}

# Abre a conexão com o banco de dados MySQL
conn = mysql.connector.connect(**db_config)
cursor = conn.cursor()

# Abre a tabela DBF
table = dbf.Table(dbf_file_path)

# Carrega os registros da tabela
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

