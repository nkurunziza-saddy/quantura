"use server";
import { eq, desc, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { revalidatePath, unstable_cache } from "next/cache";
import { categoriesTable, auditLogsTable } from "@/lib/schema";
import type { InsertCategory, InsertAuditLog } from "@/lib/schema/schema-types";
import { ErrorCode } from "../constants/errors";
import { cache } from "react";

export const get_all = cache(async (businessId: string) => {
  if (!businessId) {
    return { data: null, error: ErrorCode.MISSING_INPUT };
  }
  try {
    const categories = await db
      .select()
      .from(categoriesTable)
      .where(eq(categoriesTable.businessId, businessId))
      .orderBy(desc(categoriesTable.createdAt));
    return { data: categories, error: null };
  } catch (error) {
    console.error("Failed to fetch categories:", error);
    return { data: null, error: ErrorCode.FAILED_REQUEST };
  }
});

export const get_all_cached = unstable_cache(
  async (businessId: string) => get_all(businessId),
  ["categories"],
  {
    revalidate: 300,
    tags: ["categories"],
  }
);

export async function get_by_id(categoryId: string, businessId: string) {
  if (!categoryId || !businessId) {
    return { data: null, error: ErrorCode.MISSING_INPUT };
  }
  try {
    const category = await db.query.categoriesTable.findFirst({
      where: and(
        eq(categoriesTable.id, categoryId),
        eq(categoriesTable.businessId, businessId)
      ),
    });

    if (!category) {
      return { data: null, error: ErrorCode.NOT_FOUND };
    }

    return { data: category, error: null };
  } catch (error) {
    console.error("Failed to fetch category:", error);
    return { data: null, error: ErrorCode.FAILED_REQUEST };
  }
}

export const get_by_id_cached = unstable_cache(
  async (categoryId: string, businessId: string) =>
    get_by_id(categoryId, businessId),
  ["categories"],
  {
    revalidate: 300,
  }
);

export async function create(category: InsertCategory, userId: string) {
  if (!category.value || !category.businessId) {
    return { data: null, error: ErrorCode.MISSING_INPUT };
  }
  try {
    const result = await db.transaction(async (tx) => {
      const [newCategory] = await tx
        .insert(categoriesTable)
        .values(category)
        .onConflictDoUpdate({
          target: [categoriesTable.businessId, categoriesTable.value],
          set: { businessId: categoriesTable.businessId, value: category.value },
        })
        .returning();

      const auditData: InsertAuditLog = {
        businessId: category.businessId,
        model: "category",
        recordId: newCategory?.id ?? "",
        action: "create-category",
        changes: JSON.stringify(category),
        performedBy: userId,
        performedAt: new Date(),
      };

      await tx.insert(auditLogsTable).values(auditData);
      return newCategory;
    });

    revalidatePath("/dashboard/categories");

    return { data: result, error: null };
  } catch (error) {
    console.error("Failed to create category:", error);
    return { data: null, error: ErrorCode.FAILED_REQUEST };
  }
}

export async function update(
  categoryId: string,
  businessId: string,
  userId: string,
  updates: Partial<InsertCategory>
) {
  if (!categoryId || !businessId) {
    return { data: null, error: ErrorCode.MISSING_INPUT };
  }
  try {
    const result = await db.transaction(async (tx) => {
      const [updatedCategory] = await tx
        .update(categoriesTable)
        .set({ ...updates, updatedAt: new Date() })
        .where(
          and(
            eq(categoriesTable.id, categoryId),
            eq(categoriesTable.businessId, businessId)
          )
        )
        .returning();

      if (!updatedCategory) {
        return null;
      }

      const auditData: InsertAuditLog = {
        businessId: businessId,
        model: "category",
        recordId: updatedCategory.id,
        action: "update-category",
        changes: JSON.stringify(updates),
        performedBy: userId,
        performedAt: new Date(),
      };

      await tx.insert(auditLogsTable).values(auditData);
      return updatedCategory;
    });

    if (!result) {
      return { data: null, error: ErrorCode.NOT_FOUND };
    }

    revalidatePath("/dashboard/categories");
    revalidatePath(`/dashboard/categories/${categoryId}`);

    return { data: result, error: null };
  } catch (error) {
    console.error("Failed to update category:", error);
    return { data: null, error: ErrorCode.FAILED_REQUEST };
  }
}

export async function remove(
  categoryId: string,
  businessId: string,
  userId: string
) {
  if (!categoryId || !businessId) {
    return { data: null, error: ErrorCode.MISSING_INPUT };
  }
  try {
    const existingRecord = await db.query.categoriesTable.findFirst({
      where: eq(categoriesTable.id, categoryId),
    });
    if (!existingRecord) {
      return { data: null, error: ErrorCode.NOT_FOUND };
    }
    const result = await db.transaction(async (tx) => {
      const [deletedCategory] = await tx
        .delete(categoriesTable)
        .where(
          and(
            eq(categoriesTable.id, categoryId),
            eq(categoriesTable.businessId, businessId)
          )
        )
        .returning();

      if (!deletedCategory) {
        return null;
      }

      const auditData: InsertAuditLog = {
        businessId: businessId,
        model: "category",
        recordId: categoryId,
        action: "delete-category",
        changes: JSON.stringify(existingRecord),
        performedBy: userId,
        performedAt: new Date(),
      };

      await tx.insert(auditLogsTable).values(auditData);
      return deletedCategory;
    });

    if (!result) {
      return { data: null, error: ErrorCode.NOT_FOUND };
    }

    revalidatePath("/dashboard/categories");
    revalidatePath(`/dashboard/categories/${categoryId}`);

    return { data: result, error: null };
  } catch (error) {
    console.error("Failed to delete category:", error);
    return { data: null, error: ErrorCode.FAILED_REQUEST };
  }
}

export async function upsert_many(
  categories: InsertCategory[],
  userId: string
) {
  if (!categories) {
    return { data: null, error: ErrorCode.MISSING_INPUT };
  }
  const businessId = categories[0]?.businessId;
  if (!businessId || !categories.every((c) => c.businessId === businessId)) {
    return { data: null, error: ErrorCode.MISSING_INPUT };
  }

  try {
    const result = await db.transaction(async (tx) => {
      const upsertedCategories = [];
      const errorValues: string[] = []
      for (const category of categories) {
        if (!category.value) {
          errorValues.push(category.value);
          continue;
        }
        const [newCategory] = await tx
          .insert(categoriesTable)
          .values(category)
          .onConflictDoUpdate({
            target: [categoriesTable.businessId, categoriesTable.value],
            set: { businessId: categoriesTable.businessId, value: category.value },
          })
          .returning();

        const auditLogs: InsertAuditLog = {
          businessId: newCategory.businessId,
          model: "category",
          recordId: newCategory.id,
          action: "create-category",
          changes: JSON.stringify(newCategory),
          performedBy: userId,
          performedAt: new Date(),
        };

        await tx.insert(auditLogsTable).values(auditLogs);
        upsertedCategories.push(newCategory);
      }
      if(errorValues.length > 0) {
        return {data: null, error: ErrorCode.MISSING_INPUT };
      }
      return upsertedCategories;
    });

    revalidatePath("/dashboard/categories");

    return { data: result, error: null };
  } catch (error) {
    console.error("Failed to create categories:", error);
    return { data: null, error: ErrorCode.FAILED_REQUEST };
  }
}
