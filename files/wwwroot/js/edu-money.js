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
    function mirrorOf(id) { return document.querySelector('input[data-sub-mirror="' + id + '"]'); }
    function refreshSubs() {
        var inputs = subInputs();
        var total = sum(inputs);
        all('[data-sub-total]').forEach(function (node) { node.textContent = show(total); });
        var dirty = false;
        inputs.forEach(function (input) {
            var mirror = mirrorOf(input.getAttribute('data-sub'));
            if (mirror) {
                if (mirror.value !== input.value) mirror.value = input.value;
                mirror.classList.toggle('is-invalid', input.classList.contains('is-invalid'));
            }
            if (parse(input.value) !== parse(input.defaultValue)) dirty = true;
        });
        var flag = document.querySelector('[data-sub-dirty]');
        if (flag) flag.hidden = !dirty;
        return { total: total, dirty: dirty };
    }

    // ---------- المرتبات: المجموعان، وتاريخ اليوم تلقائيًا عند كتابة المصروف (يبقى «تلقائيًا» في المسودة حتى يغيّره المستخدم) ----------
    var salaryForm = document.querySelector('form[data-salary-form]');
    function refreshSalaries() {
        ['suggested', 'paid'].forEach(function (name) {
            var total = sum(all('input[data-sum-part="' + name + '"]'));
            all('[data-sum-total="' + name + '"]').forEach(function (node) { node.textContent = show(total); });
        });
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
        if (target.matches('input[data-sub-mirror]')) {
            var source = document.querySelector('input[data-sub="' + target.getAttribute('data-sub-mirror') + '"]');
            if (!source) return;
            source.value = target.value;
            source.dispatchEvent(new Event('input', { bubbles: true }));
        } else if (target.matches('input[data-sub]')) {
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
            var bad = subInputs().filter(function (input) { return parse(input.value) === null; })[0];
            var handed = Number(subForm.getAttribute('data-handed')) || 0;
            var message = bad ? 'يوجد مبلغ غير صحيح. اكتب أرقامًا مثل 50 أو 12.5.'
                : state.dirty && state.total + 0.001 < handed ? 'مجموع الاشتراكات (' + show(state.total) + ' ج) أقل مما سُدِّد للخدمة بإيصالات (' + show(handed) + ' ج). ألغِ الإيصال أولًا من صفحة «الاشتراكات».' : '';
            if (!message) return;
            event.preventDefault();
            alert(message);
            if (bad) bad.focus();
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
        salaryForm.addEventListener('submit', function (event) {
            var bad = all('input[data-sum-part]').filter(function (input) { return parse(input.value) === null; })[0];
            if (!bad) return;
            event.preventDefault();
            alert('يوجد مبلغ غير صحيح. اكتب أرقامًا مثل 500 أو 250.5.');
            bad.focus();
        });
    }

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
