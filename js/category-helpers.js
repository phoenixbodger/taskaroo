// Taskaroo - pure helpers for traversing the category tree.
        // Category tree helpers
        function getCategory(categoryId) {
            return state.categories.find(c => c.id === categoryId) || null;
        }
        function getTopLevelCategories() {
            return state.categories.filter(c => !c.parentId);
        }
        function getChildCategories(parentId) {
            return state.categories.filter(c => c.parentId === parentId);
        }
        // Top-level favourites for the pinned "Favourites" section.
        // Returns favourited categories that have no favourited ancestor, so a
        // favourited parent's subtree isn't duplicated by favourited descendants.
        function getFavouriteRoots() {
            return state.categories.filter(c => {
                if (!c.favourite) return false;
                let anc = getCategory(c.parentId);
                while (anc) {
                    if (anc.favourite) return false;
                    anc = getCategory(anc.parentId);
                }
                return true;
            });
        }
        function getCategoryPathText(categoryId) {
            const parts = [];
            let cur = getCategory(categoryId);
            const guard = new Set();
            while (cur && !guard.has(cur.id)) {
                guard.add(cur.id);
                parts.unshift(cur.name);
                cur = getCategory(cur.parentId);
            }
            return parts.join(' \u203A ');
        }
        function isTaskInSelectedCategories(categoryId) {
            if (!state.activeCategoryIds || state.activeCategoryIds.length === 0) return true;
            // Selection is fully explicit (a selected parent includes its descendants),
            // so a task matches only if its own category id is directly selected.
            return !!categoryId && state.activeCategoryIds.includes(categoryId);
        }
        function collectCategoryAndDescendants(categoryId) {
            const result = [];
            const stack = [categoryId];
            while (stack.length) {
                const id = stack.pop();
                result.push(id);
                getChildCategories(id).forEach(c => stack.push(c.id));
            }
            return result;
        }
