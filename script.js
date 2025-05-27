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

    // --- Initialization ---
    function init() {
        loadProgress();
        loadJournal();
        renderCalendar();
        updateCurrentYear();
        registerServiceWorker();

        // Add event listener for save button
        saveJournalBtn.addEventListener('click', saveJournal);

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
        if (currentSelectedDay === null) {
            showSaveStatus("Please select a day first! 🙏", true);
            return;
        }
        const dayKey = `day${currentSelectedDay}`;
        journalData[dayKey] = journalEntryTextarea.value.trim();
        localStorage.setItem('healingTrackerJournal', JSON.stringify(journalData));
        showSaveStatus(`Journal for Day ${currentSelectedDay} saved! ✨`);
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
            if (currentSelectedDay !== null && currentSelectedDay !== dayNumber) {
                // If a different day was already selected, don't auto-toggle the new one
                // Let's make it so that first click selects, second click on selected day toggles.
                // This part is tricky with the combined select/toggle.
                // Simpler: Click to select. If it's already selected, *then* a click could toggle.
                // Or, a separate checkbox inside the button.
                // For now, we will just mark it as selected and load its journal.
                // The 'completed' class will be toggled separately or on specific user action.
            }
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
        journalEntryTextarea.value = journalData[dayKey] || '';
        selectedDayDisplay.textContent = `Day ${dayNumber} ${progressData[dayKey]?.completed ? '✅' : ''}`;
    }

    // Start the app
    init();
});
