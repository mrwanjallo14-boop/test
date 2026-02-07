const admin = require('firebase-admin');

// جلب البيانات من الأسرار التي وضعتها في GitHub
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
const databaseURL = process.env.FIREBASE_DATABASE_URL;
// تنظيف اسم الـ Bucket من أي زوائد مثل gs:// لضمان عملها
const storageBucket = process.env.FIREBASE_STORAGE_BUCKET.replace('gs://', '').trim();

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: databaseURL,
  storageBucket: storageBucket
});

const db = admin.database();
const bucket = admin.storage().bucket();

async function start() {
    const filePath = process.argv[2]; // مسار الملف المحول final_video.mp4
    const fileName = process.argv[3]; // الاسم الذي ستكتبه في GitHub
    const folderName = "لوس";

    console.log(`🚀 بدأت عملية الرفع للمجلد: ${folderName}`);
    console.log(`📦 اسم الملف النهائي: ${fileName}.mp4`);

    const destination = `${folderName}/${fileName}.mp4`;
    
    // 1. رفع الملف مع إعدادات متوافقة مع متصفح Safari و Apple
    await bucket.upload(filePath, {
        destination: destination,
        public: true, // جعل الملف قابلاً للقراءة للجميع
        metadata: { 
            contentType: 'video/mp4',
            cacheControl: 'public, max-age=31536000' // تحسين سرعة التحميل
        }
    });

    // 2. توليد الرابط المباشر للملف
    const publicUrl = `https://storage.googleapis.com/${storageBucket}/${encodeURIComponent(destination)}`;
    console.log(`✅ تم الرفع بنجاح! الرابط: ${publicUrl}`);

    // 3. تحديث قاعدة البيانات ليظهر الفيديو في صفحتك فوراً
    const groupsRef = db.ref('live_stream/groups');
    const snapshot = await groupsRef.once('value');
    let groupId = null;

    // البحث عن ID مجموعة "لوس"
    snapshot.forEach((child) => {
        if (child.val().name === folderName) {
            groupId = child.key;
        }
    });

    // إذا لم تكن المجموعة موجودة، يقوم البوت بإنشائها
    if (!groupId) {
        console.log("⚠️ مجموعة 'لوس' غير موجودة، سأقوم بإنشائها الآن...");
        const newGroup = await groupsRef.push({ name: folderName });
        groupId = newGroup.key;
    }

    // إضافة الحلقة للمكتبة
    const libraryRef = db.ref('live_stream/library');
    await libraryRef.push({
        name: fileName,
        url: publicUrl,
        groupId: groupId
    });

    console.log("🎉 اكتمل السحر! الفيديو الآن في صفحتك وجاهز للمشاهدة.");
    process.exit(0);
}

// معالجة الأخطاء بشكل احترافي
start().catch(err => {
    console.error("❌ فشل البوت في المهمة:");
    console.error("السبب:", err.message);
    process.exit(1);
});
