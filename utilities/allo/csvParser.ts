import Papa from "papaparse";
import { isAddress, getAddress } from "viem";
import type { CSVRow, ValidatedCSVRow, ValidationResult } from "@/types/allo";
import type { TokenInfo } from "./tokens";

/**
 * Parse and validate a disbursement CSV file
 */
export async function parseDisbursementCSV(csvText: string, tokenInfo?: TokenInfo): Promise<ValidationResult> {
  return new Promise((resolve) => {
    const errors: Array<{ row: number; error: string }> = [];
    const validRows: ValidatedCSVRow[] = [];
    
    Papa.parse<any>(csvText, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        results.data.forEach((row: any, index: number) => {
          const rowNumber = index + 2; // Account for header row
          
          // Validate required fields
          if (!row.address || !row.amount) {
            errors.push({
              row: rowNumber,
              error: "Missing required fields (address and amount)"
            });
            return;
          }
          
          // Validate address
          if (!isAddress(row.address)) {
            errors.push({
              row: rowNumber,
              error: `Invalid Ethereum address: ${row.address}`
            });
            return;
          }
          
          // Validate amount
          const amount = parseFloat(row.amount);
          if (isNaN(amount) || amount <= 0) {
            errors.push({
              row: rowNumber,
              error: `Invalid amount: ${row.amount}`
            });
            return;
          }
          
          // Create validated row
          try {
            // Use token decimals if available, otherwise default to 18
            const decimals = tokenInfo?.decimals ?? 18;
            const multiplier = BigInt(10 ** decimals);
            
            const validatedRow: ValidatedCSVRow = {
              address: row.address,
              amount: row.amount,
              profileId: row.profileId || undefined,
              checksummedAddress: getAddress(row.address),
              parsedAmount: BigInt(Math.floor(amount * Number(multiplier))),
            };
            
            validRows.push(validatedRow);
          } catch (error) {
            errors.push({
              row: rowNumber,
              error: `Error processing row: ${error}`
            });
          }
        });
        
        resolve({
          validRows,
          errors,
          totalRows: results.data.length,
        });
      },
      error: (error: Error) => {
        resolve({
          validRows: [],
          errors: [{
            row: 0,
            error: `CSV parsing error: ${error.message}`
          }],
          totalRows: 0,
        });
      }
    });
  });
}

/**
 * Generate CSV template for disbursements
 */
export function generateDisbursementCSVTemplate(): string {
  const headers = ["address", "amount", "profileId"];
  const exampleRows = [
    ["0x1234567890123456789012345678901234567890", "100.5", "profile123"],
    ["0xabcdefabcdefabcdefabcdefabcdefabcdefabcd", "250.75", "profile456"],
    ["0x9876543210987654321098765432109876543210", "50", ""],
  ];
  
  const csv = [
    headers.join(","),
    ...exampleRows.map(row => row.join(","))
  ].join("\n");
  
  return csv;
}

/**
 * Validate if addresses are unique in the CSV
 */
export function validateUniqueAddresses(rows: ValidatedCSVRow[]): boolean {
  const addresses = rows.map(row => row.checksummedAddress.toLowerCase());
  const uniqueAddresses = new Set(addresses);
  return addresses.length === uniqueAddresses.size;
}

/**
 * Calculate total amount from validated rows
 */
export function calculateTotalAmount(rows: ValidatedCSVRow[]): bigint {
  return rows.reduce((total, row) => total + row.parsedAmount, BigInt(0));
} 