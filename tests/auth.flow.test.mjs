import assert from 'node:assert/strict'
import test from 'node:test'

const environmentKeys = ['SWEETIE_ADMIN_USERNAME', 'SWEETIE_ADMIN_PASSWORD', 'SWEETIE_SESSION_SECRET']
const previousEnvironment = Object.fromEntries(environmentKeys.map((key) => [key, process.env[key]]))
process.env.SWEETIE_ADMIN_USERNAME = 'qa-admin'
process.env.SWEETIE_ADMIN_PASSWORD = 'qa-password'
process.env.SWEETIE_SESSION_SECRET = 'synthetic-session-secret'

const { default: authHandler } = await import('../netlify/functions/auth.mjs')
const origin = 'https://synthetic.local'
const endpoint = `${origin}/api/auth`
const post = (body, requestOrigin = origin) => authHandler(new Request(endpoint, {
  method: 'POST',
  headers: { origin: requestOrigin, 'content-type': 'application/json' },
  body: JSON.stringify(body),
}))

test('synthetic admin login, session check, logout, and auth error flows', async () => {
  try {
    const unauthenticated = await authHandler(new Request(endpoint))
    assert.equal(unauthenticated.status, 401)
    assert.deepEqual(await unauthenticated.json(), { authenticated: false })

    const invalidUsername = await post({ username: 'wrong-user', password: 'qa-password' })
    assert.equal(invalidUsername.status, 401)

    const invalidPassword = await post({ username: 'qa-admin', password: 'wrong-password' })
    assert.equal(invalidPassword.status, 401)

    const crossOrigin = await post({ username: 'qa-admin', password: 'qa-password' }, 'https://other.synthetic.local')
    assert.equal(crossOrigin.status, 403)

    const login = await post({ username: 'qa-admin', password: 'qa-password' })
    assert.equal(login.status, 200)
    assert.equal((await login.json()).authenticated, true)
    const cookie = login.headers.get('set-cookie')?.split(';')[0]
    assert.match(cookie ?? '', /^sweetie_session=/)

    const session = await authHandler(new Request(endpoint, { headers: { cookie } }))
    assert.equal(session.status, 200)
    assert.equal((await session.json()).authenticated, true)

    const logout = await authHandler(new Request(endpoint, { method: 'DELETE', headers: { origin, cookie } }))
    assert.equal(logout.status, 200)
    assert.equal((await logout.json()).authenticated, false)
    assert.match(logout.headers.get('set-cookie') ?? '', /Max-Age=0/)
  } finally {
    for (const key of environmentKeys) {
      if (previousEnvironment[key] === undefined) delete process.env[key]
      else process.env[key] = previousEnvironment[key]
    }
  }
})
