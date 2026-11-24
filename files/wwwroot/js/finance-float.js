// صفحات الحسابات: الأرصدة عائمة تظهر عند النزول بالصفحة، وتتحدث تلقائيًا بلا إعادة تحميل.
// وفي الصفحات التي لها بطاقات رقمية في الرأس (ul.page-stats) يُرتَّب الرأس: العنوان وأزرار الصفحة في سطر،
// والبطاقات صغيرة تحت بعضها يسارًا ثم فاصل ملوّن ثم التبويبات في صفين.
(function () {
    'use strict';
    var page = document.querySelector('.fin-page');
    if (!page) return;
    var header = page.querySelector(':scope > header.ui-page-header');
    if (!header) return;
    var stats = header.querySelector(':scope > ul.page-stats');
    // الأرصدة في ركن الرأس مكان البطاقات: داخل الرأس، أو قائمة الصفحة المعلَّمة data-fin-corner
    // قائمة الصفحة: تُنسخ إلى الركن على الشاشة، ويبقى أصلها في مكانه للطباعة فقط (فلا يتغير شكل الورق)
    var headTotals = header.querySelector(':scope > ul.fin-totals');
    var bodyTotals = headTotals ? null : page.querySelector('[data-fin-corner]');
    // شريط الخانات (fin-strip) يُحوَّل إلى أرصدة بنفس الشكل، ويتبعه أثناء الكتابة
    function cornerCopy() {
        if (!bodyTotals.classList.contains('fin-strip')) return bodyTotals.innerHTML;
        return Array.prototype.map.call(bodyTotals.querySelectorAll('.fin-strip__cell'), function (cell) {
            var tone = cell.classList.contains('is-negative') || /--out\b/.test(cell.className) ? 'red' : /--in\b/.test(cell.className) ? 'green' : /--carry\b/.test(cell.className) ? 'gold' : 'blue';
            var label = cell.querySelector('span'), value = cell.querySelector('strong');
            return '<li class="fin-total fin-total--' + tone + '"><span>' + (label ? label.innerHTML : '') + '</span><strong>' + (value ? value.innerHTML : '') + '</strong></li>';
        }).join('');
    }
    if (bodyTotals) {
        headTotals = document.createElement('ul');
        headTotals.className = 'fin-totals fin-totals--clone';
        headTotals.setAttribute('aria-label', bodyTotals.getAttribute('aria-label') || 'الأرصدة');
        headTotals.innerHTML = cornerCopy();
        bodyTotals.classList.add('fin-totals--print-only');
        if (window.MutationObserver) new MutationObserver(function () { headTotals.innerHTML = cornerCopy(); }).observe(bodyTotals, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['class'] });
    }
    var nav = page.querySelector(':scope > nav.fin-nav');
    var corner = null;

    // ---------- ترتيب الرأس: نفس الشكل في كل صفحات الحسابات ----------
    // العنوان وأزرار الصفحة يمينًا، وفي الركن: البطاقات الرقمية (إن وُجدت) ثم فاصل ملوّن ثم تبويبات الحسابات
    if (stats || nav) {
        var main = document.createElement('div');
        main.className = 'fin-head__main';
        Array.prototype.slice.call(header.children).forEach(function (child) { if (child !== stats && child !== headTotals) main.appendChild(child); });
        corner = document.createElement('div');
        corner.className = 'fin-corner';
        if (stats) corner.appendChild(stats);
        if (headTotals) corner.appendChild(headTotals);
        if (nav) {
            var sep = document.createElement('span');
            sep.className = 'fin-corner__sep no-print';
            sep.setAttribute('aria-hidden', 'true');
            corner.appendChild(sep);
            corner.appendChild(nav);
        }
        header.classList.add('fin-head');
        header.appendChild(main);
        header.appendChild(corner);
    }

    // ---------- (2026-11-24) نفس شكل رأس صفحة الدفاتر في كل صفحات الحسابات ----------
    // تحت العنوان سطر واحد: تبويب القسم الحالي، ثم زر الصفحة الأساسي، ثم الفلاتر (الشهر/السنة/الحالة)، ثم قائمة «أدوات»
    // فيها كل الأوامر الثانوية (التصدير والطباعة والتعديل والحذف...). «رجوع» بجوار العنوان، وخانة البحث في شريط الصفحات.
    // الصفحة تتحكم بالسمات: data-fin-main (زرها الأساسي)، data-fin-keep (يبقى في السطر)، data-fin-corner (أرصدة الركن).
    (function organizeHead() {
        var headMain = header.querySelector(':scope > .fin-head__main');
        if (!headMain || header.hasAttribute('data-fin-head-done')) return;
        header.setAttribute('data-fin-head-done', '');
        var title = headMain.querySelector(':scope > .ui-page-header__title');
        var titleBox = title ? (title.querySelector(':scope > div') || title) : null;

        // «رجوع» بجوار العنوان (زر الصفحة، أو زر اختيار الشهر)
        if (titleBox && !titleBox.querySelector('[data-back]')) {
            var bar = headMain.querySelector('.ui-backbar');
            var periodBack = headMain.querySelector('a.ui-back--period');
            if (!bar && periodBack) { bar = document.createElement('div'); bar.className = 'ui-backbar no-print'; bar.appendChild(periodBack); }
            if (bar) { bar.classList.add('ui-backbar--title'); titleBox.appendChild(bar); }
        }
        headMain.querySelectorAll('a.ui-back--period').forEach(function (extra) { if (!extra.closest('.ui-page-header__title')) extra.remove(); });

        // سطر الأوامر: يُجمع فيه كل ما في حاويات الأوامر بالرأس
        var boxes = Array.prototype.slice.call(headMain.querySelectorAll(':scope > .fin-actions, :scope > .ui-page-header__actions'));
        var row = headMain.querySelector(':scope > .fin-books-actions') || boxes[0];
        if (!row) { row = document.createElement('div'); row.className = 'fin-actions no-print'; headMain.appendChild(row); }
        row.classList.add('fin-actions', 'fin-books-actions');
        var items = [];
        boxes.forEach(function (box) { Array.prototype.push.apply(items, Array.prototype.slice.call(box.children)); if (box !== row) box.remove(); });
        if (!boxes.length) Array.prototype.push.apply(items, Array.prototype.slice.call(row.children));
        headMain.querySelectorAll(':scope > .page-export').forEach(function (node) { items.push(node); });

        // تبويب القسم الحالي يخرج من شريط التبويبات إلى أول السطر
        var tab = row.querySelector(':scope > .fin-nav__item.is-active');
        if (!tab && nav) tab = nav.querySelector('a.fin-nav__item.is-active');

        var isKeep = function (node) {
            return node.matches('[data-fin-keep], .fin-nav__item, .fin-filter, .fin-year, .month-picker, .month-picker__print, .fin-period, .fin-btn-back, .fin-tools')
                || (node.matches('a.ui-btn--ghost') && !node.textContent.trim());
        };
        var isMain = function (node) {
            return node.matches('.ui-btn:not(.ui-btn--ghost)') && !node.matches('.fin-btn-back, .fin-btn-danger');
        };
        var main = items.filter(function (node) { return node.matches('[data-fin-main]'); })[0]
            || items.filter(function (node) { return !isKeep(node) && isMain(node); })[0];
        var keep = items.filter(function (node) { return node !== main && node !== tab && isKeep(node); });
        var rest = items.filter(function (node) { return node !== main && node !== tab && keep.indexOf(node) < 0 && !node.matches('form.d-none, script, template'); });

        // قائمة «أدوات» واحدة: الموجودة في السطر، أو التي في شريط صفحات المطرانية، أو جديدة
        var tools = keep.filter(function (node) { return node.matches('.fin-tools'); })[0];
        if (tools) keep.splice(keep.indexOf(tools), 1);
        var stepTools = page.querySelector(':scope > nav.fin-steps .fin-tools');
        if (!tools && stepTools) tools = stepTools;
        else if (tools && stepTools) {
            var ownMenu = tools.querySelector('.fin-tools__menu');
            stepTools.querySelectorAll('.fin-tools__menu > a').forEach(function (link) { if (ownMenu) ownMenu.appendChild(link); });
            stepTools.remove();
        }
        if (!tools) {
            tools = document.createElement('details');
            tools.innerHTML = '<summary class="ui-btn"><i class="bi bi-tools" aria-hidden="true"></i> أدوات</summary><div class="fin-tools__menu"></div>';
        }
        tools.classList.add('fin-tools', 'fin-tools--bulk', 'no-print');
        var summary = tools.querySelector('summary');
        if (summary) {
            summary.classList.remove('ui-btn--ghost');
            var icon = summary.querySelector('i');
            if (icon) icon.className = 'bi bi-tools';
        }
        var menu = tools.querySelector('.fin-tools__menu');
        var slot = tools.querySelector('[data-fin-tools-slot]');
        if (!slot) { slot = document.createElement('div'); slot.className = 'fin-tools__moved'; slot.setAttribute('data-fin-tools-slot', ''); menu.appendChild(slot); }
        rest.forEach(function (node) {
            // زر يرسل نموذجًا يبقى مرتبطًا به بعد نقله
            if (node.matches('button[type=submit]') && !node.getAttribute('form')) {
                var owner = node.closest('form');
                if (owner && owner.id) node.setAttribute('form', owner.id);
            }
            if (node.matches('.ui-btn:not(.ui-btn--ghost):not(.fin-btn-danger)')) node.classList.add('ui-btn--ghost');
            slot.appendChild(node);
        });

        if (tab) { tab.classList.add('is-active'); row.appendChild(tab); }
        if (main) row.appendChild(main);
        keep.forEach(function (node) { row.appendChild(node); });
        if (menu.querySelector(':scope > :not(.fin-tools__moved)') || slot.children.length) row.appendChild(tools); else tools.remove();
        if (!row.children.length) row.remove();

        document.addEventListener('click', function (event) {
            Array.prototype.forEach.call(document.querySelectorAll('.fin-tools[open]'), function (open) { if (!open.contains(event.target)) open.open = false; });
        });
    })();

    // خانة «ابحث في هذه القائمة» (يضيفها site.js) في آخر شريط صفحات المطرانية، أو في شريط تحت الرأس
    function moveSearch() {
        var searches = page.querySelectorAll('.ui-auto-search');
        if (searches.length !== 1 || searches[0].classList.contains('fin-steps__search')) return;
        var steps = page.querySelector(':scope > nav.fin-steps');
        if (!steps) {
            steps = document.createElement('div');
            steps.className = 'fin-steps fin-steps--tabs fin-searchbar no-print';
            header.after(steps);
        }
        steps.appendChild(searches[0]);
        searches[0].classList.add('fin-steps__search');
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', moveSearch); else moveSearch();
    window.addEventListener('load', moveSearch);

    // الغلاف وملف المطرانية (صفحات طباعة) وصفحة الدفتر (لها بطاقاتها العائمة الحية): بلا لوحة عائمة
    if (page.classList.contains('cover-page') || page.querySelector('#finStrip')) return;

    // ---------- مصدر الأرقام ----------
    // الترتيب: بطاقات الرأس، ثم قائمة data-fin-float، ثم شريط الوارد/المنصرف (fin-strip)، ثم خانات المجاميع (fin-total)
    function source() {
        if (stats) {
            return { box: stats, items: Array.prototype.map.call(stats.children, function (li) {
                var s = li.querySelector('strong'), l = li.querySelector('span'), i = li.querySelector('i');
                return s ? { value: s.textContent, label: l ? l.textContent : '', icon: i ? i.className : '', tone: (li.className.match(/ui-chip-stat--(\w+)/) || [])[1] || '' } : null;
            }) };
        }
        if (headTotals) return { box: headTotals, items: Array.prototype.map.call(headTotals.children, cellItem) };
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
    // بعيدًا عن رأس الصفحة: أعلى الأزرار العائمة (الآلة الحاسبة والمسودة و«دفتر جديد») أسفل يسار الصفحة
    var fabs = document.querySelector('.fin-fabs');
    if (fabs) fabs.insertBefore(float, fabs.firstChild); else document.body.appendChild(float);
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
        // على الكمبيوتر: الأرصدة في ركن الأزرار العائمة أسفل اليسار، فتظهر دائمًا
        if (float.parentElement && float.parentElement.classList.contains('fin-fabs') && window.innerWidth >= 992) { float.hidden = false; return; }
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
                } else if (headTotals) {
                    var freshTotals = doc.querySelector(bodyTotals ? '[data-fin-corner]' : '.fin-page > header > ul.fin-totals');
                    if (freshTotals && bodyTotals) bodyTotals.innerHTML = freshTotals.innerHTML; // النسخة في الركن تتبعه تلقائيًا
                    else if (freshTotals) headTotals.innerHTML = freshTotals.innerHTML;
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
