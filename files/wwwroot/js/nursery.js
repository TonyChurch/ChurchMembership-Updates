// الحضانة: فحص الرقم القومي للطفل أثناء الكتابة.
// الرقم الصحيح يملأ تاريخ الميلاد والنوع والفصل، ثم يعرض: مسجل في الحضانة، أو ملفه الموجود في البرنامج
// (ويملأ الخانات الفارغة من بياناته)، أو المرحلة والفصل اللذين سيُسجل فيهما بالتربية الكنسية عند الحفظ.
(function () {
    const escape = text => String(text ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
    const toLatin = value => value.replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x0660)).replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 0x06F0));

    document.querySelectorAll('input.nursery-nid').forEach(input => {
        const form = input.form;
        const box = form.querySelector('.nursery-nid-result');
        const field = name => form.querySelector(`[name="${name}"]`);
        // يُملأ الحقل إن كان فارغًا فقط، حتى لا يُمسح ما كتبه المستخدم
        const fillEmpty = (name, value) => {
            const target = field(name);
            if (target && value && !target.value) target.value = value;
        };
        const show = (html, tone) => {
            box.innerHTML = html;
            box.className = `nursery-nid-result is-full ${tone || ''}`;
            box.hidden = !html;
        };

        const check = async () => {
            const value = input.value;
            input.setCustomValidity('');
            if (!value) { show(''); return; }
            if (value.length !== 14) { show(''); return; }
            try {
                const response = await fetch(`/Nursery/LookupNationalId?value=${value}&id=${input.dataset.childId || 0}`, { headers: { Accept: 'application/json' } });
                if (!response.ok) return;
                const data = await response.json();
                if (!data.birthDate) {
                    input.setCustomValidity(data.message || 'رقم غير صحيح');
                    show(`<i class="bi bi-x-circle-fill"></i> ${escape(data.message)}`, 'is-error');
                    return;
                }
                const birth = field('birthDate');
                if (birth) birth.value = data.birthDate;
                const gender = field('gender');
                if (gender && data.gender) gender.value = data.gender;
                fillEmpty('group', data.group);

                if (data.nurseryChild) {
                    input.setCustomValidity(data.message);
                    show(`<i class="bi bi-exclamation-triangle-fill"></i> ${escape(data.message)} <a href="${data.nurseryChild.url}">فتح صفحته</a>`, 'is-error');
                    return;
                }
                if (data.member) {
                    const m = data.member;
                    fillEmpty('name', m.name);
                    fillEmpty('guardianName', m.father);
                    fillEmpty('phone', m.phone);
                    fillEmpty('address', m.address);
                    const rows = [
                        ['الاسم', m.name], ['الكود', m.code], ['الأسرة', m.family], ['الأب', m.father], ['الأم', m.mother],
                        ['الموبايل', m.phone], ['العنوان', m.address], ['المرحلة والفصل', m.place], ['خادم المتابعة', m.servant]
                    ].filter(row => row[1]).map(row => `<span><b>${row[0]}:</b> ${escape(row[1])}</span>`).join('');
                    show(`<strong><i class="bi bi-person-check-fill"></i> مسجل في البرنامج${m.hidden ? ' (ملف مخفي)' : ''} — سيُربط به عند الحفظ</strong>`
                        + `<div class="nursery-nid-data">${rows}</div><a href="${m.url}" target="_blank" rel="noopener">فتح ملفه</a>`, 'is-found');
                    return;
                }
                show(`<i class="bi bi-person-plus-fill"></i> ✓ ${escape(data.gender)} · ${escape(data.age)} — غير مسجل في البرنامج؛ `
                    + (data.placement ? `سيُنشأ له ملف في التربية الكنسية: <b>${escape(data.placement)}</b> عند الحفظ.` : 'سيُنشأ له ملف في البرنامج عند الحفظ.'), 'is-new');
            } catch { /* الفحص اختياري؛ الحفظ يتحقق مرة أخرى */ }
        };

        input.addEventListener('input', () => {
            const clean = toLatin(input.value).replace(/\D/g, '').slice(0, 14);
            if (clean !== input.value) input.value = clean;
            check();
        });
    });

    // أثناء كتابة اسم الطفل: المسجلون بنفس الاسم في البرنامج، واختيار أحدهم يملأ بياناته ويربطه بملفه
    document.querySelectorAll('input.nursery-name').forEach(input => {
        const form = input.form;
        const list = form.querySelector('.nursery-name-results');
        const link = form.querySelector('[name="linkMemberId"]');
        const field = name => form.querySelector(`[name="${name}"]`);
        let timer = 0;
        let found = [];

        const close = () => { list.hidden = true; list.innerHTML = ''; };
        const choose = person => {
            close();
            input.value = person.name;
            const set = (name, value) => { const target = field(name); if (target && value) target.value = value; };
            set('birthDate', person.birthDate);
            set('gender', person.gender);
            set('guardianName', person.father);
            set('phone', person.phone);
            set('address', person.address);
            const group = field('group');
            if (group && !group.value && person.group) group.value = person.group;
            link.value = person.id;
            const nid = field('childNationalId');
            if (nid && person.nationalId) {
                // الرقم القومي يُفحص كالمكتوب باليد فتظهر بيانات ملفه
                nid.value = person.nationalId;
                nid.dispatchEvent(new Event('input', { bubbles: true }));
            } else {
                const box = form.querySelector('.nursery-nid-result');
                box.innerHTML = `<strong><i class="bi bi-person-check-fill"></i> سيُربط بملفه في البرنامج: ${escape(person.name)} — ${escape(person.code)}</strong>`
                    + (person.place ? ` · ${escape(person.place)}` : '') + ' (ملفه بلا رقم قومي)';
                box.className = 'nursery-nid-result is-full is-found';
                box.hidden = false;
            }
        };

        input.addEventListener('input', () => {
            link.value = '';
            clearTimeout(timer);
            if (input.value.trim().split(/\s+/).length < 2) { close(); return; }
            timer = setTimeout(async () => {
                try {
                    const response = await fetch(`/Nursery/LookupName?name=${encodeURIComponent(input.value)}&id=${input.dataset.childId || 0}`, { headers: { Accept: 'application/json' } });
                    if (!response.ok) return;
                    found = await response.json();
                    if (!found.length) { close(); return; }
                    list.innerHTML = '<small class="nursery-name-results__hint">مسجلون في البرنامج بنفس الاسم — اختر الطفل لربطه بملفه:</small>'
                        + found.map((person, index) => `<button type="button" data-index="${index}">`
                            + `<b>${escape(person.name)}</b>`
                            + `<small>${[person.age, person.family ? 'أسرة ' + person.family : '', person.place].filter(Boolean).map(escape).join(' · ')}</small>`
                            + (person.nurseryUrl ? '<small class="nursery-health">مسجل بالفعل في الحضانة</small>' : '')
                            + '</button>').join('');
                    list.hidden = false;
                } catch { /* الاقتراح اختياري */ }
            }, 350);
        });
        list.addEventListener('mousedown', event => event.preventDefault());
        list.addEventListener('click', event => {
            const button = event.target.closest('button[data-index]');
            if (!button) return;
            const person = found[Number(button.dataset.index)];
            if (person.nurseryUrl) { location.href = person.nurseryUrl; return; }
            choose(person);
        });
        input.addEventListener('blur', () => setTimeout(close, 150));
        input.addEventListener('keydown', event => { if (event.key === 'Escape') close(); });
    });
})();
