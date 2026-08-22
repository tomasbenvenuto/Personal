import { DocumentViewer } from "./DocumentViewer";

export default async function DocumentViewerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DocumentViewer documentId={id} />;
}
