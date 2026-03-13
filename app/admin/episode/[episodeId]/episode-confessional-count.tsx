"use client";

import { createColumnHelper, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
      <Input
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

export type PendingConfessionalChanges = Record<string, number>;

export default function EpisodeConfessionalCount({
  confessionalsByPlayer,
}: {
  confessionalsByPlayer: Record<
    string,
    { confessionalCount: number; castMemberName: string }
  >;
}) {

  const [pendingChanges, setPendingChanges] =
    useState<PendingConfessionalChanges>({});

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
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="h-4" />
      <Button
        disabled={Object.keys(pendingChanges).length === 0}
        onClick={async () => {
          await updateEpisodeConfessionalCounts(pendingChanges)
          setPendingChanges({})
        }}
      >
        Save Changes
      </Button>
    </div>
  )
}
