(() => {
    const hosts = Array.from(document.querySelectorAll("[data-daily-message]"));
    if (!hosts.length) return;

    const verses = [
        "أحبوا بعضكم بعضًا كما أحببتكم أنا. يوحنا 15: 12",
        "أما أنا وبيتي فنعبد الرب. يشوع 24: 15",
        "الرب نوري وخلاصي ممن أخاف. مزمور 27: 1",
        "كل ما تريدون أن يفعل الناس بكم افعلوا هكذا أنتم أيضًا بهم. متى 7: 12",
        "الرب راعي فلا يعوزني شيء. مزمور 23: 1",
        "افرحوا في الرجاء، صابرين في الضيق، مواظبين على الصلاة. رومية 12: 12",
        "تعالوا إليّ يا جميع المتعبين والثقيلي الأحمال وأنا أريحكم. متى 11: 28",
        "أستطيع كل شيء في المسيح الذي يقويني. فيلبي 4: 13",
        "سراج لرجلي كلامك ونور لسبيلي. مزمور 119: 105",
        "ها أنا معكم كل الأيام إلى انقضاء الدهر. متى 28: 20",
        "طوبى لأنقياء القلب لأنهم يعاينون الله. متى 5: 8",
        "ملقين كل همكم عليه لأنه هو يعتني بكم. 1 بطرس 5: 7"
    ];
    const fathers = [
        "توقع التجربة إلى النفس الأخير. القديس أنطونيوس الكبير",
        "لا شيء أقوى من الصلاة. القديس يوحنا ذهبي الفم",
        "اجعل قلبك رحيمًا، فتجد الرحمة. القديس إسحق السرياني",
        "ابدأ بنفسك، فتضيء للآخرين. القديس مقاريوس الكبير",
        "تواضع القلب يسبق كل فضيلة. القديس موسى الأسود",
        "اثبت في الصلاة، فهي ميناء النفس. القديس أغسطينوس"
    ];

    let copticFormatter = null;
    try {
        copticFormatter = new Intl.DateTimeFormat("ar-EG-u-ca-coptic", { day: "numeric", month: "long", year: "numeric" });
    } catch {
        copticFormatter = null;
    }

    hosts.forEach((host) => {
        const interval = Math.max(1, Number(host.dataset.changeInterval) || 60);
        const mode = host.dataset.contentMode || "تلقائي";
        const manualVerse = (host.dataset.manualVerse || "").trim();
        const manualFather = (host.dataset.manualFather || "").trim();
        const setText = (selector, value) => host.querySelectorAll(selector).forEach((element) => { element.textContent = value; });

        const refresh = () => {
            const now = new Date();
            const slot = Math.floor(now.getTime() / (interval * 60000));
            let verse = verses[slot % verses.length];
            let father = fathers[slot % fathers.length];
            if (mode === "يدوي") {
                verse = manualVerse || verse;
                father = manualFather || father;
            } else if (mode === "مختلط") {
                if (manualVerse && slot % 2 === 0) verse = manualVerse;
                if (manualFather && slot % 2 === 0) father = manualFather;
            }
            const isVirginFast = now.getMonth() === 7 && now.getDate() >= 7 && now.getDate() <= 21;
            setText("[data-daily-message-occasion]", isVirginFast ? "صوم السيدة العذراء" : "زمن روحي في حياة الكنيسة");
            setText("[data-daily-message-synaxar]", "اضغط لقراءة تذكار اليوم");
            setText("[data-daily-message-verse]", verse);
            setText("[data-daily-message-fathers]", father);
            if (copticFormatter) setText("[data-daily-message-coptic]", copticFormatter.format(now).replace(/\s*AM\s*$/i, " ش"));
        };
        refresh();
        window.setInterval(refresh, Math.min(interval * 60000, 60000));
    });
})();