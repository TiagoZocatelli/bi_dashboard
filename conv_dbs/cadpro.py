import sys
import dbf
import mysql.connector

# Caminho do arquivo DBF
dbf_file_path_cadpro = sys.argv[1]  # Primeiro argumento: caminho do arquivo DBF de cadpro

# Configurações de conexão com o banco de dados MySQL
db_config = {
    'host': '127.0.0.1',
    'user': 'root',
    'password': 'SG515t3m45',  # Atualize com a senha correta
    'database': 'dashboard'
}

# Função para inserir dados na tabela cadpro
def inserir_cadpro(conn, cursor, dbf_file_path):
    table = dbf.Table(dbf_file_path)
    table.open()

    # Limpa a tabela antes de inserir novos dados
    cursor.execute("TRUNCATE TABLE cadpro")

    # Itera sobre os registros da tabela DBF e insere no banco de dados
    for record in table:
        # Verifica se sitpro01 é diferente de 'I'
        if record["sitpro01"] != 'I':
            codfil01 = record["codfil01"]
            codpro01 = record["codpro01"]
            codgss01 = record["codgss01"]
            descpro01 = record["descpro01"]
            cusreal01 = record["cusreal01"]
            prevend01 = record["prevend01"]
            estatu01 = record["estatu01"]

            insert_query = "INSERT INTO cadpro (codfil01, codpro01, codgss01, descpro01, cusreal01, prevend01, estatu01) VALUES (%s, %s, %s, %s, %s, %s, %s)"
            cursor.execute(insert_query, (codfil01, codpro01, codgss01, descpro01, cusreal01, prevend01, estatu01))

    table.close()

# Abre a conexão com o banco de dados MySQL
try:
    conn = mysql.connector.connect(**db_config)
    cursor = conn.cursor()

    # Insere dados na tabela cadpro
    inserir_cadpro(conn, cursor, dbf_file_path_cadpro)

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

