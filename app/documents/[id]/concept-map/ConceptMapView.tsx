"use client";

import { useMemo } from "react";
import { ReactFlow, Background, Controls, type Node, type Edge } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "@dagrejs/dagre";

type ConceptNode = { id: string; label: string; description?: string };
type ConceptEdge = { id: string; source: string; target: string; label?: string };

const NODE_WIDTH = 180;
const NODE_HEIGHT = 56;

function layoutNodes(nodes: ConceptNode[], edges: ConceptEdge[]): Node[] {
  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({ rankdir: "TB", nodesep: 40, ranksep: 70 });

  for (const node of nodes) {
    graph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }
  for (const edge of edges) {
    if (graph.hasNode(edge.source) && graph.hasNode(edge.target)) {
      graph.setEdge(edge.source, edge.target);
    }
  }
  dagre.layout(graph);

  return nodes.map((node) => {
    const pos = graph.node(node.id) as { x: number; y: number } | undefined;
    return {
      id: node.id,
      data: { label: node.label },
      position: pos
        ? { x: pos.x - NODE_WIDTH / 2, y: pos.y - NODE_HEIGHT / 2 }
        : { x: 0, y: 0 },
      style: {
        width: NODE_WIDTH,
        fontSize: 12,
        borderRadius: 8,
        border: "1px solid #d4d4d4",
        padding: 8,
      },
    };
  });
}

export function ConceptMapView({
  nodes,
  edges,
}: {
  nodes: ConceptNode[];
  edges: ConceptEdge[];
}) {
  const nodeIds = useMemo(() => new Set(nodes.map((n) => n.id)), [nodes]);

  const flowNodes = useMemo(() => layoutNodes(nodes, edges), [nodes, edges]);
  const flowEdges: Edge[] = useMemo(
    () =>
      edges
        .filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target))
        .map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          label: e.label,
        })),
    [edges, nodeIds],
  );

  return (
    <div
      style={{ height: "70vh" }}
      className="overflow-hidden rounded-lg border border-neutral-200 bg-white"
    >
      <ReactFlow nodes={flowNodes} edges={flowEdges} fitView>
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}
