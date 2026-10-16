import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';

export type Lang = 'en' | 'si';
const D: Record<string, [string, string]> = {
  home: ['Home', 'මුල් පිටුව'], story: ['Our story', 'අපේ කතාව'], tree: ['Family tree', 'පවුල් ගස'], events: ['Events', 'උත්සව'],
  causes: ['Causes', 'සමාජ සේවා'], memorial: ['In memory', 'සිහිවටන'], news: ['News', 'පුවත්'], gallery: ['Gallery', 'ඡායාරූප'],
  opportunities: ['Opportunities', 'අවස්ථා'], ask: ['Ask the archive', 'ලේඛනාගාරයෙන් අසන්න'], join: ['Join the family', 'පවුලට එක්වන්න'],
  signin: ['Sign in', 'ඇතුළු වන්න'], signout: ['Sign out', 'පිටවන්න'], me: ['My family', 'මගේ පවුල'], admin: ['Admin', 'පරිපාලනය'],
  more: ['More', 'තවත්'], menu: ['Menu', 'මෙනුව'], close: ['Close', 'වසන්න'], back: ['Back', 'ආපසු'], save: ['Save', 'සුරකින්න'],
  cancel: ['Cancel', 'අවලංගු කරන්න'], loading: ['Loading…', 'පූරණය වෙමින්…'], search: ['Search', 'සොයන්න'], viewAll: ['View all', 'සියල්ල බලන්න'],
  org: ['Pilimathalawa Iddawela Foundation', 'පිළිමතලාවේ ඉද්දවෙල පදනම'],
  heroKicker: ['Pilimathalawa · since 1887', 'පිළිමතලාව · 1887 සිට'],
  heroTitle: ['One family.\nThirteen branches.\nSix generations.', 'එක් පවුලක්.\nශාඛා දහතුනක්.\nපරම්පරා හයක්.'],
  heroBody: ['The descendants of Ukkubanda Iddawela and Lokumenike of the Iddawela Mahagedara, keeping each other close, lifting each other up, and keeping the story alive.',
             'ඉද්දවෙල මහගෙදර උක්කුබණ්ඩා ඉද්දවෙල සහ ලොකුමැණිකේගේ පරම්පරාව: එකිනෙකා ළඟින් තබාගනිමින්, එකිනෙකාට උදව් කරමින්, කතාව ජීවමානව තබාගනිමින්.'],
  exploreTree: ['Explore the tree', 'පවුල් ගස බලන්න'], findYourself: ['Find yourself', 'ඔබව සොයාගන්න'],
  statPeople: ['relatives on the tree', 'පවුල් ගසේ ඥාතීන්'], statGenerations: ['generations', 'පරම්පරා'], statReunions: ['annual reunions', 'වාර්ෂික හමුවීම්'],
  statSince: ['the Korale’s appointment', 'කෝරාළ පත්වීම'], statPhotos: ['photographs preserved', 'සුරැකි ඡායාරූප'], statBranches: ['branches', 'ශාඛා'],
  thirteen: ['The 13 Iddawelas', 'ඉද්දවෙල දහතුන් දෙනා'],
  thirteenBody: ['Ukkubanda and Lokumenike raised nine sons and four daughters at the Mahagedara, opposite Gadaladeniya junction. Every one of us descends from one of them.',
                 'උක්කුබණ්ඩා සහ ලොකුමැණිකේ ගඩලාදෙණිය හන්දියට ඉදිරියෙන් මහගෙදර පුතුන් නව දෙනෙකු සහ දියණියන් සිව්දෙනෙකු හැදූහ. අප සැවොම ඔවුන්ගෙන් කෙනෙකුගෙන් පැවත එන්නෝ වෙමු.'],
  branch: ['Branch', 'ශාඛාව'], generation: ['Generation', 'පරම්පරාව'], upcoming: ['Upcoming', 'ඉදිරියට'], past: ['Past', 'පසුගිය'],
  rsvp: ['RSVP', 'පැමිණීම තහවුරු කරන්න'], sponsor: ['Sponsor', 'අනුග්‍රාහකයා'], attendance: ['Attendance', 'පැමිණීම'], venue: ['Venue', 'ස්ථානය'],
  onThisDay: ['This year we remember', 'මේ වසරේ අපි සිහිකරමු'], born: ['born', 'උපත'], passed: ['passed away', 'අභාවය'],
  yearsAgo: ['years ago', 'වසරකට පෙර'], yearsSince: ['years since', 'වසර'], parents: ['Parents', 'දෙමාපියන්'], children: ['Children', 'දරුවන්'],
  siblings: ['Siblings', 'සහෝදර සහෝදරියන්'], spouse: ['Married to', 'විවාහය'], education: ['Education', 'අධ්‍යාපනය'], career: ['Career', 'වෘත්තීය'],
  lineage: ['Lineage', 'පරම්පරාව'], photos: ['Photos', 'ඡායාරූප'], biography: ['Story', 'ජීවන කතාව'], edit: ['Edit', 'සංස්කරණය'],
  membersOnly: ['Visible to signed-in family members', 'පවුලේ සාමාජිකයින්ට පමණක් පෙනේ'],
  machine: ['Machine translation, awaiting a family review', 'යන්ත්‍ර පරිවර්තනයකි, පවුලේ සමාලෝචනයක් බලාපොරොත්තුවෙන්'],
  howRelated: ['How are we related?', 'අප අතර ඥාතිත්වය කුමක්ද?'], pickPerson: ['Pick a second person', 'දෙවන පුද්ගලයා තෝරන්න'],
  you: ['You', 'ඔබ'], footerNote: ['Iddawela, Pilimathalawa, Sri Lanka', 'ඉද්දවෙල, පිළිමතලාව, ශ්‍රී ලංකාව'],
  joinTitle: ['Keep your branch alive', 'ඔබේ ශාඛාව ජීවමානව තබාගන්න'],
  joinBody: ['Create an account, claim your place on the tree, add your children, marriages, studies and work. A family admin approves every change, so the record stays true.',
             'ගිණුමක් සාදා, පවුල් ගසේ ඔබේ ස්ථානය තහවුරු කර, දරුවන්, විවාහ, අධ්‍යාපනය සහ රැකියා එක් කරන්න. සෑම වෙනසක්ම පවුලේ පරිපාලකයෙකු අනුමත කරයි.'],
  storyKicker: ['Our story', 'අපේ කතාව'],
  storyTitle: ['From the Korale of 1887 to a family of hundreds', '1887 කෝරාළගේ සිට සිය ගණනක පවුලක් දක්වා'],
  storyBody: ['On 14 October 1887 Mudalihami Iddawela was appointed Korale and Police Headman of Yatinuwara Medapalatha. His youngest son Ukkubanda settled in the Mahagedara overlooking the paddy fields of Pilimathalawa, and with Lokumenike Weerakoon of Bulumulla Walawwa raised thirteen children.',
              '1887 ඔක්තෝබර් 14 වන දින මුදලිහාමි ඉද්දවෙල යටිනුවර මැදපලාතේ කෝරාළ සහ පොලිස් මුලාදෑනි ලෙස පත් කරන ලදී. ඔහුගේ බාල පුත් උක්කුබණ්ඩා පිළිමතලාවේ කුඹුරු යාය දෙස බලා සිටින මහගෙදර පදිංචි වී, බුලුමුල්ලේ වලව්වේ ලොකුමැණිකේ වීරකෝන් සමඟ දරුවන් දහතුන් දෙනෙකු හැදූහ.'],
  readStory: ['Read the story', 'කතාව කියවන්න'], latest: ['Latest', 'නවතම'], noItems: ['Nothing here yet.', 'තවම කිසිවක් නැත.'],
  askPlaceholder: ['Who was the Korale of 1887?', '1887 කෝරාළ කවුද?'], askTitle: ['Ask the family archive', 'පවුලේ ලේඛනාගාරයෙන් අසන්න'],
  askBody: ['Questions about people, places and reunions, answered from the foundation’s own records.', 'පුද්ගලයින්, ස්ථාන සහ හමුවීම් ගැන ප්‍රශ්න, පදනමේ වාර්තා වලින් පිළිතුරු.'],
  sources: ['Sources', 'මූලාශ්‍ර'], helpOut: ['How to help', 'උදව් කරන්නේ කෙසේද'], updates: ['Updates', 'යාවත්කාලීන'],
  lightLamp: ['Light a lamp', 'පහනක් දල්වන්න'], condolences: ['Condolences', 'සංවේගය'], lamps: ['lamps lit', 'දැල්වූ පහන්'],
  writeCondolence: ['Write a few words', 'වචන කිහිපයක් ලියන්න'], yourName: ['Your name', 'ඔබේ නම'], send: ['Send', 'යවන්න'],
  email: ['Email', 'විද්‍යුත් තැපෑල'], phone: ['Phone', 'දුරකථනය'], password: ['Password', 'මුරපදය'], emailOrPhone: ['Email or phone', 'විද්‍යුත් තැපෑල හෝ දුරකථනය'],
  forgot: ['Forgot password?', 'මුරපදය අමතකද?'], createAccount: ['Create account', 'ගිණුම සාදන්න'], fullName: ['Full name', 'සම්පූර්ණ නම'],
  relationNote: ['How are you related? (e.g. grandson of Wije Iddawela)', 'ඔබ සම්බන්ධ වන්නේ කෙසේද? (උදා: විජේ ඉද්දවෙලගේ මුනුපුරා)'],
  thisIsMe: ['I am on the tree: this is me', 'මම පවුල් ගසේ සිටිමි: මේ මමයි'], pending: ['Waiting for approval', 'අනුමැතිය බලාපොරොත්තුවෙන්'],
  members: ['family members', 'පවුලේ සාමාජිකයින්'], directory: ['Skills directory', 'කුසලතා නාමාවලිය'], postOpp: ['Share an opportunity', 'අවස්ථාවක් බෙදාගන්න'],
  addRelative: ['Add a relative', 'ඥාතියෙකු එක් කරන්න'], myProfile: ['My profile', 'මගේ පැතිකඩ'], myChanges: ['My submissions', 'මගේ ඉදිරිපත් කිරීම්'],
  remembering: ['Remembering', 'සිහිපත් කරමු'], play: ['Play', 'ක්‍රීඩා කරන්න'], all: ['All', 'සියල්ල'],
};
type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (k: string) => string };
const LangCtx = createContext<Ctx>({ lang: 'en', setLang: () => {}, t: (k) => k });

function initialLang(): Lang {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return 'en';
  const q = new URLSearchParams(window.location.search).get('lang');
  if (q === 'si' || q === 'en') return q;
  const s = localStorage.getItem('idw_lang');
  if (s === 'si' || s === 'en') return s;
  return (navigator.language || '').startsWith('si') ? 'si' : 'en';
}

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);
  const setLang = (l: Lang) => {
    setLangState(l);
    if (Platform.OS === 'web') {
      localStorage.setItem('idw_lang', l);
      document.documentElement.lang = l;
      const u = new URL(window.location.href);
      if (l === 'si') u.searchParams.set('lang', 'si'); else u.searchParams.delete('lang');
      window.history.replaceState(window.history.state, '', u.toString());
    }
  };
  useEffect(() => { if (Platform.OS === 'web') document.documentElement.lang = lang; }, [lang]);
  const value = useMemo(() => ({ lang, setLang, t: (k: string) => (D[k] ? D[k][lang === 'si' ? 1 : 0] : k) }), [lang]);
  return <LangCtx.Provider value={value}>{children}</LangCtx.Provider>;
}
export const useLang = () => useContext(LangCtx);

/** pick the Sinhala field when the reader chose Sinhala and it exists */
export function L(obj: any, field: string, lang: Lang): string {
  if (!obj) return '';
  if (lang === 'si') return obj[`${field}_si`] || obj[`${field}_en`] || '';
  return obj[`${field}_en`] || '';
}
export function nm(p: any, lang: Lang): string {
  if (!p) return '';
  return (lang === 'si' && p.name_si) || p.name_en || '';
}
export function years(p: any): string {
  if (!p) return '';
  if (!p.birth_year && !p.death_year) return '';
  return `${p.birth_year || ''}${p.death_year ? '–' + p.death_year : p.deceased ? '–' : ''}`;
}
