import { brandApplicationsTable, brandsTable, createId, db, usersTable } from "@feijia/db";
import { desc, eq } from "drizzle-orm";

function selection() {
  return {
    id: brandApplicationsTable.id,
    status: brandApplicationsTable.status,
    slug: brandApplicationsTable.slug,
    name: brandApplicationsTable.name,
    logoUrl: brandApplicationsTable.logoUrl,
    description: brandApplicationsTable.description,
    approvedBrandId: brandApplicationsTable.approvedBrandId,
    createdAt: brandApplicationsTable.createdAt,
    updatedAt: brandApplicationsTable.updatedAt,
    applicant: {
      id: usersTable.id,
      displayName: usersTable.displayName,
      avatarFileId: usersTable.avatarFileId,
      role: usersTable.role
    }
  };
}

export const brandApplicationsRepo = {
  async create(input: {
    applicantId: string;
    status: string;
    slug: string;
    name: string;
    logoUrl: string | null;
    description: string | null;
    approvedBrandId: string | null;
  }) {
    const id = createId("brand_apply");
    await db.insert(brandApplicationsTable).values({
      id,
      ...input
    });

    return this.findById(id);
  },
  async findById(id: string) {
    const rows = await db
      .select(selection())
      .from(brandApplicationsTable)
      .innerJoin(usersTable, eq(brandApplicationsTable.applicantId, usersTable.id))
      .where(eq(brandApplicationsTable.id, id))
      .limit(1);

    return rows[0] ?? null;
  },
  async listAdmin() {
    return db
      .select(selection())
      .from(brandApplicationsTable)
      .innerJoin(usersTable, eq(brandApplicationsTable.applicantId, usersTable.id))
      .orderBy(desc(brandApplicationsTable.updatedAt));
  },
  async updateStatus(id: string, input: { status: string; approvedBrandId: string | null }) {
    await db
      .update(brandApplicationsTable)
      .set({
        status: input.status,
        approvedBrandId: input.approvedBrandId,
        updatedAt: new Date()
      })
      .where(eq(brandApplicationsTable.id, id));

    return this.findById(id);
  },
  async findApprovedBrand(id: string) {
    const rows = await db
      .select({
        id: brandsTable.id,
        slug: brandsTable.slug,
        name: brandsTable.name,
        logoUrl: brandsTable.logoUrl,
        categoryId: brandsTable.categoryId,
        sortOrder: brandsTable.sortOrder,
        isEnabled: brandsTable.isEnabled
      })
      .from(brandsTable)
      .where(eq(brandsTable.id, id))
      .limit(1);

    return rows[0] ?? null;
  }
};
