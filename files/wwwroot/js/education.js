// ربط الدارس/المدرس بملف عضو أو خادم موجود في البرنامج (بحث بالاسم أو الرقم القومي أو التليفون)
(function () {
    document.querySelectorAll('[data-edu-link]').forEach(function (box) {
        var form = box.closest('form');
        var q = box.querySelector('.edu-q'), list = box.querySelector('.edu-results'), card = box.querySelector('.edu-linked');
        var member = form.querySelector('input[name=MemberId]'), servant = form.querySelector('input[name=ServantId]');
        var name = card.querySelector('.edu-linked__name');
        var timer;
        function setLinked(text) {
            var on = !!text;
            card.hidden = !on;
            name.textContent = text || '';
            box.querySelector('.edu-link__q').hidden = on;
            form.querySelectorAll('[data-edu-manual]').forEach(function (el) {
                el.hidden = on;
                el.querySelectorAll('input,select').forEach(function (i) { i.disabled = on; });
            });
        }
        setLinked(card.dataset.name || '');
        q.addEventListener('input', function () {
            clearTimeout(timer);
            var text = q.value.trim();
            if (text.length < 2) { list.innerHTML = ''; return; }
            timer = setTimeout(function () {
                fetch(box.dataset.url + '?kind=' + (box.dataset.kind || '') + '&q=' + encodeURIComponent(text), { credentials: 'same-origin' })
                    .then(function (r) { return r.json(); })
                    .then(function (items) {
                        list.innerHTML = '';
                        if (!items.length) {
                            var none = document.createElement('li');
                            none.className = 'ui-muted';
                            none.textContent = 'لا يوجد مطابق في البرنامج: سجّله من خارج البرنامج بالخانات أدناه.';
                            list.appendChild(none);
                            return;
                        }
                        items.forEach(function (item) {
                            var li = document.createElement('li'), b = document.createElement('button');
                            b.type = 'button';
                            b.textContent = (item.type === 'servant' ? 'خادم: ' : '') + item.name + (item.age != null ? ' · ' + item.age + ' سنة' : '') + (item.phone ? ' · ' + item.phone : '') + (item.nationalId ? ' · ' + item.nationalId : '');
                            b.addEventListener('click', function () {
                                member.value = item.type === 'member' ? item.id : '';
                                if (servant) servant.value = item.type === 'servant' ? item.id : '';
                                setLinked(item.name);
                                list.innerHTML = '';
                                q.value = '';
                            });
                            li.appendChild(b);
                            list.appendChild(li);
                        });
                    });
            }, 250);
        });
        box.querySelector('.edu-unlink').addEventListener('click', function () {
            member.value = '';
            if (servant) servant.value = '';
            setLinked('');
        });
    });
})();

// قوائم تُحفظ فور الاختيار (الصف والمادة في قائمة المدرسين). «+ مادة جديدة…» تسأل عن الاسم ثم تحفظه.
(function () {
    document.querySelectorAll('select[data-edu-auto]').forEach(function (select) {
        var previous = select.value;
        select.addEventListener('change', function () {
            if (select.value === '__new') {
                var text = (window.prompt('اكتب اسم المادة الجديدة') || '').trim();
                if (!text) { select.value = previous; return; }
                var option = document.createElement('option');
                option.value = text; option.textContent = text;
                select.insertBefore(option, select.querySelector('option[value="__new"]'));
                select.value = text;
            }
            previous = select.value;
            select.form.submit();
        });
    });
})();

// الإجراءات السريعة في قائمتي الدارسين والمدرسين (2026-11-17): زر «ربط» يفتح تحت الصف بحثًا في أعضاء البرنامج (وخدامه للمدرس)
// باسم الشخص جاهزًا، واختيار نتيجة يربطه فورًا (POST إلى students|teachers/{id}/link) ثم ترجع الصفحة كما كانت.
(function () {
    function token() {
        var input = document.querySelector('input[name="__RequestVerificationToken"]');
        return input ? input.value : '';
    }
    function post(url, fields) {
        var form = document.createElement('form');
        form.method = 'post'; form.action = url; form.hidden = true;
        form.setAttribute('data-no-draft', '');
        fields.__RequestVerificationToken = token();
        Object.keys(fields).forEach(function (key) {
            var input = document.createElement('input');
            input.type = 'hidden'; input.name = key; input.value = fields[key];
            form.appendChild(input);
        });
        document.body.appendChild(form);
        form.submit();
    }
    document.addEventListener('click', function (event) {
        var button = event.target.closest('[data-edu-qlink]');
        if (!button) return;
        var row = button.closest('tr');
        var next = row.nextElementSibling;
        if (next && next.classList.contains('edu-qlink-row')) { next.remove(); return; }
        document.querySelectorAll('.edu-qlink-row').forEach(function (old) { old.remove(); });
        var panelRow = document.createElement('tr');
        panelRow.className = 'edu-qlink-row no-print';
        var cell = document.createElement('td');
        cell.colSpan = row.children.length;
        cell.innerHTML = '<div class="edu-qlink" data-no-family-search><label class="edu-qlink__label"><i class="bi bi-link-45deg" aria-hidden="true"></i> ربط «<span></span>» بملفه في البرنامج:</label>'
            + '<input type="search" class="form-control" autocomplete="off" data-no-draft aria-label="بحث للربط بملف في البرنامج" placeholder="الاسم أو الرقم القومي أو التليفون" />'
            + '<button type="button" class="ui-icon-btn edu-qlink__close" title="إغلاق" aria-label="إغلاق"><i class="bi bi-x-lg" aria-hidden="true"></i></button>'
            + '<ul class="edu-results"></ul></div>';
        panelRow.appendChild(cell);
        row.after(panelRow);
        cell.querySelector('.edu-qlink__label span').textContent = button.dataset.name;
        var input = cell.querySelector('input'), list = cell.querySelector('.edu-results'), timer;
        cell.querySelector('.edu-qlink__close').addEventListener('click', function () { panelRow.remove(); });
        function search() {
            var text = input.value.trim();
            if (text.length < 2) { list.innerHTML = ''; return; }
            fetch(button.dataset.lookup + '?kind=' + button.dataset.kind + '&q=' + encodeURIComponent(text), { credentials: 'same-origin' })
                .then(function (r) { return r.json(); })
                .then(function (items) {
                    list.innerHTML = '';
                    if (!items.length) {
                        var none = document.createElement('li');
                        none.className = 'ui-muted';
                        none.textContent = 'لا يوجد مطابق في البرنامج. جرّب جزءًا من الاسم، أو الرقم القومي، أو التليفون.';
                        list.appendChild(none);
                        return;
                    }
                    items.forEach(function (item) {
                        var li = document.createElement('li'), b = document.createElement('button');
                        b.type = 'button';
                        b.textContent = (item.type === 'servant' ? 'خادم: ' : '') + item.name + (item.age != null ? ' · ' + item.age + ' سنة' : '') + (item.phone ? ' · ' + item.phone : '') + (item.nationalId ? ' · ' + item.nationalId : '');
                        b.title = 'ربطه بهذا الملف';
                        b.addEventListener('click', function () {
                            var fields = { returnUrl: button.dataset.return || '' };
                            if (item.type === 'servant') fields.servantId = item.id; else fields.memberId = item.id;
                            b.disabled = true;
                            post(button.dataset.action, fields);
                        });
                        li.appendChild(b);
                        list.appendChild(li);
                    });
                });
        }
        input.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(search, 250); });
        input.addEventListener('keydown', function (e) { if (e.key === 'Escape') panelRow.remove(); });
        input.value = (button.dataset.name || '').split(' ').filter(Boolean).slice(0, 2).join(' ');
        input.focus();
        search();
    });
})();

// بحث سريع داخل الدارسين والمدرسين فقط (بلا ملفات الأسر): يصفّي صفوف الجدول الظاهر فورًا،
// ويعرض من يطابق في الدارسين والمدرسين معًا (من الخادم: /people) مع «فتح» و«تعديل».
(function () {
    var box = document.querySelector('[data-edu-people]');
    if (!box) return;
    var input = box.querySelector('input'), list = box.querySelector('.edu-insearch__results'), count = box.querySelector('.edu-insearch__count');
    var rows = Array.prototype.slice.call(document.querySelectorAll('.edu-list > tbody > tr'));
    var timer, last = '';
    function url(template, id) { return template.replace(/\/0(?=$|\?)/, '/' + id); }
    function filterRows(text) {
        var shown = 0;
        document.querySelectorAll('.edu-qlink-row').forEach(function (old) { old.remove(); });
        rows.forEach(function (row) {
            var ok = !text || window.arabicMatch(row.textContent, text);
            row.hidden = !ok;
            if (ok) shown++;
        });
        count.textContent = text && rows.length ? 'في الجدول: ' + shown + ' من ' + rows.length : '';
    }
    function render(items, text) {
        list.innerHTML = '';
        if (!text) { list.hidden = true; return; }
        list.hidden = false;
        if (!items.length) {
            var none = document.createElement('li');
            none.className = 'ui-muted edu-insearch__none';
            none.textContent = 'لا يوجد مطابق.';
            list.appendChild(none);
            return;
        }
        items.forEach(function (item) {
            var student = item.kind === 'student';
            var li = document.createElement('li');
            var tag = document.createElement('span');
            tag.className = 'edu-insearch__tag ' + (student ? 'is-student' : 'is-teacher');
            tag.textContent = student ? box.dataset.labelStudent : box.dataset.labelTeacher;
            var link = document.createElement('a');
            link.href = url(student ? box.dataset.studentUrl : box.dataset.teacherUrl, item.id);
            link.className = 'edu-insearch__name';
            link.textContent = item.name;
            var info = document.createElement('small');
            info.textContent = [item.place, item.phone, item.nationalId, item.status].filter(Boolean).join(' · ');
            var edit = document.createElement('a');
            edit.href = url(student ? box.dataset.studentEdit : box.dataset.teacherEdit, item.id);
            edit.className = 'edu-act';
            edit.title = 'تعديل';
            edit.setAttribute('aria-label', 'تعديل ' + item.name);
            edit.innerHTML = '<i class="bi bi-pencil" aria-hidden="true"></i>';
            li.appendChild(tag); li.appendChild(link);
            if (item.linked) {
                var mark = document.createElement('i');
                mark.className = 'bi bi-link-45deg text-success';
                mark.title = 'مربوط بملف في البرنامج';
                li.appendChild(mark);
            }
            li.appendChild(info); li.appendChild(edit);
            list.appendChild(li);
        });
    }
    function run() {
        var text = input.value.trim();
        filterRows(text);
        if (text.length < 2) { render([], ''); last = ''; return; }
        if (text === last) return;
        last = text;
        fetch(box.dataset.url + '?q=' + encodeURIComponent(text), { credentials: 'same-origin' })
            .then(function (r) { return r.json(); })
            .then(function (items) { if (input.value.trim() === text) render(items, text); })
            .catch(function () { });
    }
    input.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(run, 200); });
    input.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { input.value = ''; run(); }
        if (e.key === 'Enter') e.preventDefault();
    });
})();

// تحديد عدة دارسين ونقلهم لفصل واحد. التحديد يتجمّع عبر عمليات البحث: ما حدّدته من بحث يبقى محدّدًا
// بعد تغيير البحث أو الفصل (يُحفظ في المتصفح ساعتين)، و«نقل المحددين» ينقل كل المجمّع.
(function () {
    var form = document.querySelector('[data-edu-bulk]');
    if (!form) return;
    var KEY = 'edu-bulk-students', MAX_AGE = 2 * 60 * 60 * 1000;
    var all = document.querySelector('[data-edu-bulk-all]');
    var counter = form.querySelector('[data-edu-bulk-count]');
    var note = form.querySelector('[data-edu-bulk-note]');
    var ids = {};
    try {
        var saved = JSON.parse(sessionStorage.getItem(KEY) || 'null');
        if (saved && Date.now() - saved.t < MAX_AGE) saved.ids.forEach(function (id) { ids[String(id)] = true; });
    } catch (e) { }
    function save() {
        try {
            var list = Object.keys(ids);
            if (list.length) sessionStorage.setItem(KEY, JSON.stringify({ t: Date.now(), ids: list }));
            else sessionStorage.removeItem(KEY);
        } catch (e) { }
    }
    function picks() { return Array.prototype.slice.call(document.querySelectorAll('[data-edu-bulk-pick]')); }
    function visible(box) { var row = box.closest('tr'); return row && !row.hidden; }
    function refresh() {
        var total = Object.keys(ids).length;
        var here = picks().filter(function (box) { return ids[box.value]; }).length;
        counter.textContent = total;
        if (note) note.textContent = total > here ? '(منهم ' + (total - here) + ' من بحث سابق غير ظاهرين في هذه القائمة)' : '';
        form.hidden = total === 0;
        var bar = document.querySelector('header.topbar');
        form.style.top = ((bar ? bar.offsetHeight : 0) + 8) + 'px';
        if (all) {
            var shown = picks().filter(visible);
            all.checked = shown.length > 0 && shown.every(function (box) { return box.checked; });
        }
    }
    function set(box, on) { box.checked = on; if (on) ids[box.value] = true; else delete ids[box.value]; }
    picks().forEach(function (box) { box.checked = !!ids[box.value]; });
    refresh();
    document.addEventListener('change', function (event) {
        if (event.target === all) picks().forEach(function (box) { if (visible(box)) set(box, all.checked); });
        else if (event.target.matches && event.target.matches('[data-edu-bulk-pick]')) set(event.target, event.target.checked);
        else return;
        save();
        refresh();
    });
    form.querySelector('[data-edu-bulk-clear]').addEventListener('click', function () {
        ids = {};
        picks().forEach(function (box) { box.checked = false; });
        save();
        refresh();
    });
    // البحث السريع يخفي صفوفًا: لا يلغي تحديدها، فيبقى المحدد من قبل
    document.addEventListener('input', function () { setTimeout(refresh, 0); });
    form.addEventListener('submit', function (event) {
        form.querySelectorAll('input[data-edu-bulk-extra]').forEach(function (input) { input.remove(); });
        var onPage = {};
        picks().forEach(function (box) { onPage[box.value] = true; });
        // المحدد من عمليات بحث سابقة وليس في هذه الصفحة يُرسَل معهم
        Object.keys(ids).forEach(function (id) {
            if (onPage[id]) return;
            var input = document.createElement('input');
            input.type = 'hidden'; input.name = 'ids'; input.value = id; input.setAttribute('data-edu-bulk-extra', '');
            form.appendChild(input);
        });
        var count = Object.keys(ids).length;
        var select = form.querySelector('select[name=classId]');
        var label = select.options[select.selectedIndex].text;
        if (!count || !confirm('نقل ' + count + ' دارس إلى: ' + label + '؟')) {
            event.preventDefault();
            form.querySelectorAll('input[data-edu-bulk-extra]').forEach(function (input) { input.remove(); });
            return;
        }
        ids = {};
        save();
    });
})();
