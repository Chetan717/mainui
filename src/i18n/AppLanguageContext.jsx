import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const STORAGE_KEY = "mlmlive.appLanguage";

export const APP_LANGUAGES = [
  { code: "en", label: "English", nativeLabel: "English" },
  { code: "hi", label: "Hindi", nativeLabel: "हिंदी" },
  { code: "mr", label: "Marathi", nativeLabel: "मराठी" },
  { code: "gu", label: "Gujarati", nativeLabel: "ગુજરાતી" },
];

const STRINGS = {
  en: {},
  hi: {
    "My Profile": "मेरी प्रोफ़ाइल",
    "Edit": "बदलें",
    "Edit Profile": "प्रोफ़ाइल बदलें",
    "Edit Name": "नाम बदलें",
    "Achievements pack is active": "अचीवमेंट्स पैक सक्रिय है",
    "Free credits per referral": "हर रेफरल पर मुफ्त क्रेडिट",
    "Share MLM LIVE with your team": "अपनी टीम के साथ MLM LIVE साझा करें",
    "Banner details": "बैनर विवरण",
    "Banner settings": "बैनर सेटिंग्स",
    "Language": "भाषा",
    "Dark mode": "डार्क मोड",
    "Settings & support": "सेटिंग्स और सहायता",
    "Settings & Support": "सेटिंग्स और सहायता",
    "SETTINGS & SUPPORT": "सेटिंग्स और सहायता",
    "Security": "सुरक्षा",
    "About": "जानकारी",
    "Account": "अकाउंट",
    "Learn how to use the app": "ऐप का उपयोग करना सीखें",
    "Customer care": "ग्राहक सहायता",
    "Chat with an expert": "विशेषज्ञ से चैट करें",
    "Change PIN": "PIN बदलें",
    "Feedback & review": "फीडबैक और समीक्षा",
    "Privacy policy": "गोपनीयता नीति",
    "Terms & conditions": "नियम और शर्तें",
    "Delete my account": "मेरा अकाउंट हटाएं",
    "Log out securely": "सुरक्षित रूप से लॉग आउट करें",
    "Made in India": "भारत में निर्मित",
    "Refer & earn": "रेफर करें और कमाएं",
    "Free credits per referral!": "हर रेफरल पर मुफ्त क्रेडिट!",
    "YOUR REFERRAL CODE": "आपका रेफरल कोड",
    "Copy": "कॉपी",
    "Copied": "कॉपी हो गया",
    "Share on WhatsApp": "WhatsApp पर साझा करें",
    "More": "और",
    "HOW IT WORKS": "यह कैसे काम करता है",
    "Share your code with your team": "अपना कोड अपनी टीम के साथ साझा करें",
    "They start using MLM LIVE": "वे MLM LIVE का उपयोग शुरू करते हैं",
    "Spend credits on premium packs": "प्रीमियम पैक पर क्रेडिट खर्च करें",
    "Credits are shown at checkout": "क्रेडिट चेकआउट पर दिखते हैं",
    "The whole app changes language, including template labels.": "पूरे ऐप की भाषा बदलती है, टेम्पलेट लेबल सहित।",
    "Save language": "भाषा सेव करें",
    "Enter your current PIN": "अपना मौजूदा PIN दर्ज करें",
    "Enter your new PIN": "अपना नया PIN दर्ज करें",
    "Re-enter your new PIN": "अपना नया PIN फिर से दर्ज करें",
    "Forgot your PIN?": "PIN भूल गए?",
    "This cannot be undone": "इसे वापस नहीं किया जा सकता",
    "WHY ARE YOU LEAVING?": "आप क्यों जा रहे हैं?",
    "I do not use it any more": "अब मैं इसका उपयोग नहीं करता/करती",
    "Too expensive": "बहुत महंगा",
    "I could not find the designs I need": "मुझे ज़रूरी डिज़ाइन नहीं मिले",
    "Something else": "कुछ और",
    "Let us try to fix it first": "पहले हमें इसे ठीक करने दें",
    "Keep my account": "मेरा अकाउंट रखें",
    "How is MLM LIVE working for you?": "MLM LIVE आपके लिए कैसा काम कर रहा है?",
    "Your answer goes straight to the team, not to the Play Store.": "आपका जवाब सीधे हमारी टीम तक जाता है, Play Store पर नहीं।",
    "WHAT STOOD OUT?": "क्या सबसे अच्छा लगा?",
    "The designs": "डिज़ाइन",
    "Easy to use": "उपयोग में आसान",
    "Speed": "स्पीड",
    "Support": "सहायता",
    "Variety": "विविधता",
    "Anything we should fix or add? (optional)": "हमें क्या सुधारना या जोड़ना चाहिए? (वैकल्पिक)",
    "Send feedback": "फीडबैक भेजें",
    "Call us": "हमें कॉल करें",
    "WhatsApp us": "WhatsApp करें",
    "Email us": "ईमेल करें",
    "COMMON QUESTIONS": "सामान्य प्रश्न",
    "Home": "होम",
    "Plans": "प्लान",
    "Ask AI": "AI से पूछें",
    "Profile": "प्रोफ़ाइल",
    "My Profile": "मेरी प्रोफ़ाइल",
    "Search templates": "टेम्पलेट खोजें",
    "Categories": "श्रेणियां",
    "See all": "सभी देखें",
    "Festival Calendar": "त्योहार कैलेंडर",
    "Achievements": "उपलब्धियां",
    "Income": "आय",
    "Everyday Moments": "रोज़मर्रा के पल",
    "All categories": "सभी श्रेणियां",
    "More in this style": "इसी शैली में और",
    "Image": "इमेज",
    "Video": "वीडियो",
    "Download": "डाउनलोड",
    "Add music": "म्यूज़िक जोड़ें",
    "Apply music": "म्यूज़िक लागू करें",
    "View your pack and plan details": "अपने पैक और प्लान का विवरण देखें",
    "View available packs": "उपलब्ध पैक देखें",
    "people joined using your code": "लोग आपके कोड से जुड़े",
    "My photo is not showing on the banner": "मेरी फोटो बैनर पर नहीं दिख रही है",
    "I paid but the pack is still locked": "मैंने भुगतान किया लेकिन पैक अभी भी लॉक है",
    "How do I change my mobile number?": "मैं अपना मोबाइल नंबर कैसे बदलूं?",
    "The download is blurry": "डाउनलोड धुंधला है",
    "pack is active": "पैक सक्रिय है",
    "Until": "तक",
    "Step": "चरण",
    "of": "में से",
    "We ask for this so nobody else can change it.": "हम यह इसलिए पूछते हैं ताकि कोई और इसे बदल न सके।",
    "Your banner details and photo are removed": "आपके बैनर विवरण और फोटो हटा दिए जाएंगे",
    "Packs you paid for stop working and are not refunded": "खरीदे गए पैक काम करना बंद कर देंगे और रिफंड नहीं होंगे",
    "Referral credits are lost": "रेफरल क्रेडिट खत्म हो जाएंगे",
    "Downloads already saved to your gallery stay": "गैलरी में सेव डाउनलोड सुरक्षित रहेंगे",
    "Most problems are sorted in one call": "अधिकांश समस्याएं एक कॉल में हल हो जाती हैं",
    "They enter it while creating their account": "वे अकाउंट बनाते समय यह कोड डालते हैं",
    "Your credits are added once they download their first design": "उनका पहला डिज़ाइन डाउनलोड होने पर आपके क्रेडिट जुड़ते हैं",
    "Fastest for account and payment issues": "अकाउंट और भुगतान की समस्याओं के लिए सबसे तेज़",
    "Usually replies in 15 minutes": "आमतौर पर 15 मिनट में जवाब मिलता है",
    "Send a screenshot of the problem": "समस्या का स्क्रीनशॉट भेजें",
    "For anything that needs a document": "दस्तावेज़ वाली सहायता के लिए",
    "We're open now · 10:00 am to 7:00 pm, Monday to Saturday": "हम अभी खुले हैं · सुबह 10:00 से शाम 7:00, सोमवार से शनिवार",
    "Happy with the app? Rate us on the Play Store": "ऐप पसंद आया? Play Store पर रेट करें",
    "Motivational": "प्रेरणादायक",
    "Bonanza": "बोनांजा",
    "Welcome & Closing": "वेलकम और क्लोजिंग",
    "General Meeting": "सामान्य मीटिंग",
    "Birthday & Anniversary": "जन्मदिन और वर्षगांठ",
    "Thank You": "धन्यवाद",
    "Good Morning": "सुप्रभात",
    "Devotional": "भक्ति",
    "Nutrition Tips": "पोषण टिप्स",
    "Preparing Photo": "फोटो तैयार की जा रही है",
    "Opening the photo editor": "फोटो एडिटर खोला जा रहा है",
    "Loading photo from your device…": "डिवाइस से फोटो लोड हो रही है…",
    "Please wait while the photo editor is being prepared": "फोटो एडिटर तैयार होने तक कृपया प्रतीक्षा करें",
    "Crop Photo": "फोटो क्रॉप करें",
    "Final Crop": "अंतिम क्रॉप",
    "Done": "हो गया",
    "Drag corners to resize · Drag inside to position · Crop stays inside photo": "आकार बदलने के लिए कोनों को खींचें · स्थान बदलने के लिए अंदर खींचें · क्रॉप फोटो के अंदर रहेगा",
    "Photo Enhance": "फोटो बेहतर करें",
    "Reset": "रीसेट",
    "Fit": "फिट",
    "Face": "चेहरा",
    "Rotate": "घुमाएं",
    "Flip": "फ्लिप",
    "Crop": "क्रॉप",
    "Zoom": "ज़ूम",
    "Enhance": "बेहतर करें",
    "Remove Background": "बैकग्राउंड हटाएं",
    "Processing": "प्रोसेस हो रहा है",
    "Cancel": "रद्द करें",
  },
  mr: {
    "My Profile": "माझी प्रोफाइल",
    "Edit": "बदला",
    "Edit Profile": "प्रोफाइल बदला",
    "Edit Name": "नाव बदला",
    "Achievements pack is active": "अचिव्हमेंट्स पॅक सक्रिय आहे",
    "Free credits per referral": "प्रत्येक रेफरलवर मोफत क्रेडिट्स",
    "Share MLM LIVE with your team": "MLM LIVE तुमच्या टीमसोबत शेअर करा",
    "Banner details": "बॅनर तपशील",
    "Banner settings": "बॅनर सेटिंग्स",
    "Language": "भाषा",
    "Dark mode": "डार्क मोड",
    "Settings & support": "सेटिंग्स आणि मदत",
    "Settings & Support": "सेटिंग्स आणि मदत",
    "SETTINGS & SUPPORT": "सेटिंग्स आणि मदत",
    "Security": "सुरक्षा",
    "About": "माहिती",
    "Account": "खाते",
    "Learn how to use the app": "अॅप कसे वापरायचे ते शिका",
    "Customer care": "ग्राहक सेवा",
    "Chat with an expert": "तज्ज्ञाशी चॅट करा",
    "Change PIN": "PIN बदला",
    "Feedback & review": "अभिप्राय आणि पुनरावलोकन",
    "Privacy policy": "गोपनीयता धोरण",
    "Terms & conditions": "अटी व शर्ती",
    "Delete my account": "माझे खाते हटवा",
    "Log out securely": "सुरक्षितपणे लॉग आउट करा",
    "Made in India": "भारतात निर्मित",
    "Refer & earn": "रेफर करा आणि कमवा",
    "Free credits per referral!": "प्रत्येक रेफरलवर मोफत क्रेडिट्स!",
    "YOUR REFERRAL CODE": "तुमचा रेफरल कोड",
    "Copy": "कॉपी",
    "Copied": "कॉपी झाले",
    "Share on WhatsApp": "WhatsApp वर शेअर करा",
    "More": "अधिक",
    "HOW IT WORKS": "हे कसे काम करते",
    "Share your code with your team": "तुमचा कोड टीमसोबत शेअर करा",
    "They start using MLM LIVE": "ते MLM LIVE वापरायला सुरुवात करतात",
    "Spend credits on premium packs": "प्रीमियम पॅकसाठी क्रेडिट्स वापरा",
    "Credits are shown at checkout": "चेकआउटवर क्रेडिट्स दिसतात",
    "The whole app changes language, including template labels.": "टेम्पलेट लेबल्ससह संपूर्ण अॅपची भाषा बदलते.",
    "Save language": "भाषा सेव्ह करा",
    "Enter your current PIN": "तुमचा सध्याचा PIN टाका",
    "Enter your new PIN": "नवीन PIN टाका",
    "Re-enter your new PIN": "नवीन PIN पुन्हा टाका",
    "Forgot your PIN?": "PIN विसरलात?",
    "This cannot be undone": "हे पूर्ववत करता येणार नाही",
    "WHY ARE YOU LEAVING?": "तुम्ही का जात आहात?",
    "I do not use it any more": "मी आता ते वापरत नाही",
    "Too expensive": "खूप महाग",
    "I could not find the designs I need": "मला हवे असलेले डिझाइन्स मिळाले नाहीत",
    "Something else": "इतर कारण",
    "Let us try to fix it first": "आधी आम्हाला हे सोडवू द्या",
    "Keep my account": "माझे खाते ठेवा",
    "How is MLM LIVE working for you?": "MLM LIVE तुमच्यासाठी कसे काम करत आहे?",
    "Your answer goes straight to the team, not to the Play Store.": "तुमचा प्रतिसाद थेट टीमकडे जातो, Play Store वर नाही.",
    "WHAT STOOD OUT?": "काय विशेष वाटले?",
    "The designs": "डिझाइन्स",
    "Easy to use": "वापरण्यास सोपे",
    "Speed": "वेग",
    "Support": "मदत",
    "Variety": "विविधता",
    "Anything we should fix or add? (optional)": "आम्ही काय सुधारावे किंवा जोडावे? (ऐच्छिक)",
    "Send feedback": "अभिप्राय पाठवा",
    "Call us": "कॉल करा",
    "WhatsApp us": "WhatsApp करा",
    "Email us": "ईमेल करा",
    "COMMON QUESTIONS": "सामान्य प्रश्न",
    "Home": "होम",
    "Plans": "प्लॅन्स",
    "Ask AI": "AI ला विचारा",
    "Profile": "प्रोफाइल",
    "Search templates": "टेम्पलेट शोधा",
    "Categories": "श्रेणी",
    "See all": "सर्व पहा",
    "Festival Calendar": "सण कॅलेंडर",
    "Achievements": "यश",
    "Income": "उत्पन्न",
    "Everyday Moments": "दैनंदिन क्षण",
    "All categories": "सर्व श्रेणी",
    "More in this style": "याच शैलीतील आणखी",
    "Image": "प्रतिमा",
    "Video": "व्हिडिओ",
    "Download": "डाउनलोड",
    "Add music": "संगीत जोडा",
    "Apply music": "संगीत लागू करा",
    "View your pack and plan details": "तुमच्या पॅक आणि प्लॅनचे तपशील पहा",
    "View available packs": "उपलब्ध पॅक पहा",
    "people joined using your code": "लोक तुमचा कोड वापरून जोडले",
    "My photo is not showing on the banner": "माझा फोटो बॅनरवर दिसत नाही",
    "I paid but the pack is still locked": "मी पैसे भरले पण पॅक अजूनही लॉक आहे",
    "How do I change my mobile number?": "मी माझा मोबाईल नंबर कसा बदलू?",
    "The download is blurry": "डाउनलोड अस्पष्ट आहे",
    "pack is active": "पॅक सक्रिय आहे",
    "Until": "पर्यंत",
    "Step": "टप्पा",
    "of": "पैकी",
    "We ask for this so nobody else can change it.": "इतर कोणी ते बदलू नये म्हणून आम्ही हे विचारतो.",
    "Your banner details and photo are removed": "तुमचे बॅनर तपशील आणि फोटो काढले जातील",
    "Packs you paid for stop working and are not refunded": "खरेदी केलेले पॅक बंद होतील आणि परतावा मिळणार नाही",
    "Referral credits are lost": "रेफरल क्रेडिट्स गमावले जातील",
    "Downloads already saved to your gallery stay": "गॅलरीत सेव्ह केलेले डाउनलोड तसेच राहतील",
    "Most problems are sorted in one call": "बहुतेक समस्या एका कॉलमध्ये सुटतात",
    "They enter it while creating their account": "खाते तयार करताना ते हा कोड टाकतात",
    "Your credits are added once they download their first design": "त्यांनी पहिला डिझाइन डाउनलोड केल्यावर तुमचे क्रेडिट्स जोडले जातात",
    "Fastest for account and payment issues": "खाते आणि पेमेंट समस्यांसाठी सर्वात जलद",
    "Usually replies in 15 minutes": "साधारण 15 मिनिटांत उत्तर मिळते",
    "Send a screenshot of the problem": "समस्येचा स्क्रीनशॉट पाठवा",
    "For anything that needs a document": "दस्तऐवज आवश्यक असलेल्या मदतीसाठी",
    "We're open now · 10:00 am to 7:00 pm, Monday to Saturday": "आम्ही आत्ता खुले आहोत · सकाळी 10:00 ते संध्याकाळी 7:00, सोमवार ते शनिवार",
    "Happy with the app? Rate us on the Play Store": "अॅप आवडले? Play Store वर रेट करा",
    "Motivational": "प्रेरणादायी",
    "Bonanza": "बोनांझा",
    "Welcome & Closing": "स्वागत आणि समारोप",
    "General Meeting": "सामान्य बैठक",
    "Birthday & Anniversary": "वाढदिवस आणि वर्धापनदिन",
    "Thank You": "धन्यवाद",
    "Good Morning": "शुभ प्रभात",
    "Devotional": "भक्ती",
    "Nutrition Tips": "पोषण टिप्स",
    "Preparing Photo": "फोटो तयार होत आहे",
    "Opening the photo editor": "फोटो एडिटर उघडत आहे",
    "Loading photo from your device…": "डिव्हाइसवरून फोटो लोड होत आहे…",
    "Please wait while the photo editor is being prepared": "फोटो एडिटर तयार होईपर्यंत कृपया थांबा",
    "Crop Photo": "फोटो क्रॉप करा",
    "Final Crop": "अंतिम क्रॉप",
    "Done": "पूर्ण",
    "Drag corners to resize · Drag inside to position · Crop stays inside photo": "आकार बदलण्यासाठी कोपरे ड्रॅग करा · स्थान बदलण्यासाठी आत ड्रॅग करा · क्रॉप फोटोच्या आत राहील",
    "Photo Enhance": "फोटो सुधारणा",
    "Reset": "रीसेट",
    "Fit": "फिट",
    "Face": "चेहरा",
    "Rotate": "फिरवा",
    "Flip": "फ्लिप",
    "Crop": "क्रॉप",
    "Zoom": "झूम",
    "Enhance": "सुधारा",
    "Remove Background": "बॅकग्राउंड काढा",
    "Processing": "प्रक्रिया सुरू आहे",
    "Cancel": "रद्द करा",
  },
  gu: {
    "My Profile": "મારી પ્રોફાઇલ",
    "Edit": "ફેરફાર",
    "Edit Profile": "પ્રોફાઇલ ફેરફાર",
    "Edit Name": "નામ ફેરફાર",
    "Achievements pack is active": "અચીવમેન્ટ્સ પેક સક્રિય છે",
    "Free credits per referral": "દરેક રેફરલ પર મફત ક્રેડિટ્સ",
    "Share MLM LIVE with your team": "MLM LIVE તમારી ટીમ સાથે શેર કરો",
    "Banner details": "બેનર વિગતો",
    "Banner settings": "બેનર સેટિંગ્સ",
    "Language": "ભાષા",
    "Dark mode": "ડાર્ક મોડ",
    "Settings & support": "સેટિંગ્સ અને સહાય",
    "Settings & Support": "સેટિંગ્સ અને સહાય",
    "SETTINGS & SUPPORT": "સેટિંગ્સ અને સહાય",
    "Security": "સુરક્ષા",
    "About": "વિશે",
    "Account": "એકાઉન્ટ",
    "Learn how to use the app": "એપ કેવી રીતે વાપરવી તે શીખો",
    "Customer care": "ગ્રાહક સેવા",
    "Chat with an expert": "નિષ્ણાત સાથે ચેટ કરો",
    "Change PIN": "PIN બદલો",
    "Feedback & review": "પ્રતિસાદ અને સમીક્ષા",
    "Privacy policy": "ગોપનીયતા નીતિ",
    "Terms & conditions": "નિયમો અને શરતો",
    "Delete my account": "મારું એકાઉન્ટ કાઢી નાખો",
    "Log out securely": "સુરક્ષિત રીતે લૉગ આઉટ કરો",
    "Made in India": "ભારતમાં બનાવેલ",
    "Refer & earn": "રેફર કરો અને કમાવો",
    "Free credits per referral!": "દરેક રેફરલ પર મફત ક્રેડિટ્સ!",
    "YOUR REFERRAL CODE": "તમારો રેફરલ કોડ",
    "Copy": "કૉપી",
    "Copied": "કૉપી થયું",
    "Share on WhatsApp": "WhatsApp પર શેર કરો",
    "More": "વધુ",
    "HOW IT WORKS": "આ કેવી રીતે કામ કરે છે",
    "Share your code with your team": "તમારો કોડ ટીમ સાથે શેર કરો",
    "They start using MLM LIVE": "તેઓ MLM LIVE વાપરવાનું શરૂ કરે છે",
    "Spend credits on premium packs": "પ્રીમિયમ પેક માટે ક્રેડિટ્સ વાપરો",
    "Credits are shown at checkout": "ચેકઆઉટ પર ક્રેડિટ્સ દેખાય છે",
    "The whole app changes language, including template labels.": "ટેમ્પ્લેટ લેબલ સહિત આખા એપની ભાષા બદલાય છે.",
    "Save language": "ભાષા સેવ કરો",
    "Enter your current PIN": "તમારો હાલનો PIN દાખલ કરો",
    "Enter your new PIN": "તમારો નવો PIN દાખલ કરો",
    "Re-enter your new PIN": "તમારો નવો PIN ફરી દાખલ કરો",
    "Forgot your PIN?": "PIN ભૂલી ગયા?",
    "This cannot be undone": "આ પાછું ફેરવી શકાતું નથી",
    "WHY ARE YOU LEAVING?": "તમે કેમ જઈ રહ્યા છો?",
    "I do not use it any more": "હું હવે તેનો ઉપયોગ કરતો નથી",
    "Too expensive": "ખૂબ મોંઘું",
    "I could not find the designs I need": "મને જરૂરી ડિઝાઇન મળી નહીં",
    "Something else": "બીજું કંઈક",
    "Let us try to fix it first": "પહેલા અમને તેને ઠીક કરવાનો પ્રયાસ કરવા દો",
    "Keep my account": "મારું એકાઉન્ટ રાખો",
    "How is MLM LIVE working for you?": "MLM LIVE તમારા માટે કેવી રીતે કામ કરે છે?",
    "Your answer goes straight to the team, not to the Play Store.": "તમારો જવાબ સીધો ટીમ સુધી જાય છે, Play Store પર નહીં.",
    "WHAT STOOD OUT?": "શું ખાસ લાગ્યું?",
    "The designs": "ડિઝાઇન્સ",
    "Easy to use": "વાપરવામાં સરળ",
    "Speed": "ઝડપ",
    "Support": "સહાય",
    "Variety": "વિવિધતા",
    "Anything we should fix or add? (optional)": "અમે શું સુધારવું અથવા ઉમેરવું જોઈએ? (વૈકલ્પિક)",
    "Send feedback": "પ્રતિસાદ મોકલો",
    "Call us": "અમને કૉલ કરો",
    "WhatsApp us": "WhatsApp કરો",
    "Email us": "ઇમેલ કરો",
    "COMMON QUESTIONS": "સામાન્ય પ્રશ્નો",
    "Home": "હોમ",
    "Plans": "પ્લાન્સ",
    "Ask AI": "AI ને પૂછો",
    "Profile": "પ્રોફાઇલ",
    "Search templates": "ટેમ્પ્લેટ શોધો",
    "Categories": "શ્રેણીઓ",
    "See all": "બધું જુઓ",
    "Festival Calendar": "તહેવાર કેલેન્ડર",
    "Achievements": "સિદ્ધિઓ",
    "Income": "આવક",
    "Everyday Moments": "રોજિંદા પળો",
    "All categories": "બધી શ્રેણીઓ",
    "More in this style": "આ શૈલીમાં વધુ",
    "Image": "ઈમેજ",
    "Video": "વિડિયો",
    "Download": "ડાઉનલોડ",
    "Add music": "મ્યુઝિક ઉમેરો",
    "Apply music": "મ્યુઝિક લાગુ કરો",
    "View your pack and plan details": "તમારા પેક અને પ્લાનની વિગતો જુઓ",
    "View available packs": "ઉપલબ્ધ પેક જુઓ",
    "people joined using your code": "લોકો તમારા કોડથી જોડાયા",
    "My photo is not showing on the banner": "મારો ફોટો બેનર પર દેખાતો નથી",
    "I paid but the pack is still locked": "મેં ચુકવણી કરી પરંતુ પેક હજુ લોક છે",
    "How do I change my mobile number?": "હું મારો મોબાઇલ નંબર કેવી રીતે બદલું?",
    "The download is blurry": "ડાઉનલોડ ધૂંધળું છે",
    "pack is active": "પેક સક્રિય છે",
    "Until": "સુધી",
    "Step": "પગલું",
    "of": "માંથી",
    "We ask for this so nobody else can change it.": "બીજું કોઈ તેને બદલી ન શકે તેથી અમે આ પૂછીએ છીએ.",
    "Your banner details and photo are removed": "તમારી બેનર વિગતો અને ફોટો દૂર થશે",
    "Packs you paid for stop working and are not refunded": "ખરીદેલા પેક બંધ થશે અને રિફંડ નહીં મળે",
    "Referral credits are lost": "રેફરલ ક્રેડિટ્સ ગુમાશે",
    "Downloads already saved to your gallery stay": "ગેલેરીમાં સેવ થયેલા ડાઉનલોડ રહેશે",
    "Most problems are sorted in one call": "મોટાભાગની સમસ્યાઓ એક કૉલમાં ઉકેલાય છે",
    "They enter it while creating their account": "એકાઉન્ટ બનાવતી વખતે તેઓ આ કોડ દાખલ કરે છે",
    "Your credits are added once they download their first design": "તેઓ પ્રથમ ડિઝાઇન ડાઉનલોડ કરે પછી તમારા ક્રેડિટ્સ ઉમેરાય છે",
    "Fastest for account and payment issues": "એકાઉન્ટ અને ચુકવણી સમસ્યાઓ માટે સૌથી ઝડપી",
    "Usually replies in 15 minutes": "સામાન્ય રીતે 15 મિનિટમાં જવાબ મળે છે",
    "Send a screenshot of the problem": "સમસ્યાનો સ્ક્રીનશૉટ મોકલો",
    "For anything that needs a document": "દસ્તાવેજ જરૂરી હોય તેવી મદદ માટે",
    "We're open now · 10:00 am to 7:00 pm, Monday to Saturday": "અમે હાલમાં ખુલ્લા છીએ · સવારે 10:00 થી સાંજે 7:00, સોમવારથી શનિવાર",
    "Happy with the app? Rate us on the Play Store": "એપ ગમી? Play Store પર રેટ કરો",
    "Motivational": "પ્રેરણાત્મક",
    "Bonanza": "બોનાન્ઝા",
    "Welcome & Closing": "સ્વાગત અને સમાપન",
    "General Meeting": "સામાન્ય મીટિંગ",
    "Birthday & Anniversary": "જન્મદિવસ અને વર્ષગાંઠ",
    "Thank You": "આભાર",
    "Good Morning": "સુપ્રભાત",
    "Devotional": "ભક્તિ",
    "Nutrition Tips": "પોષણ સૂચનો",
    "Preparing Photo": "ફોટો તૈયાર થઈ રહ્યો છે",
    "Opening the photo editor": "ફોટો એડિટર ખૂલી રહ્યું છે",
    "Loading photo from your device…": "ડિવાઇસમાંથી ફોટો લોડ થઈ રહ્યો છે…",
    "Please wait while the photo editor is being prepared": "ફોટો એડિટર તૈયાર થાય ત્યાં સુધી રાહ જુઓ",
    "Crop Photo": "ફોટો ક્રોપ કરો",
    "Final Crop": "અંતિમ ક્રોપ",
    "Done": "પૂર્ણ",
    "Drag corners to resize · Drag inside to position · Crop stays inside photo": "કદ બદલવા માટે ખૂણા ખેંચો · સ્થાન બદલવા અંદર ખેંચો · ક્રોપ ફોટાની અંદર રહેશે",
    "Photo Enhance": "ફોટો સુધારો",
    "Reset": "રીસેટ",
    "Fit": "ફિટ",
    "Face": "ચહેરો",
    "Rotate": "ફેરવો",
    "Flip": "ફ્લિપ",
    "Crop": "ક્રોપ",
    "Zoom": "ઝૂમ",
    "Enhance": "સુધારો",
    "Remove Background": "બેકગ્રાઉન્ડ દૂર કરો",
    "Processing": "પ્રક્રિયા ચાલી રહી છે",
    "Cancel": "રદ કરો",
  },
};

const AppLanguageContext = createContext(null);

function canonicalEnglish(text) {
  if (!text) return text;
  if (Object.prototype.hasOwnProperty.call(STRINGS.hi, text) ||
      Object.prototype.hasOwnProperty.call(STRINGS.mr, text) ||
      Object.prototype.hasOwnProperty.call(STRINGS.gu, text)) {
    return text;
  }
  for (const code of ["hi", "mr", "gu"]) {
    const found = Object.entries(STRINGS[code]).find(([, translated]) => translated === text);
    if (found) return found[0];
  }
  return text;
}

function exactTranslate(text, language) {
  if (!text) return text;
  const source = canonicalEnglish(text);
  if (language === "en") return source;
  return STRINGS[language]?.[source] || source;
}

export function AppLanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return APP_LANGUAGES.some((item) => item.code === saved) ? saved : "en";
    } catch {
      return "en";
    }
  });

  const setLanguage = useCallback((nextLanguage) => {
    const safe = APP_LANGUAGES.some((item) => item.code === nextLanguage)
      ? nextLanguage
      : "en";
    setLanguageState(safe);
    try {
      localStorage.setItem(STORAGE_KEY, safe);
    } catch {}
  }, []);

  const t = useCallback(
    (text) => exactTranslate(text, language),
    [language],
  );

  // Translate exact, known app UI labels without touching canvas contents.
  // Konva/editor text is rendered inside <canvas>, so it is deliberately
  // outside this DOM-only pass and stays exactly as authored in templates.
  useEffect(() => {
    if (typeof document === "undefined") return undefined;

    const originalText = new WeakMap();
    const originalPlaceholder = new WeakMap();
    let applying = false;

    const translateElement = (root) => {
      if (!root || applying) return;
      applying = true;
      try {
        const walker = document.createTreeWalker(
          root,
          NodeFilter.SHOW_TEXT,
          {
            acceptNode(node) {
              const parent = node.parentElement;
              if (!parent) return NodeFilter.FILTER_REJECT;
              if (
                parent.closest("canvas, [data-no-ui-translate='true'], script, style, code, pre")
              ) {
                return NodeFilter.FILTER_REJECT;
              }
              return NodeFilter.FILTER_ACCEPT;
            },
          },
        );

        let node = walker.nextNode();
        while (node) {
          const raw = node.nodeValue || "";
          const trimmed = raw.trim();
          if (trimmed) {
            if (!originalText.has(node)) originalText.set(node, canonicalEnglish(trimmed));
            const source = originalText.get(node);
            const translated = exactTranslate(source, language);
            if (trimmed !== translated) {
              const left = raw.match(/^\s*/)?.[0] || "";
              const right = raw.match(/\s*$/)?.[0] || "";
              node.nodeValue = `${left}${translated}${right}`;
            }
          }
          node = walker.nextNode();
        }

        const elements = root.querySelectorAll?.("input[placeholder], textarea[placeholder]") || [];
        elements.forEach((el) => {
          if (el.closest("[data-no-ui-translate='true']")) return;
          if (!originalPlaceholder.has(el)) {
            originalPlaceholder.set(el, canonicalEnglish(el.getAttribute("placeholder") || ""));
          }
          const source = originalPlaceholder.get(el);
          const translated = exactTranslate(source, language);
          if (el.getAttribute("placeholder") !== translated) {
            el.setAttribute("placeholder", translated);
          }
        });
      } finally {
        applying = false;
      }
    };

    translateElement(document.body);

    const observer = new MutationObserver((records) => {
      if (applying) return;
      records.forEach((record) => {
        if (record.type === "childList") {
          record.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) translateElement(node);
            else if (node.parentElement) translateElement(node.parentElement);
          });
        } else if (record.type === "characterData" && record.target.parentElement) {
          translateElement(record.target.parentElement);
        }
      });
    });
    observer.observe(document.body, { childList: true, characterData: true, subtree: true });
    return () => observer.disconnect();
  }, [language]);

  const value = useMemo(
    () => ({ language, setLanguage, t, languages: APP_LANGUAGES }),
    [language, setLanguage, t],
  );

  return (
    <AppLanguageContext.Provider value={value}>
      {children}
    </AppLanguageContext.Provider>
  );
}

export function useAppLanguage() {
  const value = useContext(AppLanguageContext);
  if (!value) {
    return {
      language: "en",
      setLanguage: () => {},
      t: (text) => text,
      languages: APP_LANGUAGES,
    };
  }
  return value;
}
