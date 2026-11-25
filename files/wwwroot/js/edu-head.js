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
        } finally {
            root.classList.add('edu-ready');
        }
    }
    // يعمل داخل compact-head.js قبل إظهار الرأس (لا قفزة بعد الظهور)، واحتياطًا عند DOMContentLoaded إن لم يُستدعَ
    (window.chAfterArrange = window.chAfterArrange || []).push(arrange);
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arrange); else arrange();
})();
