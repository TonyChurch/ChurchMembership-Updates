// ربط الدارس/المدرس بملف عضو أو خادم موجود في البرنامج (بحث بالاسم أو الرقم القومي أو التليفون)
(function () {
    document.querySelectorAll('[data-edu-link]').forEach(function (box) {
        var form = box.closest('form');
        var q = box.querySelector('.edu-q'), list = box.querySelector('.edu-results'), card = box.querySelector('.edu-linked');
        var member = form.querySelector('input[name=MemberId]'), servant = form.querySelector('input[name=ServantId]');
        var name = card.querySelector('.edu-linked__name');
        var timer;
        function setLinked(text) {
            var on = !!text;
            card.hidden = !on;
            name.textContent = text || '';
            box.querySelector('.edu-link__q').hidden = on;
            form.querySelectorAll('[data-edu-manual]').forEach(function (el) {
                el.hidden = on;
                el.querySelectorAll('input,select').forEach(function (i) { i.disabled = on; });
            });
        }
        setLinked(card.dataset.name || '');
        q.addEventListener('input', function () {
            clearTimeout(timer);
            var text = q.value.trim();
            if (text.length < 2) { list.innerHTML = ''; return; }
            timer = setTimeout(function () {
                fetch(box.dataset.url + '?kind=' + (box.dataset.kind || '') + '&q=' + encodeURIComponent(text), { credentials: 'same-origin' })
                    .then(function (r) { return r.json(); })
                    .then(function (items) {
                        list.innerHTML = '';
                        if (!items.length) {
                            var none = document.createElement('li');
                            none.className = 'ui-muted';
                            none.textContent = 'لا يوجد مطابق في البرنامج: سجّله من خارج البرنامج بالخانات أدناه.';
                            list.appendChild(none);
                            return;
                        }
                        items.forEach(function (item) {
                            var li = document.createElement('li'), b = document.createElement('button');
                            b.type = 'button';
                            b.textContent = (item.type === 'servant' ? 'خادم: ' : '') + item.name + (item.age != null ? ' · ' + item.age + ' سنة' : '') + (item.phone ? ' · ' + item.phone : '') + (item.nationalId ? ' · ' + item.nationalId : '');
                            b.addEventListener('click', function () {
                                member.value = item.type === 'member' ? item.id : '';
                                if (servant) servant.value = item.type === 'servant' ? item.id : '';
                                setLinked(item.name);
                                list.innerHTML = '';
                                q.value = '';
                            });
                            li.appendChild(b);
                            list.appendChild(li);
                        });
                    });
            }, 250);
        });
        box.querySelector('.edu-unlink').addEventListener('click', function () {
            member.value = '';
            if (servant) servant.value = '';
            setLinked('');
        });
    });
})();
