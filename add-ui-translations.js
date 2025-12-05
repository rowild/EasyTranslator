const fs = require('fs');

const uiTranslations = {
  bg: "Моля, разрешете достъп до микрофона, когато бъдете подканени.",
  hr: "Molimo dopustite pristup mikrofonu kada se zatraži.",
  cs: "Povolte přístup k mikrofonu, když se zobrazí výzva.",
  da: "Tillad venligst mikrofon adgang, når du bliver bedt om det.",
  nl: "Sta microfoontoegang toe wanneer hierom wordt gevraagd.",
  et: "Lubage mikrofoni juurdepääs, kui seda küsitakse.",
  fi: "Salli mikrofonin käyttö kehotteen mukaisesti.",
  fr: "Veuillez autoriser l'accès au microphone lorsque vous y êtes invité.",
  de: "Bitte erlauben Sie den Mikrofonzugriff, wenn Sie dazu aufgefordert werden.",
  el: "Παρακαλούμε επιτρέψτε την πρόσβαση στο μικρόφωνο όταν ζητηθεί.",
  hu: "Kérjük, engedélyezze a mikrofon hozzáférést, amikor a rendszer kéri.",
  ga: "Ceadaigh rochtain ar an micreafón nuair a iarrtar é, le do thoil.",
  it: "Consenti l'accesso al microfono quando richiesto.",
  lv: "Lūdzu, atļaujiet mikrofona piekļuvi, kad tas tiek pieprasīts.",
  lt: "Prašome leisti prieigą prie mikrofono, kai būsite paprašyti.",
  mt: "Jekk jogħġbok, awtorizza l-aċċess għall-mikrofonu meta jintalab.",
  pl: "Zezwól na dostęp do mikrofonu, gdy zostaniesz o to poproszony.",
  pt: "Permita o acesso ao microfone quando solicitado.",
  ro: "Vă rugăm să permiteți accesul la microfon când vi se solicită.",
  sk: "Keď sa zobrazí výzva, povolte prístup k mikrofónu.",
  sl: "Dovolite dostop do mikrofona, ko se zahteva.",
  es: "Permite el acceso al micrófono cuando se te solicite.",
  sv: "Tillåt mikrofonåtkomst när du uppmanas.",
  is: "Leyfðu aðgang að hljóðnema þegar beðið er um það.",
  no: "Vennligst tillat mikrofonaksess når du blir bedt om det.",
  lb: "Erlaabt w.e.g. de Mikrofoaccès, wann Dir gefrot gitt.",
  sq: "Ju lutemi, lejoni qasjen në mikrofon kur kërkohet.",
  sr: "Дозволите приступ микрофону када се то затражи.",
  mk: "Дозволете пристап до микрофонот кога ќе биде побарано.",
  bs: "Molimo dozvolite pristup mikrofonu kada se zatraži.",
  uk: "Будь ласка, дозвольте доступ до мікрофона, коли вас попросять.",
  ru: "Пожалуйста, разрешите доступ к микрофону при запросе.",
  tr: "İstendiğinde lütfen mikrofon erişimine izin verin.",
  zh: "提示时请允许麦克风访问。",
  ja: "プロンプトが表示されたら、マイクへのアクセスを許可してください。",
  ko: "메시지가 표시되면 마이크 액세스를 허용하세요.",
  ar: "يُرجى السماح بالوصول إلى الميكروفون عند المطالبة.",
  he: "אנא אפשר גישה למיקרופון כשמתבקש."
};

// Read the JSON file
const data = JSON.parse(fs.readFileSync('./public/app-info.json', 'utf8'));

// Add UI translations to each language
Object.keys(uiTranslations).forEach(lang => {
  if (data[lang]) {
    data[lang].ui = { allowMic: uiTranslations[lang] };
  }
});

// Write back
fs.writeFileSync('./public/app-info.json', JSON.stringify(data, null, 2));
console.log('UI translations added successfully!');
