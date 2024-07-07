import type { TRPCRouterRecord } from "@trpc/server";

import { publicProcedure } from "../trpc";

import { createPostSchema, postSchema  } from '@acme/validators'
import type {Post} from '@acme/validators';

import { EventEmitter } from 'node:events'
import { observable } from "@trpc/server/observable";

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

const ee = new EventEmitter<{
  update: [];
}>();

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
      const newPost = {
        id: String(nextId++),
        title: input.title,
        content: input.content,
      };

      posts.push(newPost);

      ee.emit('update')
    }),

  delete: publicProcedure.input(postSchema.pick({id: true})).mutation(({ input }) => {
    return posts.splice(
      posts.findIndex((post) => post.id === input.id),
      1
    );
  }),

  update: publicProcedure
    .input(postSchema)
    .mutation(({ input }) => {
      const post = posts.find((post) => post.id === input.id);
      if (!post) {
        throw new Error("Post not found");
      }

      post.title = input.title;
      post.content = input.content;
    }),

  postEvent: publicProcedure.subscription(() => {
    return observable<void>((emit) => {
      const onCreated = () => {
        emit.next()
      }

      ee.on('update', onCreated)

      return () => {
        ee.off('update', onCreated)
      }
    })
  })
} satisfies TRPCRouterRecord;
