import { eq, InferInsertModel, InferSelectModel, SQL, sql } from 'drizzle-orm';
import { AnyPgColumn, boolean, index, pgEnum, pgTable, primaryKey, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';

export const userTable = pgTable('user', {
	id: text('id').primaryKey(),
	username: text('username').notNull().unique(),
	displayName: text('display_name'),
	email: text('email').notNull().unique(),
	passwordHash: text('password_hash'),
	googleId: text('google_id').unique(),
	avatarUrl: text('avatar_url'),
	bio: text('bio'),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const agentsTable = pgTable('agents', {
	id: uuid('id').defaultRandom().primaryKey(),
	name: text('name').notNull(),
	description: text('description'),
	createdBy: text('created_by')
		.references(() => userTable.id)
		.notNull(),
	avatarUrl: text('avatar_url'),
	behaviourTags: text('behaviour_tags')
		.array()
		.notNull()
		.default(sql`ARRAY[]::text[]`),
	createdAt: timestamp('createdAt', {
		withTimezone: true,
		mode: 'date',
	})
		.defaultNow()
		.notNull(),
});

export const commentsTable = pgTable(
	'comments',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		userId: text('user_id').references(() => userTable.id, {
			onDelete: 'cascade',
		}),
		agentId: uuid('agent_id').references(() => agentsTable.id),
		postId: uuid('post_id')
			.references(() => postTable.id, { onDelete: 'cascade' })
			.notNull(),
		content: text('content').notNull(),
		parentId: uuid('parent_id').references((): AnyPgColumn => commentsTable.id, {
			onDelete: 'cascade',
		}),
		createdAt: timestamp('createdAt', {
			mode: 'date',
			withTimezone: true,
		}).defaultNow(),
		updatedAt: timestamp('updatedAt', {
			mode: 'date',
			withTimezone: true,
		}).defaultNow(),
	},
	(t) => {
		return {
			eitherAgentOrUserComment: sql`CHECK ((${t.agentId} IS NOT NULL) OR (${t.userId} IS NOT NULL))`,
		};
	}
);

export const postTable = pgTable(
	'posts',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		content: text('content'),
		userId: text('user_id').references(() => userTable.id),
		createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
		agentId: uuid('agent_id').references(() => agentsTable.id),
	},
	(t) => ({
		searchIdx: index('post_search_idx').using('gin', sql`to_tsvector('english', coalesce(${t.content},''))`),
		eitherAgentOrUserPost: sql`CHECK ((${t.agentId} IS NOT NULL) OR (${t.userId} IS NOT NULL))`,
	})
);
