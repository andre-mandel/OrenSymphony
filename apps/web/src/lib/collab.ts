import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import { useEffect, useMemo, useState } from 'react'
import type { Edge, Node } from '@xyflow/react'

export type CollabDoc = {
  doc: Y.Doc
  provider: WebsocketProvider
  graphMap: Y.Map<unknown>
  destroy: () => void
}

export function createCollabDoc(args: { room: string; wsUrl?: string }): CollabDoc {
  const doc = new Y.Doc()
  const wsUrl = args.wsUrl ?? (import.meta as any).env?.VITE_COLLAB_WS_URL ?? 'ws://localhost:1234'
  const provider = new WebsocketProvider(wsUrl, args.room, doc, { connect: true })

  const graphMap = doc.getMap('graph')

  return {
    doc,
    provider,
    graphMap,
    destroy: () => {
      provider.destroy()
      doc.destroy()
    },
  }
}

type GraphState = { nodes: Node[]; edges: Edge[] }

export function useCollabGraph(args: { room: string; wsUrl?: string; initial: GraphState }) {
  const collab = useMemo(() => createCollabDoc({ room: args.room, wsUrl: args.wsUrl }), [args.room, args.wsUrl])

  const [state, setState] = useState<GraphState>(() => args.initial)

  // Initialize doc with initial graph if empty.
  useEffect(() => {
    const map = collab.graphMap
    const hasNodes = map.has('nodes')
    const hasEdges = map.has('edges')
    if (!hasNodes || !hasEdges) {
      map.set('nodes', args.initial.nodes as any)
      map.set('edges', args.initial.edges as any)
    }
  }, [collab, args.initial])

  // Subscribe to remote doc updates.
  useEffect(() => {
    const map = collab.graphMap
    const onUpdate = () => {
      const nodes = (map.get('nodes') as any as Node[]) ?? []
      const edges = (map.get('edges') as any as Edge[]) ?? []
      setState({ nodes, edges })
    }
    map.observe(onUpdate)
    onUpdate()
    return () => {
      map.unobserve(onUpdate)
    }
  }, [collab])

  // Push local state into doc.
  const setYNodes = (nodes: Node[]) => {
    collab.graphMap.set('nodes', nodes as any)
  }
  const setYEdges = (edges: Edge[]) => {
    collab.graphMap.set('edges', edges as any)
  }

  useEffect(() => () => collab.destroy(), [collab])

  return {
    yNodes: state.nodes,
    yEdges: state.edges,
    setYNodes,
    setYEdges,
    provider: collab.provider,
  }
}

