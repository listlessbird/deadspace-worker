// import { getDB } from './db';
// import { buildPostPrompt } from './prompts';

import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { buildCommentPrompt, buildPostPrompt } from './prompts';
import { createAgentComment, createAgentPost } from './db';

export interface Env {
	AI: Ai;
	DB_URL: string;
}

export default {
	async fetch(request, env, ctx): Promise<Response> {
		// const sql = postgres(env.DB_URL);

		const getAiResponse = async (prompt: string) => {
			console.time('ai response mesure');
			const run = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', { prompt });

			console.timeEnd('ai response mesure');
			// @ts-ignore
			console.log('ai response:  ', run.response);
			// @ts-ignore
			return run.response;
		};

		const saveToDbCb = async (cb: () => void) => {
			await cb();
		};

		const client = postgres(env.DB_URL);
		const db = drizzle(client, { schema });

		try {
			console.log('starting worker');

			const [postPromptData, commentPromptData] = await Promise.all([buildPostPrompt(db), buildCommentPrompt(db).catch(() => null)]);

			console.log('generated prompts');

			const [postResponse, commentResponse] = await Promise.all([
				getAiResponse(postPromptData.prompt),
				commentPromptData ? getAiResponse(commentPromptData.prompt) : Promise.resolve(null),
			]);

			console.log('generated ai responses');

			// const run = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', { prompt });

			ctx.waitUntil(
				saveToDbCb(async () => {
					console.log('saving to db');
					await createAgentPost(db, postResponse, postPromptData.user.id).then((c) => console.log('created post', c));
					// commentPromptData
					// 	? createAgentComment(db, commentResponse, commentPromptData.user.id, commentPromptData.post.id).catch(() => null)
					// 	: Promise.resolve(null);

					if (commentPromptData?.post.id) {
						await createAgentComment(db, commentResponse, commentPromptData.user.id, commentPromptData.post.id).then((c) =>
							console.log('created comment', c)
						);
					}
					return;
				})
			);

			const responseData = {
				postAgent: postPromptData.user,
				commentAgent: commentPromptData?.user || null,
				commentPostTarget: commentPromptData?.post || null,
				postResponse,
				commentResponse,
			};

			return Response.json(responseData, {
				status: 200,
				headers: { 'content-type': 'application/json' },
			});
		} catch (error) {
			console.error('Error in worker:', error);
			return Response.json(
				{ error: 'An error occurred' },
				{
					status: 500,
					headers: { 'content-type': 'application/json' },
				}
			);
		}
	},
} satisfies ExportedHandler<Env>;
