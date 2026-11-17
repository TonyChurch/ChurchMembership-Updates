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

// حضور المدرسين بالتوقيت (قسم منفصل): «مُدرس اليوم» يُضاف من قائمة المدرسين بصف جديد، ووقت الحضور والانصراف بزر «الآن»،
// وتُحسب مدة التدريس، وتُعطَّل خانات الوقت للغائب. تُرسَل الحقول: teacherRows (كل الصفوف) وteacherIds (الحاضرون) وarrive_{id} وleave_{id}.
(function () {
    function nowClock() {
        var date = new Date();
        return ('0' + date.getHours()).slice(-2) + ':' + ('0' + date.getMinutes()).slice(-2);
    }
    function minutes(value) {
        if (!value) return null;
        var parts = value.split(':');
        return (+parts[0]) * 60 + (+parts[1]);
    }
    var ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
    function escapeHtml(text) {
        return String(text).replace(/[&<>"]/g, function (ch) { return ESC[ch]; });
    }
    document.querySelectorAll('[data-att-teachers]').forEach(function (section) {
        var form = section.closest('form');
        var list = section.querySelector('[data-att-tlist]');
        var pick = section.querySelector('[data-att-tpick]');
        var add = section.querySelector('[data-att-tadd]');
        var template = section.querySelector('[data-att-trow-template]');
        function duration(row) {
            var from = minutes(row.querySelector('[data-att-arrive]').value), to = minutes(row.querySelector('[data-att-leave]').value);
            var out = row.querySelector('[data-att-dur]');
            if (!out) return;
            out.textContent = from !== null && to !== null && to >= from ? 'مدة التدريس: ' + Math.floor((to - from) / 60) + ' س ' + ('0' + ((to - from) % 60)).slice(-2) + ' د' : '';
        }
        function sync(row, fill) {
            var box = row.querySelector('.att-input');
            var arrive = row.querySelector('[data-att-arrive]');
            if (fill && box.checked && !arrive.value) arrive.value = nowClock();
            row.querySelectorAll('.att-time input, .att-time button, .att-lesson input').forEach(function (element) { element.disabled = !box.checked; });
            duration(row);
        }
        function refreshCounters() {
            var any = form.querySelector('.att-input');
            if (any) any.dispatchEvent(new Event('change', { bubbles: true }));
        }
        section.addEventListener('change', function (event) {
            var row = event.target.closest('.att-trow');
            if (!row) return;
            if (event.target.classList.contains('att-input')) sync(row, true); else duration(row);
        });
        section.addEventListener('input', function (event) {
            var row = event.target.closest('.att-trow');
            if (row) duration(row);
        });
        section.addEventListener('click', function (event) {
            var now = event.target.closest('[data-att-now]');
            if (now) {
                var target = now.closest('.att-trow').querySelector(now.getAttribute('data-att-now') === 'arrive' ? '[data-att-arrive]' : '[data-att-leave]');
                target.value = nowClock();
                target.dispatchEvent(new Event('input', { bubbles: true }));
                return;
            }
            var remove = event.target.closest('[data-att-tremove]');
            if (remove) {
                var row = remove.closest('.att-trow');
                var option = document.createElement('option');
                option.value = row.querySelector('[name="teacherRows"]').value;
                option.textContent = row.getAttribute('data-name');
                option.setAttribute('data-name', row.getAttribute('data-name'));
                pick.appendChild(option);
                row.remove();
                refreshCounters();
            }
        });
        if (add) add.addEventListener('click', function () {
            if (!pick.value) return;
            var option = pick.selectedOptions[0];
            var name = option.getAttribute('data-name') || option.textContent;
            var holder = document.createElement('ol');
            holder.innerHTML = template.innerHTML.replace(/__ID__/g, pick.value).replace(/__NAME__/g, escapeHtml(name)).replace(/__INITIAL__/g, escapeHtml(name.charAt(0) || '؟')).trim();
            var row = holder.firstElementChild;
            list.appendChild(row);
            option.remove();
            pick.value = '';
            var empty = section.querySelector('[data-att-tempty]');
            if (empty) empty.remove();
            sync(row, true);
            refreshCounters();
            row.scrollIntoView({ block: 'nearest' });
        });
        // «تحضير الكل / تغييب الكل» تغيّر الخانات برمجيًا: تُحدَّث خانات الوقت بعدها
        form.querySelectorAll('[data-att-all]').forEach(function (button) {
            button.addEventListener('click', function () { setTimeout(function () { list.querySelectorAll('.att-trow').forEach(function (row) { sync(row, true); }); }, 0); });
        });
        list.querySelectorAll('.att-trow').forEach(function (row) { sync(row, false); });
    });
})();
