/* =========================================================
   TASKORA — SMART TASK MANAGER
   JavaScript Logic & State Management
========================================================= */

"use strict";


/* =========================================================
   1. STORAGE
========================================================= */

const STORAGE_KEY = "taskoraTasks";
const THEME_KEY = "taskoraTheme";


/* =========================================================
   2. STATE
========================================================= */

let tasks = loadTasks();

let currentFilter = "all";
let currentCategory = "all";
let currentSearch = "";

let editingTaskId = null;


/* =========================================================
   3. DOM HELPERS
========================================================= */

const $ = (selector) => document.querySelector(selector);

const $$ = (selector) => document.querySelectorAll(selector);


/* =========================================================
   4. DOM REFERENCES
========================================================= */

const taskForm = $("#taskForm");
const taskInput = $("#taskInput");
const categorySelect = $("#categorySelect");
const prioritySelect = $("#prioritySelect");
const dueDateInput = $("#dueDateInput");

const taskList = $("#taskList");
const emptyState = $("#emptyState");

const searchInput = $("#searchInput");

const clearCompletedButton = $("#clearCompleted");

const editModal = $("#editModal");
const editForm = $("#editForm");
const editTaskInput = $("#editTaskInput");
const editCategorySelect = $("#editCategorySelect");
const editPrioritySelect = $("#editPrioritySelect");
const editDueDateInput = $("#editDueDateInput");

const themeToggle = $("#themeToggle");
const themeIcon = $("#themeIcon");
const themeText = $("#themeText");

const toastContainer = $("#toastContainer");


/* =========================================================
   5. INITIALIZE
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    setCurrentDate();
    setMinimumDueDate();

    loadTheme();

    setupEventListeners();

    render();

    updateStats();
    updateAnalytics();
    updateAchievements();
    updateSmartInsights();

});


/* =========================================================
   6. EVENT LISTENERS
========================================================= */

function setupEventListeners() {

    /* CREATE */

    if (taskForm) {
        taskForm.addEventListener("submit", createTask);
    }


    /* TASK EVENT DELEGATION */

    if (taskList) {
        taskList.addEventListener("click", handleTaskAction);
    }


    /* MAIN FILTERS */

    $$(".filter-button").forEach(button => {

        button.addEventListener("click", () => {

            currentFilter = button.dataset.filter;

            $$(".filter-button").forEach(btn => {
                btn.classList.remove("active");
            });

            button.classList.add("active");

            render();

        });

    });


    /* CATEGORY FILTERS */

    $$(".category-button").forEach(button => {

        button.addEventListener("click", () => {

            currentCategory = button.dataset.category;

            $$(".category-button").forEach(btn => {
                btn.classList.remove("active");
            });

            button.classList.add("active");

            render();

        });

    });


    /* SEARCH */

    if (searchInput) {

        searchInput.addEventListener("input", event => {

            currentSearch =
                event.target.value
                    .trim()
                    .toLowerCase();

            render();

        });

    }


    /* CLEAR COMPLETED */

    if (clearCompletedButton) {

        clearCompletedButton.addEventListener(
            "click",
            clearCompletedTasks
        );

    }


    /* EDIT FORM */

    if (editForm) {
        editForm.addEventListener("submit", saveEditedTask);
    }


    /* MODAL CLOSE */

    $$("[data-close-modal]").forEach(button => {

        button.addEventListener("click", closeEditModal);

    });


    if (editModal) {

        editModal.addEventListener("click", event => {

            if (event.target === editModal) {
                closeEditModal();
            }

        });

    }


    /* THEME */

    if (themeToggle) {
        themeToggle.addEventListener(
            "click",
            toggleTheme
        );
    }


    /* KEYBOARD SHORTCUTS */

    document.addEventListener(
        "keydown",
        handleKeyboardShortcuts
    );

}


/* =========================================================
   7. CREATE TASK
========================================================= */

function createTask(event) {

    event.preventDefault();

    const title =
        taskInput.value.trim();

    if (!title) {

        showToast(
            "Please enter a task.",
            "warning"
        );

        taskInput.focus();

        return;
    }


    const newTask = {

        id:
            Date.now().toString(),

        title,

        category:
            categorySelect.value || "personal",

        priority:
            prioritySelect.value || "medium",

        completed:
            false,

        dueDate:
            dueDateInput.value || "",

        createdAt:
            new Date().toISOString()

    };


    tasks.unshift(newTask);

    saveTasks();

    taskForm.reset();

    categorySelect.value = "personal";
    prioritySelect.value = "medium";

    render();

    updateStats();
    updateAnalytics();
    updateAchievements();
    updateSmartInsights();

    showToast(
        "Task added successfully.",
        "success"
    );

    taskInput.focus();

}


/* =========================================================
   8. READ / RENDER
========================================================= */

function render() {

    if (!taskList) {
        return;
    }


    const filteredTasks =
        getFilteredTasks();


    const sortedTasks =
        sortTasks(filteredTasks);


    taskList.innerHTML = "";


    if (sortedTasks.length === 0) {

        if (emptyState) {
            emptyState.style.display = "block";
        }

        return;

    }


    if (emptyState) {
        emptyState.style.display = "none";
    }


    sortedTasks.forEach(task => {

        const taskElement =
            createTaskElement(task);

        taskList.appendChild(taskElement);

    });

}


/* =========================================================
   9. FILTER TASKS
========================================================= */

function getFilteredTasks() {

    return tasks.filter(task => {

        /* STATUS FILTER */

        let matchesFilter = true;


        if (currentFilter === "active") {

            matchesFilter =
                !task.completed;

        }


        if (currentFilter === "completed") {

            matchesFilter =
                task.completed;

        }


        if (currentFilter === "today") {

            matchesFilter =
                isDueToday(task);

        }


        /* CATEGORY */

        const matchesCategory =
            currentCategory === "all" ||
            task.category === currentCategory;


        /* SEARCH */

        const matchesSearch =
            !currentSearch ||
            task.title
                .toLowerCase()
                .includes(currentSearch);


        return (
            matchesFilter &&
            matchesCategory &&
            matchesSearch
        );

    });

}


/* =========================================================
   10. SMART SORTING
========================================================= */

function sortTasks(taskArray) {

    return [...taskArray].sort((a, b) => {

        /* Active tasks first */

        if (a.completed !== b.completed) {

            return a.completed ? 1 : -1;

        }


        /* Priority */

        const priorityValue = {

            high: 3,
            medium: 2,
            low: 1

        };


        const priorityDifference =
            priorityValue[b.priority] -
            priorityValue[a.priority];


        if (priorityDifference !== 0) {

            return priorityDifference;

        }


        /* Due dates */

        if (a.dueDate && b.dueDate) {

            return (
                new Date(a.dueDate) -
                new Date(b.dueDate)
            );

        }


        if (a.dueDate) {
            return -1;
        }


        if (b.dueDate) {
            return 1;
        }


        /* Newest first */

        return (
            new Date(b.createdAt) -
            new Date(a.createdAt)
        );

    });

}


/* =========================================================
   11. CREATE TASK ELEMENT
========================================================= */

function createTaskElement(task) {

    const article =
        document.createElement("article");

    article.className =
        "task-card" +
        (task.completed ? " completed" : "");


    article.dataset.taskId =
        task.id;


    const categoryName =
        capitalize(task.category);


    const priorityName =
        capitalize(task.priority);


    const dueStatus =
        getDueStatus(task);


    const dueClass =
        dueStatus.className
            ? `due-date ${dueStatus.className}`
            : "due-date";


    article.innerHTML = `

        <button
            type="button"
            class="task-checkbox"
            data-action="toggle"
            data-id="${escapeHTML(task.id)}"
            aria-label="${task.completed
                ? "Mark task as active"
                : "Mark task as completed"}">

            ${task.completed ? "✓" : ""}

        </button>


        <div class="task-main">

            <div class="task-title">
                ${escapeHTML(task.title)}
            </div>


            <div class="task-meta">

                <span class="task-badge category-badge">
                    ${escapeHTML(categoryName)}
                </span>


                <span class="task-badge priority-${escapeHTML(task.priority)}">
                    ${escapeHTML(priorityName)}
                </span>


                ${
                    task.dueDate
                        ? `
                            <span class="${dueClass}">
                                ${escapeHTML(dueStatus.text)}
                            </span>
                          `
                        : ""
                }

            </div>

        </div>


        <div class="task-actions">

            <button
                type="button"
                class="task-action"
                data-action="edit"
                data-id="${escapeHTML(task.id)}"
                aria-label="Edit task">

                ✎

            </button>


            <button
                type="button"
                class="task-action delete"
                data-action="delete"
                data-id="${escapeHTML(task.id)}"
                aria-label="Delete task">

                ×

            </button>

        </div>

    `;


    return article;

}


/* =========================================================
   12. EVENT DELEGATION
========================================================= */

function handleTaskAction(event) {

    const actionButton =
        event.target.closest("[data-action]");


    if (!actionButton) {
        return;
    }


    const action =
        actionButton.dataset.action;


    const id =
        actionButton.dataset.id;


    if (!id) {
        return;
    }


    if (action === "toggle") {

        toggleTask(id);

    }


    if (action === "edit") {

        openEditModal(id);

    }


    if (action === "delete") {

        deleteTask(id);

    }

}


/* =========================================================
   13. TOGGLE TASK
========================================================= */

function toggleTask(id) {

    const task =
        tasks.find(item => item.id === id);


    if (!task) {
        return;
    }


    task.completed =
        !task.completed;


    saveTasks();

    render();

    updateStats();
    updateAnalytics();
    updateAchievements();
    updateSmartInsights();


    showToast(
        task.completed
            ? "Task completed! 🎉"
            : "Task moved back to active.",
        task.completed
            ? "success"
            : "info"
    );

}


/* =========================================================
   14. DELETE TASK
========================================================= */

function deleteTask(id) {

    const task =
        tasks.find(item => item.id === id);


    if (!task) {
        return;
    }


    tasks =
        tasks.filter(item => item.id !== id);


    saveTasks();

    render();

    updateStats();
    updateAnalytics();
    updateAchievements();
    updateSmartInsights();


    showToast(
        "Task deleted.",
        "info"
    );

}


/* =========================================================
   15. EDIT TASK
========================================================= */

function openEditModal(id) {

    const task =
        tasks.find(item => item.id === id);


    if (!task || !editModal) {
        return;
    }


    editingTaskId = id;


    editTaskInput.value =
        task.title;

    editCategorySelect.value =
        task.category;

    editPrioritySelect.value =
        task.priority;

    editDueDateInput.value =
        task.dueDate || "";


    editModal.classList.add("active");

    editModal.setAttribute(
        "aria-hidden",
        "false"
    );


    setTimeout(() => {

        editTaskInput.focus();

    }, 50);

}


function closeEditModal() {

    if (!editModal) {
        return;
    }


    editModal.classList.remove("active");

    editModal.setAttribute(
        "aria-hidden",
        "true"
    );


    editingTaskId = null;

}


function saveEditedTask(event) {

    event.preventDefault();


    if (!editingTaskId) {
        return;
    }


    const task =
        tasks.find(
            item => item.id === editingTaskId
        );


    if (!task) {
        return;
    }


    const newTitle =
        editTaskInput.value.trim();


    if (!newTitle) {

        showToast(
            "Task title cannot be empty.",
            "warning"
        );

        return;
    }


    task.title =
        newTitle;

    task.category =
        editCategorySelect.value;

    task.priority =
        editPrioritySelect.value;

    task.dueDate =
        editDueDateInput.value || "";


    saveTasks();

    closeEditModal();

    render();

    updateStats();
    updateAnalytics();
    updateAchievements();
    updateSmartInsights();


    showToast(
        "Task updated successfully.",
        "success"
    );

}


/* =========================================================
   16. CLEAR COMPLETED
========================================================= */

function clearCompletedTasks() {

    const completedCount =
        tasks.filter(task => task.completed).length;


    if (completedCount === 0) {

        showToast(
            "There are no completed tasks.",
            "info"
        );

        return;
    }


    tasks =
        tasks.filter(task => !task.completed);


    saveTasks();

    render();

    updateStats();
    updateAnalytics();
    updateAchievements();
    updateSmartInsights();


    showToast(
        `${completedCount} completed task${completedCount === 1 ? "" : "s"} cleared.`,
        "success"
    );

}


/* =========================================================
   17. STATISTICS
========================================================= */

function updateStats() {

    const total =
        tasks.length;


    const completed =
        tasks.filter(
            task => task.completed
        ).length;


    const active =
        total - completed;


    const percentage =
        total === 0
            ? 0
            : Math.round(
                (completed / total) * 100
            );


    setText(
        "#totalTasks",
        total
    );

    setText(
        "#activeTasks",
        active
    );

    setText(
        "#completedTasks",
        completed
    );

    setText(
        "#progressPercentage",
        `${percentage}%`
    );


    const progressBar =
        $("#progressBar");


    if (progressBar) {

        progressBar.style.width =
            `${percentage}%`;

    }


    const progressMessage =
        $("#progressMessage");


    if (progressMessage) {

        if (total === 0) {

            progressMessage.textContent =
                "Start completing tasks to build your momentum.";

        } else if (percentage === 100) {

            progressMessage.textContent =
                "Perfect! You've completed everything. 🎉";

        } else if (percentage >= 75) {

            progressMessage.textContent =
                "Amazing momentum. You're almost there!";

        } else if (percentage >= 50) {

            progressMessage.textContent =
                "Great progress. Keep pushing forward!";

        } else if (percentage > 0) {

            progressMessage.textContent =
                "Nice start. Keep building your momentum!";

        } else {

            progressMessage.textContent =
                "Your task list is ready. Let's get moving.";

        }

    }


    /* FILTER COUNTS */

    setText(
        "#allCount",
        total
    );

    setText(
        "#todayCount",
        tasks.filter(isDueToday).length
    );

    setText(
        "#activeCount",
        active
    );

    setText(
        "#completedCount",
        completed
    );

}


/* =========================================================
   18. ANALYTICS
========================================================= */

function updateAnalytics() {

    const total =
        tasks.length;


    const completed =
        tasks.filter(
            task => task.completed
        ).length;


    const completionRate =
        total === 0
            ? 0
            : Math.round(
                (completed / total) * 100
            );


    const overdue =
        tasks.filter(
            task =>
                !task.completed &&
                isOverdue(task)
        ).length;


    const today =
        tasks.filter(
            task =>
                !task.completed &&
                isDueToday(task)
        ).length;


    const highPriority =
        tasks.filter(
            task =>
                !task.completed &&
                task.priority === "high"
        ).length;


    setText(
        "#analyticsCompletionRate",
        `${completionRate}%`
    );

    setText(
        "#analyticsOverdue",
        overdue
    );

    setText(
        "#analyticsToday",
        today
    );

    setText(
        "#analyticsHighPriority",
        highPriority
    );


    /* COMPLETION BAR */

    setWidth(
        "#completionAnalyticsBar",
        completionRate
    );


    setText(
        "#completionAnalyticsText",
        total === 0
            ? "No completed tasks yet."
            : `${completed} of ${total} tasks completed.`
    );


    /* OVERDUE */

    setText(
        "#overdueAnalyticsText",
        overdue === 0
            ? "You're all caught up."
            : `${overdue} task${overdue === 1 ? "" : "s"} need attention.`
    );


    /* TODAY */

    setText(
        "#todayAnalyticsText",
        today === 0
            ? "Nothing due today."
            : `${today} task${today === 1 ? "" : "s"} due today.`
    );


    /* HIGH PRIORITY */

    setText(
        "#priorityAnalyticsText",
        highPriority === 0
            ? "No high-priority active tasks."
            : `${highPriority} high-priority task${highPriority === 1 ? "" : "s"} active.`
    );


    /* PRODUCTIVITY SCORE */

    const score =
        calculateProductivityScore();


    setText(
        "#productivityScore",
        score
    );


    /* PRIORITY DISTRIBUTION */

    const high =
        tasks.filter(
            task => task.priority === "high"
        ).length;


    const medium =
        tasks.filter(
            task => task.priority === "medium"
        ).length;


    const low =
        tasks.filter(
            task => task.priority === "low"
        ).length;


    setText(
        "#highPriorityCount",
        high
    );

    setText(
        "#mediumPriorityCount",
        medium
    );

    setText(
        "#lowPriorityCount",
        low
    );


    setWidth(
        "#highPriorityBar",
        total ? (high / total) * 100 : 0
    );

    setWidth(
        "#mediumPriorityBar",
        total ? (medium / total) * 100 : 0
    );

    setWidth(
        "#lowPriorityBar",
        total ? (low / total) * 100 : 0
    );


    /* CATEGORY DISTRIBUTION */

    const categories = [
        "personal",
        "work",
        "study",
        "health",
        "shopping",
        "other"
    ];


    categories.forEach(category => {

        const count =
            tasks.filter(
                task =>
                    task.category === category
            ).length;


        const percentage =
            total === 0
                ? 0
                : (count / total) * 100;


        setText(
            `#${category}CategoryCount`,
            count
        );


        setWidth(
            `#${category}CategoryBar`,
            percentage
        );

    });


    updateAnalyticsInsight(
        completionRate,
        overdue,
        today,
        highPriority
    );

}


/* =========================================================
   19. PRODUCTIVITY SCORE
========================================================= */

function calculateProductivityScore() {

    if (tasks.length === 0) {
        return 0;
    }


    const completed =
        tasks.filter(
            task => task.completed
        ).length;


    const completionScore =
        (completed / tasks.length) * 60;


    const overdue =
        tasks.filter(
            task =>
                !task.completed &&
                isOverdue(task)
        ).length;


    const overduePenalty =
        Math.min(overdue * 5, 25);


    const todayCompleted =
        tasks.filter(
            task =>
                task.completed &&
                isDueToday(task)
        ).length;


    const todayBonus =
        Math.min(todayCompleted * 5, 15);


    return Math.max(
        0,
        Math.min(
            100,
            Math.round(
                completionScore -
                overduePenalty +
                todayBonus
            )
        )
    );

}


/* =========================================================
   20. ANALYTICS INSIGHT
========================================================= */

function updateAnalyticsInsight(
    completionRate,
    overdue,
    today,
    highPriority
) {

    const title =
        $("#analyticsInsightTitle");

    const text =
        $("#analyticsInsightText");


    if (!title || !text) {
        return;
    }


    if (overdue > 0) {

        title.textContent =
            "Your overdue tasks need attention.";

        text.textContent =
            `You have ${overdue} overdue task${overdue === 1 ? "" : "s"}. Clear these before taking on too many new tasks.`;

        return;
    }


    if (highPriority > 0) {

        title.textContent =
            "Focus on your high-priority work.";

        text.textContent =
            `${highPriority} high-priority task${highPriority === 1 ? " is" : "s are"} currently active. Tackling these first can create quick momentum.`;

        return;
    }


    if (today > 0) {

        title.textContent =
            "You've got tasks due today.";

        text.textContent =
            `${today} task${today === 1 ? " is" : "s are"} due today. Finish them to keep your day on track.`;

        return;
    }


    if (completionRate >= 80) {

        title.textContent =
            "You're absolutely crushing it!";

        text.textContent =
            `Your completion rate is ${completionRate}%. Keep that momentum going.`;

        return;
    }


    if (completionRate >= 50) {

        title.textContent =
            "You're halfway there.";

        text.textContent =
            `You've completed ${completionRate}% of your tasks. Keep going and push toward the next milestone.`;

        return;
    }


    if (tasks.length > 0) {

        title.textContent =
            "Build your momentum.";

        text.textContent =
            "Start with one important task and build from there.";

        return;
    }


    title.textContent =
        "You're ready to get started.";

    text.textContent =
        "Add a few tasks and Taskora will generate useful productivity insights for you.";

}


/* =========================================================
   21. ACHIEVEMENTS
========================================================= */

function updateAchievements() {

    const achievementGrid =
        $("#achievementGrid");


    if (!achievementGrid) {
        return;
    }


    const completed =
        tasks.filter(
            task => task.completed
        );


    const achievements = [

        {
            icon: "🌱",
            title: "First Step",
            description: "Create your first task.",
            unlocked: tasks.length >= 1
        },

        {
            icon: "🔥",
            title: "Task Finisher",
            description: "Complete 5 tasks.",
            unlocked: completed.length >= 5
        },

        {
            icon: "⚡",
            title: "Productive",
            description: "Complete 10 tasks.",
            unlocked: completed.length >= 10
        },

        {
            icon: "🌟",
            title: "Perfect Day",
            description: "Complete every task due today.",
            unlocked: perfectDay()
        },

        {
            icon: "🏆",
            title: "High Achiever",
            description: "Complete 5 high-priority tasks.",
            unlocked:
                completed.filter(
                    task => task.priority === "high"
                ).length >= 5
        },

        {
            icon: "📚",
            title: "Study Mode",
            description: "Complete 5 study tasks.",
            unlocked:
                completed.filter(
                    task => task.category === "study"
                ).length >= 5
        },

        {
            icon: "💼",
            title: "Work Mode",
            description: "Complete 5 work tasks.",
            unlocked:
                completed.filter(
                    task => task.category === "work"
                ).length >= 5
        },

        {
            icon: "👑",
            title: "Task Master",
            description: "Complete 25 tasks.",
            unlocked: completed.length >= 25
        }

    ];


    achievementGrid.innerHTML = "";


    let unlockedCount = 0;


    achievements.forEach(achievement => {

        if (achievement.unlocked) {
            unlockedCount++;
        }


        const card =
            document.createElement("article");


        card.className =
            "achievement-card" +
            (
                achievement.unlocked
                    ? " unlocked"
                    : ""
            );


        card.innerHTML = `

            <div class="achievement-icon">
                ${achievement.icon}
            </div>

            <h3>
                ${escapeHTML(achievement.title)}
            </h3>

            <p>
                ${escapeHTML(achievement.description)}
            </p>

        `;


        achievementGrid.appendChild(card);

    });


    const totalAchievements =
        achievements.length;


    const percentage =
        (unlockedCount / totalAchievements) * 100;


    setWidth(
        "#achievementProgress .achievement-progress-fill",
        percentage
    );


    const progressText =
        document.querySelector(
            ".achievement-progress-text strong"
        );


    if (progressText) {

        progressText.textContent =
            unlockedCount;

    }

}


/* =========================================================
   22. PERFECT DAY
========================================================= */

function perfectDay() {

    const todayTasks =
        tasks.filter(
            task => isDueToday(task)
        );


    if (todayTasks.length === 0) {
        return false;
    }


    return todayTasks.every(
        task => task.completed
    );

}


/* =========================================================
   23. SMART INSIGHTS
========================================================= */

function updateSmartInsights() {

    const container =
        $("#smartInsightsList");


    if (!container) {
        return;
    }


    const insights = [];


    const overdue =
        tasks.filter(
            task =>
                !task.completed &&
                isOverdue(task)
        ).length;


    const today =
        tasks.filter(
            task =>
                !task.completed &&
                isDueToday(task)
        ).length;


    const highPriority =
        tasks.filter(
            task =>
                !task.completed &&
                task.priority === "high"
        ).length;


    const completed =
        tasks.filter(
            task => task.completed
        ).length;


    if (overdue > 0) {

        insights.push({

            icon: "⚠",
            title: "Overdue alert",
            text:
                `You have ${overdue} overdue task${overdue === 1 ? "" : "s"}. Consider handling these first.`

        });

    }


    if (highPriority > 0) {

        insights.push({

            icon: "⚡",
            title: "Priority focus",
            text:
                `${highPriority} high-priority task${highPriority === 1 ? " is" : "s are"} waiting for you.`

        });

    }


    if (today > 0) {

        insights.push({

            icon: "◷",
            title: "Today's agenda",
            text:
                `${today} active task${today === 1 ? " is" : "s are"} due today.`

        });

    }


    if (completed > 0) {

        insights.push({

            icon: "✓",
            title: "Great progress",
            text:
                `You've already completed ${completed} task${completed === 1 ? "" : "s"}. Keep going!`

        });

    }


    if (insights.length === 0) {

        insights.push({

            icon: "✦",
            title: "Ready when you are",
            text:
                "Add your first task and Taskora will start generating personalized productivity insights."

        });

    }


    container.innerHTML = "";


    insights.slice(0, 4).forEach(insight => {

        const element =
            document.createElement("article");


        element.className =
            "smart-insight";


        element.innerHTML = `

            <div class="smart-insight-icon">
                ${insight.icon}
            </div>

            <div>

                <h3>
                    ${escapeHTML(insight.title)}
                </h3>

                <p>
                    ${escapeHTML(insight.text)}
                </p>

            </div>

        `;


        container.appendChild(element);

    });

}


/* =========================================================
   24. DUE DATE HELPERS
========================================================= */

function getTodayString() {

    const today =
        new Date();


    const year =
        today.getFullYear();


    const month =
        String(
            today.getMonth() + 1
        ).padStart(2, "0");


    const day =
        String(
            today.getDate()
        ).padStart(2, "0");


    return `${year}-${month}-${day}`;

}


function isDueToday(task) {

    if (!task.dueDate) {
        return false;
    }


    return task.dueDate === getTodayString();

}


function isOverdue(task) {

    if (!task.dueDate || task.completed) {
        return false;
    }


    return task.dueDate < getTodayString();

}


function getDueStatus(task) {

    if (!task.dueDate) {

        return {
            text: "",
            className: ""
        };

    }


    if (task.completed) {

        return {
            text: formatDate(task.dueDate),
            className: ""
        };

    }


    if (isOverdue(task)) {

        return {
            text: `Overdue · ${formatDate(task.dueDate)}`,
            className: "overdue"
        };

    }


    if (isDueToday(task)) {

        return {
            text: "Due today",
            className: "today"
        };

    }


    return {

        text:
            `Due ${formatDate(task.dueDate)}`,

        className: ""

    };

}


function formatDate(dateString) {

    if (!dateString) {
        return "";
    }


    const date =
        new Date(
            `${dateString}T00:00:00`
        );


    return date.toLocaleDateString(
        undefined,
        {
            day: "numeric",
            month: "short"
        }
    );

}


/* =========================================================
   25. DATE
========================================================= */

function setCurrentDate() {

    const currentDate =
        $("#currentDate");


    if (!currentDate) {
        return;
    }


    currentDate.textContent =
        new Date().toLocaleDateString(
            undefined,
            {
                weekday: "short",
                day: "numeric",
                month: "short",
                year: "numeric"
            }
        );

}


function setMinimumDueDate() {

    if (dueDateInput) {

        dueDateInput.min =
            getTodayString();

    }


    if (editDueDateInput) {

        editDueDateInput.min =
            getTodayString();

    }

}


/* =========================================================
   26. LOCAL STORAGE
========================================================= */

function loadTasks() {

    try {

        const stored =
            localStorage.getItem(
                STORAGE_KEY
            );


        if (!stored) {
            return [];
        }


        const parsed =
            JSON.parse(stored);


        if (!Array.isArray(parsed)) {
            return [];
        }


        return parsed.map(normalizeTask);

    } catch (error) {

        console.error(
            "Could not load tasks:",
            error
        );


        return [];

    }

}


function saveTasks() {

    try {

        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(tasks)
        );

    } catch (error) {

        console.error(
            "Could not save tasks:",
            error
        );


        showToast(
            "Could not save your tasks.",
            "warning"
        );

    }

}


function normalizeTask(task) {

    return {

        id:
            String(
                task.id ||
                Date.now()
            ),

        title:
            String(
                task.title ||
                ""
            ),

        category:
            [
                "personal",
                "work",
                "study",
                "health",
                "shopping",
                "other"
            ].includes(task.category)
                ? task.category
                : "personal",

        priority:
            [
                "low",
                "medium",
                "high"
            ].includes(task.priority)
                ? task.priority
                : "medium",

        completed:
            Boolean(task.completed),

        dueDate:
            typeof task.dueDate === "string"
                ? task.dueDate
                : "",

        createdAt:
            task.createdAt ||
            new Date().toISOString()

    };

}


/* =========================================================
   27. THEME
========================================================= */

function loadTheme() {

    const savedTheme =
        localStorage.getItem(
            THEME_KEY
        );


    if (savedTheme === "light") {

        document.body.classList.add(
            "light-theme"
        );

    }


    updateThemeButton();

}


function toggleTheme() {

    document.body.classList.toggle(
        "light-theme"
    );


    const isLight =
        document.body.classList.contains(
            "light-theme"
        );


    localStorage.setItem(
        THEME_KEY,
        isLight
            ? "light"
            : "dark"
    );


    updateThemeButton();


    showToast(
        isLight
            ? "Light theme enabled."
            : "Dark theme enabled.",
        "info"
    );

}


function updateThemeButton() {

    const isLight =
        document.body.classList.contains(
            "light-theme"
        );


    if (themeIcon) {

        themeIcon.textContent =
            isLight ? "☀" : "☾";

    }


    if (themeText) {

        themeText.textContent =
            isLight ? "Light" : "Dark";

    }


    if (themeToggle) {

        themeToggle.setAttribute(
            "aria-label",
            isLight
                ? "Switch to dark theme"
                : "Switch to light theme"
        );

    }

}


/* =========================================================
   28. TOAST
========================================================= */

function showToast(message, type = "info") {

    if (!toastContainer) {
        return;
    }


    const toast =
        document.createElement("div");


    toast.className =
        `toast toast-${type}`;


    const icon =
        type === "success"
            ? "✓"
            : type === "warning"
                ? "!"
                : "i";


    toast.innerHTML = `

        <strong>
            ${icon}
        </strong>

        <span>
            ${escapeHTML(message)}
        </span>

    `;


    toastContainer.appendChild(toast);


    setTimeout(() => {

        toast.remove();

    }, 3600);

}


/* =========================================================
   29. KEYBOARD SHORTCUTS
========================================================= */

function handleKeyboardShortcuts(event) {

    /* Escape closes modal */

    if (event.key === "Escape") {

        if (
            editModal &&
            editModal.classList.contains("active")
        ) {

            closeEditModal();

        }

    }


    /* "/" focuses search */

    if (
        event.key === "/" &&
        document.activeElement.tagName !== "INPUT" &&
        document.activeElement.tagName !== "TEXTAREA" &&
        document.activeElement.tagName !== "SELECT"
    ) {

        event.preventDefault();

        if (searchInput) {
            searchInput.focus();
        }

    }


    /* "n" focuses new task */

    if (
        event.key.toLowerCase() === "n" &&
        document.activeElement.tagName !== "INPUT" &&
        document.activeElement.tagName !== "TEXTAREA" &&
        document.activeElement.tagName !== "SELECT"
    ) {

        event.preventDefault();

        if (taskInput) {
            taskInput.focus();
        }

    }

}


/* =========================================================
   30. SAFE DOM HELPERS
========================================================= */

function setText(selector, value) {

    const element =
        $(selector);


    if (element) {

        element.textContent =
            value;

    }

}


function setWidth(selector, value) {

    const element =
        $(selector);


    if (!element) {
        return;
    }


    const safeValue =
        Math.max(
            0,
            Math.min(
                100,
                Number(value) || 0
            )
        );


    element.style.width =
        `${safeValue}%`;

}


function capitalize(value) {

    if (!value) {
        return "";
    }


    return (
        value.charAt(0).toUpperCase() +
        value.slice(1)
    );

}


function escapeHTML(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


/* =========================================================
   TASKORA READY
========================================================= */

console.log(
    "Taskora Smart Task Manager loaded successfully."
);