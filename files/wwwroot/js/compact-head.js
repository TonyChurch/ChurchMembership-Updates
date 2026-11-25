// (2026-11-25) الرأس المضغوط لكل صفحات البرنامج، بنفس روح صفحات الحسابات (finance-float.js ← organizeHead):
// العنوان و«رجوع» يمينًا، وتحتهما سطر أوامر واحد: زر الصفحة الأساسي، ثم الفلاتر، ثم قائمة «أدوات» فيها الأوامر الثانوية،
// وفي الركن: الأرقام صغيرة بلا بطاقات ملونة بعد فاصل ملوّن. وشريط تبويبات الوحدة تحت الرأس شرائح، وفي آخره بحث القائمة.
// يعمل فقط إذا حمل <body> السمة data-compact-head (سطر واحد في Views/Shared/_Layout.cshtml)، والشكل في css/compact-head.css.
// لإيقافه في صفحة: data-no-compact-head على الرأس أو أي عنصر يحيط به. والصفحة تختار زرها الأساسي بـ data-head-main،
// وما يبقى في السطر بـ data-head-keep، وما يدخل «أدوات» دائمًا بـ data-head-tool. لا يغيّر عمل أي زر: ينقله فقط.
(function () {
    'use strict';
    if (!document.body || !document.body.hasAttribute('data-compact-head')) return;

    // (2026-11-25) تذكّر آخر تبويب أو فلتر لكل صفحة: يُستعاد فقط إذا فُتحت الصفحة بلا query string (من القائمة الجانبية مثلًا)
    var MEMORY_PREFIX = 'ch-last:';
    var MEMORY_SKIP = /^(q|search|term|page|month|year|date|day|week|from|to|start|end|period|id|memberid|familyid|servantid|returnurl|suggest|print|nc|range)$/i;
    function memoryKey(path) { return MEMORY_PREFIX + String(path || location.pathname).toLowerCase().replace(/\/index$/, '').replace(/\/$/, ''); }
    function cleanQuery(search) {
        var params = new URLSearchParams(search || '');
        var kept = new URLSearchParams();
        params.forEach(function (value, key) {
            if (value === '' || MEMORY_SKIP.test(key)) return;
            // قيمة القائمة الافتراضية (أول اختيار، مثل الترتيب بالاسم) لا تُحفظ
            var select = Array.prototype.filter.call(document.querySelectorAll('.app-main select'), function (node) { return node.name === key; })[0];
            if (select && select.options.length && select.options[0].value === value) return;
            kept.append(key, value);
        });
        return kept.toString();
    }
    function remember(path, search) {
        try {
            var query = cleanQuery(search);
            if (query) localStorage.setItem(memoryKey(path), query); else localStorage.removeItem(memoryKey(path));
        } catch (error) { /* تصفح خاص أو تخزين ممنوع */ }
    }
    // التبويب أو الفلتر يُحفظ فقط عند تغييره من الصفحة نفسها (رابط تبويب، نموذج بحث، قائمة تُرسل نفسها)،
    // و«الكل» (نفس الصفحة بلا فلتر) يمسح المحفوظ. الحسابات والتعليم والمستثنى من الرأس المضغوط خارج ذلك.
    function memoryPage() {
        if (location.hash || document.querySelector('[data-no-remember]')) return false;
        var head = document.querySelector('.app-main header.ui-page-header, .app-main header.page-head--grid, .app-main header.members-header, .app-main header[data-compact-head]');
        return !!head && !head.closest('[data-no-compact-head], .fin-page, .fin-head, .edu-head') && !document.querySelector('.app-main .edu-head, .app-main .fin-head');
    }
    function handleMemory() {
        if (!memoryPage()) return false;
        var same = false;
        try {
            var from = document.referrer ? new URL(document.referrer) : null;
            same = !!from && from.origin === location.origin && memoryKey(from.pathname) === memoryKey();
        } catch (error) { same = false; }
        var flash = document.querySelector('.app-main .ui-flash, .app-main .alert, .app-main .members-flash, .app-main [role=alert], .validation-summary-errors');
        if (location.search) { if (same) remember(location.pathname, location.search); return false; }
        if (same) { if (!flash) remember(location.pathname, ''); return false; }
        // رسالة «تم الحفظ» تظهر مرة واحدة: لا نعيد التحميل فوقها، ولا عند الرجوع بأزرار المتصفح
        if (flash) return false;
        try {
            var nav = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
            if (nav && nav.type === 'back_forward') return false;
            var saved = localStorage.getItem(memoryKey());
            if (!saved) return false;
            location.replace(location.pathname + '?' + saved);
            return true;
        } catch (error) { return false; }
    }
    if (handleMemory()) return;

    function run() {
        var main = document.querySelector('.app-main');
        if (!main) return;
        organizeProfile(main);
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
        if (titleBox !== title) titleBox.classList.add('ch-title-box');
        hideDescription(header, titleBox);

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
            // سطر واحد: الشهر والسنة ثم «تكرار لشهر آخر» ثم «أدوات» (طلب المستخدم 2026-11-25 مساءً؛ أُلغي السطر المستقل)
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
        // (2026-11-25) تبويبات الوحدة في الركن بعد الفاصل كما في الحسابات وإخوة الرب: شبكة من عمودين، أو ثلاثة للكثيرة،
        // وعلى الموبايل سطر واحد يُسحب أفقيًا. شريط فيه غير الروابط (نموذج، بحث) يبقى تحت الرأس كما كان.
        var cornerTabs = false;
        if (tabs && !tabs.matches('[data-tabs-below]')) {
            var links = Array.prototype.filter.call(tabs.children, function (node) { return !node.matches('script, template'); });
            if (links.length >= 2 && links.every(function (node) { return node.matches('a[href]'); })) {
                var holder3 = ensureCorner();
                if (holder3.children.length > 1) holder3.appendChild(separator());
                holder3.appendChild(tabs);
                tabs.classList.remove('ui-card');
                tabs.classList.add('ch-corner-tabs');
                if (links.length > 6) tabs.classList.add('ch-corner-tabs--3');
                header.classList.add('ch-head--tabs');
                cornerTabs = true;
            }
        }
        if (tabs && !cornerTabs) tabs.classList.add('ch-tabs');
        if (cornerTabs) tabs = null; // بحث القائمة يبقى مكانه فوق الجدول

        linkStats(main, header, stats);
        addFab(main, mainBtn);

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

    // ---------- (2026-11-25) سطر الوصف تحت العنوان يُخفى، وزر ⓘ بجوار العنوان يُظهره ----------
    // مفتاح الإطفاء: السمة data-ch-hide-desc على <body> في Views/Shared/_Layout.cshtml (احذفها فيعود الوصف ظاهرًا كما كان).
    function hideDescription(header, titleBox) {
        if (!document.body.hasAttribute('data-ch-hide-desc') || titleBox.classList.contains('ch-title-box') === false) return;
        var h1 = titleBox.querySelector(':scope > h1');
        var descs = Array.prototype.filter.call(titleBox.children, function (node) { return node.matches('p') && node.textContent.trim(); });
        if (!h1 || !descs.length) return;
        var text = descs.map(function (node) { return node.textContent.trim().replace(/\s+/g, ' '); }).join(' — ');
        descs.forEach(function (node) { node.classList.add('ch-desc'); });
        var toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'ch-desc-toggle no-print';
        toggle.title = text;
        toggle.setAttribute('aria-label', 'عن هذه الصفحة: ' + text);
        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('data-labels-skip', '');
        toggle.innerHTML = '<i class="bi bi-info-circle" aria-hidden="true"></i>';
        toggle.addEventListener('click', function () {
            var open = header.classList.toggle('ch-desc-open');
            toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        });
        h1.insertAdjacentElement('afterend', toggle);
        header.classList.add('ch-head--nodesc');
    }

    // ---------- (2026-11-25) زر «إضافة» عائم أسفل اليسار: وكيل لزر الصفحة الأساسي، يظهر حين يختفي الأصل أثناء النزول ----------
    function looksAdd(node) {
        var text = (node.textContent || '').replace(/\s+/g, ' ').trim();
        return /إضافة|أضف|جديد|جديدة|تسجيل/.test(text) || !!node.querySelector('i[class*="plus"], i[class*="-add"]');
    }
    function addFab(main, mainBtn) {
        if (document.querySelector('.fin-fabs, .edu-fabs, .ch-fab, [data-no-fab]')) return;
        var target = mainBtn && mainBtn.matches('a.ui-btn, button.ui-btn') && looksAdd(mainBtn) ? mainBtn
            : main.querySelector('[data-shortcut-new], .members-table-bar__add');
        if (!target || !looksAdd(target) || target.closest('.modal, dialog, .ch-tools, [hidden]') || !('IntersectionObserver' in window)) return;
        var label = (target.textContent || '').replace(/\s+/g, ' ').trim();
        if (!label || label.length > 40) return;
        var fab = document.createElement('button');
        fab.type = 'button';
        fab.className = 'ch-fab no-print';
        fab.setAttribute('data-labels-skip', '');
        fab.title = target.getAttribute('title') || label;
        var icon = target.querySelector('i.bi');
        fab.innerHTML = (icon ? '<i class="' + icon.className + '" aria-hidden="true"></i>' : '<i class="bi bi-plus-lg" aria-hidden="true"></i>') + '<span></span>';
        fab.querySelector('span').textContent = label;
        fab.hidden = true;
        // الضغط يضغط الزر الأصلي نفسه، فيبقى عمله كما هو (رابط، نافذة، لوحة تسجيل سريع)
        fab.addEventListener('click', function () { target.click(); });
        document.body.appendChild(fab);
        document.body.classList.add('has-ch-fab');
        new IntersectionObserver(function (entries) {
            var entry = entries[entries.length - 1];
            fab.hidden = entry.isIntersecting || target.offsetParent === null;
        }).observe(target);
    }

    // ---------- (2026-11-25) رقم في الركن يصفّي القائمة إذا كان في الصفحة رابط فلتر بنفس الاسم ----------
    // كلمات النص بلا أرقام ولا «ال» ولا اختلاف الهمزات والتاء المربوطة: «نشطة» = «النشطة»، «متابعة» ⊂ «تحت المتابعة»
    function words(value) {
        return String(value || '').replace(/[\d٠-٩۰-۹]+/g, ' ').replace(/[:()«»"'.,،\-–—•·/]+/g, ' ')
            .replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي')
            .split(/\s+/).filter(Boolean).map(function (word) { return word.length > 4 && word.indexOf('ال') === 0 ? word.slice(2) : word; });
    }
    function linkStats(main, header, stats) {
        if (!stats) return;
        // المرشحات: روابط لنفس الصفحة بفلتر (query) خارج الجداول، مثل تبويبات القائمة وشرائح الفلاتر
        var links = Array.prototype.filter.call(main.querySelectorAll('a[href*="?"]'), function (link) {
            if (header.contains(link) && !link.closest('.ch-corner-tabs')) return false;
            if (link.closest('table, .modal, dialog, .ch-tools, form') || /إضافة|حذف|تصدير|طباعة/.test(link.textContent)) return false;
            try { return new URL(link.href, location.href).pathname.toLowerCase() === location.pathname.toLowerCase(); } catch (error) { return false; }
        });
        Array.prototype.forEach.call(stats.querySelectorAll(':scope > li.ui-chip-stat'), function (item) {
            if (item.querySelector('a[href]')) return;
            var own = item.getAttribute('data-head-filter');
            var labelNode = item.querySelector('span');
            var label = words(labelNode && labelNode.textContent);
            var link = null;
            if (own) link = { href: own };
            else if (label.length) {
                var found = links.filter(function (candidate) {
                    var title = words(candidate.getAttribute('title'));
                    // التلميح يُعتمد فقط إن كان اسمًا قصيرًا («أسر تحت المتابعة») لا جملة شرح
                    var have = words(candidate.textContent).concat(title.length <= 4 ? title : []);
                    return label.every(function (word) { return have.indexOf(word) >= 0; });
                });
                // أكثر من فلتر مختلف بنفس الكلمات: لا نخمّن
                var targets = found.map(function (candidate) { return candidate.href; }).filter(function (href, index, all) { return all.indexOf(href) === index; });
                if (targets.length === 1) link = found[0];
            }
            if (!link) return;
            item.classList.add('ch-stat-link');
            item.setAttribute('role', 'link');
            item.setAttribute('tabindex', '0');
            if (!item.title) item.title = 'اعرض: ' + (labelNode ? labelNode.textContent.trim() : '');
            if (link.classList && (link.classList.contains('is-active') || link.getAttribute('aria-current'))) item.classList.add('is-active');
            var go = function () { location.href = link.href; };
            item.addEventListener('click', go);
            item.addEventListener('keydown', function (event) { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); go(); } });
        });
    }

    // ---------- (2026-11-25) ملف الأسرة والعضو والخادم: «رجوع» بجوار الاسم، وأوامر الملف في «أدوات» ----------
    // الحاوية تحمل data-head-profile، وكل أمر يدخل «أدوات» يحمل data-head-tool؛ والأزرار تُنقل ولا تُنسخ.
    function organizeProfile(main) {
        var box = main.querySelector('[data-head-profile]');
        if (!box || box.hasAttribute('data-ch-done')) return;
        box.setAttribute('data-ch-done', '');
        var name = main.querySelector('.profile-hero__name');
        var pageBack = main.querySelector(':scope > .ui-page > .ui-backbar, :scope > .ui-backbar');
        if (name && pageBack) { pageBack.classList.add('ch-profile-back'); name.appendChild(pageBack); }
        var items = Array.prototype.slice.call(box.querySelectorAll('[data-head-tool]'));
        if (items.length < 2) return;
        var tools = document.createElement('details');
        tools.className = 'ch-tools ch-tools--profile no-print';
        tools.innerHTML = '<summary class="ui-btn ui-btn--ghost"><i class="bi bi-tools" aria-hidden="true"></i> أدوات</summary><div class="ch-tools__menu"></div>';
        var menu = tools.querySelector('.ch-tools__menu');
        var anchor = box.querySelector('[data-head-tools-here]');
        if (anchor) anchor.insertAdjacentElement('afterend', tools); else box.appendChild(tools);
        items.forEach(function (node) {
            if (node.matches('.ui-icon-btn')) {
                // زر أيقونة يصير سطرًا باسمه في القائمة
                var text = (node.getAttribute('title') || node.getAttribute('aria-label') || '').split(':')[0].trim();
                node.classList.remove('ui-icon-btn');
                node.classList.add('ui-btn', 'ui-btn--ghost');
                if (text) { var span = document.createElement('span'); span.textContent = text; node.appendChild(span); }
            } else if (node.matches('.ui-btn:not(.ui-btn--ghost):not(.ui-btn--danger)')) node.classList.add('ui-btn--ghost');
            menu.appendChild(node);
        });
        menu.addEventListener('click', function (event) {
            if (event.target.closest('a, button')) setTimeout(function () { tools.open = false; }, 0);
        });
    }

    // ---------- (2026-11-25) نموذج بحث كبير: سطر بحث واحد، و«فلاتر أخرى» تُظهر باقي القوائم (النموذج نفسه بأسمائه) ----------
    function collapseFilters() {
        Array.prototype.forEach.call(document.querySelectorAll('.app-main form[data-filter-collapse]'), function (form) {
            if (form.hasAttribute('data-ch-done')) return;
            form.setAttribute('data-ch-done', '');
            var fields = Array.prototype.filter.call(form.querySelectorAll(':scope > .ui-field'), function (field) { return !field.querySelector('input[type=search], input[name=search], input[name=q]'); });
            var actions = form.querySelector(':scope > .ui-filter__actions');
            if (!fields.length || !actions) return;
            fields.forEach(function (field) { field.classList.add('ch-filter-extra'); });
            var active = fields.filter(function (field) { var select = field.querySelector('select'); return select && select.selectedIndex > 0; }).length;
            var toggle = document.createElement('button');
            toggle.type = 'button';
            toggle.className = 'ui-btn ui-btn--ghost ch-filter-toggle';
            toggle.setAttribute('aria-expanded', 'false');
            toggle.innerHTML = '<i class="bi bi-sliders" aria-hidden="true"></i> فلاتر أخرى' + (active ? ' <b>' + active + '</b>' : '');
            toggle.title = 'المنطقة والحالة والخادم والترتيب';
            toggle.addEventListener('click', function () {
                var open = form.classList.toggle('is-open');
                toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
            });
            actions.insertBefore(toggle, actions.firstChild);
            form.classList.add('ch-filter');
        });
    }

    // ---------- (2026-11-25) رأس الجدول ثابت أثناء النزول في القوائم الطويلة ----------
    // حاوية الجدول التي لا تمرَّر أفقيًا فعلًا تأخذ overflow: clip (نفس القص بلا حاوية تمرير) فيلتصق الرأس بأعلى الشاشة؛
    // والجدول الأعرض من الشاشة (يُسحب أفقيًا) يبقى كما كان.
    function stickyTop() {
        var bar = document.querySelector('.topbar');
        if (!bar) return 0;
        var style = getComputedStyle(bar);
        return style.position === 'sticky' || style.position === 'fixed' ? Math.round(bar.getBoundingClientRect().height) : 0;
    }
    function stickyHeads() {
        var tables = document.querySelectorAll('.app-main table');
        if (!tables.length) return;
        document.documentElement.style.setProperty('--ch-sticky-top', stickyTop() + 'px');
        Array.prototype.forEach.call(document.querySelectorAll('.ch-sticky-clip'), function (node) { node.classList.remove('ch-sticky-clip'); });
        Array.prototype.forEach.call(tables, function (table) {
            table.classList.remove('ch-sticky-head');
            if (table.closest('.modal, dialog, .ch-tools, [data-no-sticky-head], .print-only') || !table.tHead || table.tHead.rows.length !== 1) return;
            var body = table.tBodies[0];
            if (!body || body.rows.length < 15 || table.offsetParent === null) return;
            var fixes = [];
            for (var node = table.parentElement; node && node !== document.body; node = node.parentElement) {
                var style = getComputedStyle(node);
                if (style.overflowX === 'visible' && style.overflowY === 'visible') continue;
                if (node.scrollWidth > node.clientWidth + 1) return; // يُسحب أفقيًا فعلًا
                if ((style.overflowY === 'auto' || style.overflowY === 'scroll') && node.scrollHeight > node.clientHeight + 1) return; // جدول داخل صندوق له تمريره
                fixes.push(node);
            }
            fixes.forEach(function (item) { item.classList.add('ch-sticky-clip'); });
            table.classList.add('ch-sticky-head');
            // خلية شفافة تأخذ لون صفها أو رأس الجدول (اللون كان على الصف فلا يلتصق معها)، وإلا خلفية الصفحة
            var clear = function (style) { return (style.backgroundColor === 'rgba(0, 0, 0, 0)' || style.backgroundColor === 'transparent') && style.backgroundImage === 'none'; };
            var row = table.tHead.rows[0];
            var source = [row, table.tHead, table].map(function (node) { return getComputedStyle(node); }).filter(function (style) { return !clear(style); })[0];
            Array.prototype.forEach.call(row.cells, function (cell) {
                if (cell.classList.contains('ch-sticky-bg') || cell.hasAttribute('data-ch-bg')) return;
                if (!clear(getComputedStyle(cell))) return;
                if (source) {
                    cell.setAttribute('data-ch-bg', '');
                    cell.style.backgroundColor = source.backgroundColor;
                    if (source.backgroundImage !== 'none') cell.style.backgroundImage = source.backgroundImage;
                } else cell.classList.add('ch-sticky-bg');
            });
        });
    }
    var stickyTimer = 0;
    function scheduleSticky() { clearTimeout(stickyTimer); stickyTimer = setTimeout(stickyHeads, 200); }

    function init() {
        try {
            run();
            collapseFilters();
        } finally {
            // الرأس كان مخفيًا حتى يكتمل ترتيبه (لا يظهر الشكل القديم لحظة F5)؛ يظهر الآن حتى لو حدث خطأ
            document.documentElement.classList.add('ch-ready');
        }
        stickyHeads();
        window.addEventListener('load', scheduleSticky);
        window.addEventListener('resize', scheduleSticky);
    }

    // يعمل فورًا (السكربت بعد </main> فالرأس كله موجود)، إلا في صفحات الحسابات: finance-float.js (defer) يرتب رأسها أولًا
    if (document.readyState !== 'loading' || (document.querySelector('.app-main') && !document.querySelector('script[src*="finance-float"]'))) init();
    else document.addEventListener('DOMContentLoaded', init);
})();
