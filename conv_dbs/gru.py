import sys
import dbf
import mysql.connector

# Caminho do arquivo DBF
dbf_file_path_grupos = sys.argv[1]  # Primeiro argumento: caminho do arquivo DBF de grupos

# Configurações de conexão com o banco de dados MySQL
db_config = {
    'host': '127.0.0.1',
    'user': 'root',
    'password': 'SG515t3m45',  # Atualize com a senha correta
    'database': 'dashboard'
}

# Função para inserir dados na tabela grupos
def inserir_grupos(conn, cursor, dbf_file_path):
    table = dbf.Table(dbf_file_path)
    table.open()

    # Limpa a tabela antes de inserir novos dados
    cursor.execute("TRUNCATE TABLE grupos")

    # Itera sobre os registros da tabela DBF e insere no banco de dados
    for record in table:
        codgrupo = record["codgrupo"]
        descgrupo = record["descgrupo"]
        coddepto = record["coddepto"]

        insert_query = "INSERT INTO grupos (codgrupo, descgrupo, coddepto) VALUES (%s, %s, %s)"
        cursor.execute(insert_query, (codgrupo, descgrupo, coddepto))

    table.close()

# Abre a conexão com o banco de dados MySQL
try:
    conn = mysql.connector.connect(**db_config)
    cursor = conn.cursor()

    # Insere dados na tabela grupos
    inserir_grupos(conn, cursor, dbf_file_path_grupos)

    # Confirma as alterações no banco de dados após o término da iteração
    conn.commit()

except mysql.connector.Error as err:
    print(f"Error: {err}")
    conn.rollback()

finally:
    # Fecha a conexão após o processamento
    if cursor:
        cursor.close()
    if conn:
        conn.close()

