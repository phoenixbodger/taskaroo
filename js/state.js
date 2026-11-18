// Taskaroo - data layer: defaults, persistence, migration, escaping.
// Declares the global `state` object read/written by all other modules.
        const defaultState = {
            categories: [
                { id: 'c1', name: 'Sewing', notes: 'All sewing and garment projects.', parentId: null, expanded: true, favourite: false },
                { id: 'c2', name: 'Pants', notes: 'Pant patterns, fitting, and construction.', parentId: 'c1', expanded: true, favourite: false },
                { id: 'c3', name: 'Dresses', notes: 'Dress patterns and construction.', parentId: 'c1', expanded: true, favourite: false },
                { id: 'c4', name: 'Zipper Details', notes: 'Zipper installation techniques.', parentId: 'c3', expanded: true, favourite: false }
            ],
            tasks: [
                {
                    id: 't1',
                    title: 'Cut out pants pattern pieces',
                    categoryId: 'c2',
                    priority: 'High',
                    status: 'Done',
                    dueDate: '2026-11-10T10:00',
                    subtasks: [
                        { id: 's1', title: 'Pre-wash fabric', done: true },
                        { id: 's2', title: 'Lay out and pin pattern', done: true }
                    ]
                },
                {
                    id: 't2',
                    title: 'Install invisible zipper on dress',
                    categoryId: 'c4',
                    priority: 'High',
                    status: 'In Progress',
                    dueDate: '2026-11-15T09:00',
                    subtasks: [
                        { id: 's3', title: 'Baste zipper seam', done: true },
                        { id: 's4', title: 'Press seam open', done: false }
                    ]
                },
                {
                    id: 't3',
                    title: 'Sew pant side seams and hem',
                    categoryId: 'c2',
                    priority: 'Medium',
                    status: 'To Do',
                    dueDate: '2026-11-20T17:00',
                    subtasks: []
                }
            ],
            activeCategoryIds: [],
            view: 'kanban',
            listSort: { key: 'due', dir: 1 },
            listFilters: { category: '', priority: '', status: '' }
        };

        // Migrates legacy state saved under the old "projects" format into "categories"
        function normalizeState(s) {
            if (!s) return defaultState;
            if (Array.isArray(s.projects) && !Array.isArray(s.categories)) {
                s.categories = s.projects.map(p => ({ ...p, parentId: p.parentId || null }));
                delete s.projects;
            }
            if (s.activeProjectId !== undefined && s.activeCategoryId === undefined) {
                s.activeCategoryId = s.activeProjectId;
                delete s.activeProjectId;
            }
            if (s.activeCategoryId !== undefined && s.activeCategoryIds === undefined) {
                s.activeCategoryIds = s.activeCategoryId ? [s.activeCategoryId] : [];
                delete s.activeCategoryId;
            }
            if (!Array.isArray(s.tasks)) s.tasks = [];
            s.tasks.forEach(t => {
                if (t.projectId !== undefined && t.categoryId === undefined) t.categoryId = t.projectId;
                delete t.projectId;
                if (!Array.isArray(t.subtasks)) t.subtasks = [];
                if (t.dueDate === undefined) t.dueDate = '';
                if (t.recurring === undefined) t.recurring = false;
                if (t.recurInterval === undefined) t.recurInterval = 'day';
                // Migrate legacy interval names to the unit names used by the interval picker.
                if (t.recurInterval === 'daily') t.recurInterval = 'day';
                if (t.recurInterval === 'weekly') t.recurInterval = 'week';
                if (t.recurInterval === 'monthly') t.recurInterval = 'month';
                if (t.recurAmount === undefined) t.recurAmount = 1;
                if (t.repeatTimes === undefined) t.repeatTimes = '';
                if (t.timesCompleted === undefined) t.timesCompleted = 0;
            });
            if (!Array.isArray(s.categories)) s.categories = [];
            s.categories.forEach(c => {
                c.parentId = c.parentId || null;
                if (c.expanded === undefined) c.expanded = true;
                if (c.favourite === undefined) c.favourite = false;
            });
            if (!Array.isArray(s.activeCategoryIds)) s.activeCategoryIds = [];
            if (typeof s.view !== 'string') s.view = 'kanban';
            if (!s.listSort || typeof s.listSort.key !== 'string') s.listSort = { key: 'due', dir: 1 };
            if (!s.listFilters || typeof s.listFilters !== 'object') s.listFilters = { category: '', priority: '', status: '' };
            return s;
        }

        let savedState = null;
        try { savedState = JSON.parse(localStorage.getItem('taskaroo_state')); } catch (err) { savedState = null; }
        let state = normalizeState(savedState);

        let draftSubtasks = [];

        function saveState() {
            localStorage.setItem('taskaroo_state', JSON.stringify(state));
        }

        function escapeHtml(str) {
            return String(str)
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;");
        }
