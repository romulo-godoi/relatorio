# ⏳ Registro de Campo Pioneiro

Uma aplicação web simples, moderna e eficiente para ajudar pioneiros a registrar e acompanhar suas horas de serviço de campo diretamente no navegador, sem necessidade de instalação.

![image](https://github.com/user-attachments/assets/4af800c4-53ef-4a56-a651-43ccc294befb)


---

## ✨ Funcionalidades Principais

*   **Registro Fácil de Atividades:** Adicione registros diários informando data (com seletor ou "Hoje" como padrão), tempo gasto, modalidade da atividade (Casa em casa, Carrinho, Cartas, etc.) e notas opcionais.
*   **Formatação Inteligente de Tempo:** Digite o tempo como `HH:MM` (ex: `2:30`), `HHMM` (ex: `130` para 1h 30m) ou apenas minutos (ex: `45`). O campo insere os dois pontos `:` automaticamente enquanto você digita números (`130` vira `1:30`).
*   **Planejamento Futuro:** Agende horas que você planeja fazer em datas futuras.
*   **Dashboard Interativo:** Veja rapidamente um resumo das horas da semana atual, o total de horas no mês e o progresso em relação à sua meta mensal em um gráfico de rosca.
*   **Previsão de Meta:** Calcule quantas horas ainda faltam para a meta e veja uma sugestão de ritmo diário para alcançá-la.
*   **Definição de Meta Mensal:** Personalize sua meta de horas para o mês.
*   **Estatísticas Mensais Detalhadas:** Visualize o total de horas, progresso percentual, média de horas por dia ativo e o número de dias com atividade no mês.
*   **Gráfico Mensal Visual:** Acompanhe seu desempenho diário ao longo do mês em um gráfico de barras interativo. Inclui linhas de média (diária, semanal estimada, mensal no ano) para referência.
*   **Seleção de Mês para Gráfico:** Visualize facilmente os gráficos de meses anteriores.
*   **Histórico Completo e Pesquisável:** Todos os seus registros ficam salvos e podem ser pesquisados por data, horas, modalidade ou conteúdo das notas.
*   **Edição e Exclusão:** Modifique ou remova registros e planejamentos facilmente.
*   **Armazenamento 100% Local:** Seus dados ficam **salvos apenas no seu navegador** (usando *Local Storage*), garantindo privacidade total. Nenhum dado é enviado para servidores externos.
*   **Design Responsivo:** Interface agradável e funcional em desktops, tablets e celulares.
*   **Configurações:** Opção segura (com confirmação) para limpar todos os dados do navegador.

---

## 🚀 Como Usar

https://romulo-godoi.github.io/relatorio/

---

## 💾 Armazenamento de Dados

**Importante:** Todos os dados que você registra (horas, notas, planos, meta) são salvos utilizando o **Local Storage** do seu navegador.

*   ✅ **Privacidade:** Os dados ficam apenas na sua máquina, no navegador que você usou.
*   ⚠️ **Atenção:**
    *   Se você **limpar os dados de navegação** (cache, cookies, dados de site) do seu navegador, **todos os registros serão PERDIDOS**.
    *   Os dados **não são sincronizados** entre diferentes navegadores ou diferentes dispositivos. Se usar no Chrome no PC e depois no Safari no celular, serão dois conjuntos de dados separados.
    *   No futuro teremos uma versão que sincronizará os dados.

---

## 🛠️ Tecnologias Utilizadas

*   **HTML5:** Estrutura da página.
*   **CSS3:** Estilização (incluindo Variáveis CSS, Flexbox, Grid para layout responsivo).
*   **JavaScript (ES6+):** Lógica da aplicação, manipulação do DOM, gerenciamento de dados.
*   **Chart.js (v4):** Biblioteca para criação dos gráficos interativos.
*   **Chart.js Annotation Plugin:** Plugin para adicionar as linhas de média ao gráfico.
*   **Local Storage:** API do navegador para armazenamento persistente de dados no lado do cliente.

---

## 🤝 Contribuindo

Contribuições são bem-vindas! Se você encontrar algum bug, tiver sugestões de melhorias ou quiser adicionar novas funcionalidades:

1.  Faça um *Fork* do repositório.
2.  Crie uma nova *Branch* (`git checkout -b feature/NovaFuncionalidade` ou `bugfix/CorrigeAlgo`).
3.  Faça suas alterações e *Commit* (`git commit -m 'Adiciona NovaFuncionalidade'`).
4.  Faça o *Push* para a *Branch* (`git push origin feature/NovaFuncionalidade`).
5.  Abra um *Pull Request*.

---

## 📄 Licença

Distribuído sob a Apache License 2.0. Veja o link para mais informações: [https://www.apache.org/licenses/LICENSE-2.0)

---

Esperamos que esta ferramenta seja útil em seu serviço! 😊
