// البابا شنوده للتعليم: الرقم القومي يملأ تاريخ الميلاد والنوع ويعرض السن فورًا (نماذج الدارس والمدرس وصفحة الاستيراد).
// الخادم يعيد الحساب نفسه عند الحفظ، فهذا للعرض الفوري فقط.
(function () {
    var governorates = { '01': 'القاهرة', '02': 'الإسكندرية', '03': 'بورسعيد', '04': 'السويس', '11': 'دمياط', '12': 'الدقهلية', '13': 'الشرقية', '14': 'القليوبية', '15': 'كفر الشيخ', '16': 'الغربية', '17': 'المنوفية', '18': 'البحيرة', '19': 'الإسماعيلية', '21': 'الجيزة', '22': 'بني سويف', '23': 'الفيوم', '24': 'المنيا', '25': 'أسيوط', '26': 'سوهاج', '27': 'قنا', '28': 'أسوان', '29': 'الأقصر', '31': 'البحر الأحمر', '32': 'الوادي الجديد', '33': 'مطروح', '34': 'شمال سيناء', '35': 'جنوب سيناء', '88': 'خارج الجمهورية' };
    function digits(value) {
        return (value || '').replace(/[٠-٩]/g, function (c) { return '٠١٢٣٤٥٦٧٨٩'.indexOf(c); }).replace(/\D/g, '');
    }
    function parse(value) {
        if (!/^[23]\d{13}$/.test(value)) return null;
        var y = (value[0] === '2' ? 1900 : 2000) + parseInt(value.substr(1, 2), 10);
        var m = parseInt(value.substr(3, 2), 10), d = parseInt(value.substr(5, 2), 10);
        var date = new Date(y, m - 1, d);
        if (m < 1 || m > 12 || d < 1 || date.getMonth() !== m - 1 || date > new Date()) return null;
        return { y: y, m: m, d: d, gender: parseInt(value[12], 10) % 2 === 0 ? 'أنثى' : 'ذكر', gov: governorates[value.substr(7, 2)] || '' };
    }
    function age(p) {
        var t = new Date(), a = t.getFullYear() - p.y;
        if (t.getMonth() + 1 < p.m || (t.getMonth() + 1 === p.m && t.getDate() < p.d)) a--;
        return a;
    }
    function two(n) { return (n < 10 ? '0' : '') + n; }

    document.querySelectorAll('input[data-nid]').forEach(function (input) {
        var box = input.closest('tr') || input.form || document;
        var birth = box.querySelector('input[name$="BirthDate"]');
        var gender = box.querySelector('select[name$="Gender"]');
        var info = document.createElement('small');
        info.className = 'edu-nid-info';
        input.insertAdjacentElement('afterend', info);
        function run() {
            var raw = digits(input.value);
            var p = parse(raw);
            if (p) {
                if (birth) { birth.value = p.y + '-' + two(p.m) + '-' + two(p.d); birth.classList.add('is-auto'); }
                if (gender) { gender.value = p.gender; gender.classList.add('is-auto'); }
                info.className = 'edu-nid-info is-ok';
                info.textContent = 'الميلاد ' + (window.birthDayName ? window.birthDayName(p.y, p.m, p.d) + ' ' : '') + p.d + '/' + p.m + '/' + p.y + ' · السن ' + age(p) + ' سنة · ' + p.gender + (p.gov ? ' · ' + p.gov : '');
            } else {
                if (birth) birth.classList.remove('is-auto');
                if (gender) gender.classList.remove('is-auto');
                info.className = 'edu-nid-info' + (raw.length >= 14 ? ' is-bad' : '');
                info.textContent = raw.length >= 14 ? 'الرقم القومي غير صحيح' : (raw.length ? 'يُكمل 14 رقمًا' : '');
            }
        }
        input.addEventListener('input', run);
        run();
    });
})();
