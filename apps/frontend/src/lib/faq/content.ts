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
            'IDA (Interior Design Assistant) to platforma łącząca projektowanie wnętrz wspomagane sztuczną inteligencją z metodami psychologii środowiskowej. Na podstawie zdjęcia Twojej przestrzeni, profilu preferencji estetycznych oraz — w trybie pełnym — cech osobowości, system generuje spersonalizowane koncepcje wnętrz: wizualizacje, które możesz porównywać, modyfikować i doprecyzowywać. IDA nie narzuca jednego „modnego” stylu — pomaga odkryć kierunek estetyczny dopasowany do Ciebie, do sposobu, w jaki chcesz funkcjonować i czuć się w przestrzeni.',
        },
        en: {
          question: 'What is IDA?',
          answer:
            'IDA (Interior Design Assistant) is a platform that combines AI-assisted interior design with environmental psychology methods. Based on a photo of your space, your aesthetic preference profile, and — in full mode — personality traits, the system generates personalized interior concepts: visualizations you can compare, refine, and iterate on. IDA does not impose a single “trendy” style — it helps uncover an aesthetic direction aligned with how you want to live and feel in your space.',
        },
      },
      {
        id: 'registration',
        pl: {
          question: 'Czy muszę się rejestrować, żeby wypróbować IDA?',
          answer:
            'Część funkcji jest dostępna bez zakładania konta — możesz rozpocząć w trybie szybkim i zobaczyć pierwsze propozycje wnętrza. Rejestracja i weryfikacja adresu e-mail są wymagane, jeśli chcesz skorzystać z pełnego profilu użytkownika, zapisać postęp między sesjami, objąć ofertą startową (plan Basic, pakiet kredytów) lub korzystać z funkcji wymagających konta. Proces rejestracji jest prosty i służy przede wszystkim bezpieczeństwu danych oraz ciągłości pracy nad Twoim projektem wnętrza.',
        },
        en: {
          question: 'Do I need to register to try IDA?',
          answer:
            'Some features are available without creating an account — you can start in quick mode and see your first interior proposals. Registration and email verification are required if you want the full user profile, to save progress across sessions, use the launch offer (Basic plan, credit package), or access account-based features. Registration is straightforward and primarily ensures data security and continuity as you work on your interior project.',
        },
      },
      {
        id: 'fast-vs-full',
        pl: {
          question: 'Czym różni się tryb szybki od pełnego?',
          answer:
            'Tryb szybki (ok. 3–5 minut) został zaprojektowany dla osób, które chcą szybko zobaczyć kierunek projektowy. Obejmuje zdjęcie przestrzeni, podstawowe preferencje estetyczne i pierwsze generacje AI. Tryb pełny to pogłębiony profil: m.in. test osobowości Big Five (IPIP-NEO-120), analiza inspiracji, pomiary preferencji jawnych i behawioralnych oraz bardziej precyzyjna synteza parametrów generacji. Efekt trybu pełnego to dokładniejsze dopasowanie koncepcji wnętrza do Twojego profilu psychologiczno-estetycznego, przy dłuższym i bardziej angażującym procesie.',
        },
        en: {
          question: 'What is the difference between quick and full mode?',
          answer:
            'Quick mode (about 3–5 minutes) is designed for people who want to see a design direction fast. It includes a space photo, basic aesthetic preferences, and initial AI generations. Full mode builds a deeper profile: including the Big Five personality test (IPIP-NEO-120), inspiration analysis, explicit and behavioral preference measures, and a more precise synthesis of generation parameters. The result of full mode is a closer match between interior concepts and your psycho-aesthetic profile, through a longer and more engaging process.',
        },
      },
      {
        id: 'architect-replacement',
        pl: {
          question: 'Czy IDA zastępuje architekta lub projektanta wnętrz?',
          answer:
            'Nie. IDA generuje koncepcje wizualne i materiał inspiracyjny na etapie poszukiwania kierunku projektowego — to narzędzie wspierające decyzje, a nie substytut usługi projektowej. System nie przygotowuje dokumentacji wykonawczej, nie uwzględnia norm budowlanych, instalacji, statyki ani uzgodnień formalnych. Zalecamy traktować wyniki IDA jako punkt wyjścia do rozmowy z projektantem wnętrz lub architektem, albo jako pomoc w samodzielnym określeniu estetyki i funkcji przestrzeni przed kolejnymi etapami realizacji.',
        },
        en: {
          question: 'Does IDA replace an architect or interior designer?',
          answer:
            'No. IDA produces visual concepts and inspirational material during the early design direction phase — it supports decisions rather than replacing professional design services. The system does not produce construction documentation, and it does not account for building codes, installations, structural requirements, or formal approvals. We recommend treating IDA outputs as a starting point for dialogue with an interior designer or architect, or as support for defining aesthetics and spatial function before later implementation stages.',
        },
      },
      {
        id: 'personality',
        pl: {
          question: 'Jak działa personalizacja na podstawie osobowości?',
          answer:
            'W trybie pełnym IDA wykorzystuje zwalidowany kwestionariusz Big Five w wersji IPIP-NEO-120, który mierzy pięć głównych wymiarów osobowości wraz z facetami szczegółowymi. Wyniki są łączone z danymi o preferencjach estetycznych — deklarowanymi (np. skale semantyczne, ranking palet) oraz behawioralnymi (np. szybkie wybory wizualne, czasy reakcji). Na tej podstawie budowany jest profil użytkownika, który jest tłumaczony na parametry generacji AI: m.in. kolorystykę, nasycenie, oświetlenie, materiały, poziom złożoności wizualnej i ogólny nastrój wnętrza. Celem nie jest „diagnoza”, lecz bardziej spójna personalizacja koncepcji w kontekście psychologii środowiskowej.',
        },
        en: {
          question: 'How does personality-based personalization work?',
          answer:
            'In full mode, IDA uses the validated Big Five questionnaire IPIP-NEO-120, measuring five major personality dimensions together with finer facets. Results are combined with aesthetic preference data — both declared (e.g. semantic differential scales, palette ranking) and behavioral (e.g. rapid visual choices, response times). From this, a user profile is built and translated into AI generation parameters: including color palette, saturation, lighting, materials, visual complexity, and overall interior mood. The goal is not “diagnosis”, but more coherent concept personalization within an environmental psychology framework.',
        },
      },
      {
        id: 'pricing',
        pl: {
          question: 'Ile kosztuje korzystanie z IDA?',
          answer:
            'IDA jest obecnie dostępna w ramach wczesnego dostępu. Dla pierwszych użytkowników przewidziana jest oferta startowa obejmująca plan Basic (0 zł) wraz z pakietem kredytów na generacje. Dostępne są również płatne plany subskrypcyjne z większymi pulami kredytów — szczegóły, limity i aktualne ceny publikujemy na /subscription/plans. Ze względu na fazę rozwoju produktu cennik może być aktualizowany; zawsze obowiązuje wersja widoczna na stronie planów w momencie zakupu.',
        },
        en: {
          question: 'How much does IDA cost?',
          answer:
            'IDA is currently available through early access. A launch offer for early users includes the Basic plan ($0) together with a credit package for generations. Paid subscription plans with larger credit pools are also available — details, limits, and current prices are published at /subscription/plans. As the product is still evolving, pricing may be updated; the version shown on the plans page at the time of purchase always applies.',
        },
      },
      {
        id: 'credits',
        pl: {
          question: 'Czym są kredyty i na co je zużywam?',
          answer:
            'Kredyty to wewnętrzna jednostka rozliczeniowa platformy, która odzwierciedla koszt operacji AI w chmurze. Są zużywane przede wszystkim przy generowaniu nowych wizualizacji wnętrz, modyfikacji istniejących propozycji (np. zmiana kolorystyki, światła, detali) oraz wybranych operacjach rozszerzających obraz. Liczba kredytów pobierana za daną akcję zależy od typu operacji i jest opisana w cenniku. Niewykorzystane kredyty pozostają na koncie przez okres określony w regulaminie i warunkach planu — zalecamy regularne sprawdzanie salda w panelu użytkownika.',
        },
        en: {
          question: 'What are credits and what do I spend them on?',
          answer:
            'Credits are the platform’s internal billing unit, reflecting the cost of cloud-based AI operations. They are consumed mainly when generating new interior visualizations, modifying existing proposals (e.g. color, lighting, or detail changes), and selected image-enhancement operations. The number of credits charged per action depends on the operation type and is described in the pricing page. Unused credits remain on your account for the period defined in the terms and plan conditions — we recommend checking your balance regularly in the user dashboard.',
        },
      },
      {
        id: 'own-photo',
        pl: {
          question: 'Czy mogę użyć własnego zdjęcia pokoju?',
          answer:
            'Tak — fotografia Twojej rzeczywistej przestrzeni jest preferowanym punktem wyjścia, ponieważ pozwala zachować proporcje pomieszczenia, układ okien i drzwi oraz kontekst architektoniczny. Jeśli nie masz jeszcze własnego zdjęcia, możesz rozpocząć od przykładowego wnętrza, aby zapoznać się z działaniem systemu. Dla najlepszych rezultatów zalecamy zdjęcie wykonane przy dziennym świetle, z możliwie szerokim kadrem obejmującym całe pomieszczenie. Przesłane fotografie są przetwarzane zgodnie z zasadami opisanymi w /privacy.',
        },
        en: {
          question: 'Can I use my own room photo?',
          answer:
            'Yes — a photograph of your actual space is the preferred starting point, as it preserves room proportions, window and door layout, and architectural context. If you do not yet have your own photo, you can begin from an example interior to explore how the system works. For best results, we recommend a daylight shot with as wide a frame as possible covering the full room. Uploaded photographs are processed according to the rules described in /privacy.',
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
            'IDA pełni podwójną rolę: jest działającym produktem cyfrowym oraz platformą badawczą realizowaną w ramach pracy doktorskiej na Akademii Sztuki w Szczecinie. Projekt opiera się na metodologii Research Through Design — zamiast sztucznego środowiska laboratoryjnego, dane badawcze powstają w naturalnym kontekście korzystania z narzędzia. Takie podejście pozwala badać, jak preferencje estetyczne, cechy osobowości i generatywna sztuczna inteligencja współtworzą proces personalizacji koncepcji wnętrz — przy jednoczesnym dostarczaniu użytkownikowi realnej wartości projektowej.',
        },
        en: {
          question: 'Is IDA only an app, or also a research study?',
          answer:
            'IDA serves a dual role: it is a working digital product and a research platform within doctoral work at the Academy of Art in Szczecin. The project follows Research Through Design methodology — instead of an artificial laboratory setting, research data emerges from natural use of the tool. This approach makes it possible to study how aesthetic preferences, personality traits, and generative AI jointly shape interior concept personalization — while still delivering genuine design value to the user.',
        },
      },
      {
        id: 'data-collected',
        pl: {
          question: 'Jakie dane zbiera IDA podczas korzystania z platformy?',
          answer:
            'W zależności od wybranego trybu i udzielonych zgód, platforma może przetwarzać m.in.: dane konta (adres e-mail, identyfikator użytkownika), odpowiedzi w ankietach i testach psychometrycznych, wyniki profilu estetycznego, metadane interakcji z interfejsem (np. czasy reakcji, sekwencje wyborów), przesłane zdjęcia wnętrz i inspiracji, parametry oraz wyniki generacji AI, a także dane techniczne niezbędne do działania i bezpieczeństwa serwisu. Zakres przetwarzania jest zawsze powiązany z konkretną funkcją i podstawą prawną wskazaną podczas onboardingu. Pełny wykaz kategorii danych, celów i odbiorców znajduje się w /privacy.',
        },
        en: {
          question: 'What data does IDA collect when I use the platform?',
          answer:
            'Depending on the mode selected and consents given, the platform may process including: account data (email address, user identifier), questionnaire and psychometric test responses, aesthetic profile results, interface interaction metadata (e.g. response times, choice sequences), uploaded interior and inspiration photos, AI generation parameters and outcomes, and technical data required for service operation and security. The scope of processing is always tied to a specific feature and the legal basis stated during onboarding. A full list of data categories, purposes, and recipients is available in /privacy.',
        },
      },
      {
        id: 'consent',
        pl: {
          question: 'Czy muszę wyrazić zgodę na udział w badaniu?',
          answer:
            'Udział w części badawczej platformy wymaga świadomej, dobrowolnej zgody (informed consent), którą zbieramy podczas onboardingu przed rozpoczęciem pełnego procesu. Zgoda jest granularna — otrzymujesz informację o celu badania, zakresie danych i swoich prawach. Bez wyrażenia zgody na cele badawcze nie wykorzystujemy Twoich danych do analiz naukowych, choć podstawowe funkcje serwisu mogą być dostępne w zakresie określonym regulaminem i polityką prywatności. Zgodę możesz wycofać w dowolnym momencie, kontaktując administratora danych.',
        },
        en: {
          question: 'Do I need to consent to participate in the research?',
          answer:
            'Participation in the research component of the platform requires informed, voluntary consent, collected during onboarding before the full process begins. Consent is presented with clear information about the study purpose, data scope, and your rights. Without research consent, your data is not used for scientific analysis, although core service features may remain available within the scope defined by the terms and privacy policy. You may withdraw consent at any time by contacting the data controller.',
        },
      },
      {
        id: 'anonymity',
        pl: {
          question: 'Czy moje dane są anonimowe?',
          answer:
            'Dane wykorzystywane do celów badawczych są przetwarzane z zachowaniem środków ograniczających identyfikowalność — m.in. poprzez identyfikator uczestnika (hash) zamiast jawnego powiązania z tożsamością w zbiorach analitycznych. Nie publikujemy danych osobowych użytkowników i nie sprzedajemy ich podmiotom trzecim. Wyniki badań są opracowywane zbiorczo lub w formie zanonimizowanej, zgodnie z zasadami etyki badań naukowych i przepisami RODO. Szczegóły dotyczące pseudonimizacji i okresu przechowywania opisuje /privacy.',
        },
        en: {
          question: 'Is my data anonymous?',
          answer:
            'Data used for research purposes is processed with measures that limit identifiability — including a participant identifier (hash) rather than open linkage to identity in analytical datasets. We do not publish users’ personal data and we do not sell it to third parties. Research findings are reported in aggregate or de-identified form, in line with research ethics and GDPR. Details on pseudonymization and retention periods are described in /privacy.',
        },
      },
      {
        id: 'administrator',
        pl: {
          question: 'Kto jest administratorem danych?',
          answer:
            'Administratorem danych osobowych w serwisie IDA jest Jakub Palka, realizujący projekt w ramach pracy doktorskiej na Akademii Sztuki w Szczecinie. W sprawach dotyczących prywatności, realizacji praw użytkownika (dostęp, sprostowanie, usunięcie, ograniczenie przetwarzania) oraz zgód badawczych można kontaktować się pod adresem jakub.palka@akademiasztuki.eu lub za pośrednictwem /contact. Na wniosek udzielamy odpowiedzi w rozsądnym terminie, zgodnie z obowiązującymi przepisami.',
        },
        en: {
          question: 'Who is the data controller?',
          answer:
            'The data controller for personal data in the IDA service is Jakub Palka, conducting the project as part of doctoral work at the Academy of Art in Szczecin. For matters concerning privacy, exercise of user rights (access, rectification, erasure, restriction of processing), and research consent, you can contact jakub.palka@akademiasztuki.eu or use /contact. We respond to requests within a reasonable timeframe, in accordance with applicable law.',
        },
      },
      {
        id: 'delete-data',
        pl: {
          question: 'Czy mogę usunąć swoje konto i dane?',
          answer:
            'Tak. Przysługuje Ci prawo do żądania usunięcia danych osobowych, o ile nie istnieje inna podstawa prawna do ich dalszego przechowywania (np. obowiązki wynikające z przepisów lub konieczność archiwizacji danych badawczych w formie zanonimizowanej). Aby złożyć wniosek, skontaktuj się z administratorem, podając adres e-mail powiązany z kontem. Rozpatrujemy wnioski indywidualnie, zgodnie z RODO i polityką prywatności, informując o zakresie i skutkach usunięcia.',
        },
        en: {
          question: 'Can I delete my account and data?',
          answer:
            'Yes. You have the right to request erasure of personal data, unless another legal basis requires further retention (e.g. statutory obligations or the need to archive research data in de-identified form). To submit a request, contact the controller using the email address linked to your account. We review requests individually, in line with GDPR and the privacy policy, and inform you about the scope and consequences of deletion.',
        },
      },
      {
        id: 'implicit-explicit',
        pl: {
          question: 'Na czym polega badanie preferencji „jawnych” i „ukrytych”?',
          answer:
            'W psychologii preferencji rozróżnia się deklaracje jawne (explicit) i wskaźniki behawioralne (implicit). W IDA preferencje jawne obejmują m.in. odpowiedzi w ankietach, skale semantyczne (np. ciepło–chłód, jasność–ciemność) oraz rankingi palet i materiałów. Preferencje ukryte są mierzone przez zachowanie w interfejsie: szybkie wybory wizualne w zadaniu typu swipe, czas reakcji, czas oglądania obrazów i wzorce wahań przed decyzją. Porównanie obu warstw pozwala badać, na ile deklarowane gusta pokrywają się z rzeczywistymi wyborami — co jest jednym z kluczowych pytań projektu doktorskiego w kontekście personalizacji wnętrz wspomaganej AI.',
        },
        en: {
          question: 'What are explicit vs. implicit preference measures?',
          answer:
            'In preference psychology, a distinction is made between explicit declarations and behavioral (implicit) indicators. In IDA, explicit preferences include questionnaire responses, semantic differential scales (e.g. warm–cool, bright–dark), and rankings of palettes and materials. Implicit preferences are measured through interface behavior: rapid visual choices in swipe-style tasks, response time, image viewing duration, and hesitation patterns before a decision. Comparing both layers makes it possible to study how declared taste aligns with actual choices — one of the doctoral project’s core questions in AI-assisted interior personalization.',
        },
      },
    ],
  },
];

export function getAllFaqItems(): FaqItem[] {
  return FAQ_SECTIONS.flatMap((section) => section.items);
}
