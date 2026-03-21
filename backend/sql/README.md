# Scripts SQL - ProtheusQuery IDE

Este diretório contém os scripts de criação das tabelas de persistência do ProtheusQuery IDE.

## Tabelas

| Script | Tabela | Descrição |
|--------|--------|-----------|
| `001_pqhist.sql` | PQHIST | Histórico de execuções de queries |
| `002_pqfavs.sql` | PQFAVS | Favoritos salvos pelos usuários |
| `003_pqaudt.sql` | PQAUDT | Auditoria de ações no sistema |

## Ordem de Execução

Execute os scripts na seguinte ordem:

1. **`001_pqhist.sql`** - Cria a tabela de histórico
2. **`002_pqfavs.sql`** - Cria a tabela de favoritos
3. **`003_pqaudt.sql`** - Cria a tabela de auditoria

## Observações

- Os scripts são compatíveis com **SQL Server**
- Cada script verifica se a tabela já existe antes de criá-la
- As tabelas incluem índices para otimização de consultas
- Todos os campos de texto longo usam `NVARCHAR(MAX)` para suporte a caracteres unicode
- Os scripts devem ser executados no banco de dados principal do Protheus (conexão padrão)
