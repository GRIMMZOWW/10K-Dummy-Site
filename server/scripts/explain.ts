import { connectDB, disconnectDB } from '../src/db/connect';
import { ProductModel } from '../src/models/product.model';
import { buildListQueryParts } from '../src/modules/products/product.repository';
import { productListQuerySchema } from '../src/modules/products/product.schema';

interface ExplainCase {
  name: string;
  rawQuery: Record<string, string>;
}

interface PlanNode {
  stage?: string;
  indexName?: string;
  inputStage?: PlanNode;
  inputStages?: PlanNode[];
  outerStage?: PlanNode;
  innerStage?: PlanNode;
  thenStage?: PlanNode;
  elseStage?: PlanNode;
}

interface StageSummary {
  stage: string;
  indexName?: string;
}

const EXPLAIN_CASES: ExplainCase[] = [
  { name: 'default list', rawQuery: {} },
  { name: 'category filter', rawQuery: { category: 'smartphones' } },
  { name: 'minPrice/maxPrice range', rawQuery: { minPrice: '10', maxPrice: '500' } },
  { name: 'inStock=true', rawQuery: { inStock: 'true' } },
  { name: 'q 2-char prefix', rawQuery: { q: 'ma' } },
  { name: 'q 3+ char $text', rawQuery: { q: 'phone' } },
  { name: 'sort=price_asc (no category)', rawQuery: { sort: 'price_asc' } },
  {
    name: 'sort=price_asc (with category)',
    rawQuery: { category: 'smartphones', sort: 'price_asc' },
  },
  { name: 'sort=price_desc (no category)', rawQuery: { sort: 'price_desc' } },
  {
    name: 'sort=price_desc (with category)',
    rawQuery: { category: 'smartphones', sort: 'price_desc' },
  },
  { name: 'sort=rating_desc (no category)', rawQuery: { sort: 'rating_desc' } },
  {
    name: 'sort=rating_desc (with category)',
    rawQuery: { category: 'smartphones', sort: 'rating_desc' },
  },
  { name: 'sort=newest (no category)', rawQuery: { sort: 'newest' } },
  {
    name: 'sort=newest (with category)',
    rawQuery: { category: 'smartphones', sort: 'newest' },
  },
];

function collectStages(node: PlanNode | undefined, acc: StageSummary[] = []): StageSummary[] {
  if (!node || typeof node !== 'object') return acc;
  if (node.stage) {
    acc.push({
      stage: node.stage,
      ...(node.indexName ? { indexName: node.indexName } : {}),
    });
  }
  collectStages(node.inputStage, acc);
  if (Array.isArray(node.inputStages)) {
    for (const child of node.inputStages) {
      collectStages(child, acc);
    }
  }
  collectStages(node.outerStage, acc);
  collectStages(node.innerStage, acc);
  collectStages(node.thenStage, acc);
  collectStages(node.elseStage, acc);
  return acc;
}

function formatStages(stages: StageSummary[]): string {
  return stages
    .map((s) => (s.indexName ? `${s.stage}(${s.indexName})` : s.stage))
    .join(' -> ');
}

async function run(): Promise<void> {
  await connectDB();
  let failures = 0;

  try {
    console.log('\n=== MongoDB Query Plan Verification ===\n');

    for (const testCase of EXPLAIN_CASES) {
      const parsed = productListQuerySchema.parse(testCase.rawQuery);
      const { filter, sort, isTextSearch } = buildListQueryParts(parsed);

      const explanation = (await ProductModel.find(filter)
        .sort(sort)
        .skip((parsed.page - 1) * parsed.limit)
        .limit(parsed.limit)
        .lean()
        .explain('executionStats')) as {
        queryPlanner?: { winningPlan?: PlanNode };
        executionStats?: {
          nReturned?: number;
          totalDocsExamined?: number;
          executionTimeMillis?: number;
        };
      };

      const stages = collectStages(explanation.queryPlanner?.winningPlan);
      const stageNames = stages.map((s) => s.stage);
      const hasCollscan = stageNames.includes('COLLSCAN');
      const hasIndexScan = stageNames.some(
        (s) => s === 'IXSCAN' || s === 'TEXT' || s === 'TEXT_OR' || s === 'TEXT_MATCH',
      );
      const hasSortStage = stageNames.includes('SORT') || stageNames.includes('SORT_KEY_GENERATOR');
      const hasInMemorySort = isTextSearch ? false : hasSortStage;

      const passed = !hasCollscan && hasIndexScan && !hasInMemorySort;
      if (!passed) failures++;

      const stats = explanation.executionStats;
      const status = passed ? 'PASS' : 'FAIL';
      console.log(
        `[${status}] ${testCase.name}\n` +
          `       stages: ${formatStages(stages)}\n` +
          `       returned=${stats?.nReturned ?? '?'} examined=${stats?.totalDocsExamined ?? '?'} timeMs=${stats?.executionTimeMillis ?? '?'}`,
      );
    }

    console.log(`\nSummary: ${EXPLAIN_CASES.length - failures}/${EXPLAIN_CASES.length} passed.`);
    if (failures > 0) {
      console.error(`FAILED: ${failures} query plan(s) used COLLSCAN or in-memory SORT.`);
      process.exitCode = 1;
    }
  } finally {
    await disconnectDB();
  }
}

run().catch((err) => {
  console.error('explain.ts failed:', err);
  process.exit(1);
});
