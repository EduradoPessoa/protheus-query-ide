-- ProtheusQuery IDE - Tabela de Histórico de Execuções
-- Banco: SQL Server
-- Versão: 1.0

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[PQHIST]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[PQHIST] (
        [HIS_ID]        CHAR(36)     NOT NULL,
        [HIS_EMPRESA]   CHAR(2)      NOT NULL,
        [HIS_FILIAL]    CHAR(2)      NOT NULL,
        [HIS_USUARIO]   CHAR(20)     NOT NULL,
        [HIS_DTEXEC]    DATETIME     NOT NULL,
        [HIS_BANCO]     CHAR(20)     NOT NULL,
        [HIS_SQL]       NVARCHAR(MAX) NOT NULL,
        [HIS_TIPO]      CHAR(10)     NOT NULL,
        [HIS_ROWS]      INT          DEFAULT 0,
        [HIS_TEMPO]     INT          DEFAULT 0,
        [HIS_STATUS]    CHAR(1)     NOT NULL,
        [HIS_ERRO]      NVARCHAR(MAX),
        [HIS_DELETED]   CHAR(1)      DEFAULT ' ',
        CONSTRAINT [PK_PQHIST] PRIMARY KEY ([HIS_ID])
    );

    CREATE NONCLUSTERED INDEX [IX_PQHIST_USUARIO] ON [dbo].[PQHIST] ([HIS_USUARIO]);
    CREATE NONCLUSTERED INDEX [IX_PQHIST_DTEXEC] ON [dbo].[PQHIST] ([HIS_DTEXEC]);
    CREATE NONCLUSTERED INDEX [IX_PQHIST_EMPRESA] ON [dbo].[PQHIST] ([HIS_EMPRESA], [HIS_FILIAL]);
END
ELSE
BEGIN
    PRINT 'Tabela PQHIST já existe.';
END
GO
