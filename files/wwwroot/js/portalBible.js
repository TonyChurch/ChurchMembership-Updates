// قارئ الكتاب المقدس في بوابة الشعب: النص ملفات ثابتة (/data/bible/<رمز السفر>.json)،
// والتفضيلات (حجم الخط، الوضع الليلي، التشكيل، آخر موضع) تُحفظ على هذا الجهاز فقط.
// الاستماع: تسجيل الأصحاح يُشغَّل مباشرة من موقع القديس تكلا (لا يُنسخ عندنا)،
// والأسفار القانونية الثانية روابط لنصها على الموقع نفسه.
(() => {
    const host = document.querySelector("[data-bible]");
    if (!host) return;

    const storageKey = "church.bible.v1";
    const bookSelect = host.querySelector("[data-bible-book]");
    const chapterSelect = host.querySelector("[data-bible-chapter]");
    const page = host.querySelector("[data-bible-page]");
    const nightButton = host.querySelector("[data-bible-night]");
    const marksButton = host.querySelector("[data-bible-marks]");
    const fontSteps = [1, 1.15, 1.3, 1.5, 1.75, 2.05];
    const audioBar = host.querySelector("[data-bible-audio]");
    const audio = host.querySelector("[data-bible-player]");
    const taklaLink = host.querySelector("[data-bible-takla]");
    const steps = host.querySelector(".bible-steps");
    const taklaSite = "https://st-takla.org";
    const taklaChapter = (page, chapter) => `${taklaSite}/Bibles/BibleSearch/showChapter.php?book=${page}&chapter=${chapter}`;
    // ملف الأصحاح: www.St-Takla.org--43.JOH03.m4a (ترتيب السفر بين الـ66، المزامير بثلاثة أرقام)
    const taklaAudio = (meta, number, chapter) => {
        const code = meta.code === "SOL" ? "SNG" : meta.code;
        const digits = meta.code === "PSA" ? 3 : 2;
        return `${taklaSite}/Multimedia/BibleAudioFiles_normalized/person1_without_music/www.St-Takla.org--${String(number).padStart(2, "0")}.${code}${String(chapter).padStart(digits, "0")}.m4a`;
    };
    let deutero = [];

    let prefs = { book: "JOH", chapter: 1, font: 2, night: false, marks: true };
    try { prefs = Object.assign(prefs, JSON.parse(localStorage.getItem(storageKey) || "{}")); } catch { /* التخزين غير متاح: تعمل الصفحة بلا حفظ */ }
    const save = () => { try { localStorage.setItem(storageKey, JSON.stringify(prefs)); } catch { /* لا حفظ */ } };

    let books = [];
    const loaded = new Map();
    // التشكيل (من الفتحتين إلى السكون، والألف الخنجرية) وهمزة الوصل: تُحذف عند إخفاء التشكيل
    const plain = (text) => text.replace(/[ً-ْٰ]/g, "").replace(/ٱ/g, "ا");

    const message = (text) => {
        const paragraph = document.createElement("p");
        paragraph.className = "portal-muted";
        paragraph.textContent = text;
        page.replaceChildren(paragraph);
    };

    const applyLook = () => {
        prefs.font = Math.min(fontSteps.length - 1, Math.max(0, prefs.font));
        page.style.fontSize = `${fontSteps[prefs.font]}rem`;
        host.classList.toggle("is-night", prefs.night);
        document.body.classList.toggle("bible-night", prefs.night);
        nightButton.setAttribute("aria-pressed", String(prefs.night));
        marksButton.setAttribute("aria-pressed", String(prefs.marks));
    };

    const fillChapters = (count) => {
        chapterSelect.replaceChildren(...Array.from({ length: count }, (_, index) => {
            const option = document.createElement("option");
            option.value = String(index + 1);
            option.textContent = `الأصحاح ${index + 1}`;
            return option;
        }));
    };

    const loadBook = (code) => {
        if (loaded.has(code)) return Promise.resolve(loaded.get(code));
        return fetch(`/data/bible/${encodeURIComponent(code)}.json`)
            .then((response) => { if (!response.ok) throw new Error("book unavailable"); return response.json(); })
            .then((book) => { loaded.set(code, book); return book; });
    };

    // سفر من الأسفار القانونية الثانية: نصه على موقع القديس تكلا
    const showDeutero = (scroll) => {
        const meta = deutero.find((book) => `DC${book.takla}` === prefs.book);
        bookSelect.value = prefs.book;
        chapterSelect.replaceChildren();
        chapterSelect.disabled = true;
        audioBar.hidden = true;
        steps.hidden = true;
        audio.pause();
        save();

        const heading = document.createElement("h1");
        heading.textContent = `سفر ${meta.name}`;
        const note = document.createElement("p");
        note.className = "portal-muted";
        note.textContent = "من الأسفار القانونية الثانية. اختر الأصحاح ليُفتح نصه على موقع القديس تكلا.";
        const list = document.createElement("div");
        list.className = "bible-chapters";
        meta.chapters.forEach((chapter) => {
            const link = document.createElement("a");
            link.href = taklaChapter(meta.takla, chapter);
            link.target = "_blank";
            link.rel = "noopener";
            link.textContent = String(chapter);
            link.setAttribute("aria-label", `${meta.name} الأصحاح ${chapter}`);
            list.append(link);
        });
        page.replaceChildren(heading, note, list);
        if (scroll) host.scrollIntoView({ block: "start" });
    };

    const show = (scroll) => {
        if (deutero.some((book) => `DC${book.takla}` === prefs.book)) return showDeutero(scroll);
        chapterSelect.disabled = false;
        audioBar.hidden = false;
        steps.hidden = false;
        const meta = books.find((book) => book.code === prefs.book) || books[0];
        prefs.book = meta.code;
        prefs.chapter = Math.min(meta.chapters, Math.max(1, prefs.chapter));
        bookSelect.value = meta.code;
        fillChapters(meta.chapters);
        chapterSelect.value = String(prefs.chapter);
        save();

        // التسجيل الصوتي للأصحاح؛ لا يُحمَّل إلا عند الضغط على تشغيل
        const source = taklaAudio(meta, books.indexOf(meta) + 1, prefs.chapter);
        if (audio.dataset.src !== source) {
            audio.pause();
            audio.dataset.src = source;
            audio.src = source;
        }
        taklaLink.href = taklaChapter(meta.takla, prefs.chapter);

        loadBook(meta.code).then((book) => {
            // قد يكون المستخدم انتقل لسفر آخر قبل اكتمال التحميل
            if (book.code !== prefs.book) return;
            const heading = document.createElement("h1");
            heading.textContent = `${book.name} ${prefs.chapter}`;
            const verses = (book.chapters[prefs.chapter - 1] || []).map(([number, text]) => {
                const verse = document.createElement("p");
                const marker = document.createElement("sup");
                marker.textContent = String(number);
                verse.append(marker, " ", prefs.marks ? text : plain(text));
                return verse;
            });
            page.replaceChildren(heading, ...verses);
            const index = books.indexOf(meta);
            host.querySelector('[data-bible-step="-1"]').disabled = index === 0 && prefs.chapter === 1;
            host.querySelector('[data-bible-step="1"]').disabled = index === books.length - 1 && prefs.chapter === meta.chapters;
            if (scroll) host.scrollIntoView({ block: "start" });
        }).catch(() => message("تعذر تحميل النص. تأكد من الاتصال بالإنترنت ثم أعد المحاولة."));
    };

    bookSelect.addEventListener("change", () => { prefs.book = bookSelect.value; prefs.chapter = 1; show(true); });
    audio.addEventListener("error", () => {
        if (audio.getAttribute("src")) audioBar.querySelector("[data-bible-audio-error]").hidden = false;
    });
    audio.addEventListener("play", () => { audioBar.querySelector("[data-bible-audio-error]").hidden = true; });
    chapterSelect.addEventListener("change", () => { prefs.chapter = Number(chapterSelect.value); show(true); });

    host.querySelectorAll("[data-bible-step]").forEach((button) => button.addEventListener("click", () => {
        const step = Number(button.dataset.bibleStep);
        const index = books.findIndex((book) => book.code === prefs.book);
        let chapter = prefs.chapter + step;
        let bookIndex = index;
        // نهاية السفر تنقل لأول السفر التالي، وبدايته لآخر السفر السابق
        if (chapter < 1) { bookIndex--; if (bookIndex < 0) return; chapter = books[bookIndex].chapters; }
        else if (chapter > books[index].chapters) { bookIndex++; if (bookIndex >= books.length) return; chapter = 1; }
        prefs.book = books[bookIndex].code;
        prefs.chapter = chapter;
        show(true);
    }));

    host.querySelectorAll("[data-bible-font]").forEach((button) => button.addEventListener("click", () => {
        prefs.font += Number(button.dataset.bibleFont);
        applyLook();
        save();
    }));
    nightButton.addEventListener("click", () => { prefs.night = !prefs.night; applyLook(); save(); });
    marksButton.addEventListener("click", () => { prefs.marks = !prefs.marks; applyLook(); show(false); });

    applyLook();
    fetch("/data/bible/books.json")
        .then((response) => { if (!response.ok) throw new Error("index unavailable"); return response.json(); })
        .then((index) => {
            books = index.books;
            deutero = index.deutero || [];
            // رابط مباشر: /p/bible?b=JOH&c=3
            const query = new URLSearchParams(location.search);
            if (books.some((book) => book.code === query.get("b"))) { prefs.book = query.get("b"); prefs.chapter = Number(query.get("c")) || 1; }
            [["old", "العهد القديم"], ["new", "العهد الجديد"]].forEach(([testament, label]) => {
                const group = document.createElement("optgroup");
                group.label = label;
                books.filter((book) => book.testament === testament).forEach((book) => {
                    const option = document.createElement("option");
                    option.value = book.code;
                    option.textContent = book.name;
                    group.append(option);
                });
                bookSelect.append(group);
            });
            if (deutero.length) {
                const group = document.createElement("optgroup");
                group.label = "الأسفار القانونية الثانية";
                deutero.forEach((book) => {
                    const option = document.createElement("option");
                    option.value = `DC${book.takla}`;
                    option.textContent = book.name;
                    group.append(option);
                });
                bookSelect.append(group);
            }
            show(false);
        })
        .catch(() => message("تعذر تحميل فهرس الكتاب المقدس. تأكد من الاتصال بالإنترنت."));
})();
