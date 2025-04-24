document.addEventListener('DOMContentLoaded', () => {

    // ----- Configurações de Internacionalização (i18n) -----
    const i18n = {
        translations: {},
        supportedLanguages: ['pt-BR', 'en', 'es'], // Adicionado 'es'
        defaultLanguage: 'en',
        currentLanguage: 'en',
        translationsUrl: './translations.json', // Caminho para as traduções

        detectLanguage() {
            const fullBrowserLang = navigator.language || navigator.userLanguage || this.defaultLanguage;
            const baseBrowserLang = fullBrowserLang.split('-')[0];

            // Prioriza a linguagem completa, depois a base, depois linguagens relacionadas, depois default, depois a primeira suportada
            if (this.supportedLanguages.includes(fullBrowserLang)) {
                this.currentLanguage = fullBrowserLang;
            } else if (this.supportedLanguages.includes(baseBrowserLang)) {
                this.currentLanguage = baseBrowserLang;
            } else if (this.supportedLanguages.some(lang => lang.startsWith(baseBrowserLang))) {
                this.currentLanguage = this.supportedLanguages.find(lang => lang.startsWith(baseBrowserLang)) || this.defaultLanguage;
            } else if (this.supportedLanguages.includes(this.defaultLanguage)) {
                this.currentLanguage = this.defaultLanguage;
            } else if (this.supportedLanguages.length > 0) {
                this.currentLanguage = this.supportedLanguages[0];
            } else {
                this.currentLanguage = this.defaultLanguage; // Fallback final
            }
            console.log(`Browser language: ${fullBrowserLang}, Using language: ${this.currentLanguage}`);
            document.documentElement.lang = this.currentLanguage; // Define lang no HTML
        },

        async loadTranslations() {
            try {
                const response = await fetch(this.translationsUrl);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}, fetching ${this.translationsUrl}`);
                }
                this.translations = await response.json();
                console.log('Translations loaded successfully.');
                // Garante que a linguagem padrão e atual tenham objetos, mesmo que vazios
                this.translations[this.defaultLanguage] = this.translations[this.defaultLanguage] || {};
                this.translations[this.currentLanguage] = this.translations[this.currentLanguage] || this.translations[this.defaultLanguage];
            } catch (error) {
                console.error('Error loading translations:', error);
                // Fallback seguro mesmo em caso de erro de rede/parse
                this.translations = {
                    [this.defaultLanguage]: this.translations[this.defaultLanguage] || {},
                    [this.currentLanguage]: {} // Cria objeto vazio para evitar erros de `undefined`
                };
                // Garante que a linguagem atual tenha ao menos o fallback padrão
                this.translations[this.currentLanguage] = this.translations[this.defaultLanguage];
                showFeedback(`Error loading translations: ${error.message}. Falling back to ${this.currentLanguage}.`, 'danger');
            }
        },

        t(key, replacements = {}) {
            // Usa a tradução atual ou a padrão se a atual não existir ou não tiver a chave
            const langTranslations = this.translations[this.currentLanguage] || this.translations[this.defaultLanguage] || {};
            let translation = langTranslations[key] || key; // Usa a chave como fallback final

            if (Array.isArray(translation)) { // Se for um array (ex: monthNames)
                return translation;
            }

            if (typeof translation === 'string') { // Substitui placeholders
                for (const placeholder in replacements) {
                    const regex = new RegExp(`\\{${placeholder}\\}`, 'g');
                    translation = translation.replace(regex, replacements[placeholder]);
                }
            } else {
                console.warn(`Translation for key "${key}" is not a string or array:`, translation);
                translation = key; // Fallback para a chave se o tipo for inesperado
            }
            return translation;
        },

        applyTranslationsToDOM() {
            // Traduz textos
            document.querySelectorAll('[data-translate-key]').forEach(element => {
                const key = element.getAttribute('data-translate-key');
                const translation = this.t(key);
                // Suporte básico a HTML nas traduções
                if (typeof translation === 'string' && translation.includes('<') && translation.includes('>')) {
                    element.innerHTML = translation;
                } else {
                    element.textContent = translation;
                }
            });
            // Traduz placeholders
            document.querySelectorAll('[data-translate-placeholder-key]').forEach(element => {
                const key = element.getAttribute('data-translate-placeholder-key');
                element.placeholder = this.t(key);
            });
            // Traduz títulos (tooltips)
            document.querySelectorAll('[data-translate-title-key]').forEach(element => {
                const key = element.getAttribute('data-translate-title-key');
                element.title = this.t(key);
            });
            // Define título da página
            document.title = this.t('appTitle');
            // Atualiza ícones de toggle (se usar texto)
            document.querySelectorAll('.toggle-icon').forEach(icon => {
                 const card = icon.closest('.card');
                 const isExpanded = card ? card.classList.contains('expanded') : false;
                 icon.textContent = isExpanded ? this.t('toggleIconCollapse') : this.t('toggleIconExpand');
             });
             // Traduz opções do select de modalidade e define valor padrão
            const tagSelect = document.getElementById('record-tag');
            if(tagSelect) {
                 const currentSelectedValue = tagSelect.value; // Salva valor atual se houver
                 tagSelect.querySelectorAll('option[data-translate-key]').forEach(option => {
                     const key = option.getAttribute('data-translate-key');
                     option.textContent = this.t(key); // Atualiza texto da option
                     option.value = this.t(key); // IMPORTANTE: Atualiza o value para a string traduzida
                 });
                 // Tenta redefinir para o valor que estava selecionado, senão define o padrão
                  const defaultTagValue = this.t('recordTagOptionHouseToHouse');
                  if ([...tagSelect.options].some(opt => opt.value === currentSelectedValue)) {
                       tagSelect.value = currentSelectedValue;
                  } else {
                       tagSelect.value = defaultTagValue;
                  }

            }
        }
    };

    // ----- Variáveis Globais e Seletores de Elementos -----
    let appElement, dashboardWeekHours, dashboardMonthPercentage, dashboardMonthTotal,
        dashboardForecast, dashboardPlannedDatesContainer, dashboardPlanList, progressRingFg,
        recordCard, recordForm, recordIdInput, recordDateInput, dateLabel, displayDate,
        changeDateBtn, recordHoursInput, recordTagSelect, recordNotesInput, saveRecordBtn,
        planCard, planForm, planIdInput, planDateInput, planHoursInput, savePlanBtn,
        clearPlanFormBtn, planningList, planningListPlaceholder, monthlyGoalInput, saveGoalBtn,
        statsMonthHours, statsMonthGoalProgress, statsMonthProgressBar, statsAvgHoursDay,
        statsMonthDaysActive, chartMonthSelector, historyList, // REMOVIDO: monthlyHoursChartCtx
        historySearchInput, historyListPlaceholder, showingResultsLabel, clearAllDataBtn,
        confirmationDialog, dialogMessage, dialogConfirmBtn, dialogCancelBtn,
        computedStyles, textColor, textMutedColor, // REMOVIDO: gridColor, tooltipBgColor, primaryColor etc (obtidos em renderCharts)
        categoryChartCtx, categoryChartInstance = null; // <<-- ADICIONADO/RENOMEADO para o gráfico de categorias

    let recordedEntries = [];
    let plannedEntries = [];
    let settings = { monthlyGoal: 70, goalHasBeenSet: false };
    // REMOVIDO: monthlyHoursChartInstance = null;
    let currentEditingId = null;
    let currentConfirmCallback = null;
    let isDateInputVisible = false;
    let deferredInstallPrompt = null;
    let progressRingRadius = 0;
    let progressRingCircumference = 0;

    // ----- Constantes -----
    const HISTORY_MONTH_LIMIT = 3;
    const NOTES_MAX_LENGTH = 300;
    const MIN_HOURS_PER_DAY_FORECAST = 1.0;
    const LOCAL_STORAGE_KEYS = {
        ENTRIES: 'pioneerTracker_entries_v5.3', // Incrementa versão se estrutura mudar
        PLANS: 'pioneerTracker_plans_v1.3',
        SETTINGS: 'pioneerTracker_settings_v1.3'
    };
    // Cores para o Gráfico de Pizza/Doughnut
    const PIE_CHART_COLORS = [
        '#0A84FF', '#30D158', '#FF9F0A', '#AF52DE', '#5E5CE6', '#FF453A',
        '#FFD60A', '#A2845E', '#8E8E93', '#409CFF', '#52D1AA', '#FFB340',
        // Adicione mais se necessário
    ];


    // ----- Funções Utilitárias -----
    function replacePlaceholders(text, replacements) { /* ... (código como antes) ... */ }
    function getCurrentDateString() { /* ... */ }
    function formatDisplayDate(dateString) { /* ... */ }
    function getMonthYearString(date) { /* ... */ }
    function getStartOfWeek(date = new Date()) { /* ... */ }
    function getDateMonthsAgo(months) { /* ... */ }
    function formatMonthYearExtensive(monthYearString) { /* ... (com verificação de Array) ... */ }
    function formatHoursExtensive(hoursDecimal, short = false) { /* ... (depende do translations.json corrigido) ... */ }
    function parseTimeInputToDecimal(timeString) { /* ... (código como antes) ... */ }
    function formatDecimalToTimeInput(decimalHours) { /* ... */ }
    function formatRelativeDate(dateString) { /* ... (com verificação de Array) ... */ }
    function getDefaultTag() { return i18n.t('recordTagOptionHouseToHouse'); } // Tag padrão baseada na tradução

    // --- NOVA FUNÇÃO PARA GRÁFICO DE CATEGORIAS ---
    function getCategoryHoursForMonth(entries, monthYearValue) {
        if (!monthYearValue) return { labels: [], data: [] };

        const [selectedMonth, selectedYear] = monthYearValue.split('/').map(Number);
        const monthIndex = selectedMonth - 1;
        const year = selectedYear;
        const defaultCategoryTag = i18n.t('recordTagOptionOther'); // Pega a string 'Outro' traduzida

        const categoryTotals = entries.reduce((acc, entry) => {
            const entryDate = new Date(entry.date + 'T00:00:00');
            if (entryDate.getMonth() === monthIndex && entryDate.getFullYear() === year) {
                // Usa a tag da entrada; se for vazia/null, usa a tag padrão "Outro" traduzida
                const tag = entry.tag || defaultCategoryTag;
                acc[tag] = (acc[tag] || 0) + entry.hours;
            }
            return acc;
        }, {});

        // Converte para arrays e arredonda horas (mantém precisão)
        const labels = Object.keys(categoryTotals);
        const data = labels.map(label => parseFloat(categoryTotals[label].toFixed(2)));

        // Ordena do maior para o menor
        const combined = labels.map((label, index) => ({ label, value: data[index] }));
        combined.sort((a, b) => b.value - a.value);

        return {
            labels: combined.map(item => item.label),
            data: combined.map(item => item.value)
        };
    }


    // ----- Persistência (sem alterações) -----
    function saveData() { /* ... */ }
    function loadData() { /* ... */ }

    // ----- PWA (sem alterações) -----
    function triggerInstallPromptIfAvailable(context = 'Context not specified') { /* ... */ }

    // ----- UI e Manipulação do DOM (sem alterações significativas além das ligadas aos gráficos) -----
    function promptForMonthlyGoal() { /* ... */ }
    function setDateInputVisibility(visible) { /* ... */ }
    function toggleCard(cardElement) { /* ... */ }
    function clearRecordForm() { /* ... */ }
    function handleRecordSubmit(event) { /* ... */ }
    function editRecordEntry(id) { /* ... */ }
    function deleteRecordEntry(id) { /* ... */ }
    function clearPlanForm() { /* ... */ }
    function handlePlanSubmit(event) { /* ... */ }
    function markPlanAsDone(id) { /* ... */ }
    function deletePlanEntry(id) { /* ... */ }
    function handleGoalSave() { /* ... */ }
    function handleClearAllData() { /* ... */ }
    function showConfirmationDialog(message, onConfirm) { /* ... */ }
    function hideConfirmationDialog() { /* ... */ }
    function showFeedback(message, type = 'info') { /* ... */ }
    function updateDashboard() { /* ... */ }
    function updateProgressRing(currentValue, maxValue) { /* ... */ }
    function updateDashboardPlannedDates() { /* ... */ }
    function renderHistory() { /* ... */ }
    function renderPlanning() { /* ... */ }
    function updateStatistics() { /* ... */ }
    function populateMonthSelector() { /* ... (pode precisar revalidar seletores se IDs mudaram) */ }

    // ----- Gráfico (Função ÚNICA para Categoria) -----
    function renderCharts(selectedMonthYearValue) {
        if (!categoryChartCtx) { console.error("Category chart context not found."); return; }

        if (categoryChartInstance) categoryChartInstance.destroy();
        categoryChartInstance = null;

        const selectMonthMsg = i18n.t('feedbackChartSelectMonth');
        const noDataMonthMsg = i18n.t('feedbackChartNoDataMonth', { month: formatMonthYearExtensive(selectedMonthYearValue) });
        const renderErrorMsg = i18n.t('feedbackChartRenderError');
        const noCategoryDataMsg = i18n.t('chartNoCategoryData'); // Usará o texto da tradução

         const drawPlaceholder = (ctx, message) => {
             ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
             ctx.save();
             ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
              // Busca cor do CSS, usa fallback
              const mutedColor = computedStyles ? computedStyles.getPropertyValue('--text-color-secondary').trim() : 'rgba(235, 235, 245, 0.6)';
              const font = computedStyles ? `14px ${computedStyles.fontFamily}` : '14px sans-serif';
             ctx.fillStyle = mutedColor;
             ctx.font = font;
             // Wrap text (código simples, pode ser melhorado)
              const maxW = ctx.canvas.width * 0.8; const words = message.split(' '); let line = '';
              let y = ctx.canvas.height / 2; const lineHeight = 18;
              for (let n = 0; n < words.length; n++) { const testLine = line + words[n] + ' '; const metrics = ctx.measureText(testLine);
                 const testWidth = metrics.width; if (testWidth > maxW && n > 0) { ctx.fillText(line.trim(), ctx.canvas.width / 2, y); line = words[n] + ' '; y += lineHeight;
                 } else { line = testLine; } }
              ctx.fillText(line.trim(), ctx.canvas.width / 2, y);
             ctx.restore();
         };


        if (!selectedMonthYearValue) {
            drawPlaceholder(categoryChartCtx, selectMonthMsg);
            return;
        }

        try {
            const categoryData = getCategoryHoursForMonth(recordedEntries, selectedMonthYearValue);

            if (!categoryData || categoryData.labels.length === 0) {
                 const [selMonth, selYear] = selectedMonthYearValue.split('/').map(Number);
                 const hasAnyHours = recordedEntries.some(e => { const d=new Date(e.date+'T00:00:00'); return d.getMonth()===(selMonth-1) && d.getFullYear()===selYear; });
                 drawPlaceholder(categoryChartCtx, hasAnyHours ? noCategoryDataMsg : noDataMonthMsg);
                 return;
            }

            // Busca cores e estilos dinamicamente
            const currentTextColor = computedStyles.getPropertyValue('--text-color').trim();
            const currentTextMutedColor = computedStyles.getPropertyValue('--text-color-secondary').trim();
            const currentTooltipBgColor = computedStyles.getPropertyValue('--card-bg').trim();
            const cardBgColor = computedStyles.getPropertyValue('--card-bg').trim(); // Para borda das fatias

            categoryChartInstance = new Chart(categoryChartCtx, {
                type: 'doughnut',
                data: {
                    labels: categoryData.labels,
                    datasets: [{
                        label: i18n.t('categoryChartCardTitle'), // Usa título do card como label do dataset
                        data: categoryData.data,
                        backgroundColor: PIE_CHART_COLORS,
                        borderColor: cardBgColor,
                        borderWidth: 2,
                        hoverOffset: 8
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: { display: false }, // Título já está no card
                        legend: {
                            position: 'bottom', align: 'center',
                            labels: { color: currentTextMutedColor, boxWidth: 15, padding: 15, font: { size: 13 } }
                        },
                        tooltip: {
                             backgroundColor: currentTooltipBgColor, titleColor: currentTextColor, bodyColor: currentTextColor,
                             padding: 12, cornerRadius: 6,
                            callbacks: {
                                label: function(context) {
                                    const label = context.label || '';
                                    const value = context.parsed || 0;
                                    const total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                                    const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                    return `${label}: ${formatHoursExtensive(value)} (${percentage}%)`;
                                }
                            }
                        }
                    },
                    cutout: '45%'
                }
            });

        } catch (error) {
            console.error("Category chart rendering error:", error);
            drawPlaceholder(categoryChartCtx, renderErrorMsg);
        }
    }

    function updateAllDisplays() {
        // Update outros componentes
        updateDashboard();
        updateStatistics();
        populateMonthSelector();
        renderHistory();
        renderPlanning();

        // Garante que os elementos para o gráfico de categorias existam
        if (!chartMonthSelector || !categoryChartCtx) {
            console.error("Cannot update charts, category chart elements missing.");
            return;
        }

        // Pega o valor selecionado e renderiza o gráfico de categorias
        const selectedMonthValue = chartMonthSelector.value;
        renderCharts(selectedMonthValue); // Agora renderCharts lida com o estado 'sem dados' internamente

        // Atualiza texto do botão de registro
         if (saveRecordBtn) {
            if (recordIdInput?.value) { saveRecordBtn.textContent = i18n.t('updateRecordButton'); }
            else { saveRecordBtn.textContent = i18n.t('saveRecordButton'); }
        }
    }

    // ----- Funções Auxiliares Inputs, SW etc. (sem alterações) -----
    function formatTimeInputOnType(event) { /* ... */ }
    function validateTimeInputOnBlur(event) { /* ... */ }
    function validateNotesInput(event) { /* ... */ }
    function registerServiceWorker() { /* ... */ }

    // ----- Função de Inicialização -----
    async function init() {
        console.log("Initializing Pioneer Work Tracker...");

        i18n.detectLanguage();
        await i18n.loadTranslations();

        console.log("Selecting DOM elements...");
         appElement=document.getElementById('app');
         dashboardWeekHours=document.getElementById('dashboard-week-hours');
         dashboardMonthPercentage=document.getElementById('dashboard-month-percentage');
         dashboardMonthTotal=document.getElementById('dashboard-month-total');
         dashboardForecast=document.getElementById('dashboard-forecast');
         dashboardPlannedDatesContainer=document.getElementById('dashboard-planned-dates');
         dashboardPlanList=document.getElementById('dashboard-plan-list');
         progressRingFg=document.getElementById('progress-ring-fg');
         recordCard=document.getElementById('record-card');
         recordForm=document.getElementById('record-form');
         recordIdInput=document.getElementById('record-id');
         recordDateInput=document.getElementById('record-date');
         dateLabel=document.getElementById('date-label');
         displayDate=document.getElementById('display-date');
         changeDateBtn=document.getElementById('change-date-btn');
         recordHoursInput=document.getElementById('record-hours');
         recordTagSelect=document.getElementById('record-tag');
         recordNotesInput=document.getElementById('record-notes');
         saveRecordBtn=document.getElementById('save-record-btn');
         planCard=document.getElementById('plan-card');
         planForm=document.getElementById('plan-form');
         planIdInput=document.getElementById('plan-id');
         planDateInput=document.getElementById('plan-date');
         planHoursInput=document.getElementById('plan-hours');
         savePlanBtn=document.getElementById('save-plan-btn');
         clearPlanFormBtn=document.getElementById('clear-plan-form-btn');
         planningList=document.getElementById('planning-list');
         planningListPlaceholder=planningList ? planningList.querySelector('.placeholder') : null;
         monthlyGoalInput=document.getElementById('monthly-goal');
         saveGoalBtn=document.getElementById('save-goal-btn');
         statsMonthHours=document.getElementById('stats-month-hours');
         statsMonthGoalProgress=document.getElementById('stats-month-goal-progress');
         statsMonthProgressBar=document.getElementById('stats-month-progress-bar');
         statsAvgHoursDay=document.getElementById('stats-avg-hours-day');
         statsMonthDaysActive=document.getElementById('stats-month-days-active');
         chartMonthSelector=document.getElementById('chart-month-selector');
         historyList=document.getElementById('history-list');
         historySearchInput=document.getElementById('history-search-input');
         historyListPlaceholder=historyList ? historyList.querySelector('.placeholder') : null;
         showingResultsLabel=document.getElementById('showing-results-label');
         clearAllDataBtn=document.getElementById('clear-all-data-btn');
         confirmationDialog=document.getElementById('confirmation-dialog');
         dialogMessage=document.getElementById('dialog-message');
         dialogConfirmBtn=document.getElementById('dialog-confirm-btn');
         dialogCancelBtn=document.getElementById('dialog-cancel-btn');

         // Seleciona apenas o canvas/context do gráfico de categorias
         const categoryChartCanvas = document.getElementById('categoryHoursChart');
         categoryChartCtx = categoryChartCanvas ? categoryChartCanvas.getContext('2d') : null;

         // Atualiza a verificação de elementos críticos
         if (!appElement || !recordForm || !categoryChartCtx || !historyList || !planningList) { // Removido check de monthlyHoursChartCtx
             console.error("Critical DOM elements missing. Aborting initialization.");
             document.body.innerHTML = "<p style='color:red;padding:20px;'>Error: Application could not start. Required elements are missing.</p>";
             return;
         }

        computedStyles = getComputedStyle(document.body); // Pega estilos uma vez no início
        // Cacheia cores/estilos se precisar DEPOIS de carregar os estilos do CSS externo

        // Calcula circunferência do anel
        if (progressRingFg?.r?.baseVal?.value) { // Check mais seguro
             progressRingRadius = progressRingFg.r.baseVal.value;
             progressRingCircumference = 2 * Math.PI * progressRingRadius;
        } else { console.warn("Progress ring radius (r.baseVal) not found or invalid."); progressRingCircumference = 0; }

        console.log("Applying initial translations to DOM...");
        i18n.applyTranslationsToDOM();

        console.log("Loading data from storage...");
        loadData();

        // Data Migration (se necessário)
        const oldDefaultTag = "Casa em casa";
        const currentDefaultTag = i18n.t('recordTagOptionHouseToHouse');
        if (oldDefaultTag !== currentDefaultTag) { /* ... (lógica de migração como antes) ... */ }

        monthlyGoalInput.value = settings.monthlyGoal;

        // REMOVIDO: Registro do ChartAnnotation, pois não é mais usado
        // if (window.ChartAnnotation) { ... }

        console.log("Adding event listeners...");
        appElement.addEventListener('click', (event) => { /* ... */ });
        document.querySelectorAll('.card-header[role="button"]').forEach(header => { header.addEventListener('keydown', (e) => { /* ... */ }); });
        changeDateBtn.addEventListener('click', () => setDateInputVisibility(true));
        recordHoursInput.addEventListener('input', formatTimeInputOnType);
        recordHoursInput.addEventListener('blur', validateTimeInputOnBlur);
        recordNotesInput.addEventListener('input', validateNotesInput);
        recordForm.addEventListener('submit', handleRecordSubmit);
        planHoursInput.addEventListener('input', formatTimeInputOnType);
        planHoursInput.addEventListener('blur', validateTimeInputOnBlur);
        planForm.addEventListener('submit', handlePlanSubmit);
        clearPlanFormBtn.addEventListener('click', clearPlanForm);
        saveGoalBtn.addEventListener('click', handleGoalSave);
        monthlyGoalInput.addEventListener('keypress', (e)=>{if(e.key==='Enter'){e.preventDefault();handleGoalSave();monthlyGoalInput.blur();}});
        clearAllDataBtn.addEventListener('click', handleClearAllData);
        historySearchInput.addEventListener('input', () => renderHistory());
        chartMonthSelector.addEventListener('change', () => updateAllDisplays());
        dialogConfirmBtn.addEventListener('click', () => { /* ... */ });
        dialogCancelBtn.addEventListener('click', hideConfirmationDialog);
        confirmationDialog.addEventListener('click', (e)=>{if(e.target === confirmationDialog) hideConfirmationDialog();});
        window.addEventListener('beforeinstallprompt', (e)=>{ /* ... */ });

        console.log("Setting initial UI state...");
        recordDateInput.value = getCurrentDateString();
        setDateInputVisibility(false);
        clearRecordForm(); clearPlanForm();
        document.querySelectorAll('.card').forEach(card => { const shouldBeExpanded = (card.id === 'record-card'); if (card.classList.contains('expanded') !== shouldBeExpanded) toggleCard(card); });

        console.log("Performing initial full display update...");
        updateAllDisplays();

        registerServiceWorker();

        if (!settings.goalHasBeenSet) { console.log("Initial goal not set, prompting user..."); setTimeout(promptForMonthlyGoal, 700); }
        setInterval(updateDashboardPlannedDates, 60 * 1000);

        console.log("Pioneer Work Tracker Initialization complete.");
    }

     // Start the app
     init().catch(err => { /* ... (tratamento de erro fatal) ... */ });

}); // Fim do DOMContentLoaded
