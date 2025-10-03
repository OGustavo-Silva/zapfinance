import { IDBItem } from "../interfaces/interfaces";

export function DbItemsToStringTable(items: IDBItem[]): string {
    if (items.length === 0) return 'Sem dados.';

    const headers = ['ID', 'NOME', 'CATEGORIA', 'VALOR', 'DATA', 'MENSAL', 'PAGO'];
    const rows = items.map(item => [
        item.id?.toString() ?? '',
        item.name,
        item.category ?? 'N/A',
        '$'+item.value.toFixed(2),
        formatDbItemDate(item.date),
        item.isMonthly ? 'Sim' : 'Não',
        item.isPaid ? 'Sim' : 'Não'
    ]);

    const table = [headers, ...rows];
    const colWidths = headers.map((_, i) =>
        Math.max(...table.map(row => String(row[i]).length))
    );

    const formatRow = (row: string[]) =>
        row.map((cell, i) => cell.toString().padEnd(colWidths[i])).join(' | ');

    const separator = colWidths.map(w => '-'.repeat(w)).join('-|-');

    return [
        formatRow(headers),
        separator,
        ...rows.map(row => formatRow(row as string[]))
    ].join('\n');
}

function formatDbItemDate(strDate: string) {
    const date = new Date(strDate);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
}