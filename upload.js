const admin = require('firebase-admin');

// جلب البيانات من بيئة GitHub
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
const databaseURL = process.env.FIREBASE_DATABASE_URL;
const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: databaseURL,
  storageBucket: storageBucket
});

const db = admin.database();
const bucket = admin.storage().bucket();

async function start() {
    const filePath = process.argv[2]; // مسار الملف المحول
    const fileName = process.argv[3]; // اسم الفيديو
    const folderName = "لوس";

    console.log(`🚀 جاري رفع ${fileName} إلى مجلد ${folderName}...`);

    // 1. الرفع إلى Storage
    const destination = `${folderName}/${fileName}.mp4`;
    await bucket.upload(filePath, {
        destination: destination,
        public: true,
        metadata: { contentType: 'video/mp4' }
    });

    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${encodeURIComponent(destination)}`;
    console.log(`✅ تم الرفع! الرابط: ${publicUrl}`);

    // 2. البحث عن ID مجموعة "لوس" في قاعدة البيانات
    const groupsRef = db.ref('live_stream/groups');
    const snapshot = await groupsRef.once('value');
    let groupId = null;

    snapshot.forEach((child) => {
        if (child.val().name === folderName) {
            groupId = child.key;
        }
    });

    if (!groupId) {
        console.log("⚠️ لم أجد مجموعة بهذا الاسم، سأنشئ واحدة جديدة...");
        const newGroup = await groupsRef.push({ name: folderName });
        groupId = newGroup.key;
    }

    // 3. إضافة الفيديو للمكتبة (Library) لظهوره في صفحتك فوراً
    const libraryRef = db.ref('live_stream/library');
    await libraryRef.push({
        name: fileName,
        url: publicUrl,
        groupId: groupId
    });

    console.log("🎉 تم تحديث صفحتك بنجاح!");
    process.exit(0);
}

start().catch(err => { console.error(err); process.exit(1); });
