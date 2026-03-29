import { Marker } from 'react-map-gl'
import { useSimStore } from '../../store/simulationStore'
import styles from './AgentMarkers.module.css'

export default function AgentMarkers() {
  const agents = useSimStore(s => s.agents)
  const selectedAgentId = useSimStore(s => s.selectedAgentId)
  const selectAgent = useSimStore(s => s.selectAgent)

  return (
    <>
      {agents.map(agent => (
        <Marker
          key={agent.id}
          longitude={agent.position.lng}
          latitude={agent.position.lat}
          anchor="center"
          onClick={e => { e.originalEvent.stopPropagation(); selectAgent(agent.id) }}
        >
          <div
            className={`${styles.dot} ${styles[agent.status]} ${selectedAgentId === agent.id ? styles.selected : ''}`}
            style={{ '--agent-color': agent.color }}
            title={`${agent.label} — ${agent.neighborhood}`}
          />
        </Marker>
      ))}
    </>
  )
}