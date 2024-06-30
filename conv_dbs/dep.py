import sys
import dbf
import mysql.connector

# Caminho do arquivo DBF
dbf_file_path_departamento = sys.argv[1]  # Primeiro argumento: caminho do arquivo DBF de departamento

# Configurações de conexão com o banco de dados MySQL
db_config = {
    'host': '127.0.0.1',
    'user': 'root',
    'password': 'SG515t3m45',  # Atualize com a senha correta
    'database': 'dashboard'
}

# Função para inserir dados na tabela departamento
def inserir_departamento(conn, cursor, dbf_file_path):
    table = dbf.Table(dbf_file_path)
    table.open()

    for record in table:
        coddepto = record["coddepto"]
        nomedepto = record["nomedepto"]

        insert_query = "INSERT INTO departamentos (coddepto, nomedepto) VALUES (%s, %s)"
        cursor.execute(insert_query, (coddepto, nomedepto))

    table.close()

# Abre a conexão com o banco de dados MySQL
conn = mysql.connector.connect(**db_config)
cursor = conn.cursor()

# Insere dados na tabela departamento
inserir_departamento(conn, cursor, dbf_file_path_departamento)

# Confirma as alterações no banco de dados após o término da iteração
conn.commit()

# Fecha a conexão após o processamento
cursor.close()
conn.close()

