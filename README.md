# Tokyo Sushi - Sistema de Delivery

Sistema completo de delivery para restaurante de sushi com painel administrativo e loja para clientes.

## 🚀 Tecnologias

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Google Apps Script + Google Sheets
- **Deploy**: GitHub + Vercel

## 📁 Estrutura do Projeto

```
Tokyo Sushi/
├── index.html          # Loja (clientes)
├── admin.html          # Painel administrativo
├── css/
│   └── styles.css      # Estilos
├── js/
│   ├── store.js        # JavaScript da loja
│   └── admin.js        # JavaScript do admin
├── assets/
│   └── logo.png        # Logo
└── Codigo.gs           # Google Apps Script
```

## ⚙️ Configuração

### 1. Google Sheets

1. Crie uma nova planilha no Google Sheets
2. Copie o ID da planilha (da URL: `https://docs.google.com/spreadsheets/d/ID_AQUI/edit`)

### 2. Google Apps Script

1. Acesse [script.google.com](https://script.google.com)
2. Crie um novo projeto
3. Cole o conteúdo do arquivo `Codigo.gs`
4. Substitua `YOUR_SPREADSHEET_ID_HERE` pelo ID da sua planilha
5. Execute a função `setup()` para criar as abas
6. Clique em **Implantar > Nova implantação**
7. Selecione **Aplicativo da Web**
8. Configure:
   - Executar como: **Eu**
   - Quem tem acesso: **Qualquer pessoa**
9. Copie a URL gerada

### 3. Atualizar URLs no Projeto

1. Abra `js/store.js` e substitua `YOUR_GOOGLE_APPS_SCRIPT_URL_HERE` pela URL do script
2. Abra `js/admin.js` e faça o mesmo

### 4. Deploy no Vercel

1. Crie um repositório no GitHub
2. Faça push do projeto
3. Conecte ao [Vercel](https://vercel.com)
4. Deploy automático!

## 🎯 Funcionalidades

### Loja (Clientes)
- Visualizar cardápio por categorias
- Adicionar produtos ao carrinho
- Checkout com dados de entrega
- Escolher forma de pagamento (PIX, Dinheiro, Cartão)
- Enviar comprovante PIX via WhatsApp

### Painel Admin
- Dashboard com estatísticas
- Cadastrar/editar/excluir produtos
- Gerenciar pedidos com status:
  - Pendente
  - Preparando
  - Saiu para entrega
  - Entregue
- Configurar WhatsApp e chave PIX

## 📱 Contato

Para suporte, entre em contato via WhatsApp configurado no painel admin.
