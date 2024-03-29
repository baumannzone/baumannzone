import { promises as fs } from 'fs';
import * as dotenv from 'dotenv';
import fetch from 'node-fetch';
dotenv.config();

const { INSTAGRAM_RAPIDAPI_KEY, INSTAGRAM_RAPIDAPI_HOST, YOUTUBE_API_KEY } =
  process.env;

const INSTAGRAM_USER_ID = '232005590';
const YOUTUBE_PLAYLIST_ID = 'PLaP1DHaNgbKaChma5n73RlVeQhp0Y4zwo';

const NUMBER_OF = { PHOTOS: 4, VIDEOS: 3 };
const PLACEHOLDERS = { YOUTUBE: '%{{youtube}}%', INSTAGRAM: '%{{instagram}}%' };

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

const generateInstagramHTML = ({ node: { display_url: url, shortcode } }) => `
<a href='https://instagram.com/p/${shortcode}' target='_blank'>
  <img width='20%' src='${url}' alt='Instagram photo' />
</a>`;

const generateYoutubeHTML = ({ title, videoId }) => `
<a href='https://youtu.be/${videoId}' target='_blank'>
  <img width='30%' src='https://img.youtube.com/vi/${videoId}/mqdefault.jpg' alt='${title}' />
</a>`;

(async () => {
  // Get the template, the videos and the photos
  const [template, videos, photos] = await Promise.all([
    fs.readFile('template.md', { encoding: 'utf-8' }),
    getLatestYoutubeVideos(),
    getPhotosFromInstagram(NUMBER_OF.PHOTOS),
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

  // Create the new README.md with the latest videos and photos
  const newMarkdown = template
    .replace(PLACEHOLDERS.YOUTUBE, latestYoutubeVideos)
    .replace(PLACEHOLDERS.INSTAGRAM, latestInstagramPhotos);

  await fs.writeFile('README.md', newMarkdown);
})();
