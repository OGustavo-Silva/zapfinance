# ZapFinance - WhatsApp Finance Bot

Bot pessoal para controle de despesas via WhatsApp, com comandos em PT-BR iniciados por `$$`.

## O que este projeto faz

- Registra despesas avulsas
- Registra despesas mensais
- Permite marcar mensal como paga
- Permite ajustar categoria de mensal
- Mostra resumo/listagens por mês
- Envia lembretes automáticos de vencimento (D-2 e D-1)
- Faz virada de ciclo mensal automaticamente quando vencer sem pagamento

## Stack

- Node.js + TypeScript
- SQLite (`better-sqlite3`)
- WhatsApp Web API (`@whiskeysockets/baileys`)
- Scheduler (`node-cron`)

## Requisitos

- Node.js 20+ (recomendado LTS)
- npm
- Conta do WhatsApp para autenticar no primeiro login

## Instalação

```bash
npm install
```

## Configuração

1. Copie o arquivo de exemplo:

```bash
cp .env.example .env
```

2. Revise os parâmetros no `.env`:

```env
TZ=America/Sao_Paulo
DB_PATH=./data/zapfinance.db
AUTH_STATE_PATH=./auth_state
SCHEDULER_TIME=09:00
```

### Significado das variáveis

- `TZ`: timezone usado para data local, lembretes e job diário
- `DB_PATH`: caminho do banco SQLite
- `AUTH_STATE_PATH`: pasta com credenciais persistidas do WhatsApp
- `SCHEDULER_TIME`: horário diário do scheduler no formato `HH:MM`

## Rodando o bot

### Desenvolvimento (watch)

```bash
npm run dev
```

### Execução normal

```bash
npm start
```

### Build TypeScript

```bash
npm run build
```

### Testes

```bash
npm test
```

## Primeiro login no WhatsApp

1. Execute `npm start`
2. O terminal exibirá um QR Code
3. No WhatsApp do celular: Dispositivos conectados -> Conectar dispositivo
4. Escaneie o QR
5. Após conectar, a sessão fica salva em `auth_state/`

Na próxima execução, o QR normalmente nao será necessário.

## Regras de entrada (importante)

- Somente mensagens que começam com `$$` são processadas
- Mensagens sem `$$` são ignoradas
- O bot processa apenas mensagens enviadas por você no seu próprio chat (self-chat)

## Guia de comandos

### 1) Despesa avulsa

Sintaxe:

```text
$$ {nome} {valor} {categoria_opcional}
```

Exemplos:

```text
$$ uber 35,50 transporte
$$ cafe 8.90
$$ "ifood mercado" 120,90 "casa e mercado"
```

Observações:

- Valor aceita vírgula ou ponto decimal
- Categoria é opcional
- Para texto com espaços, use aspas duplas

### 2) Despesa mensal

Sintaxe:

```text
$$ mensal {nome} {valor} {vencimento_DD/MM_opcional} {categoria_opcional}
```

Exemplos:

```text
$$ mensal netflix 55,90 10/05 streaming
$$ mensal internet 120,00
$$ mensal "plano celular" 69.90 15/05 telecom
```

Observações:

- Se o vencimento nao for informado, assume dia `01/01` como template de vencimento
- Categorias são criadas automaticamente quando necessário
- É permitido cadastrar mais de uma mensal com o mesmo nome

### 3) Marcar mensal como paga

Sintaxe:

```text
$$ pago {nome}
```

Exemplo:

```text
$$ pago netflix
```

Comportamento:

- Marca como paga apenas a mensal em aberto na competência atual
- Se nao encontrar, retorna aviso de nao encontrado
- Se houver mais de uma mensal em aberto com mesmo nome, retorna ambiguidade

### 4) Alterar categoria de mensal

Sintaxe:

```text
$$ categoria {nome_ou_id} {nova_categoria}
```

Exemplos:

```text
$$ categoria netflix streaming
$$ categoria 12 moradia
```

Comportamento:

- Resolve por ID (numérico) ou nome
- Cria a categoria se ela ainda nao existir
- Se o nome for ambíguo, solicita uso de ID

### 5) Consultas

Resumo do mês atual:

```text
$$ resumo
```

Listar despesas do mês atual:

```text
$$ listar
```

Próximos vencimentos pendentes:

```text
$$ vencimentos
```

Consulta por mês específico:

```text
$$ periodo MM/AAAA
```

Exemplo:

```text
$$ periodo 05/2026
```

## Lembretes e virada de ciclo

### Lembretes

O scheduler diário roda no horário definido em `SCHEDULER_TIME` (timezone `TZ`):

- Envia lembrete em D-2 do vencimento se estiver em aberto
- Envia lembrete em D-1 do vencimento se estiver em aberto
- Nao envia lembretes para contas já pagas

### Virada

Quando uma mensal passa do vencimento sem pagamento:

- O ciclo anterior é marcado como vencido sem pagamento
- Uma mensagem de aviso é enviada
- Um novo ciclo é aberto automaticamente

## Estrutura principal do projeto

```text
src/
  app-bootstrap/
  whatsapp-adapter/
  command-parser/
  command-router/
  finance-service/
  repository-sqlite/
  scheduler-service/
  presenter/
  __tests__/
```

## Troubleshooting

### QR nao aparece

- Verifique se há sessão antiga em `auth_state/`
- Se necessário, pare o bot, apague `auth_state/` e rode novamente

### Bot nao responde comandos

- Confirme que a mensagem começa com `$$`
- Confirme que a mensagem foi enviada por você mesmo
- Verifique logs no terminal para erros de parse ou execução

### Banco nao é criado

- Verifique permissões de escrita no caminho de `DB_PATH`
- Confirme se a pasta `data/` existe (o projeto cria automaticamente quando possível)

## Observações atuais da versão

- O comando `$$ categoria` atua sobre despesas mensais cadastradas
- O comando `$$ pago` opera por nome da mensal
- Em caso de ambiguidade, o bot retorna mensagem orientando correção

## Licença

ISC
