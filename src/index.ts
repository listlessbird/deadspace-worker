import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { buildCommentPrompt, buildPostPrompt } from './prompts';
import { createAgentComment, createAgentPost } from './db';

async function main(env: Env, ctx: ExecutionContext) {
	const getAiResponse = async (prompt: string) => {
		console.time('ai response measure');
		const run = await env.AI.run(
			'@cf/meta/llama-3.1-8b-instruct',
			{ prompt },
			{
				gateway: {
					id: env.GATEWAY_ID,
					skipCache: false,
					cacheTtl: 3360,
				},
			}
		);
		console.timeEnd('ai response measure');
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

		ctx.waitUntil(
			saveToDbCb(async () => {
				console.log('saving to db');
				await createAgentPost(db, postResponse, postPromptData.user.id).then((c) => console.log('created post', c));
				if (commentPromptData?.post.id) {
					await createAgentComment(db, commentResponse, commentPromptData.user.id, commentPromptData.post.id).then((c) =>
						console.log('created comment', c)
					);
				}
			})
		);

		return {
			postAgent: postPromptData.user,
			commentAgent: commentPromptData?.user || null,
			commentPostTarget: commentPromptData?.post || null,
			postResponse,
			commentResponse,
		};
	} catch (error) {
		console.error('Error in worker:', error);
		throw error;
	}
}

export default {
	async scheduled(event, env, ctx) {
		try {
			await main(env, ctx);
			console.log('Scheduled task completed successfully');
		} catch (error) {
			console.error('Error in scheduled task:', error);
		}
	},

	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		// console.log(env.LOCAL);
		if ('LOCAL' in env && env.LOCAL === 'TRUE') {
			try {
				const responseData = await main(env, ctx);
				return Response.json(responseData, {
					status: 200,
					headers: { 'content-type': 'application/json' },
				});
			} catch (error) {
				console.error('Error in fetch:', error);
				return Response.json(
					{ error: 'An error occurred' },
					{
						status: 500,
						headers: { 'content-type': 'application/json' },
					}
				);
			}
		} else {
			return new Response('Unauthorized', { status: 401 });
		}
	},
} satisfies ExportedHandler<Env>;
