import { Injectable, inject } from '@angular/core';
import { Timestamp } from 'firebase/firestore';
import { LocalizedText } from '../../i18n/language.types';
import { Post, PostDraft } from '../models';
import { PostService } from './post.service';

export interface AiReminderTemplate {
  title: LocalizedText;
  description: LocalizedText;
  content: LocalizedText;
  source: string;
  reference: string;
  tags: string[];
}

export const AI_ISLAMIC_REMINDERS_LIBRARY: readonly AiReminderTemplate[] = [
  {
    title: {
      en: 'Remembering Allah Brings Peace',
      ur: 'اللہ کے ذکر سے دلوں کو سکون ملتا ہے',
      ar: 'ألا بذكر الله تطمئن القلوب',
    },
    description: {
      en: 'Unquestionably, by the remembrance of Allah hearts are assured.',
      ur: 'سن لو! اللہ کے ذکر ہی سے دلوں کو اطمینان نصیب ہوتا ہے۔',
      ar: 'ألا بذكر الله تطمئن القلوب وتنشرح الصدور.',
    },
    content: {
      en: '“Those who have believed and whose hearts are assured by the remembrance of Allah. Unquestionably, by the remembrance of Allah hearts are assured.” (Surah Ar-Ra’d 13:28)\n\nReflection: When worldly anxieties and distress surround you, turn your heart to the constant remembrance of Allah (Dhikr). Even a whisper of SubhanAllah, Alhamdulillah, or Astaghfirullah brings tranquility to the restless soul.',
      ur: '”جو لوگ ایمان لائے اور ان کے دل اللہ کے ذکر سے مطمئن ہوتے ہیں۔ سن لو کہ اللہ کے ذکر ہی سے دلوں کو چین نصیب ہوتا ہے۔“ (سورۃ الرعد: 28)\n\nنصیحت: جب دنیاوی پریشانیاں اور الجھنیں آپ کو گھیر لیں تو اپنے دل کو اللہ کی یاد سے آباد کریں۔ صبح و شام کی دعاؤں اور استغفار سے دل کو حقیقی راحت اور سکون نصیب ہوتا ہے۔',
      ar: '﴿الَّذِينَ آمَنُوا وَتَطْمَئِنُّ قُلُوبُهُم بِذِكْرِ اللَّهِ ۗ أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ﴾ [الرعد: 28]\n\nفائدة وتأمل: إذا تكاثرت عليك الهموم وأثقلتك مشاغل الدنيا، ففزع إلى ذكر الله تعالى، فإن في دوام ذكره سكينةً للنفس وشفاءً للقلوب.',
    },
    source: 'The Holy Quran',
    reference: 'Surah Ar-Ra’d (13:28)',
    tags: ['quran', 'dhikr', 'peace', 'spirituality'],
  },
  {
    title: {
      en: 'With Hardship Comes Ease',
      ur: 'تنگی کے ساتھ آسانی ہے',
      ar: 'إن مع العسر يسراً',
    },
    description: {
      en: 'For indeed, with hardship [will be] ease. Indeed, with hardship [will be] ease.',
      ur: 'پس بیشک مشکل کے ساتھ آسانی ہے۔ بیشک مشکل کے ساتھ آسانی ہے۔',
      ar: 'فإن مع العسر يسراً، إن مع العسر يسراً.',
    },
    content: {
      en: '“For indeed, with hardship [will be] ease. Indeed, with hardship [will be] ease.” (Surah Ash-Sharh 94:5-6)\n\nReflection: Allah promises twice that ease accompanies every struggle. No hardship lasts forever; remain steadfast, pray with conviction, and trust that relief is already being prepared for you.',
      ur: '”پس حقیقت یہ ہے کہ تنگی کے ساتھ آسانی بھی ہے۔ بیشک تنگی کے ساتھ آسانی ہے۔“ (سورۃ الانشراح: 5-6)\n\nنصیحت: اللہ تعالیٰ نے دو بار یقین دلایا ہے کہ ہر مشکل کے ساتھ آسانی کا دروازہ کھلتا ہے۔ صبر کا دامن نہ چھوڑیں اور اللہ پر کامل بھروسہ رکھیں، راحت عنقریب آنے والی ہے۔',
      ar: '﴿فَإِنَّ مَعَ الْعُسْرِ يُسْرًا ۝ إِنَّ مَعَ الْعُسْرِ يُسْرًا﴾ [الشرح: 5-6]\n\nفائدة وتأمل: وعد الله تعالى مؤكد بأن كل ضيق يتبعه فرج، فلا يغلب عسرٌ يسرين. ثق بلطف الله وتدبيره واصبر فإن نصر الله قريب.',
    },
    source: 'The Holy Quran',
    reference: 'Surah Ash-Sharh (94:5-6)',
    tags: ['quran', 'patience', 'hope', 'relief'],
  },
  {
    title: {
      en: 'The Best Among You in Character',
      ur: 'تم میں سب سے بہتر وہ ہے جس کے اخلاق اچھے ہوں',
      ar: 'خياركم أحسنكم أخلاقاً',
    },
    description: {
      en: 'The Messenger of Allah ﷺ said: The best among you are those who have the best character.',
      ur: 'رسول اللہ ﷺ نے فرمایا: تم میں سے سب سے بہتر وہ لوگ ہیں جو اخلاق میں سب سے اچھے ہیں۔',
      ar: 'قال رسول الله ﷺ: إن من خياركم أحسنكم أخلاقاً.',
    },
    content: {
      en: 'Abdullah ibn Amr reported: The Messenger of Allah, peace and blessings be upon him, said: “Verily, the best among you are those with the best character and conduct.” (Sahih al-Bukhari 6035, Sahih Muslim 2321)\n\nReflection: True righteousness is reflected in how we treat family, neighbors, colleagues, and the vulnerable. Greet others with a warm smile, overlook faults, and speak with gentleness.',
      ur: 'حضرت عبداللہ بن عمرو رضی اللہ عنہما سے روایت ہے کہ رسول اللہ ﷺ نے فرمایا: ”تم میں سے سب سے بہترین انسان وہ ہے جس کے اخلاق سب سے اچھے ہوں۔“ (صحیح بخاری: 6035، صحیح مسلم: 2321)\n\nنصیحت: حسنِ اخلاق ہی دین کی خوبصورتی ہے۔ دوسروں سے نرمی سے پیش آنا، مسکرا کر ملنا اور خطاؤں کو معاف کرنا مومن کی پہچان ہے۔',
      ar: 'عن عبد الله بن عمرو رضي الله عنهما قال: قال رسول الله ﷺ: «إن من خياركم أحسنكم أخلاقاً». (رواه البخاري 6035 ومسلم 2321)\n\nفائدة وتأمل: كمال الإيمان يتجلى في طيب المعاملة ولين الجانب والبشاشة في وجوه الناس، فكونوا دعاةً للإسلام بأخلاقكم الرفيعة.',
    },
    source: 'Sahih al-Bukhari',
    reference: 'Bukhari 6035',
    tags: ['hadith', 'manners', 'sunnah', 'character'],
  },
  {
    title: {
      en: 'Purity of Intentions (Ikhlas)',
      ur: 'اعمال کا دارومدار نیتوں پر ہے',
      ar: 'إنما الأعمال بالنيات',
    },
    description: {
      en: 'Actions are judged by intentions, and every person will have what they intended.',
      ur: 'تمام اعمال کا دارومدار نیتوں پر ہے اور ہر انسان کو وہی ملے گا جس کی اس نے نیت کی۔',
      ar: 'إنما الأعمال بالنيات وإنما لكل امرئ ما نوى.',
    },
    content: {
      en: 'Umar ibn al-Khattab reported: The Messenger of Allah ﷺ said: “Actions are judged by motives and intentions, and every person will get the reward according to what he has intended.” (Sahih al-Bukhari 1, Sahih Muslim 1907)\n\nReflection: Before starting your work, study, cooking, or helping someone today, renew your intention solely for the pleasure of Allah. Sincere intention transforms routine daily tasks into acts of worship.',
      ur: 'حضرت عمر بن خطاب رضی اللہ عنہ سے روایت ہے کہ رسول اللہ ﷺ نے فرمایا: ”اعمال کا دارومدار صرف نیتوں پر ہے، اور ہر شخص کو وہی ملے گا جس کی اس نے نیت کی۔“ (صحیح بخاری: 1، صحیح مسلم: 1907)\n\nنصیحت: اپنے ہر نیک عمل، خدمت اور روزمرہ کے کام کو شروع کرنے سے پہلے نیت کو خالص اللہ کی رضا کے لیے کر لیں۔ اخلاصِ نیت ہی عمل کو بارگاہِ الٰہی میں قبولیت کا درجہ دیتا ہے۔',
      ar: 'عن أمير المؤمنين عمر بن الخطاب رضي الله عنه قال: سمعت رسول الله ﷺ يقول: «إنما الأعمال بالنيات، وإنما لكل امرئ ما نوى». (متفق عليه: البخاري 1، مسلم 1907)\n\nفائدة وتأمل: جدد نيتك في كل عمل تقوم به من دراسة أو عمل أو إحسان، فبالنية الصالحة تنقلب العادات إلى عبادات وأجور مضاعفة.',
    },
    source: 'Sahih al-Bukhari & Muslim',
    reference: 'Bukhari 1, Muslim 1907',
    tags: ['hadith', 'ikhlas', 'intentions', 'spirituality'],
  },
  {
    title: {
      en: 'Gratitude Multiplies Blessings',
      ur: 'شکر گزاری نعمتوں میں اضافہ کرتی ہے',
      ar: 'لئن شكرتم لأزيدنكم',
    },
    description: {
      en: 'If you are grateful, I will surely increase you in favor.',
      ur: 'اگر تم شکر ادا کرو گے تو میں تمہیں ضرور اور زیادہ دوں گا۔',
      ar: 'لئن شكرتم لأزيدنكم ولئن كفرتم إن عذابي لشديد.',
    },
    content: {
      en: '“And [remember] when your Lord proclaimed: If you are grateful, I will surely increase you [in favor]; but if you deny, indeed, My punishment is severe.” (Surah Ibrahim 14:7)\n\nReflection: Count your blessings: health, safety, food, faith, and loved ones. Express heartfelt gratitude to Allah by saying Alhamdulillah and by using your blessings to uplift those in need.',
      ur: '”اور یاد کرو جب تمہارے پروردگار نے خبردار کر دیا تھا کہ اگر تم شکر ادا کرو گے تو میں تمہیں اور زیادہ دوں گا۔“ (سورۃ ابراہیم: 7)\n\nنصیحت: اللہ تعالیٰ کی عطا کردہ ان گنت نعمتوں کا شکر ادا کریں۔ صحت، ایمان، رزق اور امن ایسی نعمتیں ہیں جن کا شکر ادا کرنے سے ان میں مزید برکت اور اضافہ ہوتا ہے۔',
      ar: '﴿وَإِذْ تَأَذَّنَ رَبُّكُمْ لَئِن شَكَرْتُمْ لَأَزِيدَنَّكُمْ ۖ وَلَئِن كَفَرْتُمْ إِنَّ عَذَابِي لَشَدِيدٌ﴾ [إبراهيم: 7]\n\nفائدة وتأمل: الشكر قيد النعم الموجودة وصيد النعم المفقودة. اجعل لسانك رطباً بحمد الله على العافية والستر والإيمان تنل المزيد من فضله.',
    },
    source: 'The Holy Quran',
    reference: 'Surah Ibrahim (14:7)',
    tags: ['quran', 'gratitude', 'shukr', 'blessings'],
  },
  {
    title: {
      en: 'Kindness is Never Wasted',
      ur: 'نرمی اور احسان کبھی ضائع نہیں ہوتا',
      ar: 'الراحمون يرحمهم الرحمن',
    },
    description: {
      en: 'The merciful will be shown mercy by the Most Merciful. Be merciful to those on earth.',
      ur: 'رحم کرنے والوں پر رحمن رحم فرماتا ہے۔ تم زمین والوں پر رحم کرو، آسمان والا تم پر رحم کرے گا۔',
      ar: 'الراحمون يرحمهم الرحمن، ارحموا من في الأرض يرحمكم من في السماء.',
    },
    content: {
      en: 'Abdullah ibn Amr reported: The Messenger of Allah ﷺ said: “Those who are merciful will be shown mercy by the Most Merciful. Be merciful to those on the earth, and the One in the heavens will have mercy upon you.” (Sunan al-Tirmidhi 1924)\n\nReflection: Mercy encompasses all creatures: being compassionate to children, honoring the elderly, speaking kindly to those serving you, and feeding animals. Compassion opens the gates of divine mercy.',
      ur: 'حضرت عبداللہ بن عمرو رضی اللہ عنہما سے روایت ہے کہ رسول اللہ ﷺ نے فرمایا: ”رحم کرنے والوں پر رحمن رحم فرماتا ہے۔ تم زمین والوں پر رحم کرو، آسمان والا تم پر رحم فرمائے گا۔“ (جامع ترمذی: 1924)\n\nنصیحت: تمام مخلوق پر شفقت اور رحم کا برتاؤ کریں۔ چھوٹوں پر شفقت، بڑوں کا ادب اور کمزوروں کی دستگیری کرنے سے اللہ تعالیٰ کی رحمت کے دروازے کھلتے ہیں۔',
      ar: 'عن عبد الله بن عمرو رضي الله عنهما قال: قال رسول الله ﷺ: «الرَّاحِمُونَ يَرْحَمُهُمُ الرَّحْمَنُ، ارْحَمُوا مَنْ فِي الأَرْضِ يَرْحَمْكُمْ مَنْ فِي السَّمَاءِ». (رواه الترمذي 1924)\n\nفائدة وتأمل: الرحمة سجية المؤمن الشاكرة، فكن رحيماً بالضعفاء والأيتام والحيوان حتى تنال رحمة الله الواسعة التي وسعت كل شيء.',
    },
    source: 'Sunan al-Tirmidhi',
    reference: 'Tirmidhi 1924',
    tags: ['hadith', 'mercy', 'compassion', 'kindness'],
  },
  {
    title: {
      en: 'Power of Istighfar (Seeking Forgiveness)',
      ur: 'استغفار کی برکات اور فضیلت',
      ar: 'استغفروا ربكم إنه كان غفارا',
    },
    description: {
      en: 'Ask forgiveness of your Lord. Indeed, He is ever a Perpetual Forgiver.',
      ur: 'اپنے رب سے بخشش مانگو، بیشک وہ بڑا بخشنے والا ہے۔',
      ar: 'استغفروا ربكم إنه كان غفاراً يرسل السماء عليكم مدراراً.',
    },
    content: {
      en: '“And said: Ask forgiveness of your Lord. Indeed, He is ever a Perpetual Forgiver. He will send [rain from] the sky upon you in [continuing] showers and give you increase in wealth and children.” (Surah Nuh 71:10-12)\n\nReflection: Istighfar is the master key to removing burdens, unlocking sustenance (rizq), and purifying the heart. Make it a habit to say Astaghfirullah wa-atubu ilayh at least 100 times throughout your day.',
      ur: '”میں نے کہا: اپنے رب سے معافی مانگو، بیشک وہ بڑا معاف کرنے والا ہے۔ وہ تم پر آسمان سے موسلادھار بارش برسائے گا اور مال اور اولاد سے تمہاری مدد فرمائے گا۔“ (سورۃ نوح: 10-12)\n\nنصیحت: استغفار رزق کی تنگی اور پریشانیوں کا بہترین علاج ہے۔ ہر روز صدقِ دل سے استغفار کریں تاکہ گناہوں کا بوجھ ہٹے اور اللہ کی رحمتیں نازل ہوں۔',
      ar: '﴿فَقُلْتُ اسْتَغْفِرُوا رَبَّكُمْ إِنَّهُ كَانَ غَفَّارًا ۝ يُرْسِلِ السَّمَاءَ عَلَيْكُم مِّدْرَارًا ۝ وَيُمْدِدْكُم بِأَمْوَالٍ وَبَنِينَ﴾ [نوح: 10-12]\n\nفائدة وتأمل: الاستغفار مفتاح الفرج وسعة الرزق وتفريج الكروب، فداوم على قول «أستغفر الله وأتوب إليه» في يومك وليلتك ترَ بركتها في حياتك.',
    },
    source: 'The Holy Quran',
    reference: 'Surah Nuh (71:10-12)',
    tags: ['quran', 'istighfar', 'forgiveness', 'rizq'],
  },
  {
    title: {
      en: 'Reliance on Allah (Tawakkul)',
      ur: 'اللہ پر کامل توکل اور بھروسہ',
      ar: 'ومن يتوكل على الله فهو حسبه',
    },
    description: {
      en: 'And whoever relies upon Allah - then He is sufficient for him.',
      ur: 'اور جو کوئی اللہ پر بھروسہ کرے تو وہ اس کے لیے کافی ہے۔',
      ar: 'ومن يتوكل على الله فهو حسبه إن الله بالغ أمره.',
    },
    content: {
      en: '“And whoever fears Allah - He will make for him a way out and will provide for him from where he does not expect. And whoever relies upon Allah - then He is sufficient for him.” (Surah At-Talaq 65:2-3)\n\nReflection: Do your utmost best, take the necessary practical steps, and then leave the ultimate outcome to Allah. Worrying about the future fades when you trust that Allah’s wisdom is far greater than your plans.',
      ur: '”اور جو شخص اللہ پر بھروسہ رکھے تو اللہ اس کے لیے کافی ہے۔ بیشک اللہ اپنا کام پورا کر کے رہتا ہے۔“ (سورۃ الطلاق: 3)\n\nنصیحت: اپنی تدبیر اور محنت پوری کریں اور نتیجہ اللہ پر چھوڑ دیں۔ جب انسان کا توکل مضبوط ہو تو دل کو تسلی رہتی ہے کہ جو رب نے چاہا وہی ہمارے لیے بہترین ہے۔',
      ar: '﴿وَمَن يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ ۚ إِنَّ اللَّهَ بَالِغُ أَمْرِهِ ۚ قَدْ جَعَلَ اللَّهُ لِكُلِّ شَيْءٍ قَدْرًا﴾ [الطلاق: 3]\n\nفائدة وتأمل: اعقلها وتوكل، ابذل أسبابك بجد واجتهاد، وفوض أمرك بالكلية إلى الله تعالى، فمن كان الله حسبه كفاه ما أهمه في دنياه وآخرته.',
    },
    source: 'The Holy Quran',
    reference: 'Surah At-Talaq (65:3)',
    tags: ['quran', 'tawakkul', 'trust', 'peace'],
  },
  {
    title: {
      en: 'Smiling & Good Speech as Charity',
      ur: 'مسکراہٹ اور میٹھی گفتگو بھی صدقہ ہے',
      ar: 'تبسمك في وجه أخيك صدقة',
    },
    description: {
      en: 'Your smiling in the face of your brother is charity for you.',
      ur: 'اپنے بھائی کے سامنے تمہارا مسکرانا بھی تمہارے لیے صدقہ ہے۔',
      ar: 'تبسمك في وجه أخيك لك صدقة، والكلمة الطيبة صدقة.',
    },
    content: {
      en: 'Abu Dharr reported: The Messenger of Allah ﷺ said: “Your smile for your brother is a charity. Enjoining good and forbidding evil is a charity. Guiding a person with poor sight is a charity.” (Sunan al-Tirmidhi 1956)\n\nReflection: You don’t need wealth to give charity every day. A sincere smile, encouraging words, picking up litter from the road, or removing an obstacle is valued by Allah as pure Sadaqah.',
      ur: 'حضرت ابوذر رضی اللہ عنہ سے روایت ہے کہ رسول اللہ ﷺ نے فرمایا: ”اپنے بھائی کے سامنے تمہارا مسکرانا تمہارے لیے صدقہ ہے، اور بھلائی کا حکم دینا اور برائی سے روکنا بھی صدقہ ہے۔“ (جامع ترمذی: 1956)\n\nنصیحت: صدقہ صرف مال و دولت سے نہیں ہوتا، مسکراہٹ، اچھے الفاظ، راستے سے تکلیف دہ چیز ہٹانا اور کسی کا حوصلہ بڑھانا بھی اللہ کے ہاں بہت بڑا صدقہ ہے۔',
      ar: 'عن أبي ذر رضي الله عنه قال: قال رسول الله ﷺ: «تَبَسُّمُكَ فِي وَجْهِ أَخِيكَ لَكَ صَدَقَةٌ، وَأَمْرُكَ بِالْمَعْرُوفِ وَنَهْيُكَ عَنِ الْمُنْكَرِ صَدَقَةٌ». (رواه الترمذي 1956)\n\nفائدة وتأمل: لا تحقرن من المعروف شيئاً ولو أن تلقى أخاك بوجه طلق، فالكلمة الطيبة والابتسامة الصادقة صدقة تغرس المحبة وتثقل الموازين.',
    },
    source: 'Sunan al-Tirmidhi',
    reference: 'Tirmidhi 1956',
    tags: ['hadith', 'sadaqah', 'charity', 'manners'],
  },
  {
    title: {
      en: 'Seeking Knowledge is an Obligation',
      ur: 'علم کا حصول اور اس کی فضیلت',
      ar: 'فضل طلب العلم وسلوكه',
    },
    description: {
      en: 'Whoever takes a path seeking knowledge, Allah makes easy for him a path to Paradise.',
      ur: 'جو شخص علم کی تلاش میں کسی راستے پر چلتا ہے، اللہ تعالیٰ اس کے لیے جنت کا راستہ آسان کر دیتا ہے۔',
      ar: 'من سلك طريقاً يلتمس فيه علماً سهل الله له به طريقاً إلى الجنة.',
    },
    content: {
      en: 'Abu Hurairah reported: The Messenger of Allah ﷺ said: “Whoever treads a path in search of knowledge, Allah will make easy for him the path to Paradise.” (Sahih Muslim 2699)\n\nReflection: Dedicate at least 15 minutes each day to beneficial knowledge: reading a verse of the Quran with its meaning, learning a Hadith, or understanding your prayers better. Knowledge illuminates life and eternity.',
      ur: 'حضرت ابوہریرہ رضی اللہ عنہ سے روایت ہے کہ رسول اللہ ﷺ نے فرمایا: ”جو شخص علم کی تلاش میں کسی راستے پر چلتا ہے، اللہ تعالیٰ اس کے لیے جنت کا راستہ آسان کر دیتا ہے۔“ (صحیح مسلم: 2699)\n\nنصیحت: روزانہ کچھ وقت دین اور نفع بخش علم سیکھنے میں صرف کریں۔ قرآن کی تلاوت مع ترجمہ اور احادیث کا مطالعہ دل کو منور اور آخرت کی کامیابی کا ضامن بناتا ہے۔',
      ar: 'عن أبي هريرة رضي الله عنه أن رسول الله ﷺ قال: «مَنْ سَلَكَ طَرِيقاً يَلْتَمِسُ فِيهِ عِلْماً، سَهَّلَ اللَّهُ لَهُ بِهِ طَرِيقاً إِلَى الْجَنَّةِ». (رواه مسلم 2699)\n\nفائدة وتأمل: شرف العلم عظيم وأثره دائم، فاحرص يومياً على قراءة آية بتفسيرها أو حديث بمعناه، فإن العلم نور في الدنيا ونجاة في الآخرة.',
    },
    source: 'Sahih Muslim',
    reference: 'Muslim 2699',
    tags: ['hadith', 'ilm', 'knowledge', 'paradise'],
  },
  {
    title: {
      en: 'Guarding the Tongue',
      ur: 'زبان کی حفاظت اور بھلائی کی بات',
      ar: 'حفظ اللسان وقول الخير',
    },
    description: {
      en: 'Whoever believes in Allah and the Last Day, let him speak good or remain silent.',
      ur: 'جو شخص اللہ اور یومِ آخرت پر ایمان رکھتا ہے وہ اچھی بات کہے ورنہ خاموش رہے۔',
      ar: 'من كان يؤمن بالله واليوم الآخر فليقل خيراً أو ليصمت.',
    },
    content: {
      en: 'Abu Hurairah reported: The Messenger of Allah ﷺ said: “Whoever believes in Allah and the Last Day, let him speak good or remain silent.” (Sahih al-Bukhari 6018, Sahih Muslim 47)\n\nReflection: Words have tremendous weight. Protect your speech from backbiting, sarcasm, harshness, and falsehood. If you cannot offer constructive, encouraging, or truthful words, silence is the greatest virtue.',
      ur: 'حضرت ابوہریرہ رضی اللہ عنہ سے روایت ہے کہ رسول اللہ ﷺ نے فرمایا: ”جو شخص اللہ اور قیامت کے دن پر ایمان رکھتا ہے، اسے چاہیے کہ اچھی بات کہے یا پھر خاموش رہے۔“ (صحیح بخاری: 6018، صحیح مسلم: 47)\n\nنصیحت: زبان کی حفاظت ایمان کی نشانی ہے۔ غیبت، چغلی اور سخت کلامی سے پرہیز کریں اور اپنی زبان کو ذکرِ الٰہی اور تعمیری گفتگو سے سجائیں۔',
      ar: 'عن أبي هريرة رضي الله عنه قال: قال رسول الله ﷺ: «مَنْ كَانَ يُؤْمِنُ بِاللَّهِ وَالْيَوْمِ الآخِرِ فَلْيَقُلْ خَيْراً أَوْ لِيَصْمُتْ». (متفق عليه: البخاري 6018، مسلم 47)\n\nفائدة وتأمل: اللسان ميزان العقل وترجمان القلب، فزِن كلماتك قبل النطق بها وتجنب الغيبة والنميمة، فالصمت حكمة وقليل فاعله.',
    },
    source: 'Sahih al-Bukhari & Muslim',
    reference: 'Bukhari 6018, Muslim 47',
    tags: ['hadith', 'speech', 'silence', 'wisdom'],
  },
  {
    title: {
      en: 'Supplication is the Essence of Worship',
      ur: 'دعا عبادت کا مغز ہے',
      ar: 'الدعاء هو العبادة',
    },
    description: {
      en: 'Call upon Me; I will respond to you.',
      ur: 'مجھ سے دعا کرو، میں تمہاری دعا قبول کروں گا۔',
      ar: 'وقال ربكم ادعوني أستجب لكم إن الذين يستكبرون عن عبادتي سيدخلون جهنم داخرين.',
    },
    content: {
      en: '“And your Lord says: Call upon Me; I will respond to you.” (Surah Ghafir 40:60)\n\nReflection: Never underestimate the power of sincere Dua. Allah loves when His servants ask Him for their needs, big and small. Raise your hands in Tahajjud, before breaking fast, or in prostration (Sujud) with complete certitude.',
      ur: '”اور تمہارے رب نے فرمایا ہے کہ مجھے پکارو، میں تمہاری دعائیں قبول کروں گا۔“ (سورۃ غافر: 60)\n\nنصیحت: دعا مومن کا ہتھیار ہے۔ سجدے میں اور تنہائی کے لمحات میں گڑگڑا کر مانگیں، اللہ تعالیٰ اپنے بندوں کی دعائیں سننے اور عطا فرمانے والا ہے۔',
      ar: '﴿وَقَالَ رَبُّكُمُ ادْعُونِي أَسْتَجِبْ لَكُمْ﴾ [غافر: 60]\n\nفائدة وتأمل: الدعاء حبل موصول بين العبد وخالقه، وأقرب ما يكون العبد من ربه وهو ساجد فأكثروا من الدعاء وثقوا بالإجابة والخير فيما يختاره الله.',
    },
    source: 'The Holy Quran',
    reference: 'Surah Ghafir (40:60)',
    tags: ['quran', 'dua', 'supplication', 'worship'],
  },
  {
    title: {
      en: 'Kindness to Parents',
      ur: 'والدین کے ساتھ حسنِ سلوک',
      ar: 'بر الوالدين والإحسان إليهما',
    },
    description: {
      en: 'And lower to them the wing of humility out of mercy.',
      ur: 'اور ان کے آگے شفقت سے عاجزی کے بازو جھکائے رکھو۔',
      ar: 'واخفض لهما جناح الذل من الرحمة وقل رب ارحمهما كما ربياني صغيراً.',
    },
    content: {
      en: '“And your Lord has decreed that you not worship except Him, and to parents, good treatment. Whether one or both of them reach old age [while] with you, say not to them [so much as], ‘uff,’ and do not repel them but speak to them a noble word.” (Surah Al-Isra 17:23-24)\n\nReflection: Call your parents today, ask for their prayers, speak with humility, and kiss their hands. Serving parents is one of the quickest pathways to Jannah and divine pleasure.',
      ur: '”اور تمہارے رب نے حکم دیا ہے کہ اس کے سوا کسی کی عبادت نہ کرو اور والدین کے ساتھ حسنِ سلوک کرو، اگر ان میں سے کوئی ایک یا دونوں تمہارے سامنے بڑھاپے کو پہنچ جائیں تو انہیں اف تک نہ کہو۔“ (سورۃ الاسراء: 23-24)\n\nنصیحت: والدین کی خدمت اور ان سے نرمی سے بات کرنا جنت کی چابی ہے۔ روزانہ ان کی خیر خیریت پوچھیں اور ان کی دعائیں لیں جو ہر مصیبت کو ٹال دیتی ہیں۔',
      ar: '﴿وَقَضَىٰ رَبُّكَ أَلَّا تَعْبُدُوا إِلَّا إِيَّاهُ وَبِالْوَالِدَيْنِ إِحْسَانًا ۚ إِمَّا يَبْلُغَنَّ عِندَكَ الْكِبَرَ أَحَدُهُمَا أَوْ كِلَاهُمَا فَلَا تَقُل لَّهُمَا أُفٍّ وَلَا تَنْهَرْهُمَا وَقُل لَّهُمَا قَوْلًا كَرِيمًا﴾ [الإسراء: 23]\n\nفائدة وتأمل: بر الوالدين أعظم القربات بعد توحيد الله، فأحسن إليهما بالقول اللين والدعاء الصالح والخدمة الخالصة تنل رضا الرحمن وتوفيق الدارين.',
    },
    source: 'The Holy Quran',
    reference: 'Surah Al-Isra (17:23-24)',
    tags: ['quran', 'parents', 'birr', 'family'],
  },
  {
    title: {
      en: 'Controlling Anger',
      ur: 'غصے پر قابو پانا اور عفو و درگزر',
      ar: 'ضبط الغضب والعفو عند المقدرة',
    },
    description: {
      en: 'The strong person is not the good wrestler; rather, the strong person is the one who controls himself when angry.',
      ur: 'طاقتور وہ نہیں جو پچھاڑ دے، بلکہ طاقتور وہ ہے جو غصے کے وقت اپنے آپ پر قابو رکھے۔',
      ar: 'ليس الشديد بالصرعة، إنما الشديد الذي يملك نفسه عند الغضب.',
    },
    content: {
      en: 'Abu Hurairah reported: The Messenger of Allah ﷺ said: “The strong is not the one who overcomes the people by his strength, but the one who controls himself while in anger.” (Sahih al-Bukhari 6114, Sahih Muslim 2609)\n\nReflection: When you feel irritation or fury rising, pause, seek refuge in Allah from Shaytan (A’udhu billah), change your posture, drink water, or perform wudhu. True strength is mastering your impulses.',
      ur: 'حضرت ابوہریرہ رضی اللہ عنہ سے روایت ہے کہ رسول اللہ ﷺ نے فرمایا: ”پہلوان وہ نہیں جو دوسرے کو پچھاڑ دے، بلکہ اصل طاقتور وہ ہے جو غصے کی حالت میں اپنے نفس پر قابو رکھے۔“ (صحیح بخاری: 6114، صحیح مسلم: 2609)\n\nنصیحت: غصے کے وقت اعوذ باللہ پڑھیں، پانی پئیں اور خاموش ہو جائیں۔ درگزر اور صبر کرنے والا اللہ تعالیٰ کی بارگاہ میں بلند درجات پاتا ہے۔',
      ar: 'عن أبي هريرة رضي الله عنه أن رسول الله ﷺ قال: «لَيْسَ الشَّدِيدُ بِالصُّرَعَةِ، إِنَّمَا الشَّدِيدُ الَّذِي يَمْلِكُ نَفْسَهُ عِنْدَ الْغَضَبِ». (متفق عليه: البخاري 6114، مسلم 2609)\n\nفائدة وتأمل: الغضب جمرة من الشيطان، فإذا غضبت فاستعذ بالله وتوضأ وغيّر جلستك، فإن الحلم والتحكم في المشاعر قمة الشجاعة وعنوان الحكمة.',
    },
    source: 'Sahih al-Bukhari & Muslim',
    reference: 'Bukhari 6114, Muslim 2609',
    tags: ['hadith', 'patience', 'anger', 'character'],
  },
  {
    title: {
      en: 'Look at Those Less Fortunate',
      ur: 'کمزور اور نادار لوگوں پر نظر رکھیں',
      ar: 'القناعة والنظر إلى من هو دونك',
    },
    description: {
      en: 'Look at those who are beneath you and do not look at those who are above you.',
      ur: 'ان لوگوں کو دیکھو جو تم سے کم حیثیت ہیں اور ان کو نہ دیکھو جو تم سے اوپر ہیں۔',
      ar: 'انظروا إلى من هو أسفل منكم ولا تنظروا إلى من هو فوقكم فهو أجدر أن لا تزدروا نعمة الله.',
    },
    content: {
      en: 'Abu Hurairah reported: The Messenger of Allah ﷺ said: “Look at those who are beneath you and do not look at those who are above you, for it is more suitable that you do not belittle the favors of Allah upon you.” (Sahih Muslim 2963, Sahih al-Bukhari 6490)\n\nReflection: Comparison is the thief of joy. When you look at those with less wealth, physical health, or comfort, your heart overflows with gratitude for the countless gifts Allah has already blessed you with.',
      ur: 'حضرت ابوہریرہ رضی اللہ عنہ سے روایت ہے کہ رسول اللہ ﷺ نے فرمایا: ”دنیا کے معاملے میں ان لوگوں کو دیکھو جو تم سے کم تر ہیں اور ان کو نہ دیکھو جو تم سے برتر ہیں، کیونکہ یہ بات اس کے زیادہ لائق ہے کہ تم اللہ کی نعمتوں کو حقیر نہ سمجھو۔“ (صحیح مسلم: 2963)\n\nنصیحت: قناعت دل کو غنی کر دیتی ہے۔ اپنے سے کم وسائل والوں کو دیکھ کر شکر ادا کریں، حسد اور ناشکری دل کے سکون کو برباد کر دیتی ہے۔',
      ar: 'عن أبي هريرة رضي الله عنه قال: قال رسول الله ﷺ: «انْظُرُوا إِلَى مَنْ هُوَ أَسْفَلَ مِنْكُمْ، وَلاَ تَنْظُرُوا إِلَى مَنْ هُوَ فَوْقَكُمْ، فَهُوَ أَجْدَرُ أَنْ لاَ تَزْدَرُوا نِعْمَةَ اللَّهِ عَلَيْكُمْ». (رواه مسلم 2963)\n\nفائدة وتأمل: الرضا بما قسم الله غنى لا ينفد. انظر دائماً إلى من هو أقل منك في الدنيا تنبض روحك بالحمد والشكر وتزول عنك حسرة المقارنات.',
    },
    source: 'Sahih Muslim',
    reference: 'Muslim 2963',
    tags: ['hadith', 'contentment', 'qanaah', 'gratitude'],
  },
];

@Injectable({ providedIn: 'root' })
export class AiReminderService {
  private readonly postService = inject(PostService);

  /**
   * Deterministic daily seed based on year, month, and day.
   * Ensures all visitors on the same calendar day see the identical AI daily reminder.
   */
  getDailySeed(date: Date = new Date()): number {
    const y = date.getFullYear();
    const m = date.getMonth() + 1;
    const d = date.getDate();
    return Math.abs((y * 365 + m * 31 + d) % AI_ISLAMIC_REMINDERS_LIBRARY.length);
  }

  /**
   * Generates or selects today's authentic Islamic daily reminder.
   */
  getTodayAiReminder(date: Date = new Date()): Post {
    const index = this.getDailySeed(date);
    const template = AI_ISLAMIC_REMINDERS_LIBRARY[index];
    const dateStr = date.toISOString().slice(0, 10);

    return {
      id: `ai-reminder-${dateStr}`,
      type: 'reminder',
      title: template.title,
      description: template.description,
      content: template.content,
      source: template.source,
      reference: template.reference,
      tags: [...template.tags, 'ai-daily'],
      categoryIds: [],
      status: 'published',
      featured: false,
      likesCount: 0,
      commentsCount: 0,
      searchKeywords: ['reminder', 'daily', 'ai', 'quran', 'hadith'],
      authorId: 'system-ai',
      relatedVideoIds: [],
      relatedEventIds: [],
      publishedAt: Timestamp.fromDate(date),
      createdAt: Timestamp.fromDate(date),
      updatedAt: Timestamp.fromDate(date),
    };
  }

  /**
   * Allows an admin to officially publish the daily AI reminder as a real Firestore document in `posts`.
   */
  async publishAiReminderToDatabase(authorId: string, reminder?: Post): Promise<string> {
    const target = reminder ?? this.getTodayAiReminder();
    const draft: PostDraft = {
      type: 'reminder',
      title: target.title,
      description: target.description,
      content: target.content,
      categoryIds: [],
      status: 'published',
      featured: false,
      tags: target.tags ?? ['daily-reminder', 'ai-generated'],
      relatedVideoIds: [],
      relatedEventIds: [],
      source: target.source,
      reference: target.reference,
      publishedAt: Timestamp.now(),
    };
    return this.postService.create(authorId, draft);
  }
}
