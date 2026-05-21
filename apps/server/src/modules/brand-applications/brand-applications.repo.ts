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
    rejectionReason: brandApplicationsTable.rejectionReason,
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
    slug: string | null;
    name: string;
    logoUrl: string | null;
    description: string | null;
    rejectionReason: string | null;
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
  async listByApplicant(applicantId: string) {
    return db
      .select(selection())
      .from(brandApplicationsTable)
      .innerJoin(usersTable, eq(brandApplicationsTable.applicantId, usersTable.id))
      .where(eq(brandApplicationsTable.applicantId, applicantId))
      .orderBy(desc(brandApplicationsTable.updatedAt));
  },
  async update(
    id: string,
    input: {
      status: string;
      slug: string | null;
      name: string;
      logoUrl: string | null;
      description: string | null;
      rejectionReason: string | null;
    }
  ) {
    await db
      .update(brandApplicationsTable)
      .set({
        status: input.status,
        slug: input.slug,
        name: input.name,
        logoUrl: input.logoUrl,
        description: input.description,
        rejectionReason: input.rejectionReason,
        updatedAt: new Date()
      })
      .where(eq(brandApplicationsTable.id, id));

    return this.findById(id);
  },
  async updateStatus(id: string, input: {
    status: string;
    approvedBrandId: string | null;
    rejectionReason: string | null;
  }) {
    await db
      .update(brandApplicationsTable)
      .set({
        status: input.status,
        approvedBrandId: input.approvedBrandId,
        rejectionReason: input.rejectionReason,
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
