// صفحات الحسابات: الأرصدة عائمة تظهر عند النزول بالصفحة، وتتحدث تلقائيًا بلا إعادة تحميل.
// وفي الصفحات التي لها بطاقات رقمية في الرأس (ul.page-stats) يُرتَّب الرأس: العنوان وأزرار الصفحة في سطر،
// والبطاقات صغيرة تحت بعضها يسارًا ثم فاصل ملوّن ثم التبويبات في صفين.
(function () {
    'use strict';
    var page = document.querySelector('.fin-page');
    if (!page || page.classList.contains('cover-page') || page.querySelector('#finStrip')) return; // صفحة الدفتر لها بطاقاتها العائمة الحية
    var header = page.querySelector(':scope > header.ui-page-header');
    if (!header) return;
    var stats = header.querySelector(':scope > ul.page-stats');
    var nav = page.querySelector(':scope > nav.fin-nav');
    var corner = null;

    // ---------- ترتيب الرأس (عند وجود بطاقات في الرأس) ----------
    if (stats) {
        var main = document.createElement('div');
        main.className = 'fin-head__main';
        Array.prototype.slice.call(header.children).forEach(function (child) { if (child !== stats) main.appendChild(child); });
        corner = document.createElement('div');
        corner.className = 'fin-corner';
        corner.appendChild(stats);
        if (nav) {
            var sep = document.createElement('span');
            sep.className = 'fin-corner__sep';
            sep.setAttribute('aria-hidden', 'true');
            corner.appendChild(sep);
            corner.appendChild(nav);
        }
        header.classList.add('fin-head');
        header.appendChild(main);
        header.appendChild(corner);
    }

    // ---------- مصدر الأرقام ----------
    // الترتيب: بطاقات الرأس، ثم قائمة data-fin-float، ثم شريط الوارد/المنصرف (fin-strip)، ثم خانات المجاميع (fin-total)
    function source() {
        if (stats) {
            return { box: stats, items: Array.prototype.map.call(stats.children, function (li) {
                var s = li.querySelector('strong'), l = li.querySelector('span'), i = li.querySelector('i');
                return s ? { value: s.textContent, label: l ? l.textContent : '', icon: i ? i.className : '', tone: (li.className.match(/ui-chip-stat--(\w+)/) || [])[1] || '' } : null;
            }) };
        }
        var explicit = page.querySelector('[data-fin-float]');
        if (explicit) return { box: explicit, items: Array.prototype.map.call(explicit.children, cellItem) };
        var strip = page.querySelector('.fin-strip');
        if (strip) return { box: strip, items: Array.prototype.map.call(strip.querySelectorAll('.fin-strip__cell'), cellItem) };
        var totals = page.querySelectorAll('.fin-total');
        if (totals.length) return { box: totals[0].parentElement, items: Array.prototype.map.call(totals, cellItem) };
        return null;
    }
    function cellItem(node) {
        var s = node.querySelector('strong'), l = node.querySelector('span');
        if (!s) return null;
        var tone = /--(green|in)\b/.test(node.className) ? 'green' : /--(red|out)\b/.test(node.className) ? 'pink' : /--(blue|net|carry)\b/.test(node.className) ? 'blue' : '';
        return { value: s.textContent, label: l ? l.textContent.replace(/\s+/g, ' ').trim() : '', icon: '', tone: tone };
    }

    var src = source();
    if (!src) return;
    var anchor = corner || src.box;

    // ---------- اللوحة العائمة ----------
    var float = document.createElement('aside');
    float.className = 'fin-float no-print';
    float.setAttribute('aria-label', 'الأرصدة');
    float.hidden = true;
    var list = document.createElement('ul');
    list.className = 'fin-float__list';
    float.appendChild(list);
    var extra = document.createElement('div');
    extra.className = 'fin-float__extra';
    float.appendChild(extra);
    document.body.appendChild(float);
    var template = page.querySelector('template[data-float-extra]');
    if (template) extra.appendChild(template.content.cloneNode(true));

    function renderFloat() {
        src = source() || src;
        list.innerHTML = '';
        src.items.forEach(function (item) {
            if (!item) return;
            var li = document.createElement('li');
            li.className = 'fin-float__item' + (item.tone ? ' fin-float__item--' + item.tone : '');
            li.innerHTML = (item.icon ? '<i class="' + item.icon + '" aria-hidden="true"></i>' : '') + '<b></b><span></span>';
            li.querySelector('b').textContent = item.value;
            li.querySelector('span').textContent = item.label;
            list.appendChild(li);
        });
    }
    renderFloat();

    function updateVisibility() {
        // صفحة مجموعة التسوية: الأرصدة ظاهرة دائمًا على الشاشة العريضة؛ وعلى الموبايل تظهر عند النزول فقط حتى لا تغطي أزرار الرأس وتبويباته
        if (page.hasAttribute('data-float-always') && window.innerWidth >= 992) { float.hidden = false; return; }
        var rect = anchor.getBoundingClientRect();
        float.hidden = !(rect.bottom <= 0 || rect.top >= window.innerHeight);
    }
    window.addEventListener('scroll', updateVisibility, { passive: true, capture: true });
    window.addEventListener('resize', updateVisibility);
    updateVisibility();

    // الأرقام التي تتغير أثناء الكتابة (شريط الدفتر) تنعكس فورًا في اللوحة
    if (window.MutationObserver) {
        new MutationObserver(renderFloat).observe(src.box, { subtree: true, childList: true, characterData: true });
    }

    // ---------- التحديث التلقائي من الخادم ----------
    var busy = false;
    var typingPage = !!page.querySelector('#finStrip'); // صفحة الدفتر: أرقامها تحسب ما كُتب ولم يُحفظ، فلا تُستبدل
    function refresh() {
        if (busy || typingPage || document.hidden || document.querySelector('dialog[open]')) return;
        busy = true;
        fetch(location.href, { credentials: 'same-origin' })
            .then(function (r) { return r.ok && !r.redirected ? r.text() : null; })
            .then(function (html) {
                if (!html) return;
                var doc = new DOMParser().parseFromString(html, 'text/html');
                if (stats) {
                    var fresh = doc.querySelector('.fin-page ul.page-stats');
                    if (fresh) stats.innerHTML = fresh.innerHTML;
                } else {
                    var freshBox = doc.querySelector('[data-fin-float]') || doc.querySelector('.fin-strip') || (doc.querySelector('.fin-total') || {}).parentElement;
                    if (freshBox && src.box) src.box.innerHTML = freshBox.innerHTML;
                }
                Array.prototype.forEach.call(page.querySelectorAll('[data-fin-live]'), function (node) {
                    var other = doc.querySelector('[data-fin-live="' + node.getAttribute('data-fin-live') + '"]');
                    if (other) node.innerHTML = other.innerHTML;
                });
                var handed = document.getElementById('handedAmount'), freshHanded = doc.getElementById('handedAmount');
                if (handed && freshHanded) { handed.dataset.net = freshHanded.dataset.net; handed.dispatchEvent(new Event('input')); }
                renderFloat();
            })
            .catch(function () { })
            .then(function () { busy = false; });
    }
    setInterval(refresh, 20000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) refresh(); });
})();
