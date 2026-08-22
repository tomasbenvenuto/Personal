import { prisma } from "@/lib/prisma";
import { GenerateButton } from "../GenerateButton";
import { ConceptMapView } from "./ConceptMapView";

type ConceptNode = { id: string; label: string; description?: string };
type ConceptEdge = { id: string; source: string; target: string; label?: string };

export default async function ConceptMapPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const conceptMap = await prisma.conceptMap.findUnique({
    where: { documentId: id },
  });

  return (
    <div className="mx-auto max-w-5xl p-6 sm:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">Mapa conceptual</h2>
        <GenerateButton
          endpoint={`/api/documents/${id}/generate-concept-map`}
          label="Generar mapa conceptual"
          hasContent={!!conceptMap}
        />
      </div>

      {conceptMap ? (
        <ConceptMapView
          nodes={conceptMap.nodes as ConceptNode[]}
          edges={conceptMap.edges as ConceptEdge[]}
        />
      ) : (
        <p className="text-sm text-neutral-500">
          Todavía no generaste un mapa conceptual para este documento.
        </p>
      )}
    </div>
  );
}
