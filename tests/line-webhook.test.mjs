import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import test from 'node:test'
import { validLineSignature, fetchLineProfile, userIdsFromEvents } from '../netlify/lib/line.mjs'

const userId = `U${'a'.repeat(32)}`

test('accepts only a correct LINE signature', () => {
  const body = '{"events":[]}'
  const signature = createHmac('sha256', 'secret').update(body).digest('base64')
  assert.equal(validLineSignature(body, signature, 'secret'), true)
  assert.equal(validLineSignature(body, signature, 'other'), false)
  assert.equal(validLineSignature(body + ' ', signature, 'secret'), false)
  assert.equal(validLineSignature(body, '', 'secret'), false)
})

test('collects user ids from follow and message events only', () => {
  const ids = userIdsFromEvents([
    { type: 'follow', source: { userId } },
    { type: 'message', source: { userId } },
    { type: 'unfollow', source: { userId: `U${'b'.repeat(32)}` } },
    { type: 'message', source: { userId: 'bad' } },
  ])
  assert.deepEqual(ids, [userId])
})

test('profile fetch is read-only and returns name and picture; null when blocked', async () => {
  const calls = []
  const ok = async (url, options) => { calls.push({ url, options }); return new Response(JSON.stringify({ displayName: 'Mali', pictureUrl: 'https://x/y.jpg', statusMessage: 'hi' })) }
  assert.deepEqual(await fetchLineProfile(userId, 'tok', ok), { lineUserId: userId, displayName: 'Mali', pictureUrl: 'https://x/y.jpg' })
  assert.equal(calls[0].options.method, undefined)
  assert.equal(await fetchLineProfile(userId, 'tok', async () => new Response('{}', { status: 404 })), null)
})
