// صفحات الحسابات: (1) رأس مرتب: العنوان وأزرار الصفحة في سطر واحد، والبطاقات الرقمية والتبويبات في الجهة اليسرى
// (2) الأرصدة عائمة تظهر عند النزول بالصفحة، وتتحدث تلقائيًا بلا إعادة تحميل (تقرأ الصفحة نفسها كل 20 ثانية).
(function () {
    'use strict';
    var page = document.querySelector('.fin-page');
    if (!page || page.classList.contains('cover-page')) return;
    var header = page.querySelector(':scope > header.ui-page-header');
    var stats = header && header.querySelector(':scope > ul.page-stats');
    if (!header || !stats) return;
    var nav = page.querySelector(':scope > nav.fin-nav');

    // ---------- ترتيب الرأس ----------
    var main = document.createElement('div');
    main.className = 'fin-head__main';
    Array.prototype.slice.call(header.children).forEach(function (child) { if (child !== stats) main.appendChild(child); });
    var corner = document.createElement('div');
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

    // ---------- الأرصدة العائمة ----------
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
        list.innerHTML = '';
        Array.prototype.forEach.call(stats.children, function (item) {
            var strong = item.querySelector('strong'), label = item.querySelector('span'), icon = item.querySelector('i');
            if (!strong) return;
            var li = document.createElement('li');
            li.className = item.className.replace('ui-chip-stat', 'fin-float__item');
            li.innerHTML = '<i class="' + (icon ? icon.className : '') + '" aria-hidden="true"></i><b></b><span></span>';
            li.querySelector('b').textContent = strong.textContent;
            li.querySelector('span').textContent = label ? label.textContent : '';
            list.appendChild(li);
        });
    }
    renderFloat();

    function updateVisibility() {
        float.hidden = corner.getBoundingClientRect().bottom > 0;
    }
    window.addEventListener('scroll', updateVisibility, { passive: true, capture: true });
    window.addEventListener('resize', updateVisibility);
    updateVisibility();

    // ---------- التحديث التلقائي ----------
    var busy = false;
    function refresh() {
        if (busy || document.hidden || document.querySelector('dialog[open]')) return;
        busy = true;
        fetch(location.href, { credentials: 'same-origin' })
            .then(function (r) { return r.ok && !r.redirected ? r.text() : null; })
            .then(function (html) {
                if (!html) return;
                var doc = new DOMParser().parseFromString(html, 'text/html');
                var fresh = doc.querySelector('.fin-page ul.page-stats');
                if (fresh) { stats.innerHTML = fresh.innerHTML; renderFloat(); }
                Array.prototype.forEach.call(page.querySelectorAll('[data-fin-live]'), function (node) {
                    var other = doc.querySelector('[data-fin-live="' + node.getAttribute('data-fin-live') + '"]');
                    if (other) node.innerHTML = other.innerHTML;
                });
                var handed = document.getElementById('handedAmount'), freshHanded = doc.getElementById('handedAmount');
                if (handed && freshHanded) { handed.dataset.net = freshHanded.dataset.net; handed.dispatchEvent(new Event('input')); }
            })
            .catch(function () { })
            .then(function () { busy = false; });
    }
    setInterval(refresh, 20000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) refresh(); });
})();
