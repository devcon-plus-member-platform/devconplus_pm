// QA table — implemented in Batch 2
"use client";

import type { QATest } from "@/types";
import { QAStatusBadge } from "@/components/ui/Badge";

interface QATableProps {
  tests: QATest[];
  onEdit?: (test: QATest) => void;
}

export default function QATable({ tests, onEdit }: QATableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-gray-500">
            <th className="pb-2 font-medium pr-4">Title</th>
            <th className="pb-2 font-medium pr-4">Category</th>
            <th className="pb-2 font-medium pr-4">Status</th>
            <th className="pb-2 font-medium pr-4">Assigned to</th>
            <th className="pb-2 font-medium"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {tests.map((test) => (
            <tr key={test.id} className="hover:bg-gray-50">
              <td className="py-2.5 pr-4 text-gray-800">{test.title}</td>
              <td className="py-2.5 pr-4 text-gray-500">{test.category ?? "—"}</td>
              <td className="py-2.5 pr-4">
                <QAStatusBadge status={test.status} />
              </td>
              <td className="py-2.5 pr-4 text-gray-500">
                {test.assignee?.full_name ?? "—"}
              </td>
              <td className="py-2.5">
                <button
                  onClick={() => onEdit?.(test)}
                  className="text-brand-600 hover:underline text-xs"
                >
                  Edit
                </button>
              </td>
            </tr>
          ))}
          {tests.length === 0 && (
            <tr>
              <td colSpan={5} className="py-8 text-center text-gray-400">
                No tests found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
