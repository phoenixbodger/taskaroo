// Taskaroo - view switching, due-date badges, and all render() DOM output.
        function setView(view) {
            state.view = view;
            document.getElementById('kanbanView').classList.toggle('hidden', view !== 'kanban');
            document.getElementById('listView').className = view === 'list'
                ? 'bg-white dark:bg-dark-800 rounded-xl shadow-sm border border-slate-200 dark:border-dark-700 overflow-hidden flex flex-1'
                : 'bg-white dark:bg-dark-800 rounded-xl shadow-sm border border-slate-200 dark:border-dark-700 overflow-hidden hidden flex-1';

            document.getElementById('kanbanBtn').className = view === 'kanban'
                ? 'px-3 py-1.5 rounded-md text-xs font-medium transition shadow-sm bg-white dark:bg-dark-800 text-indigo-600 dark:text-indigo-400'
                : 'px-3 py-1.5 rounded-md text-xs font-medium transition text-slate-600 dark:text-slate-400';

            document.getElementById('listBtn').className = view === 'list'
                ? 'px-3 py-1.5 rounded-md text-xs font-medium transition shadow-sm bg-white dark:bg-dark-800 text-indigo-600 dark:text-indigo-400'
                : 'px-3 py-1.5 rounded-md text-xs font-medium transition text-slate-600 dark:text-slate-400';
        }

        // Due Date Helpers
        function isOverdue(t) {
            if (!t.dueDate || t.status === 'Done') return false;
            return new Date() > new Date(t.dueDate);
        }

        function isDueToday(t) {
            if (!t.dueDate) return false;
            const due = new Date(t.dueDate);
            const now = new Date();
            return !isNaN(due.getTime()) &&
                due.getFullYear() === now.getFullYear() &&
                due.getMonth() === now.getMonth() &&
                due.getDate() === now.getDate();
        }

        function formatDueDate(t, compact = false) {
            if (!t.dueDate) return '';
            const due = new Date(t.dueDate);
            if (isNaN(due.getTime())) return t.dueDate;
            return due.toLocaleString(undefined, compact
                ? { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }
                : { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
        }

        function dueBadgeHtml(t, compact = false) {
            if (!t.dueDate) return '';
            const overdue = isOverdue(t);
            const today = isDueToday(t);
            const base = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap';
            const dateLabel = escapeHtml(formatDueDate(t, compact));
            if (overdue) {
                return `<span class="${base} bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400 border border-red-200 dark:border-red-900/50" title="${dateLabel}"><i class="fa-solid fa-triangle-exclamation text-[10px]"></i>Overdue · ${dateLabel}</span>`;
            }
            if (today) {
                return `<span class="${base} bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50" title="${dateLabel}"><i class="fa-regular fa-clock text-[10px]"></i>Due Today</span>`;
            }
            return `<span class="${base} bg-slate-100 text-slate-600 dark:bg-dark-700 dark:text-slate-300 border border-slate-200 dark:border-dark-600" title="${dateLabel}"><i class="fa-regular fa-clock text-[10px]"></i>${dateLabel}</span>`;
        }

        // Sort tasks by due date ascending (soonest first).
        // Tasks with no due date sort to the bottom.
        function sortByDueDate(tasks) {
            return tasks.slice().sort((a, b) => {
                const at = new Date(a.dueDate).getTime();
                const bt = new Date(b.dueDate).getTime();
                const an = Number.isNaN(at);
                const bn = Number.isNaN(bt);
                if (an && bn) return 0;
                if (an) return 1;
                if (bn) return -1;
                return at - bt;
            });
        }

        function render() {
            const catList = document.getElementById('categoryList');
            document.getElementById('categoryCount').innerText = state.categories.length;

            const renderCategoryRows = (parentId, depth) => {
                const children = parentId === null ? getTopLevelCategories() : getChildCategories(parentId);
                return children.map(c => {
                    const hasChildren = getChildCategories(c.id).length > 0;
                    const expanded = c.expanded !== false;
                    const selected = state.activeCategoryIds.includes(c.id);
                    const rowClasses = selected
                        ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400'
                        : 'hover:bg-slate-50 dark:hover:bg-dark-700 text-slate-600 dark:text-slate-300';
                    return `
                        <div>
                            <div onclick="toggleCategory('${c.id}')" class="group flex items-center justify-between px-2 py-2 rounded-lg text-sm font-medium cursor-pointer transition ${rowClasses}" style="padding-left:${8 + depth * 16}px">
                                <span class="flex items-center min-w-0 gap-1.5">
                                    <button onclick="toggleCategoryExpanded('${c.id}', event)" class="w-4 shrink-0 text-center text-[10px] ${hasChildren ? 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200' : 'invisible'}" title="${hasChildren ? (expanded ? 'Collapse' : 'Expand') : ''}">
                                        <i class="fa-solid ${expanded ? 'fa-chevron-down' : 'fa-chevron-right'}"></i>
                                    </button>
                                    <input type="checkbox" ${selected ? 'checked' : ''} onclick="event.stopPropagation()" onchange="toggleCategory('${c.id}')" title="${selected ? 'Remove from filter' : 'Add to filter'}" class="h-3.5 w-3.5 shrink-0 rounded accent-indigo-600 focus:ring-indigo-500 cursor-pointer">
                                    <i class="fa-solid fa-folder mr-1 text-xs text-amber-500 shrink-0"></i>
                                    <span class="truncate">${escapeHtml(c.name)}</span>
                                </span>
                                <div class="flex items-center shrink-0">
                                    <button onclick="toggleFavourite('${c.id}', event)" class="${c.favourite ? 'text-amber-500' : 'text-slate-300 dark:text-slate-600 hover:text-amber-500'} transition p-1" title="${c.favourite ? 'Remove from Favourites' : 'Add to Favourites'}"><i class="fa-solid ${c.favourite ? 'fa-star' : 'fa-regular fa-star'} text-xs"></i></button>
                                    <div class="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition shrink-0">
                                    <button onclick="openCategoryModal('${c.id}', event)" class="text-slate-400 hover:text-indigo-600 transition p-1" title="Add Sub-category"><i class="fa-solid fa-plus text-xs"></i></button>
                                    <button onclick="openEditCategoryModal('${c.id}', event)" class="text-slate-400 hover:text-indigo-600 transition p-1" title="Edit Category"><i class="fa-solid fa-pen text-xs"></i></button>
                                    <button onclick="deleteCategory('${c.id}', event)" class="text-slate-400 hover:text-red-500 transition p-1" title="Delete Category"><i class="fa-solid fa-trash text-xs"></i></button>
                                    </div>
                                </div>
                            </div>
                            ${hasChildren && expanded ? renderCategoryRows(c.id, depth + 1) : ''}
                        </div>
                    `;
                }).join('');
            };

            catList.innerHTML = `
                <div onclick="clearCategoryFilter()" class="flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium cursor-pointer transition ${state.activeCategoryIds.length === 0 ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400' : 'hover:bg-slate-50 dark:hover:bg-dark-700 text-slate-600 dark:text-slate-300'}">
                    <span><i class="fa-solid fa-list-check mr-2 text-xs"></i> All Tasks</span>
                </div>
            `;
            const favouriteRoots = getFavouriteRoots();
            if (favouriteRoots.length > 0) {
                catList.innerHTML += `
                            <div class="flex items-center justify-between px-3 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500"><span><i class="fa-solid fa-star mr-1.5 text-amber-500"></i> Favourites</span></div>
                            ${favouriteRoots.map(r => renderCategoryRows(r.id, 0)).join('')}
                            <div class="border-t border-slate-200/70 dark:border-dark-700/70 mt-2 pt-2"></div>
                        `;
            }
            catList.innerHTML += renderCategoryRows(null, 0);

            // Render Active Category Notes (only when a single category is selected)
            const activeCat = state.activeCategoryIds.length === 1 ? getCategory(state.activeCategoryIds[0]) : null;
            const notesInput = document.getElementById('categoryNotesInput');
            const titleEl = document.getElementById('currentCategoryTitle');
            if (activeCat) {
                titleEl.innerText = getCategoryPathText(activeCat.id) + " Notes";
                notesInput.value = activeCat.notes || '';
                notesInput.disabled = false;
            } else {
                titleEl.innerText = "Select a category to view/edit notes";
                notesInput.value = "";
                notesInput.disabled = true;
                document.getElementById('saveNotesBtn').classList.add('hidden');
            }

            // Filter Tasks (matches parent task title OR any subtask title)
            const search = document.getElementById('searchInput').value.toLowerCase();
            const priorityFilter = document.getElementById('priorityFilter').value;

            const filteredTasks = sortByDueDate(state.tasks.filter(t => {
                const matchesTask = t.title.toLowerCase().includes(search);
                const matchesSub = (t.subtasks || []).some(s => s.title.toLowerCase().includes(search));
                const matchesPriority = !priorityFilter || t.priority === priorityFilter;
                const matchesCategory = isTaskInSelectedCategories(t.categoryId);
                return (matchesTask || matchesSub) && matchesPriority && matchesCategory;
            }));

            const todo = filteredTasks.filter(t => t.status === 'To Do');
            const inprogress = filteredTasks.filter(t => t.status === 'In Progress');
            const done = filteredTasks.filter(t => t.status === 'Done');

            document.getElementById('todoCount').innerText = todo.length;
            document.getElementById('inprogressCount').innerText = inprogress.length;
            document.getElementById('doneCount').innerText = done.length;

            const renderSubtasksBlock = (t) => {
                const subs = t.subtasks || [];
                if (subs.length === 0) return '';
                const doneCount = subs.filter(s => s.done).length;
                const pct = Math.round((doneCount / subs.length) * 100);
                return `
                    <div class="mt-2 pt-2 border-t border-slate-200/70 dark:border-dark-700/70">
                        <div class="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                            <span><i class="fa-solid fa-list-ul mr-1"></i> Subtasks</span>
                            <span class="font-medium">${doneCount}/${subs.length}</span>
                        </div>
                        <div class="w-full bg-slate-200 dark:bg-dark-700 h-1.5 rounded-full overflow-hidden mb-2">
                            <div class="bg-indigo-500 h-full transition-all duration-200" style="width: ${pct}%"></div>
                        </div>
                        <div class="space-y-1">
                            ${subs.map(s => `
                                <label onclick="event.stopPropagation()" class="flex items-start space-x-2 text-xs cursor-pointer text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white">
                                    <input type="checkbox" ${s.done ? 'checked' : ''} onchange="toggleSubtask('${t.id}', '${s.id}', event)" class="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500">
                                    <span class="${s.done ? 'line-through text-slate-400' : ''}">${escapeHtml(s.title)}</span>
                                </label>
                            `).join('')}
                        </div>
                    </div>
                `;
            };

            const renderCard = (t) => {
                const catLabel = getCategoryPathText(t.categoryId);
                const priorityColor = t.priority === 'High' ? 'bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400' : t.priority === 'Medium' ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400' : 'bg-slate-100 text-slate-600 dark:bg-dark-700 dark:text-slate-300';
                return `
                    <div draggable="true" ondragstart="drag(event, '${t.id}')" class="bg-slate-50 dark:bg-dark-900 border border-slate-200 dark:border-dark-700 rounded-lg p-3 cursor-grab active:cursor-grabbing shadow-sm hover:border-indigo-500 transition group">
                        <div class="flex items-start justify-between gap-2 mb-2">
                            <span class="text-xs font-semibold px-2 py-0.5 rounded ${priorityColor}">${t.priority}</span>
                            <div class="opacity-0 group-hover:opacity-100 transition flex items-center space-x-1">
                                <button onclick="openTaskModal('${t.id}')" title="Edit Task & Subtasks" class="p-1 text-slate-400 hover:text-indigo-600 transition"><i class="fa-solid fa-pen text-xs"></i></button>
                                <button onclick="deleteTask('${t.id}')" title="Delete Task" class="p-1 text-slate-400 hover:text-red-500 transition"><i class="fa-solid fa-trash text-xs"></i></button>
                            </div>
                        </div>
                        <label onclick="event.stopPropagation()" class="flex items-start gap-2 mb-2 cursor-pointer select-none">
                            ${t.status === 'Done'
                                ? `<input type="checkbox" checked onchange="toggleTaskDone('${t.id}')" class="accent-emerald-600 mt-0.5 rounded text-emerald-600 focus:ring-emerald-500">`
                                : ''}
                            <span class="text-sm font-medium ${t.status === 'Done' ? 'line-through text-slate-400' : ''}">${escapeHtml(t.title)}</span>
                        </label>
                        <div class="flex flex-wrap items-center gap-1.5">
                            ${catLabel ? `<span class="inline-block text-[10px] bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full"><i class="fa-solid fa-folder mr-1"></i>${escapeHtml(catLabel)}</span>` : ''}
                            ${t.recurring ? `<span class="inline-block text-[10px] bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full" title="Recurring &middot; returns to To Do with the next due date after completion"><i class="fa-solid fa-rotate mr-1"></i>Recurring</span>` : ''}
                            ${dueBadgeHtml(t)}
                        </div>
                        ${renderSubtasksBlock(t)}
                    </div>
                `;
            };

            document.getElementById('colTodo').innerHTML = todo.map(renderCard).join('') || '<p class="text-xs text-slate-400 text-center py-6">No tasks</p>';
            document.getElementById('colInProgress').innerHTML = inprogress.map(renderCard).join('') || '<p class="text-xs text-slate-400 text-center py-6">No tasks</p>';
            document.getElementById('colDone').innerHTML = done.map(renderCard).join('') || '<p class="text-xs text-slate-400 text-center py-6">No tasks</p>';

            // List View Table (with per-column sort + filter)
            const lstFilters = state.listFilters || (state.listFilters = { category: '', priority: '', status: '' });
            lstFilters.category = document.getElementById('listFilterCategory').value;
            lstFilters.priority = document.getElementById('listFilterPriority').value;
            lstFilters.status = document.getElementById('listFilterStatus').value;

            // Populate the category filter dropdown from the live category tree.
            const listCatSel = document.getElementById('listFilterCategory');
            if (listCatSel) {
                const flatCats = [];
                const collectFlat = (pid) => getChildCategories(pid).forEach(c => { flatCats.push({ id: c.id, label: getCategoryPathText(c.id) }); collectFlat(c.id); });
                collectFlat(null);
                const currentCat = listCatSel.value;
                listCatSel.innerHTML = '<option value="">All Categories</option>' + flatCats.map(c => `<option value="${c.id}">${escapeHtml(c.label)}</option>`).join('');
                listCatSel.value = currentCat;
            }

            // Apply per-column filters, then sort (list view only, so Kanban ordering is untouched).
            const listRows = sortListTasks(filteredTasks.filter(t => {
                if (lstFilters.priority && t.priority !== lstFilters.priority) return false;
                if (lstFilters.status && t.status !== lstFilters.status) return false;
                if (lstFilters.category && t.categoryId !== lstFilters.category) return false;
                return true;
            }));

            // Update the sort indicator arrows on the table headers.
            document.querySelectorAll('#listTable th[data-sort]').forEach(th => {
                const ind = th.querySelector('.list-sort-ind');
                const active = state.listSort && state.listSort.key === th.dataset.sort;
                ind.innerHTML = active
                    ? `<i class="fa-solid ${state.listSort.dir === 1 ? 'fa-sort-up' : 'fa-sort-down'}"></i>`
                    : '<i class="fa-solid fa-sort text-slate-300 dark:text-slate-600"></i>';
                th.classList.toggle('text-indigo-600', active);
                th.classList.toggle('dark:text-indigo-400', active);
            });

            const tbody = document.getElementById('listTableBody');
            tbody.innerHTML = listRows.map(t => {
                const catLabel = getCategoryPathText(t.categoryId);
                const priorityColor = t.priority === 'High' ? 'text-red-600' : t.priority === 'Medium' ? 'text-amber-600' : 'text-slate-500';
                const statusBadge = t.status === 'Done' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400' : t.status === 'In Progress' ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400' : 'bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400';
                const subs = t.subtasks || [];
                const doneCount = subs.filter(s => s.done).length;
                return `
                    <tr class="hover:bg-slate-50/50 dark:hover:bg-dark-700/50 transition align-top">
                        <td class="p-4">
                            <label class="font-medium flex items-center gap-2 cursor-pointer select-none">
                                <input type="checkbox" ${t.status === 'Done' ? 'checked' : ''} onchange="toggleTaskDone('${t.id}')" class="${t.status === 'Done' ? 'accent-emerald-600' : ''} rounded text-emerald-600 focus:ring-emerald-500">
                                <span class="${t.status === 'Done' ? 'line-through text-slate-400' : ''}">${escapeHtml(t.title)}</span>
                                ${subs.length ? `<span class="text-[11px] bg-slate-100 dark:bg-dark-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full font-normal">${doneCount}/${subs.length}</span>` : ''}
                            </label>
                            ${subs.length ? `
                                <div class="mt-2 pl-3 border-l-2 border-slate-200 dark:border-dark-700 space-y-1">
                                    ${subs.map(s => `
                                        <label class="flex items-center space-x-2 text-xs cursor-pointer text-slate-600 dark:text-slate-300">
                                            <input type="checkbox" ${s.done ? 'checked' : ''} onchange="toggleSubtask('${t.id}', '${s.id}', event)" class="rounded text-indigo-600 focus:ring-indigo-500">
                                            <span class="${s.done ? 'line-through text-slate-400' : ''}">${escapeHtml(s.title)}</span>
                                        </label>
                                    `).join('')}
                                </div>
                            ` : ''}
                        </td>
                        <td class="p-4 text-slate-500 text-xs">${catLabel ? escapeHtml(catLabel) : '—'}</td>
                        <td class="p-4 text-xs font-semibold ${priorityColor}">${t.priority}</td>
                        <td class="p-4"><span class="text-xs px-2.5 py-1 rounded-full font-medium ${statusBadge}">${t.status}</span></td>
                        <td class="p-4">
                            ${t.recurring ? '<span class="inline-flex items-center gap-1 mr-1.5 align-middle text-emerald-600 dark:text-emerald-400" title="Recurring &middot; returns to To Do with the next due date after completion"><i class="fa-solid fa-rotate"></i></span>' : ''}
                            ${dueBadgeHtml(t, true) || '—'}
                        </td>
                        <td class="p-4 text-right space-x-2">
                            <button onclick="openTaskModal('${t.id}')" class="text-slate-400 hover:text-indigo-600 transition"><i class="fa-solid fa-pen text-xs"></i></button>
                            <button onclick="deleteTask('${t.id}')" class="text-slate-400 hover:text-red-500 transition"><i class="fa-solid fa-trash text-xs"></i></button>
                        </td>
                    </tr>
                `;
            }).join('') || `<tr><td colspan="6" class="text-center py-6 text-slate-400 text-sm">No tasks found</td></tr>`;
        }

        // ---- List view: per-column sort + filter (independent of Kanban ordering) ----
        function setListSort(key) {
            const cur = state.listSort || { key: 'due', dir: 1 };
            state.listSort = cur.key === key
                ? { key, dir: -cur.dir }
                : { key, dir: 1 };
            saveState();
            render();
        }

        function clearListFilters() {
            state.listFilters = { category: '', priority: '', status: '' };
            saveState();
            render();
        }

        function getPriorityRank(p) { return p === 'High' ? 0 : p === 'Medium' ? 1 : 2; }
        function getStatusRank(s) { return s === 'To Do' ? 0 : s === 'In Progress' ? 1 : 2; }

        function dueCompare(a, b) {
            const at = new Date(a.dueDate).getTime();
            const bt = new Date(b.dueDate).getTime();
            const an = Number.isNaN(at);
            const bn = Number.isNaN(bt);
            if (an && bn) return 0;
            if (an) return 1;
            if (bn) return -1;
            return at - bt;
        }

        function sortListTasks(tasks) {
            const { key, dir } = state.listSort || { key: 'due', dir: 1 };
            return tasks.slice().sort((a, b) => {
                let cmp;
                if (key === 'title') {
                    cmp = String(a.title || '').localeCompare(String(b.title || ''));
                } else if (key === 'category') {
                    const ca = getCategoryPathText(a.categoryId) || '';
                    const cb = getCategoryPathText(b.categoryId) || '';
                    cmp = ca === cb ? 0 : (!ca ? 1 : (!cb ? -1 : ca.localeCompare(cb)));
                } else if (key === 'priority') {
                    cmp = getPriorityRank(a.priority) - getPriorityRank(b.priority);
                } else if (key === 'status') {
                    cmp = getStatusRank(a.status) - getStatusRank(b.status);
                } else {
                    cmp = dueCompare(a, b);
                }
                return cmp * dir;
            });
        }
