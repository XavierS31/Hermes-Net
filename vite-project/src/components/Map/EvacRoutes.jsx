import { useEffect, useRef } from 'react'
import { useMap } from 'react-map-gl'
import { useSimStore } from '../../store/simulationStore'
import { routesToGeoJSON } from '../../utils/shortestRoute'

export default function EvacRoutes() {
  const { mainMap } = useMap()
  const agents   = useSimStore(s => s.agents)
  const readyRef = useRef(false)

  useEffect(() => {
    if (!mainMap) return
    const map = mainMap.getMap()

    const setup = () => {
      try {
        if (!map.getSource('evac-routes')) {
          map.addSource('evac-routes', { type:'geojson', data:{ type:'FeatureCollection', features:[] } })
          map.addLayer({ id:'evac-dim',    type:'line', source:'evac-routes',
            paint:{ 'line-color':['get','color'], 'line-width':1, 'line-opacity':0.2 } })
          map.addLayer({ id:'evac-active', type:'line', source:'evac-routes',
            filter:['==',['get','status'],'evacuating'],
            paint:{ 'line-color':['get','color'], 'line-width':1.5, 'line-opacity':0.6, 'line-dasharray':[2,3] } })
        }
        readyRef.current = true
      } catch(e) { console.warn('EvacRoutes:', e.message) }
    }

    if (map.isStyleLoaded()) setup()
    else map.once('load', setup)

    return () => {
      readyRef.current = false
      try {
        ['evac-dim','evac-active'].forEach(l => { if(map.getLayer(l)) map.removeLayer(l) })
        if (map.getSource('evac-routes')) map.removeSource('evac-routes')
      } catch(_) {}
    }
  }, [mainMap])

  useEffect(() => {
    if (!mainMap || !readyRef.current) return
    try {
      mainMap.getMap().getSource('evac-routes')?.setData(routesToGeoJSON(agents))
    } catch(_) {}
  }, [agents])

  return null
}