/** Advertised signup grant in social copy. Do not mention the silent first-generation bonus. */
export const SHARE_SIGNUP_CREDITS = 500;

export type ShareLanguage = 'pl' | 'en';

export type ShareCaptions = {
  x: string;
  facebook: string;
  instagram: string;
};

export function shareCaptions(language: ShareLanguage): ShareCaptions {
  if (language === 'en') {
    return {
      x: `Before and after: this is how IDA changed my room. Open it, see the interior concept, and grab ${SHARE_SIGNUP_CREDITS} free credits to generate yours.`,
      facebook: `Before and after: this is how IDA changed my room. Open the interior concept — create an account and you’ll get ${SHARE_SIGNUP_CREDITS} free credits to generate your own.`,
      instagram: `Before and after: this is how IDA changed my room. Open the interior concept and grab ${SHARE_SIGNUP_CREDITS} free credits after you sign up, then generate yours.`,
    };
  }

  return {
    x: `Przed i po: tak IDA zmieniła mój pokój. Wejdź, zobacz koncepcję wnętrza i zgarnij ${SHARE_SIGNUP_CREDITS} darmowych kredytów, żeby wygenerować swoją.`,
    facebook: `Przed i po: tak IDA zmieniła mój pokój. Wejdź, zobacz koncepcję wnętrza — po założeniu konta dostaniesz ${SHARE_SIGNUP_CREDITS} darmowych kredytów, żeby wygenerować swoją.`,
    instagram: `Przed i po: tak IDA zmieniła mój pokój. Wejdź, zobacz koncepcję wnętrza i zgarnij ${SHARE_SIGNUP_CREDITS} darmowych kredytów po założeniu konta, żeby wygenerować swoją.`,
  };
}

export function shareOgCopy(language: ShareLanguage): { title: string; description: string } {
  if (language === 'en') {
    return {
      title: 'Before and after: this is how IDA changed this room',
      description: `See the interior concept and grab ${SHARE_SIGNUP_CREDITS} free credits to generate yours.`,
    };
  }

  return {
    title: 'Przed i po: tak IDA zmieniła ten pokój',
    description: `Zobacz koncepcję wnętrza i zgarnij ${SHARE_SIGNUP_CREDITS} darmowych kredytów, żeby wygenerować swoją.`,
  };
}

export function xShareUrl(url: string, text: string): string {
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
}

export function facebookShareUrl(url: string, quote: string): string {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(quote)}`;
}

export const INSTAGRAM_WEB_URL = 'https://www.instagram.com/';

export function nativeShareData(
  text: string,
  url: string,
  title = 'IDA',
): { title: string; text: string; url: string } {
  return { title, text, url };
}

export function captionWithUrl(text: string, url: string): string {
  return `${text} ${url}`;
}
