import { eq, desc, and, gte, lte, getTableColumns } from "drizzle-orm";
import { db } from "@/lib/db";
import { expensesTable, auditLogsTable, usersTable } from "@/lib/schema";
import { InsertExpense, InsertAuditLog } from "@/lib/schema/schema-types";
import { ErrorCode } from "@/server/constants/errors";
import { revalidatePath, unstable_cache } from "next/cache";
import { cache } from "react";

export const get_all = cache(async (businessId: string) => {
  if (!businessId) {
    return { data: null, error: ErrorCode.MISSING_INPUT };
  }

  try {
    const expenseColumns = getTableColumns(expensesTable);
    const expenses = await db
      .select({
        ...expenseColumns,
        createdByUser: usersTable,
      })
      .from(expensesTable)
      .innerJoin(usersTable, eq(usersTable.id, expensesTable.createdBy))
      .where(eq(expensesTable.businessId, businessId))
      .orderBy(desc(expensesTable.createdAt));

    return { data: expenses, error: null };
  } catch (error) {
    console.error("Failed to fetch expenses:", error);
    return { data: null, error: ErrorCode.FAILED_REQUEST };
  }
});

export const get_all_cached = unstable_cache(
  async (businessId: string) => {
    return get_all(businessId);
  },
  ["expenses"],
  {
    tags: ["expenses"],
    revalidate: 300,
  }
);

export async function get_by_time_interval(
  businessId: string,
  dateFrom: Date,
  dateTo: Date
) {
  try {
    const result = await db
      .select()
      .from(expensesTable)
      .where(
        and(
          eq(expensesTable.businessId, businessId),
          gte(expensesTable.createdAt, dateFrom),
          lte(expensesTable.createdAt, dateTo)
        )
      );
    return {
      data: result,
      error: null,
    };
  } catch (error) {
    console.error(error);
    return { data: null, error: ErrorCode.FAILED_REQUEST };
  }
}

export async function get_by_id(expenseId: string, businessId: string) {
  if (!expenseId || !businessId) {
    return { data: null, error: ErrorCode.MISSING_INPUT };
  }

  try {
    const expense = await db.query.expensesTable.findFirst({
      where: and(
        eq(expensesTable.id, expenseId),
        eq(expensesTable.businessId, businessId)
      ),
      with: {
        createdByUser: true,
      },
    });

    if (!expense) {
      return { data: null, error: ErrorCode.NOT_FOUND };
    }

    return { data: expense, error: null };
  } catch (error) {
    console.error("Failed to fetch expense:", error);
    return { data: null, error: ErrorCode.FAILED_REQUEST };
  }
}

export async function create(expense: InsertExpense) {
  if (!expense.amount || !expense.businessId) {
    return { data: null, error: ErrorCode.MISSING_INPUT };
  }

  try {
    const result = await db.transaction(async (tx) => {
      const [newExpense] = await tx
        .insert(expensesTable)
        .values(expense)
        .returning();

      const auditData: InsertAuditLog = {
        businessId: expense.businessId,
        model: "expense",
        recordId: newExpense.id,
        action: "create-expense",
        changes: JSON.stringify(newExpense),
        performedBy: expense.createdBy,
        performedAt: new Date(),
      };

      await tx.insert(auditLogsTable).values(auditData);

      return newExpense;
    });

    revalidatePath("/transactions");
    revalidatePath("/sales");

    return { data: result, error: null };
  } catch (error) {
    console.error("Failed to create expense:", error);
    return { data: null, error: ErrorCode.FAILED_REQUEST };
  }
}
