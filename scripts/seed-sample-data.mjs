#!/usr/bin/env node
/**
 * Seed sample Islamic content into Cloud Firestore (§46).
 *
 * Populates:
 *   - Categories (Quran, Hadith, Salah, Seerah, Dua, Bayan, Events, Reminders)
 *   - Multilingual Posts (Reminders, Quran Reflections, Authentic Hadith, Articles)
 *   - YouTube Videos (Verified educational/Quranic recitation video IDs)
 *   - Events (Upcoming Halqah, Community lecture, Historical completed Ramadan archive)
 *   - Platform Site Settings (Featured video and posts)
 *
 * Usage:
 *   node scripts/seed-sample-data.mjs
 *
 * Prerequisites:
 *   1. npm.cmd i -D firebase-admin
 *   2. Set GOOGLE_APPLICATION_CREDENTIALS or use Application Default Credentials.
 */

let admin;
try {
  admin = await import('firebase-admin');
} catch {
  console.error('firebase-admin is not installed. Run:  npm.cmd i -D firebase-admin');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
});

const db = admin.firestore();
const now = admin.firestore.Timestamp.now();

console.log('Seeding sample data into Cloud Firestore...');

// ── 1. Categories ────────────────────────────────────────────────────────────
const categories = [
  {
    key: 'quran',
    name: { en: 'Holy Quran', ur: 'قرآن پاک', ar: 'القرآن الكريم' },
    slug: 'quran',
    description: {
      en: 'Recitations, reflections, and teachings from the Holy Quran.',
      ur: 'قرآن مجید کی تلاوت، تفاسیر اور رہنمائی۔',
      ar: 'تلاوات وتفسير وتأملات في آيات القرآن الكريم.',
    },
    icon: 'book',
    isActive: true,
    sortOrder: 1,
  },
  {
    key: 'hadith',
    name: { en: 'Hadith & Sunnah', ur: 'حدیث اور سنت', ar: 'الحديث والسنة' },
    slug: 'hadith',
    description: {
      en: 'Authentic traditions and moral teachings of the Prophet Muhammad ﷺ.',
      ur: 'رسول اکرم ﷺ کے فرامین، ارشادات اور پاکیزہ سنت۔',
      ar: 'الأحاديث النبوية الشريفة وتوجيهات السيرة العطرة.',
    },
    icon: 'post',
    isActive: true,
    sortOrder: 2,
  },
  {
    key: 'reminders',
    name: { en: 'Daily Reminders', ur: 'روزانہ کے اسباق', ar: 'تذكيرات يومية' },
    slug: 'reminders',
    description: {
      en: 'Heart-touching daily reminders for spiritual purification and mindfulness.',
      ur: 'روحانی پاکیزگی اور قلبی سکون کے لیے روزانہ کے سبق آموز پیغامات۔',
      ar: 'مواعظ ورسائل يومية لتزكية النفس واستحضار خشية الله.',
    },
    icon: 'sparkle',
    isActive: true,
    sortOrder: 3,
  },
  {
    key: 'salah',
    name: { en: 'Salah & Worship', ur: 'نماز اور عبادات', ar: 'الصلاة والعبادات' },
    slug: 'salah',
    description: {
      en: 'Guides and insights on prayer, fasting, and devotional worship.',
      ur: 'نماز، روزہ اور تمام عبادات کی فضیلت اور احکام۔',
      ar: 'أحكام وفضائل الصلاة والصيام وسائر الطاعات.',
    },
    icon: 'mosque',
    isActive: true,
    sortOrder: 4,
  },
  {
    key: 'dua',
    name: { en: 'Duas & Adhkar', ur: 'دعائیں اور اذکار', ar: 'الأدعية والأذكار' },
    slug: 'dua',
    description: {
      en: 'Authentic supplications and daily remembrance from the Sunnah.',
      ur: 'مسنون دعائیں، صبح و شام کے اذکار اور استغفار۔',
      ar: 'الأذكار المأثورة والأدعية المستجابة من صحيح السنة.',
    },
    icon: 'heart',
    isActive: true,
    sortOrder: 5,
  },
  {
    key: 'bayan',
    name: { en: 'Lectures & Bayans', ur: 'بیانات و خطابات', ar: 'المحاضرات والدروس' },
    slug: 'bayan',
    description: {
      en: 'Inspiring speeches, scholarly talks, and video lectures.',
      ur: 'علمائے کرام کے فکر انگیز بیانات، دروس اور تقاریر۔',
      ar: 'خطب ودروس علمية نافعة لعلماء الأمة.',
    },
    icon: 'video',
    isActive: true,
    sortOrder: 6,
  },
  {
    key: 'events',
    name: { en: 'Islamic Events', ur: 'اسلامی تقریبات', ar: 'الفعاليات الإسلامية' },
    slug: 'events',
    description: {
      en: 'Community gatherings, webinars, and educational events.',
      ur: 'روحانی محافل، سیمینارز اور تربیتی نشستیں۔',
      ar: 'الندوات والملتقيات والمحاضرات العامة.',
    },
    icon: 'calendar',
    isActive: true,
    sortOrder: 7,
  },
];

const categoryIdMap = new Map();

for (const cat of categories) {
  const existing = await db.collection('categories').where('slug', '==', cat.slug).limit(1).get();
  if (!existing.empty) {
    categoryIdMap.set(cat.key, existing.docs[0].id);
    console.log(` Category exists: ${cat.name.en} (${existing.docs[0].id})`);
  } else {
    const ref = db.collection('categories').doc();
    await ref.set({
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      icon: cat.icon,
      isActive: cat.isActive,
      sortOrder: cat.sortOrder,
      createdAt: now,
      updatedAt: now,
    });
    categoryIdMap.set(cat.key, ref.id);
    console.log(`+ Category created: ${cat.name.en} (${ref.id})`);
  }
}

// ── Search Tokenizer ─────────────────────────────────────────────────────────
function buildKeywords(...texts) {
  const set = new Set();
  for (const text of texts) {
    if (!text) continue;
    const words = String(text).toLowerCase().split(/[\s,.;:!?()«»"']+/).filter(Boolean);
    for (const word of words) {
      for (let i = 2; i <= Math.min(word.length, 15); i++) {
        set.add(word.slice(0, i));
      }
    }
  }
  return Array.from(set).slice(0, 50);
}

// ── 2. Posts ─────────────────────────────────────────────────────────────────
const posts = [
  {
    catKey: 'reminders',
    type: 'reminder',
    title: {
      en: '[Demo] Daily Reminder: Sincerity in Every Intention',
      ur: '[ڈیمو] روزانہ کی نصیحت: نیتوں کا اخلاص',
      ar: '[تجريبي] تذكرة يومية: إخلاص النية لله تعالى',
    },
    description: {
      en: 'The foundation of every accepted deed lies in sincere devotion to Allah alone.',
      ur: 'ہر عمل کی قبولیت کا دارو مدار خالص نیت اور للہیت پر ہے۔',
      ar: 'أساس قبول الأعمال الصالحة هو تجريد الإخلاص لله وحده.',
    },
    content: {
      en: 'Always renew your intentions before undertaking any good deed. The Prophet Muhammad ﷺ said: "Actions are judged by intentions, and every person will get what they intended." Make every small act of kindness purely for the pleasure of Allah Almighty.',
      ur: 'کوئی بھی نیک کام شروع کرنے سے پہلے اپنی نیت کی تجدید کیجیے۔ نبی اکرم ﷺ کا فرمان ہے: "اعمال کا دارومدار نیتوں پر ہے، اور ہر شخص کو وہی ملے گا جس کی اس نے نیت کی۔" اپنے ہر عمل کو خالصتاً اللہ تعالیٰ کی رضا کے لیے وقف کیجیے۔',
      ar: 'جدد نيتك دائمًا قبل كل عمل صالح. قال النبي ﷺ: "إنما الأعمال بالنيات، وإنما لكل امرئ ما نوى". فاجعل كل سعي وعمل خالصًا لوجه الله الكريم وابتغاء مرضاته.',
    },
    status: 'published',
    publishedAt: now,
    featured: true,
    tags: ['Ikhlas', 'Niyyah', 'Reminder', 'Daily'],
    source: 'Prophetic Guidance',
    reference: 'Sahih al-Bukhari 1',
    book: 'Book of Revelation',
    hadithNumber: '1',
  },
  {
    catKey: 'quran',
    type: 'quran',
    title: {
      en: '[Demo] Reflection on Surah Al-Ikhlas (The Purity of Faith)',
      ur: '[ڈیمو] سورۃ الاخلاص پر تدبر: ایمان کا خالص ہونا',
      ar: '[تجريبي] تأملات في سورة الإخلاص: توحيد الله الصمد',
    },
    description: {
      en: 'Surah Al-Ikhlas encapsulates the core Islamic belief in the absolute oneness of God.',
      ur: 'سورۃ الاخلاص عقیدہ توحید کی کامل ترین اور جامع ترین ترجمان ہے۔',
      ar: 'سورة الإخلاص جامعة لمعاني التوحيد الخالص لله سبحانه.',
    },
    content: {
      en: 'Surah Al-Ikhlas is equal to one-third of the Quran in virtue. Allah states: "Say, He is Allah, [who is] One, Allah, the Eternal Refuge. He neither begets nor is born, Nor is there to Him any equivalent." Contemplating this Surah strengthens conviction and cleanses the heart from doubts.',
      ur: 'سورۃ الاخلاص فضیلت میں ایک تہائی قرآن کے برابر ہے۔ ارشاد باری تعالیٰ ہے: "کہہ دیجیے: وہ اللہ ایک ہے، اللہ بے نیاز ہے، نہ اس کی کوئی اولاد ہے اور نہ وہ کسی کی اولاد ہے، اور کوئی اس کے برابر نہیں ہے۔" اس سورت پر غور و خوض ایمان کو جلا بخشتا ہے۔',
      ar: 'سورة الإخلاص تعدل ثلث القرآن في الفضل. قال تعالى: "قُلْ هُوَ اللَّهُ أَحَدٌ، اللَّهُ الصَّمَدُ، لَمْ يَلِدْ وَلَمْ يُولَدْ، وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ". تدبر هذه السورة يرسخ الإيمان ويزكي القلوب بنور التوحيد.',
    },
    status: 'published',
    publishedAt: now,
    featured: true,
    tags: ['Quran', 'Tawheed', 'Surah Al-Ikhlas', 'Reflection'],
    source: 'The Holy Quran',
    reference: 'Surah Al-Ikhlas (Chapter 112: 1-4)',
    chapter: '112',
  },
  {
    catKey: 'hadith',
    type: 'hadith',
    title: {
      en: '[Demo] Spreading Peace and Greeting One Another',
      ur: '[ڈیمو] سلام کو عام کرنا اور باہمی محبت کو فروغ دینا',
      ar: '[تجريبي] إفشاء السلام وبناء المودة بين المؤمنين',
    },
    description: {
      en: 'The Prophet ﷺ taught that spreading greeting of peace brings affection among people.',
      ur: 'نبی کریم ﷺ نے باہمی محبت اور الفت کے فروغ کے لیے سلام عام کرنے کا درس دیا۔',
      ar: 'بين النبي ﷺ أن إفشاء السلام من أعظم أسباب المحبة بين المؤمنين.',
    },
    content: {
      en: 'Abu Hurairah reported: The Messenger of Allah ﷺ said: "You will not enter Paradise until you believe, and you will not believe until you love one another. Shall I not guide you to something which, if you do it, you will love one another? Spread peace (salam) among yourselves."',
      ur: 'حضرت ابوہریرہ رضی اللہ عنہ سے روایت ہے کہ رسول اللہ ﷺ نے فرمایا: "تم جنت میں داخل نہیں ہو سکتے جب تک ایمان نہ لاؤ، اور تم مومن نہیں ہو سکتے جب تک آپس میں محبت نہ کرو۔ کیا میں تمہیں وہ بات نہ بتاؤں کہ جب تم اسے کرو تو آپس میں محبت کرنے لگو؟ آپس میں سلام کو عام کرو۔"',
      ar: 'عن أبي هريرة رضي الله عنه قال: قال رسول الله ﷺ: "لا تدخلون الجنة حتى تؤمنوا، ولا تؤمنوا حتى تحابوا، أوَلا أدلكم على شيء إذا فعلتموه تحاببتم؟ أفشوا السلام بينكم".',
    },
    status: 'published',
    publishedAt: now,
    featured: false,
    tags: ['Hadith', 'Salam', 'Brotherhood', 'Peace'],
    source: 'Hadith Sharif',
    reference: 'Sahih Muslim 54',
    book: 'Book of Faith',
    hadithNumber: '54',
  },
  {
    catKey: 'reminders',
    type: 'article',
    title: {
      en: '[Demo] The Virtue and Blessings of Patience (Sabr)',
      ur: '[ڈیمو] صبر کی فضیلت اور آزمائش میں استقامت',
      ar: '[تجريبي] فضل الصبر ومنازل الاستقامة عند الابتلاء',
    },
    description: {
      en: 'An educational reflection on maintaining steadfastness and trust in Allah during hardships.',
      ur: 'مشکلات اور آزمائشوں میں صبر و رضا اور اللہ پر بھروسہ رکھنے کے ثمرات۔',
      ar: 'مقال تربوي حول عاقبة الصابرين وحسن الظن بالله في الشدائد.',
    },
    content: {
      en: 'Patience (Sabr) is described in the Islamic tradition as an illuminating light (Diya). It encompasses perseverance in obedience, restraint from harmful deeds, and contentment with the divine decree. Those who exercise patience are promised unfailing comfort and abundant rewards.',
      ur: 'صبر کو اسلامی تعلیمات میں روشنی اور نور قرار دیا گیا ہے۔ اس میں نیکی پر ثابت قدمی، برائی سے رکنا اور اللہ کی رضا پر راضی رہنا شامل ہے۔ صبر کرنے والوں کے لیے قرآن میں بے حساب اجر کی خوشخبری دی گئی ہے۔',
      ar: 'الصبر ضياء كما جاء في الحديث الشريف. وهو حبس النفس على طاعة الله، وعن معصيته، والرضا بقضائه وقدره. وقد بشر الله الصابرين بأجر عظيم وجزاء كريم لا يحصى.',
    },
    status: 'published',
    publishedAt: now,
    featured: true,
    tags: ['Sabr', 'Patience', 'Spiritual', 'Article'],
    source: 'Rohani Shifa Educational Series',
  },
];

const postIds = [];
for (const p of posts) {
  const catId = categoryIdMap.get(p.catKey);
  const ref = db.collection('posts').doc();
  await ref.set({
    type: p.type,
    title: p.title,
    description: p.description,
    content: p.content,
    categoryIds: catId ? [catId] : [],
    status: p.status,
    publishedAt: p.publishedAt,
    featured: p.featured,
    tags: p.tags,
    relatedVideoIds: [],
    relatedEventIds: [],
    source: p.source || '',
    reference: p.reference || '',
    book: p.book || '',
    hadithNumber: p.hadithNumber || '',
    chapter: p.chapter || '',
    searchKeywords: buildKeywords(p.title.en, p.title.ur, p.title.ar, ...(p.tags || [])),
    likesCount: 0,
    commentsCount: 0,
    authorId: 'admin',
    createdAt: now,
    updatedAt: now,
  });
  postIds.push(ref.id);
  console.log(`+ Post created: ${p.title.en} (${ref.id})`);
}

// ── 3. Videos ────────────────────────────────────────────────────────────────
const videos = [
  {
    catKey: 'quran',
    youtubeId: 'F73kK35Qy-k',
    youtubeUrl: 'https://www.youtube.com/watch?v=F73kK35Qy-k',
    title: {
      en: '[Demo] Soulful Recitation of Surah Al-Fatiha',
      ur: '[ڈیمو] سورۃ الفاتحہ کی روح پرور تلاوت',
      ar: '[تجريبي] تلاوة خاشعة ومؤثرة لسورة الفاتحة المباركة',
    },
    description: {
      en: 'A clear and melodious Quranic recitation of the Opening Chapter with English and Urdu subtitles.',
      ur: 'سورۃ الفاتحہ کی خوبصورت تجوید اور پرسکون انداز میں تلاوت۔',
      ar: 'تلاوة ندية مرتلة ومتقنة لأم الكتاب مع الترجمة.',
    },
    thumbnailUrl: 'https://img.youtube.com/vi/F73kK35Qy-k/hqdefault.jpg',
    status: 'published',
    publishedAt: now,
    featured: true,
    tags: ['Quran', 'Surah Al-Fatiha', 'Recitation', 'Tajweed'],
  },
  {
    catKey: 'dua',
    youtubeId: '0kF41i-5aB4',
    youtubeUrl: 'https://www.youtube.com/watch?v=0kF41i-5aB4',
    title: {
      en: '[Demo] Morning & Evening Adhkar for Peace of Mind',
      ur: '[ڈیمو] صبح و شام کے مسنون اذکار برائے قلبی سکون',
      ar: '[تجريبي] أذكار الصباح والمساء لطمأنينة القلب والتحصين',
    },
    description: {
      en: 'Selected authentic prayers and daily supplications for tranquility, barakah, and spiritual protection.',
      ur: 'برکت اور روحانی تحفظ کے لیے صبح و شام پڑھے جانے والے مسنون اذکار۔',
      ar: 'أذكار الحفظ والسكينة المستحبة في الصباح والمساء من صحيح الأثر.',
    },
    thumbnailUrl: 'https://img.youtube.com/vi/0kF41i-5aB4/hqdefault.jpg',
    status: 'published',
    publishedAt: now,
    featured: false,
    tags: ['Dua', 'Adhkar', 'Supplication', 'Remembrance'],
  },
];

const videoIds = [];
for (const v of videos) {
  const catId = categoryIdMap.get(v.catKey);
  const ref = db.collection('videos').doc();
  await ref.set({
    youtubeId: v.youtubeId,
    youtubeUrl: v.youtubeUrl,
    title: v.title,
    description: v.description,
    categoryIds: catId ? [catId] : [],
    thumbnailUrl: v.thumbnailUrl,
    status: v.status,
    publishedAt: v.publishedAt,
    featured: v.featured,
    relatedPostIds: [],
    relatedEventIds: [],
    tags: v.tags,
    searchKeywords: buildKeywords(v.title.en, v.title.ur, v.title.ar, v.youtubeId),
    likesCount: 0,
    commentsCount: 0,
    authorId: 'admin',
    createdAt: now,
    updatedAt: now,
  });
  videoIds.push(ref.id);
  console.log(`+ Video created: ${v.title.en} (${ref.id})`);
}

// ── 4. Events ────────────────────────────────────────────────────────────────
const events = [
  {
    catKey: 'events',
    title: {
      en: '[Demo] Weekly Online Quran & Hadith Study Circle',
      ur: '[ڈیمو] ہفتہ وار آن لائن درس قرآن و حدیث',
      ar: '[تجريبي] حلقة أسبوعية لمدارسة القرآن والحديث الشريف',
    },
    description: {
      en: 'Join our weekly virtual gathering to study foundational Quranic concepts, prophetic wisdom, and answers to spiritual questions. Open to brothers and sisters worldwide.',
      ur: 'ہمارے ہفتہ وار آن لائن فہم دین حلقے میں شرکت کیجیے، جہاں بنیادی اسلامی اسباق اور تفہیم احادیث پر گفتگو ہوتی ہے۔ تمام افراد کے لیے شرکت عام ہے۔',
      ar: 'ندعوكم للمشاركة في حلقتنا الأسبوعية عبر الإنترنت لدراسة معاني القرآن العظيم وهدي السنة النبوية وإجابة الأسئلة الإيمانية.',
    },
    startDate: admin.firestore.Timestamp.fromMillis(Date.now() + 5 * 24 * 60 * 60 * 1000),
    endDate: admin.firestore.Timestamp.fromMillis(Date.now() + 5 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
    location: 'Virtual Classroom (Zoom / Live Stream)',
    isOnline: true,
    meetingUrl: 'https://zoom.us',
    status: 'published',
  },
  {
    catKey: 'events',
    title: {
      en: '[Demo] Monthly Community Spiritual Gathering & Bayan',
      ur: '[ڈیمو] ماہانہ روحانی اجتماع اور اصلاحی بیان',
      ar: '[تجريبي] الملتقى الإيماني الشهري وموعظة جامعة',
    },
    description: {
      en: 'An in-person gathering focusing on inner peace, communal remembrance, and moral growth. Light refreshments will be served.',
      ur: 'ایک پُروقار اور بابرکت مجلس جس میں تزکیہ نفس اور اصلاحی موضوعات پر رہنمائی فراہم کی جائے گی۔',
      ar: 'لقاء إيماني مبارك يهدف إلى ترسيخ الأخوة الإسلامية وتزكية النفوس وسماع المواعظ النافعة.',
    },
    startDate: admin.firestore.Timestamp.fromMillis(Date.now() + 14 * 24 * 60 * 60 * 1000),
    endDate: admin.firestore.Timestamp.fromMillis(Date.now() + 14 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000),
    location: 'Rohani Shifa Islamic Center, Main Hall',
    isOnline: false,
    status: 'published',
  },
  {
    catKey: 'events',
    title: {
      en: '[Demo Archive] Ramadan Special Night of Supplication',
      ur: '[ڈیمو آرکائیو] رمضان المبارک کی دعائیہ شب اور اختتامی نشست',
      ar: '[تجريبي أرشيف] ليلة الدعاء وختم القرآن في شهر رمضان المبارك',
    },
    description: {
      en: 'Archived record of our Ramadan special night gathering. Historical events are permanently preserved in the archives (§17).',
      ur: 'ماہ رمضان کی بابرکت رات کے خصوصی پروگرام کا محفوظ شدہ ریکارڈ۔ تاریخی ریکارڈ ہمیشہ محفوظ رکھا جاتا ہے۔',
      ar: 'سجل محفوظ من فعاليات شهر رمضان المبارك المباركة، حفظًا للتاريخ والذكريات الإيمانية.',
    },
    startDate: admin.firestore.Timestamp.fromMillis(Date.now() - 120 * 24 * 60 * 60 * 1000),
    endDate: admin.firestore.Timestamp.fromMillis(Date.now() - 120 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000),
    location: 'Rohani Shifa Islamic Center',
    isOnline: false,
    status: 'completed',
  },
];

for (const e of events) {
  const catId = categoryIdMap.get(e.catKey);
  const ref = db.collection('events').doc();
  await ref.set({
    title: e.title,
    description: e.description,
    startDate: e.startDate,
    endDate: e.endDate,
    location: e.location,
    isOnline: e.isOnline,
    meetingUrl: e.meetingUrl || '',
    categoryId: catId || null,
    relatedPostIds: [],
    relatedVideoIds: [],
    status: e.status,
    searchKeywords: buildKeywords(e.title.en, e.title.ur, e.title.ar, e.location),
    createdAt: now,
    updatedAt: now,
    createdBy: 'admin',
  });
  console.log(`+ Event created: ${e.title.en} (${ref.id})`);
}

// ── 5. Platform Settings ─────────────────────────────────────────────────────
await db.collection('settings').doc('site').set({
  featuredVideoId: videoIds[0] || null,
  featuredPostIds: postIds.slice(0, 3),
  updatedAt: now,
}, { merge: true });

console.log('✓ Platform settings configured with featured items.');
console.log('✓ Seeding complete! All collections populated successfully.');
