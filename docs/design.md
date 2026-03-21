# Design — ProtheusQuery IDE
> Especificação de UX/UI utilizando o Design System POUI (Totvs). Define layouts, fluxos de interação, estados visuais e diretrizes de uso de componentes.

---

## 1. Princípios de Design

### 1.1 Consistência com o Ecossistema Totvs
A aplicação deve parecer uma tela nativa do Protheus WebApp. Usuários não devem perceber transição visual ao entrar no ProtheusQuery IDE.

- Utilizar exclusivamente tokens de cor, tipografia e espaçamento do POUI
- Nunca sobrescrever estilos de componentes POUI via `::ng-deep` ou estilos inline
- Manter densidade visual compatível com as telas de gestão do Protheus

### 1.2 Eficiência para Usuário Técnico
Administradores de sistema precisam de densidade de informação e atalhos de teclado. O design prioriza área útil do editor e resultado sobre ornamentação.

### 1.3 Feedback Imediato e Claro
Toda ação assíncrona tem feedback visual. Erros de query são exibidos com detalhes técnicos (mensagem do banco), não mensagens genéricas.

---

## 2. Layout Principal

### 2.1 Estrutura Geral

```
┌──────────────────────────────────────────────────────────────────┐
│  PO-TOOLBAR                                                       │
│  [≡] ProtheusQuery IDE    [Banco: ▼ SQL Server] [Empresa: ▼ 01]  │
│  [Executar F5] [Cancelar] [Salvar Favorito] [Novo] [Histórico]   │
├────────────────────────┬─────────────────────────────────────────┤
│  PAINEL LATERAL        │  EDITOR PRINCIPAL                        │
│  ┌──────────────────┐  │  ┌────────────────────────────────────┐ │
│  │ [Favoritos][Hist]│  │  │  ① SELECT * FROM SA1010            │ │
│  ├──────────────────┤  │  │  ②   WHERE D_E_L_E_T_ = ' '       │ │
│  │ 🔖 Clientes ativos│ │  │  ③   AND A1_COD LIKE '000%'       │ │
│  │ 🔖 Saldo estoque │  │  │  ④_                               │ │
│  │ 🔖 Pedidos abertos│ │  │                                    │ │
│  │ ─────────────────│  │  └────────────────────────────────────┘ │
│  │ ⏱ 14:32 SELECT…  │  │  STATUS: ✓ 42 linhas | 187ms | SELECT  │
│  │ ⏱ 14:28 UPDATE…  │  ├─────────────────────────────────────────┤
│  │ ⏱ 14:15 SELECT…  │  │  GRADE DE RESULTADOS                    │
│  └──────────────────┘  │  ┌──────┬────────────┬──────────────┐   │
│                         │  │A1_COD│ A1_NOME    │ A1_CGC       │   │
│                         │  ├──────┼────────────┼──────────────┤   │
│                         │  │000001│ CLIENTE A  │ 12.345.678.. │   │
│                         │  │000002│ CLIENTE B  │ 98.765.432.. │   │
│                         │  └──────┴────────────┴──────────────┘   │
│                         │  [⬇ Exportar Excel] [⬇ Exportar CSV]    │
└────────────────────────┴─────────────────────────────────────────┘
```

### 2.2 Dimensões e Proporções

| Região | Largura | Comportamento |
|--------|---------|---------------|
| Painel lateral | 280px | Colapsável; padrão expandido |
| Editor SQL | Flexível | Ocupa restante da largura |
| Editor (altura) | 40% da viewport | Redimensionável via drag |
| Grade de resultados | 100% da área inferior | Scroll independente |
| Toolbar | 100% | Fixa no topo |

### 2.3 Responsividade

A aplicação é projetada para uso em **desktop** (foco primário). Em telas abaixo de 1024px:
- Painel lateral colapsa automaticamente
- Acessível via botão de toggle na toolbar
- Grade de resultados exibe scroll horizontal

---

## 3. Componentes e Telas

### 3.1 Toolbar Principal — `po-toolbar`

```html
<po-toolbar
  p-title="ProtheusQuery IDE"
  [p-actions]="toolbarActions"
  [p-items]="toolbarItems">
</po-toolbar>
```

**Ações da Toolbar:**

| Ação | Ícone POUI | Atalho | Visibilidade |
|------|-----------|--------|-------------|
| Executar | `po-icon-play` | F5 | Sempre |
| Cancelar Execução | `po-icon-close` | Esc | Apenas durante execução |
| Salvar como Favorito | `po-icon-star` | Ctrl+S | Sempre |
| Nova query (aba) | `po-icon-plus` | Ctrl+T | Sempre |
| Limpar editor | `po-icon-delete` | — | Sempre |

**Seletores na Toolbar:**

```html
<!-- Seletor de banco -->
<po-select
  name="database"
  p-label="Banco"
  [p-options]="databaseOptions"
  [(ngModel)]="selectedDatabase">
</po-select>

<!-- Seletor de empresa/filial herdado da sessão Protheus -->
<po-select
  name="company"
  p-label="Empresa"
  [p-options]="companyOptions"
  [(ngModel)]="selectedCompany">
</po-select>
```

### 3.2 Editor SQL

O Monaco Editor é envolvido em um componente Angular com wrapper visual POUI:

```html
<div class="pq-editor-wrapper">
  <po-divider p-label="SQL Editor"></po-divider>
  <ngx-monaco-editor
    [options]="editorOptions"
    [(ngModel)]="sqlContent"
    (onInit)="onEditorInit($event)">
  </ngx-monaco-editor>
</div>
```

**Barra de Status do Editor (abaixo do editor):**

```html
<div class="pq-status-bar">
  <!-- Estado: idle -->
  <po-tag p-label="Pronto" p-color="color-11"></po-tag>

  <!-- Estado: executando -->
  <po-loading p-size="sm"></po-loading>
  <span>Executando...</span>

  <!-- Estado: sucesso -->
  <po-tag p-label="SELECT" p-color="color-08"></po-tag>
  <po-badge p-value="42" p-color="color-08"></po-badge>
  <span class="pq-meta">42 linhas &bull; 187ms</span>

  <!-- Estado: erro -->
  <po-tag p-label="ERRO" p-color="color-07"></po-tag>
  <span class="pq-meta-error">ORA-00904: coluna inválida</span>
</div>
```

### 3.3 Painel Lateral — Favoritos e Histórico

```html
<po-tabs>
  <po-tab p-label="Favoritos" p-icon="po-icon-star">
    <po-list-view
      [p-items]="favorites"
      [p-actions]="favoriteActions"
      (p-show-detail)="onFavoriteClick($event)">
    </po-list-view>
  </po-tab>

  <po-tab p-label="Histórico" p-icon="po-icon-clock">
    <po-list-view
      [p-items]="history"
      [p-show-more]="hasMoreHistory"
      (p-show-more)="loadMoreHistory()">
    </po-list-view>
  </po-tab>
</po-tabs>
```

**Item de Histórico:**

```
⏱ 14:32:01  [SELECT]  42 linhas  187ms
SELECT * FROM SA1010 WHERE D_E_L_E_T_...
────────────────────────────────────────
```

**Item de Favorito:**

```
⭐ Clientes ativos por estado
SQL Server • Atualizado em 21/03/2024
[Abrir] [Editar] [Excluir]
```

### 3.4 Grade de Resultados — `po-table`

```html
<po-table
  [p-columns]="resultColumns"
  [p-items]="resultRows"
  [p-loading]="isLoading"
  [p-sort]="true"
  [p-striped]="true"
  p-height="350"
  [p-actions]="tableActions">
</po-table>
```

**Configurações da grade:**
- Máximo de 1.000 linhas exibidas (paginação server-side via `maxRows`)
- Colunas redimensionáveis (quando suportado pelo POUI)
- Tipos de coluna detectados automaticamente (NUMBER alinha à direita, DATE formata BR)
- Valores NULL exibidos como `—` (em itálico cinza)

### 3.5 Modal de Confirmação DML/DDL

Acionado automaticamente quando a query contém comandos `UPDATE`, `DELETE`, `INSERT`, `CREATE`, `ALTER`, `DROP`, `TRUNCATE`:

```html
<po-modal
  p-title="Confirmar execução"
  [p-primary-action]="confirmAction"
  [p-secondary-action]="cancelAction">

  <po-info
    p-label="Tipo de operação"
    [p-value]="queryType">   <!-- ex: "DDL — DROP TABLE" -->
  </po-info>

  <po-info
    p-label="Banco de dados alvo"
    [p-value]="selectedDatabase">
  </po-info>

  <po-divider p-label="Query que será executada"></po-divider>

  <pre class="pq-confirm-sql">{{ sqlPreview }}</pre>

  <po-notification
    p-type="warning"
    p-message="Esta operação pode ser irreversível. Confirme antes de prosseguir.">
  </po-notification>

</po-modal>
```

### 3.6 Modal de Salvar Favorito

```html
<po-modal p-title="Salvar como Favorito">
  <po-input
    name="favName"
    p-label="Nome do favorito"
    p-placeholder="Ex: Clientes ativos por estado"
    [p-required]="true"
    p-max-length="100">
  </po-input>

  <po-textarea
    name="favDesc"
    p-label="Descrição"
    p-placeholder="Descreva o propósito da query..."
    p-max-length="500">
  </po-textarea>

  <po-info p-label="Banco" [p-value]="selectedDatabase"></po-info>
</po-modal>
```

---

## 4. Estados Visuais da Aplicação

| Estado | Visual |
|--------|--------|
| **Idle** (aguardando input) | Editor ativo, toolbar habilitada, status "Pronto" em verde |
| **Executando** | Botão "Cancelar" visível, spinner na status bar, editor readonly |
| **Sucesso SELECT** | Tag "SELECT" azul, badge com contagem de linhas, grade populada |
| **Sucesso DML** | Tag "DML" laranja, badge com linhas afetadas, grade vazia |
| **Sucesso DDL** | Tag "DDL" roxo, mensagem "Comando executado com sucesso" |
| **Erro de Query** | Tag "ERRO" vermelha, mensagem do banco exibida na status bar |
| **Erro de Conexão** | Notification persistente no topo com opção de reconectar |
| **Sem resultados** | Grade vazia com mensagem "A query não retornou resultados" |
| **Sessão expirada** | Modal bloqueante com link para retornar ao login do Protheus |

---

## 5. Tags de Tipo de Query

```html
<!-- SELECT -->
<po-tag p-label="SELECT" p-color="color-08" p-icon="po-icon-eye"></po-tag>

<!-- INSERT -->
<po-tag p-label="INSERT" p-color="color-10" p-icon="po-icon-plus"></po-tag>

<!-- UPDATE -->
<po-tag p-label="UPDATE" p-color="color-02" p-icon="po-icon-edit"></po-tag>

<!-- DELETE -->
<po-tag p-label="DELETE" p-color="color-07" p-icon="po-icon-delete"></po-tag>

<!-- DDL -->
<po-tag p-label="DDL" p-color="color-06" p-icon="po-icon-settings"></po-tag>
```

---

## 6. Atalhos de Teclado

| Atalho | Ação |
|--------|------|
| `F5` | Executar query completa |
| `Ctrl+Enter` | Executar query ou seleção |
| `Ctrl+S` | Salvar como favorito |
| `Ctrl+T` | Nova aba de query |
| `Ctrl+W` | Fechar aba atual |
| `Ctrl+Z` / `Ctrl+Y` | Desfazer / Refazer (Monaco nativo) |
| `Ctrl+/` | Comentar/Descomentar linha |
| `Ctrl+F` | Buscar no editor (Monaco nativo) |
| `Esc` | Cancelar execução em andamento |
| `Ctrl+Shift+H` | Alternar painel de histórico |
| `Ctrl+Shift+F` | Alternar painel de favoritos |

---

## 7. Mensagens e Microcopy

| Contexto | Texto |
|---------|-------|
| Placeholder do editor | `-- Digite sua query SQL aqui ou selecione um favorito` |
| Histórico vazio | `Nenhuma query executada nesta sessão.` |
| Favoritos vazio | `Você ainda não salvou nenhuma query favorita.` |
| Timeout de query | `A query excedeu o tempo limite de {X}s. Refine os filtros ou aumente o timeout.` |
| Confirmação de exclusão de favorito | `Deseja excluir o favorito "{nome}"? Esta ação não pode ser desfeita.` |
| Exportação iniciada | `Download do arquivo {nome}.{formato} iniciado.` |
| Sessão expirada | `Sua sessão no Protheus expirou. Clique aqui para fazer login novamente.` |
| Cancelamento de execução | `Execução cancelada pelo usuário.` |

---

## 8. Diretrizes de Acessibilidade (WCAG 2.1 AA)

- Todos os botões possuem `aria-label` descritivo além do ícone
- A grade de resultados possui `role="grid"` com navegação por teclado
- Contraste mínimo 4.5:1 para textos normais (garantido pelos tokens POUI)
- Notificações de erro são anunciadas por leitores de tela via `aria-live="assertive"`
- Atalhos de teclado não colidem com atalhos do sistema operacional ou browser
- Foco visível mantido em todos os componentes interativos

---

*Versão: 1.0 | Validar contra POUI versão utilizada no ambiente Protheus do cliente.*
