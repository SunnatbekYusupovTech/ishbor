import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { createApp } from '@/app';
import { User } from '@/models/User';
import { Conversation } from '@/models/Conversation';
import { Message } from '@/models/Message';
import { signAuthToken } from '@/utils/jwt';
import { ACCESS_COOKIE } from '@/utils/cookies';

/**
 * Live chat (employer ↔ seeker): conversations, message send/authz, read
 * receipts and unread counts. The socket layer is exercised indirectly — the
 * REST endpoints are what persist state; events ride on top of them.
 */
describe('Chat (conversations + messages)', () => {
  let mongo: MongoMemoryServer;
  const app = createApp();

  let alice: any;
  let bob: any;
  let eve: any;

  const authCookie = (user: any) => `${ACCESS_COOKIE}=${signAuthToken({ userId: user._id.toString(), email: user.email })}`;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongo.stop();
  });

  beforeEach(async () => {
    await Promise.all([User.deleteMany({}), Conversation.deleteMany({}), Message.deleteMany({})]);

    alice = await User.create({ name: 'Alice', email: 'alice@example.com', passwordHash: 'x', role: 'seeker' });
    bob = await User.create({ name: 'Bob', email: 'bob@example.com', passwordHash: 'x', role: 'employer' });
    eve = await User.create({ name: 'Eve', email: 'eve@example.com', passwordHash: 'x', role: 'seeker' });
  });

  it('requires authentication for every chat route', async () => {
    const list = await request(app).get('/api/chat/conversations');
    expect(list.status).toBe(401);
    const send = await request(app).post('/api/chat/conversations/some-id/messages').send({ text: 'hi' });
    expect(send.status).toBe(401);
  });

  it('startConversation is idempotent — the same pair shares one thread', async () => {
    const first = await request(app)
      .post('/api/chat/conversations')
      .set('Cookie', authCookie(alice))
      .send({ userId: bob._id.toString() });
    expect(first.status).toBe(200);

    const second = await request(app)
      .post('/api/chat/conversations')
      .set('Cookie', authCookie(bob))
      .send({ userId: alice._id.toString() });
    expect(second.status).toBe(200);
    expect(second.body.data.id).toBe(first.body.data.id);
  });

  it('rejects starting a conversation with yourself', async () => {
    const res = await request(app)
      .post('/api/chat/conversations')
      .set('Cookie', authCookie(alice))
      .send({ userId: alice._id.toString() });
    expect(res.status).toBe(400);
  });

  it('sends a message, bumps lastMessageAt, and lists it with unread counts', async () => {
    const started = await request(app)
      .post('/api/chat/conversations')
      .set('Cookie', authCookie(alice))
      .send({ userId: bob._id.toString() });
    const convoId = started.body.data.id;

    const sent = await request(app)
      .post(`/api/chat/conversations/${convoId}/messages`)
      .set('Cookie', authCookie(alice))
      .send({ text: 'Salom!' });
    expect(sent.status).toBe(201);
    expect(sent.body.data.text).toBe('Salom!');
    expect(sent.body.data.senderId).toBe(alice._id.toString());
    expect(sent.body.data.readBy).toEqual([alice._id.toString()]);

    // Alice's inbox: unread 0 (she wrote it). Bob's inbox: unread 1.
    const aliceInbox = await request(app).get('/api/chat/conversations').set('Cookie', authCookie(alice));
    const bobInbox = await request(app).get('/api/chat/conversations').set('Cookie', authCookie(bob));

    const aliceConvo = aliceInbox.body.data.find((c: any) => c.id === convoId);
    const bobConvo = bobInbox.body.data.find((c: any) => c.id === convoId);
    expect(aliceConvo.lastMessage.text).toBe('Salom!');
    expect(aliceConvo.unreadCount).toBe(0);
    expect(bobConvo.unreadCount).toBe(1);
    expect(bobConvo.other.name).toBe('Alice');
  });

  it('a non-participant cannot read or send in a thread (treated as not found)', async () => {
    const started = await request(app)
      .post('/api/chat/conversations')
      .set('Cookie', authCookie(alice))
      .send({ userId: bob._id.toString() });
    const convoId = started.body.data.id;

    const read = await request(app)
      .get(`/api/chat/conversations/${convoId}/messages`)
      .set('Cookie', authCookie(eve));
    expect(read.status).toBe(404);

    const send = await request(app)
      .post(`/api/chat/conversations/${convoId}/messages`)
      .set('Cookie', authCookie(eve))
      .send({ text: 'intruding' });
    expect(send.status).toBe(404);
  });

  it('markRead clears unread for the reader', async () => {
    const started = await request(app)
      .post('/api/chat/conversations')
      .set('Cookie', authCookie(alice))
      .send({ userId: bob._id.toString() });
    const convoId = started.body.data.id;

    await request(app)
      .post(`/api/chat/conversations/${convoId}/messages`)
      .set('Cookie', authCookie(alice))
      .send({ text: 'hey' });

    const before = await request(app).get('/api/chat/conversations').set('Cookie', authCookie(bob));
    expect(before.body.data.find((c: any) => c.id === convoId).unreadCount).toBe(1);

    const read = await request(app)
      .post(`/api/chat/conversations/${convoId}/read`)
      .set('Cookie', authCookie(bob));
    expect(read.status).toBe(200);

    const after = await request(app).get('/api/chat/conversations').set('Cookie', authCookie(bob));
    expect(after.body.data.find((c: any) => c.id === convoId).unreadCount).toBe(0);

    const msgs = await request(app)
      .get(`/api/chat/conversations/${convoId}/messages`)
      .set('Cookie', authCookie(alice));
    expect(msgs.body.data.messages[0].readBy).toContain(bob._id.toString());
  });

  it('validates empty/overlong messages', async () => {
    const started = await request(app)
      .post('/api/chat/conversations')
      .set('Cookie', authCookie(alice))
      .send({ userId: bob._id.toString() });
    const convoId = started.body.data.id;

    const empty = await request(app)
      .post(`/api/chat/conversations/${convoId}/messages`)
      .set('Cookie', authCookie(alice))
      .send({ text: '   ' });
    expect(empty.status).toBe(400);

    const long = await request(app)
      .post(`/api/chat/conversations/${convoId}/messages`)
      .set('Cookie', authCookie(alice))
      .send({ text: 'x'.repeat(2001) });
    expect(long.status).toBe(400);
  });
});
