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

/** Curated authentic Islamic offline index for instant fallback if Firebase Vertex AI API is pending activation */
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
    keywords: ['shifa', 'healing', 'cure', 'شفاء', 'شفا', 'بیماری', 'علاج', 'تندرستی'],
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
    keywords: ['namaz', 'salah', 'prayer', 'نماز', 'الصلاة', 'صلوة', 'طہارت', 'وضو'],
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
];

@Injectable({ providedIn: 'root' })
export class FirebaseIslamicAiService {
  private readonly firebase = inject(FirebaseService);
  private generativeModel: GenerativeModel | null = null;
  private isModelInitialized = false;

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

    // 1. Try Firebase AI (Vertex AI in Firebase via gemini-1.5-flash)
    if (this.firebase.configured) {
      if (!this.generativeModel) {
        this.initModel();
      }

      if (this.generativeModel) {
        try {
          const prompt = `[Language: ${lang}] Answer this Islamic question accurately, citing authentic Quran verses (Surah name & Ayah number) and Sahih Hadith sources where relevant. Keep the response respectful, structured, and easy to read:\nQuestion: "${trimmed}"`;
          const result = await this.generativeModel.generateContent(prompt);
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
          // Firebase AI API might not yet be enabled in the Firebase console; gracefully fall back
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

    // General authentic Islamic answer template
    const defaultAnswers: Record<SupportedLanguage, string> = {
      en: `In Islam, every question regarding faith and daily life is rooted in the guidance of the Holy Quran and the Sunnah of Prophet Muhammad ﷺ.\n\nAllah says: "So ask the people of the message if you do not know." (Surah An-Nahl 16:43)\n\nRegarding "${query}":\nSeek beneficial knowledge with pure intention, perform your daily prayers, consult authentic Islamic scholarship, and remember that sincere remembrance of Allah (Dhikr) and Dua illuminate every path.`,
      ur: `اسلام میں ہر دینی اور اخلاقی مسئلے کی رہنمائی قرآنِ مجید اور سنتِ رسول ﷺ سے حاصل کی جاتی ہے۔\n\nاللہ تعالیٰ کا ارشاد ہے: ”پس تم اہل علم سے پوچھ لو اگر تم نہیں جانتے“ (سورۃ النحل: 43)۔\n\n”${query}“ کے بارے میں:\nنیک نیتی کے ساتھ علم حاصل کریں، نماز کی پابندی رکھیں، اور اپنے معاملات کو اللہ تعالیٰ کے سپرد کر کے کثرت سے دعا اور استغفار کا اہتمام کریں۔`,
      ar: `في ديننا الحنيف، يُلتمس الهدى والنور من كتاب الله وسنة رسوله ﷺ.\n\nقال الله تعالى: ﴿فَاسْأَلُوا أَهْلَ الذِّكْرِ إِن كُنتُمْ لَا تَعْلَمُونَ﴾ [النحل: 43].\n\nحول استفساركم: «${query}»:\nاحرص على طلب العلم النافع بنيّة خالصة، وحافظ على أداء الفرائض والأذكار المشروعة، واستعن بالله بالدعاء والعمل الصالح.`,
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
