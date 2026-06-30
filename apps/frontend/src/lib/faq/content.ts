export type FaqItem = {
  id: string;
  pl: { question: string; answer: string };
  en: { question: string; answer: string };
};

export type FaqSection = {
  id: string;
  pl: { title: string };
  en: { title: string };
  items: FaqItem[];
};

export const FAQ_SECTIONS: FaqSection[] = [
  {
    id: 'product',
    pl: { title: 'Jak działa IDA' },
    en: { title: 'How IDA works' },
    items: [
      {
        id: 'what-is-ida',
        pl: {
          question: 'Czym jest IDA?',
          answer:
            'IDA (Interior Design Assistant) to asystent AI do projektowania wnętrz, który dopasowuje koncepcje do Twojej osobowości, stylu życia i preferencji estetycznych. Wgrywasz zdjęcie pokoju — IDA generuje spersonalizowane warianty wnętrza.',
        },
        en: {
          question: 'What is IDA?',
          answer:
            'IDA (Interior Design Assistant) is an AI interior design assistant that tailors concepts to your personality, lifestyle, and aesthetic preferences. Upload a room photo — IDA generates personalized interior variants.',
        },
      },
      {
        id: 'registration',
        pl: {
          question: 'Czy muszę się rejestrować, żeby wypróbować IDA?',
          answer:
            'Możesz rozpocząć bez konta w trybie szybkim. Pełny profil i oferta startowa (plan Basic, kredyty) wymagają rejestracji i weryfikacji e-maila.',
        },
        en: {
          question: 'Do I need to register to try IDA?',
          answer:
            'You can start without an account in quick mode. The full profile and launch offer (Basic plan, credits) require registration and email verification.',
        },
      },
      {
        id: 'fast-vs-full',
        pl: {
          question: 'Czym różni się tryb szybki od pełnego?',
          answer:
            'Tryb szybki (ok. 3–5 minut) daje szybki podgląd na podstawie zdjęcia i podstawowych preferencji. Tryb pełny obejmuje m.in. test osobowości Big Five, inspiracje i głębszy profil — dokładniejsze dopasowanie, dłuższy proces.',
        },
        en: {
          question: 'What is the difference between quick and full mode?',
          answer:
            'Quick mode (about 3–5 minutes) gives a fast preview based on your photo and basic preferences. Full mode includes the Big Five personality test, inspirations, and a deeper profile — more accurate matching, longer process.',
        },
      },
      {
        id: 'architect-replacement',
        pl: {
          question: 'Czy IDA zastępuje architekta lub projektanta wnętrz?',
          answer:
            'Nie. IDA generuje koncepcje wizualne i inspiracje — punkt wyjścia do rozmowy z projektantem lub własnych decyzji. Nie zastępuje projektu wykonawczego, instalacji ani uzgodnień formalnych.',
        },
        en: {
          question: 'Does IDA replace an architect or interior designer?',
          answer:
            'No. IDA generates visual concepts and inspiration — a starting point for conversations with a designer or your own decisions. It does not replace construction documents, installations, or formal approvals.',
        },
      },
      {
        id: 'personality',
        pl: {
          question: 'Jak działa personalizacja na podstawie osobowości?',
          answer:
            'IDA korzysta z walidowanego kwestionariusza Big Five (IPIP-NEO-120) oraz danych o preferencjach estetycznych — jawnych i behawioralnych. Te informacje wpływają na parametry generacji AI: kolory, nastrój, styl i detale wnętrza.',
        },
        en: {
          question: 'How does personality-based personalization work?',
          answer:
            'IDA uses the validated Big Five questionnaire (IPIP-NEO-120) and data on aesthetic preferences — both explicit and behavioral. This shapes AI generation parameters: colors, mood, style, and interior details.',
        },
      },
      {
        id: 'pricing',
        pl: {
          question: 'Ile kosztuje korzystanie z IDA?',
          answer:
            'Dostępny jest plan Basic w ramach wczesnego dostępu oraz płatne plany z kredytami na generacje. Aktualny cennik znajdziesz na stronie /subscription/plans.',
        },
        en: {
          question: 'How much does IDA cost?',
          answer:
            'A Basic plan is available as part of early access, plus paid plans with credits for generations. See the current pricing at /subscription/plans.',
        },
      },
      {
        id: 'credits',
        pl: {
          question: 'Czym są kredyty i na co je zużywam?',
          answer:
            'Kredyty są zużywane przy generowaniu i modyfikacji wizualizacji wnętrz. Każda operacja AI (np. nowa generacja, zmiana detali) pobiera określoną liczbę kredytów zgodnie z cennikiem.',
        },
        en: {
          question: 'What are credits and what do I spend them on?',
          answer:
            'Credits are used when generating and modifying interior visualizations. Each AI operation (e.g. a new generation or detail change) consumes a set number of credits according to the pricing page.',
        },
      },
      {
        id: 'own-photo',
        pl: {
          question: 'Czy mogę użyć własnego zdjęcia pokoju?',
          answer:
            'Tak — zdjęcie Twojej przestrzeni to punkt wyjścia. Możesz też zacząć od przykładowego wnętrza, jeśli nie masz jeszcze własnego zdjęcia.',
        },
        en: {
          question: 'Can I use my own room photo?',
          answer:
            'Yes — a photo of your space is the starting point. You can also begin from an example interior if you do not have your own photo yet.',
        },
      },
    ],
  },
  {
    id: 'research',
    pl: { title: 'Badania, dane i prywatność' },
    en: { title: 'Research, data, and privacy' },
    items: [
      {
        id: 'research-or-product',
        pl: {
          question: 'Czy IDA to tylko aplikacja, czy też badanie naukowe?',
          answer:
            'Oba. IDA to działający produkt oraz platforma badawcza w ramach pracy doktorskiej na Akademii Sztuki w Szczecinie. Metodologia: Research Through Design — dane powstają w naturalnym użyciu, nie w sztucznym laboratorium.',
        },
        en: {
          question: 'Is IDA only an app, or also a research study?',
          answer:
            'Both. IDA is a working product and a research platform within doctoral work at the Academy of Art in Szczecin. Methodology: Research Through Design — data emerges from natural use, not an artificial lab setting.',
        },
      },
      {
        id: 'data-collected',
        pl: {
          question: 'Jakie dane zbiera IDA podczas korzystania z platformy?',
          answer:
            'M.in. odpowiedzi w ankietach, interakcje z interfejsem (czasy reakcji, wybory wizualne), wyniki generacji AI oraz — po zgodzie — dane profilowe. Szczegóły opisuje polityka prywatności pod adresem /privacy.',
        },
        en: {
          question: 'What data does IDA collect when I use the platform?',
          answer:
            'Including questionnaire answers, interface interactions (response times, visual choices), AI generation outcomes, and — with consent — profile data. Details are in the privacy policy at /privacy.',
        },
      },
      {
        id: 'consent',
        pl: {
          question: 'Czy muszę wyrazić zgodę na udział w badaniu?',
          answer:
            'Tak. Przed rozpoczęciem pełnego flow prosimy o świadomą zgodę (informed consent). Bez zgody nie przetwarzamy danych w celach badawczych.',
        },
        en: {
          question: 'Do I need to consent to participate in the research?',
          answer:
            'Yes. Before starting the full flow we ask for informed consent. Without consent we do not process data for research purposes.',
        },
      },
      {
        id: 'anonymity',
        pl: {
          question: 'Czy moje dane są anonimowe?',
          answer:
            'Dane badawcze są przetwarzane zgodnie z polityką prywatności — z identyfikatorem uczestnika (hash), bez publicznego udostępniania danych osobowych. Nie sprzedajemy danych osobowych.',
        },
        en: {
          question: 'Is my data anonymous?',
          answer:
            'Research data is processed according to the privacy policy — with a participant identifier (hash), without publicly sharing personal data. We do not sell personal data.',
        },
      },
      {
        id: 'administrator',
        pl: {
          question: 'Kto jest administratorem danych?',
          answer:
            'Administratorem jest Jakub Palka (Akademia Sztuki w Szczecinie). Kontakt: jakub.palka@akademiasztuki.eu lub formularz pod adresem /contact.',
        },
        en: {
          question: 'Who is the data controller?',
          answer:
            'The controller is Jakub Palka (Academy of Art in Szczecin). Contact: jakub.palka@akademiasztuki.eu or the form at /contact.',
        },
      },
      {
        id: 'delete-data',
        pl: {
          question: 'Czy mogę usunąć swoje konto i dane?',
          answer:
            'Tak — skontaktuj się z administratorem. Usunięcie realizujemy zgodnie z RODO i polityką prywatności.',
        },
        en: {
          question: 'Can I delete my account and data?',
          answer:
            'Yes — contact the administrator. Deletion is handled in line with GDPR and the privacy policy.',
        },
      },
      {
        id: 'implicit-explicit',
        pl: {
          question: 'Na czym polega badanie preferencji „jawnych” i „ukrytych”?',
          answer:
            'Jawne preferencje to deklaracje w ankietach i suwakach. Ukryte — zachowanie: szybkie wybory wizualne (swipe), czas reakcji, czas oglądania. Porównanie obu daje pełniejszy obraz preferencji estetycznych.',
        },
        en: {
          question: 'What are explicit vs. implicit preference measures?',
          answer:
            'Explicit preferences are declarations in questionnaires and sliders. Implicit ones come from behavior: fast visual choices (swipes), response time, and viewing duration. Comparing both gives a fuller picture of aesthetic preferences.',
        },
      },
    ],
  },
];

export function getAllFaqItems(): FaqItem[] {
  return FAQ_SECTIONS.flatMap((section) => section.items);
}
