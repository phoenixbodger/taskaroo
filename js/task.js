// Taskaroo - task & subtask CRUD, subtask drafting in the modal, drag & drop.
        // Subtask Draft Management in Modal
        function renderDraftSubtasks() {
            const container = document.getElementById('draftSubtasksList');
            if (draftSubtasks.length === 0) {
                container.innerHTML = '<p class="text-xs text-slate-400 italic">No subtasks added yet.</p>';
                return;
            }
            container.innerHTML = draftSubtasks.map((st, idx) => `
                <div class="flex items-center justify-between bg-slate-50 dark:bg-dark-900 border border-slate-200 dark:border-dark-700 rounded-lg px-3 py-1.5 text-sm">
                    <label class="flex items-center space-x-2 flex-1 cursor-pointer">
                        <input type="checkbox" ${st.done ? 'checked' : ''} onchange="draftSubtasks[${idx}].done = this.checked; renderDraftSubtasks();" class="rounded text-indigo-600 focus:ring-indigo-500">
                        <span class="${st.done ? 'line-through text-slate-400' : ''}">${escapeHtml(st.title)}</span>
                    </label>
                    <button type="button" onclick="draftSubtasks.splice(${idx}, 1); renderDraftSubtasks();" class="text-slate-400 hover:text-red-500 ml-2"><i class="fa-solid fa-xmark text-xs"></i></button>
                </div>
            `).join('');
        }

        function addDraftSubtask() {
            const input = document.getElementById('newSubtaskInput');
            const title = input.value.trim();
            if (!title) return;
            draftSubtasks.push({ id: 's_' + Date.now() + Math.random().toString(36).slice(2, 6), title, done: false });
            input.value = '';
            renderDraftSubtasks();
        }

        // Recurring Tasks
        // Formats a Date as the value expected by <input type="datetime-local">.
        function formatDateTimeLocal(d) {
            const pad = n => String(n).padStart(2, '0');
            return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
        }

        // Advances a Date by the given amount of the given unit in place.
        function addInterval(d, interval, amount) {
            if (interval === 'week') d.setDate(d.getDate() + 7 * amount);
            else if (interval === 'month') d.setMonth(d.getMonth() + amount);
            else if (interval === 'hour') d.setHours(d.getHours() + amount);
            else if (interval === 'minute') d.setMinutes(d.getMinutes() + amount);
            else d.setDate(d.getDate() + amount); // day
            return d;
        }

        // Returns the next occurrence's datetime-local value for a recurring task.
        // amount = repeat every N units; interval is 'minute'|'hour'|'day'|'week'|'month'.
        // Falls back to "now" when the task has no due date.
        // Day/week/month repeats stay aligned to the original date/time and roll
        // forward to the future if the task fell behind while overdue.
        // Minute/hour repeats skip missed occurrences and start from "now" instead.
        function nextRecurringDueDate(dueDate, interval, amount) {
            amount = Math.max(1, Number(amount) || 1);
            const now = new Date();
            const parsed = dueDate ? new Date(dueDate) : null;
            const next = (parsed && !isNaN(parsed.getTime())) ? parsed : new Date(now.getTime());

            if (interval === 'hour' || interval === 'minute') {
                if (next < now) next.setTime(now.getTime()); // skip missed occurrences
                return formatDateTimeLocal(addInterval(next, interval, amount));
            }

            let count = 0;
            do {
                addInterval(next, interval, amount);
            } while (next <= now && ++count < 730);
            return formatDateTimeLocal(next);
        }

        // Completing a recurring task advances it to the next due date and sends it
        // back to "To Do", or finishes it for good once it has repeated the requested
        // number of additional times (after the first occurrence).
        function completeRecurringIfDone(task) {
            if (task.recurring && task.status === 'Done') {
                task.timesCompleted = (task.timesCompleted || 0) + 1;
                const repeatTimes = Number(task.repeatTimes) || 0;
                if (repeatTimes > 0 && task.timesCompleted > repeatTimes) {
                    task.recurring = false; // initial occurrence + N additional completions done
                    return;
                }
                task.status = 'To Do';
                task.dueDate = nextRecurringDueDate(task.dueDate, task.recurInterval, task.recurAmount);
            }
        }

        // Toggle Subtask Directly on Card / List
        function toggleSubtask(taskId, subtaskId, event) {
            if (event) event.stopPropagation();
            const task = state.tasks.find(t => t.id === taskId);
            if (!task) return;
            const st = task.subtasks.find(s => s.id === subtaskId);
            if (st) {
                st.done = !st.done;
                saveState();
                render();
            }
        }

        // Toggle Task Completion Directly on Card / List (tick box)
        function toggleTaskDone(taskId) {
            const task = state.tasks.find(t => t.id === taskId);
            if (!task) return;
            if (task.status === 'Done') {
                task.status = 'To Do';
            } else {
                task.status = 'Done';
                completeRecurringIfDone(task); // recurring task bounces back to To Do with next due date
            }
            saveState();
            render();
        }

        // Task Management
        function openTaskModal(taskId = null, prefillCategoryId = null) {
            const select = document.getElementById('taskCategorySelect');
            let optionsHtml = '<option value="">General / None</option>';
            const walk = (parentId, depth) => {
                const children = parentId === null ? getTopLevelCategories() : getChildCategories(parentId);
                children.forEach(c => {
                    optionsHtml += `<option value="${c.id}">${'&nbsp;'.repeat((depth + 1) * 2)}${escapeHtml(c.name)}</option>`;
                    walk(c.id, depth + 1);
                });
            };
            walk(null, 0);
            select.innerHTML = optionsHtml;
            document.getElementById('newSubtaskInput').value = '';

            if (taskId) {
                const task = state.tasks.find(t => t.id === taskId);
                if (!task) return;
                document.getElementById('taskModalTitle').innerHTML = '<i class="fa-solid fa-pen-to-square text-emerald-600 mr-2"></i> Edit Task';
                document.getElementById('taskIdInput').value = task.id;
                document.getElementById('taskTitleInput').value = task.title;
                document.getElementById('taskCategorySelect').value = task.categoryId || '';
                document.getElementById('taskPriorityInput').value = task.priority;
                document.getElementById('taskStatusInput').value = task.status;
                document.getElementById('taskDueInput').value = task.dueDate || '';
                document.getElementById('taskRecurringInput').checked = !!task.recurring;
                document.getElementById('taskRecurAmount').value = task.recurAmount || 1;
                document.getElementById('taskRecurIntervalInput').value = task.recurInterval || 'day';
                document.getElementById('taskRepeatTimesInput').value = task.repeatTimes ? task.repeatTimes : '';
                document.getElementById('taskRecurOptions').classList.toggle('hidden', !task.recurring);
                draftSubtasks = task.subtasks.map(s => ({ ...s }));
            } else {
                document.getElementById('taskModalTitle').innerHTML = '<i class="fa-solid fa-circle-plus text-emerald-600 mr-2"></i> Add New Task';
                document.getElementById('taskIdInput').value = '';
                document.getElementById('taskTitleInput').value = '';
                document.getElementById('taskCategorySelect').value = prefillCategoryId || (state.activeCategoryIds && state.activeCategoryIds[0]) || '';
                document.getElementById('taskPriorityInput').value = 'Medium';
                document.getElementById('taskStatusInput').value = 'To Do';
                document.getElementById('taskDueInput').value = '';
                document.getElementById('taskRecurringInput').checked = false;
                document.getElementById('taskRecurAmount').value = 1;
                document.getElementById('taskRecurIntervalInput').value = 'day';
                document.getElementById('taskRepeatTimesInput').value = '';
                document.getElementById('taskRecurOptions').classList.add('hidden');
                draftSubtasks = [];
            }
            syncDueDisplay();
            renderDraftSubtasks();
            document.getElementById('taskModal').classList.remove('hidden');
        }

        function closeTaskModal() {
            document.getElementById('taskModal').classList.add('hidden');
        }

        function handleTaskSubmit(e) {
            e.preventDefault();
            const id = document.getElementById('taskIdInput').value;
            const title = document.getElementById('taskTitleInput').value.trim();
            const categoryId = document.getElementById('taskCategorySelect').value;
            const priority = document.getElementById('taskPriorityInput').value;
            const status = document.getElementById('taskStatusInput').value;
            const dueDate = document.getElementById('taskDueInput').value;
            const recurring = document.getElementById('taskRecurringInput').checked;
            const recurAmount = Math.max(1, parseInt(document.getElementById('taskRecurAmount').value, 10) || 1);
            const recurInterval = document.getElementById('taskRecurIntervalInput').value;
            const repeatTimesRaw = document.getElementById('taskRepeatTimesInput').value.trim();
            const repeatTimes = repeatTimesRaw === '' ? '' : Math.max(1, parseInt(repeatTimesRaw, 10) || 1);

            if (!title) return;

            if (id) {
                const task = state.tasks.find(t => t.id === id);
                if (task) {
                    task.title = title;
                    task.categoryId = categoryId;
                    task.priority = priority;
                    task.status = status;
                    task.dueDate = dueDate;
                    task.recurring = recurring;
                    task.recurAmount = recurAmount;
                    task.recurInterval = recurInterval;
                    task.repeatTimes = repeatTimes;
                    task.subtasks = draftSubtasks;
                    completeRecurringIfDone(task);
                }
            } else {
                const task = {
                    id: 't_' + Date.now(),
                    title,
                    categoryId,
                    priority,
                    status,
                    dueDate,
                    recurring,
                    recurAmount,
                    recurInterval,
                    repeatTimes,
                    subtasks: draftSubtasks
                };
                state.tasks.push(task);
                completeRecurringIfDone(task);
            }

            saveState();
            closeTaskModal();
            render();
        }

        function deleteTask(id) {
            state.tasks = state.tasks.filter(t => t.id !== id);
            saveState();
            render();
        }

        // Drag & Drop
        function drag(ev, id) { ev.dataTransfer.setData("text", id); }
        function allowDrop(ev) { ev.preventDefault(); }
        function drop(ev, newStatus) {
            ev.preventDefault();
            const id = ev.dataTransfer.getData("text");
            const task = state.tasks.find(t => t.id === id);
            if (task) {
                task.status = newStatus;
                completeRecurringIfDone(task); // recurring task dropped on Done bounces back to To Do with next due date
                saveState();
                render();
            }
        }
