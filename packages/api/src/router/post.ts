import { EventEmitter } from "node:events";
import type { TRPCRouterRecord } from "@trpc/server";
import { observable } from "@trpc/server/observable";

import type { Post } from "@acme/validators";
import { createPostSchema, postSchema } from "@acme/validators";

import { publicProcedure } from "../trpc";

const posts: Post[] = [
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
];

let nextId = posts.length + 1;

const ee = new EventEmitter<{
  update: [];
}>();

export const postRouter = {
  all: publicProcedure.query(() => {
    return posts;
  }),

  byId: publicProcedure
    .input(postSchema.pick({ id: true }))
    .query(({ input }) => {
      return posts.find((post) => post.id === input.id);
    }),

  create: publicProcedure.input(createPostSchema).mutation(({ input }) => {
    const newPost = {
      id: String(nextId++),
      title: input.title,
      content: input.content,
    };

    posts.push(newPost);

    ee.emit("update");

    return newPost;
  }),

  delete: publicProcedure
    .input(postSchema.pick({ id: true }))
    .mutation(({ input }) => {
      ee.emit("update");

      return posts.splice(
        posts.findIndex((post) => post.id === input.id),
        1,
      );
    }),

  update: publicProcedure.input(postSchema).mutation(({ input }) => {
    const post = posts.find((post) => post.id === input.id);
    if (!post) {
      throw new Error("Post not found");
    }

    post.title = input.title;
    post.content = input.content;

    ee.emit("update");

    return post;
  }),

  postEvent: publicProcedure.subscription(() => {
    return observable<void>((emit) => {
      const onCreated = () => {
        emit.next();
      };

      ee.on("update", onCreated);

      return () => {
        ee.off("update", onCreated);
      };
    });
  }),
} satisfies TRPCRouterRecord;
