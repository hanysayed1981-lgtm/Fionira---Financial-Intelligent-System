/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const levenshtein = (a: string, b: string): number => {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  // Optimization: ensure 'a' is the shorter string to save memory
  if (a.length > b.length) {
    [a, b] = [b, a];
  }

  let prevRow = Array.from({ length: b.length + 1 }, (_, i) => i);
  let currRow = new Array(b.length + 1);

  for (let i = 1; i <= a.length; i++) {
    currRow[0] = i;
    let minInRow = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      currRow[j] = Math.min(
        currRow[j - 1] + 1,
        prevRow[j] + 1,
        prevRow[j - 1] + cost
      );
      if (currRow[j] < minInRow) minInRow = currRow[j];
    }
    
    // Swap rows
    let temp = prevRow;
    prevRow = currRow;
    currRow = temp;
  }
  return prevRow[b.length];
};

export const calculateSimilarity = (a: string, b: string): number => {
  const normA = a.toLowerCase().replace(/[^a-z0-9\u0600-\u06FF]/gi, '');
  const normB = b.toLowerCase().replace(/[^a-z0-9\u0600-\u06FF]/gi, '');
  if (normA === normB) return 1;
  if (normA.length === 0 || normB.length === 0) return 0;
  
  const distance = levenshtein(normA, normB);
  const maxLength = Math.max(normA.length, normB.length);
  return 1 - (distance / maxLength);
};

const normalizeCache = new Map<string, string>();

// Common business words to ignore during comparison
const businessWords = [
    'شركة', 'شركه', 'مؤسسة', 'مؤسسه', 'مجموعة', 'مجموعه', 'مكتب', 'مصنع', 'محل', 'مركز', 'معرض', 
    'عميل', 'زبون', 'المحاسب', 'محاسب', 'المهندس', 'مهندس', 'الدكتور', 'دكتور', 'الاستاذ', 'استاذ', 
    'مدير', 'المدير', 'مشرف', 'المشرف', 'عامل', 'العامل', 'فني', 'الفني', 'سائق', 'السائق', 
    'حارس', 'الحارس', 'مندوب', 'المندوب', 'بائع', 'البائع', 'للتجارة', 'للخدمات', 'التجارية', 
    'للمواد', 'الغذائية', 'للنقل', 'والتخزين', 'للتخزين', 'مستودع', 'الوطنية', 'المحدودة', 'محدودة', 
    'فرع', 'العالمية', 'الدولية', 'المتحدة', 'المساهمة', 'المقفلة', 'القابضة', 'للاستثمار', 
    'للمقاولات', 'للتوريدات', 'للتسويق', 'للصناعة', 'للتقنية', 'للاتصالات', 'للنقل', 'للشحن', 
    'اللوجستية', 'الطبية', 'التعليمية', 'الخيرية', 'م', 'د', 'أ', 'المورد', 'مورد', 'العملاء', 'الموردين',
    'منصة', 'منصه', 'بوابة', 'بوابه', 'نظام', 'حلول',
    'co', 'ltd', 'company', 'trading', 'services', 'food', 'logistics', 'store', 'global', 
    'international', 'united', 'joint', 'stock', 'holding', 'investment', 'contracting', 
    'supplies', 'marketing', 'industry', 'tech', 'technology', 'telecom', 'transport', 
    'shipping', 'medical', 'educational', 'charity', 'inc', 'corp', 'corporation', 'group', 'solutions'
];

// Pre-normalize business words for faster matching
const normalizedBusinessWords = businessWords.map(w => 
    w.toLowerCase()
     .replace(/[أإآا]/g, 'ا')
     .replace(/[ةه]/g, 'ه')
     .replace(/[ىي]/g, 'ي')
     .replace(/ـ/g, '')
);

// Pre-normalize aliases for faster matching
const aliases: Record<string, string[]> = {
    'perfectchef': ['الشيف المثالي', 'perfect chef', 'الشيف المثالى', 'شركة الشيف المثالى للتجارة', 'perfectchef'],
    'alnumuw': ['النمو', 'منصه النمو', 'منصة النمو', 'al numuw', 'شركة منصة النمو للخدمات التجارية', 'alnumuw', 'النمو للخدمات التجارية'],
    'gulfcentral': ['gulfwest central', 'الخليج الوسطي', 'الخليج الوسطى', 'cgulf west', 'gulf central'],
    'sfaqat': ['صفقات', 'safaqat', 'رحماء الدولية', 'رحماء الدوليه', 'رحماء الدولية للتجارة صفقات', 'رحماء الدولية للتحارة صفقات', 'شركة رحماء الدولية للتحارة (صفقات)', 'شركة رحماء الدولية للتجارة'],
    'alwadi': ['الوادي', 'الوادي للدواجن', 'al wadi'],
    'danube': ['الدانوب', 'danube', 'شركة الدانوب للمواد الغذائية', 'danube food', 'دانوب', 'danub', 'الدانوب للمواد الغذائية', 'شركة الدانوب', 'danube co', 'danube company', 'danub food'],
    'napco': ['نابكو', 'نابكو للورق', 'نابكو الوطنية'],
    'moltaqaalkhabbazeen': ['ملتقي الخبازين', 'ملتقى الخبازين'],
    'afash': ['عفش', 'مستودع عفش', 'عفش للنقل'],
    'nada': ['ندى', 'العثمان للانتاج والتصنيع الزراعي ندى', 'العثمان للانتاج والتصنيع الزراعي', 'شركة العثمان للأنتاج والتصنيع الزراعي (ندى)', 'شركة العثمان للانتاج والتصنيع الزراعي'],
    'gulfwest': ['gulf west', 'شركة الخليج الغربية للإستيراد المحدودة', 'الخليج الغربية', 'الخليج الغربيه'],
    'stc': ['اس تي سي', 'الاتصالات السعوديه', 'saudi telecom', 'stc', 'اس تى سى'],
    'mobily': ['موبايلي', 'اتحاد اتصالات', 'mobily', 'موبايلي'],
    'zain': ['زين', 'zain'],
    'sasco': ['ساسكو', 'sasco'],
    'aldrees': ['الدريس', 'aldrees'],
    'jarir': ['جرير', 'مكتبه جرير', 'jarir', 'jarir bookstore'],
    'extra': ['اكسترا', 'extra'],
    'saco': ['ساكو', 'saco'],
    'hungerstation': ['هنقرستيشن', 'hungerstation', 'hunger station'],
    'google': ['جوجل', 'غوغل', 'google'],
    'microsoft': ['مايكروسوفت', 'microsoft'],
    'apple': ['ابل', 'apple'],
    'salla': ['سله', 'salla'],
    'zid': ['زد', 'zid'],
    'odoo': ['اودو', 'odoo'],
    'tamara': ['تمارا', 'tamara'],
    'tabby': ['تابي', 'تابى', 'tabby'],
    'najm': ['نجم', 'شركة نجم', 'najm'],
    'sadad': ['سداد', 'sadad'],
    'mada': ['مدى', 'mada'],
    'rajhi': ['الراجحي', 'مصرف الراجحي', 'al rajhi', 'rajhi bank'],
    'snb': ['الاهلي', 'البنك الاهلي', 'البنك الاهلي السعودي', 'ahli bank', 'saudi national bank', 'snb'],
    'riyad': ['الرياض', 'بنك الرياض', 'riyad bank', 'riyad'],
    'alinma': ['الانماء', 'مصرف الانماء', 'alinma bank', 'alinma'],
    'albilad': ['البلاد', 'بنك البلاد', 'albilad bank', 'albilad'],
    'aljazeera': ['الجزيرة', 'بنك الجزيرة', 'aljazeera bank', 'aljazeera'],
    'saib': ['الاستثمار', 'البنك السعودي للاستثمار', 'saudi investment bank', 'saib'],
    'bsf': ['الفرنسي', 'البنك السعودي الفرنسي', 'banque saudi fransi', 'bsf'],
    'sabb': ['ساب', 'البنك السعودي البريطاني', 'saudi british bank', 'sab', 'البنك الاول', 'sabb'],
    'anb': ['العربي', 'البنك العربي الوطني', 'arab national bank', 'anb'],
    'aljeraisy': ['الجريسي', 'عيسي الجريسي', 'عيسى الجريسي', 'عيسي الجريسي للمقاولات', 'مؤسسة الجريسي'],
    'qasrplastic': ['قصر البلاستيك', 'قصر البلاستك', 'قصر البلاستيك للتجارة', 'القصر للبلاستيك'],
    'othaim': ['أسواق العثيم', 'اسواق العثيم', 'العثيم', 'othaim', 'othaim markets', 'شركة أسواق العثيم', 'العثيم للتجارة', 'اسواق عبدالله العثيم', 'أسواق عبدالله العثيم', 'abdullah alothaim', 'al othaim'],
    'gosi': ['التأمينات الاجتماعية', 'التامينات الاجتماعية', 'المؤسسة العامة للتأمينات الاجتماعية', 'المؤسسه العامه للتامينات الاجتماعيه', 'gosi', 'تأمينات', 'تامينات'],
    'flowerd': ['flowerd', 'شركة الورود الفاخرة للتجارة', 'الورود الفاخرة', 'الورود الفاخره'],
    'thechefz': ['the chefz', 'thechefz', 'شركة افضل الطهاة لتقديم الوجبات', 'افضل الطهاة', 'أفضل الطهاة'],
    'bloss': ['bloss', 'بلوس'],
    'pureart': ['صالون الفن النقي للتزيين النسائي', 'الفن النقي', 'صالون الفن النقي'],
    'harrypotter': ['harry poter', 'harry potter', 'هاري بوتر'],
    'keeta': ['keeta', 'كيتا'],
    'thex': ['the x', 'ذا اكس'],
    'nenja': ['nenja', 'ninja', 'نينجا']
};

const normalize = (str: string) => {
    if (!str) return '';
    if (normalizeCache.has(str)) return normalizeCache.get(str)!;
    
    // 1. Basic cleaning and lowercase
    let norm = String(str).toLowerCase().trim();
    
    // 2. Character normalization (Arabic)
    norm = norm
        .replace(/[أإآا]/g, 'ا')
        .replace(/[ةه]/g, 'ه')
        .replace(/[ىي]/g, 'ي')
        .replace(/ـ/g, '') // Remove kashidas
        .replace(/[ؤئ]/g, 'ء'); // Normalize hamzas
        
    // 3. Remove common business prefixes/suffixes (Recursive-like removal)
    for (let i = 0; i < 3; i++) {
        const words = norm.split(' ');
        const filteredWords = words.filter(w => !normalizedBusinessWords.includes(w));
        if (filteredWords.length === words.length) break;
        norm = filteredWords.join(' ');
    }
    
    // 4. Remove "Al-" or "ال" prefix from words if they are long enough
    norm = norm.split(' ').map(word => {
        if (word.startsWith('ال') && word.length > 3) return word.substring(2);
        if (word.startsWith('al-') && word.length > 4) return word.substring(3);
        if (word.startsWith('al') && word.length > 3) return word.substring(2);
        return word;
    }).join(' ');

    // 5. Final cleanup - remove special chars but keep spaces
    norm = norm
        .replace(/[^a-z0-9\u0600-\u06FF\s]/gi, ' ')
        .trim()
        .replace(/\s+/g, ' ');
        
    normalizeCache.set(str, norm);
    return norm;
};

// Pre-calculate pre-normalized alias mappings
const aliasMap = new Map<string, string>();
Object.entries(aliases).forEach(([key, vals]) => {
    const normKey = normalize(key).replace(/\s+/g, '');
    aliasMap.set(normKey, normKey);
    vals.forEach(v => {
        const normV = normalize(v).replace(/\s+/g, '');
        aliasMap.set(normV, normKey);
    });
});

export const isSimilarName = (a: string, b: string, isVendor: boolean = false): boolean => {
  if (!a || !b) return false;
  
  const normA = normalize(a);
  const normB = normalize(b);

  if (normA === normB && normA !== '') return true;

  const cleanA = normA.replace(/\s+/g, '');
  const cleanB = normB.replace(/\s+/g, '');

  if (cleanA === cleanB && cleanA !== '') return true;

  // Known Aliases Check (Optimized with Map)
  const aliasA = aliasMap.get(cleanA);
  const aliasB = aliasMap.get(cleanB);
  if (aliasA && aliasB && aliasA === aliasB) return true;

  // Initials check (e.g., "STC" vs "Saudi Telecom Company")
  const checkInitials = (abbr: string, full: string) => {
      if (abbr.length < 2 || abbr.length > 5 || !/^[a-z]+$/.test(abbr)) return false;
      const fullWords = full.split(' ').filter(w => w.length > 0);
      if (fullWords.length < abbr.length) return false;
      const initials = fullWords.map(w => w[0]).join('').substring(0, abbr.length);
      return initials === abbr;
  };

  if (checkInitials(cleanA, normB) || checkInitials(cleanB, normA)) return true;

  // Word-by-word matching (Robust against word order and minor typos)
  const wordsA = normA.split(' ').filter(w => w.length > 1);
  const wordsB = normB.split(' ').filter(w => w.length > 1);
  
  if (wordsA.length > 0 && wordsB.length > 0) {
      const shorter = wordsA.length <= wordsB.length ? wordsA : wordsB;
      const longer = wordsA.length <= wordsB.length ? wordsB : wordsA;
      
      let matchCount = 0;
      for (const word of shorter) {
          // Optimization: Check for exact match first
          if (longer.includes(word)) {
              matchCount++;
              continue;
          }
          
          // Only run expensive levenshtein if words are similar in length and long enough
          const foundSimilar = longer.some(lWord => {
              if (Math.abs(lWord.length - word.length) > 2) return false;
              
              // For short words, must be very similar
              if (word.length <= 4) return levenshtein(word, lWord) === 1;
              
              // For longer words, allow more distance
              const dist = levenshtein(word, lWord);
              return dist <= Math.floor(word.length / 3);
          });
          
          if (foundSimilar) {
              matchCount++;
          }
      }
      
      const similarity = matchCount / Math.max(wordsA.length, wordsB.length);
      
      // High word match count
      if (matchCount === shorter.length && shorter.length >= 2) return true;
      if (similarity >= 0.7) return true;
  }

  // Final fallback: Levenshtein on cleaned strings for short names
  if (cleanA.length >= 4 && cleanB.length >= 4) {
      const dist = levenshtein(cleanA, cleanB);
      if (dist <= Math.floor(Math.max(cleanA.length, cleanB.length) / 4)) return true;
  }

  return false;
};

export const parseNumber = (val: any): number => {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return val;
  
  let str = String(val).trim();
  // Remove quotes that might be wrapping the number in CSVs (e.g. " 1,500.00 ")
  str = str.replace(/^["']|["']$/g, '').trim();
  
  // Handle Arabic/Indic digits (٠-٩)
  const arabicDigits = '٠١٢٣٤٥٦٧٨٩';
  str = str.replace(/[٠-٩]/g, d => String(arabicDigits.indexOf(d)));
  
  // Check for negative indicators: (100) or -100 or 100-
  let isNegative = false;
  // Remove leading/trailing whitespace and common currency symbols for the check
  const trimmedForNeg = str.replace(/^[\s$SARsarر.س]+|[\s$SARsarر.س]+$/g, '');
  if (/^-\s*[\d.,]+$/.test(trimmedForNeg) || /^[\d.,]+\s*-$/.test(trimmedForNeg) || /^\([\d.,\s]+\)$/.test(trimmedForNeg)) {
    isNegative = true;
  }
  
  // Support scientific notation (e.g., 1.1E+11) which often appears in CSVs for long IDs
  if (/^-?\d+\.?\d*[eE][+-]?\d+$/.test(str.replace(/[^\d.eE+-]/g, ''))) {
      const parsed = parseFloat(str.replace(/[^\d.eE+-]/g, ''));
      if (!isNaN(parsed)) return isNegative ? -Math.abs(parsed) : parsed;
  }

  // Remove everything except digits, dots, and commas
  // Try extracting the first valid number chunk from the string
  let extracted = str;
  const match = str.match(/-?[\d]+(?:[.,]\d+)*/);
  if (match) {
      extracted = match[0];
  }
  
  // Remove everything except digits, dots, and commas
  let cleanStr = extracted.replace(/[^\d.,]/g, '');
  
  if (!cleanStr) return 0;

  // Determine decimal separator (standardize to dot)
  const lastDot = cleanStr.lastIndexOf('.');
  const lastComma = cleanStr.lastIndexOf(',');
  
  if (lastDot > -1 && lastComma > -1) {
      if (lastDot > lastComma) {
          cleanStr = cleanStr.replace(/,/g, '');
      } else {
          cleanStr = cleanStr.replace(/\./g, '').replace(',', '.');
      }
  } else if (lastComma > -1) {
      // If comma is used as decimal (e.g., 100,50)
      if (cleanStr.length - lastComma - 1 <= 2) {
          cleanStr = cleanStr.replace(',', '.');
      } else {
          cleanStr = cleanStr.replace(/,/g, '');
      }
  } else if (lastDot > -1) {
      const dotCount = (cleanStr.match(/\./g) || []).length;
      if (dotCount > 1) {
          cleanStr = cleanStr.replace(/\./g, '');
      }
  }
  
  let parsed = parseFloat(cleanStr);
  if (isNaN(parsed)) return 0;
  
  return isNegative ? -Math.abs(parsed) : parsed;
};

export const parseDate = (val: any, isMMDDYYYY: boolean = false): string | null => {
    if (!val) return null;
    const pad = (n: number) => String(n).padStart(2, '0');
    
    if (val instanceof Date) {
        if (isNaN(val.getTime())) return null;
        // xlsx library with cellDates: true creates UTC dates for Excel dates.
        // Using local time methods (getFullYear) in negative timezones shifts Jan 1st to Dec 31st.
        // We MUST use getUTC* methods to prevent this shift.
        const y = val.getUTCFullYear();
        if (y < 2000 || y > 2100) return null;
        return `${y}-${pad(val.getUTCMonth()+1)}-${pad(val.getUTCDate())}`;
    }
    
    if (typeof val === 'number') {
        if (val < 36526 || val > 73050) return null; // Excel serial date. 36526 is Jan 1, 2000. 73050 is Dec 31, 2100.
        const d = new Date(Math.round((val - 25569) * 86400 * 1000));
        if (isNaN(d.getTime())) return null;
        const y = d.getUTCFullYear();
        if (y < 2000 || y > 2100) return null;
        return `${y}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())}`;
    }
    
    let str = String(val).trim().replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
    
    const dateMatch = str.match(/(\d{1,4})[-\/.](\d{1,2})[-\/.](\d{1,4})/);
    if (dateMatch) {
        let p1 = parseInt(dateMatch[1], 10);
        let p2 = parseInt(dateMatch[2], 10);
        let p3 = parseInt(dateMatch[3], 10);
        let year, month, day;

        if (p1 >= 1000) { year = p1; month = p2; day = p3; }
        else if (p3 >= 1000) {
            year = p3;
            if (p2 > 12) { day = p2; month = p1; }
            else if (p1 > 12) { day = p1; month = p2; }
            else { 
                if (isMMDDYYYY) { day = p2; month = p1; }
                else { day = p1; month = p2; }
            } 
        } else if (p3 < 100) {
            year = 2000 + p3;
            if (p2 > 12) { day = p2; month = p1; }
            else if (p1 > 12) { day = p1; month = p2; }
            else { 
                if (isMMDDYYYY) { day = p2; month = p1; }
                else { day = p1; month = p2; }
            }
        }

        if (year && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
            if (year < 2000 || year > 2100) return null;
            return `${year}-${pad(month)}-${pad(day)}`;
        }
    }

    let d = new Date(str);
    if (!isNaN(d.getTime())) {
        if (str.includes('T') || str.includes('Z') || /^\d{4}-\d{2}-\d{2}$/.test(str)) {
            const y = d.getUTCFullYear();
            if (y < 2000 || y > 2100) return null;
            return `${y}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())}`; 
        } else {
            const y = d.getFullYear();
            if (y < 2000 || y > 2100) return null;
            return `${y}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; 
        }
    }
    return null; 
};

export const formatCurrency = (val: number): string => {
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
};

export const formatMonthName = (yyyyMm: string): string => {
  if (!yyyyMm || !yyyyMm.includes('-')) return yyyyMm;
  const [year, month] = yyyyMm.split('-');
  const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  const monthIndex = parseInt(month, 10) - 1;
  if (monthIndex >= 0 && monthIndex <= 11) {
    return `${monthNames[monthIndex]} ${year}`;
  }
  return yyyyMm;
};

export const getEndOfMonthDate = (monthStr: string, year: number = new Date().getFullYear()): string => {
    const monthMap: Record<string, number> = {
        'يناير': 1, 'jan': 1, 'january': 1, '1': 1, '01': 1,
        'فبراير': 2, 'feb': 2, 'february': 2, '2': 2, '02': 2,
        'مارس': 3, 'mar': 3, 'march': 3, '3': 3, '03': 3,
        'ابريل': 4, 'إبريل': 4, 'apr': 4, 'april': 4, '4': 4, '04': 4,
        'مايو': 5, 'may': 5, '5': 5, '05': 5,
        'يونيو': 6, 'jun': 6, 'june': 6, '6': 6, '06': 6,
        'يوليو': 7, 'jul': 7, 'july': 7, '7': 7, '07': 7,
        'اغسطس': 8, 'أغسطس': 8, 'aug': 8, 'august': 8, '8': 8, '08': 8,
        'سبتمبر': 9, 'sep': 9, 'september': 9, '9': 9, '09': 9,
        'اكتوبر': 10, 'أكتوبر': 10, 'oct': 10, 'october': 10, '10': 10,
        'نوفمبر': 11, 'nov': 11, 'november': 11, '11': 11,
        'ديسمبر': 12, 'dec': 12, 'december': 12, '12': 12
    };
    
    const monthNum = monthMap[monthStr.toLowerCase().trim()] || new Date().getMonth() + 1;
    const lastDay = new Date(year, monthNum, 0).getDate();
    return `${year}-${String(monthNum).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
};

export const isDateInRange = (dateStr: string | null, startStr: string, endStr: string, filterMonth: string, filterYear?: string, recordYear?: string): boolean => {
    if (!startStr && !endStr && !filterMonth && !filterYear) return true;
    
    // If only filtering by year, allow matching by Period_Year even if Invoice_Date is missing
    if (filterYear && !filterMonth && !startStr && !endStr) {
        if (recordYear && recordYear === String(filterYear)) {
            return true;
        }
    }

    if (!dateStr || dateStr === 'غير محدد') return false; 
    
    if (filterYear) {
        if (!dateStr.startsWith(filterYear)) return false;
    }

    if (filterMonth) {
        return dateStr.startsWith(filterMonth);
    } 
    
    if (startStr && dateStr < startStr) return false;
    if (endStr && dateStr > endStr) return false;
    
    return true;
};

export const CATEGORY_ORDER = [
  // 1. COGS (تكلفة المبيعات)
  'تكلفة المبيعات - مواد خام ومكونات',
  'تكلفة المبيعات - مواد تعبئة وتغليف',
  'تكلفة المبيعات - مستهلكات تشغيلية',
  'تكلفة المبيعات - شحن ونقل للداخل',
  
  // 2. Selling & Marketing (مصروفات بيعية وتسويقية)
  'مصروفات بيعية وتسويقية - دعاية وإعلان',
  'مصروفات بيعية وتسويقية - نقل وتوصيل',
  
  // 3. General & Administrative (مصروفات عمومية وإدارية)
  'مصروفات عمومية وإدارية - رواتب ومنافع موظفين - رواتب وأجور',
  'مصروفات عمومية وإدارية - رواتب ومنافع موظفين - تأمينات اجتماعية',
  'مصروفات عمومية وإدارية - رواتب ومنافع موظفين - تذاكر طيران',
  'مصروفات عمومية وإدارية - رواتب ومنافع موظفين - مستحقات نهاية الخدمة',
  'مصروفات عمومية وإدارية - رواتب ومنافع موظفين - تأمين طبي',
  'مصروفات عمومية وإدارية - رواتب ومنافع موظفين - زي ومهمات عاملين',
  'مصروفات عمومية وإدارية - رواتب ومنافع موظفين - تدريب وتطوير',
  'مصروفات عمومية وإدارية - إيجارات',
  'مصروفات عمومية وإدارية - مصاريف سفر وانتقالات',
  'مصروفات عمومية وإدارية - رعاية طبية',
  'مصروفات عمومية وإدارية - رسوم حكومية',
  'مصروفات عمومية وإدارية - رسوم بنكية ونقاط بيع',
  'مصروفات عمومية وإدارية - اشتراكات وبرمجيات',
  'مصروفات عمومية وإدارية - أتعاب مهنية واستشارات',
  'مصروفات عمومية وإدارية - أخرى',
  
  // 4. Fixed Assets (أصول ثابتة)
  'أصول ثابتة - أجهزة ومعدات',
  'أصول ثابتة - أثاث وتركيبات',
  'أصول ثابتة - أجهزة حاسب آلي',
  'أصول ثابتة - سيارات ووسائل نقل',
  
  // 5. Finance Costs (تكاليف تمويلية)
  'تكاليف تمويلية - فوائد وعمولات قروض',
  
  // 6. Other Expenses (مصروفات أخرى)
  'مصروفات أخرى - تبرعات ومساهمات مجتمعية',
  
  // 7. Uncategorized
  'غير مصنف (Uncategorized)'
];

export const orderCategories = (categories: string[]): string[] => {
  return [...categories].sort((a, b) => {
    const indexA = CATEGORY_ORDER.indexOf(a);
    const indexB = CATEGORY_ORDER.indexOf(b);
    
    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    return a.localeCompare(b, 'ar');
  });
};

// Pre-compiled regexes for performance
export interface HierarchyNode {
  name: string;
  fullName: string;
  totalSpend: number;
  totalTaxable: number;
  totalNonTaxable: number;
  totalVAT: number;
  invoiceCount: number;
  children: Record<string, HierarchyNode>;
  isLeaf: boolean;
  data?: any;
  invoices: any[];
}

export const buildHierarchy = (items: any[]): Record<string, HierarchyNode> => {
  const root: Record<string, HierarchyNode> = {};

  items.forEach(item => {
    const name = typeof item === 'string' ? item : (item.name || item[0]);
    const amount = typeof item === 'number' ? item : (item.totalSpend || item.amount || item[1] || 0);
    
    const parts = String(name).split(' - ');
    let currentLevel = root;
    let path = '';

    parts.forEach((part, index) => {
      path = path ? path + ' - ' + part : part;
      if (!currentLevel[part]) {
        currentLevel[part] = {
          name: part,
          fullName: path,
          totalSpend: 0,
          totalTaxable: 0,
          totalNonTaxable: 0,
          totalVAT: 0,
          invoiceCount: 0,
          children: {},
          isLeaf: false,
          invoices: []
        };
      }

      const node = currentLevel[part];
      node.totalSpend += amount;
      node.totalTaxable += (item.totalTaxable || 0);
      node.totalNonTaxable += (item.totalNonTaxable || 0);
      node.totalVAT += (item.totalVAT || 0);
      node.invoiceCount += (item.invoiceCount || 1);

      if (index === parts.length - 1) {
        node.isLeaf = true;
        node.data = item;
        node.invoices = item.invoices || [];
      }
      currentLevel = node.children;
    });
  });

  return root;
};

export function flattenHierarchyForExcel(nodes: Record<string, HierarchyNode>, level: number = 0): any[] {
  let result: any[] = [];
  
  // Sort nodes by name
  const sortedKeys = Object.keys(nodes).sort();
  
  sortedKeys.forEach(key => {
    const node = nodes[key];
    const indent = '    '.repeat(level);
    result.push({
      name: indent + node.name,
      count: node.invoiceCount,
      taxable: node.totalTaxable,
      nonTaxable: node.totalNonTaxable,
      net: node.totalTaxable + node.totalNonTaxable,
      vat: node.totalVAT,
      total: node.totalSpend,
      isHeader: Object.keys(node.children).length > 0
    });
    
    if (Object.keys(node.children).length > 0) {
      result = [...result, ...flattenHierarchyForExcel(node.children, level + 1)];
    }
  });
  
  return result;
}

export const detectSchema = (keys: string[], sampleData: any[], moduleType: string) => {
  const schema: Record<string, string | null> = {
    Entity_Name: null, Entity_TaxID: null, Invoice_Number: null, Invoice_Date: null,
    Net_Amount: null, Taxable_Amount: null, NonTaxable_Amount: null, 
    VAT_Amount: null, Total_Amount: null, Item_Description: null
  };

  const scores: Record<string, any> = {};
  keys.forEach(k => {
    scores[k] = { entity: 0, taxId: 0, invNum: 0, date: 0, total: 0, net: 0, vat: 0, taxable: 0, nonTaxable: 0, desc: 0 };
  });

  // 1. PHASE ONE: AGGRESSIVE KEYWORD SCORING
  keys.forEach((k, idx) => {
    const lower = String(k).toLowerCase().trim();
    
    // Entity Name (High Priority)
    if (/(الجهة|الشركة|المورد|الموظف|العميل|الاسم|اسم|vendor|supplier|customer|client|employee|name|entity|beneficiary|المستفيد|صرف ل|account name|اسم الحساب|الحساب|الموردين|العملاء|جهة التعامل|اسم المورد|اسم العميل|اسم الموظف|اسم ال|البيان|بيان)/i.test(lower)) {
        scores[k].entity += 2000;
        if (/^(الاسم|اسم|name|الموظف|المورد|العميل|employee|vendor|customer|الجهة|الجهة|اسم ال)$/i.test(lower)) scores[k].entity += 3000;
        
        // Penalize columns that are likely not the main entity (e.g., preparer, accountant, etc.)
        if (/(محاسب|مدقق|مراجع|معد|منشئ|توقيع|accountant|auditor|preparer|created by|prepared by|checked by|approved by|signature|توقيع|اعتماد|بواسطة|بواسطه|اسم المحاسب|اسم المدقق|اسم المراجع|اسم المعد|اسم المنشئ|اسم المعتمد|اسم الموقع)/i.test(lower)) {
            scores[k].entity -= 5000;
        }
        if (/(user|username|email|phone|mobile|tel|fax|address|location|city|country|zip|postal|website|url|link|social|media|facebook|twitter|instagram|linkedin|snapchat|tiktok|youtube|whatsapp|telegram|signal|skype|zoom|teams|meet|slack|discord)/i.test(lower)) {
            scores[k].entity -= 1000;
        }
    }

    // Tax ID (Very High Priority to distinguish from Invoice Number)
    if (/(رقم.*ضريب|ضريب.*رقم|تعريفي|tax id|vat id|vat no|tin|الرقم الضريبي|الرقم الضريبى|الرقم الموحد|رقم التسجيل|registration no|رقم ضريبة|الرقم الضريبي للمورد|الرقم الضريبي للعميل|رقم شهادة التس|الرقم الضريبى للمورد|الرقم الضريبى للعميل)/i.test(lower)) {
        scores[k].taxId += 15000;
        scores[k].invNum -= 10000; // Penalize as invoice number
    }
    
    // Invoice Number
    if (/(فاتورة|مستند|مرجع|قيد|سند|invoice|inv|ref|receipt|رقم الفاتورة|رقم الفاتوره|رقم السند|رقم القيد|رقم المرجع|الرقم|رقم القسيمة|رقم الحركة|رقم الفاتورة الضريبية|رقم الفاتورة المبسطة|رقم الاشعار|رقم الإشعار|رقم المستند|1be 'da'\*h1\)|1be|رقم الفاتوره الضريبيه|رقم الفاتوره المبسطه)/i.test(lower)) {
        scores[k].invNum += 5000;
        if (idx < 5) scores[k].invNum += 2000; // Boost if in first 5 columns
        if (/^(رقم|رقم الفاتورة|رقم الفاتوره|inv|invoice|number|ref|reference|الرقم|رقم المستند|1be 'da'\*h1\))$/i.test(lower)) scores[k].invNum += 5000;
        if (/(قيد|مرجع|سند|ref|reference|journal|entry)/i.test(lower)) scores[k].invNum -= 3000; // Penalize secondary identifiers
    }
    
    // Date
    if (/(تاريخ|وقت|date|time|التاريخ|التوقيت|شهر|month|يوم|day|فترة|period|تاريخ الفاتورة|تاريخ الفاتوره|تاريخ الاستحقاق|تاريخ السند|تاريخ القيد|تاريخ الحركة|'d\*'1j\.|تاريخ الفاتوره الضريبيه|تاريخ الفاتوره المبسطه)/i.test(lower)) {
        scores[k].date += 10000;
    }

    // Amounts
    if (/(ضريب|tax|vat|tva|15%|5%|الضريبة|قيمة الضريبة|قيمه الضريبه|مبلغ الضريبة|مبلغ الضريبه|ضريبة القيمة المضافة|ضريبة القيمه المضافه|قيمة الضر|مبلغ الضر|قيمه الضريبه المضافه|مبلغ الضريبه المضافه)/i.test(lower)) scores[k].vat += 8000;
    
    if (/(اجمالي|إجمالي|مجموع|total|gross|النهائي|الكلي|grand total|المستحق|المبلغ|amount|قيمة|قيمه|value|المبلغ الكلي|المبلغ الكلى|شامل الضريبة|شامل الضريبه|جملة|الجملة|صافي المستحق|صافى المستحق|المبلغ الإجمالي|المبلغ الاجمالي|اجمالي ا|إجمالي ا|المبلغ الاجمالى|المبلغ الإجمالى)/i.test(lower)) {
        if (/(قبل|بدون|صافي|صافى|net|before|without|خاضع|taxable|قب)/i.test(lower)) {
            scores[k].total -= 10000; // Penalize heavily if it says "before tax" or "net"
        } else {
            scores[k].total += 5000;
            if (/(شامل|total|gross|إجمالي|اجمالي|النهائي|النهائى|اجمالي ا|إجمالي ا)/i.test(lower)) scores[k].total += 3000;
        }
    }
    
    // Penalize identifiers for amount columns heavily
    if (/(رقم|id|no|code|تاريخ|date|time|وقت|iban|حساب|سجل|هوية|هويه|refer|مرجع|قيد|سند)/i.test(lower)) {
        scores[k].total -= 20000;
        scores[k].net -= 20000;
        scores[k].taxable -= 20000;
        scores[k].nonTaxable -= 20000;
        scores[k].vat -= 20000;
    }

    // Payroll specific
    if (moduleType === 'payroll') {
        if (/(صافي|صافى|net|المستحق|النهائي)/i.test(lower)) scores[k].total += 10000;
        if (/(أساسي|اساسي|basic)/i.test(lower)) scores[k].taxable += 10000;
        if (/(بدل|allowance|إضافي|اضافي|مكافأة)/i.test(lower)) scores[k].nonTaxable += 10000;
        if (/(خصم|استقطاع|تأمينات|gosi|deduction|سلفة|غياب)/i.test(lower)) scores[k].vat += 10000; // Map deductions to VAT temporarily or handle differently
    }

    // Banks specific
    if (moduleType === 'banks') {
        if (/(سحب|مدين|debit|withdrawal|out)/i.test(lower)) scores[k].taxable += 10000; // Withdrawals
        if (/(إيداع|ايداع|دائن|credit|deposit|in)/i.test(lower)) scores[k].nonTaxable += 10000; // Deposits
        if (/(رصيد|balance)/i.test(lower)) scores[k].total += 10000; // Balance
    }

    // Handle bank statements / ledgers where amounts are in debit/credit columns
    if (/(دائن|مدين|credit|debit|مبلغ الدائن|مبلغ المدين|حركة|الحركة|transaction)/i.test(lower)) {
        scores[k].total += 2000;
        scores[k].net += 2000;
    }

    const isNonTaxable = /(غير خاضع|معفى|صفرية|non-taxable|exempt|معفاة|غير خاضعة|بدون ضريبة|اعفاء|إعفاء|ضريبة صفرية|0%|خارج النطاق|غير ضريبية|المبلغ غير الخاضع|المبلغ المعفي|المبلغ المعفى|المبلغ غير الخاضع للضريبة|الغير خاضع|الغير خاضعة|المبالغ الغير خاضعة|المبالغ غير الخاضعة|بدون ض|غير خا|معف)/i.test(lower);
    
    if (isNonTaxable) {
        scores[k].nonTaxable += 15000; // Higher weight to distinguish from taxable
        scores[k].taxable -= 10000; // CRITICAL: Prevent overlap with taxable keywords
        scores[k].vat -= 10000; // CRITICAL: Prevent VAT from stealing this column due to the word "ضريبة"
    } else {
        if (/(خاضع|taxable|أساس|اساس|الأساس الخاضع|الاساس الخاضع|المبلغ الخاضع|المبلغ الخاضع للضريبة|المبلغ الخاضع للضريبه|المبلغ الخا|الاساس ال|الأساس ال)/i.test(lower)) {
            scores[k].taxable += 10000;
        }
        if (/(صافي|صافى|net|subtotal|قبل الضريبة|قبل الضريبه|المبلغ قبل الضريبة|المبلغ قبل الضريبه|الصافي|الصافى|الاجمالي قب|الإجمالي قب|قبل ال)/i.test(lower)) {
            scores[k].net += 10000;
        }
    }
    
    // Description
    if (/(بيان|البيان|تفاصيل|وصف|صنف|مادة|نوع|ملاحظات|شرح|اسم الصنف|description|item|طلب|order|details|particulars|الخدمة|الخدمه|الب)/i.test(lower)) scores[k].desc += 2000;
  });

  // 2. PHASE TWO: DATA PATTERN VALIDATION
  keys.forEach(k => {
    let taxIdPatternCount = 0;
    let datePatternCount = 0;
    let invNumPatternCount = 0;
    let numCount = 0;
    let validRows = 0;

    sampleData.slice(0, 50).forEach(row => {
      const val = row[k];
      if (val === null || val === undefined || val === '') return;
      validRows++;
      const strVal = String(val).trim();
      
      // 15 digits is almost certainly a Tax ID
      if (/^\d{15}$/.test(strVal)) taxIdPatternCount++;
      
      // 10 digits is often a KSA CR number or National ID
      let isLongInteger = false;
      if (/^\d{8,15}$/.test(strVal)) {
          isLongInteger = true;
      }

      // Date patterns
      if (val instanceof Date || /^\d{4}[\/\-]\d{2}[\/\-]\d{2}/.test(strVal) || /^\d{2}[\/\-]\d{2}[\/\-]\d{4}/.test(strVal)) datePatternCount++;
      
      // Invoice Number patterns: 
      // - Short numeric (1-10 digits)
      // - Alphanumeric with hyphens/slashes (e.g., INV-2024-001)
      // - Not a 15-digit Tax ID
      if (/^[A-Z0-9\/\-]{1,15}$/i.test(strVal) && !/^\d{15}$/.test(strVal) && !/^\d{4}[\/\-]\d{2}[\/\-]\d{2}/.test(strVal)) {
          invNumPatternCount++;
      }

      // Numeric check for amounts
      const num = parseNumber(val);
      if (!isNaN(num) && num !== 0 && !isLongInteger) {
          // If it's a large number or has decimals, it's more likely an amount than an invoice number
          if (Math.abs(num) > 1000000 || String(val).includes('.') || String(val).includes(',')) {
              numCount++;
          }
      }
    });

    if (validRows > 0) {
      if (taxIdPatternCount / validRows > 0.5) {
          scores[k].taxId += 20000;
          scores[k].invNum -= 15000;
          scores[k].total -= 20000;
          scores[k].net -= 20000;
          scores[k].vat -= 20000;
          scores[k].taxable -= 20000;
          scores[k].nonTaxable -= 20000;
      } else if (invNumPatternCount / validRows > 0.5) {
          scores[k].invNum += 10000;
          scores[k].total -= 10000;
          scores[k].net -= 10000;
          scores[k].vat -= 10000;
          scores[k].taxable -= 10000;
          scores[k].nonTaxable -= 10000;
      }
      
      if (datePatternCount / validRows > 0.5) scores[k].date += 20000;
      
      // Differentiate between integers (likely IDs/Invoice numbers) and floats (likely amounts)
      let floatCount = 0;
      let integerCount = 0;
      sampleData.forEach(row => {
          const val = String(row[k] || '').trim();
          if (val && !isNaN(Number(val))) {
              if (val.includes('.') && val.split('.')[1].length > 0) {
                  floatCount++;
              } else {
                  integerCount++;
              }
          }
      });

      if (numCount / validRows > 0.5) {
          // If it's mostly floats, it's very likely an amount column
          if (floatCount >= integerCount) {
              scores[k].total += 1000;
              scores[k].vat += 1000;
              scores[k].taxable += 1000;
              scores[k].nonTaxable += 1000;
              scores[k].net += 1000;
              scores[k].invNum -= 2000; // Penalize invoice number
          } else {
              // Mostly integers. Could be amounts, but very likely an ID. Don't blindly boost amount scores.
              // Just penalize Tax Id if it's not a 15 digit number
              if (taxIdPatternCount / validRows < 0.5) {
                  scores[k].taxId -= 2000;
              }
          }
      }
    }
  });

  // 3. PHASE THREE: ARITHMETIC RECONCILIATION SCORING
  // If we have multiple numeric columns, check if they satisfy Taxable + NonTaxable + VAT = Total
  const numericKeys = keys.filter(k => {
      let numCount = 0;
      sampleData.slice(0, 20).forEach(row => {
          const n = parseNumber(row[k]);
          if (!isNaN(n) && n !== 0) numCount++;
      });
      return numCount > 5;
  });

  if (numericKeys.length >= 2) {
      sampleData.slice(0, 20).forEach(row => {
          numericKeys.forEach(kTotal => {
              const totalVal = parseNumber(row[kTotal]);
              if (totalVal <= 0) return;

              numericKeys.forEach(kVat => {
                  if (kVat === kTotal) return;
                  const vatVal = parseNumber(row[kVat]);
                  
                  numericKeys.forEach(kTaxable => {
                      if (kTaxable === kTotal || kTaxable === kVat) return;
                      const taxableVal = parseNumber(row[kTaxable]);
                      
                      const is15PercentVat = taxableVal > 0 && Math.abs(taxableVal * 0.15 - vatVal) < 0.05;

                      // Check: Total = Taxable + VAT
                      if (Math.abs(totalVal - (taxableVal + vatVal)) < 0.05) {
                          if (vatVal > 0) {
                              scores[kTotal].total += 2000;
                              scores[kVat].vat += 2000;
                              
                              // Boost if VAT is exactly 15% of Taxable (Strong signal)
                              if (is15PercentVat) {
                                  scores[kVat].vat += 5000;
                                  scores[kTaxable].taxable += 5000;
                                  scores[kTotal].total += 2000;
                              } else {
                                  scores[kTaxable].taxable += 1000;
                              }
                          }
                      }

                      numericKeys.forEach(kNonTaxable => {
                          if (kNonTaxable === kTotal || kNonTaxable === kVat || kNonTaxable === kTaxable) return;
                          const nonTaxableVal = parseNumber(row[kNonTaxable]);

                          // Check: Total = Taxable + NonTaxable + VAT
                          if (Math.abs(totalVal - (taxableVal + nonTaxableVal + vatVal)) < 0.05) {
                              if (vatVal > 0 && is15PercentVat) {
                                  scores[kTotal].total += 3000;
                                  scores[kVat].vat += 5000;
                                  scores[kTaxable].taxable += 5000;
                                  scores[kNonTaxable].nonTaxable += 4000;
                              } else if (vatVal === 0 && taxableVal === 0 && nonTaxableVal > 0) {
                                  // Total = 0 + NonTaxable + 0
                                  scores[kTotal].total += 1000;
                                  scores[kNonTaxable].nonTaxable += 2000;
                              }
                          }
                      });
                  });
              });
          });
      });
  }

  // 4. PHASE FOUR: SMART ASSIGNMENT
  const assignBest = (schemaKey: string, scoreKey: string, threshold: number) => {
    let bestKey = null;
    let maxScore = threshold;
    keys.forEach(k => {
      if (scores[k][scoreKey] > maxScore) { maxScore = scores[k][scoreKey]; bestKey = k; }
    });
    if (bestKey) {
      schema[schemaKey] = bestKey;
      scores[bestKey] = { entity: -20000, taxId: -20000, invNum: -20000, date: -20000, total: -20000, net: -20000, vat: -20000, taxable: -20000, nonTaxable: -20000, desc: -20000 };
    }
  };

  // Order of assignment matters - Prioritize identifiers first
  assignBest('Invoice_Number', 'invNum', 3000); // Require stronger match for invoice number to prevent false positives
  assignBest('Invoice_Date', 'date', 1000);
  assignBest('Entity_TaxID', 'taxId', 1000);
  
  // Then amounts
  assignBest('Total_Amount', 'total', 1000);
  assignBest('VAT_Amount', 'vat', 1000);
  assignBest('NonTaxable_Amount', 'nonTaxable', 1000);
  assignBest('Taxable_Amount', 'taxable', 1000);
  assignBest('Net_Amount', 'net', 1000);
  
  // Then metadata
  assignBest('Entity_Name', 'entity', 1000);
  assignBest('Item_Description', 'desc', 1000);

  return schema;
};
