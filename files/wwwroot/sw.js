// عامل الخدمة: يجعل البرنامج والبوابة قابلين للتثبيت كتطبيق على الموبايل.
// لا يخزّن شيئًا: كل الصفحات تأتي من الخادم مباشرة حتى تبقى البيانات حديثة دائمًا.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => { });
