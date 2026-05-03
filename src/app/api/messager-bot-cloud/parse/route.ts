import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { normalizeRecipient, validateRecipient } from "@/lib/messager";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Upload an .xlsx or .xls file." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer", cellDates: false });
    const preferredSheet = workbook.Sheets["Emails for Bot"] ? "Emails for Bot" : workbook.SheetNames[0];
    const sheet = workbook.Sheets[preferredSheet];

    if (!sheet) {
      return NextResponse.json({ error: "The workbook does not contain a readable sheet." }, { status: 400 });
    }

    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
    const rows = rawRows.map(normalizeRecipient);
    const validRows = rows.filter(validateRecipient);

    return NextResponse.json({
      sheetName: preferredSheet,
      totalRows: rows.length,
      skipped: rows.length - validRows.length,
      rows: validRows
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not parse spreadsheet." },
      { status: 400 }
    );
  }
}
