import { modelListQuerySchema } from "@feijia/schemas";

// Check the input type
type Input = Parameters<typeof modelListQuerySchema.parse>[0];
// Should include tab
const x: Input = { tab: "recommended", keyword: "test" };
console.log(x);
