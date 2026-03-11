"use client";

import { createColumnHelper, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { useState } from "react";
import { updateEpisodeConfessionalCounts } from "./actions";

type Confessionals = {
  id: string;
  name: string;
  confessionalCount: number;
};

const columnHelper = createColumnHelper<Confessionals>()

const columns = [
  columnHelper.accessor('name', {
    cell: (info) => info.getValue(),
    footer: (info) => info.column.id,
  }),
  columnHelper.accessor((row) => row.confessionalCount, {
    id: 'confessionalCount',
    cell: (info) => (
      <input
        type="number"
        defaultValue={info.getValue()}
        onChange={(e) => info.table.options.meta?.updateConfessionalCount(
          info.row.original.id,
          Number(e.target.value)
        )}
      />
    ),
    header: () => <span>Confessional Count</span>,
    footer: (info) => info.column.id,
  }),
]

declare module '@tanstack/react-table' {
  interface TableMeta<TData> {
    updateConfessionalCount: (id: string, count: number) => void
  }
}

export type PendingChanges = Record<string, number>

export default function EpisodeConfessionalCount({
  confessionalsByPlayer,
}: {
  confessionalsByPlayer: Record<
    string,
    { confessionalCount: number; castMemberName: string } 
  >;
}) {
  
  const [pendingChanges, setPendingChanges] = useState<PendingChanges>({})

  const [tableData, setTableData] = useState<Confessionals[]>(
    Object.keys(confessionalsByPlayer).map((id) => {
      return {
        id: id,
        name: confessionalsByPlayer[id].castMemberName,
        confessionalCount: confessionalsByPlayer[id].confessionalCount,
      };
    }),
  );

  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    meta: {
      updateConfessionalCount: (id, count) => {
        setPendingChanges((prev) => ({ ...prev, [id]: count }))
      },
    },
  });

return (
    <div className="p-2">
      <table>
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>  
      </table>
      <div className="h-4" />
      <button
        disabled={Object.keys(pendingChanges).length === 0}
        onClick={async () => {
          await updateEpisodeConfessionalCounts(pendingChanges)
          setPendingChanges({})
        }}
      >
        Save Changes
      </button>
    </div>
  )
}
