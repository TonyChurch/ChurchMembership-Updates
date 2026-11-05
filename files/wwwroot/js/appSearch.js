// «ابحث في البرنامج»: يفتح بزر القائمة الجانبية أو Ctrl+K، ويبحث في فهرس الصفحات والتبويبات
// (/Search/Features يرجع ما يسمح به دور المستخدم فقط). يتسامح في الهمزات والتاء المربوطة والياء و«ال».
(function () {
    const modalEl = document.getElementById('appSearch');
    if (!modalEl || !window.bootstrap) return;

    const input = document.getElementById('appSearchInput');
    const list = document.getElementById('appSearchResults');
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    let features = null;
    let results = [];
    let active = 0;

    const normalize = text => (text || '')
        .replace(/[ً-ٰٟـ]/g, '')
        .replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي')
        .toLowerCase();
    const words = text => normalize(text).split(/\s+/).filter(Boolean).map(word => word.length > 3 && word.startsWith('ال') ? word.slice(2) : word);
    const escape = text => String(text ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

    async function load() {
        if (features) return features;
        try {
            const response = await fetch(modalEl.dataset.featuresUrl, { headers: { Accept: 'application/json' } });
            features = response.ok ? await response.json() : [];
        } catch { features = []; }
        features.forEach(item => {
            item.titleKey = normalize(item.title);
            item.allKey = normalize([item.title, item.group, item.keywords, item.description].join(' '));
        });
        return features;
    }

    // درجة قرب الاسم من البحث: التطابق التام أولًا، ثم ما يبدأ بالعبارة، ثم كلمة كاملة، ثم بداية كلمة، ثم ما يحتويها
    function closeness(name, query) {
        const text = normalize(name).replace(/\s+/g, ' ').trim();
        const phrase = normalize(query).replace(/\s+/g, ' ').trim();
        if (!text || !phrase) return 0;
        if (text === phrase) return 100;
        if (text.startsWith(phrase + ' ')) return 90;
        if (text.startsWith(phrase)) return 85;
        if (` ${text} `.includes(` ${phrase} `)) return 75;
        if (` ${text}`.includes(` ${phrase}`)) return 65;
        if (text.includes(phrase)) return 50;
        const terms = words(query);
        const plain = ` ${text.split(' ').map(word => word.length > 3 && word.startsWith('ال') ? word.slice(2) : word).join(' ')} `;
        if (terms.length && terms.every(term => plain.includes(` ${term} `))) return 40;
        if (terms.length && terms.every(term => plain.includes(term))) return 30;
        return 0;
    }
    const byCloseness = (a, b) => b.score - a.score || a.item.title.length - b.item.title.length;

    function search(query) {
        const terms = words(query);
        if (!terms.length) return features.map(item => ({ item, score: 0 }));
        return features
            .map(item => {
                if (!terms.every(term => item.allKey.includes(term))) return null;
                // بند يطابق في الكلمات المفتاحية فقط يأتي بعد ما يطابق في العنوان
                return { item, score: Math.max(closeness(item.title, query), 20) };
            })
            .filter(Boolean)
            .sort(byCloseness);
    }

    // نتائج مباشرة من الأعضاء والأسر (بصلاحيات المستخدم نفسها لأنها صفحاته)، مرتبة بالأقرب
    let people = { query: '', items: [] };
    let peopleTimer = 0;
    async function fetchRows(url, query, pick) {
        try {
            const response = await fetch(`${url}?search=${encodeURIComponent(query)}&pageSize=100`, { headers: { Accept: 'text/html' } });
            if (!response.ok || /\/Account\//i.test(response.url)) return [];
            const page = new DOMParser().parseFromString(await response.text(), 'text/html');
            return [...page.querySelectorAll('tbody tr')].map(pick).filter(Boolean);
        } catch { return []; }
    }
    function loadPeople(query) {
        clearTimeout(peopleTimer);
        if (normalize(query).replace(/\s/g, '').length < 2) { people = { query, items: [] }; return; }
        peopleTimer = setTimeout(async () => {
            const byUrl = url => features.some(item => item.url === url);
            const [members, families] = await Promise.all([
                byUrl(modalEl.dataset.membersUrl) ? fetchRows(modalEl.dataset.membersUrl, query, row => {
                    const link = row.querySelector('a[href*="/Members/Details/"]');
                    if (!link) return null;
                    const title = link.textContent.trim();
                    return { title, group: 'الأعضاء', icon: 'bi-person-fill', url: link.getAttribute('href'), description: row.querySelector('.ui-person__text small')?.textContent.trim() || 'ملف العضو', score: closeness(title, query) };
                }) : [],
                byUrl(modalEl.dataset.familiesUrl) ? fetchRows(modalEl.dataset.familiesUrl, query, row => {
                    const names = [...row.querySelectorAll('a[href*="/Families/Profile/"]')].map(link => link.textContent.trim()).filter(Boolean);
                    const link = row.querySelector('a[href*="/Families/Profile/"]');
                    if (!link || !names.length) return null;
                    const unique = [...new Set(names)];
                    return { title: `أسرة ${unique[0]}`, group: 'الأسر', icon: 'bi-house-heart-fill', url: link.getAttribute('href'), description: unique.slice(1).join(' · ') || 'ملف الأسرة', score: Math.max(...unique.map(name => closeness(name, query))) };
                }) : []
            ]);
            if (input.value.trim() !== query) return;
            // اسم لم يطابق إلا برقم الهاتف أو الكود أو فرد آخر في الأسرة يأتي في آخر النتائج
            people = { query, items: members.concat(families).map(item => ({ item, score: item.score || 10 })) };
            render(true);
        }, 250);
    }

    function render(keepPeople) {
        const query = input.value.trim();
        if (!keepPeople) loadPeople(query);
        const found = search(query);
        if (query && people.query === query) {
            // الأقرب تطابقًا أولًا من الصفحات والأعضاء والأسر معًا (أقصى 12 عضوًا و8 أسر)
            const members = people.items.filter(entry => entry.item.group === 'الأعضاء').sort(byCloseness).slice(0, 12);
            const families = people.items.filter(entry => entry.item.group === 'الأسر').sort(byCloseness).slice(0, 8);
            found.push(...members, ...families);
            found.sort(byCloseness);
        }
        results = found.map(result => result.item);
        const fallback = [];
        if (query) {
            const byUrl = url => features.find(item => item.url === url);
            if (byUrl(modalEl.dataset.membersUrl)) fallback.push({ title: `ابحث عن «${query}» في الأعضاء`, group: 'بحث في البيانات', icon: 'bi-person-fill', description: 'بالاسم أو الكود أو رقم الهاتف', url: `${modalEl.dataset.membersUrl}?search=${encodeURIComponent(query)}` });
            if (byUrl(modalEl.dataset.familiesUrl)) fallback.push({ title: `ابحث عن «${query}» في الأسر`, group: 'بحث في البيانات', icon: 'bi-house-heart-fill', description: 'باسم الزوج أو الزوجة أو أي فرد، أو الهاتف', url: `${modalEl.dataset.familiesUrl}?search=${encodeURIComponent(query)}` });
        }
        results = results.concat(fallback);
        active = 0;

        if (!results.length) {
            list.innerHTML = '<li class="app-search__empty"><i class="bi bi-emoji-neutral" aria-hidden="true"></i> لا يوجد بند بهذا الاسم في البرنامج.</li>';
            return;
        }
        let lastGroup = null;
        list.innerHTML = results.map((item, index) => {
            const head = !query && item.group !== lastGroup ? `<li class="app-search__group" role="presentation">${escape(item.group)}</li>` : '';
            lastGroup = item.group;
            return `${head}<li role="option" id="appSearchItem${index}" aria-selected="${index === 0}">
                <a class="app-search__item${index === 0 ? ' is-active' : ''}" href="${escape(item.url)}" data-index="${index}">
                    <span class="app-search__icon"><i class="bi ${escape(item.icon)}" aria-hidden="true"></i></span>
                    <span class="app-search__text"><strong>${escape(item.title)}</strong><small>${escape(item.description)}</small></span>
                    ${query ? `<span class="app-search__where">${escape(item.group)}</span>` : ''}
                </a></li>`;
        }).join('');
    }

    function highlight(index) {
        const items = list.querySelectorAll('.app-search__item');
        if (!items.length) return;
        active = (index + items.length) % items.length;
        items.forEach((item, i) => {
            item.classList.toggle('is-active', i === active);
            item.parentElement.setAttribute('aria-selected', i === active);
        });
        items[active].scrollIntoView({ block: 'nearest' });
    }

    async function open() {
        modal.show();
        await load();
        render();
    }

    document.addEventListener('click', event => {
        const opener = event.target.closest('[data-app-search-open]');
        if (!opener) return;
        event.preventDefault();
        // في الموبايل: تُغلق القائمة الجانبية أولًا
        const offcanvas = opener.closest('.offcanvas');
        if (offcanvas) bootstrap.Offcanvas.getInstance(offcanvas)?.hide();
        open();
    });

    document.addEventListener('keydown', event => {
        if ((event.ctrlKey || event.metaKey) && (event.key === 'k' || event.key === 'K' || event.code === 'KeyK')) {
            event.preventDefault();
            open();
        }
    });

    modalEl.addEventListener('shown.bs.modal', () => { input.focus(); input.select(); });
    input.addEventListener('input', () => features && render());
    input.addEventListener('keydown', event => {
        if (event.key === 'ArrowDown') { event.preventDefault(); highlight(active + 1); }
        else if (event.key === 'ArrowUp') { event.preventDefault(); highlight(active - 1); }
        else if (event.key === 'Enter') {
            event.preventDefault();
            const target = list.querySelectorAll('.app-search__item')[active];
            if (target) window.location.href = target.href;
        }
    });
    list.addEventListener('mousemove', event => {
        const item = event.target.closest('.app-search__item');
        if (item && Number(item.dataset.index) !== active) highlight(Number(item.dataset.index));
    });
})();
