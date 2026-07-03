"use client";

import type { ReactNode } from "react";
import PageHeader from "@/components/ui/page/PageHeader";
import TableToolbar from "@/components/ui/tables/TableToolbar";
import DataTable, {
  type DataTableColumn,
} from "@/components/ui/tables/DataTable";
import LoadingSkeleton from "@/components/ui/feedback/LoadingSkeleton";
import ErrorState from "@/components/ui/feedback/ErrorState";

type CRUDTemplateProps<T extends Record<string, unknown>> = {
  title: string;
  description?: string;
  badge?: string;
  icon?: ReactNode;
  actions?: ReactNode;

  data: T[];
  columns: DataTableColumn<T>[];

  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;

  loading?: boolean;
  error?: string | null;

  onAdd?: () => void;
  addLabel?: string;
  onRefresh?: () => void;
  onPrint?: () => void;
  onExportExcel?: () => void;

  filters?: ReactNode;
  tableActions?: ReactNode;
  pageSize?: number;
};

export default function CRUDTemplate<T extends Record<string, unknown>>({
  title,
  description,
  badge = "إدارة",
  icon,
  actions,
  data,
  columns,
  search,
  onSearchChange,
  searchPlaceholder = "بحث...",
  loading = false,
  error,
  onAdd,
  addLabel = "إضافة",
  onRefresh,
  onPrint,
  onExportExcel,
  filters,
  tableActions,
  pageSize = 10,
}: CRUDTemplateProps<T>) {
  if (loading) return <LoadingSkeleton />;

  if (error) {
    return (
      <main dir="rtl" className="min-h-screen bg-slate-50 p-4">
        <ErrorState
          title="تعذر تحميل البيانات"
          description={error}
          action={
            onRefresh && (
              <button
                onClick={onRefresh}
                className="rounded-2xl bg-[#15445a] px-4 py-2 text-sm font-bold text-white"
              >
                إعادة المحاولة
              </button>
            )
          }
        />
      </main>
    );
  }

  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 p-4 text-slate-900">
      <div className="mx-auto w-full max-w-[1500px] space-y-5">
        <PageHeader
          title={title}
          description={description}
          badge={badge}
          icon={icon}
          actions={actions}
        />

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <TableToolbar
            search={search}
            onSearchChange={onSearchChange}
            searchPlaceholder={searchPlaceholder}
            onRefresh={onRefresh}
            onPrint={onPrint}
            onExportExcel={onExportExcel}
            onAdd={onAdd}
            addLabel={addLabel}
            filters={filters}
            actions={tableActions}
          />

          <DataTable data={data} columns={columns} pageSize={pageSize} />
        </div>
      </div>
    </main>
  );
}