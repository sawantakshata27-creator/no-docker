export async function extractFileText(url: string, filename: string): Promise<string> {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";

  if (["txt", "md", "csv", "json", "xml", "html", "htm"].includes(ext)) {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch file.");
    return await res.text();
  }

  if (ext === "pdf") {
    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url,
    ).toString();

    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch PDF.");
    const buffer = await res.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

    const pages: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      pages.push(content.items.map((item: any) => item.str).join(" "));
    }
    return pages.join("\n\n");
  }

  throw new Error(
    `File type ".${ext}" is not supported. Please upload a PDF, TXT, MD, or CSV file.`,
  );
}
