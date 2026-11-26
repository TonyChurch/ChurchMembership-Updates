// (2026-11-25) رأس صفحات «البابا شنوده للتعليم» وخدمات الأنبا إبرام (Views/Education/_EduTop.cshtml) بعد أن يرتبه compact-head.js:
// 1) «رجوع» والزر الرئيسي والشهر/السنة و«أدوات» و«منسق الخدمة» في سطر واحد تحت العنوان (طلب المستخدم: لا سطر وحده لمنسق الخدمة)،
// 2) شرائح الصفوف تصعد إلى المساحة الفارغة في الرأس بين العنوان والركن، فيأتي البحث تحت الرأس مباشرة.
// إن لم يعمل الرأس المضغوط (لا ch-head) يبقى كل شيء كما هو.
(function () {
    'use strict';
    function arrange() {
        var root = document.documentElement;
        try {
            var header = document.querySelector('.app-main .edu-top--compact > header.edu-head.ch-head');
            if (!header || header.hasAttribute('data-edu-done')) return;
            header.setAttribute('data-edu-done', '');
            var headMain = header.querySelector(':scope > .ch-head__main');
            var titleBox = header.querySelector('.ch-title-box');
            if (!headMain || !titleBox) return;

            var line = headMain.querySelector(':scope > .ch-actions');
            if (!line) { line = document.createElement('div'); line.className = 'ui-page-header__actions ch-actions no-print'; }
            line.classList.add('edu-backline');
            var back = titleBox.querySelector(':scope > .ui-backbar');
            if (back) line.insertBefore(back, line.firstChild);
            // (2026-11-26، طلب المستخدم) «منسق الخدمة» سطر مستقل تحت اسم الصفحة مباشرة (كان في آخر سطر «رجوع»)
            var coordinator = titleBox.querySelector(':scope > .edu-coordinator') || header.querySelector('.edu-coordinator');
            if (coordinator) { coordinator.classList.add('edu-coordinator--under'); titleBox.appendChild(coordinator); }
            if (line.children.length) titleBox.appendChild(line); else line.remove();

            // (2026-11-26) شرائح الصفوف صارت قائمة منسدلة «الفصول (عددها)» بجوار «أدوات» (كانت سطرين في الرأس تُقطع مع 11 فصلًا)؛
            // في صفحة فصل يحمل الزر اسمه، والفصل الحالي مميّز داخل اللوحة. الإغلاق بالضغط خارجها (compact-head.js) وبـ Esc (هنا)
            var strip = document.querySelector('.app-main .edu-top--compact + .edu-strip--compact');
            if (strip) {
                var classCount = strip.querySelectorAll(':scope > .edu-strip__item:not(.edu-strip__add)').length;
                var current = strip.querySelector(':scope > .edu-strip__item.is-open');
                var currentName = current ? current.cloneNode(true) : null;
                if (currentName) Array.prototype.forEach.call(currentName.querySelectorAll('i, .edu-strip__count'), function (node) { node.remove(); });
                var classes = document.createElement('details');
                classes.className = 'ch-tools edu-classes no-print';
                var summary = document.createElement('summary');
                summary.className = 'ui-btn' + (current ? ' edu-classes__current ' + (current.className.match(/edu-tone-\d/) || [''])[0] : '');
                summary.innerHTML = '<i class="bi bi-easel-fill" aria-hidden="true"></i> ';
                summary.appendChild(document.createTextNode(currentName ? 'الفصل: ' + currentName.textContent.trim() : 'الفصول (' + classCount + ')'));
                summary.insertAdjacentHTML('beforeend', ' <i class="bi bi-chevron-down edu-classes__caret" aria-hidden="true"></i>');
                var panel = document.createElement('div');
                panel.className = 'ch-tools__menu edu-classes__menu';
                strip.classList.add('edu-strip--menu');
                panel.appendChild(strip);
                classes.appendChild(summary);
                classes.appendChild(panel);
                var toolsMenu = line.querySelector(':scope > .ch-tools');
                if (toolsMenu) toolsMenu.after(classes);
                else if (coordinator && coordinator.parentNode === line) line.insertBefore(classes, coordinator);
                else line.appendChild(classes);
                if (!line.parentNode) titleBox.appendChild(line);
                document.addEventListener('keydown', function (event) {
                    if (event.key !== 'Escape' || !classes.open) return;
                    classes.open = false;
                    summary.focus();
                });
            }

            // (3) (2026-11-26، طلب المستخدم) الأرقام (دارس / نشط / مربوط بملف...) وشارة «أعياد الميلاد» تخرج من بطاقة التبويبات
            // إلى سطر تحت سطر «رجوع / أدوات / الفصول» داخل الرأس؛ وبطاقة التبويبات تبقى روابط فقط
            var stats = header.querySelector('.ch-corner > ul.ch-stats');
            var bday = header.querySelector('.edu-bday');
            var money = header.querySelector('.edu-money');
            if (stats || bday || money) {
                var statsRow = document.createElement('div');
                statsRow.className = 'edu-head-stats no-print';
                if (stats) {
                    var sep = stats.nextElementSibling;
                    if (sep && sep.classList.contains('ch-corner__sep')) sep.remove();
                    sep = stats.previousElementSibling;
                    if (sep && sep.classList.contains('ch-corner__sep')) sep.remove();
                    statsRow.appendChild(stats);
                }
                if (bday) statsRow.appendChild(bday);
                // (2026-11-26) بيان الاشتراكات المجمَّعة (للكاهن) تحت الأرقام وأعياد الميلاد
                if (money) statsRow.appendChild(money);
                titleBox.appendChild(statsRow);
            }

            // (4) أزرار الصفحة (شريط .edu-bar بعد شريطي البحث) تصعد لسطر البحث نفسه: الأزرار يمينًا والبحثان يسارًا
            var tools = document.querySelector('.app-main .ui-page > .edu-tools');
            if (tools && !tools.querySelector(':scope > .edu-tools__side')) {
                var bar = null;
                for (var node = tools.nextElementSibling; node; node = node.nextElementSibling) {
                    if (node.matches('.edu-bar')) { bar = node; break; }
                    if (!node.matches('details.edu-fabs, .ui-flash, script, link, style, input[type=hidden]')) break;
                }
                if (bar) {
                    var side = document.createElement('div');
                    side.className = 'edu-tools__side edu-tools__side--bar';
                    side.appendChild(bar);
                    tools.insertBefore(side, tools.firstChild);
                    tools.classList.add('edu-tools--bar');
                }
            }
        } finally {
            root.classList.add('edu-ready');
        }
    }
    // يعمل داخل compact-head.js قبل إظهار الرأس (لا قفزة بعد الظهور)، واحتياطًا عند DOMContentLoaded إن لم يُستدعَ
    (window.chAfterArrange = window.chAfterArrange || []).push(arrange);
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arrange); else arrange();
})();
