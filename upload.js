const admin = require('firebase-admin');

// جلب البيانات وتنظيفها فوراً من أي فراغات أو أسطر جديدة مخفية
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
const databaseURL = process.env.FIREBASE_DATABASE_URL.trim();
const storageBucket = process.env.FIREBASE_STORAGE_BUCKET.trim().replace(/^gs:\/\//, '').replace(/\/$/, '');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: databaseURL,
  storageBucket: storageBucket
});

const db = admin.database();
const bucket = admin.storage().bucket();

async function start() {
    const filePath = process.argv[2];
    const fileName = process.argv[3];
    const folderName = "لوس";

    console.log(`📡 محاولة الاتصال بـ: ${storageBucket}`);

    const destination = `${folderName}/${fileName}.mp4`;
    
    // رفع الملف مع إعدادات Safari
    await bucket.upload(filePath, {
        destination: destination,
        public: true,
        metadata: { 
            contentType: 'video/mp4',
            cacheControl: 'public, max-age=31536000'
        }
    });

    const publicUrl = `https://storage.googleapis.com/${storageBucket}/${encodeURIComponent(destination)}`;
    console.log(`✅ تم الرفع! الرابط: ${publicUrl}`);

    // تحديث قاعدة البيانات
    const groupsRef = db.ref('live_stream/groups');
    const snapshot = await groupsRef.once('value');
    let groupId = null;

    snapshot.forEach((child) => {
        if (child.val().name === folderName) groupId = child.key;
    });

    if (!groupId) {
        const newGroup = await groupsRef.push({ name: folderName });
        groupId = newGroup.key;
    }

    await db.ref('live_stream/library').push({
        name: fileName,
        url: publicUrl,
        groupId: groupId
    });

    console.log("🎉 مبروك! الفيديو الآن في صفحتك.");
    process.exit(0);
}

start().catch(err => {
    console.error("❌ فشل البوت:");
    console.error("السبب:", err.message);
    process.exit(1);
});
