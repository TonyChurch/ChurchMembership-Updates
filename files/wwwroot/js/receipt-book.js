// صفحة دفتر الإيصالات: المجموع الحي، تاريخ الإيصال التلقائي، فرق التسوية، وتأكيد الأزرار الحساسة
(function () {
    // الأرقام العربية والفاصلة تُقبل كما تُكتب
    function money(text) {
        var value = (text || '')
            .replace(/[٠-٩]/g, function (digit) { return '٠١٢٣٤٥٦٧٨٩'.indexOf(digit); })
            .replace(/[٫,]/g, '.')
            .replace(/[^0-9.\-]/g, '');
        return parseFloat(value) || 0;
    }

    function show(value) {
        return (Math.round(value * 100) / 100).toLocaleString('en-US');
    }

    document.querySelectorAll('form[data-confirm]').forEach(function (form) {
        form.addEventListener('submit', function (event) {
            if (!confirm(form.dataset.confirm)) event.preventDefault();
        });
    });

    var form = document.getElementById('finReceiptsForm');
    if (form) {
        var rows = Array.prototype.slice.call(form.querySelectorAll('tbody tr'));
        var update = function () {
            var total = 0, count = 0;
            rows.forEach(function (row) {
                var cancelled = row.querySelector('.fin-cancel').checked;
                var amount = money(row.querySelector('.fin-amount').value);
                row.classList.toggle('fin-cancelled', cancelled);
                if (!cancelled && amount > 0) { total += amount; count++; }
            });
            document.getElementById('finLiveTotal').textContent = show(total);
            document.getElementById('finLiveCount').textContent = count;
        };

        // عند كتابة مبلغ في سطر بلا تاريخ: يأخذ تاريخ أقرب إيصال سابق (أو اليوم)
        rows.forEach(function (row, index) {
            row.querySelector('.fin-amount').addEventListener('change', function () {
                var date = row.querySelector('input[type=date]');
                if (date.value || !money(this.value)) return;
                for (var i = index - 1; i >= 0; i--) {
                    var previous = rows[i].querySelector('input[type=date]').value;
                    if (previous) { date.value = previous; return; }
                }
                date.value = new Date().toLocaleDateString('en-CA');
            });
        });

        form.addEventListener('input', update);
        form.addEventListener('change', update);
        update();
    }

    var handed = document.getElementById('handedAmount');
    if (handed) {
        var badge = document.getElementById('finDifference');
        var compare = function () {
            var difference = Math.round((money(handed.value) - money(handed.dataset.net)) * 100) / 100;
            badge.className = 'ui-status ' + (difference === 0 ? 'ui-status--success' : 'ui-status--danger');
            badge.textContent = difference === 0 ? 'مطابق' : (difference < 0 ? 'عجز ' : 'زيادة ') + show(Math.abs(difference));
        };
        handed.addEventListener('input', compare);
        compare();
    }
})();

// التنقل بين الخلايا بمفاتيح الأسهم (مثل Excel) في جدول الإيصالات، وبين خانات نماذج الإضافة
(function () {
    function isRtl(element) { return getComputedStyle(element).direction === 'rtl'; }

    function focusCell(field) {
        if (!field) return false;
        field.focus();
        if (field.select && field.type !== 'date' && field.type !== 'checkbox') field.select();
        return true;
    }

    // السهم ينقل للخانة المجاورة إذا كان المؤشر عند أحد طرفي النص أو النص كله محدَّد؛
    // وسط النص يتحرك المؤشر عاديًا حتى يمكن التعديل
    function atEdge(field) {
        if (field.tagName === 'SELECT' || field.type === 'checkbox' || field.type === 'date') return true;
        if (typeof field.selectionStart !== 'number') return true;
        if (field.selectionStart !== field.selectionEnd) return true;
        return field.selectionStart === 0 || field.selectionEnd === field.value.length;
    }

    // ---------- جدول الإيصالات: كل الاتجاهات ----------
    var grid = document.querySelector('.fin-table--entry tbody');
    if (grid) {
        var rows = Array.prototype.slice.call(grid.rows);
        var fieldsOf = function (row) {
            return Array.prototype.slice.call(row.querySelectorAll('input:not([type=hidden])'));
        };

        grid.addEventListener('keydown', function (event) {
            var field = event.target;
            if (!field.matches || !field.matches('input') || event.altKey || event.ctrlKey || event.metaKey) return;
            var row = field.closest('tr');
            var rowIndex = rows.indexOf(row);
            var fields = fieldsOf(row);
            var column = fields.indexOf(field);
            var key = event.key;
            var target = null;

            if (key === 'ArrowDown' || (key === 'Enter' && field.type !== 'checkbox')) {
                target = rows[rowIndex + 1] && fieldsOf(rows[rowIndex + 1])[column];
                // Enter على آخر سطر لا يرسل النموذج بالخطأ
                if (key === 'Enter') event.preventDefault();
            } else if (key === 'ArrowUp') {
                target = rows[rowIndex - 1] && fieldsOf(rows[rowIndex - 1])[column];
            } else if (key === 'ArrowLeft' || key === 'ArrowRight') {
                // في الاتجاه من اليمين لليسار: السهم الأيسر يذهب للخانة التالية
                var forward = (key === 'ArrowLeft') === isRtl(row);
                // في خانة التاريخ السهمان يتنقلان بين اليوم والشهر والسنة؛ الخروج منها بـ Shift + السهم
                if (field.type === 'date' && !event.shiftKey) return;
                if (!atEdge(field)) return;
                target = fields[column + (forward ? 1 : -1)];
            } else {
                return;
            }

            if (target) {
                event.preventDefault();
                focusCell(target);
            } else if (key === 'ArrowUp' || key === 'ArrowDown') {
                // لا نترك السهم يغيّر التاريخ أو يحرّك الصفحة عند أول وآخر سطر
                event.preventDefault();
            }
        });
    }

    // ---------- نماذج الإضافة (سطر واحد): يمين ويسار بين الخانات ----------
    document.querySelectorAll('.fin-expense-form').forEach(function (form) {
        form.addEventListener('keydown', function (event) {
            if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
            if (event.altKey || event.ctrlKey || event.metaKey) return;
            var field = event.target;
            if (!field.matches || !field.matches('input, select')) return;
            if (field.type === 'date' && !event.shiftKey) return;
            var fields = Array.prototype.slice.call(form.querySelectorAll('input:not([type=hidden]), select'))
                .filter(function (item) { return item.offsetParent !== null; });
            var forward = (event.key === 'ArrowLeft') === isRtl(form);
            if (!atEdge(field)) return;
            var target = fields[fields.indexOf(field) + (forward ? 1 : -1)];
            if (target) {
                event.preventDefault();
                focusCell(target);
            }
        });
    });

    // ---------- التبويب المقترح: آخر تبويب استُخدم مع نفس الخدمة ----------
    var category = document.getElementById('expenseCategory');
    var classification = document.getElementById('expenseClassification');
    if (category && classification) {
        var map = {};
        try { map = JSON.parse(classification.dataset.map || '{}'); } catch (error) { map = {}; }
        category.addEventListener('change', function () {
            var suggested = map[category.value.trim()];
            if (suggested && !classification.value) classification.value = suggested;
        });

        // «تبويب جديد»: خانة الكتابة تأخذ مكان القائمة في الإرسال، والعودة للقائمة تعيدها
        var fresh = document.getElementById('expenseClassificationNew');
        if (fresh) {
            classification.addEventListener('change', function () {
                var typing = classification.value === '__new';
                fresh.hidden = !typing;
                fresh.required = typing;
                fresh.name = typing ? 'classification' : '';
                classification.name = typing ? '' : 'classification';
                if (typing) fresh.focus(); else fresh.value = '';
            });
        }
    }
})();

// شريط الإجماليات بين الوارد والمنصرف: يتحدث مع كل إدخال في الإيصالات أو في مبلغ المنصرف الجاري كتابته
(function () {
    var strip = document.getElementById('finStrip');
    if (!strip) return;

    function money(text) {
        var value = (text || '')
            .replace(/[٠-٩]/g, function (digit) { return '٠١٢٣٤٥٦٧٨٩'.indexOf(digit); })
            .replace(/[٫,]/g, '.')
            .replace(/[^0-9.\-]/g, '');
        return parseFloat(value) || 0;
    }
    function show(value) { return (Math.round(value * 100) / 100).toLocaleString('en-US'); }

    var savedCollected = money(strip.dataset.collected);
    var savedSpent = money(strip.dataset.spent);
    var form = document.getElementById('finReceiptsForm');
    var expenseAmount = document.getElementById('expenseAmount');

    function refresh() {
        var collected = savedCollected;
        if (form) {
            collected = 0;
            Array.prototype.forEach.call(form.querySelectorAll('tbody tr'), function (row) {
                if (!row.querySelector('.fin-cancel').checked) collected += Math.max(money(row.querySelector('.fin-amount').value), 0);
            });
        }
        var pending = expenseAmount ? Math.max(money(expenseAmount.value), 0) : 0;
        // عند تعديل منصرف قائم يُطرح مبلغه الأصلي حتى لا يُحسب مرتين
        var editing = expenseAmount && expenseAmount.form ? money(expenseAmount.form.dataset.editAmount) : 0;
        var spent = savedSpent - editing + pending;
        var net = collected - spent;
        document.getElementById('finStripIn').textContent = show(collected);
        document.getElementById('finStripOut').textContent = show(spent);
        document.getElementById('finStripNet').textContent = show(net);
        document.getElementById('finStripNetCell').classList.toggle('is-negative', net < 0);
        var unsaved = Math.abs(collected - savedCollected) > 0.004 || pending > 0;
        document.getElementById('finStripNote').hidden = !unsaved;
    }

    if (form) {
        form.addEventListener('input', refresh);
        form.addEventListener('change', refresh);
    }
    if (expenseAmount) expenseAmount.addEventListener('input', refresh);
    refresh();
})();

// زر «تعديل» في أي جدول حركات: يملأ نموذج الإضافة ببيانات الحركة فيُحفظ تعديلًا لها بدل إضافة جديدة
(function () {
    document.querySelectorAll('.fin-edit').forEach(function (button) {
        button.addEventListener('click', function () {
            var form = document.querySelector(button.dataset.form);
            if (!form) return;
            var values = {};
            try { values = JSON.parse(button.dataset.values || '{}'); } catch (error) { values = {}; }

            // الترتيب مهم: النوع أولًا لأنه يحدد بنود القائمة، وخانات الاختيار آخرًا
            Object.keys(values).forEach(function (name) {
                var field = form.elements[name];
                if (!field) return;
                var value = values[name] == null ? '' : values[name];
                if (field.type === 'checkbox') return;
                field.value = value;
                field.dispatchEvent(new Event('change', { bubbles: true }));
            });
            Object.keys(values).forEach(function (name) {
                var field = form.elements[name];
                if (field && field.type === 'checkbox') field.checked = values[name] === 'true';
            });

            form.elements.entryId.value = button.dataset.id;
            // الأصل قبل التعديل: حتى لا يُحسب المبلغ مرتين في خانات الإجمالي
            form.dataset.editAmount = button.dataset.amount || '';
            form.dataset.editIncome = button.dataset.income || '';
            form.classList.add('is-editing');

            var submit = form.querySelector('button[type=submit]');
            if (!submit.dataset.addLabel) submit.dataset.addLabel = submit.innerHTML;
            submit.innerHTML = '<i class="bi bi-check2-circle" aria-hidden="true"></i> حفظ التعديل';

            var cancel = form.querySelector('.fin-edit-cancel');
            if (!cancel) {
                cancel = document.createElement('button');
                cancel.type = 'button';
                cancel.className = 'ui-btn ui-btn--ghost fin-edit-cancel';
                cancel.textContent = 'إلغاء التعديل';
                cancel.addEventListener('click', function () { window.location.reload(); });
                submit.insertAdjacentElement('afterend', cancel);
            }

            var amount = form.elements.amount;
            if (amount) amount.dispatchEvent(new Event('input', { bubbles: true }));
            form.scrollIntoView({ behavior: 'smooth', block: 'center' });
            var first = form.querySelector('input:not([type=hidden]):not([type=date]), select');
            if (first) first.focus();
        });
    });
})();
