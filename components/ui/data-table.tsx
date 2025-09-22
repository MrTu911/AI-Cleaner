
"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export interface DataTableProps<TData, TValue> {
  columns: any[]
  data: TData[]
  onSelectionChange?: (selection: TData[]) => void
}

export function DataTable<TData, TValue>({
  columns,
  data,
  onSelectionChange
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState([])
  const [columnFilters, setColumnFilters] = React.useState([])
  const [columnVisibility, setColumnVisibility] = React.useState({})
  const [rowSelection, setRowSelection] = React.useState({})

  React.useEffect(() => {
    if (onSelectionChange) {
      const selectedRows = Object.keys(rowSelection).map(index => data[parseInt(index)])
      onSelectionChange(selectedRows)
    }
  }, [rowSelection, data, onSelectionChange])

  return (
    <div className="w-full">
      <div className="flex items-center py-4">
        <Input
          placeholder="Filter records..."
          className="max-w-sm"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto">
              Columns <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {columns
              .filter((column) => typeof column.accessorKey !== "undefined")
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={(columnVisibility as any)[column.id] !== false}
                    onCheckedChange={(value) =>
                      setColumnVisibility(prev => ({ ...prev, [column.id]: value }))
                    }
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                )
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={Object.keys(rowSelection).length === data.length}
                  onCheckedChange={(value) => {
                    if (value) {
                      const newSelection: any = {}
                      data.forEach((_, index) => {
                        newSelection[index] = true
                      })
                      setRowSelection(newSelection)
                    } else {
                      setRowSelection({})
                    }
                  }}
                  aria-label="Select all"
                />
              </TableHead>
              {columns.map((column) => (
                <TableHead key={column.id}>
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.length ? (
              data.map((row, index) => (
                <TableRow
                  key={index}
                  data-state={(rowSelection as any)[index] && "selected"}
                >
                  <TableCell>
                    <Checkbox
                      checked={!!(rowSelection as any)[index]}
                      onCheckedChange={(value) => {
                        setRowSelection(prev => ({
                          ...prev,
                          [index]: value
                        }))
                      }}
                      aria-label="Select row"
                    />
                  </TableCell>
                  {columns.map((column) => (
                    <TableCell key={column.id}>
                      {column.cell ? column.cell(row, index) : (row as any)[column.accessorKey]}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length + 1} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="text-sm text-muted-foreground">
          {Object.keys(rowSelection).length} of{" "}
          {data.length} row(s) selected.
        </div>
      </div>
    </div>
  )
}
