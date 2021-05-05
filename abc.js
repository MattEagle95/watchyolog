import { markdownTable } from "markdown-table";

console.log(markdownTable([
    ['Branch', 'Commit'],
    ['main', '0123456789abcdef'],
    ['staging', 'fedcba9876543210']
]));