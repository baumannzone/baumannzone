const RAPIDAPI_BASE_URL = 'https://instagram-looter2.p.rapidapi.com';

const getErrorMessage = (payload, fallback) =>
  payload?.error?.message || payload?.message || fallback;

export const getLatestInstagramPosts = async ({
  rapidApiKey,
  fetchImpl = fetch,
  numberOfPosts = 4,
  userId,
}) => {
  if (!rapidApiKey) {
    throw new Error(
      'Falta RAPIDAPI_KEY. Añádelo como secreto de GitHub Actions.'
    );
  }

  if (!userId) {
    throw new Error(
      'Falta INSTAGRAM_USER_ID. Añádelo como secreto de GitHub Actions.'
    );
  }

  const url = new URL(`${RAPIDAPI_BASE_URL}/user-feeds`);
  url.searchParams.set('id', userId);
  url.searchParams.set('count', numberOfPosts.toString());
  url.searchParams.set('allow_restricted_media', 'false');

  const response = await fetchImpl(url, {
    headers: {
      'x-rapidapi-host': 'instagram-looter2.p.rapidapi.com',
      'x-rapidapi-key': rapidApiKey,
    },
  });

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error(
      `RapidAPI devolvió una respuesta no válida (${response.status} ${response.statusText}).`
    );
  }

  if (!response.ok) {
    throw new Error(
      `RapidAPI devolvió ${response.status}: ${getErrorMessage(
        payload,
        response.statusText
      )}`
    );
  }

  if (!Array.isArray(payload?.items)) {
    throw new Error(
      'La respuesta de Instagram no contiene una lista de publicaciones.'
    );
  }

  const posts = payload.items
    .map((item) => ({
      imageUrl: item.display_uri || item.thumbnail_url,
      permalink: item.link || item.permalink,
    }))
    .filter(({ imageUrl, permalink }) => imageUrl && permalink)
    .slice(0, numberOfPosts);

  if (!posts.length) {
    throw new Error(
      'Instagram no devolvió publicaciones con una imagen utilizable.'
    );
  }

  return posts;
};
