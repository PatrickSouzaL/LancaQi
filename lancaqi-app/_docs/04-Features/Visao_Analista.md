# Visão do Analista - LançaQi

## 1. Visão Geral
Esta seção é dedicada aos usuários comuns (Analistas) para o registro diário de seus deslocamentos no modelo híbrido[cite: 1]. A interface deve ser focada na simplicidade, sem atritos e projetada para uso rápido.

## 2. Regras de Negócio Core
* **Política de Confiança:** O sistema opera sob um modelo de confiança e tabelamento, não exigindo o upload de fotos, notas fiscais ou comprovantes físicos[cite: 1].
* **Isolamento de Dados (Contexto de Segurança):** O analista possui permissão estrita para ler, inserir e visualizar apenas as despesas vinculadas ao seu próprio `usuario_id`[cite: 1].
* **Cálculo Descentralizado:** O front-end atua apenas como uma camada de simulação, exibindo uma prévia visual do valor para melhorar a experiência do usuário[cite: 1]. O valor financeiro real não deve ser confiado a partir do navegador; ele será refeito pelo back-end[cite: 1].

## 3. Mapeamento de Telas e Componentes

### 3.1 Dashboard (`/dashboard`)
* **Objetivo:** Visão rápida da saúde financeira do usuário no ciclo atual.
* **Componentes Exigidos:** Um Card de destaque (Hero Metric) exibindo o resumo financeiro da quinzena atual, mostrando o Total em R$ acumulado[cite: 1].

### 3.2 Novo Lançamento (`/lancamento`)
* **Objetivo:** Formulário dinâmico, seguro e reativo para inserção de novas despesas[cite: 1].
* **Comportamento Interativo Exigido:**
  * Se o tipo de deslocamento selecionado for "Escritório": O sistema não deve pedir a quilometragem (ocultar o campo KM)[cite: 1].
  * Se o tipo de deslocamento selecionado for "Cliente (Moto/Carro)": O sistema deve obrigatoriamente pedir a quilometragem (exibir o campo KM)[cite: 1].
  * **Feedback Visual:** O formulário deve calcular e exibir uma prévia do valor na tela em tempo real, conforme o usuário digita a quilometragem[cite: 1].

### 3.3 Histórico (`/historico`)
* **Objetivo:** Transparência e auditoria pessoal sobre os reembolsos solicitados.
* **Componentes Exigidos:** Uma tabela de dados completa listando o status de todas as despesas submetidas pelo analista[cite: 1].
* **Dados a serem exibidos na Tabela:** Data, Origem, Destino, Tipo de Transporte, Quantidade de KM, Valor Calculado (Prévia) e o Status atual da solicitação (ex: PENDENTE, PAGO)[cite: 1].