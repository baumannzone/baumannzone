const INSTAGRAM_GRAPH_API_BASE_URL = 'https://graph.instagram.com';
const DEFAULT_GRAPH_API_VERSION = 'v24.0';

const getPreviewUrl = (media) => {
  if (media.media_type === 'VIDEO') {
    return media.thumbnail_url || media.media_url;
  }

  return media.media_url;
};

const getCarouselPreviewUrl = (media) => {
  const ownPreview = getPreviewUrl(media);
  if (ownPreview) return ownPreview;

  return media.children?.data?.map(getPreviewUrl).find(Boolean);
};

const getErrorMessage = (payload, fallback) =>
  payload?.error?.message || payload?.message || fallback;

export const getLatestInstagramPosts = async ({
  accessToken,
  fetchImpl = fetch,
  graphApiVersion = DEFAULT_GRAPH_API_VERSION,
  numberOfPosts = 4,
  userId,
}) => {
  if (!accessToken) {
    throw new Error(
      'Falta INSTAGRAM_ACCESS_TOKEN. Añádelo como secreto de GitHub Actions.'
    );
  }

  if (!userId) {
    throw new Error(
      'Falta INSTAGRAM_USER_ID. Añádelo como secreto de GitHub Actions.'
    );
  }

  const url = new URL(
    `${INSTAGRAM_GRAPH_API_BASE_URL}/${graphApiVersion}/${userId}/media`
  );
  url.searchParams.set(
    'fields',
    'id,media_type,media_url,thumbnail_url,permalink,children{media_type,media_url,thumbnail_url}'
  );
  url.searchParams.set('limit', numberOfPosts.toString());

  const response = await fetchImpl(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error(
      `Instagram Graph API devolvió una respuesta no válida (${response.status} ${response.statusText}).`
    );
  }

  if (!response.ok) {
    throw new Error(
      `Instagram Graph API devolvió ${response.status}: ${getErrorMessage(
        payload,
        response.statusText
      )}`
    );
  }

  if (!Array.isArray(payload?.data)) {
    throw new Error(
      'La respuesta de Instagram no contiene una lista de publicaciones.'
    );
  }

  const posts = payload.data
    .map((media) => ({
      imageUrl: getCarouselPreviewUrl(media),
      permalink: media.permalink,
    }))
    .filter(({ imageUrl, permalink }) => imageUrl && permalink)
    .slice(0, numberOfPosts);

  if (!posts.length) {
    throw new Error(
      'Instagram no devolvió publicaciones con una imagen o miniatura utilizable.'
    );
  }

  return posts;
};
