import { promises as fs } from 'fs';
import * as dotenv from 'dotenv';
import fetch from 'node-fetch';
import xml2js from 'xml2js';

dotenv.config();

const { INSTAGRAM_RAPIDAPI_KEY, INSTAGRAM_RAPIDAPI_HOST, YOUTUBE_API_KEY } =
  process.env;

const INSTAGRAM_USER_ID = '232005590';
const YOUTUBE_PLAYLIST_ID = 'PLaP1DHaNgbKaChma5n73RlVeQhp0Y4zwo';

const NUMBER_OF = {
  PHOTOS: 4,
  VIDEOS: 3,
  POSTS: 3,
};

const PLACEHOLDERS = {
  BLOG: '%{{blog}}%',
  YOUTUBE: '%{{youtube}}%',
  INSTAGRAM: '%{{instagram}}%',
};

const getPhotosFromInstagram = async (numberOfPhotos) => {
  const response = await fetch(
    `https://instagram-scraper-2022.p.rapidapi.com/ig/posts/?id_user=${INSTAGRAM_USER_ID}`,
    {
      headers: {
        'X-RapidAPI-Key': INSTAGRAM_RAPIDAPI_KEY,
        'X-RapidAPI-Host': INSTAGRAM_RAPIDAPI_HOST,
      },
    }
  );

  const json = await response.json();
  return (
    json?.data?.user?.edge_owner_to_timeline_media?.edges?.slice(
      0,
      numberOfPhotos
    ) || []
  );
};

const getLatestYoutubeVideos = () => {
  return fetch(
    `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${YOUTUBE_PLAYLIST_ID}&maxResults=${NUMBER_OF.VIDEOS}&key=${YOUTUBE_API_KEY}`
  )
    .then((res) => res.json())
    .then((videos) => videos.items);
};

const getLatestBlogPosts = async (url, numberOfPosts) => {
  try {
    const response = await fetch(url);
    if (!response.ok)
      throw new Error(`Error en la solicitud: ${response.statusText}`);

    const xml = await response.text(); // Leer el XML como texto

    // Convertir el XML a un objeto JS con xml2js
    const parser = new xml2js.Parser({ explicitArray: false });
    const result = await parser.parseStringPromise(xml);
    const posts = result.rss.channel.item;
    const recentPosts = posts
      .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))
      .slice(0, numberOfPosts);
    return recentPosts;
  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  }
};

const generateInstagramHTML = ({ node: { display_url: url, shortcode } }) => `
<a href='https://instagram.com/p/${shortcode}' target='_blank'>
  <img width='20%' src='${url}' alt='Instagram photo' />
</a>`;

const generateYoutubeHTML = ({ title, videoId }) => `
<a href='https://youtu.be/${videoId}' target='_blank'>
  <img width='30%' src='https://img.youtube.com/vi/${videoId}/mqdefault.jpg' alt='${title}' />
</a>`;

const generatePostHTML = ({ title, link }) => {
  return `<a href='${link}' target='_blank'>
  <h4>${title}</h4>
</a>`;
};

(async () => {
  const [template, videos, photos, posts] = await Promise.all([
    fs.readFile('template.md', { encoding: 'utf-8' }),
    getLatestYoutubeVideos(),
    getPhotosFromInstagram(NUMBER_OF.PHOTOS),
    getLatestBlogPosts('https://www.baumannzone.dev/rss.xml', NUMBER_OF.POSTS),
  ]);

  // Get the latest videos from YouTube
  const latestYoutubeVideos = videos
    .map(({ snippet }) => {
      const { title, resourceId } = snippet;
      const { videoId } = resourceId;
      return generateYoutubeHTML({ videoId, title });
    })
    .join('');

  // Get latest Instagram photos
  const latestInstagramPhotos = photos.map(generateInstagramHTML).join('');

  // Get latest blog posts
  const latestBlogPosts = posts
    .map((post) => generatePostHTML(post))
    .join('\n');

  // Create the new README.md with the latest data
  const newMarkdown = template
    .replace(PLACEHOLDERS.YOUTUBE, latestYoutubeVideos)
    .replace(PLACEHOLDERS.INSTAGRAM, latestInstagramPhotos)
    .replace(PLACEHOLDERS.BLOG, latestBlogPosts);

  await fs.writeFile('README.md', newMarkdown);
})();
