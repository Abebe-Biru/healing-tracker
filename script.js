// script.js
document.addEventListener('DOMContentLoaded', () => {
    const calendarGrid = document.getElementById('calendar-grid');
    const journalEntryTextarea = document.getElementById('journal-entry');
    const saveJournalBtn = document.getElementById('save-journal-btn');
    const selectedDayDisplay = document.getElementById('selected-day-display');
    const saveStatus = document.getElementById('save-status');
    const currentYearSpan = document.getElementById('current-year');

    const NUM_DAYS = 30;
    let currentSelectedDay = null;
    let progressData = {}; // { day1: { completed: false }, day2: { completed: true }, ... }
    let journalData = {};  // { day1: "journal text", day2: "another entry", ... }
    const MAX_JOURNAL_LENGTH = 1000; // Maximum characters for journal entries
    let isSaving = false; // Flag to prevent multiple simultaneous saves

    // --- Initialization ---
    function init() {
        loadProgress();
        loadJournal();
        renderCalendar();
        updateCurrentYear();
        registerServiceWorker();
        updateProgressIndicator();

        // Add event listeners
        saveJournalBtn.addEventListener('click', saveJournal);
        document.getElementById('reset-progress-btn')?.addEventListener('click', resetProgress);
        document.getElementById('delete-journal-btn')?.addEventListener('click', () => {
            if (currentSelectedDay) {
                deleteJournalEntry(currentSelectedDay);
            }
        });

        // Initial state for journal
        journalEntryTextarea.disabled = true;
        journalEntryTextarea.placeholder = "Select a day from the calendar to start journaling 😊";
        saveJournalBtn.disabled = true;
    }

    function updateCurrentYear() {
        if (currentYearSpan) {
            currentYearSpan.textContent = new Date().getFullYear();
        }
    }

    // --- Service Worker ---
    function registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js')
                .then(registration => {
                    console.log('Service Worker registered with scope:', registration.scope);
                })
                .catch(error => {
                    console.error('Service Worker registration failed:', error);
                });
        }
    }

    // --- LocalStorage ---
    function loadProgress() {
        const storedProgress = localStorage.getItem('healingTrackerProgress');
        if (storedProgress) {
            progressData = JSON.parse(storedProgress);
        } else {
            // Initialize progress for all days if nothing is stored
            for (let i = 1; i <= NUM_DAYS; i++) {
                progressData[`day${i}`] = { completed: false };
            }
        }
    }

    function saveProgress() {
        localStorage.setItem('healingTrackerProgress', JSON.stringify(progressData));
    }

    function loadJournal() {
        const storedJournal = localStorage.getItem('healingTrackerJournal');
        if (storedJournal) {
            journalData = JSON.parse(storedJournal);
        }
    }

    function saveJournal() {
        if (isSaving) return;
        if (currentSelectedDay === null) {
            showSaveStatus("Please select a day first! 🙏", true);
            return;
        }

        const journalText = journalEntryTextarea.value.trim();
        if (journalText.length > MAX_JOURNAL_LENGTH) {
            showSaveStatus(`Journal entry is too long! Maximum ${MAX_JOURNAL_LENGTH} characters allowed.`, true);
            return;
        }

        isSaving = true;
        saveJournalBtn.disabled = true;
        saveJournalBtn.textContent = "Saving...";

        try {
            const dayKey = `day${currentSelectedDay}`;
            journalData[dayKey] = journalText;
            localStorage.setItem('healingTrackerJournal', JSON.stringify(journalData));
            showSaveStatus(`Journal for Day ${currentSelectedDay} saved! ✨`);
        } catch (error) {
            console.error('Error saving journal:', error);
            showSaveStatus("Failed to save journal. Please try again.", true);
        } finally {
            isSaving = false;
            saveJournalBtn.disabled = false;
            saveJournalBtn.textContent = "Save Journal Entry 💾";
        }
    }

    function showSaveStatus(message, isError = false) {
        saveStatus.textContent = message;
        saveStatus.style.color = isError ? '#D32F2F' : 'var(--accent-color)'; // Red for error
        setTimeout(() => {
            saveStatus.textContent = '';
        }, 3000);
    }


    // --- Calendar Logic ---
    function renderCalendar() {
        calendarGrid.innerHTML = ''; // Clear existing calendar
        for (let i = 1; i <= NUM_DAYS; i++) {
            const dayKey = `day${i}`;
            const dayButton = document.createElement('button');
            dayButton.classList.add('day-btn');
            dayButton.textContent = `Day ${i}`;
            dayButton.setAttribute('data-day', i);
            dayButton.setAttribute('aria-label', `Day ${i} progress and journal`);

            if (progressData[dayKey] && progressData[dayKey].completed) {
                dayButton.classList.add('completed');
                dayButton.setAttribute('aria-checked', 'true');
            } else {
                dayButton.setAttribute('aria-checked', 'false');
            }

            if (currentSelectedDay === i) {
                dayButton.classList.add('selected');
            }

            dayButton.addEventListener('click', () => handleDayClick(i));
            calendarGrid.appendChild(dayButton);
        }
    }

    function handleDayClick(dayNumber) {
        // Toggle completion status
        const dayKey = `day${dayNumber}`;
        if (!progressData[dayKey]) { // Should be initialized, but as a fallback
            progressData[dayKey] = { completed: false };
        }

        // If clicking the same day, toggle completion
        if (currentSelectedDay === dayNumber) {
             progressData[dayKey].completed = !progressData[dayKey].completed;
        } else {
            // If clicking a new day, just select it, don't toggle completion immediately
            // Completion toggle should be a more explicit action, or we decide if selection implies completion attempt.
            // For this version: selection also marks/unmarks.
            // If you want selection to be separate from marking, this logic would change.
            // For now, clicking a day makes it current AND toggles its completion.
        }
        // Update current selected day
        currentSelectedDay = dayNumber;

        // Update UI for selection
        updateSelectedDayUI(dayNumber);
        loadJournalForDay(dayNumber);

        // Optional: Re-render to show visual indication of 'completed' and 'selected'
        // saveProgress(); // Save immediately or with journal? Let's save with journal.
        // renderCalendar(); // Re-render to update all button states
    }

    function updateSelectedDayUI(dayNumber) {
        // Remove 'selected' from previously selected button
        const prevSelectedBtn = calendarGrid.querySelector('.day-btn.selected');
        if (prevSelectedBtn) {
            prevSelectedBtn.classList.remove('selected');
        }

        // Add 'selected' to the new button
        const newSelectedBtn = calendarGrid.querySelector(`.day-btn[data-day="${dayNumber}"]`);
        if (newSelectedBtn) {
            newSelectedBtn.classList.add('selected');
        }

        selectedDayDisplay.textContent = `Day ${dayNumber}`;
        journalEntryTextarea.disabled = false;
        journalEntryTextarea.placeholder = `Reflect on Day ${dayNumber}... What went well? 😊 What challenged you? 🤔`;
        saveJournalBtn.disabled = false;
        journalEntryTextarea.focus();
    }

    // This function is for explicitly marking a day as complete/incomplete
    // Let's modify handleDayClick to also manage completion
    function toggleDayCompletion(dayNumber) {
        const dayKey = `day${dayNumber}`;
        if (!progressData[dayKey]) {
            progressData[dayKey] = { completed: false };
        }
        progressData[dayKey].completed = !progressData[dayKey].completed;

        saveProgress();
        renderCalendar(); // Re-render to update visual status
        
        // Update the ARIA attribute for the specific button
        const dayButton = calendarGrid.querySelector(`.day-btn[data-day="${dayNumber}"]`);
        if (dayButton) {
            dayButton.setAttribute('aria-checked', progressData[dayKey].completed ? 'true' : 'false');
            if (progressData[dayKey].completed) {
                showSaveStatus(`Day ${dayNumber} marked complete! 🎉`);
            } else {
                showSaveStatus(`Day ${dayNumber} marked incomplete. Keep going! 💪`);
            }
        }
    }

    // Modify handleDayClick to primarily select the day for journaling,
    // and add a separate mechanism or understanding for completion.
    // For simplicity, let's make it so:
    // - First click on a day: Selects it for journaling & toggles completion.
    // - Subsequent clicks on the *same selected* day: Toggles completion.
    // Re-adjusting handleDayClick for clarity:

    function handleDayClick(dayNumber) {
        const dayKey = `day${dayNumber}`;

        if (currentSelectedDay !== dayNumber) {
            // Switched to a new day
            currentSelectedDay = dayNumber;
            updateSelectedDayUI(dayNumber);
            loadJournalForDay(dayNumber);
            // Don't auto-toggle completion on first selection of a *new* day
            // Let the user explicitly mark it.
            // Or, if preferred, uncomment the next line to toggle on first selection:
            // toggleDayCompletion(dayNumber);
        } else {
            // Clicked on the *already selected* day - toggle its completion
            toggleDayCompletion(dayNumber);
        }
        // Ensure the calendar reflects the latest selection state correctly
        renderCalendar();
    }


    function loadJournalForDay(dayNumber) {
        const dayKey = `day${dayNumber}`;
        const journalText = journalData[dayKey] || '';
        journalEntryTextarea.value = journalText;
        
        // Update character count
        updateCharacterCount(journalText.length);
        
        selectedDayDisplay.textContent = `Day ${dayNumber} ${progressData[dayKey]?.completed ? '✅' : ''}`;
    }

    function updateCharacterCount(currentLength) {
        const remainingChars = MAX_JOURNAL_LENGTH - currentLength;
        const charCountElement = document.getElementById('char-count');
        if (charCountElement) {
            charCountElement.textContent = `${remainingChars} characters remaining`;
            charCountElement.style.color = remainingChars < 100 ? '#D32F2F' : 'var(--text-color)';
        }
    }

    // Add event listener for character count
    journalEntryTextarea.addEventListener('input', () => {
        updateCharacterCount(journalEntryTextarea.value.length);
    });

    // Add delete journal entry functionality
    function deleteJournalEntry(dayNumber) {
        if (!confirm(`Are you sure you want to delete the journal entry for Day ${dayNumber}?`)) {
            return;
        }

        const dayKey = `day${dayNumber}`;
        delete journalData[dayKey];
        localStorage.setItem('healingTrackerJournal', JSON.stringify(journalData));
        journalEntryTextarea.value = '';
        updateCharacterCount(0);
        showSaveStatus(`Journal entry for Day ${dayNumber} deleted.`);
    }

    // Add reset progress functionality
    function resetProgress() {
        if (!confirm('Are you sure you want to reset all progress? This will delete all journal entries and completion status.')) {
            return;
        }

        progressData = {};
        journalData = {};
        for (let i = 1; i <= NUM_DAYS; i++) {
            progressData[`day${i}`] = { completed: false };
        }
        
        localStorage.setItem('healingTrackerProgress', JSON.stringify(progressData));
        localStorage.setItem('healingTrackerJournal', JSON.stringify(journalData));
        
        currentSelectedDay = null;
        journalEntryTextarea.value = '';
        journalEntryTextarea.disabled = true;
        saveJournalBtn.disabled = true;
        selectedDayDisplay.textContent = 'None';
        updateCharacterCount(0);
        
        renderCalendar();
        showSaveStatus('All progress has been reset.');
    }

    // Add progress indicator
    function updateProgressIndicator() {
        const completedDays = Object.values(progressData).filter(day => day.completed).length;
        const progressPercentage = (completedDays / NUM_DAYS) * 100;
        
        const progressIndicator = document.getElementById('progress-indicator');
        if (progressIndicator) {
            progressIndicator.style.width = `${progressPercentage}%`;
            progressIndicator.setAttribute('aria-valuenow', progressPercentage);
        }
        
        const progressText = document.getElementById('progress-text');
        if (progressText) {
            progressText.textContent = `${completedDays}/${NUM_DAYS} days completed`;
        }
    }

    // Start the app
    init();
});
