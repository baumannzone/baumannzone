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

test('returns the requested latest Instagram posts from the Graph API', async () => {
  let request;
  const posts = await getLatestInstagramPosts({
    accessToken: 'test-access-token',
    fetchImpl: async (url, options) => {
      request = { url: new URL(url), options };
      return jsonResponse({
        data: [
          {
            id: 'post-1',
            media_type: 'IMAGE',
            media_url: 'https://cdn.example.com/photo.jpg',
            permalink: 'https://www.instagram.com/p/post-1/',
          },
          {
            id: 'post-2',
            media_type: 'VIDEO',
            thumbnail_url: 'https://cdn.example.com/video-thumbnail.jpg',
            permalink: 'https://www.instagram.com/reel/post-2/',
          },
          {
            id: 'post-3',
            media_type: 'IMAGE',
            media_url: 'https://cdn.example.com/photo-3.jpg',
            permalink: 'https://www.instagram.com/p/post-3/',
          },
        ],
      });
    },
    numberOfPosts: 2,
    userId: '17841400000000000',
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
  assert.equal(request.url.pathname, '/v24.0/17841400000000000/media');
  assert.equal(request.url.searchParams.get('limit'), '2');
  assert.match(request.url.searchParams.get('fields'), /media_url/);
  assert.equal(
    request.options.headers.Authorization,
    'Bearer test-access-token'
  );
});

test('fails instead of silently returning no posts when Instagram rejects the request', async () => {
  await assert.rejects(
    () =>
      getLatestInstagramPosts({
        accessToken: 'test-access-token',
        fetchImpl: async () =>
          jsonResponse(
            {
              error: {
                code: 190,
                message: 'Invalid OAuth 2.0 Access Token',
              },
            },
            { ok: false, status: 400, statusText: 'Bad Request' }
          ),
        userId: '17841400000000000',
      }),
    /Instagram Graph API devolvió 400: Invalid OAuth 2\.0 Access Token/
  );
});

test('fails when Instagram returns a response without usable media', async () => {
  await assert.rejects(
    () =>
      getLatestInstagramPosts({
        accessToken: 'test-access-token',
        fetchImpl: async () =>
          jsonResponse({ message: 'Subscription inactive' }),
        userId: '17841400000000000',
      }),
    /no contiene una lista de publicaciones/
  );
});
