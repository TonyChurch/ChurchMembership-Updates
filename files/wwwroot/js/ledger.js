// صفحة حساب (قربان / عطاء خدمة): خانات الوارد والمنصرف والرصيد تتحدث مع المبلغ الجاري كتابته
(function () {
    var strip = document.getElementById('ledgerStrip');
    var amount = document.getElementById('entryAmount');
    var kind = document.getElementById('entryKind');
    if (!strip || !amount || !kind) return;

    function money(text) {
        var value = (text || '')
            .replace(/[٠-٩]/g, function (digit) { return '٠١٢٣٤٥٦٧٨٩'.indexOf(digit); })
            .replace(/[٫,]/g, '.')
            .replace(/[^0-9.\-]/g, '');
        return parseFloat(value) || 0;
    }
    function show(value) { return (Math.round(value * 100) / 100).toLocaleString('en-US'); }

    var opening = money(strip.dataset.opening);
    var income = money(strip.dataset.income);
    var spent = money(strip.dataset.spent);
    var label = document.getElementById('entryPartyLabel');

    function refresh() {
        var pending = Math.max(money(amount.value), 0);
        var isIncome = kind.value === 'true';
        // عند تعديل حركة قائمة يُطرح مبلغها الأصلي من جهته حتى لا يُحسب مرتين
        var editing = money(amount.form.dataset.editAmount);
        var editingIncome = amount.form.dataset.editIncome === 'true';
        var currentIncome = income - (editing && editingIncome ? editing : 0) + (isIncome ? pending : 0);
        var currentSpent = spent - (editing && !editingIncome ? editing : 0) + (isIncome ? 0 : pending);
        var net = opening + currentIncome - currentSpent;
        document.getElementById('ledgerIn').textContent = show(currentIncome);
        document.getElementById('ledgerOut').textContent = show(currentSpent);
        document.getElementById('ledgerNet').textContent = show(net);
        document.getElementById('ledgerNetCell').classList.toggle('is-negative', net < 0);
        if (label) label.textContent = isIncome ? 'وارد من' : 'المستفيد / المصروف له';
    }

    amount.addEventListener('input', refresh);
    kind.addEventListener('change', refresh);
    refresh();
})();
