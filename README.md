# QComanda / Aqui Comanda — Angular

Projeto Angular recriado a partir da versão React do SaaS Aqui Comanda/QComanda.

## Identidade usada

- Títulos: Archivo Black
- Interface/textos: Inter
- Verde principal: `#1B3227`
- Verde profundo: `#172920`
- Mostarda/CTA: `#C37C22`
- Fundo quente: `#F7F2EC`
- Cards/inputs: `#FFFFFF`

## Telas implementadas

### `/mapa`

Tela inicial do sistema: **Mapa de Comandas**.

Inclui:

- sidebar com navegação;
- header com estabelecimento, busca geral, Menu e Sair;
- resumo de comandas;
- grade de comandas 01 a 30;
- diferenciação visual entre **LIVRE** e **OCUPADA**;
- busca por número de comanda.

### Rotas em construção

As rotas abaixo já existem e mantêm o layout do sistema, mas exibem apenas **Em construção**:

- `/comandas`
- `/mesas`
- `/pedidos`
- `/caixa`
- `/cardapio`
- `/relatorios`
- `/configuracoes`

### `/login`

Tela de login visual com e-mail/senha e login com Google, sem autenticação real por enquanto.

## Rodar localmente

```bash
npm install
npm start
```

Depois acesse o endereço indicado pelo Angular CLI no terminal.

## Build

```bash
npm run build
```
