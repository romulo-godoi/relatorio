document.addEventListener('DOMContentLoaded', () => {

    // ----- Configurações de Internacionalização (i18n) -----
    const i18n = {
        translations: {},
        supportedLanguages: ['pt-BR', 'en'],
        defaultLanguage: 'en',
        currentLanguage: 'en',
        translationsUrl: './translations.json',

        detectLanguage() {
            const fullBrowserLang = navigator.language || navigator.userLanguage || this.defaultLanguage;
            const baseBrowserLang = fullBrowserLang.split('-')[0];

            if (this.supportedLanguages.includes(fullBrowserLang)) {
                this.currentLanguage = fullBrowserLang;
            } else if (this.supportedLanguages.includes(baseBrowserLang)) {
                this.currentLanguage = baseBrowserLang;
            } else if (this.supportedLanguages.some(lang => lang.startsWith(baseBrowserLang))) {
                this.currentLanguage = this.supportedLanguages.find(lang => lang.startsWith(baseBrowserLang));
            } else if (this.supportedLanguages.includes(this.defaultLanguage)) {
                this.currentLanguage = this.defaultLanguage;
            } else if (this.supportedLanguages.length > 0) {
                this.currentLanguage = this.supportedLanguages[0];
            } else {
                this.currentLanguage = this.defaultLanguage;
            }
            console.log(`Browser language: ${fullBrowserLang}, Using language: ${this.currentLanguage}`);
            document.documentElement.lang = this.currentLanguage;
        },

        async loadTranslations() {
            try {
                const response = await fetch(this.translationsUrl);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}, ao buscar ${this.translationsUrl}`);
                }
                this.translations = await response.json();
                console.log('Translations loaded successfully.');
                this.translations[this.defaultLanguage] = this.translations[this.defaultLanguage] || {};
                this.translations[this.currentLanguage] = this.translations[this.currentLanguage] || this.translations[this.defaultLanguage];
            } catch (error) {
                console.error('Error loading translations:', error);
                this.translations[this.defaultLanguage] = this.translations[this.defaultLanguage] || {};
                this.translations[this.currentLanguage] = this.translations[this.currentLanguage] || this.translations[this.defaultLanguage];
                showFeedback(`Error loading translations: ${error.message}. Falling back to ${this.currentLanguage}.`, 'danger');
            }
        },

        t(key, replacements = {}) {
            const langTranslations = this.translations[this.currentLanguage]
                                     || this.translations[this.defaultLanguage]
                                     || {};
            let translation = langTranslations[key] || key;

            if (Array.isArray(translation)) {
                return translation;
            }

            if (typeof translation === 'string') {
                for (const placeholder in replacements) {
                   const regex = new RegExp(`\\{${placeholder}\\}`, 'g');
                   translation = translation.replace(regex, replacements[placeholder]);
                }
            } else {
                console.warn(`Translation for key "${key}" is not a string or array:`, translation);
                translation = key;
            }
            return translation;
        },

        applyTranslationsToDOM() {
            document.querySelectorAll('[data-translate-key]').forEach(element => {
                const key = element.getAttribute('data-translate-key');
                const translation = this.t(key);
                if (typeof translation === 'string' && translation.includes('<') && translation.includes('>')) {
                    element.innerHTML = translation;
                } else {
                    element.textContent = translation;
                }
            });
            document.querySelectorAll('[data-translate-placeholder-key]').forEach(element => {
                const key = element.getAttribute('data-translate-placeholder-key');
                element.placeholder = this.t(key);
            });
            document.querySelectorAll('[data-translate-title-key]').forEach(element => {
                const key = element.getAttribute('data-translate-title-key');
                element.title = this.t(key);
            });
            document.title = this.t('appTitle');
            document.querySelectorAll('.toggle-icon').forEach(icon => {
                 const card = icon.closest('.card');
                 const isExpanded = card ? card.classList.contains('expanded') : false;
                 icon.textContent = isExpanded ? this.t('toggleIconCollapse') : this.t('toggleIconExpand');
             });
            const tagSelect = document.getElementById('record-tag');
            if(tagSelect) {
                 tagSelect.querySelectorAll('option[data-translate-key]').forEach(option => {
                     const key = option.getAttribute('data-translate-key');
                     option.textContent = this.t(key);
                 });
                 const defaultTagKey = "recordTagOptionHouseToHouse";
                 const defaultTagValue = i18n.t(defaultTagKey);
                 tagSelect.value = defaultTagValue;
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
        statsMonthDaysActive, chartMonthSelector, monthlyHoursChartCtx, historyList,
        historySearchInput, historyListPlaceholder, showingResultsLabel, clearAllDataBtn,
        confirmationDialog, dialogMessage, dialogConfirmBtn, dialogCancelBtn,
        computedStyles, textColor, textMutedColor, gridColor, tooltipBgColor, primaryColor,
        avgLineColor1, avgLineColor2, avgLineColor3;

    let recordedEntries = [];
    let plannedEntries = [];
    let settings = { monthlyGoal: 70, goalHasBeenSet: false };
    let monthlyHoursChartInstance = null;
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
        ENTRIES: 'pioneerTracker_entries_v5.2',
        PLANS: 'pioneerTracker_plans_v1.2',
        SETTINGS: 'pioneerTracker_settings_v1.2'
    };

    // ----- Funções Utilitárias -----
    function replacePlaceholders(text, replacements) {
        let result = text;
        if(typeof text !== 'string') return text;
        for (const placeholder in replacements) {
            const regex = new RegExp(`\\{${placeholder}\\}`, 'g');
            result = result.replace(regex, replacements[placeholder]);
        }
        return result;
    }

    function getCurrentDateString() { const t = new Date(); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`; }
    function formatDisplayDate(dateString) { if (!dateString || !dateString.includes('-')) return dateString; const [y, m, d] = dateString.split('-'); return `${d}/${m}/${y}`; }
    function getMonthYearString(date) { const m = String(date.getMonth() + 1).padStart(2, '0'); const y = date.getFullYear(); return `${m}/${y}`; }
    function getStartOfWeek(date = new Date()) { const d = new Date(date); const dayOfWeek = d.getDay(); const diff = d.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); const sOW = new Date(d.setDate(diff)); sOW.setHours(0, 0, 0, 0); return `${sOW.getFullYear()}-${String(sOW.getMonth() + 1).padStart(2, '0')}-${String(sOW.getDate()).padStart(2, '0')}`; }
    function getDateMonthsAgo(months) { const d = new Date(); d.setMonth(d.getMonth() - months); d.setHours(0, 0, 0, 0); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }

    function formatMonthYearExtensive(monthYearString) {
        if (!monthYearString || !monthYearString.includes('/')) return monthYearString;
        const [m, y] = monthYearString.split('/');
        const monthIndex = parseInt(m, 10) - 1;
        if (monthIndex < 0 || monthIndex > 11) return monthYearString;
        const monthNames = i18n.t('monthNames');
        if (!Array.isArray(monthNames) || monthNames.length !== 12) {
            console.warn("Month names not available or invalid in translation.");
            return `${m}/${y}`;
        }
        return `${monthNames[monthIndex]} ${y}`;
    }

    function formatHoursExtensive(hoursDecimal, short = false) {
        const zeroSuffix = short ? `0${i18n.t('hoursShortSuffix')}` : `0 ${i18n.t('hoursSuffix')}`;
        if (isNaN(hoursDecimal) || hoursDecimal < 0) return zeroSuffix;
        const totalMinutes = Math.round((hoursDecimal || 0) * 60);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        if (hours === 0 && minutes === 0) return zeroSuffix;
        const hSuffixKey = short ? 'hoursShortSuffix' : (hours === 1 ? 'hoursSuffixSingular' : 'hoursSuffix');
        const mSuffixKey = short ? 'minutesShortSuffix' : (minutes === 1 ? 'minutesSuffixSingular' : 'minutesSuffix');
        const hSuffix = i18n.t(hSuffixKey);
        const mSuffix = i18n.t(mSuffixKey);
        const connector = (hours > 0 && minutes > 0 && !short) ? i18n.t('connectorAnd') : ' ';
        const formatString = i18n.t('hoursFormat');
        const replacements = { hours: hours > 0 ? hours.toString() : '', hSuffix: hours > 0 ? hSuffix : '', connector: (hours > 0 && minutes > 0) ? connector : '', minutes: minutes > 0 ? minutes.toString() : '', mSuffix: minutes > 0 ? mSuffix : '' };
        let result = replacePlaceholders(formatString, replacements);
        result = result.replace(/\s+/g, ' ').trim();
        return result || zeroSuffix;
    }

    function parseTimeInputToDecimal(timeString) {
         if (!timeString) return 0;
         const trimmed = String(timeString).trim();
         if (!trimmed) return 0;
         const colonMatch = trimmed.match(/^(\d{1,3}):(\d{1,2})$/);
         if (colonMatch) {
             const hours = parseInt(colonMatch[1], 10); const minutes = parseInt(colonMatch[2], 10);
             if (!isNaN(hours) && !isNaN(minutes) && minutes >= 0 && minutes < 60 && hours >= 0) { return hours + (minutes / 60); }
             else { return NaN; }
         }
         const numberMatch = trimmed.match(/^(\d+)$/);
         if (numberMatch) {
             const numStr = numberMatch[1]; const numVal = parseInt(numStr, 10);
             if (isNaN(numVal)) return NaN;
             if (numStr.length <= 2) {
                 if (numVal >= 0 && numVal < 60) { return numVal / 60; }
                 else if (numVal >= 60) { return numVal / 60; } // Treat numbers >= 60 as minutes
                 else { return NaN; }
             } else if (numStr.length >= 3 && numStr.length <= 4) {
                 const potentialHoursStr = numStr.slice(0, -2); const potentialMinutesStr = numStr.slice(-2);
                 const hours = parseInt(potentialHoursStr, 10); const minutes = parseInt(potentialMinutesStr, 10);
                 if (!isNaN(hours) && !isNaN(minutes) && minutes >= 0 && minutes < 60 && hours >= 0) { return hours + (minutes / 60); }
                 else { return NaN; }
             } else { return NaN; }
         }
         return NaN; // Default case if format is unrecognizable
    }
    function formatDecimalToTimeInput(decimalHours) { if (isNaN(decimalHours) || decimalHours <= 0) return ""; const totalMinutes = Math.round((decimalHours || 0) * 60); const hours = Math.floor(totalMinutes / 60); const minutes = totalMinutes % 60; return `${hours}:${String(minutes).padStart(2, '0')}`; }

    function formatRelativeDate(dateString) {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const inputDate = new Date(dateString + 'T00:00:00');
        if (isNaN(inputDate)) return formatDisplayDate(dateString); // Invalid date string
        const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
        const oneWeekFromToday = new Date(today); oneWeekFromToday.setDate(today.getDate() + 7);
        const weekdayNames = i18n.t('weekdayNamesShort');
        if (!Array.isArray(weekdayNames) || weekdayNames.length !== 7) { console.warn("Weekday names not available/invalid for relative date formatting."); return formatDisplayDate(dateString); }
        if (inputDate.getTime() === today.getTime()) return i18n.t('today');
        if (inputDate.getTime() === tomorrow.getTime()) return i18n.t('tomorrow');
        if (inputDate > tomorrow && inputDate <= oneWeekFromToday) { const weekday = weekdayNames[inputDate.getDay()]; return i18n.t('nextWeekday', { weekday: weekday }); }
        return formatDisplayDate(dateString); // For dates more than a week out or in the past
    }

    function getDefaultTag() { return i18n.t('recordTagOptionHouseToHouse'); }

    // ----- Persistência -----
    function saveData() {
        try { localStorage.setItem(LOCAL_STORAGE_KEYS.ENTRIES, JSON.stringify(recordedEntries)); localStorage.setItem(LOCAL_STORAGE_KEYS.PLANS, JSON.stringify(plannedEntries)); localStorage.setItem(LOCAL_STORAGE_KEYS.SETTINGS, JSON.stringify(settings)); }
        catch (e) { console.error("Error saving data to localStorage:", e); showFeedback(i18n.t('feedbackDataSaveFailed'), 'danger'); }
    }
    function loadData() {
        try {
            let storedEntriesRaw = localStorage.getItem(LOCAL_STORAGE_KEYS.ENTRIES);
            if (storedEntriesRaw) {
                try { const parsedEntries = JSON.parse(storedEntriesRaw); if (Array.isArray(parsedEntries)) { recordedEntries = parsedEntries.map(e => ({ ...e, notes: e.notes?.substring(0, NOTES_MAX_LENGTH) || '', tag: e.tag })); } else { throw new Error("Stored entries data is not an array"); } }
                catch (parseErr) { console.error("Error parsing stored entries, resetting entries:", parseErr); storedEntriesRaw = null; recordedEntries = []; localStorage.removeItem(LOCAL_STORAGE_KEYS.ENTRIES); }
            } else { recordedEntries = []; }
            recordedEntries.sort((a, b) => new Date(b.date + 'T00:00:00') - new Date(a.date + 'T00:00:00')); // Sort after potential modifications

            const storedPlansRaw = localStorage.getItem(LOCAL_STORAGE_KEYS.PLANS);
            plannedEntries = storedPlansRaw ? JSON.parse(storedPlansRaw) : [];
            if (!Array.isArray(plannedEntries)) { console.error("Stored plans data is not an array, resetting plans."); plannedEntries = []; localStorage.removeItem(LOCAL_STORAGE_KEYS.PLANS); }
            // Migrate 'plannedHours' to 'hours' and ensure 'hours' is a number
            plannedEntries = plannedEntries.map(p => { if (p.plannedHours !== undefined && typeof p.plannedHours === 'number') { p.hours = p.plannedHours; delete p.plannedHours; } p.hours = Number(p.hours) || 0; return p; }).filter(p => p.hours > 0); // Remove plans with 0 hours
            plannedEntries.sort((a, b) => new Date(a.date + 'T00:00:00') - new Date(b.date + 'T00:00:00')); // Sort by date

            const storedSettingsRaw = localStorage.getItem(LOCAL_STORAGE_KEYS.SETTINGS);
            let loadedSettings = storedSettingsRaw ? JSON.parse(storedSettingsRaw) : {};
            settings = { monthlyGoal: 70, goalHasBeenSet: false, ...loadedSettings };
            // Validate loaded settings
            settings.monthlyGoal = Number(settings.monthlyGoal);
            if (isNaN(settings.monthlyGoal) || settings.monthlyGoal <= 0) { settings.monthlyGoal = 70; } // Default if invalid
            if (typeof settings.goalHasBeenSet !== 'boolean') { settings.goalHasBeenSet = !!settings.monthlyGoal; } // Infer if missing

            console.log("Data loaded from localStorage.");
        } catch (err) {
            console.error("Error loading data from localStorage:", err);
            recordedEntries = []; plannedEntries = []; settings = { monthlyGoal: 70, goalHasBeenSet: false };
            // Attempt to clear potentially corrupted keys
            try { localStorage.removeItem(LOCAL_STORAGE_KEYS.ENTRIES); localStorage.removeItem(LOCAL_STORAGE_KEYS.PLANS); localStorage.removeItem(LOCAL_STORAGE_KEYS.SETTINGS); } catch (e) { console.error("Error removing invalid storage items:", e); }
            showFeedback(i18n.t('feedbackLoadError'), 'danger');
        }
    }

    // ----- Instalação PWA -----
    function triggerInstallPromptIfAvailable(context = 'Context not specified') {
        if (deferredInstallPrompt && settings.goalHasBeenSet) {
            console.log(`Attempting to show install prompt (${context})...`);
            // Wait a moment to avoid clashing with other UI updates
            setTimeout(() => {
                deferredInstallPrompt.prompt();
                deferredInstallPrompt.userChoice.then((choiceResult) => { if (choiceResult.outcome === 'accepted') { console.log('User accepted the install prompt'); } else { console.log('User dismissed the install prompt'); } deferredInstallPrompt = null; })
                .catch(err => { console.error("Error processing prompt userChoice:", err); deferredInstallPrompt = null; });
            }, 500); // 500ms delay
        } else if (!settings.goalHasBeenSet) { console.log(`Install prompt not shown: Goal not set yet (${context}).`); }
        else { console.log(`Install prompt not available at this time (${context}).`); }
    }

    // ----- UI e Manipulação do DOM -----
    function promptForMonthlyGoal() {
        let goalSet = false;
        while (!goalSet) {
            const goalInput = prompt(i18n.t('feedbackGoalPrompt'), settings.monthlyGoal);
            if (goalInput === null) { // User cancelled
                goalSet = true; // Exit loop
                // Mark as 'set' even if cancelled, to prevent repeated prompting, use default goal
                if (!settings.goalHasBeenSet) {
                    settings.goalHasBeenSet = true;
                    saveData();
                    updateAllDisplays(); // Reflect default goal usage
                    console.log("User cancelled initial goal setting, using default goal.");
                }
            } else {
                const goalValue = parseInt(goalInput, 10);
                if (!isNaN(goalValue) && goalValue > 0) {
                    settings.monthlyGoal = goalValue;
                    settings.goalHasBeenSet = true;
                    monthlyGoalInput.value = goalValue; // Update the input field
                    saveData();
                    goalSet = true; // Exit loop
                    updateAllDisplays();
                    showFeedback(i18n.t('feedbackGoalSet'), "success");
                    triggerInstallPromptIfAvailable('After setting initial goal'); // Offer install
                } else {
                    alert(i18n.t('feedbackGoalInvalid')); // Re-prompt
                }
            }
        }
    }

    function setDateInputVisibility(visible) {
        isDateInputVisible = visible;
        if (visible) {
            recordDateInput.classList.remove('hidden');
            dateLabel.classList.add('visually-hidden');
            recordDateInput.focus(); // Focus the input when shown
        } else {
            recordDateInput.classList.add('hidden');
            dateLabel.classList.remove('visually-hidden');
            // Update the display text when hiding
            const dateValue = recordDateInput.value;
            const isToday = !dateValue || dateValue === getCurrentDateString();
            displayDate.textContent = isToday ? i18n.t('displayDateToday') : formatDisplayDate(dateValue);
        }
    }

    function toggleCard(cardElement) {
        if (!cardElement) return;
        const isExpanded = cardElement.classList.contains('expanded');
        cardElement.classList.toggle('expanded', !isExpanded);
        const icon = cardElement.querySelector('.toggle-icon');
        if (icon) {
             icon.textContent = !isExpanded ? i18n.t('toggleIconCollapse') : i18n.t('toggleIconExpand');
        }
    }

    function clearRecordForm() {
        recordForm.reset(); // Resets standard form elements
        recordIdInput.value = '';
        currentEditingId = null;
        recordDateInput.value = getCurrentDateString();
        setDateInputVisibility(false); // Show "Hoje" display text
        recordTagSelect.value = getDefaultTag(); // Set default tag based on locale
        recordNotesInput.value = '';
        recordHoursInput.value = ''; // Ensure time is cleared
        saveRecordBtn.textContent = i18n.t('saveRecordButton'); // Reset button text
        saveRecordBtn.classList.remove('editing'); // Remove visual indicator if any
    }

    function handleRecordSubmit(event) {
        event.preventDefault(); // Prevent standard form submission

        const id = recordIdInput.value ? parseInt(recordIdInput.value, 10) : Date.now(); // Use existing ID or generate new one
        const date = (isDateInputVisible || (recordDateInput.value && recordDateInput.value !== getCurrentDateString())) ? recordDateInput.value : getCurrentDateString(); // Get date, respecting visibility/change
        const hoursInput = recordHoursInput.value;
        const hours = parseTimeInputToDecimal(hoursInput);
        const tag = recordTagSelect.value || getDefaultTag(); // Get selected tag or default
        const notes = recordNotesInput.value.trim().substring(0, NOTES_MAX_LENGTH); // Get notes, trim, and limit length

        // --- Validation ---
        if (isNaN(hours) || hours <= 0) {
            alert(i18n.t('feedbackTimeInvalid'));
            recordHoursInput.focus();
            return;
        }
        if (!date) { // Basic date validation
            alert(i18n.t('feedbackDateInvalid'));
            if(!isDateInputVisible) setDateInputVisibility(true); // Show date input if hidden
            recordDateInput.focus();
            return;
        }

        const newEntry = { id, date, hours, tag, notes };
        const existingIndex = recordedEntries.findIndex(entry => entry.id === id);

        if (existingIndex > -1) { // Editing existing entry
            recordedEntries[existingIndex] = newEntry;
        } else { // Adding new entry
            recordedEntries.push(newEntry);
        }

        recordedEntries.sort((a, b) => new Date(b.date + 'T00:00:00') - new Date(a.date + 'T00:00:00')); // Re-sort by date descending
        saveData(); // Persist changes
        clearRecordForm(); // Reset the form
        updateAllDisplays(); // Update UI
        showFeedback(i18n.t('feedbackRecordSaved'), 'success');
    }

    function editRecordEntry(id) {
        const entry = recordedEntries.find(e => e.id === id);
        if (entry) {
            // Expand the record card if it's collapsed
            if (!recordCard.classList.contains('expanded')) {
                toggleCard(recordCard);
            }
            currentEditingId = id; // Keep track of what's being edited
            recordIdInput.value = entry.id;
            recordDateInput.value = entry.date;
            // Show date input only if it's not today's date
            setDateInputVisibility(entry.date !== getCurrentDateString());
            recordHoursInput.value = formatDecimalToTimeInput(entry.hours);
            recordTagSelect.value = entry.tag || getDefaultTag(); // Set tag, fallback to default
            recordNotesInput.value = entry.notes || '';
            saveRecordBtn.textContent = i18n.t('updateRecordButton'); // Change button text
            saveRecordBtn.classList.add('editing'); // Optional: style differently while editing

            // Scroll to the record form and focus the hours input
            recordCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
            setTimeout(() => recordHoursInput.focus(), 300); // Delay focus slightly
        }
    }

    function deleteRecordEntry(id) {
        showConfirmationDialog(i18n.t('feedbackDeleteRecordConfirm'), () => {
            const index = recordedEntries.findIndex(e => e.id === id);
            if (index > -1) {
                recordedEntries.splice(index, 1); // Remove the entry
                saveData(); // Persist changes
                updateAllDisplays(); // Update UI
                showFeedback(i18n.t('feedbackRecordDeleted'), 'info');

                // If the deleted entry was being edited, clear the form
                if (currentEditingId === id) {
                    clearRecordForm();
                }
            } else {
                 console.warn("Record entry not found for deletion:", id);
            }
        });
    }

    function clearPlanForm() {
        planForm.reset(); // Reset standard form elements
        planIdInput.value = '';
        currentEditingId = null; // No longer editing anything in this form
        planDateInput.value = ''; // Explicitly clear date
        planHoursInput.value = ''; // Explicitly clear hours
        savePlanBtn.textContent = i18n.t('savePlanButton'); // Reset button text
    }

    function handlePlanSubmit(event) {
        event.preventDefault(); // Prevent default form submission
        const id = planIdInput.value ? parseInt(planIdInput.value, 10) : Date.now(); // Use existing ID or generate new one
        const date = planDateInput.value;
        const hoursInput = planHoursInput.value;
        const hours = parseTimeInputToDecimal(hoursInput);
        const todayStr = getCurrentDateString();

        // --- Validation ---
        if (!date || isNaN(hours) || hours <= 0) {
            alert(i18n.t('feedbackPlanInvalid'));
            if (!date) planDateInput.focus(); // Focus date if missing
            else planHoursInput.focus(); // Focus hours if invalid
            return;
        }
        // Prevent planning for past dates
        if (date < todayStr) {
            alert(i18n.t('feedbackPlanDatePast'));
            planDateInput.focus();
            return;
        }

        const newPlan = { id, date, hours };
        const existingIndex = plannedEntries.findIndex(p => p.id === id);

        if (existingIndex > -1) { // Editing existing plan
            plannedEntries[existingIndex] = newPlan;
        } else { // Adding new plan
            plannedEntries.push(newPlan);
        }

        plannedEntries.sort((a, b) => new Date(a.date + 'T00:00:00') - new Date(b.date + 'T00:00:00')); // Sort by date ascending
        saveData(); // Persist changes
        clearPlanForm(); // Reset the form
        updateAllDisplays(); // Update UI
        showFeedback(i18n.t('feedbackPlanSaved'), 'success');
    }

    function markPlanAsDone(id) {
        const planIndex = plannedEntries.findIndex(p => p.id === id);
        if (planIndex === -1) {
             console.error("Plan not found to mark as done:", id);
             showFeedback(i18n.t('feedbackPlanNotFound'), 'danger');
             return;
        }

        const plan = plannedEntries[planIndex];
        const todayStr = getCurrentDateString();
        // If the planned date is in the past, use that date for the record. Otherwise, use today's date.
        const recordDate = new Date(plan.date + 'T00:00:00') < new Date(todayStr + 'T00:00:00') ? plan.date : todayStr;

        // Create a new record entry based on the plan
        const newRecordEntry = {
            id: Date.now(), // New unique ID for the record
            date: recordDate,
            hours: plan.hours,
            tag: getDefaultTag(), // Use default tag for now, maybe add tag to plans later?
            notes: i18n.t('planNoteFromPastPlan', { date: formatDisplayDate(plan.date) }) // Note indicating origin
        };

        recordedEntries.push(newRecordEntry);
        recordedEntries.sort((a, b) => new Date(b.date + 'T00:00:00') - new Date(a.date + 'T00:00:00')); // Re-sort records
        plannedEntries.splice(planIndex, 1); // Remove the completed plan
        saveData(); // Persist changes
        updateAllDisplays(); // Update UI
        showFeedback(i18n.t('feedbackPlanMarkedDone'), 'success');
    }

    function deletePlanEntry(id) {
        showConfirmationDialog(i18n.t('feedbackDeletePlanConfirm'), () => {
            const initialLength = plannedEntries.length;
            plannedEntries = plannedEntries.filter(p => p.id !== id); // Filter out the plan

            if (plannedEntries.length < initialLength) { // Check if a plan was actually removed
                saveData(); // Persist changes
                updateAllDisplays(); // Update UI
                showFeedback(i18n.t('feedbackPlanDeleted'), 'info');
                // If the deleted plan was being edited, clear the form
                if (currentEditingId === id) {
                    clearPlanForm();
                }
            } else {
                 console.warn("Plan entry not found for deletion:", id);
            }
        });
    }

    function handleGoalSave() {
        const newGoal = parseInt(monthlyGoalInput.value, 10);
        if (!isNaN(newGoal) && newGoal > 0) {
            if(settings.monthlyGoal !== newGoal) { // Only save & update if changed
                 settings.monthlyGoal = newGoal;
                 settings.goalHasBeenSet = true; // Ensure this is marked true
                 saveData();
                 updateAllDisplays();
                 showFeedback(i18n.t('feedbackGoalUpdated'), 'success');
                 triggerInstallPromptIfAvailable('After updating goal in settings card'); // Offer install maybe
            }
        } else {
            alert(i18n.t('feedbackGoalInvalid'));
            monthlyGoalInput.value = settings.monthlyGoal; // Reset to the last valid goal
        }
    }

    function handleClearAllData() {
        showConfirmationDialog(i18n.t('feedbackClearAllConfirm'), () => {
            // Reset all data arrays and settings object
            recordedEntries = [];
            plannedEntries = [];
            settings = { monthlyGoal: 70, goalHasBeenSet: false }; // Reset to defaults

            monthlyGoalInput.value = settings.monthlyGoal; // Reset goal input display
            saveData(); // This will save the empty arrays and default settings

            // Reset UI state
            clearRecordForm();
            clearPlanForm();
            updateAllDisplays(); // This will re-render empty lists, charts, etc.

            showFeedback(i18n.t('feedbackDataCleared'), 'danger');

            // Optionally collapse all cards except the record card
            document.querySelectorAll('.card').forEach(c => {
                 const shouldBeExpanded = (c.id === 'record-card');
                 if (c.classList.contains('expanded') !== shouldBeExpanded) {
                      toggleCard(c);
                 }
            });
        });
    }

    function showConfirmationDialog(message, onConfirm) {
        dialogMessage.textContent = message;
        currentConfirmCallback = onConfirm; // Store the function to call on confirm
        confirmationDialog.classList.add('visible'); // Show the dialog
        dialogConfirmBtn.focus(); // Focus the confirm button for accessibility
    }

    function hideConfirmationDialog() {
        confirmationDialog.classList.remove('visible'); // Hide the dialog
        // Clear the callback slightly after animation ends to avoid issues
        setTimeout(() => {
            currentConfirmCallback = null;
        }, 300); // Matches typical transition duration
    }

    function showFeedback(message, type = 'info') {
        console.log(`Feedback[${type}]: ${message}`);
        const feedbackElement = document.createElement('div');
        feedbackElement.textContent = message;

        // Basic styling - can be moved to CSS if needed
        feedbackElement.style.position = 'fixed';
        feedbackElement.style.bottom = '-50px'; // Start off-screen
        feedbackElement.style.left = '50%';
        feedbackElement.style.transform = 'translateX(-50%)';
        feedbackElement.style.padding = '10px 20px';
        feedbackElement.style.borderRadius = '8px';
        feedbackElement.style.zIndex = '1100'; // Ensure it's above dialogs
        feedbackElement.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
        feedbackElement.style.fontSize = '0.95em';
        feedbackElement.style.textAlign = 'center';
        feedbackElement.style.maxWidth = '90%';
        feedbackElement.style.transition = 'opacity 0.4s ease, bottom 0.4s ease';
        feedbackElement.style.opacity = '0';

        // Style based on type using CSS variables
        switch (type) {
            case 'success':
                feedbackElement.style.backgroundColor = 'var(--success-color)';
                feedbackElement.style.color = '#ffffff';
                break;
            case 'danger':
                feedbackElement.style.backgroundColor = 'var(--danger-color)';
                feedbackElement.style.color = '#ffffff';
                break;
            case 'info':
            default:
                feedbackElement.style.backgroundColor = 'var(--primary-color)';
                feedbackElement.style.color = '#ffffff';
                break;
        }

        document.body.appendChild(feedbackElement);

        // Animate in
        setTimeout(() => {
            feedbackElement.style.opacity = '1';
            feedbackElement.style.bottom = '20px';
        }, 10); // Small delay to allow rendering off-screen first

        // Animate out and remove after a delay
        setTimeout(() => {
            feedbackElement.style.opacity = '0';
            feedbackElement.style.bottom = '-50px';
        }, 3500); // Keep visible for 3.5 seconds
        setTimeout(() => {
            if (feedbackElement.parentNode) {
                feedbackElement.parentNode.removeChild(feedbackElement);
            }
        }, 4000); // Remove from DOM after animation
    }

    function updateDashboard() {
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        const startOfWeekStr = getStartOfWeek(today); // Gets date string 'YYYY-MM-DD' for start of week
        const todayStr = getCurrentDateString(); // Gets date string 'YYYY-MM-DD' for today

        let monthHours = 0;
        let weekHours = 0;

        recordedEntries.forEach(entry => {
            const entryDate = new Date(entry.date + 'T00:00:00'); // Ensure comparison uses local time
            // Check for month and year match
            if (entryDate.getMonth() === currentMonth && entryDate.getFullYear() === currentYear) {
                monthHours += entry.hours;
            }
            // Check if date is within the current week (Monday to today)
            if (entry.date >= startOfWeekStr && entry.date <= todayStr) {
                weekHours += entry.hours;
            }
        });

        dashboardWeekHours.textContent = formatHoursExtensive(weekHours);

        const goal = settings.monthlyGoal;
        const percent = goal > 0 ? Math.min(100, (monthHours / goal) * 100) : 0;
        dashboardMonthPercentage.textContent = `${Math.round(percent)}%`;
        updateProgressRing(monthHours, goal); // Update the visual ring

        dashboardMonthTotal.querySelector('strong').textContent = formatHoursExtensive(monthHours);

        // --- Forecast Calculation ---
        const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0).getDate(); // Day number (e.g., 31)
        const todayDayOfMonth = today.getDate();
        const remainingDays = Math.max(0, lastDayOfMonth - todayDayOfMonth);
        const remainingHours = Math.max(0, goal - monthHours);
        let forecastText = '';
        const forecastLabelSpan = `<span data-translate-key="dashboardForecastLabel">${i18n.t('dashboardForecastLabel')}</span>: `;

        if (!settings.goalHasBeenSet) {
            forecastText = forecastLabelSpan + i18n.t('dashboardGoalNotSet');
        } else if (remainingHours <= 0) { // Goal met or exceeded
            forecastText = forecastLabelSpan + i18n.t('dashboardGoalReached');
        } else if (remainingDays <= 0 && monthHours < goal) { // Last day, goal not met
            forecastText = forecastLabelSpan + i18n.t('dashboardGoalNotReached');
        } else { // Goal not met, days remaining
             let avgNeeded = remainingDays > 0 ? remainingHours / remainingDays : remainingHours; // Raw average needed
             let daysToReachGoal = remainingDays; // Start with actual remaining days

             // If avg needed is very low, adjust to show effort over a minimum required days
             if (daysToReachGoal > 0 && avgNeeded > 0 && avgNeeded < MIN_HOURS_PER_DAY_FORECAST) {
                 daysToReachGoal = Math.ceil(remainingHours / MIN_HOURS_PER_DAY_FORECAST); // How many days if you do minimum per day?
                 avgNeeded = MIN_HOURS_PER_DAY_FORECAST; // Set average shown to the minimum threshold
             } else if (daysToReachGoal <= 0) { // Last day edge case (already handled, but safe)
                avgNeeded = remainingHours; // Need all remaining today
                daysToReachGoal = 1; // Count today as 1 day
             }

            const neededText = i18n.t('dashboardForecastNeeded', { remainingHours: formatHoursExtensive(remainingHours) });
            const suggestion = i18n.t('dashboardForecastSuggestion', {
                avgNeeded: formatHoursExtensive(avgNeeded, true), // Format as "Xh Ym"
                daysUnit: daysToReachGoal === 1 ? i18n.t('day') : i18n.t('days'),
                daysNeeded: daysToReachGoal,
                daysPlural: daysToReachGoal === 1 ? i18n.t('day') : i18n.t('days') // Included for flexibility in translations
            });
             forecastText = `<span>${forecastLabelSpan}${neededText}</span><span>${suggestion}</span>`; // Combine into two lines potentially
        }
        dashboardForecast.innerHTML = forecastText; // Use innerHTML to render potential spans

        updateDashboardPlannedDates(); // Update planned dates shown on dashboard
    }

    function updateProgressRing(currentValue, maxValue) {
        if (!progressRingFg || typeof progressRingCircumference !== 'number' || progressRingCircumference === 0) {
           console.warn("Progress ring not properly initialized for update.");
            return;
        }
        // Ensure percentage is between 0 and 100
        const percentage = maxValue > 0 ? Math.min(100, (currentValue / maxValue) * 100) : 0;
        // Calculate offset: full circumference means 0% done, 0 offset means 100% done
        const offset = progressRingCircumference * (1 - percentage / 100);

        // Apply styles to the foreground circle
        progressRingFg.style.strokeDasharray = `${progressRingCircumference} ${progressRingCircumference}`;
        progressRingFg.style.strokeDashoffset = Math.max(0, offset); // Ensure offset doesn't go negative
    }

    function updateDashboardPlannedDates() {
        const today = new Date(); today.setHours(0,0,0,0); // Compare against start of today
        const todayStr = getCurrentDateString();
        const now = new Date(); // For time comparison within today
        const currentHour = now.getHours();
        const overdueThreshold = 18; // Consider plans overdue after 6 PM (18:00) on the planned day

        // Filter and sort future plans
        const futurePlans = plannedEntries.filter(p => p.date >= todayStr)
                                         .sort((a,b) => new Date(a.date) - new Date(b.date));

        // Filter and sort past plans that are still in the list (presumably not marked 'Done')
        const pastUncompletedPlans = plannedEntries.filter(p => {
                const planDate = new Date(p.date + 'T00:00:00');
                // Overdue if date is before today, OR if it's today and past the threshold hour
                return planDate < today || (planDate.getTime() === today.getTime() && currentHour >= overdueThreshold);
            })
            .sort((a,b) => new Date(a.date) - new Date(b.date)); // Sort past plans by date too

         // Combine, ensure uniqueness, sort chronologically, and limit
        const displayPlans = [...futurePlans, ...pastUncompletedPlans]
                            .reduce((acc, current) => { // Deduplicate based on ID
                               if (!acc.some(item => item.id === current.id)) { acc.push(current); }
                               return acc;
                             }, [])
                            .sort((a, b) => new Date(a.date + 'T00:00:00') - new Date(b.date + 'T00:00:00')) // Sort combined list
                            .slice(0, 3); // Limit to the top 3 most relevant (soonest future/oldest past)

        dashboardPlanList.innerHTML = ''; // Clear previous list

        if (displayPlans.length > 0) {
            dashboardPlannedDatesContainer.classList.remove('hidden'); // Show the container
            displayPlans.forEach(plan => {
                const li = document.createElement('li');
                li.dataset.id = plan.id;
                const planDate = new Date(plan.date + 'T00:00:00');
                // Determine if this specific plan is overdue based on logic above
                const isOverdue = planDate < today || (planDate.getTime() === today.getTime() && currentHour >= overdueThreshold);

                 li.innerHTML = i18n.t('dashboardPlannedDateEntry', {
                      relativeDate: formatRelativeDate(plan.date),
                      hours: formatHoursExtensive(plan.hours, true) // Use short format "Xh Ym"
                 });
                if (isOverdue) {
                    const warningSpan = document.createElement('span');
                    warningSpan.textContent = i18n.t('dashboardPlannedOverdue'); // Text like "(Atrasado!)"
                    warningSpan.classList.add('plan-warning');
                    li.appendChild(warningSpan);
                }

                dashboardPlanList.appendChild(li);
            });
        } else {
            dashboardPlannedDatesContainer.classList.add('hidden'); // Hide if no relevant plans
        }
    }

    function renderHistory() {
         if (!historyList || !historySearchInput || !showingResultsLabel || !historyListPlaceholder) {
             console.error("History elements not found."); return;
         }

         historyList.innerHTML = ''; // Clear previous list
        const searchTerm = historySearchInput.value.trim().toLowerCase();
        let results = [];
        let resultsLabelText = '';
        const hasSearch = searchTerm.length > 0;
        const defaultTag = getDefaultTag(); // Get locale-specific default tag for comparison

        if (hasSearch) {
            results = recordedEntries.filter(entry => {
                const entryDateFormatted = formatDisplayDate(entry.date).toLowerCase();
                const entryDateISO = entry.date.toLowerCase();
                const entryHoursStr = String(entry.hours || 0).replace('.', ','); // Allow comma decimal search
                const entryHoursRounded = Math.round(entry.hours || 0).toString(); // Allow searching rounded hour
                const entryHoursFormatted = formatHoursExtensive(entry.hours).toLowerCase();
                const entryTag = (entry.tag || '').toLowerCase();
                const entryNotes = (entry.notes || '').toLowerCase();

                return entryDateFormatted.includes(searchTerm) ||
                       entryDateISO.includes(searchTerm) || // Search YYYY-MM-DD
                       entryHoursStr.includes(searchTerm) || // Search "X,Y" hours
                       entryHoursRounded.includes(searchTerm) || // Search whole hour
                       entryHoursFormatted.includes(searchTerm) || // Search formatted string like "X horas"
                       entryTag.includes(searchTerm) ||
                       entryNotes.includes(searchTerm);
            });
            // Use replacePlaceholders for label text
             const searchTermText = i18n.t('historyShowingResultsTerm', { term: searchTerm });
            resultsLabelText = i18n.t('historyShowingResultsLabel', { count: results.length, searchTerm: searchTermText });
        } else {
            // Show recent entries if no search term
            const dateLimit = getDateMonthsAgo(HISTORY_MONTH_LIMIT);
            results = recordedEntries.filter(entry => entry.date >= dateLimit);
            // Update label based on whether there's recent data
            if (recordedEntries.length > 0 && results.length === 0) {
                 resultsLabelText = i18n.t('historyNoRecentData', { months: HISTORY_MONTH_LIMIT });
            } else if (recordedEntries.length > 0) {
                resultsLabelText = i18n.t('historyShowingLastMonthsLabel', { months: HISTORY_MONTH_LIMIT });
            } else {
                resultsLabelText = ''; // No records at all
            }
        }

        showingResultsLabel.textContent = resultsLabelText; // Display "Showing X results..." or similar

        // Handle placeholder visibility and text
        if (results.length === 0) {
            let placeholderKey = 'historyNoRecordsYet'; // Default placeholder
            if (recordedEntries.length > 0) { // If records exist, but search returned nothing
                placeholderKey = hasSearch ? 'historyPlaceholderSearch' : 'historyPlaceholderRecent';
            }
            historyListPlaceholder.textContent = i18n.t(placeholderKey, { months: HISTORY_MONTH_LIMIT });
            historyListPlaceholder.classList.remove('hidden');
        } else {
            historyListPlaceholder.classList.add('hidden'); // Hide placeholder if there are results
        }

        // Render the results
        results.forEach(entry => {
            const li = document.createElement('li');
            li.dataset.id = entry.id;

            // Display tag only if it's not the default tag for the current language
            const tagDisplay = entry.tag && entry.tag !== defaultTag
                ? `<span class="tag-badge">${entry.tag}</span>`
                : '';

             // Show notes preview or a placeholder text
            const notesPreviewText = entry.notes ? entry.notes.replace(/\n/g, ' ') : i18n.t('historyEntryNoNotes'); // Replace newlines for preview
            const notesPreviewClass = entry.notes ? "notes-preview" : "notes-preview"; // Keep same class for styling
            const notesPreview = `<span class="${notesPreviewClass}">${notesPreviewText}</span>`;

            const hoursDisplay = formatHoursExtensive(entry.hours);

            li.innerHTML = `
                <div class="entry-details">
                    <strong>${formatDisplayDate(entry.date)}:</strong>
                    <span class="hours">${hoursDisplay}</span>
                    ${tagDisplay}
                    ${notesPreview}
                </div>
                <div class="entry-actions">
                    <button class="edit-btn secondary" data-translate-key="historyEditButton">${i18n.t('historyEditButton')}</button>
                    <button class="delete-btn danger" data-translate-key="historyDeleteButton">${i18n.t('historyDeleteButton')}</button>
                </div>
            `;

            // Add event listeners directly to the buttons
            li.querySelector('.edit-btn').addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent triggering potential li click events
                editRecordEntry(entry.id);
            });
            li.querySelector('.delete-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                deleteRecordEntry(entry.id);
            });

            historyList.appendChild(li);
        });
    }

    function renderPlanning() {
         if (!planningList || !planningListPlaceholder) {
            console.error("Planning list elements not found."); return;
         }

        planningList.innerHTML = ''; // Clear previous list
        const todayStr = getCurrentDateString();
        // Always work with a sorted copy
        const allPlansSorted = [...plannedEntries].sort((a, b) => new Date(a.date + 'T00:00:00') - new Date(b.date + 'T00:00:00'));

        // Handle placeholder if no plans exist
        if (allPlansSorted.length === 0) {
            // Different message depending on whether there *used* to be plans or never were?
            // Let's use a general "no future plans" message for now.
            planningListPlaceholder.textContent = i18n.t('planningListPlaceholder'); // E.g., "Nenhum planejamento futuro."
            planningListPlaceholder.classList.remove('hidden');
            return; // Exit early
        }

        planningListPlaceholder.classList.add('hidden'); // Hide placeholder if there are plans

        // Render the plans
        allPlansSorted.forEach(plan => {
            const li = document.createElement('li');
            li.dataset.id = plan.id;
            const hoursDisplay = formatHoursExtensive(plan.hours);
            const isPastPlan = plan.date < todayStr; // Check if the plan date is before today

            li.innerHTML = `
                <div class="entry-details">
                    <strong>${formatDisplayDate(plan.date)} (${formatRelativeDate(plan.date)}):</strong>
                    <span class="hours">${hoursDisplay}</span> ${i18n.t('planningEntryLabel')}
                    ${isPastPlan ? `<span class="plan-past-date-indicator">${i18n.t('planningEntryPastDate')}</span>` : ''}
                </div>
                <div class="plan-actions">
                    <button class="done-plan-btn success" data-translate-key="planningDoneButton">${i18n.t('planningDoneButton')}</button>
                    <button class="delete-plan-btn danger" data-translate-key="planningDeleteButton">${i18n.t('planningDeleteButton')}</button>
                </div>
            `;

            // Add event listeners directly to buttons
            li.querySelector('.done-plan-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                markPlanAsDone(plan.id);
            });
            li.querySelector('.delete-plan-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                deletePlanEntry(plan.id);
            });

            planningList.appendChild(li);
        });
    }

    function updateStatistics() {
        // Ensure all required elements exist
        if (!statsMonthHours || !statsMonthGoalProgress || !statsMonthProgressBar || !statsAvgHoursDay || !statsMonthDaysActive) {
           console.error("Statistics elements not found."); return;
        }

        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        // Filter entries for the current month and year
        const entriesThisMonth = recordedEntries.filter(entry => {
            const entryDate = new Date(entry.date + 'T00:00:00');
            return entryDate.getMonth() === currentMonth && entryDate.getFullYear() === currentYear;
        });

        let totalHoursThisMonth = 0;
        const activeDaysThisMonth = new Set(); // Use a Set to count unique days

        entriesThisMonth.forEach(entry => {
            totalHoursThisMonth += entry.hours;
            activeDaysThisMonth.add(entry.date); // Add date string to set
        });

        const goal = settings.monthlyGoal;
        // Calculate progress, only if goal has been set
        const progressPercentage = settings.goalHasBeenSet
            ? (goal > 0 ? Math.min(Math.round((totalHoursThisMonth / goal) * 100), 100) : 0) // Prevent > 100% visually
            : 0; // Show 0% if no goal set

        // Calculate average hours per active day
        const averageHoursPerActiveDay = activeDaysThisMonth.size > 0
            ? (totalHoursThisMonth / activeDaysThisMonth.size)
            : 0;

        const daysActiveCount = activeDaysThisMonth.size;

        // Update DOM elements
        statsMonthHours.textContent = formatHoursExtensive(totalHoursThisMonth);
        statsMonthGoalProgress.textContent = settings.goalHasBeenSet ? `${progressPercentage}%` : '--%'; // Show '--' if no goal
        statsMonthProgressBar.style.width = `${progressPercentage}%`;
        statsAvgHoursDay.textContent = formatHoursExtensive(averageHoursPerActiveDay);
        statsMonthDaysActive.textContent = daysActiveCount;
    }

    function populateMonthSelector() {
        if (!chartMonthSelector) { console.error("Chart month selector not found."); return; }

        const availableMonths = new Set(); // Use a Set to automatically handle duplicates
        recordedEntries.forEach(e => availableMonths.add(getMonthYearString(new Date(e.date + 'T00:00:00')))); // Format as MM/YYYY

        // Convert Set to array, sort descending by date (most recent first)
        const sortedMonths = Array.from(availableMonths).sort((a, b) => {
            const [mA, yA] = a.split('/');
            const [mB, yB] = b.split('/');
            return new Date(yB, mB - 1) - new Date(yA, mA - 1); // Compare Date objects
        });

        const oldSelectedValue = chartMonthSelector.value; // Remember current selection if any
        chartMonthSelector.innerHTML = ''; // Clear existing options

        // Handle case where there's no data at all
        if (sortedMonths.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = i18n.t('chartNoData'); // e.g., "Nenhum dado disponível"
            chartMonthSelector.appendChild(option);
            chartMonthSelector.disabled = true; // Disable selector if no data
            return;
        }

        // Enable selector and add month options
        chartMonthSelector.disabled = false;
        const currentMonthYearValue = getMonthYearString(new Date()); // Get current month 'MM/YYYY'
        const currentMonthYearFormatted = formatMonthYearExtensive(currentMonthYearValue); // Get 'Month YYYY' string
        let hasCurrentMonth = sortedMonths.includes(currentMonthYearValue); // Does data exist for the current month?
        let didSelectOld = false; // Track if we re-selected the previously selected value

        // Add options for months with data
        sortedMonths.forEach(monthYearValue => {
            const option = document.createElement('option');
            option.value = monthYearValue;
            option.textContent = formatMonthYearExtensive(monthYearValue); // Display as 'Month YYYY'
            // Restore previous selection or select current month by default
            if (monthYearValue === oldSelectedValue) {
                option.selected = true;
                didSelectOld = true;
            } else if (monthYearValue === currentMonthYearValue && !didSelectOld) {
                // Select current month if it exists and nothing else was selected
                 option.selected = true;
            }
            chartMonthSelector.appendChild(option);
        });

        // If current month had no data, add it as the first option (potentially selected)
        if (!hasCurrentMonth) {
             const option = document.createElement('option');
             option.value = currentMonthYearValue; // Use MM/YYYY value
             option.textContent = `${currentMonthYearFormatted} ${i18n.t('chartCurrentMonth')}`; // E.g., "Dezembro 2023 (Mês Atual)"
             chartMonthSelector.insertBefore(option, chartMonthSelector.firstChild); // Add at the beginning
            if (!didSelectOld) option.selected = true; // Select it if no prior selection was restored
        }

        // Final check: ensure *something* is selected if options exist
         if (!chartMonthSelector.value && chartMonthSelector.options.length > 0) {
            chartMonthSelector.options[0].selected = true;
         }
    }

    function getAveragesForChart(year, monthIndex) {
        // Data for the specific year
        const entriesThisYear = recordedEntries.filter(e => new Date(e.date + 'T00:00:00').getFullYear() === year);
        // Data for the specific month within that year
        const entriesThisMonth = entriesThisYear.filter(e => new Date(e.date + 'T00:00:00').getMonth() === monthIndex);

        let totalHoursMonth = 0;
        const activeDaysMonth = new Set(); // Unique days with activity this month
        entriesThisMonth.forEach(e => {
            totalHoursMonth += e.hours;
            activeDaysMonth.add(e.date);
        });

        let totalHoursYear = 0;
        const monthsWithActivityYear = new Set(); // Unique months with activity this year (MM/YYYY)
        entriesThisYear.forEach(e => {
            totalHoursYear += e.hours;
            monthsWithActivityYear.add(getMonthYearString(new Date(e.date + 'T00:00:00')));
        });

        // Get number of days in the selected month
        const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

        return {
            // Average daily hours (only considering days with activity)
            avgDaily: activeDaysMonth.size > 0 ? totalHoursMonth / activeDaysMonth.size : 0,
            // Average weekly hours (estimated based on monthly total / days * 7)
             avgWeekly: daysInMonth >= 7 && totalHoursMonth > 0 ? (totalHoursMonth / daysInMonth) * 7 : 0, // Rough estimate
             // Average monthly hours (based on total year hours / number of active months in year)
            avgMonthly: monthsWithActivityYear.size > 0 ? totalHoursYear / monthsWithActivityYear.size : 0
        };
    }

    function renderCharts(selectedMonthYearValue) {
         if (!monthlyHoursChartCtx) { console.error("Chart context not found."); return; }

         // Handle case where no month is selected (e.g., initial load with no data)
         if (!selectedMonthYearValue) {
             if (monthlyHoursChartInstance) monthlyHoursChartInstance.destroy();
             monthlyHoursChartInstance = null;
             const ctx = monthlyHoursChartCtx;
             ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height); // Clear canvas
             ctx.save();
             ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
             ctx.fillStyle = textMutedColor || '#aaa'; // Use cached or fallback
             ctx.font = `14px ${computedStyles ? computedStyles.fontFamily : 'sans-serif'}`;
             ctx.fillText(i18n.t('feedbackChartSelectMonth'), ctx.canvas.width / 2, ctx.canvas.height / 2);
             ctx.restore();
             return;
         }

         try {
            // Parse the selected month/year
            const selectedMonthYearFormatted = formatMonthYearExtensive(selectedMonthYearValue);
            const [selectedMonth, selectedYear] = selectedMonthYearValue.split('/').map(Number);
            const monthIndex = selectedMonth - 1;
            const year = selectedYear;

            // Filter entries for the selected month and year
            const entriesSelectedMonth = recordedEntries.filter(e => {
                const d = new Date(e.date + 'T00:00:00');
                return d.getMonth() === monthIndex && d.getFullYear() === year;
            });

            // Prepare chart data
            const daysInSelectedMonth = new Date(year, monthIndex + 1, 0).getDate();
            const dailyHoursData = Array(daysInSelectedMonth).fill(0); // Array of zeros, length = days in month
            entriesSelectedMonth.forEach(e => {
                const dayOfMonth = new Date(e.date + 'T00:00:00').getDate(); // Day number (1-31)
                dailyHoursData[dayOfMonth - 1] += e.hours; // Add hours to the correct day index (0-based)
            });

            const chartLabels = Array.from({ length: daysInSelectedMonth }, (_, i) => i + 1); // Labels [1, 2, ..., 31]
            const averages = getAveragesForChart(year, monthIndex); // Get avg daily, weekly, monthly

            // --- Chart Annotation Configuration ---
            const annotations = {};
            let pluginOptions = {};

             // Re-fetch CSS variables here to ensure accuracy if theme could change (though unlikely here)
             const currentAvgLineColor1 = computedStyles.getPropertyValue('--avg-line-color-1').trim() || '#FF9F0A';
             const currentAvgLineColor2 = computedStyles.getPropertyValue('--avg-line-color-2').trim() || '#AF52DE';
             const currentAvgLineColor3 = computedStyles.getPropertyValue('--avg-line-color-3').trim() || '#5E5CE6';
             const currentTooltipBgColor = computedStyles.getPropertyValue('--card-bg').trim() || '#1c1c1e';
             const currentTextColor = computedStyles.getPropertyValue('--text-color').trim() || '#ffffff';
             const currentTextMutedColor = computedStyles.getPropertyValue('--text-color-secondary').trim() || 'rgba(235, 235, 245, 0.6)';
             const currentGridColor = computedStyles.getPropertyValue('--border-color').trim() || '#3a3a3c';
             const currentPrimaryColor = computedStyles.getPropertyValue('--primary-color').trim() || '#0A84FF';


            if (window.ChartAnnotation) { // Check if plugin is loaded
                 if (averages.avgDaily > 0) annotations.avgDay = { type: 'line', scaleID: 'y', value: averages.avgDaily, borderColor: currentAvgLineColor1, borderWidth: 1.5, borderDash: [6, 6], label: { content: i18n.t('chartAvgDailyLabel', {value:formatHoursExtensive(averages.avgDaily,true)}), display: true, position: 'end', color: currentAvgLineColor1, backgroundColor: currentTooltipBgColor, font: { size: 9 }, yAdjust: -10 }};
                 if (averages.avgWeekly > 0) annotations.avgWeek = { type: 'line', scaleID: 'y', value: averages.avgWeekly, borderColor: currentAvgLineColor2, borderWidth: 1.5, borderDash: [10, 10], label: { content: i18n.t('chartAvgWeeklyLabel', {value:formatHoursExtensive(averages.avgWeekly,true)}), display: true, position: 'end', color: currentAvgLineColor2, backgroundColor: currentTooltipBgColor, font: { size: 9 }, yAdjust: 2 }};
                 if (averages.avgMonthly > 0) annotations.avgMonth = { type: 'line', scaleID: 'y', value: averages.avgMonthly, borderColor: currentAvgLineColor3, borderWidth: 1.5, borderDash: [2, 2], label: { content: i18n.t('chartAvgMonthlyLabel', {value:formatHoursExtensive(averages.avgMonthly,true)}), display: true, position: 'end', color: currentAvgLineColor3, backgroundColor: currentTooltipBgColor, font: { size: 9 }, yAdjust: 14 }};
                pluginOptions.annotation = { drawTime: 'afterDatasetsDraw', annotations: annotations }; // Configure plugin
            } else {
                 console.warn("ChartAnnotation not loaded, average lines disabled.");
            }

            // Destroy previous chart instance if it exists
            if (monthlyHoursChartInstance) monthlyHoursChartInstance.destroy();

            // Create new chart instance
            monthlyHoursChartInstance = new Chart(monthlyHoursChartCtx, {
                type: 'bar',
                data: {
                    labels: chartLabels,
                    datasets: [{
                        label: i18n.t('chartDailyHoursLabel'), // Legend label
                        data: dailyHoursData,
                        backgroundColor: currentPrimaryColor, // Use dynamic CSS variable
                        borderColor: currentPrimaryColor, // Use dynamic CSS variable
                        borderWidth: 0, // No border for bars
                        borderRadius: 4 // Slightly rounded bars
                    }]
                },
                options: {
                    responsive: true, // Make chart responsive
                    maintainAspectRatio: false, // Allow height to be controlled by container
                    scales: {
                        y: {
                            beginAtZero: true, // Start y-axis at 0
                            title:{display:false}, // No y-axis title needed
                            ticks:{
                                color: currentTextMutedColor, // Use dynamic CSS variable
                                padding: 10, // Padding for y-axis labels
                                // Format Y axis ticks like "Xh" or "Xh Ym"
                                callback: v => formatHoursExtensive(v, true)
                            },
                            grid: {
                                color:currentGridColor, // Use dynamic CSS variable for grid lines
                                drawBorder: false // No border line for y-axis
                            }
                        },
                        x: {
                            title:{display:false}, // No x-axis title needed
                            ticks:{ color:currentTextMutedColor }, // Use dynamic CSS variable
                            grid:{ display: false } // Hide vertical grid lines
                        }
                    },
                    plugins: {
                         ...pluginOptions, // Include annotation plugin options if available
                         title: {
                            display: true,
                            text: selectedMonthYearFormatted, // E.g., "Dezembro 2023"
                            color: currentTextColor, // Use dynamic CSS variable
                            font: { size: 14, weight: 'normal' },
                            padding: { bottom: 15 }
                         },
                         tooltip: {
                            backgroundColor: currentTooltipBgColor, // Use dynamic CSS variable
                            titleColor: currentTextColor, // Use dynamic CSS variable
                            bodyColor: currentTextColor, // Use dynamic CSS variable
                            displayColors: false, // Don't show the little color box
                            padding: 10,
                            cornerRadius: 6,
                            callbacks: {
                                // Customize tooltip label
                                label: ctx => i18n.t('chartTooltipLabel', {
                                    day: ctx.label, // Day number
                                    hours: formatHoursExtensive(ctx.parsed.y) // Full hours format
                                })
                            }
                         },
                         legend: { display: false } // Hide the dataset legend (only one dataset)
                    }
                }
            });
         } catch (error) {
             console.error("Chart rendering error:", error);
             if (monthlyHoursChartInstance) monthlyHoursChartInstance.destroy(); // Clean up if error
             monthlyHoursChartInstance = null;
             // Display error message on canvas
             const ctx = monthlyHoursChartCtx;
             ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);
             ctx.save();
             ctx.textAlign='center';ctx.textBaseline='middle';
             ctx.fillStyle=textMutedColor || '#aaa';
             ctx.font=`14px ${computedStyles ? computedStyles.fontFamily : 'sans-serif'}`;
             ctx.fillText(i18n.t('feedbackChartRenderError'), ctx.canvas.width/2, ctx.canvas.height/2);
             ctx.restore();
         }
    }

    function updateAllDisplays() {
        // Update core components
        updateDashboard();
        updateStatistics();
        populateMonthSelector(); // Populates based on all recordedEntries
        renderHistory(); // Renders based on filter/search
        renderPlanning(); // Renders based on plannedEntries

         // Ensure chart elements are present before attempting chart updates
        if (!chartMonthSelector || !monthlyHoursChartCtx) {
            console.error("Cannot update charts, elements missing.");
            return;
        }

        // --- Handle Chart Rendering ---
        const selectedMonthValue = chartMonthSelector.value; // Get the MM/YYYY value
        let chartRendered = false;
        let clearChartMsgKey = 'feedbackChartSelectMonth'; // Default message key

         // Use cached styles or fallbacks if needed for clearing message
         const fallbackFont = 'sans-serif';
         const fallbackMutedColor = 'rgba(235, 235, 245, 0.6)';

         if (recordedEntries.length === 0) {
             // Case 1: No data ever recorded
             clearChartMsgKey = 'feedbackChartNoData';
         } else if (selectedMonthValue) {
             // Case 2: A month is selected in the dropdown
             // Check if there's actual data *for this specific month*
             const hasData = recordedEntries.some(e => getMonthYearString(new Date(e.date+'T00:00:00')) === selectedMonthValue);
             if (hasData) {
                 renderCharts(selectedMonthValue); // Render the chart with data
                 chartRendered = true;
             } else {
                 // Month selected, but no data for it (e.g., future month selected)
                 clearChartMsgKey = 'feedbackChartNoDataMonth';
             }
         } else if (chartMonthSelector.options.length > 0 && chartMonthSelector.options[0].value) {
            // Case 3: Nothing specific selected, but dropdown has valid months
            // Auto-select and render the first available month (most recent)
            chartMonthSelector.options[0].selected = true;
            renderCharts(chartMonthSelector.value);
            chartRendered = true;
         } else {
            // Case 4: Should ideally be caught by Case 1 (no options generated)
            // But as a fallback, show a general "no data yet" message
             clearChartMsgKey = 'feedbackChartNoDataYet';
         }

         // If no chart was rendered, clear the canvas and show a message
         if (!chartRendered) {
             if (monthlyHoursChartInstance) monthlyHoursChartInstance.destroy();
             monthlyHoursChartInstance = null;
             const ctx = monthlyHoursChartCtx;
             ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);
             ctx.save();
             ctx.textAlign='center'; ctx.textBaseline='middle';
             ctx.fillStyle = textMutedColor || fallbackMutedColor; // Use cached or fallback
             ctx.font=`14px ${computedStyles ? computedStyles.fontFamily : fallbackFont}`; // Use cached or fallback
             // Get the translated message (pass month value for context if available)
             const msg = i18n.t(clearChartMsgKey, { month: formatMonthYearExtensive(selectedMonthValue)});
             ctx.fillText(msg, ctx.canvas.width/2, ctx.canvas.height/2);
             ctx.restore();
         }

         // --- Update Record Button Text ---
        if (recordIdInput?.value) { // If editing an existing record
             if (saveRecordBtn) saveRecordBtn.textContent = i18n.t('updateRecordButton');
        } else { // If adding a new record
            if (saveRecordBtn) saveRecordBtn.textContent = i18n.t('saveRecordButton');
        }
    }

    // ----- Funções Auxiliares (Inputs, SW, etc) -----
    function formatTimeInputOnType(event) {
         const input = event.target;
         let value = input.value;
         let cursorPos = input.selectionStart;
         // 1. Remove all non-digits
         let numericValue = value.replace(/[^\d]/g, '');
         let formattedValue = '';
         let newCursorPos = cursorPos; // Start with original position

         // Limit to 4 digits max (e.g., 1200 for 12:00)
         numericValue = numericValue.substring(0, 4);

         if (numericValue.length === 0) {
             formattedValue = '';
         } else if (numericValue.length <= 2) { // Only minutes or first part of hours
             formattedValue = numericValue;
         } else { // 3 or 4 digits - insert colon
             const hoursPart = numericValue.slice(0, -2);
             const minutesPart = numericValue.slice(-2);
             formattedValue = `${hoursPart}:${minutesPart}`;
             // Adjust cursor position if a colon was just inserted
             if (value.indexOf(':') === -1 && formattedValue.indexOf(':') !== -1) { // Colon was added
                 if (cursorPos >= formattedValue.indexOf(':')) { // If cursor was at or after the colon's new position
                      newCursorPos = cursorPos + 1; // Move cursor right one position
                 }
             }
             // Adjust cursor if typing deleted the colon implicitly
              else if (value.indexOf(':') !== -1 && formattedValue.indexOf(':') === -1 && cursorPos > 0) {
                newCursorPos = Math.max(0, cursorPos - 1); // Move cursor left if colon was removed
              }
             // Adjust cursor if number before colon changes (less robust)
             // Basic adjustment: keep relative position if possible.
              else if (value.length !== formattedValue.length) {
                  newCursorPos = Math.max(0, formattedValue.length - (value.length - cursorPos));
              }

         }
         // Only update DOM if value changed to avoid cycles and cursor jumps
         if (input.value !== formattedValue) {
             input.value = formattedValue;
             // Restore cursor position after DOM update
             requestAnimationFrame(() => { // Use rAF to ensure DOM has updated
                 input.setSelectionRange(newCursorPos, newCursorPos);
             });
         }
    }
    function validateTimeInputOnBlur(event) {
        const input = event.target;
        const decimalValue = parseTimeInputToDecimal(input.value);
        // If valid time > 0, format it nicely (HH:MM)
        if (!isNaN(decimalValue) && decimalValue > 0) {
             input.value = formatDecimalToTimeInput(decimalValue);
        } else if (input.value.trim() !== '') { // If input is not empty but invalid or zero
             input.value = ''; // Clear the input
             // Optionally show feedback: showFeedback(i18n.t('feedbackTimeInvalid'), 'danger');
        }
    }
    function validateNotesInput(event) {
        const input = event.target;
        if (input.value.length > NOTES_MAX_LENGTH) {
             input.value = input.value.substring(0, NOTES_MAX_LENGTH);
            // Provide feedback that the limit was reached
             showFeedback(i18n.t('feedbackNotesLengthLimit', { maxLength: NOTES_MAX_LENGTH }), 'info');
        }
    }
    function registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('./service-worker.js') // Ensure path is correct
                .then((reg) => {
                     console.log('Service Worker registered successfully. Scope:', reg.scope);
                })
                .catch((error) => {
                     console.error('Service Worker registration failed:', error);
                });
        }
    }

    // ----- Função de Inicialização -----
    async function init() {
        console.log("Initializing Pioneer Work Tracker...");

        // 1. Setup Internationalization
        i18n.detectLanguage();
        await i18n.loadTranslations(); // Wait for translations to load

        console.log("Selecting DOM elements...");
         // Cache all elements at once, add checks for critical ones
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
         planningListPlaceholder=planningList ? planningList.querySelector('.placeholder') : null; // Ensure parent exists
         monthlyGoalInput=document.getElementById('monthly-goal');
         saveGoalBtn=document.getElementById('save-goal-btn');
         statsMonthHours=document.getElementById('stats-month-hours');
         statsMonthGoalProgress=document.getElementById('stats-month-goal-progress');
         statsMonthProgressBar=document.getElementById('stats-month-progress-bar');
         statsAvgHoursDay=document.getElementById('stats-avg-hours-day');
         statsMonthDaysActive=document.getElementById('stats-month-days-active');
         chartMonthSelector=document.getElementById('chart-month-selector');
         const chartCanvas = document.getElementById('monthlyHoursChart');
         monthlyHoursChartCtx = chartCanvas ? chartCanvas.getContext('2d') : null;
         historyList=document.getElementById('history-list');
         historySearchInput=document.getElementById('history-search-input');
         historyListPlaceholder=historyList ? historyList.querySelector('.placeholder') : null; // Ensure parent exists
         showingResultsLabel=document.getElementById('showing-results-label');
         clearAllDataBtn=document.getElementById('clear-all-data-btn');
         confirmationDialog=document.getElementById('confirmation-dialog');
         dialogMessage=document.getElementById('dialog-message');
         dialogConfirmBtn=document.getElementById('dialog-confirm-btn');
         dialogCancelBtn=document.getElementById('dialog-cancel-btn');

         // Check for critical missing elements
         if (!appElement || !recordForm || !monthlyHoursChartCtx || !historyList || !planningList) {
             console.error("Critical DOM elements missing. Aborting initialization.");
             // Provide feedback to the user maybe? Could update body.innerHTML here.
             document.body.innerHTML = "<p style='color:red;padding:20px;'>Error: Application could not start. Required elements are missing.</p>";
             return;
         }

        // 2. Get computed styles (after translations which might affect fonts etc.)
         computedStyles = getComputedStyle(document.body);
         // Cache CSS var values initially for chart fallbacks etc.
         textColor = computedStyles.getPropertyValue('--text-color').trim();
         textMutedColor = computedStyles.getPropertyValue('--text-color-secondary').trim();
         gridColor = computedStyles.getPropertyValue('--border-color').trim();
         tooltipBgColor = computedStyles.getPropertyValue('--card-bg').trim();
         primaryColor = computedStyles.getPropertyValue('--primary-color').trim();
         avgLineColor1 = computedStyles.getPropertyValue('--avg-line-color-1').trim();
         avgLineColor2 = computedStyles.getPropertyValue('--avg-line-color-2').trim();
         avgLineColor3 = computedStyles.getPropertyValue('--avg-line-color-3').trim();

        // Initialize progress ring parameters
         if (progressRingFg && progressRingFg.r && progressRingFg.r.baseVal) {
              progressRingRadius = progressRingFg.r.baseVal.value;
              progressRingCircumference = 2 * Math.PI * progressRingRadius;
         } else {
             console.warn("Progress ring radius (r.baseVal) not found or invalid at init.");
             progressRingCircumference = 0; // Set a default to avoid NaN errors later
         }

        console.log("Applying initial translations to DOM...");
        i18n.applyTranslationsToDOM(); // Apply translations after elements selected

        console.log("Loading data from storage...");
        loadData(); // Load data before applying it to UI elements

         // Data Migration/Cleanup (Example: Update old default tags)
         const oldDefaultTag = "Casa em casa"; // Assuming this was the old hardcoded default
         const currentDefaultTag = getDefaultTag(); // Get locale-based default
         if (oldDefaultTag !== currentDefaultTag) { // Only run if default actually changed
            let tagsUpdated = false;
            recordedEntries.forEach(entry => {
                if (entry.tag === oldDefaultTag || !entry.tag) { // Update if old default or empty
                    entry.tag = currentDefaultTag;
                    tagsUpdated = true;
                }
            });
            if (tagsUpdated) {
                console.log(`Updating old default tags ('${oldDefaultTag}') to current ('${currentDefaultTag}'). Saving...`);
                saveData(); // Save if any tags were changed
            }
         }

        // 3. Set initial UI states from loaded data/settings
        monthlyGoalInput.value = settings.monthlyGoal;

        // 4. Register Chart.js Plugins (check if loaded)
        if (window.ChartAnnotation) {
             try { Chart.register(ChartAnnotation); console.log("ChartAnnotation plugin registered."); }
             catch (e) { console.error("Error registering ChartAnnotation:", e); }
        } else {
            console.warn("ChartAnnotation plugin (chartjs-plugin-annotation) not found globally.");
        }

        console.log("Adding event listeners...");
         // --- Event Listeners ---
         // Card toggling (using event delegation on #app)
         appElement.addEventListener('click', (event) => {
             const header = event.target.closest('.card-header[role="button"]');
             if (header) {
                 toggleCard(header.closest('.card'));
             }
         });
         // Keyboard accessibility for card toggles
         document.querySelectorAll('.card-header[role="button"]').forEach(header => {
            header.addEventListener('keydown', (e) => { if(e.key==='Enter'||e.key===' '){e.preventDefault(); toggleCard(header.closest('.card'));}});
         });

         // Record form interactions
         changeDateBtn.addEventListener('click', () => setDateInputVisibility(true));
         recordHoursInput.addEventListener('input', formatTimeInputOnType);
         recordHoursInput.addEventListener('blur', validateTimeInputOnBlur);
         recordNotesInput.addEventListener('input', validateNotesInput); // Limit length while typing
         recordForm.addEventListener('submit', handleRecordSubmit);

         // Plan form interactions
         planHoursInput.addEventListener('input', formatTimeInputOnType);
         planHoursInput.addEventListener('blur', validateTimeInputOnBlur);
         planForm.addEventListener('submit', handlePlanSubmit);
         clearPlanFormBtn.addEventListener('click', clearPlanForm);

         // Settings/Stats interactions
         saveGoalBtn.addEventListener('click', handleGoalSave);
         monthlyGoalInput.addEventListener('keypress', (e)=>{if(e.key==='Enter'){e.preventDefault();handleGoalSave();monthlyGoalInput.blur();}}); // Save on Enter too
         clearAllDataBtn.addEventListener('click', handleClearAllData);

         // History interactions
         historySearchInput.addEventListener('input', () => renderHistory()); // Consider debouncing if performance is issue

         // Chart interactions
         chartMonthSelector.addEventListener('change', () => updateAllDisplays()); // Re-render chart and potentially other data on change

         // Dialog interactions
         dialogConfirmBtn.addEventListener('click', () => {
             try { if(typeof currentConfirmCallback === 'function') currentConfirmCallback(); } // Safely call callback
             catch(e){ console.error("Error executing confirmation callback:", e); }
             finally { hideConfirmationDialog(); } // Always hide dialog
         });
         dialogCancelBtn.addEventListener('click', hideConfirmationDialog);
         confirmationDialog.addEventListener('click', (e)=>{if(e.target === confirmationDialog) hideConfirmationDialog();}); // Close on backdrop click

         // PWA install prompt listener
         window.addEventListener('beforeinstallprompt', (e)=>{
            console.log('`beforeinstallprompt` fired.');
            e.preventDefault(); // Prevent the mini-infobar
            deferredInstallPrompt=e; // Store the event
            // Optionally: show your own install button UI now
         });

        console.log("Setting initial UI state...");
        recordDateInput.value = getCurrentDateString(); // Set default date
        setDateInputVisibility(false); // Show "Hoje" text initially
        clearRecordForm(); // Ensure form is clean
        clearPlanForm(); // Ensure plan form is clean

        // Set initial card expanded state (only record card expanded)
         document.querySelectorAll('.card').forEach(card => {
             const shouldBeExpanded = (card.id === 'record-card');
             const isExpanded = card.classList.contains('expanded');
             if (isExpanded !== shouldBeExpanded) {
                  toggleCard(card);
             }
         });

        console.log("Performing initial full display update...");
        updateAllDisplays(); // Populate lists, dashboard, stats, charts

        registerServiceWorker(); // Register SW

        // Prompt for goal if not set after initial setup
        if (!settings.goalHasBeenSet) {
             console.log("Initial goal not set, prompting user...");
             setTimeout(promptForMonthlyGoal, 700); // Delay slightly after initial render
        }

        // Set interval to periodically update elements like dashboard planned dates if needed
        setInterval(updateDashboardPlannedDates, 60 * 1000); // Update every minute

        console.log("Pioneer Work Tracker Initialization complete.");
    }

     // Start the app
     init().catch(err => {
         // Fatal error handling
         console.error("Fatal error during application initialization:", err);
         const body = document.body || document.documentElement; // Ensure body exists
         body.innerHTML = `<div style="padding: 20px; text-align: center; color: #ff453a; font-family: sans-serif;">
              <h2>Application Error</h2>
              <p>Could not initialize the application. Please check the console for details or try refreshing.</p>
              <pre style="font-size: 0.8em; color: #ccc; text-align: left; white-space: pre-wrap;">${err.message}\n${err.stack}</pre>
              </div>`;
    });

});
