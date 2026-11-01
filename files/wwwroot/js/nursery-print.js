// شهادة الطفل وتقريره: صورته داخل مربع بياناته، في شهادة واحدة أو في طباعة كل الأطفال
(() => {
    const photos = window.nurseryPhotos || {};
    const single = location.pathname.match(/\/(\d+)\/?$/);
    const style = document.createElement("style");
    style.textContent = `
        .cert__child.has-photo {
            position: relative;
            min-height: 36mm;
            padding-left: 33mm;
            align-items: center;
        }
        .cert--year .cert__child.has-photo { min-height: 30mm; padding-left: 28mm; }
        .cert__photo {
            position: absolute;
            top: 50%;
            left: 3mm;
            width: 26mm;
            height: 32mm;
            transform: translateY(-50%);
            border: .7mm solid #e0a64a;
            border-radius: 2.5mm;
            object-fit: cover;
            background: #fff;
        }
        .cert--year .cert__photo { width: 22mm; height: 27mm; }
    `;
    document.head.append(style);
    document.querySelectorAll("main.cert").forEach(card => {
        const box = card.querySelector(".cert__child");
        const name = box?.querySelector("b")?.textContent.trim();
        const id = single ? single[1] : photos[name];
        if (!id || !Object.values(photos).includes(Number(id))) return;
        const image = document.createElement("img");
        image.className = "cert__photo";
        image.alt = "صورة الطفل";
        image.src = `/api/activity/nursery-photo/${id}`;
        box.classList.add("has-photo");
        box.append(image);
    });
})();
