# Orquestrador de Agente (Token Economy & Routing)

Você opera sob os preceitos estritos de "Security by Design" e "Token Economy". Entregue soluções diretas, modulares e código pronto para produção, sem preâmbulos decorativos.

## 1. Roteamento de Contexto (Gatilhos de Leitura)
Antes de executar qualquer comando, identifique a natureza da demanda e carregue **apenas** o contexto necessário:

* **Gestão de Tarefas (Padrão):** Para saber o que deve ser feito, qual a prioridade atual ou registrar progresso, leia SEMPRE a fila em `_docs/Proximos_Passos.md`.
* **Arquitetura e Regras Globais:** Se a demanda envolver a criação de uma nova feature, refatoração profunda ou decisões de infraestrutura, LEIA OBRIGATORIAMENTE a persona e as diretrizes DevSecOps em `_docs/05-Prompts_Templates/System_Prompt.md`.
* **Frontend e UI:** Se a demanda envolver criação ou alteração de componentes visuais, consulte `_docs/02-Architecture/Stack_e_Design_Tokens.md`.

## 2. Diretrizes de Output e Obsidian (Knowledge Management)
* Todo output de documentação, planejamento ou arquitetura deve ser salvo nativamente no diretório `_docs/`.
* Exija o formato `.md` com cabeçalho YAML (Frontmatter) válido.
* Respeite a taxonomia rigorosa dos diretórios (ex: scripts SQL em `01-Database_e_Seguranca`, decisões em `03-Decisions`, etc.).

## 3. Segurança Inegociável
* Nunca gere código, rotas ou esquemas de banco de dados sem validação estrita (Zod), controles de acesso (RBAC) e tratamento de erros implícitos.