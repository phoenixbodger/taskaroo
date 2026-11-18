// Taskaroo - category CRUD, category notes, and category modal interactions.
        // Category Management
        // Toggle a category on/off (multi-select filter).
        // Selecting a category also selects all of its subcategories (they are
        // "ticked too"); unselecting it removes the whole branch. This lets the
        // user unselect individual sub-branches to hide just those tasks.
        function toggleCategory(categoryId) {
            const affected = collectCategoryAndDescendants(categoryId);
            const isSelected = state.activeCategoryIds.includes(categoryId);
            if (!isSelected) {
                state.activeCategoryIds = Array.from(new Set(state.activeCategoryIds.concat(affected)));
            } else {
                const removeSet = new Set(affected);
                state.activeCategoryIds = state.activeCategoryIds.filter(id => !removeSet.has(id));
            }
            saveState();
            render();
        }
        // Clear selection -> show all tasks
        function clearCategoryFilter() {
            if (state.activeCategoryIds.length === 0) return;
            state.activeCategoryIds = [];
            saveState();
            render();
        }

        // Quick-add dropdown: lets the +/- style plus icon on each category row
        // offer "New Category" (sub-category) or "New Task" scoped to that category.
        // Holds the category id the menu was opened for.
        let quickMenuCategoryId = null;
        // The icon element that opened the menu, so we can keep it highlighted.
        let quickMenuTriggerEl = null;

        function closeCategoryQuickMenu() {
            const menu = document.getElementById('categoryQuickMenu');
            if (menu) menu.classList.add('hidden');
            if (quickMenuTriggerEl) {
                quickMenuTriggerEl.classList.remove('text-indigo-600');
                quickMenuTriggerEl = null;
            }
            const backdrop = document.getElementById('categoryQuickMenuBackdrop');
            if (backdrop) backdrop.classList.add('hidden');
            quickMenuCategoryId = null;
        }

        function openCategoryQuickMenu(categoryId, e) {
            if (e) e.stopPropagation();
            closeCategoryQuickMenu();
            const trigger = e ? e.currentTarget : null;
            const menu = document.getElementById('categoryQuickMenu');
            if (!menu) return;

            quickMenuCategoryId = categoryId;
            quickMenuTriggerEl = trigger;
            if (trigger) {
                trigger.classList.add('text-indigo-600');
                const rect = trigger.getBoundingClientRect();
                menu.style.left = rect.right + 8 + 'px';
                menu.style.top = rect.top + 'px';
            }
            menu.classList.remove('hidden');
            const backdrop = document.getElementById('categoryQuickMenuBackdrop');
            if (backdrop) backdrop.classList.remove('hidden');
        }

        function quickMenuNewCategory() {
            const id = quickMenuCategoryId;
            closeCategoryQuickMenu();
            openCategoryModal(id);
        }

        function quickMenuNewTask() {
            const id = quickMenuCategoryId;
            closeCategoryQuickMenu();
            openTaskModal(null, id);
        }

        // Close the quick menu on any outside click (the backdrop intercepts row clicks).
        function initCategoryQuickMenu() {
            const backdrop = document.getElementById('categoryQuickMenuBackdrop');
            if (backdrop) {
                backdrop.addEventListener('click', event => { event.stopPropagation(); closeCategoryQuickMenu(); });
            }
            document.addEventListener('keydown', e => {
                if (e.key === 'Escape') closeCategoryQuickMenu();
            });
        }

        function populateCategoryParentSelect(excludeId) {
            const exclude = new Set(excludeId ? collectCategoryAndDescendants(excludeId) : []);
            let html = '<option value="">None (top-level)</option>';
            const walk = (parentId, depth) => {
                const children = parentId === null ? getTopLevelCategories() : getChildCategories(parentId);
                children.forEach(c => {
                    if (exclude.has(c.id)) return;
                    html += `<option value="${c.id}">${'&nbsp;'.repeat(depth * 2)}${escapeHtml(c.name)}</option>`;
                    walk(c.id, depth + 1);
                });
            };
            walk(null, 0);
            document.getElementById('categoryParentSelect').innerHTML = html;
        }

        function openCategoryModal(prefillParentId, e) {
            if (e) e.stopPropagation();
            document.getElementById('categoryNameInput').value = '';
            document.getElementById('categoryModalNotes').value = '';
            document.getElementById('categoryIdInput').value = '';
            populateCategoryParentSelect('');
            document.getElementById('categoryParentSelect').value = prefillParentId || '';
            document.getElementById('categoryModalTitle').innerHTML = '<i class="fa-solid fa-folder-plus text-indigo-600 mr-2"></i> Create New Category';
            document.getElementById('categorySubmitBtn').innerText = 'Create Category';
            document.getElementById('categoryModal').classList.remove('hidden');
            setTimeout(() => document.getElementById('categoryNameInput').focus(), 50);
        }

        function openEditCategoryModal(categoryId, e) {
            e.stopPropagation();
            const cat = getCategory(categoryId);
            if (!cat) return;
            
            document.getElementById('categoryNameInput').value = cat.name;
            document.getElementById('categoryModalNotes').value = cat.notes || '';
            document.getElementById('categoryIdInput').value = categoryId;
            populateCategoryParentSelect(categoryId); // exclude self + descendants to avoid cycles
            document.getElementById('categoryParentSelect').value = cat.parentId || '';
            document.getElementById('categoryModalTitle').innerHTML = '<i class="fa-solid fa-pen-to-square text-indigo-600 mr-2"></i> Edit Category';
            document.getElementById('categorySubmitBtn').innerText = 'Update Category';
            document.getElementById('categoryModal').classList.remove('hidden');
            setTimeout(() => document.getElementById('categoryNameInput').focus(), 50);
        }

        function closeCategoryModal() {
            document.getElementById('categoryModal').classList.add('hidden');
            document.getElementById('categoryNameInput').value = '';
            document.getElementById('categoryModalNotes').value = '';
            document.getElementById('categoryIdInput').value = '';
            document.getElementById('categoryModalTitle').innerHTML = '<i class="fa-solid fa-folder-plus text-indigo-600 mr-2"></i> Create New Category';
            document.getElementById('categorySubmitBtn').innerText = 'Create Category';
        }

        function handleCategorySubmit(e) {
            e.preventDefault();
            const name = document.getElementById('categoryNameInput').value.trim();
            const notes = document.getElementById('categoryModalNotes').value.trim();
            const parentId = document.getElementById('categoryParentSelect').value || null;
            const categoryId = document.getElementById('categoryIdInput').value;
            if (!name) return;

            if (categoryId) {
                // Update existing category
                const cat = getCategory(categoryId);
                if (cat) {
                    cat.name = name;
                    cat.notes = notes;
                    cat.parentId = parentId;
                }
            } else {
                // Create new category
                const newCat = { id: 'c_' + Date.now(), name, notes, parentId, expanded: true };
                state.categories.push(newCat);
                // Expand ancestors so the new category is visible
                let anc = getCategory(parentId);
                while (anc) { anc.expanded = true; anc = getCategory(anc.parentId); }
                state.activeCategoryIds = [newCat.id];
            }
            saveState();
            closeCategoryModal();
            render();
        }

        function saveCategoryNotes() {
            if (!state.activeCategoryIds || state.activeCategoryIds.length !== 1) return;
            const cat = getCategory(state.activeCategoryIds[0]);
            if (cat) {
                cat.notes = document.getElementById('categoryNotesInput').value;
                saveState();
                document.getElementById('saveNotesBtn').classList.add('hidden');
            }
        }

        function toggleFavourite(categoryId, e) {
            if (e) e.stopPropagation();
            const cat = getCategory(categoryId);
            if (cat) {
                cat.favourite = !cat.favourite;
                saveState();
                render();
            }
        }

        function toggleCategoryExpanded(categoryId, e) {
            e.stopPropagation();
            const cat = getCategory(categoryId);
            if (cat) {
                cat.expanded = cat.expanded === false; // flip; default expanded
                saveState();
                render();
            }
        }

        function deleteCategory(id, e) {
            e.stopPropagation();
            const cat = getCategory(id);
            if (!cat) return;
            const affected = collectCategoryAndDescendants(id);
            const subCount = affected.length - 1;
            const subText = subCount > 1 ? subCount + ' sub-categories' : subCount === 1 ? '1 sub-category' : '';
            if (!confirm(`Delete category "${cat.name}"${subText ? ' and its ' + subText : ''}? Related tasks will be unassigned.`)) return;
            state.categories = state.categories.filter(c => !affected.includes(c.id));
            state.tasks.forEach(t => { if (affected.includes(t.categoryId)) t.categoryId = ''; });
            state.activeCategoryIds = state.activeCategoryIds.filter(id => !affected.includes(id));
            saveState();
            render();
        }
