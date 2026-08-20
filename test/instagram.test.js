import assert from 'node:assert/strict';
import test from 'node:test';

import { getLatestInstagramPosts } from '../instagram.js';

const jsonResponse = (
  body,
  { ok = true, status = 200, statusText = 'OK' } = {}
) => ({
  ok,
  status,
  statusText,
  json: async () => body,
});

test('returns the requested latest Instagram posts from RapidAPI', async () => {
  let request;
  const posts = await getLatestInstagramPosts({
    rapidApiKey: 'test-rapidapi-key',
    fetchImpl: async (url, options) => {
      request = { url: new URL(url), options };
      return jsonResponse({
        items: [
          {
            id: 'post-1',
            display_uri: 'https://cdn.example.com/photo.jpg',
            link: 'https://www.instagram.com/p/post-1/',
          },
          {
            id: 'post-2',
            display_uri: 'https://cdn.example.com/video-thumbnail.jpg',
            link: 'https://www.instagram.com/reel/post-2/',
          },
          {
            id: 'post-3',
            display_uri: 'https://cdn.example.com/photo-3.jpg',
            link: 'https://www.instagram.com/p/post-3/',
          },
        ],
      });
    },
    numberOfPosts: 2,
    userId: '232005590',
  });

  assert.deepEqual(posts, [
    {
      imageUrl: 'https://cdn.example.com/photo.jpg',
      permalink: 'https://www.instagram.com/p/post-1/',
    },
    {
      imageUrl: 'https://cdn.example.com/video-thumbnail.jpg',
      permalink: 'https://www.instagram.com/reel/post-2/',
    },
  ]);
  assert.equal(request.url.pathname, '/user-feeds');
  assert.equal(request.url.searchParams.get('id'), '232005590');
  assert.equal(request.url.searchParams.get('count'), '2');
  assert.equal(
    request.options.headers['x-rapidapi-key'],
    'test-rapidapi-key'
  );
  assert.equal(
    request.options.headers['x-rapidapi-host'],
    'instagram-looter2.p.rapidapi.com'
  );
});

test('fails instead of silently returning no posts when RapidAPI rejects the request', async () => {
  await assert.rejects(
    () =>
      getLatestInstagramPosts({
        rapidApiKey: 'test-rapidapi-key',
        fetchImpl: async () =>
          jsonResponse(
            {
              error: {
                code: 403,
                message: 'Invalid API Key',
              },
            },
            { ok: false, status: 403, statusText: 'Forbidden' }
          ),
        userId: '232005590',
      }),
    /RapidAPI devolvió 403: Invalid API Key/
  );
});

test('fails when RapidAPI returns a response without usable media', async () => {
  await assert.rejects(
    () =>
      getLatestInstagramPosts({
        rapidApiKey: 'test-rapidapi-key',
        fetchImpl: async () =>
          jsonResponse({ message: 'User not found' }),
        userId: '232005590',
      }),
    /no contiene una lista de publicaciones/
  );
});
