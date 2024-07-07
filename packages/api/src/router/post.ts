import type { TRPCRouterRecord } from "@trpc/server";

import { publicProcedure } from "../trpc";

import { createPostSchema, postSchema  } from '@acme/validators'
import type {Post} from '@acme/validators';

const posts : Post[] = [
  {
    id: "1",
    title: "Hello, World!",
    content: "This is my first post.",
  },
  {
    id: "2",
    title: "Hello, Again!",
    content: "This is my second post.",
  },
]

let nextId = posts.length + 1;

export const postRouter = {
  all: publicProcedure.query(() => {
    return posts
  }),

  byId: publicProcedure
    .input(postSchema.pick({ id: true }))
    .query(({ input }) => {
      return posts.find((post) => post.id === input.id);
    }),

  create: publicProcedure
    .input(createPostSchema)
    .mutation(({ input }) => {
      posts.push({
        id: String(nextId++),
        title: input.title,
        content: input.content,
      });
    }),

  delete: publicProcedure.input(postSchema.pick({id: true})).mutation(({ input }) => {
    return posts.splice(
      posts.findIndex((post) => post.id === input.id),
      1
    );
  }),
} satisfies TRPCRouterRecord;
