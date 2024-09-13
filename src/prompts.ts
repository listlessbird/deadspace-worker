import { eq, not } from 'drizzle-orm';
import { postTable, userTable } from './schema';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import * as schema from './schema';

async function getRandomAgentFromDb(db: PostgresJsDatabase<typeof schema>) {
	try {
		const user = await db.select().from(schema.agentsTable);
		return user[Math.floor(Math.random() * user.length)];
	} catch (error) {
		console.error('Error fetching user from database', error);
		throw error;
	}
}

async function getRandomPostFromDb(db: PostgresJsDatabase<typeof schema>, agentId: string) {
	try {
		const post = await db
			.select()
			.from(schema.postTable)
			.where(not(eq(schema.postTable.agentId, agentId)));
		return post[Math.floor(Math.random() * post.length)];
	} catch (error) {
		console.error('Error fetching post from database', error);
		throw error;
	}
}

async function getUserPosts(userId: string, db: PostgresJsDatabase<typeof schema>) {
	const posts = await db.select().from(postTable).where(eq(postTable.agentId, userId));

	return posts;
}

async function getUserPrompt(db: PostgresJsDatabase<typeof schema>) {
	const user = await getRandomAgentFromDb(db);

	if (!user) {
		throw new Error('No users found in the database');
	}

	const prompt = `
    You're an user in a social media called deadspace. 
    
    Here's your profile:

      - Username: ${user.name}
      - your defined behaviour tags: ${user.behaviourTags.join(', ')}
      - you were part of the platform since: ${user.createdAt}
    `;
	return { prompt, user };
}

// todo: build platform prompt outlining what's possible in the platform

export async function buildPostPrompt(db: PostgresJsDatabase<typeof schema>) {
	const user = await getRandomAgentFromDb(db);

	if (!user) {
		throw new Error('No users found in the database');
	}

	const userPosts = await getUserPosts(user.id, db).then((posts) => posts.map((post) => post.content).join('\n        '));

	const prompt = `
    You're an user in a social media called deadspace. 
    
    Here's your profile:

      - Username: ${user.name}
      - your defined behaviour tags: ${user.behaviourTags.join(', ')}
      - you were part of the platform since: ${user.createdAt}

    Here's your past posts:
        ${userPosts}

    
    Now understand and follow the following RULES:

    The post should be at least 100 characters long.
    The post should be consistent with the user's profile.
    The post should reflect the behavior of a real user.
    The post should be written in first person.
    The post should be written in present tense.
    The post should be written in active voice.
    The post should be written in a conversational tone.
    The posts should be diverese from the previous posts.
    Make sure the posts arent too similar to the previous posts.


    Now with the above rules, Write a new post.


    ONLY RETURN THE POST CONTENT.
    DONT RETURN POSTS BETWEEN DOUBLE QUOTES.
    `;

	return { prompt, user };
}

export async function buildCommentPrompt(db: PostgresJsDatabase<typeof schema>) {
	const { prompt: userPrompt, user } = await getUserPrompt(db);

	const post = await getRandomPostFromDb(db, user.id);

	if (!post.id) {
		throw new Error('No posts found in the database');
	}

	const prompt = `

    ${userPrompt}

    Given your profile, you're now going to comment on a post. Here's some RULES you MUST follow:

    - The comment should be at least 50 characters long.
    - The comment should be consistent with the given user's profile.
    - The comment should reflect the behavior of a real user.
    - The comment should be related to the post.
    - The comment should be engaging and add value to the post.
    - The comment should reflect your behavioural tags.

    With the rules in mind, here's a post you can comment on:

      - Post: ${JSON.stringify(post)}

    Write a comment on the post.
    
    ONLY RETURN THE COMMENT CONTENT.
    DONT RETURN COMMENTS BETWEEN DOUBLE QUOTES.
  `;

	return { prompt, user, post };
}
