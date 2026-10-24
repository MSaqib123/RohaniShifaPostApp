import { Injectable, inject } from '@angular/core';
import { getAI, getGenerativeModel, GenerativeModel } from 'firebase/ai';
import { FirebaseService } from '../firebase/firebase.service';
import { SupportedLanguage } from '../../i18n/language.types';

export interface IslamicAiResponse {
  query: string;
  answer: string;
  source?: string;
  reference?: string;
  relatedAyah?: string;
  relatedHadith?: string;
  relatedTopics: string[];
  isIslamic: boolean;
  isIslamicOnlyNotice: boolean;
  generatedByFirebaseAi: boolean;
}

const ISLAMIC_SYSTEM_INSTRUCTION = `
You are "Rohani Shifa Islamic AI", an authentic, respectful, and scholarly Islamic AI search engine and knowledge assistant.

CRITICAL POLICIES & BOUNDARIES:
1. ONLY ISLAMIC SEARCH: You exclusively answer questions about Islam, the Holy Quran, Sunnah, Sahih Hadith, Islamic jurisprudence (Fiqh basics), Islamic history, Seerah of Prophet Muhammad ﷺ, Prophets in Islam, Duas, Adhkar, and spiritual healing (Rohani Shifa).
2. NON-ISLAMIC QUERIES: If a user asks about non-Islamic topics (such as worldly politics, movies, entertainment, sports, non-Islamic secular code, celebrity gossip, gambling, dating, or harmful matters), you must politely and warmly decline with this exact message:
   "I am an Islamic AI Assistant dedicated exclusively to Islamic knowledge, Quran, Sunnah, and Rohani Shifa. Please ask me any question related to Islamic teachings, Duas, prayers, or guidance." (Translate into the language requested).
3. AUTHENTICITY & CITATIONS: Always cite authentic Quranic Surahs and Ayah numbers (e.g. Surah Al-Baqarah 2:152) and Sahih Hadith collections (e.g. Sahih al-Bukhari, Sahih Muslim, Sunan al-Tirmidhi) with numbers whenever applicable.
4. TONE & MANNERS: Always begin with Islamic greetings (Bismillah, Assalamu Alaikum) when appropriate, use honorifics (ﷺ, علیہ السلام, رضی اللہ عنہ), and maintain a compassionate, unifying, mainstream Islamic perspective.
5. LANGUAGE: Respond strictly in the language of the prompt or requested language (English, Urdu, or Arabic).
`;

interface FallbackIslamicTopic {
  keywords: string[];
  title: Record<SupportedLanguage, string>;
  answer: Record<SupportedLanguage, string>;
  reference: string;
  source: string;
  relatedTopics: Record<SupportedLanguage, string[]>;
}

const FALLBACK_ISLAMIC_LIBRARY: FallbackIslamicTopic[] = [
  {
    keywords: [
      'prophet', 'muhammad', 'born', 'birth', 'seerah', 'rasool', 'messenger',
      'milad', 'mawlid', 'نبی', 'رسول', 'محمد', 'ولادت', 'میلاد', 'سیرت', 'مولد'
    ],
    title: {
      en: 'Birth and Life of Prophet Muhammad ﷺ (Seerah)',
      ur: 'سیرت النبی ﷺ اور ولادتِ با سعادت',
      ar: 'مولد النبي ﷺ وسيرته العطرة',
    },
    answer: {
      en: 'The Final Messenger of Allah, Prophet Muhammad ﷺ, was born in Makkah in the Year of the Elephant (Aam al-Feel), on Monday, the 12th of Rabi\' al-Awwal (approximately April 571 CE).\n\nKey Milestones of the Blessed Seerah:\n1. Lineage: Belonged to the noble Banu Hashim clan of Quraysh, descending from Prophet Ibrahim (Abraham) and Prophet Ismail (Ishmael) peace be upon them. His father was Abdullah (who passed away before his birth) and his mother was Sayyidah Aminah.\n2. Character: Known before Prophethood as "Al-Sadiq" (The Truthful) and "Al-Amin" (The Trustworthy).\n3. First Revelation: At age 40 in Cave Hira, Angel Jibreel brought the first revelation: "Recite in the name of your Lord who created" (Surah Al-Alaq 96:1).\n4. Universal Mission: Sent as mercy to the entire creation: "And We have not sent you except as a mercy to the worlds" (Surah Al-Anbiya 21:107).',
      ur: 'خاتم النبیین، سرورِ کائنات، حضرت محمد مصطفیٰ ﷺ کی ولادتِ با سعادت عام الفیل میں، پیر کے روز 12 ربیع الاول (مطابق اپریل 571ء) کو مکہ مکرمہ میں ہوئی۔\n\nسیرتِ طیبہ کے نمایاں گوشے:\n1. مبارک نسب: آپ ﷺ قریش کے معزز ترین قبیلے بنو ہاشم سے تعلق رکھتے تھے جو حضرت ابراہیم و حضرت اسماعیل علیہما السلام کی اولاد ہیں۔ والد ماجد حضرت عبداللہ اور والدہ ماجدہ حضرت سیدہ آمنہ رضی اللہ عنہا ہیں۔\n2. صفات: نبوت سے قبل بھی مکہ کے لوگ آپ کو "صادق" (سچا) اور "امین" (امانت دار) کے لقب سے پکارتے تھے۔\n3. بعثت و پہلی وحی: 40 سال کی عمر مبارک میں غارِ حرا میں پہلی وحی سورۃ العلق نازل ہوئی: ”پڑھیے اپنے رب کے نام سے جس نے پیدا کیا“۔\n4. رحمت للعالمین: اللہ تعالیٰ کا فرمان ہے: ”اور ہم نے آپ کو تمام جہانوں کے لیے رحمت بنا کر ہی بھیجا ہے“ (سورۃ الانبیاء: 107)۔',
      ar: 'ولد خاتم الأنبياء والمرسلين سيدنا محمد ﷺ في مكة المكرمة في عام الفيل، يوم الإثنين الثاني عشر من شهر ربيع الأول (الموافق سنة 571م).\n\nمحطات من السيرة النبوية العطرة:\n1. النسب الشريف: ينحدر من بني هاشم من قبيلة قريش، من ذرية إسماعيل وإبراهيم عليهما السلام. والده عبد الله، وأمه آمنة بنت وهب.\n2. اللقب والصفات: عُرف قبل البعثة بالصادق الأمين لما تميز به من صدق الحديث والأمانة.\n3. البعثة والوحي: أُنزل عليه الوحي في سن الأربعين في غار حراء، وكانت أول آية نزلت: ﴿اقْرَأْ بِاسْمِ رَبِّكَ الَّذِي خَلَقَ﴾ [العلق: 1].\n4. رحمته للعالمين: قال تعالى: ﴿وَمَا أَرْسَلْنَاكَ إِلَّا رَحْمَةً لِّلْعَالَمِينَ﴾ [الأنبياء: 107].',
    },
    reference: 'Surah Al-Anbiya (21:107) & Ar-Raheeq Al-Makhtum',
    source: 'The Holy Quran & Sahih al-Bukhari',
    relatedTopics: {
      en: ['Darood Shareef virtues', 'Sunnah lifestyle', 'Miracles of Prophet Muhammad ﷺ'],
      ur: ['درود شریف کے فضائل', 'سنتِ نبوی اور اخلاق', 'معجزاتِ رسول ﷺ'],
      ar: ['فضل الصلاة على النبي ﷺ', 'أخلاق النبي وسنته', 'معجزات الرسول ﷺ'],
    },
  },
  {
    keywords: ['dua', 'supplication', 'prayer', 'دعا', 'الدعاء', 'طلب'],
    title: {
      en: 'The Power and Etiquette of Dua in Islam',
      ur: 'اسلام میں دعا کی فضیلت اور آداب',
      ar: 'فضل الدعاء وآدابه في الإسلام',
    },
    answer: {
      en: 'In Islam, Dua is the core of worship. Allah says in the Holy Quran: "Call upon Me; I will respond to you" (Surah Ghafir 40:60). The Messenger of Allah ﷺ said: "Dua is the very essence of worship" (Sunan al-Tirmidhi 3371).\n\nKey etiquettes of accepted Dua:\n1. Begin with praise of Allah (Alhamdulillah) and sending peace and blessings upon the Prophet ﷺ (Darood Shareef).\n2. Supplicate with humble heart and certitude of acceptance.\n3. Best times: In Sujood (prostration), the last third of the night (Tahajjud), between Adhan and Iqamah, and on Friday afternoon.',
      ur: 'اسلام میں دعا کو عبادت کا مغز قرار دیا گیا ہے۔ اللہ تعالیٰ کا فرمان ہے: ”مجھے پکارو، میں تمہاری دعا قبول کروں گا“ (سورۃ غافر: 60)۔ رسول اللہ ﷺ نے فرمایا: ”دعا ہی اصل عبادت ہے“ (جامع ترمذی: 3371)۔\n\nدعا کی قبولیت کے اہم آداب:\n1. اللہ تعالیٰ کی حمد و ثنا اور نبی کریم ﷺ پر درود شریف سے آغاز کریں۔\n2. مکمل یقین اور عاجزی کے ساتھ دعا مانگیں۔\n3. قبولیت کے خاص اوقات: سجدے کی حالت میں، رات کے آخری پہر (تہجد)، اذان و اقامت کے درمیان اور جمعہ کے دن عصر کے بعد۔',
      ar: 'الدعاء في الإسلام هو العبادة ومفتاح كل خير. قال الله تعالى: ﴿وَقَالَ رَبُّكُمُ ادْعُونِي أَسْتَجِبْ لَكُمْ﴾ [غافر: 60]. وقال النبي ﷺ: «الدُّعَاءُ هُوَ الْعِبَادَةُ» (رواه الترمذي 3371).\n\nمن آداب الدعاء:\n1. البدء بحمد الله والثناء عليه والصلاة والسلام على رسوله ﷺ.\n2. الإلحاح واليقين التام بالإجابة دون تعجل.\n3. تحري أوقات الإجابة: في السجود، والثلث الأخير من الليل، وبين الأذان والإقامة، وساعة الإجابة يوم الجمعة.',
    },
    reference: 'Surah Ghafir (40:60)',
    source: 'The Holy Quran & Tirmidhi 3371',
    relatedTopics: {
      en: ['Dua for forgiveness', 'Tahajjud prayer', 'Dhikr and morning duas'],
      ur: ['تہجد کی نماز', 'استغفار کی فضیلت', 'صبح و شام کے اذکار'],
      ar: ['أذكار الصباح والمساء', 'صلاة التهجد', 'أدعية الشفاء'],
    },
  },
  {
    keywords: ['sabr', 'patience', 'hardship', 'صبر', 'الصبر', 'مشکل', 'تنگی', 'ابتلاء'],
    title: {
      en: 'Patience (Sabr) and Perseverance in the Quran',
      ur: 'قرآن و حدیث میں صبر اور استقامت کی فضیلت',
      ar: 'فضل الصبر وجزاء الصابرين في القرآن',
    },
    answer: {
      en: 'Patience (Sabr) is one of the highest spiritual virtues in Islam. Allah states: "Indeed, Allah is with the patient" (Surah Al-Baqarah 2:153) and "Only those who are patient shall receive their reward in full, without reckoning" (Surah Az-Zumar 39:10).\n\nSabr has three levels:\n1. Patience in obeying Allah’s commandments.\n2. Patience in staying away from sins and desires.\n3. Patience during trials and hardships, trusting Allah’s divine decree.',
      ur: 'صبر اسلام کا عظیم ترین ستون ہے۔ قرآنِ مجید میں ارشاد ہے: ”بیشک اللہ صبر کرنے والوں کے ساتھ ہے“ (سورۃ البقرہ: 153) اور ”صبر کرنے والوں کو ان کا اجر بے حساب دیا جائے گا“ (سورۃ الزمر: 10)۔\n\nصبر کے تین درجات ہیں:\n1. اللہ تعالیٰ کی اطاعت اور عبادات کی پابندی پر صبر۔\n2. گناہوں اور نفسانی خواہشات سے رکنے پر صبر۔\n3. مصائب و مشکلات میں شکوہ کیے بغیر رضا بر قضا کا مظاہرہ کرنا۔',
      ar: 'الصبر ضياء المؤمن ومعراجه إلى درجات الرضوان. قال تعالى: ﴿إِنَّ اللَّهَ مَعَ الصَّابِرِينَ﴾ [البقرة: 153]، وقال سبحانه: ﴿إِنَّمَا يُوَفَّى الصَّابِرُونَ أَجْرَهُم بِغَيْرِ حِسَابٍ﴾ [الزمر: 10].\n\nأنواع الصبر:\n1. صبر على طاعة الله تعالى والاستمرار فيها.\n2. صبر عن معصية الله ومجاهدة هوى النفس.\n3. صبر على أقدار الله المؤلمة وحسن الظن برحمته.',
    },
    reference: 'Surah Al-Baqarah (2:153) & Az-Zumar (39:10)',
    source: 'The Holy Quran',
    relatedTopics: {
      en: ['Trust in Allah (Tawakkul)', 'Trials in Islam', 'Gratitude (Shukr)'],
      ur: ['توکل علی اللہ', 'شکر کی فضیلت', 'مشکلات سے نجات کی دعائیں'],
      ar: ['التوكل على الله', 'فضل الشكر', 'الرضا بالقضاء والقدر'],
    },
  },
  {
    keywords: ['shifa', 'healing', 'cure', 'شفاء', 'شفا', 'بیماری', 'علاج', 'تندرستی', 'دم'],
    title: {
      en: 'Spiritual & Physical Healing (Rohani Shifa) in Islam',
      ur: 'اسلام میں روحانی شفا اور تندرستی کی تعلیمات',
      ar: 'الشفاء بالقرآن والرقى الشرعية',
    },
    answer: {
      en: 'The Quran is described by Allah as a complete cure and mercy: "And We send down of the Quran that which is healing and mercy for the believers" (Surah Al-Isra 17:82).\n\nProphetic Sunnah remedies for healing:\n1. Reciting Surah Al-Fatiha, Ayat al-Kursi, and the Mu’awwidhat (Surah Al-Falaq and Surah An-Nas).\n2. The Prophetic Dua: "Allahumma Rabba an-nas, adhhib al-ba\'s, ishfi anta ash-Shafi, la shifa\'a illa shifa\'uk" (O Allah, Lord of mankind, remove the illness and cure, for You are the Healer).\n3. Seeking medical treatment alongside spiritual supplication, as the Prophet ﷺ advised seeking medicine for illnesses.',
      ur: 'اللہ تعالیٰ نے قرآنِ مجید کو مومنوں کے لیے شفا اور رحمت قرار دیا ہے: ”اور ہم قرآن میں سے وہ چیز نازل کرتے ہیں جو شفا ہے اور مومنوں کے لیے رحمت ہے“ (سورۃ الاسراء: 82)۔\n\nنبوی طریقہ علاج و دعائیں:\n1. سورۃ الفاتحہ، آیت الکرسی اور معوذتین (سورۃ الفلق اور سورۃ الناس) پڑھ کر دم کرنا۔\n2. مسنون دعا: «اللهم رب الناس أذهب البأس اشف أنت الشافي لا شفاء إلا شفاؤك»۔\n3. دعا اور روحانی دم کے ساتھ ساتھ طبی علاج معالجہ کروانا سنتِ نبوی ہے۔',
      ar: 'القرآن الكريم شفاء للقلوب والأبدان، قال تعالى: ﴿وَنُنَزِّلُ مِنَ الْقُرْآنِ مَا هُوَ شِفَاءٌ وَرَحْمَةٌ لِّلْمُؤْمِنِينَ﴾ [الإسراء: 82].\n\nأسباب الشفاء في السنة المطهرة:\n1. الرقية الشرعية بقراءة الفاتحة وآية الكرسي والمعوذتين.\n2. دعاء النبي ﷺ: «اللَّهُمَّ رَبَّ النَّاسِ أَذْهِبِ الْبَأْسَ، اشْفِ أَنْتَ الشَّافِي، لاَ شِفَاءَ إِلاَّ شِفَاؤُكَ».\n3. الجمع بين التداوي الحسي بالأدوية الطبية والرقى والدعاء.',
    },
    reference: 'Surah Al-Isra (17:82)',
    source: 'The Holy Quran & Sahih al-Bukhari 5742',
    relatedTopics: {
      en: ['Ayat al-Kursi benefits', 'Prophetic medicine', 'Duas for illness'],
      ur: ['آیت الکرسی کی فضیلت', 'طب نبوی', 'بیماری کی دعائیں'],
      ar: ['أدعية المرض', 'فضل آية الكرسي', 'الطب النبوي'],
    },
  },
  {
    keywords: ['namaz', 'salah', 'wudu', 'fajr', 'نماز', 'الصلاة', 'صلوة', 'طہارت', 'وضو'],
    title: {
      en: 'Importance and Safeguarding of Daily Salah',
      ur: 'نماز کی اہمیت، فضیلت اور پابندی',
      ar: 'مكانة الصلاة في الإسلام والمحافظة عليها',
    },
    answer: {
      en: 'Salah is the second pillar of Islam and the primary connection between a servant and Allah. Allah says: "Indeed, prayer has been decreed upon the believers a decree of specified times" (Surah An-Nisa 4:103). The Prophet ﷺ said: "The first thing for which a servant will be held accountable on the Day of Resurrection is his prayer" (Sunan al-Tirmidhi 413).\n\nKey principles:\n1. Perform the five daily prayers promptly in their prescribed times.\n2. Perfect your Wudu (ablution) and maintain Khushu (mindfulness and reverence) in prayer.\n3. The prayer purifies sins just as bathing in a clean river five times a day cleanses the body.',
      ur: 'نماز دین کا ستون اور مومن کی معراج ہے۔ اللہ تعالیٰ کا ارشاد ہے: ”بیشک نماز مومنوں پر مقررہ اوقات میں فرض کی گئی ہے“ (سورۃ النساء: 103)۔ نبی اکرم ﷺ نے فرمایا: ”قیامت کے دن بندے کے اعمال میں سے سب سے پہلے نماز کا حساب لیا جائے گا“ (جامع ترمذی: 413)۔\n\nاہم نکات:\n1. پانچوں نمازوں کو ان کے مقررہ وقت پر ادا کرنے کی پابندی کریں۔\n2. مکمل خشوع و خضوع اور صحیح طریقے سے وضو کر کے نماز ادا کریں۔\n3. نماز گناہوں کو ایسے دھوتی ہے جیسے دن میں پانچ بار نہانے سے میل کچیل دور ہو جاتا ہے۔',
      ar: 'الصلاة عماد الدين وركن الإسلام الركين. قال تعالى: ﴿إِنَّ الصَّلَاةَ كَانَتْ عَلَى الْمُؤْمِنِينَ كِتَابًا مَّوْقُوتًا﴾ [النساء: 103]. وقال النبي ﷺ: «إِنَّ أَوَّلَ مَا يُحَاسَبُ بِهِ العَبْدُ يَوْمَ القِيَامَةِ مِنْ عَمَلِهِ صَلاَتُهُ» (رواه الترمذي 413).\n\nإرشادات:\n1. المحافظة على الصلوات الخمس في أوقاتها المحددة.\n2. إسباغ الوضوء والحرص على الخشوع والسكينة في الركوع والسجود.',
    },
    reference: 'Surah An-Nisa (4:103)',
    source: 'The Holy Quran & Tirmidhi 413',
    relatedTopics: {
      en: ['How to achieve Khushu', 'Tahajjud & Sunnah prayers', 'Wudu guide'],
      ur: ['نماز میں خشوع کا طریقہ', 'تہجد اور نوافل', 'وضو کا مسنون طریقہ'],
      ar: ['الخشوع في الصلاة', 'الصلوات المسنونة والرواتب', 'صفة الوضوء'],
    },
  },
  {
    keywords: ['quran', 'koran', 'surah', 'ayah', 'revelation', 'قرآن', 'سورۃ', 'آیت', 'تلاوت'],
    title: {
      en: 'The Holy Quran: The Eternal Word of Allah',
      ur: 'قرآنِ مجید: اللہ کا ابدی اور برحق کلام',
      ar: 'القرآن الكريم: كلام الله المعجز',
    },
    answer: {
      en: 'The Holy Quran is the literal, uncreated speech of Allah revealed through Angel Jibreel upon Prophet Muhammad ﷺ over 23 years. Allah guarantees its eternal preservation: "Indeed, it is We who sent down the Quran and indeed, We will be its guardian" (Surah Al-Hijr 15:9).\n\nVirtues of Quranic recitation:\n1. Each recited letter earns 10 good deeds (hasanat).\n2. The Quran will intercede on the Day of Judgment for its companions.\n3. Reflecting upon its verses (Tadabbur) brings spiritual tranquility and guidance for every aspect of life.',
      ur: 'قرآنِ مجید اللہ تعالیٰ کا آخری اور ابدی کلام ہے جو حضرت محمد ﷺ پر 23 سال کے عرصے میں بذریعہ جبرائیل امین نازل ہوا۔ اللہ تعالیٰ نے اس کی حفاظت کا خود ذمہ لیا ہے: ”بیشک یہ ذکر ہم نے ہی نازل کیا ہے اور ہم ہی اس کی حفاظت کرنے والے ہیں“ (سورۃ الحجر: 9)۔\n\nتلاوتِ قرآن کے فضائل:\n1. قرآن کا ایک حرف پڑھنے پر دس نیکیاں ملتی ہیں۔\n2. قرآنِ پاک قیامت کے دن اپنے پڑھنے والوں کی شفاعت فرمائے گا۔\n3. اس کی تلاوت اور معانی پر غور و فکر قلبی سکون اور دنیا و آخرت کی رہنمائی کا ذریعہ ہے۔',
      ar: 'القرآن الكريم هو كلام الله تعالى المنزل على نبيه محمد ﷺ، المتعبد بتلاوته، المحفوظ بحفظ الله: ﴿إِنَّا نَحْنُ نَزَّلْنَا الذِّكْرَ وَإِنَّا لَهُ لَحَافِظُونَ﴾ [الحجر: 9].\n\nمن فضائل تلاوة القرآن:\n1. الحرف بحسنة، والحسنة بعشر أمثالها.\n2. يأتي القرآن يوم القيامة شفيعاً لأصحابه.\n3. تدبر آياته يجلب الطمأنينة والنور إلى القلب.',
    },
    reference: 'Surah Al-Hijr (15:9)',
    source: 'The Holy Quran & Sahih Muslim 804',
    relatedTopics: {
      en: ['Ayat al-Kursi reflection', 'Surah Al-Kahf on Fridays', 'Tajweed & Recitation'],
      ur: ['آیت الکرسی کے فضائل', 'جمعہ کے دن سورۃ الکہف', 'تجوید اور درست تلاوت'],
      ar: ['فضل سورة الكهف', 'تدبر القرآن', 'أحكام التجويد'],
    },
  },
  {
    keywords: ['kursi', 'ayat al-kursi', 'آیت الکرسی'],
    title: {
      en: 'Ayat al-Kursi (The Verse of the Throne)',
      ur: 'آیت الکرسی: قرآن کی عظیم ترین آیت',
      ar: 'آية الكرسي: أعظم آية في كتاب الله',
    },
    answer: {
      en: 'Ayat al-Kursi (Surah Al-Baqarah 2:255) is the greatest verse in the Holy Quran, celebrating Allah’s supreme majesty, absolute sovereignty, eternal life, and comprehensive knowledge.\n\nVirtues & Blessings:\n1. The Prophet ﷺ said: "Whoever recites Ayat al-Kursi after every obligatory prayer, nothing prevents him from entering Paradise except death" (Sunan an-Nasa\'i 9848).\n2. Reciting it before sleep protects against evil and harm until morning.\n3. It brings protection and barakah to homes and hearts.',
      ur: 'آیت الکرسی (سورۃ البقرہ: 255) قرآنِ مجید کی سب سے عظیم ترین آیت ہے۔ اس میں اللہ تعالیٰ کی وحدانیت، عظمت، لامحدود علم اور بادشاہی کا بے مثال بیان ہے۔\n\nفضائل و برکات:\n1. رسول اللہ ﷺ نے فرمایا: ”جس شخص نے ہر فرض نماز کے بعد آیت الکرسی پڑھی، اسے جنت میں داخل ہونے سے سوائے موت کے کوئی چیز نہیں روک سکتی“ (سنن نسائی: 9848)۔\n2. رات کو سوتے وقت پڑھنے سے صبح تک شیطان اور ہر آفت سے حفاظت رہتی ہے۔\n3. گھر اور اہل و عیال کے لیے عظیم حصار اور برکت کا ذریعہ ہے۔',
      ar: 'آية الكرسي (سورة البقرة: 255) هي أعظم آية في القرآن الكريم، جمعت توحيد الأسماء والصفات وكمال قدرة الله وسلطانه.\n\nفضائلها:\n1. قال النبي ﷺ: «مَنْ قَرَأَ آيَةَ الْكُرْسِيِّ فِي دُبُرِ كُلِّ صَلَاةٍ مَكْتُوبَةٍ لَمْ يَمْنَعْهُ مِنْ دُخُولِ الْجَنَّةِ إِلَّا أَنْ يَمُوتَ» (رواه النسائي 9848).\n2. قراءتها عند النوم حرز وأمان من كل سوء وشيطان.\n3. سبب لحفظ البيوت وجلب البركة والسكينة.',
    },
    reference: 'Surah Al-Baqarah (2:255)',
    source: 'The Holy Quran & Sunan an-Nasa\'i 9848',
    relatedTopics: {
      en: ['Protection from evil eye', 'Morning & evening adhkar', 'Surah Al-Baqarah virtues'],
      ur: ['نظر بد سے حفاظت', 'صبح و شام کے اذکار', 'سورۃ البقرہ کی فضیلت'],
      ar: ['الرقية الشرعية', 'أذكار الصباح والمساء', 'فضل سورة البقرة'],
    },
  },
  {
    keywords: ['tahajjud', 'qiyam', 'night prayer', 'تہجد', 'قیام اللیل'],
    title: {
      en: 'Tahajjud: The Blessed Night Prayer',
      ur: 'نمازِ تہجد: قربِ الٰہی کا خاص ذریعہ',
      ar: 'صلاة التهجد وقيام الليل',
    },
    answer: {
      en: 'Tahajjud is the voluntary prayer performed in the late night after waking from sleep. Allah praises those who pray Tahajjud: "Their sides forsake their beds, calling upon their Lord in fear and hope" (Surah As-Sajdah 32:16).\n\nMethod and Timing:\n1. Best time: The final third of the night, when Allah descends in a manner befitting His majesty, asking: "Who calls upon Me so I may answer them?" (Sahih al-Bukhari 1145).\n2. Minimum 2 Rak\'ahs up to 8 or 12 Rak\'ahs followed by Witr.\n3. It brings illuminated hearts, answered supplications, and elevated ranks in Jannah.',
      ur: 'نمازِ تہجد رات کے آخری پہر سو کر اٹھنے کے بعد ادا کی جانے والی سب سے افضل نفل نماز ہے۔ اللہ تعالیٰ کا فرمان ہے: ”ان کے پہلو بستروں سے الگ رہتے ہیں اور وہ اپنے رب کو خوف اور امید کے ساتھ پکارتے ہیں“ (سورۃ السجدہ: 16)۔\n\nطریقہ اور فضیلت:\n1. افضل وقت: رات کا آخری تہائی حصہ، جب اللہ تعالیٰ آسمانِ دنیا پر نزولِ رحمت فرما کر فرماتا ہے: ”کون ہے جو مجھ سے مانگے اور میں اسے عطا کروں؟“ (صحیح بخاری: 1145)۔\n2. کم از کم دو رکعتیں اور معمول کے مطابق 8 رکعتیں پڑھ کر وتر ادا کریں۔\n3. تہجد دعاؤں کی فوری قبولیت اور گناہوں کے مٹنے کا سبب ہے۔',
      ar: 'صلاة الليل دأب الصالحين، قال تعالى: ﴿تَتَجَافَىٰ جُنُوبُهُمْ عَنِ الْمَضَاجِعِ يَدْعُونَ رَبَّهُمْ خَوْفًا وَطَمَعًا﴾ [السجدة: 16].\n\nوقتها وفضلها:\n1. أفضل الأوقات الثلث الأخير من الليل حيث ينزل ربنا تبارك وتعالى نزولاً يليق بجلاله ويقول: «مَنْ يَدْعُونِي فَأَسْتَجِيبَ لَهُ» (رواه البخاري 1145).\n2. أقلها ركعتان، وتصلى مثنى مثنى ثم يُختم بالوتر.\n3. من أعظم أسباب إجابة الدعاء وتثبيت القلب على الإيمان.',
    },
    reference: 'Surah As-Sajdah (32:16)',
    source: 'The Holy Quran & Sahih al-Bukhari 1145',
    relatedTopics: {
      en: ['Duas for Tahajjud', 'Witr prayer rules', 'Developing Khushu'],
      ur: ['تہجد کی خاص دعائیں', 'وتر کے مسائل', 'نماز میں یکسوئی'],
      ar: ['أدعية السحر', 'أحكام صلاة الوتر', 'صفة قيام النبي ﷺ'],
    },
  },
  {
    keywords: ['roza', 'fasting', 'ramadan', 'ramzan', 'sehri', 'iftar', 'sawm', 'روزہ', 'رمضان', 'سحری', 'افطار', 'صوم'],
    title: {
      en: 'Fasting (Sawm) & The Blessings of Ramadan',
      ur: 'روزے کی فضیلت اور ماہِ رمضان کی برکات',
      ar: 'فضل الصيام وبركات شهر رمضان',
    },
    answer: {
      en: 'Fasting during the holy month of Ramadan is the fourth pillar of Islam, prescribed to attain piety (Taqwa). Allah says: "O you who have believed, decreed upon you is fasting as it was decreed upon those before you that you may become righteous" (Surah Al-Baqarah 2:183).\n\nKey spiritual benefits:\n1. In a Hadith Qudsi, Allah says: "Fasting is for Me, and I shall reward it Myself" (Sahih al-Bukhari 1894).\n2. The gates of Heaven are opened, gates of Hell are closed, and devils are chained.\n3. The Dua of a fasting person at the time of Iftar is never rejected.',
      ur: 'رمضان المبارک کے روزے اسلام کا بنیادی ستون ہیں جن کا مقصد تقویٰ حاصل کرنا ہے۔ اللہ تعالیٰ کا ارشاد ہے: ”اے ایمان والو! تم پر روزے فرض کیے گئے جیسے تم سے اگلوں پر فرض کیے گئے تھے تاکہ تم پرہیزگار بن جاؤ“ (سورۃ البقرہ: 183)۔\n\nروحانی برکات:\n1. حدیث قدسی میں اللہ تعالیٰ نے فرمایا: ”روزہ میرے لیے ہے اور میں ہی اس کی جزا دوں گا“ (صحیح بخاری: 1894)۔\n2. رمضان میں جنت کے دروازے کھول دیے جاتے ہیں اور جہنم کے دروازے بند کر دیے جاتے ہیں۔\n3. افطار کے وقت روزہ دار کی دعا رد نہیں کی جاتی۔',
      ar: 'الصيام ركن ركين من أركان الإسلام، شُرع لتزكية النفوس وتحقيق التقوى: ﴿يَا أَيُّهَا الَّذِينَ آمَنُوا كُتِبَ عَلَيْكُمُ الصِّيَامُ كَمَا كُتِبَ عَلَى الَّذِينَ مِن قَبْلِكُمْ لَعَلَّكُمْ تَتَّقُونَ﴾ [البقرة: 183].\n\nفضائل الصيام:\n1. في الحديث القدسي: «كُلُّ عَمَلِ ابْنِ آدَمَ لَهُ إِلَّا الصَّوْمَ فَإِنَّهُ لِي وَأَنَا أَجْزِي بِهِ» (رواه البخاري 1894).\n2. تُفتح فيه أبواب الجنان وتُغلق أبواب النيران.\n3. للصائم عند فطره دعوة لا تُرد.',
    },
    reference: 'Surah Al-Baqarah (2:183)',
    source: 'The Holy Quran & Sahih al-Bukhari 1894',
    relatedTopics: {
      en: ['Laylatul Qadr (Night of Power)', 'I\'tikaf guide', 'Zakat al-Fitr'],
      ur: ['شبِ قدر کی فضیلت', 'اعتکاف کے مسائل', 'صدقہ فطر'],
      ar: ['فضل ليلة القدر', 'أحكام الاعتكاف', 'زكاة الفطر'],
    },
  },
  {
    keywords: ['zakat', 'zakah', 'charity', 'sadaqah', 'زکوٰۃ', 'صدقہ', 'خیرات'],
    title: {
      en: 'Zakat & Sadaqah: Purifying Wealth in Islam',
      ur: 'زکوٰۃ اور صدقہ: مال کی طہارت اور برکت',
      ar: 'الزكاة والصدقة ونماء المال',
    },
    answer: {
      en: 'Zakat is the third pillar of Islam, an obligatory 2.5% contribution upon wealth meeting the Nisab threshold held for one lunar year. Allah commands: "Establish prayer and give Zakat" (Surah Al-Baqarah 2:43).\n\nCore wisdom of Zakat:\n1. Purifies personal wealth and protects the soul from greed.\n2. Alleviates poverty, uplifts widows, orphans, and students of knowledge.\n3. Sadaqah (voluntary charity) extinguishes sins like water extinguishes fire.',
      ur: 'زکوٰۃ اسلام کا تیسرا اہم ستون ہے، جو سال بھر نصاب پر رہنے والے مال پر 2.5 فیصد کی شرح سے فرض ہے۔ قرآنِ مجید میں بار بار حکم ہے: ”نماز قائم کرو اور زکوٰۃ ادا کرو“ (سورۃ البقرہ: 43)۔\n\nزکوٰۃ کی حکمتیں:\n1. زکوٰۃ دینے سے مال پاک ہوتا ہے اور اس میں برکت کا نزول ہوتا ہے۔\n2. غریبوں، یتیموں اور ناداروں کی کفالت ہوتی ہے اور معاشرے میں توازن پیدا ہوتا ہے۔\n3. رسول اللہ ﷺ نے فرمایا: ”صدقہ گناہوں کو ایسے بجھا دیتا ہے جیسے پانی آگ کو بجھاتا ہے“۔',
      ar: 'الزكاة الركن الثالث من أركان الإسلام، وهي حق معلوم في أموال الأغنياء للفقراء والمحتاجين: ﴿وَأَقِيمُوا الصَّلَاةَ وَآتُوا الزَّكَاةَ﴾ [البقرة: 43].\n\nحكمتها وثمارها:\n1. تطهير النفس من الشح وتنمية المال وحفظه.\n2. إشاعة التكافل والمحبة بين طبقات المجتمع.\n3. الصدقة تطفئ الخطيئة كما يطفئ الماء النار.',
    },
    reference: 'Surah Al-Baqarah (2:43)',
    source: 'The Holy Quran & Sahih Muslim 984',
    relatedTopics: {
      en: ['Zakat calculation rules', 'Sadaqah Jariyah', 'Recipients of Zakat'],
      ur: ['زکوٰۃ کا حساب کیسے لگائیں', 'صدقہ جاریہ کے کام', 'زکوٰۃ کے مستحقین'],
      ar: ['مصارف الزكاة الثمانية', 'فضل الصدقة الجارية', 'شروط وجوب الزكاة'],
    },
  },
  {
    keywords: ['tawbah', 'repentance', 'forgiveness', 'istighfar', 'sin', 'توبہ', 'استغفار', 'مغفرت', 'گناہ'],
    title: {
      en: 'Tawbah (Repentance) & Seeking Istighfar',
      ur: 'توبہ اور استغفار: مغفرت اور رحمت کی ضمانت',
      ar: 'التوبة الصادقة وفضل الاستغفار',
    },
    answer: {
      en: 'Allah is Al-Ghafur (The Most Forgiving) and At-Tawwab (The Accepter of Repentance). Allah announces: "Say, O My servants who have transgressed against themselves, do not despair of the mercy of Allah. Indeed, Allah forgives all sins" (Surah Az-Zumar 39:53).\n\nConditions of sincere Tawbah (Tawbah Nasuh):\n1. Immediate cessation of the sin.\n2. Genuine remorse in the heart.\n3. Sincere resolution never to repeat it.\n4. Restoring rights of others if a person was wronged.',
      ur: 'اللہ تعالیٰ غفور و رحیم ہے اور سچے دل سے توبہ کرنے والوں کو محبوب رکھتا ہے۔ ارشادِ ربانی ہے: ”کہہ دیجیے اے میرے وہ بندو جنہوں نے اپنی جانوں پر زیادتی کی، اللہ کی رحمت سے ناامید مت ہو، بیشک اللہ تمام گناہوں کو معاف فرما دیتا ہے“ (سورۃ الزمر: 53)۔\n\nتوبہ نصوح کی شرائط:\n1. گناہ سے فوراً رک جانا۔\n2. ماضی کے عمل پر دل سے شرمندگی اور ندامت۔\n3. آئندہ کبھی نہ کرنے کا پکا عزم۔\n4. اگر کسی انسان کی حق تلفی ہوئی ہو تو اس کی تلافی کرنا۔',
      ar: 'باب التوبة مفتوح لكل تائب ومستغفر، قال الله تعالى: ﴿قُلْ يَا عِبَادِيَ الَّذِينَ أَسْرَفُوا عَلَىٰ أَنفُسِهِمْ لَا تَقْنَطُوا مِن رَّحْمَةِ اللَّهِ ۚ إِنَّ اللَّهَ يَغْفِرُ الذُّنُوبَ جَمِيعًا﴾ [الزمر: 53].\n\nشروط التوبة النصوح:\n1. الإقلاع الفوري عن المعصية.\n2. الندم على ما فات.\n3. العزم الصادق على عدم العودة إليها.\n4. رد المظالم إلى أهلها إن تعلقت بحقوق العباد.',
    },
    reference: 'Surah Az-Zumar (39:53)',
    source: 'The Holy Quran & Sahih al-Bukhari 6306',
    relatedTopics: {
      en: ['Sayyidul Istighfar prayer', 'Overcoming bad habits', 'Hope in Allah\'s mercy'],
      ur: ['سید الاستغفار کے الفاظ', 'گناہوں سے بچنے کی تدابیر', 'اللہ کی رحمت پر یقین'],
      ar: ['سيد الاستغفار', 'آداب التوبة', 'فضل الرجوع إلى الله'],
    },
  },
];

@Injectable({ providedIn: 'root' })
export class FirebaseIslamicAiService {
  private readonly firebase = inject(FirebaseService);
  private generativeModel: GenerativeModel | null = null;
  private isModelInitialized = false;
  private isVertexApiAvailable = true;

  constructor() {
    this.initModel();
  }

  private initModel(): void {
    if (!this.firebase.configured) return;
    try {
      const app = this.firebase.requireApp();
      const ai = getAI(app);
      this.generativeModel = getGenerativeModel(ai, {
        model: 'gemini-1.5-flash',
        systemInstruction: ISLAMIC_SYSTEM_INSTRUCTION,
      });
      this.isModelInitialized = true;
    } catch {
      this.generativeModel = null;
      this.isModelInitialized = false;
    }
  }

  /**
   * Evaluates if a query is related to Islamic subjects.
   */
  isIslamicQuery(rawQuery: string): boolean {
    const q = rawQuery.toLowerCase().trim();
    if (!q) return false;

    // Disallowed explicitly non-Islamic worldly / inappropriate domains
    const nonIslamicKeywords = [
      'movie', 'actor', 'hollywood', 'bollywood', 'celebrity', 'bitcoin', 'crypto',
      'dating', 'casino', 'gambling', 'alcohol', 'poker', 'hack', 'crack',
      'video game', 'cheat code', 'cricket score', 'football score'
    ];
    if (nonIslamicKeywords.some((word) => q.includes(word))) {
      return false;
    }

    return true;
  }

  /**
   * Main Search method: Executes query via Firebase AI (Gemini 1.5 Flash),
   * strictly tailored for Islamic knowledge and falling back to authentic curated index.
   */
  async askIslamicAi(
    query: string,
    lang: SupportedLanguage = 'en',
  ): Promise<IslamicAiResponse> {
    const trimmed = query.trim();

    if (!this.isIslamicQuery(trimmed)) {
      return this.buildNonIslamicNotice(trimmed, lang);
    }

    // 1. Try Firebase AI (Vertex AI in Firebase via gemini-1.5-flash) if available
    if (this.firebase.configured && this.isVertexApiAvailable) {
      if (!this.generativeModel) {
        this.initModel();
      }

      if (this.generativeModel) {
        try {
          const prompt = `[Language: ${lang}] Answer this Islamic question accurately, citing authentic Quran verses (Surah name & Ayah number) and Sahih Hadith sources where relevant. Keep the response respectful, structured, and easy to read:\nQuestion: "${trimmed}"`;

          // Race with 3.5s timeout so user never waits if API is pending enablement
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('AI_TIMEOUT')), 3500),
          );

          const result = await Promise.race([
            this.generativeModel.generateContent(prompt),
            timeoutPromise,
          ]);

          const responseText = result.response.text();

          if (responseText && responseText.trim()) {
            return {
              query: trimmed,
              answer: responseText.trim(),
              source: 'Firebase AI (Gemini) • Quran & Sunnah',
              relatedTopics: this.extractRelatedTopics(trimmed, lang),
              isIslamic: true,
              isIslamicOnlyNotice: false,
              generatedByFirebaseAi: true,
            };
          }
        } catch {
          // Firebase AI API might not yet be enabled in the Firebase console; switch flag and gracefully fall back
          this.isVertexApiAvailable = false;
        }
      }
    }

    // 2. Intelligent Fallback: Authentic Islamic curated knowledge base
    return this.generateAuthenticFallback(trimmed, lang);
  }

  private generateAuthenticFallback(
    query: string,
    lang: SupportedLanguage,
  ): IslamicAiResponse {
    const qLower = query.toLowerCase();

    // Match best topic in library
    const matched = FALLBACK_ISLAMIC_LIBRARY.find((topic) =>
      topic.keywords.some((kw) => qLower.includes(kw.toLowerCase())),
    );

    if (matched) {
      return {
        query,
        answer: matched.answer[lang] || matched.answer.en,
        source: `${matched.source} • ${matched.reference}`,
        reference: matched.reference,
        relatedTopics: matched.relatedTopics[lang] || matched.relatedTopics.en,
        isIslamic: true,
        isIslamicOnlyNotice: false,
        generatedByFirebaseAi: false,
      };
    }

    // Dynamic tailored Islamic answer
    const defaultAnswers: Record<SupportedLanguage, string> = {
      en: `In Islam, guidance regarding "${query}" is grounded in the teachings of the Holy Quran and the Sunnah of Prophet Muhammad ﷺ.\n\nAllah says in the Holy Quran: "So ask the people of the message if you do not know." (Surah An-Nahl 16:43)\n\nKey Islamic guidance:\n1. Seek beneficial knowledge with sincerity (Ikhlas) for the sake of Allah.\n2. Consult authentic Quranic verses and Sahih Hadiths for clarity on faith and conduct.\n3. Make persistent Dua and perform your daily prayers, as sincere remembrance of Allah (Dhikr) brings clarity and peace to every heart.`,
      ur: `دینِ اسلام میں ”${query}“ کے بارے میں رہنمائی قرآنِ مجید اور سنتِ رسول ﷺ کی بنیادی تعلیمات پر مبنی ہے۔\n\nاللہ تعالیٰ کا ارشاد ہے: ”پس تم اہل علم سے پوچھ لو اگر تم نہیں جانتے“ (سورۃ النحل: 43)۔\n\nاہم اسلامی ہدایات:\n1. خالص نیت کے ساتھ نافع علم حاصل کریں اور اس پر عمل کریں۔\n2. قرآن و حدیث اور مستند علماء کی رہنمائی میں اپنے معاملات حل کریں۔\n3. نماز اور اذکار کی پابندی رکھیں، کیونکہ اللہ کے ذکر ہی سے دلوں کو سچا سکون حاصل ہوتا ہے۔`,
      ar: `في الشريعة الإسلامية، يُلتمس الهدى حول «${query}» من كتاب الله وسنة رسوله ﷺ.\n\nقال الله تعالى: ﴿فَاسْأَلُوا أَهْلَ الذِّكْرِ إِن كُنتُمْ لَا تَعْلَمُونَ﴾ [النحل: 43].\n\nإرشادات شرعية:\n1. الإخلاص في طلب العلم والعمل به.\n2. الرجوع إلى النصوص الصحيحة من القرآن والسنة النبوية.\n3. المحافظة على الصلوات والدعاء، فبذكر الله تطمئن القلوب.`,
    };

    return {
      query,
      answer: defaultAnswers[lang] || defaultAnswers.en,
      source: 'The Holy Quran (16:43) • Rohani Shifa Islamic Knowledge',
      reference: 'Surah An-Nahl (16:43)',
      relatedTopics: [
        lang === 'ur' ? 'قرآن کی تلاوت اور ترجمہ' : lang === 'ar' ? 'أحكام القرآن وتفسيره' : 'Quran recitation & meanings',
        lang === 'ur' ? 'مسنون دعائیں اور اذکار' : lang === 'ar' ? 'الأدعية المأثورة' : 'Daily Sunnah Duas',
        lang === 'ur' ? 'اخلاق اور حقوق العباد' : lang === 'ar' ? 'مكارم الأخلاق' : 'Islamic character and virtues',
      ],
      isIslamic: true,
      isIslamicOnlyNotice: false,
      generatedByFirebaseAi: false,
    };
  }

  private buildNonIslamicNotice(
    query: string,
    lang: SupportedLanguage,
  ): IslamicAiResponse {
    const notices: Record<SupportedLanguage, string> = {
      en: `Assalamu Alaikum. Rohani Shifa AI is dedicated exclusively to Islamic search, Quranic verses, Sahih Hadiths, and spiritual guidance.\n\nWe politely decline queries regarding secular, entertainment, worldly politics, or non-Islamic topics. Please ask any question regarding Islamic teachings, prayers, Duas, or spiritual well-being!`,
      ur: `السلام علیکم۔ روحانی شفا AI خصوصی طور پر صرف اسلامی تلاش، قرآنی آیات، صحیح احادیث اور روحانی رہنمائی کے لیے وقف ہے۔\n\nبراہِ کرم دینِ اسلام، نماز، دعا، اخلاق، سنتِ نبوی یا اسلامی احکام سے متعلق سوالات پوچھیں۔`,
      ar: `السلام عليكم ورحمة الله وبركاته. هذا المساعد الذكي مخصص حصرياً للبحث الإسلامي، والآيات القرآنية، والأحاديث النبوية، والتوجيه الروحي.\n\nنرجو التفضل بطرح الأسئلة المتعلقة بالعلوم الشرعية، أو الأدعية، أو أحكام العبادات، والأخلاق الإسلامية.`,
    };

    return {
      query,
      answer: notices[lang] || notices.en,
      isIslamic: false,
      isIslamicOnlyNotice: true,
      generatedByFirebaseAi: false,
      relatedTopics: [
        lang === 'ur' ? 'دعا مانگنے کے آداب' : lang === 'ar' ? 'آداب الدعاء' : 'Etiquettes of Dua',
        lang === 'ur' ? 'صبر اور استقامت' : lang === 'ar' ? 'الصبر في القرآن' : 'Patience in Islam',
        lang === 'ur' ? 'نماز کی اہمیت' : lang === 'ar' ? 'فضل الصلاة' : 'Importance of Salah',
      ],
    };
  }

  private extractRelatedTopics(query: string, lang: SupportedLanguage): string[] {
    const base = [
      lang === 'ur' ? 'قرآنی حوالہ جات' : lang === 'ar' ? 'الآيات القرآنية' : 'Quranic References',
      lang === 'ur' ? 'احادیثِ نبوی ﷺ' : lang === 'ar' ? 'الأحاديث النبوية' : 'Prophetic Hadith',
      lang === 'ur' ? 'مسنون دعائیں' : lang === 'ar' ? 'الأدعية النبوية' : 'Sunnah Duas',
    ];
    return base;
  }
}
