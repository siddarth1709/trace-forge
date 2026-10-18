import React from 'react'
import { cn } from '../../lib/utils.ts'

export const Table: React.FC<React.TableHTMLAttributes<HTMLTableElement>> = ({
  className,
  children,
  ...props
}) => (
  <div className="w-full overflow-x-auto rounded-xl border border-[#2A3038] bg-[#121519] shadow-sm">
    <table className={cn('w-full text-left text-xs font-mono', className)} {...props}>
      {children}
    </table>
  </div>
)

export const TableHeader: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  className,
  children,
  ...props
}) => (
  <thead className={cn('bg-[#191D22] text-[#B0B7C3] uppercase tracking-wider border-b border-[#2A3038]', className)} {...props}>
    {children}
  </thead>
)

export const TableBody: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  className,
  children,
  ...props
}) => (
  <tbody className={cn('divide-y divide-[#2A3038] bg-[#121519]', className)} {...props}>
    {children}
  </tbody>
)

export const TableRow: React.FC<React.HTMLAttributes<HTMLTableRowElement>> = ({
  className,
  children,
  ...props
}) => (
  <tr className={cn('hover:bg-[#191D22]/70 transition-colors duration-120', className)} {...props}>
    {children}
  </tr>
)

export const TableHead: React.FC<React.ThHTMLAttributes<HTMLTableCellElement>> = ({
  className,
  children,
  ...props
}) => (
  <th className={cn('px-4 py-3.5 font-medium text-[#B0B7C3]', className)} {...props}>
    {children}
  </th>
)

export const TableCell: React.FC<React.TdHTMLAttributes<HTMLTableCellElement>> = ({
  className,
  children,
  ...props
}) => (
  <td className={cn('px-4 py-3.5 text-[#F5F5F5]', className)} {...props}>
    {children}
  </td>
)
