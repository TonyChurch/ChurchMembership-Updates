// (2026-11-25) الرأس المضغوط لكل صفحات البرنامج، بنفس روح صفحات الحسابات (finance-float.js ← organizeHead):
// العنوان و«رجوع» يمينًا، وتحتهما سطر أوامر واحد: زر الصفحة الأساسي، ثم الفلاتر، ثم قائمة «أدوات» فيها الأوامر الثانوية،
// وفي الركن: الأرقام صغيرة بلا بطاقات ملونة بعد فاصل ملوّن. وشريط تبويبات الوحدة تحت الرأس شرائح، وفي آخره بحث القائمة.
// يعمل فقط إذا حمل <body> السمة data-compact-head (سطر واحد في Views/Shared/_Layout.cshtml)، والشكل في css/compact-head.css.
// لإيقافه في صفحة: data-no-compact-head على الرأس أو أي عنصر يحيط به. والصفحة تختار زرها الأساسي بـ data-head-main،
// وما يبقى في السطر بـ data-head-keep، وما يدخل «أدوات» دائمًا بـ data-head-tool. لا يغيّر عمل أي زر: ينقله فقط.
(function () {
    'use strict';
    if (!document.body || !document.body.hasAttribute('data-compact-head')) return;

    function run() {
        var main = document.querySelector('.app-main');
        if (!main) return;
        var header = Array.prototype.filter.call(
            main.querySelectorAll('header.ui-page-header, header.page-head--grid, header.members-header, header[data-compact-head]'),
            function (node) { return node.querySelector('h1') && !node.closest('[data-no-compact-head], .modal, dialog, .fin-head, [data-fin-head-done], .edu-head'); })[0];
        if (!header || header.hasAttribute('data-ch-done')) return;
        header.setAttribute('data-ch-done', '');

        var title = header.querySelector(':scope > .ui-page-header__title') || header.querySelector('.ui-page-header__title');
        if (!title || title.parentElement !== header) return; // رأس بشكل خاص: يُترك كما هو
        var titleBox = title.querySelector(':scope > div') || title;

        // ---------- الأرقام: البطاقات الرقمية تصير قائمة أرقام صغيرة في الركن ----------
        var stats = header.querySelector(':scope > ul.ui-chip-stats, :scope > ul.page-stats, :scope > .ui-chip-stats');

        // ---------- «رجوع» تحت العنوان (مكانه المعتاد)، ولا يبقى في سطر الأوامر ----------
        var back = header.querySelector(':scope > .ui-backbar');
        if (back && !titleBox.querySelector('.ui-backbar')) titleBox.appendChild(back);

        // ---------- سطر الأوامر ----------
        var boxes = Array.prototype.filter.call(header.children, function (child) {
            if (child.hidden) return false; // حاوية أخفتها الصفحة عمدًا تبقى كما هي
            if (child.matches('.ui-page-header__actions, .members-header__action, .fin-actions, [data-head-actions]')) return true;
            // حاوية أزرار أخرى (مثل «الموقع الرسمي» في المراكز): كل ما فيها أزرار أو روابط
            return child !== title && child.matches('div') && !child.matches('.ui-backbar, .ui-page-header__title') && child.children.length > 0
                && Array.prototype.every.call(child.children, function (node) { return node.matches('a.ui-btn, button.ui-btn, .page-export'); });
        });
        var row = boxes[0];
        var items = [];
        boxes.forEach(function (box) { Array.prototype.push.apply(items, Array.prototype.slice.call(box.children)); });
        // العناصر الأخرى المباشرة في الرأس (زر تصدير، نموذج فلتر...) تنضم للسطر
        Array.prototype.slice.call(header.children).forEach(function (child) {
            if (child === title || child === stats || boxes.indexOf(child) >= 0) return;
            if (child.matches('script, template, style, link, input[type=hidden], form.d-none, [hidden], .ui-backbar')) return;
            if (child.matches('.page-export, form, a.ui-btn, button.ui-btn, details, .month-picker, select, [data-head-keep], [data-head-tool], [data-head-main]')) items.push(child);
        });
        if (!items.length && !stats && !main.querySelector('form.bro-church')) { header.classList.add('ch-head', 'ch-head--plain'); return; }

        var isBack = function (node) { return node.matches('.ui-backbar, [data-back], .ui-back'); };
        var isKeep = function (node) {
            if (node.matches('[data-head-tool]')) return false;
            return node.matches('[data-head-keep], form:not([method=post]):not([method=POST]), select, .month-picker, .ui-filter, nav, .ui-tabs, .fin-filter, .form-select, .input-group, label, .btn-group')
                || (node.matches('form') && !node.querySelector('button, .ui-btn'))
                || (node.matches('a.ui-btn, button.ui-btn') && node.querySelector('b, .badge')); // زر عليه عدد (تنبيه) يبقى ظاهرًا
        };
        var isMain = function (node) {
            return node.matches('a.ui-btn, button.ui-btn') && !node.matches('.ui-btn--ghost, .ui-btn--excel, .ui-btn--danger, .fin-btn-danger, .page-export__toggle, [data-head-tool]') && !isBack(node);
        };
        items = items.filter(function (node) { return !isBack(node); });
        // أرصدة بسطور ملونة داخل الأوامر (ul.fin-chips / fin-totals) تذهب للركن مع الأرقام
        var cornerTotals = items.filter(function (node) { return node.matches('ul.fin-chips, ul.fin-totals'); });
        items = items.filter(function (node) { return cornerTotals.indexOf(node) < 0; });
        var mainBtn = items.filter(function (node) { return node.matches('[data-head-main]'); })[0]
            || items.filter(function (node) { return !isKeep(node) && isMain(node); })[0];
        var keep = items.filter(function (node) { return node !== mainBtn && isKeep(node); });
        var rest = items.filter(function (node) { return node !== mainBtn && keep.indexOf(node) < 0; });

        if (!row) { row = document.createElement('div'); row.className = 'ui-page-header__actions no-print'; }
        row.classList.add('ch-actions');
        boxes.forEach(function (box) { if (box !== row) box.remove(); });

        var tools = null;
        // أمر ثانوي واحد لا يحتاج قائمة: يبقى في السطر
        if (rest.length > 1 || rest.some(function (node) { return node.matches('[data-head-tool]'); })) {
            tools = document.createElement('details');
            tools.className = 'ch-tools no-print';
            tools.innerHTML = '<summary class="ui-btn"><i class="bi bi-tools" aria-hidden="true"></i> أدوات</summary><div class="ch-tools__menu"></div>';
            var menu = tools.querySelector('.ch-tools__menu');
            rest.forEach(function (node) {
                // زر يرسل نموذجًا يبقى مرتبطًا به بعد نقله
                if (node.matches('button[type=submit], button:not([type])') && !node.getAttribute('form')) {
                    var owner = node.closest('form');
                    if (owner && owner.id) node.setAttribute('form', owner.id);
                }
                if (node.matches('.ui-btn:not(.ui-btn--ghost):not(.ui-btn--danger):not(.fin-btn-danger)')) node.classList.add('ui-btn--ghost');
                menu.appendChild(node);
            });
            menu.addEventListener('click', function (event) {
                // أمر عادي يغلق القائمة؛ أما زر التصدير فيفتح قائمته داخلها
                if (event.target.closest('a, button') && !event.target.closest('.page-export__toggle')) setTimeout(function () { tools.open = false; }, 0);
            });
        } else {
            keep = keep.concat(rest);
        }
        if (mainBtn) row.appendChild(mainBtn);
        keep.forEach(function (node) { row.appendChild(node); });
        if (tools) row.appendChild(tools);

        // ---------- البناء: العمود الرئيسي (العنوان ثم السطر) والركن (فاصل ثم الأرقام) ----------
        var headMain = document.createElement('div');
        headMain.className = 'ch-head__main';
        headMain.appendChild(title);
        if (row.children.length) headMain.appendChild(row); else row.remove();
        var rest2 = Array.prototype.slice.call(header.children).filter(function (child) { return child !== stats; });
        header.classList.add('ch-head');
        header.insertBefore(headMain, header.firstChild);
        rest2.forEach(function (child) { if (child !== headMain && !child.matches('script, template, style, link')) headMain.appendChild(child); });
        var corner = null;
        function separator() {
            var sep = document.createElement('span');
            sep.className = 'ch-corner__sep no-print';
            sep.setAttribute('aria-hidden', 'true');
            return sep;
        }
        function ensureCorner() {
            if (corner) return corner;
            corner = document.createElement('div');
            corner.className = 'ch-corner';
            corner.appendChild(separator());
            header.appendChild(corner);
            return corner;
        }
        if (stats) {
            ensureCorner().appendChild(stats);
            stats.classList.add('ch-stats');
            if (stats.children.length > 4) stats.classList.add('ch-stats--many');
            if (stats.children.length > 8) stats.classList.add('ch-stats--lots');
        }
        cornerTotals.forEach(function (list) { list.classList.add('ch-totals'); ensureCorner().appendChild(list); });

        // ---------- صفحات إخوة الرب: نفس ترتيب الحسابات ----------
        // شريط «ما تتحمله الكنيسة» الوردي (BrothersChurchBar) يتوزع: «رجوع» تحت العنوان، والمبلغ في الركن،
        // واختيار الشهر والسنة (النموذج نفسه بخاناته المخفية) في سطر الأوامر؛ وتبويبات إخوة الرب في الركن بعد الفاصل.
        var broBar = main.querySelector('form.bro-church');
        // على الموبايل صفحة «الخدمات المقدمة» تخفي رأسها كله وتبدأ بالنموذج (طلب 2026-11-18)، فيبقى الشريط والشارة مكانهما
        var bsvMobile = header.closest('.bsv:not(.brp)') && window.matchMedia('(max-width: 767.98px)').matches;
        if (broBar && header.closest('.fin-page') && !bsvMobile) {
            var broBack = broBar.querySelector('a.ui-back');
            if (broBack) {
                var backBox = document.createElement('div');
                backBox.className = 'ui-backbar ui-backbar--title no-print';
                broBack.classList.remove('ui-back--card');
                backBox.appendChild(broBack);
                titleBox.querySelectorAll('.ui-backbar').forEach(function (old) { old.remove(); });
                titleBox.appendChild(backBox);
            }
            var broTotal = broBar.querySelector('.bro-church__total');
            if (broTotal) {
                broTotal.classList.add('ch-bro-total');
                var holder = ensureCorner();
                holder.insertBefore(broTotal, holder.children[1] || null);
            }
            broBar.classList.add('ch-bro-pick');
            // الشهر والسنة أول سطر الأوامر يمينًا (طلب المستخدم 2026-11-25)
            if (broBar.querySelector('select')) {
                if (!row.parentElement) headMain.appendChild(row);
                row.insertBefore(broBar, row.firstChild);
            } else broBar.hidden = true;
            // شارة «تتحمله الكنيسة» الحية في نموذج «تسجيل خدمة» تأخذ مكان رقم «تتحمله الكنيسة» في الركن،
            // وتبقى العنصر نفسه فيحدّثها سكربت الصفحة أثناء الكتابة
            var liveTotal = main.querySelector('form .bsv-church-total[data-church-total]');
            if (liveTotal && stats) {
                var liveItem = document.createElement('li');
                liveItem.className = 'ch-live-total';
                var oldItem = Array.prototype.filter.call(stats.children, function (li) { var label = li.querySelector('span'); return label && label.textContent.trim() === 'تتحمله الكنيسة'; })[0];
                liveItem.appendChild(liveTotal);
                if (oldItem) { stats.insertBefore(liveItem, oldItem); oldItem.remove(); } else stats.appendChild(liveItem);
            }
            // المبلغ والأرقام عمود واحد، فيبقى الركن بجوار العنوان ولا ينزل سطرًا
            if (broTotal && stats) {
                var stack = document.createElement('div');
                stack.className = 'ch-corner__stack';
                broTotal.parentElement.insertBefore(stack, broTotal);
                stack.appendChild(broTotal);
                stack.appendChild(stats);
            }
            var broNav = main.querySelector('nav.fin-nav[aria-label="إخوة الرب"]');
            if (broNav) {
                var holder2 = ensureCorner();
                if (holder2.children.length > 1) holder2.appendChild(separator());
                holder2.appendChild(broNav);
                broNav.classList.add('ch-corner-nav');
            }
            header.classList.add('ch-head--bro');
        }

        // ---------- شريط تبويبات الوحدة تحت الرأس: شرائح، وفي آخره بحث القائمة ----------
        var tabs = null;
        var next = header.nextElementSibling;
        for (var step = 0; next && step < 4; step++, next = next.nextElementSibling) {
            if (next.matches('nav.ui-tabs, nav.sa-section-nav, [data-compact-tabs]')) { tabs = next; break; }
            if (!next.matches('script, link, style, .ui-flash, .alert, template, input[type=hidden]')) break;
        }
        if (tabs) tabs.classList.add('ch-tabs');

        document.addEventListener('click', function (event) {
            Array.prototype.forEach.call(document.querySelectorAll('.ch-tools[open]'), function (open) { if (!open.contains(event.target)) open.open = false; });
        });

        function moveSearch() {
            if (!tabs) return;
            var searches = main.querySelectorAll('.ui-auto-search');
            if (searches.length !== 1 || searches[0].classList.contains('ch-tabs__search')) return;
            tabs.appendChild(searches[0]);
            searches[0].classList.add('ch-tabs__search');
        }
        moveSearch();
        window.addEventListener('load', moveSearch);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
})();
