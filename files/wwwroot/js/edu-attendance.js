// حضور وغياب البابا شنوده للتعليم وخدمات الأنبا إبرام: عدّادات حية ونسبة وشريط تقدم، بحث بالاسم، تحضير/تغييب الكل.
// الحفظ بنفس حقول النموذج القديمة (studentIds / teacherIds = المعلَّم عليهم حاضرون)، فلا تغيير في الخادم.
(function () {
    document.querySelectorAll('[data-att]').forEach(function (form) {
        var key = window.arabicKey || function (text) { return String(text || '').toLowerCase(); };
        function inputs(name) {
            return Array.prototype.slice.call(form.querySelectorAll('.att-input' + (name ? '[name="' + name + '"]' : '')));
        }
        function setAll(selector, text) {
            form.querySelectorAll(selector).forEach(function (element) { element.textContent = text; });
        }
        function refresh() {
            var students = inputs('studentIds');
            var present = students.filter(function (box) { return box.checked; }).length;
            var rate = students.length ? Math.round(present * 100 / students.length) : 0;
            setAll('[data-att-present]', present);
            setAll('[data-att-absent]', students.length - present);
            setAll('[data-att-rate]', rate + '%');
            form.querySelectorAll('[data-att-bar]').forEach(function (bar) {
                bar.style.width = rate + '%';
                bar.parentNode.classList.toggle('is-low', students.length > 0 && rate < 60);
            });
            ['studentIds', 'teacherIds'].forEach(function (name) {
                var boxes = inputs(name);
                setAll('[data-att-group="' + name + '"]', boxes.filter(function (box) { return box.checked; }).length + ' / ' + boxes.length);
            });
        }
        form.addEventListener('change', function (event) { if (event.target.classList.contains('att-input')) refresh(); });
        form.querySelectorAll('[data-att-all]').forEach(function (button) {
            button.addEventListener('click', function () {
                var on = button.getAttribute('data-att-all') === '1';
                inputs().forEach(function (box) {
                    if (!box.closest('.att-row').hidden) box.checked = on;
                });
                refresh();
            });
        });
        var find = form.querySelector('[data-att-filter]');
        if (find) find.addEventListener('input', function () {
            var query = key(find.value);
            form.querySelectorAll('.att-row').forEach(function (row) {
                row.hidden = query !== '' && key(row.getAttribute('data-name')).indexOf(query) < 0;
            });
        });
        // Enter في خانة البحث أو الموضوع لا يحفظ بالخطأ
        form.addEventListener('keydown', function (event) {
            if (event.key === 'Enter' && event.target.tagName === 'INPUT' && event.target.type !== 'checkbox') event.preventDefault();
        });
        refresh();
    });
})();
