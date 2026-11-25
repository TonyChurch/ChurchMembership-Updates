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
            var coordinator = titleBox.querySelector(':scope > .edu-coordinator');
            if (coordinator) line.appendChild(coordinator);
            if (line.children.length) titleBox.appendChild(line); else line.remove();

            var strip = document.querySelector('.app-main .edu-top--compact + .edu-strip--compact');
            if (strip) {
                strip.classList.add('edu-strip--head');
                headMain.appendChild(strip);
                header.classList.add('edu-head--strip');
            }

            // (3) الأرقام داخل بطاقة تبويبات النظام: أربعة أعمدة، والأرقام في خانات السطر الأخير الفارغة،
            // فلا يبقى تبويب وحيد في سطر ولا عمود أرقام منفصل (الشاشة العريضة فقط؛ على الموبايل التبويبات سطر يُسحب)
            var tabs = header.querySelector('.ch-corner > nav.ch-corner-tabs');
            var stats = header.querySelector('.ch-corner > ul.ch-stats');
            if (tabs && stats && window.matchMedia('(min-width: 768px)').matches) {
                var links = tabs.querySelectorAll(':scope > a').length;
                var free = (4 - links % 4) % 4;
                var sep = tabs.previousElementSibling;
                if (sep && sep.classList.contains('ch-corner__sep')) sep.remove();
                stats.classList.add('edu-tab-stats');
                stats.style.gridColumn = free ? 'span ' + free : '1 / -1';
                tabs.appendChild(stats);
                tabs.classList.add('edu-tabs4');
                // شارة «أعياد الميلاد» (اليوم / الأسبوع / خلال شهر) في السطر نفسه بعد الأرقام
                var bday = header.querySelector('.edu-bday');
                if (bday) { var item = document.createElement('li'); item.className = 'edu-bday-item'; item.appendChild(bday); stats.appendChild(item); }
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
