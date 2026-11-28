// (2026-11-26) أموال نظام التعليم (للكاهن): خانة «اشتراك الشهر» ومجموع الفصل، ومجاميع المرتبات وتاريخ الصرف،
// وإغلاق بيان الاشتراكات في رأس الصفحة. قراءة المبلغ هنا مطابقة لـ EduMoneyText.TryParse في المتحكم.
(function () {
    'use strict';

    // الفارغ = 0، وغير المفهوم = null
    function parse(text) {
        var plain = String(text || '').replace(/[\s‎‏٬]/g, '')
            .replace(/[٠-٩]/g, function (d) { return String(d.charCodeAt(0) - 0x0660); })
            .replace(/[۰-۹]/g, function (d) { return String(d.charCodeAt(0) - 0x06F0); })
            .replace(/٫/g, '.').replace(/،/g, ',');
        if (plain === '') return 0;
        plain = /^\d{1,3}(,\d{3})+(\.\d+)?$/.test(plain) ? plain.replace(/,/g, '') : plain.replace(/,/g, '.');
        if (!/^(\d+(\.\d{0,2})?|\.\d{1,2})$/.test(plain)) return null;
        var value = Number(plain);
        return value <= 10000000 ? value : null;
    }
    function show(value) { return (Math.round(value * 100) / 100).toLocaleString('en-US', { maximumFractionDigits: 2 }); }
    function all(selector) { return Array.prototype.slice.call(document.querySelectorAll(selector)); }
    function sum(inputs) {
        return inputs.reduce(function (total, input) {
            var value = parse(input.value);
            input.classList.toggle('is-invalid', value === null);
            return total + (value || 0);
        }, 0);
    }

    // ---------- اشتراك الشهر في صفحة الفصل: خانة الجدول هي المحفوظة، وخانة البطاقة نسخة منها ----------
    var subForm = document.querySelector('form[data-sub-form]');
    function subInputs() { return all('input[data-sub]'); }
    // (2026-11-28) خانة «مصروفات أخرى» بجوار الاشتراك: مجموع مستقل، وتُحفظ مع الاشتراك وتُسدَّد معه
    function otherInputs() { return all('input[data-oth]'); }
    function moneyInputs() { return subInputs().concat(otherInputs()); }
    function mirrorOf(input) {
        var other = input.hasAttribute('data-oth');
        return document.querySelector('input[' + (other ? 'data-oth-mirror="' + input.getAttribute('data-oth') : 'data-sub-mirror="' + input.getAttribute('data-sub')) + '"]');
    }
    function refreshSubs() {
        function totalOf(inputs) {
            var all = sum(inputs);
            // «الدارسون»: الإجمالي للمعروض فقط (ما يخفيه البحث داخل الجدول لا يُجمع)
            if (subForm && subForm.hasAttribute('data-sub-visible'))
                return sum(inputs.filter(function (input) { var row = input.closest('tr'); return !row || !row.hidden; }));
            return all;
        }
        var total = totalOf(subInputs());
        var others = totalOf(otherInputs());
        all('[data-sub-total]').forEach(function (node) { node.textContent = show(total); });
        all('[data-oth-total]').forEach(function (node) { node.textContent = show(others); });
        var dirty = false;
        moneyInputs().forEach(function (input) {
            var mirror = mirrorOf(input);
            if (mirror) {
                if (mirror.value !== input.value) mirror.value = input.value;
                mirror.classList.toggle('is-invalid', input.classList.contains('is-invalid'));
            }
            if (parse(input.value) !== parse(input.defaultValue)) dirty = true;
        });
        var flag = document.querySelector('[data-sub-dirty]');
        if (flag) flag.hidden = !dirty;
        return { total: total, others: others, dirty: dirty };
    }

    // ---------- المرتبات: المجموعان، وتاريخ اليوم تلقائيًا عند كتابة المصروف (يبقى «تلقائيًا» في المسودة حتى يغيّره المستخدم) ----------
    var salaryForm = document.querySelector('form[data-salary-form]');
    function putTotal(name, value) {
        all('[data-sum-total="' + name + '"]').forEach(function (node) { node.textContent = show(value); });
    }
    function refreshSalaries() {
        var totals = {};
        ['suggested', 'cut', 'paid'].forEach(function (name) {
            totals[name] = sum(all('input[data-sum-part="' + name + '"]'));
            putTotal(name, totals[name]);
        });
        // المستحق = المقترح − الخصومات/الجزاءات (لا يقل عن صفر)، ويظهر باهتًا في خانة المصروف الفارغة
        var due = 0;
        all('[data-salary-due]').forEach(function (node) {
            var id = node.getAttribute('data-salary-due');
            function value(prefix) { var input = salaryForm.querySelector('input[name="' + prefix + '_' + id + '"]'); return input ? parse(input.value) || 0 : 0; }
            var own = Math.max(0, Math.round((value('suggested') - value('cut')) * 100) / 100);
            node.textContent = show(own);
            due += own;
            var paid = salaryForm.querySelector('input[data-salary-paid="' + id + '"]');
            if (!paid) return;
            paid.placeholder = own > 0 ? String(own) : '';
            // ما كتبه زر «كتابة المستحق» يتبع المستحق حتى يعدّله المستخدم بيده
            if (paid.hasAttribute('data-draft-auto')) {
                var next = own > 0 ? String(own) : '';
                if (paid.value !== next) { paid.value = next; autoDate(paid); putTotal('paid', sum(all('input[data-sum-part="paid"]'))); }
            }
        });
        putTotal('due', due);
    }
    function today() {
        var now = new Date();
        return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
    }
    function autoDate(paid) {
        var date = document.querySelector('input[data-salary-date="' + paid.getAttribute('data-salary-paid') + '"]');
        if (!date) return;
        if (parse(paid.value) > 0) {
            if (date.value) return;
            date.value = today();
            date.setAttribute('data-draft-auto', '');
        } else if (date.hasAttribute('data-draft-auto')) {
            date.value = '';
            date.removeAttribute('data-draft-auto');
        } else return;
        // «change» لا «input»: يحدّث عرض التاريخ واسم اليوم (site.js) دون أن يُحسب تعديلًا يدويًا
        date.dispatchEvent(new Event('change', { bubbles: true }));
    }

    document.addEventListener('input', function (event) {
        var target = event.target;
        if (!target || !target.matches) return;
        // ما يكتبه المستخدم بيده لم يعد «ملئًا تلقائيًا»
        if (event.isTrusted) target.removeAttribute('data-draft-auto');
        if (target.matches('input[data-sub-mirror], input[data-oth-mirror]')) {
            var source = document.querySelector(target.hasAttribute('data-oth-mirror')
                ? 'input[data-oth="' + target.getAttribute('data-oth-mirror') + '"]'
                : 'input[data-sub="' + target.getAttribute('data-sub-mirror') + '"]');
            if (!source) return;
            if (event.isTrusted) source.removeAttribute('data-draft-auto');
            source.value = target.value;
            source.dispatchEvent(new Event('input', { bubbles: true }));
        } else if (target.matches('input[data-sub], input[data-oth]')) {
            refreshSubs();
            // الخانة خارج وسم النموذج (مربوطة به بـ form=)، فيُبلَّغ النموذج لتحفظ المسودة التلقائية ما كُتب
            if (subForm) subForm.dispatchEvent(new Event('input'));
        } else if (salaryForm && salaryForm.contains(target)) {
            if (target.matches('input[data-salary-date]')) target.removeAttribute('data-draft-auto');
            if (target.matches('input[data-salary-paid]')) autoDate(target);
            refreshSalaries();
        }
    });

    if (subForm) {
        // استعادة المسودة تحدث قبل هذا السكربت (المؤجل)، فيُحسب المجموع من القيم الحالية
        refreshSubs();
        subForm.addEventListener('submit', function (event) {
            var state = refreshSubs();
            var bad = moneyInputs().filter(function (input) { return parse(input.value) === null; })[0];
            var handed = Number(subForm.getAttribute('data-handed')) || 0;
            var message = bad ? 'يوجد مبلغ غير صحيح. اكتب أرقامًا مثل 50 أو 12.5.'
                : state.dirty && state.total + state.others + 0.001 < handed ? 'مجموع الاشتراكات والمصروفات الأخرى (' + show(state.total + state.others) + ' ج) أقل مما سُدِّد للخدمة بإيصالات (' + show(handed) + ' ج). ألغِ الإيصال أولًا من صفحة «الاشتراكات».' : '';
            if (!message) return;
            event.preventDefault();
            alert(message);
            if (bad) bad.focus();
        });
        // «تعبئة للكل»: الخانات الفارغة فقط، فلا تُستبدل قيمة مكتوبة أو محفوظة. والمملوء يحمل data-draft-auto حتى يعدّله المستخدم
        var fill = document.querySelector('[data-sub-fill]');
        if (fill) fill.addEventListener('click', function () {
            var count = 0;
            subInputs().forEach(function (input) {
                var value = input.getAttribute('data-fill');
                if (!value || input.readOnly || input.value.trim() !== '') return;
                input.value = value;
                input.setAttribute('data-draft-auto', '');
                count++;
            });
            refreshSubs();
            subForm.dispatchEvent(new Event('input'));
            var status = document.querySelector('[data-sub-fill-status]');
            if (status) status.textContent = count ? 'مُلئت ' + count + ' من الخانات الفارغة. راجعها وعدّل ما تريد ثم «حفظ الاشتراكات».' : 'لا توجد خانات فارغة لملئها.';
        });
        document.addEventListener('edu-rows-filtered', refreshSubs);
        // قائمة طويلة (الدارسون): تُرسَل الخانات المتغيّرة وحدها، فلا تُكتب قيمة قديمة فوق ما حفظه غيرك
        if (subForm.hasAttribute('data-sub-changed')) subForm.addEventListener('formdata', function (event) {
            moneyInputs().forEach(function (input) {
                if (parse(input.value) === parse(input.defaultValue)) event.formData.delete(input.name);
            });
        });
        var pay = subForm.querySelector('[data-sub-pay]');
        if (pay) pay.addEventListener('click', function (event) {
            if (!refreshSubs().dirty) return;
            event.preventDefault();
            alert('احفظ الاشتراكات أولًا، ثم اضغط «تسديد للخدمة».');
        });
    }
    if (salaryForm) {
        refreshSalaries();
        // مسودة استُعيد فيها مبلغ مصروف بلا تاريخ: يُكتب تاريخ اليوم كما لو كُتب الآن
        all('input[data-salary-paid]').forEach(function (paid) { if (paid.value !== paid.defaultValue) autoDate(paid); });
        var fillDue = salaryForm.querySelector('[data-salary-fill]');
        if (fillDue) fillDue.addEventListener('click', function () {
            all('input[data-salary-paid]').forEach(function (paid) {
                if (paid.readOnly || paid.value.trim() !== '' || !paid.placeholder) return;
                paid.value = paid.placeholder;
                paid.setAttribute('data-draft-auto', '');
                autoDate(paid);
            });
            refreshSalaries();
            salaryForm.dispatchEvent(new Event('input'));
        });
        salaryForm.addEventListener('submit', function (event) {
            var bad = all('input[data-sum-part]').filter(function (input) { return parse(input.value) === null; })[0];
            if (!bad) return;
            event.preventDefault();
            alert('يوجد مبلغ غير صحيح. اكتب أرقامًا مثل 500 أو 250.5.');
            bad.focus();
        });
    }

    // مبلغ غير مفهوم يُنبَّه إليه قبل الإرسال، فلا تضيع بيانات المصروف المكتوبة
    all('form[data-amount-check]').forEach(function (form) {
        form.addEventListener('submit', function (event) {
            var input = form.querySelector('input[name=amount]');
            if (!input || parse(input.value) > 0) return;
            event.preventDefault();
            alert('اكتب المبلغ رقمًا أكبر من صفر، مثل 150 أو 12.5.');
            input.focus();
        });
    });

    // منع الضغط مرتين على «تسديد»
    var payForm = document.querySelector('form[data-pay-form]');
    if (payForm) payForm.addEventListener('submit', function () {
        var button = payForm.querySelector('button[type=submit]');
        if (button) setTimeout(function () { button.disabled = true; }, 0);
    });
    window.addEventListener('pageshow', function () {
        var button = payForm && payForm.querySelector('button[type=submit]');
        if (button) button.disabled = false;
    });

    // بيان الاشتراكات في الرأس: يُغلق بالضغط خارجه أو بـ Esc
    document.addEventListener('click', function (event) {
        all('.edu-money__box[open]').forEach(function (box) { if (!box.contains(event.target)) box.open = false; });
    });
    document.addEventListener('keydown', function (event) {
        if (event.key !== 'Escape') return;
        all('.edu-money__box[open]').forEach(function (box) { box.open = false; box.querySelector('summary').focus(); });
    });
})();
