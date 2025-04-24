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
                // Adicionado: Trata explicitamente como JSON antes do parse
                const contentType = response.headers.get("content-type");
                if (!contentType || !contentType.includes("application/json")) {
                    throw new TypeError(`Expected JSON, received ${contentType}`);
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
                    [this.defaultLanguage]: {}, // Garante objeto vazio
                    [this.currentLanguage]: {}
                };
                 // Garante que a linguagem atual tenha ao menos o fallback padrão (se existia)
                 // Isto evita que o app fique totalmente sem texto se a tradução principal falhar
                 if (this.translations[this.defaultLanguage]) {
                     this.translations[this.currentLanguage] = this.translations[this.defaultLanguage];
                 } else {
                     this.translations[this.currentLanguage] = {}; // Evita erro se até o default falhar
                 }
                showFeedback(`Error loading translations: ${error.message}. Falling back to ${this.currentLanguage}.`, 'danger');
            }
        },

        t(key, replacements = {}) {
            // Usa a tradução atual ou a padrão se a atual não existir ou não tiver a chave
            const langTranslations = this.translations[this.currentLanguage] || this.translations[this.defaultLanguage] || {};
            let translation = langTranslations[key] !== undefined ? langTranslations[key] : key; // Usa a chave como fallback

            if (Array.isArray(translation)) { // Se for um array (ex: monthNames)
                return translation;
            }

            if (typeof translation === 'string') { // Substitui placeholders
                for (const placeholder in replacements) {
                    const regex = new RegExp(`\\{${placeholder}\\}`, 'g');
                    translation = translation.replace(regex, replacements[placeholder]);
                }
            } else {
                 // Se não for string ou array, mas não for undefined, retorna o valor original (pode ser número, bool)
                 if(translation !== key){
                     console.warn(`Translation for key "${key}" has type ${typeof translation}. Returning raw value.`, translation);
                 } else { // Se era undefined e caiu no fallback (key)
                     console.warn(`Translation key "${key}" not found in ${this.currentLanguage} or default language.`);
                 }
                 translation = translation !== undefined ? translation : key; // Garante não retornar undefined
            }
            return translation;
        },


        applyTranslationsToDOM() {
            // Traduz textos
            document.querySelectorAll('[data-translate-key]').forEach(element => {
                const key = element.getAttribute('data-translate-key');
                const translation = this.t(key);
                if (typeof translation === 'string' && translation.includes('<') && translation.includes('>')) {
                    element.innerHTML = translation;
                } else {
                     // Limpa antes para evitar acúmulo se chamado múltiplas vezes
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
            // Atualiza ícones de toggle
            document.querySelectorAll('.toggle-icon').forEach(icon => {
                 const card = icon.closest('.card');
                 const isExpanded = card ? card.classList.contains('expanded') : false;
                 icon.textContent = isExpanded ? this.t('toggleIconCollapse') : this.t('toggleIconExpand');
             });
             // Traduz opções do select de modalidade
            const tagSelect = document.getElementById('record-tag');
            if(tagSelect) {
                 const previousValue = tagSelect.value; // Guarda valor selecionado
                 let foundPrevious = false;
                 tagSelect.querySelectorAll('option[data-translate-key]').forEach(option => {
                     const key = option.getAttribute('data-translate-key');
                     const translatedText = this.t(key);
                     option.textContent = translatedText;
                     option.value = translatedText; // Define o value como o texto traduzido
                     if(option.value === previousValue) {
                         foundPrevious = true;
                     }
                 });
                 // Se o valor anterior não foi encontrado (mudou idioma), define o padrão
                 if (!foundPrevious) {
                    tagSelect.value = this.t('recordTagOptionHouseToHouse');
                 } else {
                    tagSelect.value = previousValue; // Mantem o valor selecionado
                 }
            }
        }
    };

    // ----- Variáveis Globais e Seletores -----
    let appElement, dashboardWeekHours, dashboardMonthPercentage, dashboardMonthTotal,
        dashboardForecast, dashboardPlannedDatesContainer, dashboardPlanList, progressRingFg,
        recordCard, recordForm, recordIdInput, recordDateInput, dateLabel, displayDate,
        changeDateBtn, recordHoursInput, recordTagSelect, recordNotesInput, saveRecordBtn,
        planCard, planForm, planIdInput, planDateInput, planHoursInput, savePlanBtn,
        clearPlanFormBtn, planningList, planningListPlaceholder, monthlyGoalInput, saveGoalBtn,
        statsMonthHours, statsMonthGoalProgress, statsMonthProgressBar, statsAvgHoursDay,
        statsMonthDaysActive, chartMonthSelector, historyList,
        historySearchInput, historyListPlaceholder, showingResultsLabel, clearAllDataBtn,
        confirmationDialog, dialogMessage, dialogConfirmBtn, dialogCancelBtn,
        computedStyles, // Armazena estilos computados
        categoryChartCtx, categoryChartInstance = null; // Contexto e Instância para gráfico de categorias

    let recordedEntries = [];
    let plannedEntries = [];
    let settings = { monthlyGoal: 70, goalHasBeenSet: false };
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
    const LOCAL_STORAGE_KEYS = { // V6 se algo mudar na estrutura
        ENTRIES: 'pioneerTracker_entries_v5.3',
        PLANS: 'pioneerTracker_plans_v1.3',
        SETTINGS: 'pioneerTracker_settings_v1.3'
    };
    const PIE_CHART_COLORS = [
        '#0A84FF', '#30D158', '#FF9F0A', '#AF52DE', '#5E5CE6', '#FF453A',
        '#FFD60A', '#A2845E', '#8E8E93', '#409CFF', '#52D1AA', '#FFB340'
    ];

    // ----- Funções Utilitárias (sem mudanças, exceto checagens de Array se necessário) -----
    function replacePlaceholders(text, replacements) { if(typeof text !== 'string') return text; for (const placeholder in replacements) { text = text.replace(new RegExp(`\\{${placeholder}\\}`, 'g'), replacements[placeholder]); } return text; }
    function getCurrentDateString() { const t = new Date(); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`; }
    function formatDisplayDate(dateString) { if (!dateString || !dateString.includes('-')) return dateString; const [y, m, d] = dateString.split('-'); return `${d}/${m}/${y}`; }
    function getMonthYearString(date) { const m = String(date.getMonth() + 1).padStart(2, '0'); const y = date.getFullYear(); return `${m}/${y}`; }
    function getStartOfWeek(date = new Date()) { const d = new Date(date); const dayOfWeek = d.getDay(); const diff = d.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); d.setDate(diff); d.setHours(0, 0, 0, 0); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
    function getDateMonthsAgo(months) { const d = new Date(); d.setMonth(d.getMonth() - months); d.setHours(0, 0, 0, 0); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
    function formatMonthYearExtensive(monthYearString) { if (!monthYearString || !monthYearString.includes('/')) return monthYearString; const [m, y] = monthYearString.split('/'); const monthIndex = parseInt(m, 10) - 1; if (monthIndex < 0 || monthIndex > 11) return monthYearString; const monthNames = i18n.t('monthNames'); if (!Array.isArray(monthNames) || monthNames.length !== 12) { console.warn("Month names invalid."); return `${m}/${y}`; } return `${monthNames[monthIndex]} ${y}`; }
    function formatHoursExtensive(hoursDecimal, short = false) { const zeroSuffixKey = short ? 'minutesShortSuffix' : 'hoursSuffix'; const zeroSuffix = `0${i18n.t(short ? 'hoursShortSuffix' : 'hoursSuffix')}` || (short ? "0h" : "0 hours"); if (isNaN(hoursDecimal) || hoursDecimal <= 0) return zeroSuffix; const totalMinutes = Math.round(hoursDecimal * 60); const hours = Math.floor(totalMinutes / 60); const minutes = totalMinutes % 60; if (hours === 0 && minutes === 0) return zeroSuffix; const hSuffixKey = short ? 'hoursShortSuffix' : (hours === 1 ? 'hoursSuffixSingular' : 'hoursSuffix'); const mSuffixKey = short ? 'minutesShortSuffix' : (minutes === 1 ? 'minutesSuffixSingular' : 'minutesSuffix'); const hSuffix = i18n.t(hSuffixKey); const mSuffix = i18n.t(mSuffixKey); const connector = (hours > 0 && minutes > 0 && !short) ? i18n.t('connectorAnd') : ' '; const formatString = i18n.t('hoursFormat'); const replacements = { hours: hours > 0 ? hours.toString() : '', hSuffix: hours > 0 ? hSuffix : '', connector: (hours > 0 && minutes > 0) ? connector : '', minutes: minutes > 0 ? minutes.toString() : '', mSuffix: minutes > 0 ? mSuffix : '' }; let result = replacePlaceholders(formatString, replacements); return result.replace(/\s+/g, ' ').trim() || zeroSuffix; }
    function parseTimeInputToDecimal(timeString) { if (!timeString) return 0; const trimmed = String(timeString).trim(); if (!trimmed) return 0; const colonMatch = trimmed.match(/^(\d{1,3}):(\d{1,2})$/); if (colonMatch) { const hours = parseInt(colonMatch[1], 10); const minutes = parseInt(colonMatch[2], 10); if (!isNaN(hours) && !isNaN(minutes) && minutes >= 0 && minutes < 60 && hours >= 0) { return hours + (minutes / 60); } else { return NaN; } } const numberMatch = trimmed.match(/^(\d+)$/); if (numberMatch) { const numStr = numberMatch[1]; if (numStr.length <= 2) { return parseInt(numStr, 10) / 60; } else { const hours = parseInt(numStr.slice(0, -2), 10); const minutes = parseInt(numStr.slice(-2), 10); if (!isNaN(hours) && !isNaN(minutes) && minutes >= 0 && minutes < 60 && hours >= 0) { return hours + (minutes / 60); } else { return NaN; } } } return NaN; }
    function formatDecimalToTimeInput(decimalHours) { if (isNaN(decimalHours) || decimalHours <= 0) return ""; const totalMinutes = Math.round(decimalHours * 60); const hours = Math.floor(totalMinutes / 60); const minutes = totalMinutes % 60; return `${hours}:${String(minutes).padStart(2, '0')}`; }
    function formatRelativeDate(dateString) { const today = new Date(); today.setHours(0, 0, 0, 0); const inputDate = new Date(dateString + 'T00:00:00'); if (isNaN(inputDate)) return formatDisplayDate(dateString); const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1); const oneWeekFromToday = new Date(today); oneWeekFromToday.setDate(today.getDate() + 7); const weekdayNames = i18n.t('weekdayNamesShort'); if (!Array.isArray(weekdayNames) || weekdayNames.length !== 7) { return formatDisplayDate(dateString); } if (inputDate.getTime() === today.getTime()) return i18n.t('today'); if (inputDate.getTime() === tomorrow.getTime()) return i18n.t('tomorrow'); if (inputDate > tomorrow && inputDate <= oneWeekFromToday) { return i18n.t('nextWeekday', { weekday: weekdayNames[inputDate.getDay()] }); } return formatDisplayDate(dateString); }
    function getDefaultTag() { return i18n.t('recordTagOptionHouseToHouse'); }

    // --- Agregação para Gráfico de Categoria ---
    function getCategoryHoursForMonth(entries, monthYearValue) { /* ... (código como antes) ... */ }

    // ----- Persistência -----
    function saveData() { try { localStorage.setItem(LOCAL_STORAGE_KEYS.ENTRIES, JSON.stringify(recordedEntries)); localStorage.setItem(LOCAL_STORAGE_KEYS.PLANS, JSON.stringify(plannedEntries)); localStorage.setItem(LOCAL_STORAGE_KEYS.SETTINGS, JSON.stringify(settings)); } catch (e) { console.error("Error saving data:", e); showFeedback(i18n.t('feedbackDataSaveFailed'), 'danger'); } }
    function loadData() { try { const entriesRaw = localStorage.getItem(LOCAL_STORAGE_KEYS.ENTRIES); const plansRaw = localStorage.getItem(LOCAL_STORAGE_KEYS.PLANS); const settingsRaw = localStorage.getItem(LOCAL_STORAGE_KEYS.SETTINGS); if (entriesRaw) { try { recordedEntries = JSON.parse(entriesRaw).map(e => ({...e, notes: (e.notes || '').substring(0, NOTES_MAX_LENGTH)})); } catch (e) { console.error('Error parsing entries:', e); recordedEntries = []; }} else { recordedEntries = []; } recordedEntries.sort((a, b) => new Date(b.date + 'T00:00:00') - new Date(a.date + 'T00:00:00')); if (plansRaw) { try { plannedEntries = JSON.parse(plansRaw).map(p => ({...p, hours: Number(p.hours || p.plannedHours || 0)})).filter(p => p.hours > 0); } catch (e) { console.error('Error parsing plans:', e); plannedEntries = []; }} else { plannedEntries = []; } plannedEntries.sort((a, b) => new Date(a.date + 'T00:00:00') - new Date(b.date + 'T00:00:00')); let loadedSettings = settingsRaw ? JSON.parse(settingsRaw) : {}; settings = { monthlyGoal: 70, goalHasBeenSet: false, ...loadedSettings }; settings.monthlyGoal = Number(settings.monthlyGoal) || 70; if (isNaN(settings.monthlyGoal) || settings.monthlyGoal <= 0) settings.monthlyGoal = 70; settings.goalHasBeenSet = typeof settings.goalHasBeenSet === 'boolean' ? settings.goalHasBeenSet : (settings.monthlyGoal !== 70); console.log("Data loaded."); } catch (err) { console.error("Error loading data:", err); recordedEntries = []; plannedEntries = []; settings = { monthlyGoal: 70, goalHasBeenSet: false }; ['ENTRIES', 'PLANS', 'SETTINGS'].forEach(key => { try { localStorage.removeItem(LOCAL_STORAGE_KEYS[key]); } catch(e){} }); showFeedback(i18n.t('feedbackLoadError'), 'danger'); } }


    // ----- PWA (sem alterações) -----
    function triggerInstallPromptIfAvailable(context = 'Context not specified') { if (deferredInstallPrompt && settings.goalHasBeenSet) { console.log(`Install prompt attempt (${context})...`); setTimeout(() => { deferredInstallPrompt.prompt().then(outcome => console.log('Install prompt outcome:', outcome)).catch(err => console.error("Install prompt error:", err)); deferredInstallPrompt = null; }, 500); } }

    // ----- UI e DOM -----
    function promptForMonthlyGoal() { let done = false; while (!done) { const input = prompt(i18n.t('feedbackGoalPrompt'), settings.monthlyGoal); if (input === null) { done = true; if (!settings.goalHasBeenSet) { settings.goalHasBeenSet = true; saveData(); updateAllDisplays(); } } else { const val = parseInt(input, 10); if (!isNaN(val) && val > 0) { settings.monthlyGoal = val; settings.goalHasBeenSet = true; monthlyGoalInput.value = val; saveData(); done = true; updateAllDisplays(); showFeedback(i18n.t('feedbackGoalSet'), "success"); triggerInstallPromptIfAvailable('initial goal set'); } else { alert(i18n.t('feedbackGoalInvalid')); } } } }
    function setDateInputVisibility(visible) { if(!recordDateInput || !dateLabel || !displayDate) return; isDateInputVisible = visible; recordDateInput.classList.toggle('hidden', !visible); dateLabel.classList.toggle('visually-hidden', visible); if (visible) { recordDateInput.focus(); } else { const dateVal = recordDateInput.value || getCurrentDateString(); displayDate.textContent = dateVal === getCurrentDateString() ? i18n.t('displayDateToday') : formatDisplayDate(dateVal); } }
    function toggleCard(cardElement) { if (!cardElement) return; const isExpanded = cardElement.classList.toggle('expanded'); const icon = cardElement.querySelector('.toggle-icon'); if (icon) { icon.textContent = isExpanded ? i18n.t('toggleIconCollapse') : i18n.t('toggleIconExpand'); } }
    function clearRecordForm() { if(!recordForm || !recordIdInput || !recordDateInput || !recordTagSelect || !recordNotesInput || !recordHoursInput || !saveRecordBtn) return; recordForm.reset(); recordIdInput.value = ''; currentEditingId = null; recordDateInput.value = getCurrentDateString(); setDateInputVisibility(false); recordTagSelect.value = getDefaultTag(); recordNotesInput.value = ''; recordHoursInput.value = ''; saveRecordBtn.textContent = i18n.t('saveRecordButton'); saveRecordBtn.classList.remove('editing'); }
    function handleRecordSubmit(event) { event.preventDefault(); const id = recordIdInput.value ? parseInt(recordIdInput.value, 10) : Date.now(); const date = (isDateInputVisible || recordDateInput.value !== getCurrentDateString()) ? recordDateInput.value : getCurrentDateString(); const hours = parseTimeInputToDecimal(recordHoursInput.value); const tag = recordTagSelect.value || getDefaultTag(); const notes = recordNotesInput.value.trim().substring(0, NOTES_MAX_LENGTH); if (isNaN(hours) || hours <= 0) { alert(i18n.t('feedbackTimeInvalid')); recordHoursInput.focus(); return; } if (!date) { alert(i18n.t('feedbackDateInvalid')); if (!isDateInputVisible) setDateInputVisibility(true); recordDateInput.focus(); return; } const newEntry = { id, date, hours, tag, notes }; const existingIndex = recordedEntries.findIndex(entry => entry.id === id); if (existingIndex > -1) { recordedEntries[existingIndex] = newEntry; } else { recordedEntries.push(newEntry); } recordedEntries.sort((a, b) => new Date(b.date + 'T00:00:00') - new Date(a.date + 'T00:00:00')); saveData(); clearRecordForm(); updateAllDisplays(); showFeedback(i18n.t('feedbackRecordSaved'), 'success'); }
    function editRecordEntry(id) { const entry = recordedEntries.find(e => e.id === id); if (entry && recordCard) { if (!recordCard.classList.contains('expanded')) { toggleCard(recordCard); } currentEditingId = id; recordIdInput.value = entry.id; recordDateInput.value = entry.date; setDateInputVisibility(entry.date !== getCurrentDateString()); recordHoursInput.value = formatDecimalToTimeInput(entry.hours); recordTagSelect.value = entry.tag || getDefaultTag(); recordNotesInput.value = entry.notes || ''; saveRecordBtn.textContent = i18n.t('updateRecordButton'); saveRecordBtn.classList.add('editing'); recordCard.scrollIntoView({ behavior: 'smooth', block: 'start' }); setTimeout(() => recordHoursInput?.focus(), 300); } }
    function deleteRecordEntry(id) { showConfirmationDialog(i18n.t('feedbackDeleteRecordConfirm'), () => { const index = recordedEntries.findIndex(e => e.id === id); if (index > -1) { recordedEntries.splice(index, 1); saveData(); updateAllDisplays(); showFeedback(i18n.t('feedbackRecordDeleted'), 'info'); if (currentEditingId === id) { clearRecordForm(); } } }); }
    function clearPlanForm() { if (!planForm || !planIdInput) return; planForm.reset(); planIdInput.value = ''; currentEditingId = null; savePlanBtn.textContent = i18n.t('savePlanButton'); }
    function handlePlanSubmit(event) { event.preventDefault(); const id = planIdInput.value ? parseInt(planIdInput.value, 10) : Date.now(); const date = planDateInput.value; const hours = parseTimeInputToDecimal(planHoursInput.value); const todayStr = getCurrentDateString(); if (!date || isNaN(hours) || hours <= 0) { alert(i18n.t('feedbackPlanInvalid')); if (!date) planDateInput?.focus(); else planHoursInput?.focus(); return; } if (date < todayStr) { alert(i18n.t('feedbackPlanDatePast')); planDateInput?.focus(); return; } const newPlan = { id, date, hours }; const existingIndex = plannedEntries.findIndex(p => p.id === id); if (existingIndex > -1) { plannedEntries[existingIndex] = newPlan; } else { plannedEntries.push(newPlan); } plannedEntries.sort((a, b) => new Date(a.date + 'T00:00:00') - new Date(b.date + 'T00:00:00')); saveData(); clearPlanForm(); updateAllDisplays(); showFeedback(i18n.t('feedbackPlanSaved'), 'success'); }
    function markPlanAsDone(id) { const planIndex = plannedEntries.findIndex(p => p.id === id); if (planIndex === -1) { console.error("Plan not found:", id); showFeedback(i18n.t('feedbackPlanNotFound'), 'danger'); return; } const plan = plannedEntries[planIndex]; const todayStr = getCurrentDateString(); const recordDate = new Date(plan.date + 'T00:00:00') < new Date(todayStr + 'T00:00:00') ? plan.date : todayStr; const newRecordEntry = { id: Date.now(), date: recordDate, hours: plan.hours, tag: getDefaultTag(), notes: i18n.t('planNoteFromPastPlan', { date: formatDisplayDate(plan.date) }) }; recordedEntries.push(newRecordEntry); recordedEntries.sort((a, b) => new Date(b.date + 'T00:00:00') - new Date(a.date + 'T00:00:00')); plannedEntries.splice(planIndex, 1); saveData(); updateAllDisplays(); showFeedback(i18n.t('feedbackPlanMarkedDone'), 'success'); }
    function deletePlanEntry(id) { showConfirmationDialog(i18n.t('feedbackDeletePlanConfirm'), () => { const initialLength = plannedEntries.length; plannedEntries = plannedEntries.filter(p => p.id !== id); if (plannedEntries.length < initialLength) { saveData(); updateAllDisplays(); showFeedback(i18n.t('feedbackPlanDeleted'), 'info'); if (currentEditingId === id) { clearPlanForm(); } } }); }
    function handleGoalSave() { if(!monthlyGoalInput) return; const newGoal = parseInt(monthlyGoalInput.value, 10); if (!isNaN(newGoal) && newGoal > 0) { if(settings.monthlyGoal !== newGoal) { settings.monthlyGoal = newGoal; settings.goalHasBeenSet = true; saveData(); updateAllDisplays(); showFeedback(i18n.t('feedbackGoalUpdated'), 'success'); triggerInstallPromptIfAvailable('goal updated'); } } else { alert(i18n.t('feedbackGoalInvalid')); monthlyGoalInput.value = settings.monthlyGoal; } }
    function handleClearAllData() { showConfirmationDialog(i18n.t('feedbackClearAllConfirm'), () => { recordedEntries = []; plannedEntries = []; settings = { monthlyGoal: 70, goalHasBeenSet: false }; monthlyGoalInput.value = settings.monthlyGoal; saveData(); clearRecordForm(); clearPlanForm(); updateAllDisplays(); showFeedback(i18n.t('feedbackDataCleared'), 'danger'); document.querySelectorAll('.card').forEach(c => { const shouldBeExpanded = (c.id === 'record-card'); if (c.classList.contains('expanded') !== shouldBeExpanded) toggleCard(c); }); }); }
    function showConfirmationDialog(message, onConfirm) { if(!confirmationDialog || !dialogMessage || !dialogConfirmBtn) return; dialogMessage.textContent = message; currentConfirmCallback = onConfirm; confirmationDialog.classList.add('visible'); dialogConfirmBtn.focus(); }
    function hideConfirmationDialog() { if(!confirmationDialog) return; confirmationDialog.classList.remove('visible'); setTimeout(() => { currentConfirmCallback = null; }, 300); }
    function showFeedback(message, type = 'info') { /* ... (código como antes) ... */ }
    function updateDashboard() { /* ... (código como antes) ... */ }
    function updateProgressRing(currentValue, maxValue) { /* ... (código como antes) ... */ }
    function updateDashboardPlannedDates() { /* ... (código como antes) ... */ }
    function renderHistory() { /* ... (código como antes) ... */ }
    function renderPlanning() { /* ... (código como antes) ... */ }
    function updateStatistics() { /* ... (código como antes) ... */ }
    function populateMonthSelector() { /* ... (código como antes) ... */ }


    // ----- Gráfico (ÚNICO de Categoria) -----
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
              const mutedColor = computedStyles ? computedStyles.getPropertyValue('--text-color-secondary').trim() : 'rgba(235, 235, 245, 0.6)';
              const font = computedStyles ? `14px ${computedStyles.fontFamily}` : '14px sans-serif';
             ctx.fillStyle = mutedColor; ctx.font = font;
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

            const currentTextColor = computedStyles.getPropertyValue('--text-color').trim();
            const currentTextMutedColor = computedStyles.getPropertyValue('--text-color-secondary').trim();
            const currentTooltipBgColor = computedStyles.getPropertyValue('--card-bg').trim();
            const cardBgColor = computedStyles.getPropertyValue('--card-bg').trim();

            categoryChartInstance = new Chart(categoryChartCtx, {
                type: 'doughnut',
                data: {
                    labels: categoryData.labels,
                    datasets: [{
                        label: i18n.t('categoryChartCardTitle'),
                        data: categoryData.data,
                        backgroundColor: PIE_CHART_COLORS,
                        borderColor: cardBgColor,
                        borderWidth: 2,
                        hoverOffset: 8
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: {
                        title: { display: false },
                        legend: { position: 'bottom', align: 'center', labels: { color: currentTextMutedColor, boxWidth: 15, padding: 15, font: { size: 13 } } },
                        tooltip: { backgroundColor: currentTooltipBgColor, titleColor: currentTextColor, bodyColor: currentTextColor, padding: 12, cornerRadius: 6, callbacks: { label: function(context) { const label = context.label || ''; const value = context.parsed || 0; const total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0); const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0; return `${label}: ${formatHoursExtensive(value)} (${percentage}%)`; } } }
                    },
                    cutout: '45%'
                }
            });
        } catch (error) { console.error("Category chart rendering error:", error); drawPlaceholder(categoryChartCtx, renderErrorMsg); }
    }

    function updateAllDisplays() {
        updateDashboard(); updateStatistics(); populateMonthSelector(); renderHistory(); renderPlanning();
        if (!chartMonthSelector || !categoryChartCtx) { console.error("Cannot update charts, elements missing."); return; }
        const selectedMonthValue = chartMonthSelector.value;
        renderCharts(selectedMonthValue);
        if (saveRecordBtn) { saveRecordBtn.textContent = recordIdInput?.value ? i18n.t('updateRecordButton') : i18n.t('saveRecordButton'); }
    }

    // ----- Funções Auxiliares Inputs, SW etc. -----
    function formatTimeInputOnType(event) { const input = event.target; let value = input.value.replace(/[^\d]/g, ''); input.value = value.length > 2 ? `${value.slice(0, -2)}:${value.slice(-2)}` : value; }
    function validateTimeInputOnBlur(event) { const input = event.target; const decimalValue = parseTimeInputToDecimal(input.value); input.value = (!isNaN(decimalValue) && decimalValue > 0) ? formatDecimalToTimeInput(decimalValue) : ''; }
    function validateNotesInput(event) { const input = event.target; if (input.value.length > NOTES_MAX_LENGTH) { input.value = input.value.substring(0, NOTES_MAX_LENGTH); showFeedback(i18n.t('feedbackNotesLengthLimit', { maxLength: NOTES_MAX_LENGTH }), 'info'); } }
    function registerServiceWorker() { if ('serviceWorker' in navigator) { navigator.serviceWorker.register('./service-worker.js').then((reg) => console.log('SW registered:', reg.scope)).catch((error) => console.error('SW registration failed:', error)); } }


    // ----- Função de Inicialização -----
    async function init() {
        console.log("Initializing...");
        i18n.detectLanguage();
        await i18n.loadTranslations();

        console.log("Selecting elements...");
         // Seletores (mantidos, exceto para o gráfico de barras)
         appElement=document.getElementById('app'); dashboardWeekHours=document.getElementById('dashboard-week-hours'); dashboardMonthPercentage=document.getElementById('dashboard-month-percentage'); dashboardMonthTotal=document.getElementById('dashboard-month-total'); dashboardForecast=document.getElementById('dashboard-forecast'); dashboardPlannedDatesContainer=document.getElementById('dashboard-planned-dates'); dashboardPlanList=document.getElementById('dashboard-plan-list'); progressRingFg=document.getElementById('progress-ring-fg'); recordCard=document.getElementById('record-card'); recordForm=document.getElementById('record-form'); recordIdInput=document.getElementById('record-id'); recordDateInput=document.getElementById('record-date'); dateLabel=document.getElementById('date-label'); displayDate=document.getElementById('display-date'); changeDateBtn=document.getElementById('change-date-btn'); recordHoursInput=document.getElementById('record-hours'); recordTagSelect=document.getElementById('record-tag'); recordNotesInput=document.getElementById('record-notes'); saveRecordBtn=document.getElementById('save-record-btn'); planCard=document.getElementById('plan-card'); planForm=document.getElementById('plan-form'); planIdInput=document.getElementById('plan-id'); planDateInput=document.getElementById('plan-date'); planHoursInput=document.getElementById('plan-hours'); savePlanBtn=document.getElementById('save-plan-btn'); clearPlanFormBtn=document.getElementById('clear-plan-form-btn'); planningList=document.getElementById('planning-list'); planningListPlaceholder=planningList?.querySelector('.placeholder'); monthlyGoalInput=document.getElementById('monthly-goal'); saveGoalBtn=document.getElementById('save-goal-btn'); statsMonthHours=document.getElementById('stats-month-hours'); statsMonthGoalProgress=document.getElementById('stats-month-goal-progress'); statsMonthProgressBar=document.getElementById('stats-month-progress-bar'); statsAvgHoursDay=document.getElementById('stats-avg-hours-day'); statsMonthDaysActive=document.getElementById('stats-month-days-active'); chartMonthSelector=document.getElementById('chart-month-selector'); historyList=document.getElementById('history-list'); historySearchInput=document.getElementById('history-search-input'); historyListPlaceholder=historyList?.querySelector('.placeholder'); showingResultsLabel=document.getElementById('showing-results-label'); clearAllDataBtn=document.getElementById('clear-all-data-btn'); confirmationDialog=document.getElementById('confirmation-dialog'); dialogMessage=document.getElementById('dialog-message'); dialogConfirmBtn=document.getElementById('dialog-confirm-btn'); dialogCancelBtn=document.getElementById('dialog-cancel-btn');
         const categoryChartCanvas = document.getElementById('categoryHoursChart'); // Seleciona canvas correto
         categoryChartCtx = categoryChartCanvas?.getContext('2d'); // Pega contexto correto

         if (!appElement || !recordForm || !categoryChartCtx || !historyList || !planningList) { console.error("Critical DOM elements missing."); return; } // Verifica contexto correto

        computedStyles = getComputedStyle(document.body);
        if (progressRingFg?.r?.baseVal?.value) { progressRingRadius = progressRingFg.r.baseVal.value; progressRingCircumference = 2 * Math.PI * progressRingRadius; } else { console.warn("Progress ring radius not found."); }

        console.log("Applying translations...");
        i18n.applyTranslationsToDOM();

        console.log("Loading data...");
        loadData();

        const oldDefaultTag = i18n.t('historyEntryTagDefault', {}, 'en'); // Get english default for comparison
        const currentDefaultTag = i18n.t('recordTagOptionHouseToHouse');
        if (recordedEntries.some(e => e.tag === oldDefaultTag || !e.tag)) {
             recordedEntries = recordedEntries.map(entry => ({ ...entry, tag: (entry.tag === oldDefaultTag || !entry.tag) ? currentDefaultTag : entry.tag }));
             console.log(`Migrating old/empty tags to "${currentDefaultTag}"`);
             saveData();
        }

        monthlyGoalInput.value = settings.monthlyGoal;

        console.log("Adding listeners...");
        // Listeners... (copiados da versão anterior, sem mudanças aqui)
        appElement.addEventListener('click', (event) => { const header = event.target.closest('.card-header[role="button"]'); if (header) toggleCard(header.closest('.card')); });
        document.querySelectorAll('.card-header[role="button"]').forEach(header => header.addEventListener('keydown', (e) => { if(e.key==='Enter'||e.key===' ') { e.preventDefault(); toggleCard(header.closest('.card')); } }));
        changeDateBtn?.addEventListener('click', () => setDateInputVisibility(true));
        recordHoursInput?.addEventListener('input', formatTimeInputOnType);
        recordHoursInput?.addEventListener('blur', validateTimeInputOnBlur);
        recordNotesInput?.addEventListener('input', validateNotesInput);
        recordForm?.addEventListener('submit', handleRecordSubmit);
        planHoursInput?.addEventListener('input', formatTimeInputOnType);
        planHoursInput?.addEventListener('blur', validateTimeInputOnBlur);
        planForm?.addEventListener('submit', handlePlanSubmit);
        clearPlanFormBtn?.addEventListener('click', clearPlanForm);
        saveGoalBtn?.addEventListener('click', handleGoalSave);
        monthlyGoalInput?.addEventListener('keypress', (e)=>{if(e.key==='Enter'){e.preventDefault();handleGoalSave();monthlyGoalInput.blur();}});
        clearAllDataBtn?.addEventListener('click', handleClearAllData);
        historySearchInput?.addEventListener('input', () => renderHistory());
        chartMonthSelector?.addEventListener('change', () => updateAllDisplays());
        dialogConfirmBtn?.addEventListener('click', () => { try { if(typeof currentConfirmCallback === 'function') currentConfirmCallback(); } catch(e) { console.error("Confirm callback error:", e); } finally { hideConfirmationDialog(); }});
        dialogCancelBtn?.addEventListener('click', hideConfirmationDialog);
        confirmationDialog?.addEventListener('click', (e)=>{if(e.target === confirmationDialog) hideConfirmationDialog();});
        window.addEventListener('beforeinstallprompt', (e)=>{ e.preventDefault(); deferredInstallPrompt=e; console.log('`beforeinstallprompt` captured.'); });

        console.log("Setting initial UI state...");
        recordDateInput.value = getCurrentDateString(); setDateInputVisibility(false); clearRecordForm(); clearPlanForm();
        document.querySelectorAll('.card').forEach(card => { const shouldBeExpanded = (card.id === 'record-card'); if (card.classList.contains('expanded') !== shouldBeExpanded) toggleCard(card); });

        console.log("Initial render...");
        updateAllDisplays();
        registerServiceWorker();

        if (!settings.goalHasBeenSet) { console.log("Prompting for initial goal..."); setTimeout(promptForMonthlyGoal, 700); }
        setInterval(updateDashboardPlannedDates, 60 * 1000);

        console.log("Initialization complete.");
    }

     init().catch(err => { console.error("Fatal Init Error:", err); document.body.innerHTML = `<p>Fatal Error: ${err.message}</p>`; });

}); // Fim DOMContentLoaded
