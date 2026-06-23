# Diretrizes de UI/UX — LançaQi

Este documento serve como a **Fonte de Verdade** para o design, usabilidade e comportamento visual da interface do **LançaQi**. Seu objetivo é guiar o desenvolvimento do front-end (Next.js + Tailwind CSS v4 + shadcn/ui) para garantir uma experiência consistente, fluida, inclusiva e esteticamente premium para os **Analistas**.

---

## 1. Princípios de Design & Estética

### 1.1 Foco na Simplicidade (Zero Atrito)
Como o LançaQi é usado para registros diários e recorrentes por analistas híbridos, o tempo para realizar um lançamento deve ser minimizado.
* **Layout Limpo:** Evitar sobrecarregar as telas com textos desnecessários. Usar espaços em branco estrategicamente.
* **Componentização:** Utilizar componentes reutilizáveis baseados no **shadcn/ui**, estendendo suas propriedades sem quebrar a consistência.

### 1.2 Paleta de Cores e Temas
Utilizar uma paleta de cores moderna, fugindo dos padrões puros do navegador (evitar `#ff0000`, `#00ff00`, etc.).

* **Neutros Premium:** Slate ou Zinc (de `slate-50`/`zinc-50` a `slate-950`/`zinc-950`) para fundos, bordas e textos secundários.
* **Ação Primária:** Indigo, Blue ou Violet para botões de ação e links ativos.
* **Financeiro & Sucesso:** Emerald ou Teal para indicar reembolsos acumulados e status "PAGO".
* **Atenção / Pendências:** Amber ou Yellow para status "PENDENTE" ou avisos de preenchimento.
* **Erro / Destrutivo:** Rose ou Red para mensagens de validação e ações de exclusão.
* **Suporte a Dark Mode:** Todas as telas devem herdar dinamicamente as classes `dark:` garantindo legibilidade tanto no tema claro quanto no escuro.

### 1.3 Tipografia
* **Fontes:** Utilizar fontes modernas do Google Fonts (como **Inter** ou **Outfit**) configuradas no Tailwind.
* **Tamanhos e Pesos:**
  * Títulos principais: `font-bold text-2xl` ou `text-3xl`.
  * Textos e labels: `text-sm font-medium` ou `text-base font-normal`.
  * Números monetários/KM: usar a classe `tabular-nums` para que colunas numéricas fiquem alinhadas perfeitamente.

---

## 2. Padrões de Componentes & Telas do LançaQi

Consulte a especificação de recursos em [Visão do Analista](file:///c:/Users/PatrickSouzaHypeTecn/Desktop/Repos/LancaQi/lancaqi-app/_docs/04-Features/Visao_Analista.md) para alinhar as regras de negócio com os comportamentos abaixo.

### 2.1 Dashboard (`/dashboard`)
* **Hero Metric Card (Valor Acumulado):**
  * O card que exibe o resumo financeiro da quinzena deve ser o elemento de maior peso visual na tela.
  * O valor em R$ deve utilizar uma tipografia de destaque (ex: `text-4xl font-extrabold tracking-tight`).
  * Fornecer um feedback de "estado vazio" elegante caso não existam lançamentos no ciclo atual.

### 2.2 Novo Lançamento (`/lancamento`)
* **Formulário Dinâmico e Reativo:**
  * **Comportamento Condicional:** Ao selecionar o tipo de transporte "Escritório", o campo de quilometragem (KM) deve ser ocultado. Ao selecionar "Cliente (Moto/Carro)", ele deve ser exibido.
  * **Transições Suaves:** A exibição/ocultação do campo KM **não deve saltar abruptamente**. Use transições de altura e opacidade (ex: `transition-all duration-300 ease-in-out`).
  * **Feedback em Tempo Real:** A simulação/prévia do valor financeiro do reembolso deve atualizar instantaneamente enquanto o analista digita no campo de quilometragem. O valor recalculado deve ter destaque visual.
  * **Teclado Apropriado:** Configurar `type="number"` ou `inputmode="decimal"` no campo de quilometragem para garantir uma boa experiência em dispositivos móveis.

### 2.3 Histórico de Reembolsos (`/historico`)
* **Tabela de Dados (Data Table):**
  * **Responsividade:** Garantir que a tabela possa ser visualizada em telas de dispositivos móveis. Usar rolagem horizontal suave (`overflow-x-auto`) ou converter as linhas em pequenos cards em telas compactas.
  * **Status Badges:**
    * **PENDENTE:** Badge amarela (`bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300`).
    * **PAGO:** Badge verde (`bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300`).
  * **Alinhamento:** Alinhar datas e textos à esquerda. Alinhar números (KM) e valores financeiros (R$) à direita.

---

## 3. Diretrizes Gerais de UX e Acessibilidade (Web)

### 3.1 Acessibilidade (a11y)
* **Contraste Mínimo:** Seguir as diretrizes do WCAG AA (proporção mínima de 4.5:1 para textos normais e 3:1 para textos grandes).
* **Alvos de Toque (Touch Targets):** Garantir que todos os botões e links clicáveis tenham uma área mínima de `44x44px` (ou equivalente a `h-11` no Tailwind), prevenindo cliques incorretos em telas móveis.
* **Estados de Foco:** Não desativar o anel de foco padrão dos inputs (`focus:ring-2`). Ele deve ser estilizado de acordo com o tema.

### 3.2 Feedback Visual e Estados
* **Loading States:** Ao carregar dados da tabela ou processar o envio de um formulário, exibir skeletons (`bg-slate-200 animate-pulse` ou similar) ou desativar o botão de submissão mostrando um indicador de progresso (spinner).
* **Prevenção de Cliques Duplos:** Desabilitar botões de envio imediatamente após o clique para evitar duplicação de lançamentos.