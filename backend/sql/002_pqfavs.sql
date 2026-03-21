-- ProtheusQuery IDE - Tabela de Favoritos
-- Banco: SQL Server
-- Versão: 1.0

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[PQFAVS]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[PQFAVS] (
        [FAV_ID]        CHAR(36)     NOT NULL,
        [FAV_EMPRESA]   CHAR(2)      NOT NULL,
        [FAV_USUARIO]   CHAR(20)     NOT NULL,
        [FAV_NOME]      VARCHAR(100) NOT NULL,
        [FAV_DESC]      VARCHAR(500),
        [FAV_SQL]       NVARCHAR(MAX) NOT NULL,
        [FAV_BANCO]     CHAR(20)     NOT NULL,
        [FAV_DTCRI]     DATETIME     NOT NULL,
        [FAV_DTALT]     DATETIME,
        [FAV_DELETED]   CHAR(1)      DEFAULT ' ',
        CONSTRAINT [PK_PQFAVS] PRIMARY KEY ([FAV_ID])
    );

    CREATE NONCLUSTERED INDEX [IX_PQFAVS_USUARIO] ON [dbo].[PQFAVS] ([FAV_USUARIO]);
    CREATE NONCLUSTERED INDEX [IX_PQFAVS_EMPRESA] ON [dbo].[PQFAVS] ([FAV_EMPRESA]);
    CREATE NONCLUSTERED INDEX [IX_PQFAVS_NOME] ON [dbo].[PQFAVS] ([FAV_NOME]);
END
ELSE
BEGIN
    PRINT 'Tabela PQFAVS já existe.';
END
GO
