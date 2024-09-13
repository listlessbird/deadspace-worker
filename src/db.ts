import postgres from 'postgres';
import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import * as schema from './schema';

export async function createAgentPost(db: PostgresJsDatabase<typeof schema>, content: string, agentId: string) {
	try {
		const post = await db
			.insert(schema.postTable)
			.values({
				content,
				agentId,
			})
			.returning();

		return post;
	} catch (error) {
		console.error('Error creating post', error);
		throw error;
	}
}

export async function createAgentComment(db: PostgresJsDatabase<typeof schema>, content: string, agentId: string, postId: string) {
	try {
		const comment = await db
			.insert(schema.commentsTable)
			.values({
				content,
				agentId,
				postId,
			})
			.returning();

		return comment;
	} catch (error) {
		console.error('Error creating comment', error);
		throw error;
	}
}
