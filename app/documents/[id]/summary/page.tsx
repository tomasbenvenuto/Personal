import ReactMarkdown from "react-markdown";
import { prisma } from "@/lib/prisma";
import { GenerateButton } from "../GenerateButton";

export default async function SummaryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const summary = await prisma.summary.findUnique({ where: { documentId: id } });

  return (
    <div className="mx-auto max-w-3xl p-6 sm:p-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">Resumen</h2>
        <GenerateButton
          endpoint={`/api/documents/${id}/generate-summary`}
          label="Generar resumen"
          hasContent={!!summary}
        />
      </div>

      {summary ? (
        <article className="prose prose-neutral max-w-none prose-headings:font-semibold prose-h1:text-lg prose-h2:text-base prose-h3:text-sm">
          <ReactMarkdown>{summary.content}</ReactMarkdown>
        </article>
      ) : (
        <p className="text-sm text-neutral-500">
          Todavía no generaste un resumen para este documento.
        </p>
      )}
    </div>
  );
}
