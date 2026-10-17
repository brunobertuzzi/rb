# RB Agronegócios — Gestão Veicular & Documental

Sistema corporativo de gestão de estoque veicular, controle de clientes, despesas de pátio, emissão de procurações/contratos e registro de vendas da **RB Agronegócios**.

## Tecnologias

- **Framework:** Next.js 16 (App Router & React 19)
- **Estilização:** Tailwind CSS v4 (Design System Apple iOS)
- **Ícones:** Lucide React
- **Deploy:** Railway (Nixpacks) / GitHub Actions

## Execução Local

```bash
# Instalação das dependências
npm install

# Inicialização do ambiente de desenvolvimento
npm run dev

# Compilação de Produção
npm run build

# Execução em Produção
npm run start
```

## Acesso e Controle de Usuários (RBAC)

O sistema possui controle rigoroso de níveis de acesso por função:

- **Admin (Diretoria):** Acesso irrestrito a todas as áreas, relatórios financeiros, DRE e gestão de credenciais da equipe.
- **Gerente:** Acesso a todas as operações de pátio, custos, documentos e relatórios operacionais.
- **Vendedor:** Foco em vendas e estoque, com proteção dos custos de aquisição e margens da loja.
