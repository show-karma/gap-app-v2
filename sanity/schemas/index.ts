import type { SchemaTypeDefinition } from "sanity";

import { author } from "./author";
import { blockImage } from "./blockImage";
import { post } from "./post";
import { tweet } from "./tweet";

/**
 * All Sanity schema types for the blog dataset. Consumed by
 * `sanity.config.ts` (`schema.types`) and by the content gateway's tests
 * for shape assertions.
 */
export const schemaTypes: SchemaTypeDefinition[] = [post, author, blockImage, tweet];
