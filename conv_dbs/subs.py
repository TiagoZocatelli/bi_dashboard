import sys
import dbf
import mysql.connector

# Caminho do arquivo DBF
dbf_file_path_subgrupos = sys.argv[1]  # Primeiro argumento: caminho do arquivo DBF de grupos

# Configurações de conexão com o banco de dados MySQL
db_config = {
    'host': '127.0.0.1',
    'user': 'root',
    'password': 'SG515t3m45',  # Atualize com a senha correta
    'database': 'dashboard'
}

# Função para inserir dados na tabela grupos
def inserir_subgrupos(conn, cursor, dbf_file_path):
    table = dbf.Table(dbf_file_path)
    table.open()

    # Limpa a tabela antes de inserir novos dados
    cursor.execute("TRUNCATE TABLE subgrupos")

    # Itera sobre os registros da tabela DBF e insere no banco de dados
    for record in table:
        codgss00 = record["codgss00"]
        descgss00 = record["descgss00"]
        codgrupo00 = record["codgrupo00"]

        insert_query = "INSERT INTO subgrupos (codgss00, descgss00, codgrupo00) VALUES (%s, %s, %s)"
        cursor.execute(insert_query, (codgss00, descgss00, codgrupo00))

    table.close()

# Abre a conexão com o banco de dados MySQL
try:
    conn = mysql.connector.connect(**db_config)
    cursor = conn.cursor()

    # Insere dados na tabela grupos
    inserir_subgrupos(conn, cursor, dbf_file_path_subgrupos)

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

